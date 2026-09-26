import { licenses, products, trialGrants, type Database } from '@kya-em/db';
import { and, eq, gt, ne } from 'drizzle-orm';
import type { Actor } from '../catalog/catalog.ts';
import { enqueueJob } from '../jobs/jobs.ts';
import {
  DAY,
  getLicense,
  insertLicense,
  LicenseError,
  offerOf,
  organizationForEmail,
  type LicenseDependencies,
} from './licenses.ts';

/**
 * Essai gratuit (spec 006) : une licence du type d'essai réglé sur le logiciel, une fois par compte et
 * par logiciel. Émise par le même service que les autres licences (copie figée, canal `trial`).
 */

/** Rappel envoyé avant la fin de l'essai. */
export const TRIAL_REMINDER_DAYS = 3;

class TrialAlreadyUsed extends Error {}

async function trialOffer(db: Database, productSlug: string) {
  const [product] = await db.select().from(products).where(eq(products.slug, productSlug)).limit(1);
  if (!product) throw new LicenseError('PRODUCT_NOT_FOUND');
  if (!product.trialLicenseTypeId) return { product, offer: null };
  const offer = await offerOf(db, product.trialLicenseTypeId);
  const usable = offer.type.nature === 'trial' && !offer.type.archivedAt && !offer.edition.archivedAt;
  return { product, offer: usable ? offer : null };
}

export interface TrialStatus {
  readonly product: { slug: string; name: string };
  /** Offre de l'essai ; `null` : pas d'essai pour ce logiciel. */
  readonly offer: {
    editionName: { fr: string; en?: string };
    typeName: { fr: string; en?: string };
    days: number;
  } | null;
  /** Essai déjà accordé à ce compte. */
  readonly used: { licenseId: string; at: string; expiresAt: string | null; key: string | null } | null;
}

export async function trialStatus(
  deps: LicenseDependencies,
  input: { userId: string | null; productSlug: string },
): Promise<TrialStatus> {
  const { product, offer } = await trialOffer(deps.db, input.productSlug);
  let used: TrialStatus['used'] = null;
  if (input.userId) {
    const [grant] = await deps.db
      .select()
      .from(trialGrants)
      .where(and(eq(trialGrants.userId, input.userId), eq(trialGrants.productId, product.id)))
      .limit(1);
    if (grant) {
      const license = await getLicense(deps, grant.licenseId);
      used = {
        licenseId: grant.licenseId,
        at: grant.createdAt.toISOString(),
        expiresAt: license?.expiresAt ?? null,
        key: license?.status === 'active' ? license.key : null,
      };
    }
  }
  return {
    product: { slug: product.slug, name: product.name },
    offer: offer ? { editionName: offer.edition.name, typeName: offer.type.name, days: offer.type.days } : null,
    used,
  };
}

/**
 * Active l'essai d'un compte : licence, marque « essai utilisé », courriel de clé et relances, dans
 * une seule transaction. Deux activations simultanées n'en donnent qu'une (`TRIAL_USED`).
 */
export async function startTrial(
  deps: LicenseDependencies,
  actor: Actor,
  input: { userId: string; email: string; productSlug: string; locale?: 'fr' | 'en' },
) {
  const { db } = deps;
  const { product, offer } = await trialOffer(db, input.productSlug);
  if (!offer) throw new LicenseError('TRIAL_UNAVAILABLE');
  const organizationId = await organizationForEmail(db, input.email);
  if (!organizationId) throw new LicenseError('ORGANIZATION_NOT_FOUND');
  try {
    return await db.transaction(async (tx) => {
      const t = tx as unknown as Database;
      const { license, key } = await insertLicense({ db: t, secret: deps.secret }, actor, offer, {
        licenseTypeId: offer.type.id,
        seats: 1,
        organizationId,
        recipientEmail: input.email,
        channel: 'trial',
        amount: 0,
        startsOnActivation: false,
      });
      const [grant] = await tx
        .insert(trialGrants)
        .values({ userId: input.userId, productId: product.id, licenseId: license.id })
        .onConflictDoNothing()
        .returning({ id: trialGrants.id });
      if (!grant) throw new TrialAlreadyUsed();
      const locale = input.locale ?? 'fr';
      const payload = { licenseId: license.id, email: input.email, locale };
      await enqueueJob(t, { kind: 'mail.license_key', payload, reference: license.id });
      const end = license.expiresAt!.getTime();
      await enqueueJob(t, {
        kind: 'mail.trial_ending',
        payload,
        reference: license.id,
        runAt: new Date(Math.max(Date.now(), end - TRIAL_REMINDER_DAYS * DAY)),
      });
      await enqueueJob(t, { kind: 'mail.trial_ended', payload, reference: license.id, runAt: new Date(end) });
      return { license, key };
    });
  } catch (error) {
    if (error instanceof TrialAlreadyUsed) throw new LicenseError('TRIAL_USED');
    throw error;
  }
}

/**
 * Faut-il encore relancer ? Non si la licence est révoquée ou si l'organisation a acheté ce logiciel
 * depuis le début de l'essai.
 */
export async function trialFollowUp(deps: LicenseDependencies, licenseId: string) {
  const license = await getLicense(deps, licenseId);
  if (!license || license.status === 'revoked' || license.channel !== 'trial' || !license.organizationId) return null;
  const [purchase] = await deps.db
    .select({ id: licenses.id })
    .from(licenses)
    .innerJoin(products, eq(licenses.productId, products.id))
    .where(
      and(
        eq(licenses.organizationId, license.organizationId),
        eq(products.slug, license.productSlug),
        eq(licenses.channel, 'purchase'),
        ne(licenses.id, license.id),
        gt(licenses.createdAt, new Date(license.createdAt)),
      ),
    )
    .limit(1);
  return purchase ? null : license;
}
