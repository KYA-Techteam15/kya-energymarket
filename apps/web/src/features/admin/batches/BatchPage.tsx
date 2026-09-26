import { Link, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { m } from '@/paraglide/messages.js';
import { mailStatus } from '../licenses/LicenseDrawer';
import { bulkLicensesFn } from '../licenses/licenses';
import {
  ConsolePage,
  copyText,
  errorText,
  formatDate,
  formatDateTime,
  LicenseState,
  loc,
  Toast,
  useNotice,
} from '../console/ui';
import { batchActionFn, retryMailFn, type getBatchFn } from './batches';
import { modeLabel } from './BatchesPage';

type Data = NonNullable<Awaited<ReturnType<typeof getBatchFn>>>;

/** Fiche d'un lot : licences, activation, courriels, actions sur tout le lot (spec 005b, histoire 3). */
export function BatchPage({ data, now }: { data: Data; now: number }) {
  const router = useRouter();
  const { notice, show } = useNotice();
  const [panel, setPanel] = useState<'none' | 'extend' | 'revoke'>('none');
  const [days, setDays] = useState(30);
  const [reason, setReason] = useState('');
  const { batch, licenses, mails, can } = data;
  const failed = mails.filter((mail) => mail.status === 'failed');

  const act = async (action: 'extend' | 'revoke' | 'resend') => {
    const result = await batchActionFn({ data: { id: batch.id, action, days, reason: reason || undefined } });
    if (!result.ok) return show(errorText(result.code), true);
    setPanel('none');
    setReason('');
    await router.invalidate();
    show(
      action === 'extend'
        ? m.cx_bulk_extended({ count: result.value })
        : action === 'revoke'
          ? m.cx_bulk_revoked({ count: result.value })
          : m.cx_mails_queued({ count: result.value }),
    );
  };
  const copyKeys = async () => {
    const result = await bulkLicensesFn({
      data: { ids: licenses.map((license) => license.id).slice(0, 200), action: 'csv' },
    });
    if (!result.ok) return show(errorText(result.code), true);
    const ok = await copyText(result.value);
    show(ok ? m.cx_csv_copied() : m.cx_copy_refused(), !ok);
  };

  return (
    <ConsolePage
      crumbs={[
        { label: m.cx_nav_sales(), to: '/admin/licences' },
        { label: m.cx_nav_batches(), to: '/admin/lots' },
        { label: batch.label },
      ]}
    >
      <div className="cx-head">
        <div>
          <div className="cx-eyebrow">{modeLabel(batch.mode)}</div>
          <h1 style={{ marginTop: 6 }}>{batch.label}</h1>
          <p>
            {loc(batch.editionName)} · {loc(batch.typeName)} · {m.cx_seats_per_license({ count: batch.seats })} ·{' '}
            {m.cx_created_on({ date: formatDate(batch.createdAt), name: batch.createdByName ?? '—' })}
          </p>
        </div>
        <div className="cx-actions">
          <button className="cx-btn" type="button" onClick={() => void copyKeys()}>
            {m.cx_copy_csv()}
          </button>
          <Link to="/admin/licences" search={{ lot: batch.id } as never} className="cx-btn">
            {m.cx_see_licenses()}
          </Link>
          {can.write ? (
            <>
              <button className="cx-btn" type="button" onClick={() => setPanel('extend')}>
                {m.cx_extend_all()}
              </button>
              {batch.mode === 'emails' ? (
                <button className="cx-btn" type="button" onClick={() => void act('resend')}>
                  {m.cx_resend_mails()}
                </button>
              ) : null}
            </>
          ) : null}
          {can.revoke ? (
            <button className="cx-btn cx-btn-danger" type="button" onClick={() => setPanel('revoke')}>
              {m.cx_revoke_all()}
            </button>
          ) : null}
        </div>
      </div>

      <section className="cx-kpis">
        <div className="cx-card cx-kpi">
          <span className="cx-eyebrow">{m.cx_col_license()}</span>
          <span className="v">{batch.count}</span>
          <span className="d">{batch.reason}</span>
        </div>
        <div className="cx-card cx-kpi">
          <span className="cx-eyebrow">{m.cx_activated()}</span>
          <span className="v">{batch.activated}</span>
          <span className="d">{m.cx_never_activated({ count: batch.count - batch.activated - batch.revoked })}</span>
        </div>
        <div className="cx-card cx-kpi">
          <span className="cx-eyebrow">{m.cx_state_revoked()}</span>
          <span className="v">{batch.revoked}</span>
        </div>
        <div className="cx-card cx-kpi">
          <span className="cx-eyebrow">{m.cx_mails()}</span>
          <span className="v">{mails.filter((mail) => mail.status === 'done').length}</span>
          <span className="d">
            {failed.length
              ? m.cx_failed_mails({ count: failed.length })
              : m.cx_shown_name_value({ name: batch.customerName })}
          </span>
        </div>
      </section>

      {panel === 'extend' ? (
        <div className="cx-panel">
          <div className="cx-grid2">
            <div className="cx-field">
              <label htmlFor="batch-days">{m.cx_days_label()}</label>
              <input
                id="batch-days"
                className="cx-input"
                type="number"
                min={1}
                max={3650}
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
              />
            </div>
            <div className="cx-field">
              <label htmlFor="batch-reason">{m.cx_reason()}</label>
              <input
                id="batch-reason"
                className="cx-input"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          </div>
          <div className="cx-actions">
            <button className="cx-btn cx-btn-primary cx-btn-sm" type="button" onClick={() => void act('extend')}>
              {m.cx_extend_by({ count: days })}
            </button>
            <button className="cx-btn cx-btn-ghost cx-btn-sm" type="button" onClick={() => setPanel('none')}>
              {m.cx_cancel()}
            </button>
          </div>
        </div>
      ) : null}
      {panel === 'revoke' ? (
        <div className="cx-panel danger">
          <b style={{ color: 'var(--cx-danger)' }}>{m.cx_revoke_batch_title({ count: batch.count - batch.revoked })}</b>
          <div className="cx-field">
            <label htmlFor="batch-revoke-reason">{m.cx_reason_required()}</label>
            <input
              id="batch-revoke-reason"
              className="cx-input"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <div className="cx-actions">
            <button
              className="cx-btn cx-btn-danger cx-solid cx-btn-sm"
              type="button"
              disabled={reason.trim().length < 3}
              onClick={() => void act('revoke')}
            >
              {m.cx_revoke_all()}
            </button>
            <button className="cx-btn cx-btn-ghost cx-btn-sm" type="button" onClick={() => setPanel('none')}>
              {m.cx_cancel()}
            </button>
          </div>
        </div>
      ) : null}

      {failed.length ? (
        <section className="cx-card">
          <div className="cx-card-h">
            <h2>{m.cx_failed_mails({ count: failed.length })}</h2>
          </div>
          <ul className="cx-todo">
            {failed.map((mail) => (
              <li key={mail.id}>
                <span className="cx-sev danger" />
                <div style={{ flex: 1 }}>
                  <b>{mail.email}</b>
                  <p>
                    {formatDateTime(mail.createdAt)} · {mail.lastError}
                  </p>
                </div>
                {can.write ? (
                  <button
                    className="cx-btn cx-btn-sm"
                    type="button"
                    onClick={() =>
                      void retryMailFn({ data: { id: mail.id } }).then(async (result) => {
                        if (!result.ok) return show(errorText(result.code), true);
                        await router.invalidate();
                        show(m.cx_mail_retried());
                      })
                    }
                  >
                    {m.cx_retry()}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="cx-card">
        <div className="cx-card-h">
          <h2>{m.cx_nav_licenses()}</h2>
        </div>
        <div className="cx-tbl-wrap">
          <table className="cx-tbl">
            <thead>
              <tr>
                <th scope="col">{m.cx_col_license()}</th>
                <th scope="col">{m.cx_col_holder()}</th>
                <th scope="col">{m.cx_mails()}</th>
                <th scope="col">{m.cx_col_end()}</th>
                <th scope="col">{m.cx_col_state()}</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((license) => {
                const mail = mails.find((item) => item.reference === license.id);
                return (
                  <tr key={license.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Link
                        to="/admin/licences"
                        search={{ licence: license.id, lot: batch.id } as never}
                        className="cx-rowlink mono"
                      >
                        {license.id}
                      </Link>
                      <br />
                      <small className="cx-muted mono">{license.key ?? '—'}</small>
                    </td>
                    <td className="cx-who">
                      <b>{license.organizationId ? license.customerName : m.cx_unassigned()}</b>
                      <small>{license.recipientEmail ?? ''}</small>
                    </td>
                    <td>{mail ? <span className="cx-pill plain">{mailStatus(mail.status)}</span> : '—'}</td>
                    <td className="num">
                      {license.expiresAt ? (
                        formatDate(license.expiresAt)
                      ) : (
                        <small className="cx-muted">{m.cx_on_activation()}</small>
                      )}
                    </td>
                    <td>
                      <LicenseState license={license} now={now} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <Toast notice={notice} />
    </ConsolePage>
  );
}
