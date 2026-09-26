import { Link, useRouter } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { DURATION_LABELS } from './LicensesAdminPage';
import { extendLicenseFn, releaseSeatAdminFn, revokeLicenseFn, setSeatsFn, type getLicenseAdmin } from './licenses';

type Admin = NonNullable<Awaited<ReturnType<typeof getLicenseAdmin>>>;

const errorText = (code: string) =>
  ({ SEATS_BELOW_ACTIVE: m.admin_licenses_seats_below(), FORBIDDEN: m.admin_only() })[code] ?? m.admin_editor_invalid();

/** Une licence : clé, dates, postes, journal ; prolonger, postes, libérer, révoquer (spec 005). */
export function LicenseAdminPage({ admin }: { admin: Admin }) {
  const router = useRouter();
  const { license, can } = admin;
  const locale = getLocale() === 'en' ? 'en' : 'fr';
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const date = new Intl.DateTimeFormat(getLocale(), { dateStyle: 'long' });
  const stamp = new Intl.DateTimeFormat(getLocale(), { dateStyle: 'short', timeStyle: 'short' });

  const done = async (result: { ok: boolean; code?: string }) => {
    if (result.ok) {
      await router.invalidate();
      setNotice({ ok: true, text: m.admin_catalog_saved() });
    } else setNotice({ ok: false, text: errorText(result.code ?? '') });
  };

  const extend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get('expiresAt'));
    void extendLicenseFn({ data: { id: license.id, expiresAt: new Date(`${value}T23:59:59Z`).toISOString() } }).then(
      done,
    );
  };
  const seats = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void setSeatsFn({ data: { id: license.id, seats: Number(new FormData(event.currentTarget).get('seats')) } }).then(
      done,
    );
  };

  return (
    <>
      <header className="acct-head">
        <div>
          <p className="mono-label">
            <Link to="/admin/licences">{m.admin_licenses()}</Link> · {license.id}
          </p>
          <h1>{license.customerName}</h1>
          <p>
            {license.productName} · {license.editionName[locale] ?? license.editionName.fr} ·{' '}
            {DURATION_LABELS[license.duration]?.[locale] ?? license.duration} ·{' '}
            {m.licences_period({
              from: date.format(Date.parse(license.startsAt)),
              to: date.format(Date.parse(license.expiresAt)),
            })}
          </p>
        </div>
        <span className={license.status === 'active' ? 'state state-ok' : 'state state-off'}>
          {license.status === 'active' ? m.licences_state_active() : m.licences_state_revoked()}
        </span>
      </header>
      {notice ? (
        <p className={notice.ok ? 'form-ok' : 'form-error'} role="status" style={{ marginBottom: 16 }}>
          {notice.text}
        </p>
      ) : null}

      <section className="box" aria-labelledby="t-key">
        <div className="box-head">
          <h2 id="t-key">{m.licences_key()}</h2>
        </div>
        <div className="box-body">
          <div className="keybox">
            <code data-testid="admin-license-key">{license.key ?? m.licences_key_unavailable()}</code>
          </div>
          <p className="muted" style={{ marginTop: 10, fontSize: 13.5 }}>
            {m.admin_licenses_source({ source: license.source })}
          </p>
        </div>
      </section>

      <section className="box" aria-labelledby="t-devices">
        <div className="box-head">
          <h2 id="t-devices">
            {m.licences_seats()} · {m.licences_seats_of({ used: license.activations.length, total: license.seats })}
          </h2>
        </div>
        <div className="box-body tbl-wrap" tabIndex={0} role="region" aria-label={m.licences_seats()}>
          {license.activations.length === 0 ? (
            <p>{m.admin_licenses_no_device()}</p>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">{m.licences_col_computer()}</th>
                  <th scope="col">{m.licences_col_activated()}</th>
                  <th scope="col">{m.licences_col_seen()}</th>
                  <th scope="col">
                    <span className="sr">{m.admin_pages_actions()}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {license.activations.map((activation) => (
                  <tr key={activation.id}>
                    <td className="who">
                      <b>{activation.deviceName ?? m.licences_computer()}</b>
                      <small className="mono">{activation.deviceId}</small>
                    </td>
                    <td className="num">{stamp.format(Date.parse(activation.activatedAt))}</td>
                    <td className="num">{stamp.format(Date.parse(activation.lastRefreshAt))}</td>
                    <td className="act">
                      {can.write ? (
                        <button
                          className="btn btn-line btn-sm"
                          type="button"
                          onClick={() =>
                            void releaseSeatAdminFn({ data: { id: license.id, activationId: activation.id } }).then(
                              done,
                            )
                          }
                        >
                          {m.licences_release()}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {can.write && license.status === 'active' ? (
        <section className="box" aria-labelledby="t-change">
          <div className="box-head">
            <h2 id="t-change">{m.admin_licenses_change()}</h2>
          </div>
          <div className="box-body fields">
            <form className="row-form" onSubmit={extend}>
              <label className="field">
                <span className="field-label">{m.admin_licenses_new_expiry()}</span>
                <input
                  className="input"
                  type="date"
                  name="expiresAt"
                  required
                  defaultValue={license.expiresAt.slice(0, 10)}
                />
              </label>
              <span />
              <button className="btn btn-line btn-sm" type="submit">
                {m.admin_licenses_extend()}
              </button>
            </form>
            <form className="row-form" onSubmit={seats}>
              <label className="field">
                <span className="field-label">{m.licences_seats()}</span>
                <input className="input" type="number" name="seats" min={1} required defaultValue={license.seats} />
              </label>
              <span />
              <button className="btn btn-line btn-sm" type="submit">
                {m.admin_catalog_save()}
              </button>
            </form>
          </div>
        </section>
      ) : null}

      {can.revoke && license.status === 'active' ? (
        <section className="box" aria-labelledby="t-revoke">
          <div className="box-head">
            <h2 id="t-revoke">{m.admin_licenses_revoke()}</h2>
          </div>
          <div className="box-body fields">
            <p>{m.admin_licenses_revoke_help()}</p>
            <label className="check-line">
              <input type="checkbox" checked={confirm} onChange={(event) => setConfirm(event.currentTarget.checked)} />
              <span>{m.admin_licenses_revoke_confirm()}</span>
            </label>
            <div>
              <button
                className="btn btn-line"
                type="button"
                disabled={!confirm}
                onClick={() => void revokeLicenseFn({ data: { id: license.id } }).then(done)}
              >
                {m.admin_licenses_revoke()}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="box" aria-labelledby="t-journal">
        <div className="box-head">
          <h2 id="t-journal">{m.admin_licenses_journal()}</h2>
        </div>
        <div className="box-body">
          <ol style={{ display: 'grid', gap: 8 }}>
            {admin.journal.map((entry) => (
              <li key={`${entry.occurredAt}-${entry.action}`}>
                <span className="num muted">{stamp.format(Date.parse(entry.occurredAt))}</span> ·{' '}
                <code>{entry.action}</code> <small className="muted">({entry.actorType})</small>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
