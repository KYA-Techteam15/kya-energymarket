import { kindOf, listUserOrganizations } from '@kya-em/domain';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { runtime } from '@/shared/server/runtime.server';

/**
 * Organisation active de la personne connectée, avec ses membres et invitations en attente
 * (spec 002, histoires 2 et 3). `null` pour une organisation personnelle, qui reste invisible.
 * Better Auth vérifie que la personne est membre de l'organisation.
 */
export async function loadActiveOrganization() {
  const { auth, database } = runtime();
  if (!auth || !database) return null;
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  if (!session) return null;
  // Organisation visée explicitement : celle de la session si c'est une entreprise, sinon la plus récente.
  const companies = (await listUserOrganizations(database.db, session.user.id)).filter(
    (candidate) => candidate.kind === 'company',
  );
  const target = companies.find((candidate) => candidate.id === session.session.activeOrganizationId) ?? companies[0];
  if (!target) return null;
  const full = await auth.api.getFullOrganization({ query: { organizationId: target.id }, headers }).catch(() => null);
  if (!full || kindOf(full.metadata as string | null | undefined) !== 'company') return null;
  const me = full.members.find((member) => member.userId === session.user.id);
  return {
    id: full.id,
    name: full.name,
    myRole: me?.role ?? 'member',
    members: full.members.map((member) => ({
      id: member.id,
      userId: member.userId,
      role: member.role,
      name: member.user.name,
      email: member.user.email,
      isMe: member.userId === session.user.id,
    })),
    invitations: full.invitations
      .filter((invitation) => invitation.status === 'pending')
      .map((invitation) => ({ id: invitation.id, email: invitation.email, expiresAt: String(invitation.expiresAt) })),
  };
}

/** Invitation lisible par la personne invitée (connectée avec le bon courriel), sinon `null`. */
export async function loadInvitation(id: string) {
  const { auth } = runtime();
  if (!auth) return null;
  const invitation = await auth.api.getInvitation({ query: { id }, headers: getRequestHeaders() }).catch(() => null);
  if (!invitation || invitation.status !== 'pending') return null;
  return { id: invitation.id, organizationName: invitation.organizationName };
}
