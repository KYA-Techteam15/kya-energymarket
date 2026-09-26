import { STAFF_ROLES } from '@kya-em/domain';
import { createServerFn } from '@tanstack/react-start';
import { changeStaffRole, loadTeam } from './team.server';

// Fonctions serveur de l'administration ; les droits sont revérifiés dans team.server.ts.
export const listTeam = createServerFn({ method: 'GET' }).handler(() => loadTeam());

const roleInput = (input: unknown) => {
  const { email, role } = (input ?? {}) as { email?: unknown; role?: unknown };
  if (typeof email !== 'string' || !email.includes('@') || email.length > 254) throw new Error('courriel invalide');
  if (typeof role !== 'string' || !(STAFF_ROLES as readonly string[]).includes(role)) throw new Error('rôle invalide');
  return { email, role };
};

export const grantRole = createServerFn({ method: 'POST' })
  .validator(roleInput)
  .handler(({ data }) => changeStaffRole(data, 'grant'));

export const revokeRole = createServerFn({ method: 'POST' })
  .validator(roleInput)
  .handler(({ data }) => changeStaffRole(data, 'revoke'));
