import { member, organization, user, type Database } from '@kya-em/db';
import { desc, eq, ilike, inArray, or } from 'drizzle-orm';
import { kindOf } from './organizations.ts';
import { staffRolesOf } from './staff.ts';

export interface CustomerSummary {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly createdAt: string;
  /** Organisations d'entreprise seulement : l'organisation personnelle reste invisible. */
  readonly organizations: readonly { id: string; name: string; role: string }[];
  readonly staffRoles: readonly string[];
}

const escapeLike = (value: string) => value.replace(/[\\%_]/gu, (character) => `\\${character}`);

/**
 * Recherche de comptes pour l'équipe KYA (spec 003, outil `find_customer`) : par courriel ou nom,
 * données minimales (principe IV), 20 résultats au plus, les plus récents d'abord.
 */
export async function findCustomers(
  db: Database,
  input: { query: string; limit?: number },
): Promise<CustomerSummary[]> {
  const query = input.query.trim();
  if (query.length < 2) return [];
  const pattern = `%${escapeLike(query)}%`;
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 20);
  const accounts = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      role: user.role,
    })
    .from(user)
    .where(or(ilike(user.email, pattern), ilike(user.name, pattern)))
    .orderBy(desc(user.createdAt))
    .limit(limit);
  if (accounts.length === 0) return [];

  const memberships = await db
    .select({
      userId: member.userId,
      id: organization.id,
      name: organization.name,
      role: member.role,
      metadata: organization.metadata,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(
      inArray(
        member.userId,
        accounts.map((account) => account.id),
      ),
    );

  return accounts.map((account) => ({
    id: account.id,
    name: account.name,
    email: account.email,
    emailVerified: account.emailVerified,
    createdAt: account.createdAt.toISOString(),
    organizations: memberships
      .filter((row) => row.userId === account.id && kindOf(row.metadata) === 'company')
      .map((row) => ({ id: row.id, name: row.name, role: row.role })),
    staffRoles: staffRolesOf(account.role),
  }));
}
