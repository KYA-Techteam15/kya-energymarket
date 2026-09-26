import type { LicenseChannel, LicenseViewName } from '@kya-em/domain';
import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { m } from '@/paraglide/messages.js';
import {
  ChannelPill,
  channelLabel,
  ConsoleIcon,
  ConsolePage,
  copyText,
  daysUntil,
  errorText,
  fcfa,
  formatDate,
  LicenseState,
  loc,
  Toast,
  useNotice,
} from '../console/ui';
import { IssueDrawer } from './IssueDrawer';
import { LicenseDrawer } from './LicenseDrawer';
import { bulkLicensesFn, CHANNELS, LICENSE_VIEWS, type getLicenses } from './licenses';

type Data = NonNullable<Awaited<ReturnType<typeof getLicenses>>>;

export interface LicensesSearch {
  readonly vue?: LicenseViewName;
  readonly q?: string;
  readonly edition?: string;
  readonly canal?: LicenseChannel;
  readonly lot?: string;
  readonly licence?: string;
  readonly emettre?: string;
  readonly debut?: number;
}

export const viewLabel = (view: LicenseViewName) =>
  ({
    all: m.cx_view_all,
    expiring: m.cx_view_expiring,
    purchased: m.cx_view_purchased,
    offered: m.cx_view_offered,
    trials: m.cx_view_trials,
    waiting: m.cx_view_waiting,
    revoked: m.cx_view_revoked,
  })[view]();

const PAGE = 50;

/** Licences (spec 005b, histoire 4) : vues, recherche, filtres, sélection, panneau de licence. */
export function LicensesPage({ data, search, now }: { data: Data; search: LicensesSearch; now: number }) {
  const navigate = useNavigate();
  const router = useRouter();
  const { notice, show } = useNotice();
  // La sélection appartient à une liste (vue et filtres) : changer de liste la vide, sans effet.
  const listKey = [search.vue, search.q, search.edition, search.canal, search.lot, search.debut].join('|');
  const [selection, setSelection] = useState<{ key: string; ids: ReadonlySet<string> }>({
    key: listKey,
    ids: new Set(),
  });
  const selected: ReadonlySet<string> = selection.key === listKey ? selection.ids : new Set();
  const setSelected = (next: ReadonlySet<string> | ((current: ReadonlySet<string>) => ReadonlySet<string>)) =>
    setSelection({ key: listKey, ids: typeof next === 'function' ? next(selected) : next });
  const [query, setQuery] = useState(search.q ?? '');
  const [bulk, setBulk] = useState<'none' | 'extend' | 'revoke'>('none');
  const [days, setDays] = useState(30);
  const [reason, setReason] = useState('');
  const view = search.vue ?? 'all';
  const go = (next: Partial<LicensesSearch>) =>
    void navigate({ to: '/admin/licences', search: { ...search, debut: undefined, ...next } as never });

  // Recherche : 300 ms après la dernière frappe.
  useEffect(() => {
    if ((search.q ?? '') === query) return;
    const timer = setTimeout(() => go({ q: query || undefined }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const items = data.items;
  const allSelected = items.length > 0 && items.every((item) => selected.has(item.id));
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const editions = data.offer.map((edition) => ({
    id: edition.editionId,
    label: `${edition.productName} · ${loc(edition.editionName)}`,
  }));
  const lotLabel = search.lot ? items.find((item) => item.batchId === search.lot)?.batchLabel : null;

  const runBulk = async (action: 'extend' | 'revoke' | 'csv') => {
    const result = await bulkLicensesFn({ data: { ids: [...selected], action, days, reason: reason || undefined } });
    if (!result.ok) return show(errorText(result.code), true);
    if (action === 'csv') {
      const copied = await copyText(result.value);
      return show(copied ? m.cx_csv_copied() : m.cx_copy_refused(), !copied);
    }
    setBulk('none');
    setReason('');
    setSelected(new Set());
    await router.invalidate();
    show(
      action === 'extend'
        ? m.cx_bulk_extended({ count: Number(result.value) })
        : m.cx_bulk_revoked({ count: Number(result.value) }),
    );
  };

  return (
    <ConsolePage crumbs={[{ label: m.cx_nav_sales(), to: '/admin/licences' }, { label: m.cx_nav_licenses() }]}>
      <div className="cx-head">
        <div>
          <h1>{m.cx_nav_licenses()}</h1>
          <p>{m.cx_licenses_intro()}</p>
        </div>
        {data.can.write ? (
          <div className="cx-actions">
            <Link to="/admin/lots/nouveau" className="cx-btn">
              <ConsoleIcon name="stack" />
              {m.cx_generate_batch()}
            </Link>
            <button className="cx-btn cx-btn-primary" type="button" onClick={() => go({ emettre: '1' })}>
              <ConsoleIcon name="plus" />
              {m.cx_issue()}
            </button>
          </div>
        ) : null}
      </div>

      <section className="cx-card">
        <div className="cx-views" role="navigation" aria-label={m.cx_views()}>
          {LICENSE_VIEWS.map((item) => (
            <Link
              key={item}
              to="/admin/licences"
              search={
                { ...search, vue: item === 'all' ? undefined : item, debut: undefined, licence: undefined } as never
              }
              aria-current={view === item ? 'true' : undefined}
            >
              {viewLabel(item)}
              <span className="c">{data.counts[item]}</span>
            </Link>
          ))}
        </div>
        <div className="cx-filters">
          <div className="cx-search">
            <label className="cx-sr" htmlFor="licences-q">
              {m.cx_licenses_search()}
            </label>
            <input
              id="licences-q"
              className="cx-input"
              type="search"
              placeholder={m.cx_licenses_search()}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <select
            className="cx-input"
            aria-label={m.cx_edition()}
            value={search.edition ?? ''}
            onChange={(event) => go({ edition: event.target.value || undefined })}
          >
            <option value="">{m.cx_all_editions()}</option>
            {editions.map((edition) => (
              <option key={edition.id} value={edition.id}>
                {edition.label}
              </option>
            ))}
          </select>
          <select
            className="cx-input"
            aria-label={m.cx_channel()}
            value={search.canal ?? ''}
            onChange={(event) => go({ canal: (event.target.value || undefined) as LicenseChannel | undefined })}
          >
            <option value="">{m.cx_all_channels()}</option>
            {CHANNELS.map((channel) => (
              <option key={channel} value={channel}>
                {channelLabel(channel)}
              </option>
            ))}
          </select>
          {search.lot ? (
            <span className="cx-pill warn">
              {m.cx_batch()} : {lotLabel ?? '…'}
              <button
                type="button"
                className="cx-btn cx-btn-ghost cx-btn-sm"
                style={{ minHeight: 18, padding: '0 2px' }}
                onClick={() => go({ lot: undefined })}
                aria-label={m.cx_remove_filter()}
              >
                ×
              </button>
            </span>
          ) : null}
        </div>
        <div className="cx-tbl-wrap">
          <table className="cx-tbl">
            <thead>
              <tr>
                <th scope="col" style={{ width: 34 }}>
                  <input
                    type="checkbox"
                    aria-label={m.cx_select_all()}
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(items.map((item) => item.id)))}
                  />
                </th>
                <th scope="col">{m.cx_col_license()}</th>
                <th scope="col">{m.cx_col_holder()}</th>
                <th scope="col">{m.cx_col_offer()}</th>
                <th scope="col">{m.cx_channel()}</th>
                <th scope="col" className="r">
                  {m.cx_col_amount()}
                </th>
                <th scope="col">{m.cx_col_seats()}</th>
                <th scope="col">{m.cx_col_end()}</th>
                <th scope="col">{m.cx_col_state()}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="cx-empty">
                    {m.cx_licenses_none()}
                  </td>
                </tr>
              ) : (
                items.map((license) => {
                  const left = daysUntil(license.expiresAt, now);
                  return (
                    <tr key={license.id} className={selected.has(license.id) ? 'sel' : undefined}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={m.cx_select_one({ id: license.id })}
                          checked={selected.has(license.id)}
                          onChange={() => toggle(license.id)}
                        />
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <Link
                          to="/admin/licences"
                          search={{ ...search, licence: license.id } as never}
                          className="cx-rowlink mono"
                        >
                          {license.id}
                        </Link>
                        <br />
                        <small className="cx-muted mono">{license.key ? `${license.key.slice(0, 16)}…` : '—'}</small>
                      </td>
                      <td className="cx-who">
                        {license.organizationId ? (
                          <>
                            <b>{license.customerName}</b>
                            {license.recipientEmail ? <small>{license.recipientEmail}</small> : null}
                          </>
                        ) : (
                          <>
                            <b className="cx-muted">{m.cx_unassigned()}</b>
                            <small>{license.recipientEmail ?? license.batchLabel ?? license.customerName}</small>
                          </>
                        )}
                      </td>
                      <td>
                        {loc(license.editionName)}
                        <br />
                        <small className="cx-muted">{loc(license.typeName)}</small>
                      </td>
                      <td>
                        <ChannelPill channel={license.channel} />
                      </td>
                      <td className="r num">{fcfa(license.amount)}</td>
                      <td>
                        <div className="cx-seats">
                          <div className="cx-bar">
                            <i style={{ width: `${(license.activations.length / license.seats) * 100}%` }} />
                          </div>
                          <span className="num">
                            {license.activations.length}/{license.seats}
                          </span>
                        </div>
                      </td>
                      <td className="num">
                        {license.expiresAt ? (
                          <>
                            {formatDate(license.expiresAt)}
                            <br />
                            <small
                              className={
                                left !== null && left <= 30 && license.status === 'active' ? 'cx-soon' : 'cx-muted'
                              }
                            >
                              {left !== null && left < 0 ? m.cx_expired() : m.cx_in_days({ count: left ?? 0 })}
                            </small>
                          </>
                        ) : (
                          <small className="cx-muted">{m.cx_on_activation()}</small>
                        )}
                      </td>
                      <td>
                        <LicenseState license={license} now={now} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {data.total > PAGE ? (
          <div className="cx-filters" style={{ borderTop: '1px solid var(--cx-line)', borderBottom: 0 }}>
            <span className="cx-muted num">
              {m.cx_page_range({
                from: (search.debut ?? 0) + 1,
                to: Math.min(data.total, (search.debut ?? 0) + PAGE),
                total: data.total,
              })}
            </span>
            <span className="cx-spacer" />
            <button
              type="button"
              className="cx-btn cx-btn-sm"
              disabled={!search.debut}
              onClick={() => go({ debut: Math.max(0, (search.debut ?? 0) - PAGE) || undefined })}
            >
              {m.cx_previous()}
            </button>
            <button
              type="button"
              className="cx-btn cx-btn-sm"
              disabled={(search.debut ?? 0) + PAGE >= data.total}
              onClick={() => go({ debut: (search.debut ?? 0) + PAGE })}
            >
              {m.cx_next()}
            </button>
          </div>
        ) : null}
      </section>

      {selected.size > 0 ? (
        <div className="cx-bulk" role="toolbar" aria-label={m.cx_bulk_label()}>
          <b className="num">{m.cx_selected({ count: selected.size })}</b>
          {bulk === 'extend' ? (
            <>
              <label className="cx-sr" htmlFor="bulk-days">
                {m.cx_days_label()}
              </label>
              <input
                id="bulk-days"
                className="cx-input"
                type="number"
                min={1}
                max={3650}
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
              />
              <button className="cx-btn cx-btn-sm" type="button" onClick={() => void runBulk('extend')}>
                {m.cx_extend_by({ count: days })}
              </button>
            </>
          ) : bulk === 'revoke' ? (
            <>
              <label className="cx-sr" htmlFor="bulk-reason">
                {m.cx_reason()}
              </label>
              <input
                id="bulk-reason"
                className="cx-input"
                style={{ width: 200 }}
                placeholder={m.cx_reason_required()}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <button
                className="cx-btn cx-btn-sm cx-btn-danger"
                type="button"
                disabled={reason.trim().length < 3}
                onClick={() => void runBulk('revoke')}
              >
                {m.cx_confirm_revoke({ count: selected.size })}
              </button>
            </>
          ) : (
            <>
              {data.can.write ? (
                <button className="cx-btn cx-btn-sm" type="button" onClick={() => setBulk('extend')}>
                  {m.cx_extend()}
                </button>
              ) : null}
              <button className="cx-btn cx-btn-sm" type="button" onClick={() => void runBulk('csv')}>
                {m.cx_copy_csv()}
              </button>
              {data.can.revoke ? (
                <button className="cx-btn cx-btn-sm cx-btn-danger" type="button" onClick={() => setBulk('revoke')}>
                  {m.cx_revoke()}
                </button>
              ) : null}
            </>
          )}
          <button
            className="cx-btn cx-btn-sm cx-btn-ghost"
            type="button"
            onClick={() => (bulk === 'none' ? setSelected(new Set()) : setBulk('none'))}
            aria-label={bulk === 'none' ? m.cx_clear_selection() : m.cx_cancel()}
          >
            ×
          </button>
        </div>
      ) : null}

      {search.licence ? (
        <LicenseDrawer
          key={search.licence}
          id={search.licence}
          offer={data.offer}
          now={now}
          onClose={() => go({ licence: undefined, debut: search.debut })}
          onChanged={(text) => {
            show(text);
            void router.invalidate();
          }}
          onError={(text) => show(text, true)}
        />
      ) : null}
      {search.emettre && data.can.write ? (
        <IssueDrawer
          offer={data.offer}
          onClose={() => go({ emettre: undefined, debut: search.debut })}
          onIssued={(id) => {
            show(m.cx_issued());
            void navigate({ to: '/admin/licences', search: { licence: id } as never });
          }}
          onError={(text) => show(text, true)}
        />
      ) : null}
      <Toast notice={notice} />
    </ConsolePage>
  );
}
