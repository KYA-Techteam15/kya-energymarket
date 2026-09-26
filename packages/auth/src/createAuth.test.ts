import { auditEvents, member, organization, type Database } from '@kya-em/db';
import { createTestDatabase } from '@kya-em/db/testing';
import {
  grantStaffRole,
  kindOf,
  listUserOrganizations,
  preferredOrganizationId,
  revokeStaffRole,
  StaffError,
} from '@kya-em/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAuth, type Auth } from './createAuth.ts';
import { isStaff, staffCan } from './permissions.ts';

let handle: Awaited<ReturnType<typeof createTestDatabase>>;
let db: Database;
let auth: Auth;

beforeAll(async () => {
  handle = await createTestDatabase();
  db = handle.db;
  auth = createAuth({
    db,
    secret: 'secret-de-test-long-de-plus-de-32-caracteres',
    baseUrl: 'http://localhost:3000',
    environment: 'test',
    mailer: null,
    tanstackCookies: false,
  });
});
afterAll(async () => {
  await handle.close();
});

async function signUp(email: string, name = 'Afi Kodjo') {
  const { headers, response } = await auth.api.signUpEmail({
    body: { email, password: 'motdepasse-solide', name },
    returnHeaders: true,
  });
  const cookie = (headers.getSetCookie?.() ?? [headers.get('set-cookie') ?? ''])
    .map((value) => value.split(';')[0])
    .join('; ');
  return { user: response.user, headers: new Headers({ cookie }) };
}

describe('comptes (spec 002, histoire 1 et 2)', () => {
  it('crée une organisation personnelle invisible et l’active dans la session', async () => {
    const { user, headers } = await signUp('afi@exemple.tg');
    const organizations = await listUserOrganizations(db, user.id);
    expect(organizations).toHaveLength(1);
    expect(organizations[0]).toMatchObject({ kind: 'personal', role: 'owner', name: 'Afi Kodjo' });

    expect(await auth.api.getSession({ headers })).toBeTruthy();
    expect(await preferredOrganizationId(db, user.id)).toBe(organizations[0]?.id);

    const trace = await db.select().from(auditEvents).where(eq(auditEvents.action, 'account.created'));
    expect(trace.map((event) => event.resourceId)).toContain(user.id);
  });

  it('préfère l’organisation d’entreprise une fois créée', async () => {
    const { user, headers } = await signUp('bureau@exemple.tg', 'Koffi Mensah');
    const created = await auth.api.createOrganization({
      body: { name: 'Soleil Plus', slug: 'soleil-plus', metadata: { kind: 'company' } },
      headers,
    });
    expect(created?.id).toBeTruthy();
    expect(await preferredOrganizationId(db, user.id)).toBe(created?.id);
    const [row] = await db.select().from(organization).where(eq(organization.id, created!.id));
    expect(kindOf(row?.metadata)).toBe('company');
    const trace = await db.select().from(auditEvents).where(eq(auditEvents.action, 'organization.created'));
    expect(trace.map((event) => event.resourceId)).toContain(created?.id);
  });

  it('refuse un mot de passe trop court', async () => {
    await expect(
      auth.api.signUpEmail({ body: { email: 'court@exemple.tg', password: 'court', name: 'Court' } }),
    ).rejects.toThrow();
  });

  it('refuse qu’un membre invite', async () => {
    const owner = await signUp('proprio@exemple.tg', 'Propriétaire');
    const guest = await signUp('membre@exemple.tg', 'Membre');
    const created = await auth.api.createOrganization({
      body: { name: 'Institut', slug: 'institut', metadata: { kind: 'company' } },
      headers: owner.headers,
    });
    const invitation = await auth.api.createInvitation({
      body: { email: 'membre@exemple.tg', role: 'member', organizationId: created!.id },
      headers: owner.headers,
    });
    await auth.api.acceptInvitation({ body: { invitationId: invitation.id }, headers: guest.headers });
    const members = await db.select().from(member).where(eq(member.organizationId, created!.id));
    expect(members.map((row) => row.role).sort()).toEqual(['member', 'owner']);
    await expect(
      auth.api.createInvitation({
        body: { email: 'autre@exemple.tg', role: 'member', organizationId: created!.id },
        headers: guest.headers,
      }),
    ).rejects.toThrow();
  });
});

describe('équipe KYA (spec 002, histoire 4)', () => {
  it('attribue, cumule et retire les rôles d’équipe, avec audit', async () => {
    await signUp('admin@kya.tg', 'Admin KYA');
    const actor = { type: 'system' as const, id: null };
    await grantStaffRole(db, { email: 'admin@kya.tg', role: 'kya_admin', actor });
    const both = await grantStaffRole(db, { email: 'admin@kya.tg', role: 'kya_support', actor });
    expect(both.roles.sort()).toEqual(['kya_admin', 'kya_support']);
    await expect(revokeStaffRole(db, { email: 'admin@kya.tg', role: 'kya_admin', actor })).rejects.toThrow(StaffError);
    const trace = await db.select().from(auditEvents).where(eq(auditEvents.action, 'staff.role_granted'));
    expect(trace).toHaveLength(2);
  });

  it('refuse un rôle inconnu', async () => {
    await expect(
      grantStaffRole(db, { email: 'admin@kya.tg', role: 'super_admin', actor: { type: 'system', id: null } }),
    ).rejects.toThrow('UNKNOWN_ROLE');
  });

  it('applique les droits par rôle, refus par défaut', () => {
    expect(isStaff('user')).toBe(false);
    expect(isStaff('kya_support')).toBe(true);
    expect(staffCan('kya_admin', 'staff', 'grant')).toBe(true);
    expect(staffCan('kya_sales', 'staff', 'grant')).toBe(false);
    expect(staffCan('kya_sales', 'sales', 'refund')).toBe(false);
    expect(staffCan('kya_content,kya_support', 'content', 'publish')).toBe(true);
    expect(staffCan('user', 'catalog', 'read')).toBe(false);
  });
});
