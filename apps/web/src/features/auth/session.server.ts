import { isStaff, staffRolesOf } from '@kya-em/auth';
import { listUserOrganizations } from '@kya-em/domain';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { runtime } from '@/shared/server/runtime.server';
import type { Viewer } from './viewer';

export async function authHandler(request: Request): Promise<Response> {
  const { auth } = runtime();
  if (!auth) return Response.json({ error: 'AUTH_UNAVAILABLE' }, { status: 503 });
  return auth.handler(request);
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

/** Session serveur (cookies de la requête) ; `null` si personne n'est connecté. */
export async function loadViewer(): Promise<Viewer | null> {
  const { auth, database } = runtime();
  if (!auth || !database) return null;
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  if (!session) return null;
  const organizations = await listUserOrganizations(database.db, session.user.id);
  // Organisation de la session, sinon l'organisation d'entreprise la plus récente, sinon la personnelle.
  const active =
    organizations.find((candidate) => candidate.id === session.session.activeOrganizationId) ??
    organizations.find((candidate) => candidate.kind === 'company') ??
    organizations[0];
  const role = (session.user as { role?: string | null }).role;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    initials: initialsOf(session.user.name),
    staffRoles: staffRolesOf(role),
    isStaff: isStaff(role),
    organization: active
      ? { id: active.id, name: active.name, role: active.role, visible: active.kind === 'company' }
      : null,
  };
}

export function authCapabilities() {
  const { auth, mailerConfigured } = runtime();
  return { available: auth !== undefined, magicLink: mailerConfigured };
}
