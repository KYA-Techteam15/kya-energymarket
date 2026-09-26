import { LicenseError, startTrial, trialStatus } from '@kya-em/domain';
import { localeFromRequest } from '@kya-em/mail';
import { getRequest, getRequestHeaders } from '@tanstack/react-start/server';
import { runtime } from '@/shared/server/runtime.server';

/**
 * Page Essai (spec 006) : état de l'essai pour la personne connectée, et activation. L'essai est
 * rattaché au compte ; tout est revérifié ici, côté serveur.
 */
async function session() {
  const { auth, database, secret } = runtime();
  if (!auth || !database) return null;
  const current = await auth.api.getSession({ headers: getRequestHeaders() });
  return { db: database.db, secret, current };
}

export async function loadTrialPage(productSlug: string) {
  const context = await session();
  if (!context) return null;
  const user = context.current?.user ?? null;
  try {
    const status = await trialStatus(
      { db: context.db, secret: context.secret },
      { userId: user?.id ?? null, productSlug },
    );
    return {
      status,
      viewer: user ? { name: user.name, email: user.email, verified: user.emailVerified } : null,
    };
  } catch (error) {
    if (error instanceof LicenseError && error.code === 'PRODUCT_NOT_FOUND') return null;
    throw error;
  }
}

export async function activateTrial(productSlug: string) {
  const context = await session();
  const user = context?.current?.user;
  if (!context || !user) return { ok: false as const, code: 'SIGN_IN' };
  if (!user.emailVerified) return { ok: false as const, code: 'EMAIL_UNVERIFIED' };
  try {
    const { license, key } = await startTrial(
      { db: context.db, secret: context.secret },
      { type: 'user', id: user.id },
      { userId: user.id, email: user.email, productSlug, locale: localeFromRequest(getRequest()) },
    );
    return { ok: true as const, key, expiresAt: license.expiresAt!.toISOString() };
  } catch (error) {
    if (error instanceof LicenseError) return { ok: false as const, code: error.code };
    throw error;
  }
}
