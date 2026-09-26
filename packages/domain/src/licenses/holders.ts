import { member, organization, user, type Database } from '@kya-em/db';
import { and, eq, ilike, or } from 'drizzle-orm';
import { kindOf } from '../accounts/organizations.ts';
import { organizationForEmail } from './licenses.ts';

/**
 * Titulaires possibles d'une licence, pour la console (spec 005b, histoire 2) : une personne (son
 * organisation d'entreprise si elle en a une, sinon la personnelle) ou une organisation d'entreprise.
 */
export interface LicenseHolder {
  readonly kind: 'person' | 'organization';
  readonly organizationId: string;
  readonly name: string;
  readonly detail: string;
}

const escapeLike = (value: string) => value.replace(/[\\%_]/gu, (character) => `\\${character}`);

export async function findLicenseHolders(db: Database, query: string): Promise<LicenseHolder[]> {
  const needle = query.trim();
  if (needle.length < 2) return [];
  const pattern = `%${escapeLike(needle)}%`;
  const [people, companies] = await Promise.all([
    db
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(or(ilike(user.email, pattern), ilike(user.name, pattern)))
      .limit(8),
    db
      .select({ id: organization.id, name: organization.name, metadata: organization.metadata, email: user.email })
      .from(organization)
      .innerJoin(member, and(eq(member.organizationId, organization.id), eq(member.role, 'owner')))
      .innerJoin(user, eq(member.userId, user.id))
      .where(ilike(organization.name, pattern))
      .limit(8),
  ]);
  const holders: LicenseHolder[] = [];
  for (const person of people) {
    const organizationId = await organizationForEmail(db, person.email);
    if (organizationId) holders.push({ kind: 'person', organizationId, name: person.name, detail: person.email });
  }
  for (const company of companies) {
    if (kindOf(company.metadata) !== 'company' || holders.some((item) => item.organizationId === company.id)) continue;
    holders.push({ kind: 'organization', organizationId: company.id, name: company.name, detail: company.email });
  }
  return holders.slice(0, 10);
}
