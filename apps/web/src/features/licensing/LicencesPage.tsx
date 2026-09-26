import { Icon } from '@kya-em/ui';
import { Link, useRouter } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { assignSeatFn, claimKeyFn, releaseSeatFn, type getMyLicenses } from './server';

type Licenses = NonNullable<Awaited<ReturnType<typeof getMyLicenses>>>;
type License = Licenses[number];

/** Clé masquée par défaut : on la montre ou on la copie d'un geste. */
function LicenseKey({ value }: { value: string | null }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="muted">{m.licences_key_unavailable()}</span>;
  const masked = value.replace(/[2-9A-Z]{4}-[2-9A-Z]{4}$/u, '••••-••••');
  return (
    <div className="key">
      <code data-testid="license-key">{shown ? value : masked}</code>
      <button
        className="icon-btn"
        type="button"
        aria-pressed={shown}
        aria-label={m.licences_show_key()}
        onClick={() => setShown((v) => !v)}
      >
        <Icon name="search" />
      </button>
      <button
        className="icon-btn"
        type="button"
        aria-label={copied ? m.copied() : m.licences_copy_key()}
        onClick={() => {
          void navigator.clipboard?.writeText(value);
          setCopied(true);
        }}
      >
        <Icon name={copied ? 'check' : 'copy'} />
      </button>
    </div>
  );
}

function LicenseCard({ license }: { license: License }) {
  const router = useRouter();
  const locale = getLocale() === 'en' ? 'en' : 'fr';
  const [assigning, setAssigning] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const date = new Intl.DateTimeFormat(getLocale(), { dateStyle: 'long' });
  const short = new Intl.DateTimeFormat(getLocale(), { dateStyle: 'short' });
  const starts = license.startsAt ? Date.parse(license.startsAt) : null;
  const expires = license.expiresAt ? Date.parse(license.expiresAt) : null;
  const remaining = license.remainingDays;
  const elapsedShare = license.remainingShare;
  const used = license.activations.length;
  const expired = license.expired;
  const state =
    license.status === 'revoked'
      ? { className: 'state state-off', label: m.licences_state_revoked() }
      : license.waiting
        ? { className: 'state state-off', label: m.licences_state_waiting() }
        : expired
          ? { className: 'state state-off', label: m.licences_state_expired() }
          : { className: 'state state-ok', label: m.licences_state_active() };
  const editionName = locale === 'en' ? license.editionName.en || license.editionName.fr : license.editionName.fr;
  const typeName = locale === 'en' ? license.typeName.en || license.typeName.fr : license.typeName.fr;

  const release = async (activationId: string) => {
    const result = await releaseSeatFn({ data: { licenseId: license.id, activationId } });
    setNotice(result.ok ? { ok: true, text: m.licences_released() } : { ok: false, text: m.admin_only() });
    await router.invalidate();
  };

  const assign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get('email') ?? '').trim();
    const result = await assignSeatFn({ data: { licenseId: license.id, email } });
    if (result.ok) {
      await router.invalidate();
      setNotice({ ok: true, text: m.licences_assigned({ email }) });
      form.reset();
      setAssigning(false);
    } else {
      setNotice({
        ok: false,
        text:
          result.code === 'NO_MAILER'
            ? m.licences_no_mailer()
            : result.code === 'INVALID_EMAIL'
              ? m.licences_invalid_email()
              : m.admin_only(),
      });
    }
  };

  const free = Math.max(0, license.seats - used);
  return (
    <article className="lic" aria-labelledby={`lic-${license.id}`}>
      <div className="lic-top">
        <img src="/images/ksd-mark.png" alt="" width="48" height="39" />
        <h2 id={`lic-${license.id}`}>
          {license.productName} · {editionName}
        </h2>
        <small>
          {typeName} ·{' '}
          {starts !== null && expires !== null
            ? m.licences_period({ from: date.format(starts), to: date.format(expires) })
            : m.licences_waiting()}
        </small>
        <div className="end">
          <span className={state.className}>{state.label}</span>
          <Link
            className="btn btn-buy btn-sm"
            to="/logiciels/$slug/$page"
            params={{ slug: license.productSlug, page: 'tarifs' }}
            hash="acheter"
          >
            {m.licences_renew()}
          </Link>
        </div>
      </div>
      <div className="lic-stats">
        <div>
          <small>{m.licences_key()}</small>
          <LicenseKey value={license.key} />
        </div>
        <div>
          <small>{m.licences_remaining()}</small>
          <b>{remaining === 1 ? m.licences_day_one() : m.licences_days({ count: remaining })}</b>
          <div className={remaining < 15 ? 'meter warn' : 'meter'} aria-hidden="true">
            <i style={{ '--v': `${elapsedShare}%` } as React.CSSProperties} />
          </div>
        </div>
        <div>
          <small>{m.licences_seats_used()}</small>
          <b data-testid="seats-used">{m.licences_seats_of({ used, total: license.seats })}</b>
          <div className="meter" aria-hidden="true">
            <i style={{ '--v': `${(used / Math.max(1, license.seats)) * 100}%` } as React.CSSProperties} />
          </div>
        </div>
      </div>
      <div className="seats">
        <div className="seats-head">
          <h3>{m.licences_seats()}</h3>
          {license.canManage && license.status === 'active' ? (
            <button
              className="btn btn-line btn-sm"
              type="button"
              aria-expanded={assigning}
              onClick={() => setAssigning((v) => !v)}
            >
              <Icon name="plus" />
              {m.licences_assign()}
            </button>
          ) : null}
        </div>
        {notice ? (
          <p className={notice.ok ? 'form-ok' : 'form-error'} role="status" style={{ margin: '8px 24px' }}>
            {notice.text}
          </p>
        ) : null}
        <form className={assigning ? 'assign is-open' : 'assign'} onSubmit={(event) => void assign(event)}>
          <input
            className="input"
            type="email"
            name="email"
            required
            placeholder={m.licences_colleague_email()}
            aria-label={m.licences_colleague_email()}
          />
          <button className="btn btn-primary btn-sm" type="submit">
            {m.licences_send()}
          </button>
        </form>
        <div className="tbl-wrap" tabIndex={0} role="region" aria-label={m.licences_seats()}>
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">{m.licences_col_seat()}</th>
                <th scope="col">{m.licences_col_computer()}</th>
                <th scope="col">{m.licences_col_activated()}</th>
                <th scope="col">{m.licences_col_seen()}</th>
                <th scope="col">
                  <span className="sr">{m.admin_pages_actions()}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {license.activations.map((activation, index) => (
                <tr key={activation.id}>
                  <td className="num">{index + 1}</td>
                  <td className="who">
                    <b>{activation.deviceName ?? m.licences_computer()}</b>
                    <small className="mono">{activation.deviceId.slice(0, 8)}</small>
                  </td>
                  <td className="num">{short.format(Date.parse(activation.activatedAt))}</td>
                  <td className="num">{short.format(Date.parse(activation.lastRefreshAt))}</td>
                  <td className="act">
                    {license.canManage ? (
                      <button className="btn btn-line btn-sm" type="button" onClick={() => void release(activation.id)}>
                        {m.licences_release()}
                        <span className="sr"> {activation.deviceName ?? activation.deviceId.slice(0, 8)}</span>
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {Array.from({ length: free }, (_, index) => (
                <tr key={`free-${index}`}>
                  <td className="num">{used + index + 1}</td>
                  <td className="who">
                    <b>{m.licences_free_seat()}</b>
                    <small>{m.licences_free_seat_hint()}</small>
                  </td>
                  <td className="num">—</td>
                  <td className="num">—</td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {license.invites.length ? (
          <p className="muted" style={{ padding: '12px 24px 18px', fontSize: 13.5 }}>
            {m.licences_invites({ emails: license.invites.map((invite) => invite.email).join(', ') })}
          </p>
        ) : null}
      </div>
    </article>
  );
}

/** « Vous avez reçu une clé ? » : la licence rejoint l'espace (spec 005b, FR-006). */
function AddKey() {
  const router = useRouter();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const key = String(new FormData(form).get('key') ?? '').trim();
    const result = await claimKeyFn({ data: { key } });
    if (result.ok) {
      form.reset();
      setNotice({ ok: true, text: m.licences_key_added() });
      await router.invalidate();
    } else {
      setNotice({
        ok: false,
        text: result.code === 'ALREADY_CLAIMED' ? m.licences_key_taken() : m.licences_key_unknown(),
      });
    }
  };
  return (
    <section className="box" aria-labelledby="ajouter-cle">
      <div className="box-head">
        <h2 id="ajouter-cle">{m.licences_add_key_title()}</h2>
      </div>
      <div className="box-body">
        <p className="muted" style={{ marginTop: 0 }}>
          {m.licences_add_key_text()}
        </p>
        <form className="assign is-open" style={{ padding: 0 }} onSubmit={(event) => void submit(event)}>
          <input
            className="input mono"
            name="key"
            required
            minLength={12}
            maxLength={64}
            placeholder="KYA-COM-12M-XXXX-XXXX-XXXX"
            aria-label={m.licences_add_key_label()}
          />
          <button className="btn btn-primary btn-sm" type="submit">
            {m.licences_add_key_submit()}
          </button>
        </form>
        {notice ? (
          <p className={notice.ok ? 'form-ok' : 'form-error'} role="status" style={{ marginTop: 10 }}>
            {notice.text}
          </p>
        ) : null}
      </div>
    </section>
  );
}

/** Espace client, Licences (spec 005, design/v5/espace/licences.html). */
export function LicencesPage({ licenses }: { licenses: Licenses }) {
  return (
    <>
      <header className="acct-head">
        <div>
          <h1>{m.account_licences_title()}.</h1>
          <p>{m.licences_intro()}</p>
        </div>
        <Link
          className="btn btn-buy"
          to="/logiciels/$slug/$page"
          params={{ slug: 'kya-soldesign', page: 'tarifs' }}
          hash="acheter"
        >
          {m.licences_buy()}
        </Link>
      </header>
      {licenses.length === 0 ? (
        <section className="box">
          <div className="box-body">
            <p>{m.licences_none()}</p>
          </div>
        </section>
      ) : (
        <>
          {licenses.map((license) => (
            <LicenseCard key={license.id} license={license} />
          ))}
          <div className="callout" style={{ marginTop: 24 }}>
            <Icon name="shield" />
            <span>
              <b>{m.licences_release_title()}</b> {m.licences_release_text()}
            </span>
          </div>
        </>
      )}
      <AddKey />
    </>
  );
}
