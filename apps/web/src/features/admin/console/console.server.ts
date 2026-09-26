import {
  dashboardStats,
  findLicenses,
  getCatalogProduct,
  listBatches,
  listJournal,
  listProducts,
  pick,
  type Period,
} from '@kya-em/domain';
import { consoleStaff } from './access.server';

/** Contexte de la console : qui est là, ce que son rôle permet, l'environnement (spec 005b). */
export async function loadConsoleContext() {
  const current = await consoleStaff('staff', 'read');
  if (!current) return null;
  const can = (resource: Parameters<typeof current.can>[0], action: string) => current.can(resource, action);
  return {
    name: current.session.user.name,
    email: current.session.user.email,
    environment: current.env.APP_ENV,
    can: {
      catalog: { read: can('catalog', 'read'), write: can('catalog', 'write') },
      content: { read: can('content', 'read'), write: can('content', 'write') },
      licenses: { read: can('licenses', 'read'), write: can('licenses', 'write'), revoke: can('licenses', 'revoke') },
      stats: { read: can('stats', 'read') },
      staff: { read: can('staff', 'read'), grant: can('staff', 'grant') },
    },
  };
}

/** Recherche Ctrl K : licences (clé, identifiant, titulaire, courriel), lots, éditions. */
export async function searchConsole(query: string) {
  const current = await consoleStaff('staff', 'read');
  if (!current) return null;
  const needle = query.trim();
  if (needle.length < 2) return { licenses: [], batches: [], editions: [] };
  const lower = needle.toLowerCase();
  const [licenses, batches, editions] = await Promise.all([
    current.can('licenses', 'read')
      ? findLicenses({ db: current.db, secret: current.secret }, { query: needle, limit: 6 }).then((result) =>
          result.items.map((item) => ({
            id: item.id,
            label: item.organizationId ? item.customerName : null,
            recipient: item.recipientEmail,
            offer: `${pick(item.editionName, 'fr')} · ${pick(item.typeName, 'fr')}`,
            status: item.status,
          })),
        )
      : [],
    current.can('licenses', 'read')
      ? listBatches(current.db).then((rows) =>
          rows
            .filter((row) => row.label.toLowerCase().includes(lower))
            .slice(0, 4)
            .map((row) => ({ id: row.id, label: row.label, count: row.count })),
        )
      : [],
    current.can('catalog', 'read')
      ? listProducts(current.db, { includeHidden: true }).then(async (products) => {
          const found: { slug: string; product: string; code: string; label: string; visible: boolean }[] = [];
          for (const summary of products) {
            const product = await getCatalogProduct(current.db, summary.slug);
            for (const edition of product?.editions ?? []) {
              const name = pick(edition.name, 'fr');
              if (`${name} ${edition.code} ${summary.name}`.toLowerCase().includes(lower)) {
                found.push({
                  slug: summary.slug,
                  product: summary.name,
                  code: edition.code,
                  label: name,
                  visible: edition.visible,
                });
              }
            }
          }
          return found.slice(0, 4);
        })
      : [],
  ]);
  return { licenses, batches, editions };
}

export async function loadDashboard(period: Period) {
  const current = await consoleStaff('stats', 'read');
  if (!current) return null;
  return dashboardStats(current.db, { period });
}

export async function loadJournal(filters: { actorType?: string; resourceType?: string; before?: string }) {
  const current = await consoleStaff('staff', 'read');
  if (!current) return null;
  return listJournal(current.db, {
    actorType: filters.actorType as never,
    resourceType: filters.resourceType,
    before: filters.before,
    limit: 100,
  });
}
