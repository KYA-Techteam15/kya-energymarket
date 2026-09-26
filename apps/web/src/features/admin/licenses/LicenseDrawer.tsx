import { Link } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
import { m } from '@/paraglide/messages.js';
import { actionLabel, actorLabel } from '../dashboard/DashboardPage';
import {
  ChannelPill,
  copyText,
  Drawer,
  errorText,
  fcfa,
  formatDate,
  formatDateTime,
  formatDays,
  LicenseState,
  loc,
  natureLabel,
} from '../console/ui';
import {
  extendLicenseFn,
  getLicenseDetail,
  releaseSeatFn,
  resendKeyFn,
  revokeLicenseFn,
  setSeatsFn,
  type getLicenses,
} from './licenses';

type Detail = NonNullable<Awaited<ReturnType<typeof getLicenseDetail>>>;
type Offer = NonNullable<Awaited<ReturnType<typeof getLicenses>>>['offer'];
type Panel = 'none' | 'extend' | 'seats' | 'revoke' | 'resend';

/** Fiche d'une licence dans un panneau (spec 005b, histoire 4). */
export function LicenseDrawer({
  id,
  offer,
  now,
  onClose,
  onChanged,
  onError,
}: {
  id: string;
  offer: Offer;
  now: number;
  onClose: () => void;
  onChanged: (text: string) => void;
  onError: (text: string) => void;
}) {
  const [detail, setDetail] = useState<Detail | null | undefined>(undefined);
  const [reveal, setReveal] = useState(false);
  const [panel, setPanel] = useState<Panel>('none');
  const [days, setDays] = useState(30);
  const [reason, setReason] = useState('');
  const [seats, setSeats] = useState(1);
  const [email, setEmail] = useState('');

  const apply = useCallback((next: Detail | null) => {
    setDetail(next);
    if (next) {
      setSeats(next.license.seats);
      setEmail(next.license.recipientEmail ?? '');
    }
  }, []);
  const load = useCallback(async () => apply(await getLicenseDetail({ data: { id } })), [apply, id]);

  // Une autre licence remonte le composant (clé = identifiant) : l'état repart de zéro.
  useEffect(() => {
    let cancelled = false;
    void getLicenseDetail({ data: { id } }).then((next) => {
      if (!cancelled) apply(next);
    });
    return () => {
      cancelled = true;
    };
  }, [apply, id]);

  const done = async (result: { ok: boolean; code?: string }, text: string) => {
    if (!result.ok) return onError(errorText(result.code));
    setPanel('none');
    setReason('');
    await load();
    onChanged(text);
  };

  if (detail === undefined) {
    return (
      <Drawer title={id} eyebrow={m.cx_license_of()} onClose={onClose}>
        <p className="cx-muted">{m.cx_loading()}</p>
      </Drawer>
    );
  }
  if (detail === null) {
    return (
      <Drawer title={id} eyebrow={m.cx_license_of()} onClose={onClose}>
        <p>{m.cx_license_missing()}</p>
      </Drawer>
    );
  }

  const { license, journal, mails, can } = detail;
  const currentType = offer.flatMap((edition) => edition.types).find((type) => type.id === license.licenseTypeId);
  const drift = currentType && currentType.pricePerSeat !== license.pricePerSeat ? currentType.pricePerSeat : null;
  const key = license.key ? (reveal ? license.key : `${license.key.slice(0, 16)}••••-••••`) : m.cx_key_unavailable();

  const footer =
    license.status === 'revoked' ? null : (
      <>
        {can.write ? (
          <>
            <button className="cx-btn" type="button" onClick={() => setPanel('extend')}>
              {m.cx_extend()}
            </button>
            <button className="cx-btn" type="button" onClick={() => setPanel('seats')}>
              {m.cx_col_seats()}
            </button>
            <button className="cx-btn" type="button" onClick={() => setPanel('resend')}>
              {m.cx_resend_key()}
            </button>
          </>
        ) : null}
        <span className="cx-spacer" />
        {can.revoke ? (
          <button className="cx-btn cx-btn-danger" type="button" onClick={() => setPanel('revoke')}>
            {m.cx_revoke()}
          </button>
        ) : null}
      </>
    );

  return (
    <Drawer
      eyebrow={`${m.cx_license_of()} ${license.productName}`}
      title={<span className="mono">{license.id}</span>}
      onClose={onClose}
      footer={footer}
    >
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: -10 }}>
        <LicenseState license={license} now={now} />
        <ChannelPill channel={license.channel} />
      </div>

      <div>
        <div className="cx-label">{m.cx_key()}</div>
        <div className="cx-keybox" style={{ marginTop: 6 }}>
          <code data-testid="console-license-key">{key}</code>
          {license.key ? (
            <>
              <button
                className="cx-btn cx-btn-sm cx-btn-ghost"
                type="button"
                onClick={() => setReveal((open) => !open)}
              >
                {reveal ? m.cx_hide() : m.cx_show()}
              </button>
              <button
                className="cx-btn cx-btn-sm"
                type="button"
                onClick={() =>
                  void copyText(license.key!).then((ok) =>
                    ok ? onChanged(m.cx_key_copied()) : onError(m.cx_copy_refused()),
                  )
                }
              >
                {m.cx_copy()}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <section>
        <h3>{m.cx_holder()}</h3>
        <dl className="cx-kv">
          <dt>{m.cx_shown_name()}</dt>
          <dd>
            {license.organizationId ? (
              license.customerName
            ) : (
              <span className="cx-muted">{m.cx_unassigned_hint({ name: license.customerName })}</span>
            )}
          </dd>
          {license.recipientEmail ? (
            <>
              <dt>{m.cx_recipient()}</dt>
              <dd>{license.recipientEmail}</dd>
            </>
          ) : null}
          {license.batchId ? (
            <>
              <dt>{m.cx_batch()}</dt>
              <dd>
                <Link to="/admin/lots/$id" params={{ id: license.batchId }}>
                  {license.batchLabel}
                </Link>
              </dd>
            </>
          ) : null}
        </dl>
      </section>

      <section>
        <h3>{m.cx_offer_at_issue()}</h3>
        <dl className="cx-kv">
          <dt>{m.cx_edition()}</dt>
          <dd>
            {loc(license.editionName)} <span className="cx-tag">{license.editionCode}</span>
          </dd>
          <dt>{m.cx_type()}</dt>
          <dd>
            {loc(license.typeName)} · {natureLabel(license.nature)}
          </dd>
          <dt>{m.cx_duration()}</dt>
          <dd className="num">{formatDays(license.days)}</dd>
          <dt>{m.cx_price_per_seat()}</dt>
          <dd className="num">{license.pricePerSeat ? fcfa(license.pricePerSeat) : m.cx_free()}</dd>
          <dt>{m.cx_col_seats()}</dt>
          <dd className="num">{license.seats}</dd>
          <dt>{m.cx_amount_paid()}</dt>
          <dd className="num">
            <b>{fcfa(license.amount)}</b>
          </dd>
          <dt>{m.cx_validity()}</dt>
          <dd className="num">
            {license.startsAt
              ? `${formatDate(license.startsAt)} → ${formatDate(license.expiresAt)}`
              : m.cx_starts_on_activation()}
          </dd>
          <dt>{m.cx_issued_by()}</dt>
          <dd>
            {license.createdByName ?? m.cx_actor_system()} · {formatDateTime(license.createdAt)}
            {license.reference ? (
              <>
                {' '}
                · <span className="mono">{license.reference}</span>
              </>
            ) : null}
          </dd>
          {license.reason ? (
            <>
              <dt>{m.cx_reason()}</dt>
              <dd>{license.reason}</dd>
            </>
          ) : null}
        </dl>
        {drift !== null ? (
          <p className="cx-note" style={{ marginTop: 10 }}>
            {m.cx_price_drift({ price: fcfa(drift) })}
          </p>
        ) : null}
      </section>

      <section>
        <h3>
          {m.cx_devices()}{' '}
          <span className="cx-muted num" style={{ fontWeight: 400 }}>
            {license.activations.length}/{license.seats}
          </span>
        </h3>
        {license.activations.length ? (
          <ul className="cx-devices">
            {license.activations.map((activation) => (
              <li key={activation.id}>
                <div>
                  <b style={{ fontWeight: 500 }}>{activation.deviceName ?? m.cx_computer()}</b>
                  <small>{m.cx_last_check({ date: formatDateTime(activation.lastRefreshAt) })}</small>
                </div>
                {can.write ? (
                  <button
                    className="cx-btn cx-btn-sm"
                    type="button"
                    aria-label={m.cx_release_named({ name: activation.deviceName ?? activation.deviceId })}
                    onClick={() =>
                      void releaseSeatFn({ data: { id: license.id, activationId: activation.id } }).then((result) =>
                        done(result, m.cx_released()),
                      )
                    }
                  >
                    {m.cx_release()}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="cx-muted" style={{ margin: '8px 0 0' }}>
            {m.cx_no_device()}
          </p>
        )}
      </section>

      {mails.length ? (
        <section>
          <h3>{m.cx_mails()}</h3>
          <ul className="cx-devices">
            {mails.map((mail) => (
              <li key={mail.id}>
                <div>
                  <b style={{ fontWeight: 500 }}>{mail.email}</b>
                  <small>
                    {formatDateTime(mail.createdAt)}
                    {mail.lastError ? ` · ${mail.lastError}` : ''}
                  </small>
                </div>
                <span
                  className={
                    mail.status === 'done'
                      ? 'cx-pill ok'
                      : mail.status === 'failed'
                        ? 'cx-pill danger'
                        : 'cx-pill plain'
                  }
                >
                  {mailStatus(mail.status)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h3>{m.cx_history()}</h3>
        <ul className="cx-timeline">
          {journal.map((entry, index) => (
            <li key={`${entry.occurredAt}-${index}`}>
              {actionLabel(entry.action)}
              <small>
                {formatDateTime(entry.occurredAt)} · {actorLabel(entry.actorType, entry.actorName)}
              </small>
            </li>
          ))}
        </ul>
      </section>

      {panel === 'extend' ? (
        <div className="cx-panel">
          <b>{m.cx_extend()}</b>
          <div className="cx-seg" role="group" aria-label={m.cx_duration()}>
            {[30, 91, 365].map((value) => (
              <button key={value} type="button" aria-pressed={days === value} onClick={() => setDays(value)}>
                + {formatDays(value)}
              </button>
            ))}
          </div>
          <div className="cx-field">
            <label htmlFor="extend-days">{m.cx_days_label()}</label>
            <input
              id="extend-days"
              className="cx-input"
              type="number"
              min={1}
              max={3650}
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
            />
          </div>
          <div className="cx-field">
            <label htmlFor="extend-reason">{m.cx_reason()}</label>
            <input
              id="extend-reason"
              className="cx-input"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={m.cx_reason_example()}
            />
          </div>
          <div className="cx-actions">
            <button
              className="cx-btn cx-btn-primary cx-btn-sm"
              type="button"
              onClick={() =>
                void extendLicenseFn({ data: { id: license.id, days, reason: reason || undefined } }).then((result) =>
                  done(result, m.cx_extended({ days: formatDays(days) })),
                )
              }
            >
              {m.cx_extend()}
            </button>
            <button className="cx-btn cx-btn-ghost cx-btn-sm" type="button" onClick={() => setPanel('none')}>
              {m.cx_cancel()}
            </button>
          </div>
        </div>
      ) : null}
      {panel === 'seats' ? (
        <div className="cx-panel">
          <div className="cx-field">
            <label htmlFor="seats-count">{m.cx_col_seats()}</label>
            <input
              id="seats-count"
              className="cx-input"
              type="number"
              min={1}
              value={seats}
              onChange={(event) => setSeats(Number(event.target.value))}
            />
          </div>
          <div className="cx-actions">
            <button
              className="cx-btn cx-btn-primary cx-btn-sm"
              type="button"
              onClick={() =>
                void setSeatsFn({ data: { id: license.id, seats } }).then((result) => done(result, m.cx_saved()))
              }
            >
              {m.cx_save()}
            </button>
            <button className="cx-btn cx-btn-ghost cx-btn-sm" type="button" onClick={() => setPanel('none')}>
              {m.cx_cancel()}
            </button>
          </div>
        </div>
      ) : null}
      {panel === 'resend' ? (
        <div className="cx-panel">
          <div className="cx-field">
            <label htmlFor="resend-email">{m.cx_send_to()}</label>
            <input
              id="resend-email"
              className="cx-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="cx-actions">
            <button
              className="cx-btn cx-btn-primary cx-btn-sm"
              type="button"
              disabled={!email.includes('@')}
              onClick={() =>
                void resendKeyFn({ data: { id: license.id, email } }).then((result) =>
                  done(result, m.cx_key_queued({ email })),
                )
              }
            >
              {m.cx_send()}
            </button>
            <button className="cx-btn cx-btn-ghost cx-btn-sm" type="button" onClick={() => setPanel('none')}>
              {m.cx_cancel()}
            </button>
          </div>
        </div>
      ) : null}
      {panel === 'revoke' ? (
        <div className="cx-panel danger">
          <b style={{ color: 'var(--cx-danger)' }}>{m.cx_revoke_title()}</b>
          <span className="cx-muted" style={{ fontSize: 13 }}>
            {m.cx_revoke_hint({ count: license.activations.length })}
          </span>
          <div className="cx-field">
            <label htmlFor="revoke-reason">{m.cx_reason()}</label>
            <input
              id="revoke-reason"
              className="cx-input"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={m.cx_reason_required()}
            />
          </div>
          <div className="cx-actions">
            <button
              className="cx-btn cx-btn-danger cx-solid cx-btn-sm"
              type="button"
              disabled={reason.trim().length < 3}
              onClick={() =>
                void revokeLicenseFn({ data: { id: license.id, reason } }).then((result) =>
                  done(result, m.cx_revoked()),
                )
              }
            >
              {m.cx_revoke()}
            </button>
            <button className="cx-btn cx-btn-ghost cx-btn-sm" type="button" onClick={() => setPanel('none')}>
              {m.cx_cancel()}
            </button>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}

export const mailStatus = (status: string) =>
  (
    ({
      done: m.cx_mail_done,
      failed: m.cx_mail_failed,
      pending: m.cx_mail_pending,
      running: m.cx_mail_pending,
    }) as Record<string, () => string>
  )[status]?.() ?? status;
