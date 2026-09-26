import {
  getLicense,
  listLicensesForOrganizations,
  listUserOrganizations,
  recordSeatInvite,
  releaseSeat,
} from '@kya-em/domain';
import { localeFromRequest, renderMail } from '@kya-em/mail';
import { getRequest, getRequestHeaders } from '@tanstack/react-start/server';
import { runtime } from '@/shared/server/runtime.server';

/**
 * Espace client, rubrique Licences (spec 005, histoire 2). Chaque membre voit les licences de ses
 * organisations ; seul le propriétaire libère ou attribue un poste. Tout est revérifié ici.
 */
async function viewer() {
  const { auth, database, secret } = runtime();
  if (!auth || !database) return null;
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  if (!session) return null;
  const organizations = await listUserOrganizations(database.db, session.user.id);
  return { db: database.db, secret, session, organizations };
}

export async function loadMyLicenses() {
  const current = await viewer();
  if (!current) return null;
  const licenses = await listLicensesForOrganizations(
    { db: current.db, secret: current.secret },
    current.organizations.map((organization) => organization.id),
  );
  const owned = new Set(
    current.organizations
      .filter((organization) => organization.role === 'owner')
      .map((organization) => organization.id),
  );
  // Temps restant calculé ici, à l'heure du serveur (le rendu reste déterministe).
  const now = Date.now();
  return licenses.map((license) => {
    const starts = Date.parse(license.startsAt);
    const expires = Date.parse(license.expiresAt);
    return {
      ...license,
      canManage: owned.has(license.organizationId),
      expired: expires < now,
      remainingDays: Math.max(0, Math.ceil((expires - now) / 86_400_000)),
      remainingShare: Math.min(100, Math.max(0, ((expires - now) / Math.max(1, expires - starts)) * 100)),
    };
  });
}

/** La licence, si la personne est propriétaire de son organisation. */
async function managedLicense(licenseId: string) {
  const current = await viewer();
  if (!current) return null;
  const license = await getLicense({ db: current.db, secret: current.secret }, licenseId);
  const owner = current.organizations.some(
    (organization) => organization.id === license?.organizationId && organization.role === 'owner',
  );
  return license && owner ? { ...current, license } : null;
}

export async function releaseMySeat(licenseId: string, activationId: string) {
  const current = await managedLicense(licenseId);
  if (!current) return { ok: false as const, code: 'FORBIDDEN' };
  const ok = await releaseSeat(current.db, { type: 'user', id: current.session.user.id }, { licenseId, activationId });
  return ok ? { ok: true as const } : { ok: false as const, code: 'NOT_FOUND' };
}

/** Attribue un poste à un collègue : la clé et la marche à suivre partent par courriel. */
export async function assignSeat(licenseId: string, email: string) {
  const current = await managedLicense(licenseId);
  if (!current) return { ok: false as const, code: 'FORBIDDEN' };
  const { mailer, env } = runtime();
  if (!mailer) return { ok: false as const, code: 'NO_MAILER' };
  if (!current.license.key) return { ok: false as const, code: 'KEY_UNAVAILABLE' };
  const recorded = await recordSeatInvite(
    current.db,
    { type: 'user', id: current.session.user.id },
    { licenseId, email },
  ).catch(() => null);
  if (!recorded) return { ok: false as const, code: 'INVALID_EMAIL' };
  const locale = localeFromRequest(getRequest());
  await mailer.send(
    renderMail(
      {
        kind: 'license-seat',
        productName: current.license.productName,
        inviterName: current.session.user.name,
        key: current.license.key,
        url: `${env.APP_BASE_URL}/${locale}/logiciels/${current.license.productSlug}/support`,
      },
      locale,
      recorded,
    ),
  );
  return { ok: true as const };
}
