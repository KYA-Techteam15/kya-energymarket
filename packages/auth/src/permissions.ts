import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements, userAc } from 'better-auth/plugins/admin/access';
import { STAFF_ROLES, staffRolesOf, type StaffRole } from '@kya-em/domain';

export { STAFF_ROLES, staffRolesOf, type StaffRole };

/**
 * Rôles de l'équipe KYA (spec 002, FR-005), distincts des rôles clients (`owner`, `member` d'une
 * organisation). Un compte peut cumuler plusieurs rôles d'équipe (valeur séparée par des virgules).
 * Seuls ces rôles ouvrent `/admin` et, plus tard, le serveur MCP (réservé aux administrateurs KYA).
 */

const statement = {
  ...defaultStatements,
  catalog: ['read', 'write'],
  content: ['read', 'write', 'publish'],
  sales: ['read', 'write', 'refund'],
  licenses: ['read', 'write', 'revoke'],
  support: ['read', 'reply'],
  stats: ['read'],
  staff: ['read', 'grant'],
} as const;

export const ac = createAccessControl(statement);

export const roles = {
  /** Client : aucun droit d'administration. */
  user: ac.newRole({ ...userAc.statements }),
  kya_admin: ac.newRole({
    ...adminAc.statements,
    catalog: ['read', 'write'],
    content: ['read', 'write', 'publish'],
    sales: ['read', 'write', 'refund'],
    licenses: ['read', 'write', 'revoke'],
    support: ['read', 'reply'],
    stats: ['read'],
    staff: ['read', 'grant'],
  }),
  kya_sales: ac.newRole({
    catalog: ['read'],
    sales: ['read', 'write'],
    licenses: ['read', 'write'],
    stats: ['read'],
    staff: ['read'],
  }),
  kya_content: ac.newRole({ catalog: ['read', 'write'], content: ['read', 'write', 'publish'], staff: ['read'] }),
  kya_support: ac.newRole({ sales: ['read'], licenses: ['read'], support: ['read', 'reply'], staff: ['read'] }),
};

export type Resource = keyof typeof statement;

export const isStaff = (role: string | null | undefined) => staffRolesOf(role).length > 0;

/** Un des rôles d'équipe du compte autorise-t-il cette action ? Refus par défaut. */
export function staffCan(role: string | null | undefined, resource: Resource, action: string): boolean {
  return staffRolesOf(role).some((staffRole) => {
    const allowed = (roles[staffRole].statements as Partial<Record<Resource, readonly string[]>>)[resource];
    return allowed?.includes(action) ?? false;
  });
}
