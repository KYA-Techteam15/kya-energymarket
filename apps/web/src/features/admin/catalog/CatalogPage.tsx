import { Link } from '@tanstack/react-router';
import { m } from '@/paraglide/messages.js';
import { ConsolePage, loc } from '../console/ui';
import type { getProducts } from './catalog';

type Data = NonNullable<Awaited<ReturnType<typeof getProducts>>>;

export const statusLabel = (status: string) =>
  (
    ({ available: m.cx_status_available, soon: m.cx_status_soon, hidden: m.cx_status_hidden }) as Record<
      string,
      () => string
    >
  )[status]?.() ?? status;
export const statusTone = (status: string) => (status === 'available' ? 'ok' : status === 'soon' ? 'info' : 'plain');

/** Catalogue → Logiciels (spec 005b, histoire 1). */
export function CatalogPage({ data }: { data: Data }) {
  return (
    <ConsolePage crumbs={[{ label: m.cx_nav_catalog(), to: '/admin/catalogue' }, { label: m.cx_nav_products() }]}>
      <div className="cx-head">
        <div>
          <h1>{m.cx_nav_products()}</h1>
          <p>{m.cx_catalog_intro()}</p>
        </div>
      </div>
      <section className="cx-card">
        <div className="cx-tbl-wrap">
          <table className="cx-tbl">
            <thead>
              <tr>
                <th scope="col">{m.cx_software()}</th>
                <th scope="col">{m.cx_f_status()}</th>
                <th scope="col" className="r">
                  {m.cx_editions()}
                </th>
                <th scope="col">{m.cx_draft()}</th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((product) => (
                <tr key={product.slug}>
                  <td>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span className="cx-logo" style={{ width: 36, height: 36, fontSize: 13 }} aria-hidden="true">
                        {product.logo?.startsWith('/') ? (
                          <img src={product.logo} alt="" style={{ width: 26, height: 26 }} />
                        ) : (
                          (product.monogram ?? product.name.slice(4, 6))
                        )}
                      </span>
                      <span className="cx-who">
                        <Link to="/admin/catalogue/$slug" params={{ slug: product.slug }} className="cx-rowlink">
                          {product.name}
                        </Link>
                        <small>{loc(product.kind)}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`cx-pill ${statusTone(product.status)}`}>{statusLabel(product.status)}</span>
                  </td>
                  <td className="r num">{product.editions}</td>
                  <td>
                    {product.pending ? (
                      <span className="cx-pill warn">{m.cx_draft_count({ count: product.pending })}</span>
                    ) : (
                      <span className="cx-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </ConsolePage>
  );
}
