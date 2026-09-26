import { auditEvents, jobs, licenseActivations, licenseBatches, licenses, user, type Database } from '@kya-em/db';
import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  notExists,
  sql,
  sum,
} from 'drizzle-orm';
import { DAY, OFFLINE_DAYS } from '../licenses/licenses.ts';

/**
 * Tableau de bord de la console (spec 005b, FR-009). Tout se calcule sur les copies figées des
 * licences (montant, canal) et sur les activations : changer un prix ne réécrit jamais l'historique.
 */
export const PERIODS = { '30j': 30, '90j': 90, '365j': 365 } as const;
export type Period = keyof typeof PERIODS;

/** Lundi 00:00 UTC de la semaine d'une date. */
function weekStart(date: Date) {
  const day = (date.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day));
}

/** Numéro de semaine ISO 8601. */
function isoWeek(date: Date) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  return (
    1 + Math.round(((target.getTime() - firstThursday.getTime()) / DAY - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
  );
}

export async function dashboardStats(db: Database, input: { period?: Period; now?: Date } = {}) {
  const now = input.now ?? new Date();
  const days = PERIODS[input.period ?? '30j'];
  const from = new Date(now.getTime() - days * DAY);
  const previousFrom = new Date(from.getTime() - days * DAY);
  const inPeriod = (start: Date, end: Date) => and(gte(licenses.createdAt, start), lte(licenses.createdAt, end));

  const [
    [sold = { amount: 0, n: 0 }],
    [previousSold = { amount: 0 }],
    [offered = { n: 0 }],
    [trials = { n: 0 }],
    [converted = { n: 0 }],
    [devices = { n: 0 }],
    [newDevices = { n: 0 }],
    [expiring = { n: 0 }],
    [failedMails = { n: 0 }],
  ] = await Promise.all([
    db
      .select({ amount: sql<number>`coalesce(${sum(licenses.amount)}, 0)::int`, n: count() })
      .from(licenses)
      .where(and(eq(licenses.channel, 'purchase'), inPeriod(from, now))),
    db
      .select({ amount: sql<number>`coalesce(${sum(licenses.amount)}, 0)::int` })
      .from(licenses)
      .where(and(eq(licenses.channel, 'purchase'), inPeriod(previousFrom, from))),
    db
      .select({ n: count() })
      .from(licenses)
      .where(
        and(
          eq(licenses.amount, 0),
          ne(licenses.channel, 'trial'),
          ne(licenses.channel, 'purchase'),
          inPeriod(from, now),
        ),
      ),
    db
      .select({ n: count() })
      .from(licenses)
      .where(and(eq(licenses.channel, 'trial'), inPeriod(from, now))),
    // Essai converti : l'organisation achète après son essai.
    db
      .execute(
        sql`
      SELECT count(DISTINCT t.organization_id)::int AS n FROM ${licenses} t
      WHERE t.channel = 'trial' AND t.organization_id IS NOT NULL AND t.created_at >= ${from} AND t.created_at <= ${now}
        AND EXISTS (SELECT 1 FROM ${licenses} p WHERE p.channel = 'purchase'
          AND p.organization_id = t.organization_id AND p.created_at > t.created_at)`,
      )
      .then((result) => (result as unknown as { rows: { n: number }[] }).rows),
    db
      .select({ n: count() })
      .from(licenseActivations)
      .where(
        and(
          isNull(licenseActivations.releasedAt),
          gt(licenseActivations.lastRefreshAt, new Date(now.getTime() - OFFLINE_DAYS * DAY)),
        ),
      ),
    db.select({ n: count() }).from(licenseActivations).where(gte(licenseActivations.activatedAt, from)),
    db
      .select({ n: count() })
      .from(licenses)
      .where(
        and(
          eq(licenses.channel, 'purchase'),
          eq(licenses.status, 'active'),
          isNotNull(licenses.expiresAt),
          gt(licenses.expiresAt, now),
          lte(licenses.expiresAt, new Date(now.getTime() + 30 * DAY)),
        ),
      ),
    db.select({ n: count() }).from(jobs).where(eq(jobs.status, 'failed')),
  ]);

  // Série hebdomadaire : 8 semaines, par canal.
  const firstWeek = new Date(weekStart(now).getTime() - 7 * 7 * DAY);
  const weeklyRows = await db
    .select({
      week: sql<string>`to_char(date_trunc('week', ${licenses.createdAt} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`,
      channel: licenses.channel,
      amount: licenses.amount,
      n: count(),
    })
    .from(licenses)
    .where(gte(licenses.createdAt, firstWeek))
    .groupBy(sql`1`, licenses.channel, licenses.amount);
  const weekly = Array.from({ length: 8 }, (_, index) => {
    const start = new Date(firstWeek.getTime() + index * 7 * DAY);
    const key = start.toISOString().slice(0, 10);
    const rows = weeklyRows.filter((row) => row.week === key);
    const total = (predicate: (row: (typeof rows)[number]) => boolean) =>
      rows.filter(predicate).reduce((acc, row) => acc + row.n, 0);
    return {
      week: `S${isoWeek(start)}`,
      start: key,
      purchase: total((row) => row.channel === 'purchase'),
      trial: total((row) => row.channel === 'trial'),
      offered: total((row) => row.channel !== 'purchase' && row.channel !== 'trial'),
    };
  });

  // Lots dont des clés n'ont jamais été activées.
  const idle = await db
    .select({ id: licenseBatches.id, label: licenseBatches.label, n: countDistinct(licenses.id) })
    .from(licenseBatches)
    .innerJoin(licenses, eq(licenses.batchId, licenseBatches.id))
    .where(
      and(
        eq(licenses.status, 'active'),
        notExists(
          db
            .select({ one: sql`1` })
            .from(licenseActivations)
            .where(eq(licenseActivations.licenseId, licenses.id)),
        ),
      ),
    )
    .groupBy(licenseBatches.id, licenseBatches.label)
    .orderBy(desc(countDistinct(licenses.id)))
    .limit(3);

  const recent = await db
    .select({ event: auditEvents, actorName: user.name })
    .from(auditEvents)
    .leftJoin(user, eq(auditEvents.actorId, user.id))
    .where(
      inArray(auditEvents.action, [
        'license.issued',
        'license.batch_generated',
        'license.extended',
        'license.revoked',
        'license.claimed',
        'catalog.published',
        'mcp.tool_called',
      ]),
    )
    .orderBy(desc(auditEvents.occurredAt))
    .limit(8);

  return {
    period: input.period ?? '30j',
    sold: {
      amount: sold.amount,
      count: sold.n,
      /** Évolution en pour cent sur la période précédente ; `null` sans base de comparaison. */
      change: previousSold.amount
        ? Math.round(((sold.amount - previousSold.amount) / previousSold.amount) * 100)
        : null,
    },
    offered: offered.n,
    trials: { started: trials.n, converted: converted.n },
    devices: { active: devices.n, activatedInPeriod: newDevices.n },
    weekly,
    todo: { expiringPurchased: expiring.n, failedMails: failedMails.n, idleBatches: idle },
    recent: recent.map(({ event, actorName }) => ({
      id: event.id,
      action: event.action,
      actorType: event.actorType,
      actorName,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      occurredAt: event.occurredAt.toISOString(),
      details: JSON.stringify(event.details),
    })),
  };
}

export type DashboardStats = Awaited<ReturnType<typeof dashboardStats>>;
