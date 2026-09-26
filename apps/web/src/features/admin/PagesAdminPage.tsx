import { Link } from '@tanstack/react-router';
import { m } from '@/paraglide/messages.js';
import { localizeHref } from '@/paraglide/runtime.js';
import type { getPagesAdmin } from './content';
import { publicPath } from './editor/PageEditor';

type Pages = NonNullable<Awaited<ReturnType<typeof getPagesAdmin>>>['pages'];

function State({ state }: { state: { published: number | null; draft: number | null } }) {
  return (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
      {state.published ? (
        <span className="chip chip-staff">{m.admin_status_published_v({ version: state.published })}</span>
      ) : null}
      {state.draft ? <span className="chip">{m.admin_status_draft_v({ version: state.draft })}</span> : null}
      {!state.published && !state.draft ? <span className="muted">—</span> : null}
    </span>
  );
}

/** Pages composées : état par langue, édition et aperçu (spec 004, histoire 3). */
export function PagesAdminPage({ pages }: { pages: Pages }) {
  return (
    <>
      <header className="acct-head">
        <div>
          <h1>{m.admin_pages()}.</h1>
          <p>{m.admin_pages_intro()}</p>
        </div>
      </header>
      <section className="box">
        <div className="box-body">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">{m.admin_pages_page()}</th>
                <th scope="col">FR</th>
                <th scope="col">EN</th>
                <th scope="col">
                  <span className="sr">{m.admin_pages_actions()}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id}>
                  <td>
                    <b>{page.fr.title ?? page.key}</b>
                    <br />
                    <small className="muted mono">
                      {page.productName ?? m.admin_pages_marketplace()} · {page.key}
                    </small>
                  </td>
                  <td>
                    <State state={page.fr} />
                  </td>
                  <td>
                    <State state={page.en} />
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <Link
                      className="btn btn-line btn-sm"
                      to="/admin/pages/$id"
                      params={{ id: page.id }}
                      search={{ langue: 'fr' }}
                    >
                      {m.admin_pages_edit()}
                      <span className="sr"> {page.fr.title ?? page.key}</span>
                    </Link>{' '}
                    <a
                      className="btn btn-line btn-sm"
                      href={localizeHref(publicPath(page))}
                      target="_blank"
                      rel="noopener"
                    >
                      {m.admin_pages_view()}
                      <span className="sr"> {page.fr.title ?? page.key}</span>
                    </a>
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
