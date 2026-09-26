import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes, randomInt } from 'node:crypto';

/**
 * Cryptographie des licences (spec 005) : clés lisibles, chiffrement des clés au repos, jetons signés.
 * Le jeton reproduit à l'octet près celui de KYA-SolDesign (`token.ts`) : WebCrypto ECDSA P-256 /
 * SHA-256, signature brute r‖s, `base64url(JSON) + "." + base64url(signature)`.
 */

// ---------------------------------------------------------------- clés de licence

/** Alphabet sans caractères ambigus (ni 0/O, ni 1/I/L) : une clé se recopie sans erreur. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

const group = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

/** `KYA-COM-12M-8F3K-Q2LM-7XRD` : préfixe lisible (édition, formule) et 3 × 4 caractères aléatoires. */
export function generateLicenseKey(editionPrefix: string, planCode: string): string {
  return ['KYA', editionPrefix, planCode.toUpperCase(), group(), group(), group()].join('-');
}

/** Majuscules, sans espaces : « kya-com-12m-8f3k … » et « KYA-COM-12M-8F3K… » désignent la même clé. */
export const normalizeLicenseKey = (key: string) => key.replace(/\s+/gu, '').toUpperCase();

export const licenseKeyHash = (key: string) => createHash('sha256').update(normalizeLicenseKey(key)).digest('hex');

// ---------------------------------------------------------------- chiffrement des clés au repos

const deriveKey = (secret: string) => Buffer.from(hkdfSync('sha256', secret, 'kya-em', 'license-keys-v1', 32));

/** AES-256-GCM, clé dérivée du secret du serveur : `iv.tag.chiffré` en base64url. */
export function encryptLicenseKey(key: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(normalizeLicenseKey(key), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

/** `null` si le secret a changé ou si le chiffré est altéré (la clé reste valable par son empreinte). */
export function decryptLicenseKey(cipherText: string, secret: string): string | null {
  try {
    const [iv, tag, encrypted] = cipherText.split('.').map((part) => Buffer.from(part, 'base64url'));
    const decipher = createDecipheriv('aes-256-gcm', deriveKey(secret), iv!);
    decipher.setAuthTag(tag!);
    return Buffer.concat([decipher.update(encrypted!), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- jetons signés

/** Charge utile du jeton, identique à `LicensePayload` de KYA-SolDesign (ordre des champs compris). */
export interface LicensePayload {
  readonly licenseId: string;
  readonly customer: string;
  readonly edition: string;
  readonly plan: string;
  readonly features: readonly string[];
  readonly limits: { readonly maxProjects: number | null; readonly seats: number };
  readonly watermark: string | null;
  readonly deviceId: string;
  readonly issuedAt: string;
  readonly startsAt: string;
  readonly expiresAt: string;
  readonly graceDays: number;
  readonly offlineDays: number;
}

const encoder = new TextEncoder();
const ALGORITHM = { name: 'ECDSA', hash: 'SHA-256' } as const;
const toBase64Url = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64url');

export interface LicenseSigner {
  sign(payload: LicensePayload): Promise<string>;
  /** Clé publique à embarquer dans le logiciel (JWK sans partie privée). */
  readonly publicKey: JsonWebKey;
}

/** Signataire à partir de la clé privée JWK (`LICENSE_SIGNING_PRIVATE_KEY`). */
export async function createLicenseSigner(privateJwk: JsonWebKey): Promise<LicenseSigner> {
  if (privateJwk.kty !== 'EC' || privateJwk.crv !== 'P-256' || !privateJwk.d) {
    throw new Error('LICENSE_SIGNING_PRIVATE_KEY : clé privée EC P-256 (JWK) attendue');
  }
  const key = await crypto.subtle.importKey('jwk', privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const { kty, crv, x, y } = privateJwk;
  return {
    publicKey: { kty, crv, x, y },
    async sign(payload) {
      const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
      const signature = new Uint8Array(await crypto.subtle.sign(ALGORITHM, key, encoder.encode(body)));
      return `${body}.${toBase64Url(signature)}`;
    },
  };
}

/** Nouvelle paire de clés P-256 au format JWK (script de création, clé éphémère en test). */
export async function generateSigningKey(): Promise<{ privateJwk: JsonWebKey; publicJwk: JsonWebKey }> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const { kty, crv, x, y } = privateJwk;
  return { privateJwk: { kty, crv, x, y, d: privateJwk.d }, publicJwk: { kty, crv, x, y } };
}
