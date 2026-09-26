import { user, type Database } from '@kya-em/db';
import { eq, like, or } from 'drizzle-orm';
import { recordAuditEvent } from '../audit/recordAuditEvent.ts';

/**
 * Équipe KYA (spec 002, FR-005) : rôles portés par le compte, distincts des rôles d'organisation.
 * Un compte peut cumuler plusieurs rôles (valeur séparée par des virgules, format du plugin admin).
 */
export const STAFF_ROLES = ['kya_admin', 'kya_sales', 'kya_content', 'kya_support'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const isStaffRole = (value: string): value is StaffRole => (STAFF_ROLES as readonly string[]).includes(value);

export function rolesOf(role: string | null | undefined): string[] {
  return (role ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export const staffRolesOf = (role: string | null | undefined): StaffRole[] => rolesOf(role).filter(isStaffRole);

export class StaffError extends Error {
  constructor(readonly code: 'ACCOUNT_NOT_FOUND' | 'UNKNOWN_ROLE' | 'LAST_ADMIN') {
    super(code);
  }
}

function serialize(roles: readonly string[]): string {
  const unique = [...new Set(roles)];
  return unique.length ? unique.join(',') : 'user';
}

async function findByEmail(db: Database, email: string) {
  const [row] = await db.select().from(user).where(eq(user.email, email.trim().toLowerCase())).limit(1);
  if (!row) throw new StaffError('ACCOUNT_NOT_FOUND');
  return row;
}

export async function grantStaffRole(
  db: Database,
  input: { email: string; role: string; actor: { type: 'kya_staff' | 'system'; id: string | null } },
) {
  if (!isStaffRole(input.role)) throw new StaffError('UNKNOWN_ROLE');
  const account = await findByEmail(db, input.email);
  const next = serialize([...rolesOf(account.role).filter((value) => value !== 'user'), input.role]);
  await db.update(user).set({ role: next }).where(eq(user.id, account.id));
  await recordAuditEvent(db, {
    actorType: input.actor.type,
    actorId: input.actor.id,
    action: 'staff.role_granted',
    resourceType: 'user',
    resourceId: account.id,
    outcome: 'success',
    details: { role: input.role },
  });
  return { userId: account.id, roles: rolesOf(next) };
}

export async function revokeStaffRole(
  db: Database,
  input: { email: string; role: string; actor: { type: 'kya_staff' | 'system'; id: string | null } },
) {
  if (!isStaffRole(input.role)) throw new StaffError('UNKNOWN_ROLE');
  const account = await findByEmail(db, input.email);
  if (input.role === 'kya_admin') {
    const admins = (await listStaff(db)).filter((member) => member.roles.includes('kya_admin'));
    if (admins.length <= 1 && admins[0]?.id === account.id) throw new StaffError('LAST_ADMIN');
  }
  const next = serialize(rolesOf(account.role).filter((value) => value !== input.role && value !== 'user'));
  await db.update(user).set({ role: next }).where(eq(user.id, account.id));
  await recordAuditEvent(db, {
    actorType: input.actor.type,
    actorId: input.actor.id,
    action: 'staff.role_revoked',
    resourceType: 'user',
    resourceId: account.id,
    outcome: 'success',
    details: { role: input.role },
  });
  return { userId: account.id, roles: rolesOf(next) };
}

export async function listStaff(db: Database) {
  const rows = await db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role })
    .from(user)
    .where(or(...STAFF_ROLES.map((role) => like(user.role, `%${role}%`))));
  return rows
    .map((row) => ({ id: row.id, name: row.name, email: row.email, roles: staffRolesOf(row.role) }))
    .filter((row) => row.roles.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}
