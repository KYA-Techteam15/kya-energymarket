import { randomUUID } from 'node:crypto';
import { member, organization, type Database } from '@kya-em/db';
import { and, desc, eq } from 'drizzle-orm';

/**
 * Organisation invisible par défaut (spec 002, FR-002). Chaque compte reçoit une organisation
 * personnelle, jamais montrée ; une organisation d'entreprise se crée quand on achète pour une
 * structure, et devient alors visible. La nature est portée par les métadonnées de l'organisation.
 */
export type OrganizationKind = 'personal' | 'company';

export function kindOf(metadata: string | null | undefined): OrganizationKind {
  try {
    return (JSON.parse(metadata ?? '{}') as { kind?: string }).kind === 'personal' ? 'personal' : 'company';
  } catch {
    return 'company';
  }
}

export const metadataFor = (kind: OrganizationKind) => JSON.stringify({ kind });

/** Identifiant d'adresse lisible et unique pour une organisation d'entreprise. */
export function slugFor(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '')
    .slice(0, 40);
  return `${base || 'organisation'}-${randomUUID().slice(0, 6)}`;
}

/**
 * Crée l'organisation personnelle du compte si elle n'existe pas (idempotent : l'inscription et la
 * première session peuvent l'appeler en même temps ; l'identifiant d'adresse unique tranche).
 */
export async function ensurePersonalOrganization(db: Database, account: { id: string; name: string }): Promise<string> {
  const slug = `perso-${account.id.toLowerCase()}`;
  const organizationId = randomUUID();
  const createdAt = new Date();
  const created = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(organization)
      .values({ id: organizationId, name: account.name, slug, createdAt, metadata: metadataFor('personal') })
      .onConflictDoNothing({ target: organization.slug })
      .returning({ id: organization.id });
    if (inserted.length === 0) return false;
    await tx.insert(member).values({ id: randomUUID(), organizationId, userId: account.id, role: 'owner', createdAt });
    return true;
  });
  if (created) return organizationId;
  const [existing] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1);
  if (!existing) throw new Error('organisation personnelle introuvable');
  return existing.id;
}

export interface UserOrganization {
  readonly id: string;
  readonly name: string;
  readonly kind: OrganizationKind;
  readonly role: string;
  readonly createdAt: Date;
}

export async function listUserOrganizations(db: Database, userId: string): Promise<UserOrganization[]> {
  const rows = await db
    .select({
      id: organization.id,
      name: organization.name,
      metadata: organization.metadata,
      role: member.role,
      createdAt: organization.createdAt,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId))
    .orderBy(desc(organization.createdAt));
  return rows.map(({ metadata, ...row }) => ({ ...row, kind: kindOf(metadata) }));
}

/** Organisation retenue par défaut : la plus récente organisation d'entreprise, sinon la personnelle. */
export async function preferredOrganizationId(db: Database, userId: string): Promise<string | null> {
  const organizations = await listUserOrganizations(db, userId);
  return (organizations.find((candidate) => candidate.kind === 'company') ?? organizations[0])?.id ?? null;
}

export async function memberRole(db: Database, userId: string, organizationId: string): Promise<string | null> {
  const [row] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
    .limit(1);
  return row?.role ?? null;
}
