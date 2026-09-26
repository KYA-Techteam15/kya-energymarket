import type { DocEdition } from '@kya-em/domain';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { m } from '@/paraglide/messages.js';
import { ConsoleIcon, ConsolePage, fcfa, formatDays, loc, natureLabel, Switch, Toast, useNotice } from '../console/ui';
import { DraftBar, useCatalogEditor, type Editing } from './editor';
import { LicenseTypeDrawer } from './LicenseTypeDrawer';

export type EditionTab = 'droits' | 'caracteristiques' | 'types';
type EditionFields = Partial<Omit<DocEdition, 'id' | 'code' | 'types'>>;
type Save = (fields: EditionFields, message?: string) => Promise<boolean>;

/** Une édition : droits dans le logiciel, caractéristiques affichées, types de licence (spec 005b). */
export function EditionPage({
  slug,
  code,
  editing,
  tab,
  typeId,
}: {
  slug: string;
  code: string;
  editing: Editing;
  tab: EditionTab;
  typeId?: string;
}) {
  const notice = useNotice();
  const navigate = useNavigate();
  const editor = useCatalogEditor(slug, editing, notice);
  const edition = editing.document.editions.find((item) => item.code === code)!;
  const published = new Set(editing.published);
  const disabled = !editor.canWrite || editor.busy;
  const name = loc(edition.name);
  const setSearch = (next: { onglet?: EditionTab; type?: string }) =>
    void navigate({
      to: '/admin/catalogue/$slug/$edition',
      params: { slug, edition: code },
      search: { onglet: tab === 'droits' ? undefined : tab, type: undefined, ...next } as never,
    });
  const save: Save = (fields, message = m.cx_saved_draft()) =>
    editor.change([{ op: 'edition', code, fields }], message);

  const tabs: [EditionTab, string][] = [
    ['droits', m.cx_tab_rights()],
    ['caracteristiques', m.cx_tab_highlights()],
    ['types', m.cx_tab_types({ count: edition.types.filter((type) => !type.archived).length })],
  ];

  return (
    <ConsolePage
      crumbs={[
        { label: m.cx_nav_catalog(), to: '/admin/catalogue' },
        { label: editing.document.product.name, to: '/admin/catalogue/$slug', params: { slug } },
        { label: name },
      ]}
    >
      <div className="cx-head">
        <div>
          <div className="cx-eyebrow">
            {editing.document.product.name} · {m.cx_edition()}
          </div>
          <h1 style={{ marginTop: 6 }}>
            {name} <span className="cx-tag">{edition.code}</span>{' '}
            {edition.archived ? <span className="cx-pill plain">{m.cx_f_archived()}</span> : null}
          </h1>
          <p>{loc(edition.audience) || m.cx_audience_missing()}</p>
        </div>
        <div className="cx-actions" style={{ gap: 16 }}>
          <span className="cx-toggle">
            {m.cx_f_visible()}
            <Switch
              checked={edition.visible}
              label={m.cx_visible_named({ name })}
              disabled={disabled}
              onChange={(visible) => void save({ visible })}
            />
          </span>
          <span className="cx-toggle">
            {m.cx_f_for_sale()}
            <Switch
              checked={edition.forSale}
              label={m.cx_for_sale_named({ name })}
              disabled={disabled}
              onChange={(forSale) => void save({ forSale })}
            />
          </span>
          <Link to="/admin/lots/nouveau" className="cx-btn cx-btn-sm">
            {m.cx_generate()}
          </Link>
          {editor.canWrite ? (
            published.has(edition.id) ? (
              <button
                className="cx-btn cx-btn-sm cx-btn-ghost"
                type="button"
                disabled={disabled}
                onClick={() => void save({ archived: !edition.archived })}
              >
                {edition.archived ? m.cx_unarchive() : m.cx_archive()}
              </button>
            ) : (
              <button
                className="cx-btn cx-btn-sm cx-btn-danger"
                type="button"
                disabled={disabled}
                onClick={() =>
                  void editor.change([{ op: 'remove', edition: code }], m.cx_removed()).then((ok) => {
                    if (ok) void navigate({ to: '/admin/catalogue/$slug', params: { slug } });
                  })
                }
              >
                {m.cx_remove_draft()}
              </button>
            )
          ) : null}
        </div>
      </div>

      <div className="cx-views" role="tablist" aria-label={m.cx_edition()}>
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setSearch({ onglet: id })}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'droits' ? <Rights editing={editing} edition={edition} disabled={disabled} save={save} /> : null}
      {tab === 'caracteristiques' ? (
        <Highlights edition={edition} revision={editing.revision} disabled={disabled} save={save} />
      ) : null}
      {tab === 'types' ? (
        <section className="cx-card" role="tabpanel">
          <div className="cx-card-h">
            <div>
              <h2>{m.cx_types()}</h2>
              <p>{m.cx_types_hint()}</p>
            </div>
            {editor.canWrite ? (
              <button
                className="cx-btn cx-btn-sm cx-btn-primary"
                type="button"
                onClick={() => setSearch({ onglet: 'types', type: 'nouveau' })}
              >
                <ConsoleIcon name="plus" />
                {m.cx_new_type()}
              </button>
            ) : null}
          </div>
          <div className="cx-tbl-wrap">
            <table className="cx-tbl">
              <thead>
                <tr>
                  <th scope="col" style={{ width: 44 }}>
                    {m.cx_order()}
                  </th>
                  <th scope="col">{m.cx_type()}</th>
                  <th scope="col">{m.cx_nature()}</th>
                  <th scope="col" className="r">
                    {m.cx_duration()}
                  </th>
                  <th scope="col" className="r">
                    {m.cx_price_per_seat()}
                  </th>
                  <th scope="col">{m.cx_col_seats()}</th>
                  <th scope="col">{m.cx_f_visible()}</th>
                  <th scope="col">{m.cx_f_for_sale()}</th>
                  <th scope="col" className="r">
                    {m.cx_issued_count()}
                  </th>
                </tr>
              </thead>
              <tbody>
                {edition.types.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="cx-empty">
                      {m.cx_types_none()}
                    </td>
                  </tr>
                ) : (
                  edition.types.map((type, index) => {
                    const typeName = loc(type.name);
                    return (
                      <tr key={type.id} style={type.archived ? { opacity: 0.6 } : undefined}>
                        <td>
                          <div className="cx-order">
                            <button
                              type="button"
                              aria-label={m.cx_move_up({ name: typeName })}
                              disabled={disabled || index === 0}
                              onClick={() =>
                                void editor.change([
                                  { op: 'move_license_type', edition: code, id: type.id, to: index - 1 },
                                ])
                              }
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              aria-label={m.cx_move_down({ name: typeName })}
                              disabled={disabled || index === edition.types.length - 1}
                              onClick={() =>
                                void editor.change([
                                  { op: 'move_license_type', edition: code, id: type.id, to: index + 1 },
                                ])
                              }
                            >
                              ▼
                            </button>
                          </div>
                        </td>
                        <td className="cx-who">
                          <Link
                            to="/admin/catalogue/$slug/$edition"
                            params={{ slug, edition: code }}
                            search={{ onglet: 'types', type: type.id } as never}
                            className="cx-rowlink"
                          >
                            {typeName}
                          </Link>
                          {published.has(type.id) ? null : (
                            <span className="cx-pill warn" style={{ marginLeft: 6 }}>
                              {m.cx_new()}
                            </span>
                          )}
                          {type.archived ? (
                            <span className="cx-pill plain" style={{ marginLeft: 6 }}>
                              {m.cx_f_archived()}
                            </span>
                          ) : null}
                          <small>{type.renewable ? m.cx_renewable() : m.cx_not_renewable()}</small>
                        </td>
                        <td>
                          <span className="cx-pill plain">{natureLabel(type.nature)}</span>
                        </td>
                        <td className="r num">{formatDays(type.days)}</td>
                        <td className="r num">
                          {type.pricePerSeat ? fcfa(type.pricePerSeat) : m.cx_free()}
                          {type.indicative && type.pricePerSeat ? (
                            <small className="cx-muted" style={{ display: 'block' }}>
                              {m.cx_indicative()}
                            </small>
                          ) : null}
                        </td>
                        <td className="num">
                          {(type.seatsMax ?? edition.maxSeats)
                            ? `${type.seatsMin} – ${type.seatsMax ?? edition.maxSeats}`
                            : `≥ ${type.seatsMin}`}
                        </td>
                        <td>
                          <Switch
                            checked={type.visible}
                            label={m.cx_visible_named({ name: typeName })}
                            disabled={disabled}
                            onChange={(visible) =>
                              void editor.change([
                                { op: 'license_type', edition: code, id: type.id, fields: { visible } },
                              ])
                            }
                          />
                        </td>
                        <td>
                          <Switch
                            checked={type.forSale}
                            label={m.cx_for_sale_named({ name: typeName })}
                            disabled={disabled}
                            onChange={(forSale) =>
                              void editor.change([
                                { op: 'license_type', edition: code, id: type.id, fields: { forSale } },
                              ])
                            }
                          />
                        </td>
                        <td className="r num">{editing.issued[type.id] ?? 0}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      {tab === 'types' ? <p className="cx-note">{m.cx_types_note()}</p> : null}

      {typeId ? (
        <LicenseTypeDrawer
          edition={edition}
          typeId={typeId}
          published={published.has(typeId)}
          editor={editor}
          onClose={() => setSearch({ onglet: 'types', type: undefined })}
        />
      ) : null}
      <DraftBar editor={editor} editing={editing} />
      <Toast notice={notice.notice} />
    </ConsolePage>
  );
}

function Rights({
  editing,
  edition,
  disabled,
  save,
}: {
  editing: Editing;
  edition: DocEdition;
  disabled: boolean;
  save: Save;
}) {
  const features = editing.document.features;
  const profiles = editing.live.softwareEditions;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (key: string) => String(data.get(key) ?? '').trim();
    const optionalNumber = (key: string) => (text(key) === '' ? null : Number(text(key)));
    const watermark = text('watermark_fr');
    void save({
      name: { fr: text('name_fr'), en: text('name_en') || undefined },
      audience: { fr: text('audience_fr'), en: text('audience_en') || undefined },
      softwareEdition: text('softwareEdition'),
      maxProjects: optionalNumber('maxProjects'),
      maxSeats: optionalNumber('maxSeats'),
      graceDays: Number(text('graceDays') || 0),
      watermark: watermark ? { fr: watermark, en: text('watermark_en') || undefined } : null,
    });
  };
  return (
    <div className="cx-grid2" role="tabpanel">
      <section className="cx-card">
        <div className="cx-card-h">
          <div>
            <h2>{m.cx_f_features()}</h2>
            <p>{m.cx_features_applied()}</p>
          </div>
        </div>
        <div>
          {features.map((feature) => (
            <label className="cx-feat" key={feature.key}>
              <input
                type="checkbox"
                checked={edition.features.includes(feature.key)}
                disabled={disabled}
                onChange={(event) =>
                  void save({
                    features: event.target.checked
                      ? features
                          .map((item) => item.key)
                          .filter((key) => key === feature.key || edition.features.includes(key))
                      : edition.features.filter((key) => key !== feature.key),
                  })
                }
              />
              <span>
                {loc(feature.label)}
                <small className="mono cx-muted">{feature.key}</small>
              </span>
            </label>
          ))}
        </div>
      </section>
      <section className="cx-card">
        <div className="cx-card-h">
          <h2>{m.cx_edition_settings()}</h2>
        </div>
        <form
          key={editing.revision ?? 'publie'}
          className="cx-card-b"
          onSubmit={submit}
          style={{ display: 'grid', gap: 12 }}
        >
          <div className="cx-grid2">
            <div className="cx-field">
              <label htmlFor="e-name-fr">{m.cx_f_name()} (FR)</label>
              <input
                id="e-name-fr"
                name="name_fr"
                className="cx-input"
                defaultValue={edition.name.fr}
                required
                disabled={disabled}
              />
            </div>
            <div className="cx-field">
              <label htmlFor="e-name-en">{m.cx_f_name()} (EN)</label>
              <input
                id="e-name-en"
                name="name_en"
                className="cx-input"
                defaultValue={edition.name.en ?? ''}
                disabled={disabled}
              />
            </div>
          </div>
          <div className="cx-grid2">
            <div className="cx-field">
              <label htmlFor="e-aud-fr">{m.cx_f_audience()} (FR)</label>
              <input
                id="e-aud-fr"
                name="audience_fr"
                className="cx-input"
                defaultValue={edition.audience.fr}
                disabled={disabled}
              />
            </div>
            <div className="cx-field">
              <label htmlFor="e-aud-en">{m.cx_f_audience()} (EN)</label>
              <input
                id="e-aud-en"
                name="audience_en"
                className="cx-input"
                defaultValue={edition.audience.en ?? ''}
                disabled={disabled}
              />
            </div>
          </div>
          <div className="cx-grid2">
            <div className="cx-field">
              <label htmlFor="e-profile">{m.cx_f_profile()}</label>
              <select
                id="e-profile"
                name="softwareEdition"
                className="cx-input"
                defaultValue={edition.softwareEdition}
                disabled={disabled}
              >
                {(profiles.length ? profiles : [edition.softwareEdition]).map((profile) => (
                  <option key={profile} value={profile}>
                    {profile}
                  </option>
                ))}
              </select>
              <span className="cx-hint">{m.cx_profile_hint()}</span>
            </div>
            <div className="cx-field">
              <label htmlFor="e-grace">{m.cx_f_grace()}</label>
              <input
                id="e-grace"
                name="graceDays"
                className="cx-input"
                type="number"
                min={0}
                max={90}
                defaultValue={edition.graceDays}
                disabled={disabled}
              />
              <span className="cx-hint">{m.cx_grace_hint()}</span>
            </div>
          </div>
          <div className="cx-grid2">
            <div className="cx-field">
              <label htmlFor="e-projects">{m.cx_f_max_projects()}</label>
              <input
                id="e-projects"
                name="maxProjects"
                className="cx-input"
                type="number"
                min={1}
                defaultValue={edition.maxProjects ?? ''}
                placeholder={m.cx_unlimited()}
                disabled={disabled}
              />
            </div>
            <div className="cx-field">
              <label htmlFor="e-seats">{m.cx_f_max_seats()}</label>
              <input
                id="e-seats"
                name="maxSeats"
                className="cx-input"
                type="number"
                min={1}
                defaultValue={edition.maxSeats ?? ''}
                placeholder={m.cx_unlimited()}
                disabled={disabled}
              />
            </div>
          </div>
          <div className="cx-grid2">
            <div className="cx-field">
              <label htmlFor="e-wm-fr">{m.cx_f_watermark()} (FR)</label>
              <input
                id="e-wm-fr"
                name="watermark_fr"
                className="cx-input"
                defaultValue={edition.watermark?.fr ?? ''}
                placeholder={m.cx_none()}
                disabled={disabled}
              />
            </div>
            <div className="cx-field">
              <label htmlFor="e-wm-en">{m.cx_f_watermark()} (EN)</label>
              <input
                id="e-wm-en"
                name="watermark_en"
                className="cx-input"
                defaultValue={edition.watermark?.en ?? ''}
                disabled={disabled}
              />
            </div>
          </div>
          <p className="cx-note">{m.cx_rights_note()}</p>
          {!disabled ? (
            <div>
              <button className="cx-btn cx-btn-primary cx-btn-sm" type="submit">
                {m.cx_save_draft()}
              </button>
            </div>
          ) : null}
        </form>
      </section>
    </div>
  );
}

function Highlights({
  edition,
  revision,
  disabled,
  save,
}: {
  edition: DocEdition;
  revision: number | null;
  disabled: boolean;
  save: Save;
}) {
  const [lines, setLines] = useState(() => edition.highlights.map((line) => ({ fr: line.fr, en: line.en ?? '' })));
  const [seen, setSeen] = useState(revision);
  // Resynchronise après une écriture (nouvelle révision du brouillon).
  if (seen !== revision) {
    setSeen(revision);
    setLines(edition.highlights.map((line) => ({ fr: line.fr, en: line.en ?? '' })));
  }
  const update = (index: number, field: 'fr' | 'en', value: string) =>
    setLines((current) => current.map((line, at) => (at === index ? { ...line, [field]: value } : line)));
  return (
    <section className="cx-card" role="tabpanel">
      <div className="cx-card-h">
        <div>
          <h2>{m.cx_tab_highlights()}</h2>
          <p>{m.cx_highlights_hint()}</p>
        </div>
      </div>
      <div className="cx-card-b" style={{ display: 'grid', gap: 12 }}>
        {lines.length === 0 ? (
          <p className="cx-muted" style={{ margin: 0 }}>
            {m.cx_highlights_none()}
          </p>
        ) : null}
        <ul className="cx-lines">
          {lines.map((line, index) => (
            <li key={index}>
              <input
                className="cx-input"
                aria-label={m.cx_highlight_fr({ n: index + 1 })}
                value={line.fr}
                disabled={disabled}
                onChange={(event) => update(index, 'fr', event.target.value)}
              />
              <input
                className="cx-input cx-hide-sm"
                aria-label={m.cx_highlight_en({ n: index + 1 })}
                value={line.en}
                disabled={disabled}
                onChange={(event) => update(index, 'en', event.target.value)}
                placeholder="English"
              />
              <button
                className="cx-btn cx-btn-sm cx-btn-ghost"
                type="button"
                disabled={disabled}
                aria-label={m.cx_remove_line({ n: index + 1 })}
                onClick={() => setLines((current) => current.filter((_, at) => at !== index))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        {!disabled ? (
          <div className="cx-actions">
            <button
              className="cx-btn cx-btn-sm"
              type="button"
              onClick={() => setLines((current) => [...current, { fr: '', en: '' }])}
            >
              <ConsoleIcon name="plus" />
              {m.cx_add_line()}
            </button>
            <button
              className="cx-btn cx-btn-sm cx-btn-primary"
              type="button"
              onClick={() =>
                void save({
                  highlights: lines
                    .filter((line) => line.fr.trim())
                    .map((line) => ({ fr: line.fr.trim(), en: line.en.trim() || undefined })),
                })
              }
            >
              {m.cx_save_draft()}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
