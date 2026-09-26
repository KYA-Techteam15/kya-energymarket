import { Link } from '@tanstack/react-router';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import type { getCatalogAdmin } from './content';

type CatalogAdmin = NonNullable<Awaited<ReturnType<typeof getCatalogAdmin>>>;

export const statusLabel = (status: string) =>
  status === 'available' ? m.state_available() : status === 'soon' ? m.state_soon() : m.admin_catalog_hidden();

/** Catalogue : les logiciels et leur état (spec 004, histoire 2). */
export function CatalogAdminPage({ admin }: { admin: CatalogAdmin }) {
  const locale = getLocale();
  return (
    <>
      <header className="acct-head">
        <div>
          <h1>{m.admin_catalog()}.</h1>
          <p>{admin.canWrite ? m.admin_catalog_intro() : m.admin_catalog_read_only()}</p>
        </div>
      </header>
      <section className="box">
        <div className="box-body">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">{m.admin_catalog_product()}</th>
                <th scope="col">{m.admin_catalog_status()}</th>
                <th scope="col">
                  <span className="sr">{m.admin_pages_actions()}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {admin.products.map((product) => (
                <tr key={product.slug}>
                  <td>
                    <b>{product.name}</b>
                    <br />
                    <small className="muted">
                      {locale === 'en' ? product.kind.en || product.kind.fr : product.kind.fr}
                    </small>
                  </td>
                  <td>
                    <span className={product.status === 'available' ? 'state state-ok' : 'state state-soon'}>
                      {statusLabel(product.status)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link className="btn btn-line btn-sm" to="/admin/catalogue/$slug" params={{ slug: product.slug }}>
                      {admin.canWrite ? m.admin_pages_edit() : m.admin_pages_view()}
                      <span className="sr"> {product.name}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
