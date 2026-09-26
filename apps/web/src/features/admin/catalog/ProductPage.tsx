import { Link, useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { m } from '@/paraglide/messages.js';
import { ConsoleIcon, ConsolePage, loc, Switch, Toast, useNotice } from '../console/ui';
import { statusLabel, statusTone } from './CatalogPage';
import { DraftBar, useCatalogEditor, type Editing } from './editor';

/** Un logiciel : fiche, éditions (ordre, visible, en vente), fonctions du logiciel (spec 005b, histoire 1). */
export function ProductPage({ slug, editing }: { slug: string; editing: Editing }) {
  const notice = useNotice();
  const navigate = useNavigate();
  const editor = useCatalogEditor(slug, editing, notice);
  const doc = editing.document;
  const published = new Set(editing.published);
  const active = doc.editions.filter((edition) => !edition.archived);
  const archived = doc.editions.filter((edition) => edition.archived);
  const [creating, setCreating] = useState(false);
  const disabled = !editor.canWrite || editor.busy;

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const code = String(data.get('code')).trim();
    const name = String(data.get('name')).trim();
    const ok = await editor.change([{ op: 'edition', code, fields: { name: { fr: name } } }], m.cx_edition_created());
    if (ok) void navigate({ to: '/admin/catalogue/$slug/$edition', params: { slug, edition: code } });
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (key: string) => String(data.get(key) ?? '').trim();
    await editor.change(
      [
        {
          op: 'product',
          fields: {
            name: text('name'),
            status: text('status') as 'available' | 'soon' | 'hidden',
            kind: { fr: text('kind_fr'), en: text('kind_en') || undefined },
            summary: { fr: text('summary_fr'), en: text('summary_en') || undefined },
          },
        },
      ],
      m.cx_saved_draft(),
    );
  };

  return (
    <ConsolePage
      crumbs={[
        { label: m.cx_nav_catalog(), to: '/admin/catalogue' },
        { label: m.cx_nav_products(), to: '/admin/catalogue' },
        { label: doc.product.name },
      ]}
    >
      <section className="cx-card">
        <div className="cx-product">
          <span className="cx-logo" aria-hidden="true">
            {editing.live.logo?.startsWith('/') ? (
              <img src={editing.live.logo} alt="" />
            ) : (
              (doc.product.monogram ?? doc.product.name.slice(4, 6))
            )}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 19 }}>{doc.product.name}</h1>
            <span className="cx-muted">
              {loc(doc.product.kind)} · {m.cx_n_editions({ count: active.length })}
            </span>
          </div>
          <span className={`cx-pill ${statusTone(doc.product.status)}`}>{statusLabel(doc.product.status)}</span>
          <a className="cx-btn cx-btn-sm" href={`/fr/logiciels/${slug}`} target="_blank" rel="noopener">
            {m.cx_public_page()}
          </a>
        </div>
        <details style={{ borderTop: '1px solid var(--cx-line)' }}>
          <summary className="cx-card-h" style={{ cursor: 'pointer', borderBottom: 0 }}>
            <h2>{m.cx_product_sheet()}</h2>
          </summary>
          <form
            key={editing.revision ?? 'publie'}
            className="cx-card-b"
            onSubmit={(event) => void saveProduct(event)}
            style={{ display: 'grid', gap: 12, borderTop: '1px solid var(--cx-line)' }}
          >
            <div className="cx-grid2">
              <div className="cx-field">
                <label htmlFor="p-name">{m.cx_f_name()}</label>
                <input
                  id="p-name"
                  name="name"
                  className="cx-input"
                  defaultValue={doc.product.name}
                  disabled={disabled}
                />
              </div>
              <div className="cx-field">
                <label htmlFor="p-status">{m.cx_f_status()}</label>
                <select
                  id="p-status"
                  name="status"
                  className="cx-input"
                  defaultValue={doc.product.status}
                  disabled={disabled}
                >
                  <option value="available">{m.cx_status_available()}</option>
                  <option value="soon">{m.cx_status_soon()}</option>
                  <option value="hidden">{m.cx_status_hidden()}</option>
                </select>
              </div>
            </div>
            <div className="cx-grid2">
              <div className="cx-field">
                <label htmlFor="p-kind-fr">{m.cx_f_kind()} (FR)</label>
                <input
                  id="p-kind-fr"
                  name="kind_fr"
                  className="cx-input"
                  defaultValue={doc.product.kind.fr}
                  disabled={disabled}
                />
              </div>
              <div className="cx-field">
                <label htmlFor="p-kind-en">{m.cx_f_kind()} (EN)</label>
                <input
                  id="p-kind-en"
                  name="kind_en"
                  className="cx-input"
                  defaultValue={doc.product.kind.en ?? ''}
                  disabled={disabled}
                />
              </div>
            </div>
            <div className="cx-grid2">
              <div className="cx-field">
                <label htmlFor="p-summary-fr">{m.cx_f_summary()} (FR)</label>
                <textarea
                  id="p-summary-fr"
                  name="summary_fr"
                  className="cx-input"
                  rows={3}
                  defaultValue={doc.product.summary.fr}
                  disabled={disabled}
                  style={{ fontFamily: 'inherit' }}
                />
              </div>
              <div className="cx-field">
                <label htmlFor="p-summary-en">{m.cx_f_summary()} (EN)</label>
                <textarea
                  id="p-summary-en"
                  name="summary_en"
                  className="cx-input"
                  rows={3}
                  defaultValue={doc.product.summary.en ?? ''}
                  disabled={disabled}
                  style={{ fontFamily: 'inherit' }}
                />
              </div>
            </div>
            {editor.canWrite ? (
              <div>
                <button className="cx-btn cx-btn-primary cx-btn-sm" type="submit" disabled={disabled}>
                  {m.cx_save_draft()}
                </button>
              </div>
            ) : null}
          </form>
        </details>
      </section>

      <section className="cx-card">
        <div className="cx-card-h">
          <div>
            <h2>{m.cx_editions()}</h2>
            <p>{m.cx_editions_hint()}</p>
          </div>
          {editor.canWrite ? (
            <button className="cx-btn cx-btn-sm cx-btn-primary" type="button" onClick={() => setCreating(true)}>
              <ConsoleIcon name="plus" />
              {m.cx_new_edition()}
            </button>
          ) : null}
        </div>
        {creating ? (
          <form
            className="cx-card-b"
            onSubmit={(event) => void create(event)}
            style={{ borderBottom: '1px solid var(--cx-line)', display: 'grid', gap: 12 }}
          >
            <div className="cx-grid2">
              <div className="cx-field">
                <label htmlFor="new-edition-name">{m.cx_f_name()}</label>
                <input
                  id="new-edition-name"
                  name="name"
                  className="cx-input"
                  required
                  minLength={1}
                  placeholder={m.cx_new_edition_example()}
                />
              </div>
              <div className="cx-field">
                <label htmlFor="new-edition-code">{m.cx_f_code()}</label>
                <input
                  id="new-edition-code"
                  name="code"
                  className="cx-input"
                  required
                  pattern="[a-z][a-z0-9_]{1,30}"
                  placeholder="partner"
                />
                <span className="cx-hint">{m.cx_code_hint()}</span>
              </div>
            </div>
            <div className="cx-actions">
              <button className="cx-btn cx-btn-primary cx-btn-sm" type="submit" disabled={disabled}>
                {m.cx_create_draft()}
              </button>
              <button className="cx-btn cx-btn-ghost cx-btn-sm" type="button" onClick={() => setCreating(false)}>
                {m.cx_cancel()}
              </button>
            </div>
          </form>
        ) : null}
        <div className="cx-tbl-wrap">
          <table className="cx-tbl">
            <thead>
              <tr>
                <th scope="col" style={{ width: 44 }}>
                  {m.cx_order()}
                </th>
                <th scope="col">{m.cx_edition()}</th>
                <th scope="col">{m.cx_f_visible()}</th>
                <th scope="col">{m.cx_f_for_sale()}</th>
                <th scope="col">{m.cx_types()}</th>
                <th scope="col">{m.cx_f_profile()}</th>
              </tr>
            </thead>
            <tbody>
              {active.map((edition, index) => {
                const position = doc.editions.indexOf(edition);
                const hiddenTypes = edition.types.filter((type) => !type.archived && !type.visible).length;
                const name = loc(edition.name);
                return (
                  <tr key={edition.id}>
                    <td>
                      <div className="cx-order">
                        <button
                          type="button"
                          aria-label={m.cx_move_up({ name })}
                          disabled={disabled || index === 0}
                          onClick={() =>
                            void editor.change([{ op: 'move_edition', code: edition.code, to: position - 1 }])
                          }
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          aria-label={m.cx_move_down({ name })}
                          disabled={disabled || index === active.length - 1}
                          onClick={() =>
                            void editor.change([{ op: 'move_edition', code: edition.code, to: position + 1 }])
                          }
                        >
                          ▼
                        </button>
                      </div>
                    </td>
                    <td className="cx-who">
                      <Link
                        to="/admin/catalogue/$slug/$edition"
                        params={{ slug, edition: edition.code }}
                        className="cx-rowlink"
                      >
                        {name}
                      </Link>{' '}
                      <span className="cx-tag">{edition.code}</span>
                      {published.has(edition.id) ? null : (
                        <span className="cx-pill warn" style={{ marginLeft: 6 }}>
                          {m.cx_new()}
                        </span>
                      )}
                      <small>{loc(edition.audience) || '—'}</small>
                    </td>
                    <td>
                      <Switch
                        checked={edition.visible}
                        label={m.cx_visible_named({ name })}
                        disabled={disabled}
                        onChange={(visible) =>
                          void editor.change([{ op: 'edition', code: edition.code, fields: { visible } }])
                        }
                      />
                    </td>
                    <td>
                      <Switch
                        checked={edition.forSale}
                        label={m.cx_for_sale_named({ name })}
                        disabled={disabled}
                        onChange={(forSale) =>
                          void editor.change([{ op: 'edition', code: edition.code, fields: { forSale } }])
                        }
                      />
                    </td>
                    <td>
                      {edition.types.filter((type) => !type.archived).length}
                      {hiddenTypes ? (
                        <span className="cx-muted"> · {m.cx_n_hidden({ count: hiddenTypes })}</span>
                      ) : null}
                    </td>
                    <td>
                      <span className="cx-tag">{edition.softwareEdition}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {archived.length ? (
          <details style={{ borderTop: '1px solid var(--cx-line)' }}>
            <summary className="cx-card-h" style={{ cursor: 'pointer', borderBottom: 0 }}>
              <h3>{m.cx_archived_editions({ count: archived.length })}</h3>
            </summary>
            <ul className="cx-todo">
              {archived.map((edition) => (
                <li key={edition.id}>
                  <div style={{ flex: 1 }}>
                    <Link to="/admin/catalogue/$slug/$edition" params={{ slug, edition: edition.code }}>
                      {loc(edition.name)}
                    </Link>{' '}
                    <span className="cx-tag">{edition.code}</span>
                  </div>
                  {editor.canWrite ? (
                    <button
                      className="cx-btn cx-btn-sm"
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        void editor.change([{ op: 'edition', code: edition.code, fields: { archived: false } }])
                      }
                    >
                      {m.cx_unarchive()}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      <section className="cx-card">
        <div className="cx-card-h">
          <div>
            <h2>{m.cx_features_title({ product: doc.product.name })}</h2>
            <p>{m.cx_features_hint()}</p>
          </div>
          <span className="cx-pill plain">{m.cx_n_features({ count: doc.features.length })}</span>
        </div>
        <div>
          {doc.features.map((feature) => (
            <div className="cx-feat" key={feature.key}>
              <div>
                <b style={{ fontWeight: 500 }}>{loc(feature.label)}</b>
                <small className="mono cx-muted">{feature.key}</small>
              </div>
              <span className="cx-muted" style={{ fontSize: 12.5 }}>
                {active
                  .filter((edition) => edition.features.includes(feature.key))
                  .map((edition) => loc(edition.name))
                  .join(' · ') || '—'}
              </span>
            </div>
          ))}
        </div>
      </section>

      <DraftBar editor={editor} editing={editing} />
      <Toast notice={notice.notice} />
    </ConsolePage>
  );
}
