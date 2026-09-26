import {
  activateLicense,
  editionDescriptors,
  normalizeLicenseKey,
  refreshLicense,
  releaseDevice,
} from '@kya-em/domain';
import { runtime } from '@/shared/server/runtime.server';

/**
 * API appelée par les logiciels installés (spec 005, contrat KYA-SolDesign) : `/api/software/v1`.
 * Aucun cookie : l'activation se fait par clé, le rafraîchissement par licence et poste. Le logiciel
 * appelle depuis sa vue web (autre origine) : réponses CORS ouvertes, sans identifiants.
 */
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
} as const;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...CORS },
  });

export const preflight = () => new Response(null, { status: 204, headers: CORS });

// ---------------------------------------------------------------- limitation de débit

const windows = new Map<string, number[]>();

/** Fenêtre glissante en mémoire (un seul processus par environnement). */
function allowed(bucket: string, max: number, windowMs: number) {
  const now = Date.now();
  const recent = (windows.get(bucket) ?? []).filter((time) => now - time < windowMs);
  if (recent.length >= max) {
    windows.set(bucket, recent);
    return false;
  }
  recent.push(now);
  windows.set(bucket, recent);
  if (windows.size > 10_000) windows.clear();
  return true;
}

const clientIp = (request: Request) =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';

const limited = () => json({ error: 'RATE_LIMITED' }, 429);

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = (await request.json()) as unknown;
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function context() {
  const { database, secret, licenseSigner } = runtime();
  const signer = await licenseSigner();
  if (!database || !signer) return null;
  return { db: database.db, secret, signer };
}

const unavailable = () => json({ error: 'LICENSING_UNAVAILABLE' }, 503);

// ---------------------------------------------------------------- points d'entrée

export const serverTime = () => json({ now: new Date().toISOString() });

export async function productEditions(slug: string) {
  const { database } = runtime();
  if (!database) return unavailable();
  const descriptors = await editionDescriptors(database.db, slug);
  return descriptors ? json(descriptors) : json({ error: 'PRODUCT_UNKNOWN' }, 404);
}

export async function activate(request: Request) {
  const body = await readJson(request);
  const key = typeof body.key === 'string' ? normalizeLicenseKey(body.key) : '';
  if (!allowed(`activate:ip:${clientIp(request)}`, 20, 60_000) || !allowed(`activate:key:${key}`, 10, 60_000)) {
    return limited();
  }
  const deps = await context();
  if (!deps) return unavailable();
  const result = await activateLicense(deps, {
    key,
    deviceId: String(body.deviceId ?? ''),
    deviceName: typeof body.deviceName === 'string' ? body.deviceName : undefined,
  });
  return 'error' in result ? json(result, result.error === 'KEY_UNKNOWN' ? 404 : 409) : json(result);
}

export async function refresh(request: Request, licenseId: string) {
  const body = await readJson(request);
  if (!allowed(`refresh:${licenseId}:${clientIp(request)}`, 60, 60_000)) return limited();
  const deps = await context();
  if (!deps) return unavailable();
  const result = await refreshLicense(deps, { licenseId, deviceId: String(body.deviceId ?? '') });
  if (!('error' in result)) return json(result);
  return json(result, result.error === 'LICENSE_UNKNOWN' ? 404 : 409);
}

export async function release(request: Request, licenseId: string) {
  const body = await readJson(request);
  if (!allowed(`release:${licenseId}:${clientIp(request)}`, 30, 60_000)) return limited();
  const { database } = runtime();
  if (!database) return unavailable();
  await releaseDevice(database.db, { licenseId, deviceId: String(body.deviceId ?? '') });
  return new Response(null, { status: 204, headers: CORS });
}
