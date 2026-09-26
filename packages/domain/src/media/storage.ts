import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

/**
 * Port de stockage des médias (spec 004, FR-005). Les clés sont produites par l'application
 * (`images/<uuid>.webp`), jamais par la personne qui téléverse.
 */
export interface StoredObject {
  readonly body: Uint8Array;
  readonly contentType: string;
}

export interface MediaStorage {
  readonly kind: 's3' | 'local';
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}

export const MEDIA_KEY = /^images\/[0-9a-f-]{36}\.(webp|png|jpg)$/u;

const typeOf = (key: string) =>
  key.endsWith('.webp') ? 'image/webp' : key.endsWith('.png') ? 'image/png' : 'image/jpeg';

/** Développement et tests : un dossier local, hors du dossier public de l'application. */
export function createLocalMediaStorage(directory: string): MediaStorage {
  const root = resolve(directory);
  const pathOf = (key: string) => {
    if (!MEDIA_KEY.test(key)) throw new Error('clé de média invalide');
    const path = resolve(join(root, key));
    if (!path.startsWith(root + sep)) throw new Error('clé de média invalide');
    return path;
  };
  return {
    kind: 'local',
    async put(key, body) {
      const path = pathOf(key);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, body);
    },
    async get(key) {
      const path = pathOf(key);
      if (!(await stat(path).catch(() => null))) return null;
      return { body: new Uint8Array(await readFile(path)), contentType: typeOf(key) };
    },
    async delete(key) {
      await rm(pathOf(key), { force: true });
    },
  };
}

export interface S3Config {
  readonly bucket: string;
  readonly endpoint: string;
  readonly region: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
}

/** En ligne : Neon Object Storage (compatible S3, adressage par chemin obligatoire). */
export function createS3MediaStorage(config: S3Config): MediaStorage {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  return {
    kind: 's3',
    async put(key, body, contentType) {
      if (!MEDIA_KEY.test(key)) throw new Error('clé de média invalide');
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    },
    async get(key) {
      if (!MEDIA_KEY.test(key)) return null;
      try {
        const object = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
        if (!object.Body) return null;
        return { body: await object.Body.transformToByteArray(), contentType: object.ContentType ?? typeOf(key) };
      } catch (error) {
        if ((error as { name?: string }).name === 'NoSuchKey') return null;
        throw error;
      }
    },
    async delete(key) {
      if (!MEDIA_KEY.test(key)) return;
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
    },
  };
}
