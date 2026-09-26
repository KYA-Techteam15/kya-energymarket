import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { issueLicenseFn, type getLicensesAdmin } from './licenses';

type Admin = NonNullable<Awaited<ReturnType<typeof getLicensesAdmin>>>;

export const DURATION_LABELS: Record<string, { fr: string; en: string }> = {
  P1D: { fr: '1 jour', en: '1 day' },
  P1W: { fr: '1 semaine', en: '1 week' },
  P1M: { fr: '1 mois', en: '1 month' },
  P3M: { fr: '1 trimestre', en: '3 months' },
  P6M: { fr: '6 mois', en: '6 months' },
  P1Y: { fr: '1 an', en: '1 year' },
};

const issueError = (code: string) =>
  ({
    ACCOUNT_NOT_FOUND: m.admin_licenses_no_account(),
    TOO_MANY_SEATS: m.admin_licenses_too_many_seats(),
    FORBIDDEN: m.admin_only(),
  })[code] ?? m.admin_editor_invalid();

/** Administration → Licences : recherche et émission (spec 005, histoire 3). */
export function LicensesAdminPage({ admin, query }: { admin: Admin; query: string }) {
  const router = useRouter();
  const navigate = useNavigate();
  const locale = getLocale() === 'en' ? 'en' : 'fr';
  const [edition, setEdition] = useState(admin.offer[0]?.code ?? '');
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const date = new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium' });
  const selected = admin.offer.find((item) => item.code === edition);

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get('q') ?? '').trim();
    void navigate({ to: '/admin/licences', search: { q: q || undefined } });
  };

  const issue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await issueLicenseFn({
      data: {
        email: String(data.get('email') ?? '').trim(),
        editionCode: String(data.get('edition')),
        duration: String(data.get('duration')),
        seats: Number(data.get('seats')),
      },
    });
    if (result.ok) {
      await router.invalidate();
      void navigate({ to: '/admin/licences/$id', params: { id: result.value } });
    } else setNotice({ ok: false, text: issueError(result.code) });
  };

  return (
    <>
      <header className="acct-head">
        <div>
          <h1>{m.admin_licenses()}.</h1>
          <p>{m.admin_licenses_intro()}</p>
        </div>
      </header>
      {notice ? (
        <p className={notice.ok ? 'form-ok' : 'form-error'} role="status" style={{ marginBottom: 16 }}>
          {notice.text}
        </p>
      ) : null}

      <form className="search" role="search" style={{ marginBottom: 20 }} onSubmit={search}>
        <input
          className="input"
          type="search"
          name="q"
          defaultValue={query}
          placeholder={m.admin_licenses_search()}
          aria-label={m.admin_licenses_search()}
        />
      </form>

      <section className="box">
        <div className="box-body tbl-wrap" tabIndex={0} role="region" aria-label={m.admin_licenses()}>
          {admin.licenses.length === 0 ? (
            <p>{m.admin_licenses_none()}</p>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">{m.admin_licenses_customer()}</th>
                  <th scope="col">{m.admin_licenses_offer()}</th>
                  <th scope="col">{m.licences_seats()}</th>
                  <th scope="col">{m.admin_licenses_expires()}</th>
                  <th scope="col">{m.admin_catalog_status()}</th>
                </tr>
              </thead>
              <tbody>
                {admin.licenses.map((license) => (
                  <tr key={license.id}>
                    <td className="who">
                      <Link to="/admin/licences/$id" params={{ id: license.id }}>
                        <b>{license.customerName}</b>
                      </Link>
                      <small className="mono">{license.key ?? license.id}</small>
                    </td>
                    <td>
                      {license.productName} · {license.editionName[locale] ?? license.editionName.fr} ·{' '}
                      {DURATION_LABELS[license.duration]?.[locale] ?? license.duration}
                    </td>
                    <td className="num">
                      {license.activations.length}/{license.seats}
                    </td>
                    <td className="num">{date.format(Date.parse(license.expiresAt))}</td>
                    <td>
                      <span className={license.status === 'active' ? 'state state-ok' : 'state state-off'}>
                        {license.status === 'active' ? m.licences_state_active() : m.licences_state_revoked()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {admin.can.write ? (
        <section className="box" aria-labelledby="t-issue" style={{ marginTop: 24 }}>
          <div className="box-head">
            <h2 id="t-issue">{m.admin_licenses_issue()}</h2>
          </div>
          <form className="box-body fields" onSubmit={(event) => void issue(event)}>
            <label className="field">
              <span className="field-label">{m.admin_licenses_owner_email()}</span>
              <input className="input" type="email" name="email" required />
              <small className="field-help">{m.admin_licenses_owner_help()}</small>
            </label>
            <div className="field-trio">
              <label className="field">
                <span className="field-label">{m.admin_catalog_edition()}</span>
                <select
                  className="input"
                  name="edition"
                  value={edition}
                  onChange={(event) => setEdition(event.currentTarget.value)}
                >
                  {admin.offer.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name[locale] ?? item.name.fr}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">{m.block_pricing_duration()}</span>
                <select className="input" name="duration" key={edition}>
                  {(selected?.durations ?? []).map((duration) => (
                    <option key={duration} value={duration}>
                      {DURATION_LABELS[duration]?.[locale] ?? duration}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">{m.licences_seats()}</span>
                <input
                  className="input"
                  type="number"
                  name="seats"
                  min={1}
                  max={selected?.maxSeats ?? 10_000}
                  defaultValue={1}
                  required
                />
              </label>
            </div>
            <div>
              <button className="btn btn-primary" type="submit">
                {m.admin_licenses_issue_submit()}
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </>
  );
}
