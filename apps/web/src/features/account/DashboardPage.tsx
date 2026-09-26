import { useRouteContext, useRouter } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { authClient } from '@/features/auth/authClient';
import { m } from '@/paraglide/messages.js';

/** Identifiant d'adresse lisible et unique (le serveur refuse les doublons). */
const slugFor = (name: string) =>
  `${
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, '-')
      .replace(/^-|-$/gu, '')
      .slice(0, 40) || 'organisation'
  }-${crypto.randomUUID().slice(0, 6)}`;

export function DashboardPage() {
  const { viewer } = useRouteContext({ from: '/espace' });
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstName = viewer.name.split(/\s+/u)[0] ?? viewer.name;

  // « Acheter pour une organisation » : l'organisation d'entreprise devient visible (spec 002, histoire 2).
  const createOrganization = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get('name')).trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    const result = await authClient.organization.create({ name, slug: slugFor(name), metadata: { kind: 'company' } });
    setBusy(false);
    if (result.error || !result.data) {
      setError(m.auth_error_generic());
      return;
    }
    // Active explicitement la nouvelle organisation : la session en cache pourrait garder l'ancienne.
    await authClient.organization.setActive({ organizationId: result.data.id });
    await router.invalidate();
    await router.navigate({ to: '/espace/organisation' });
  };

  return (
    <>
      <header className="acct-head">
        <div>
          <h1>{m.account_hello({ name: firstName })}</h1>
          <p>{m.account_intro()}</p>
        </div>
      </header>

      <div className="cards">
        {[
          [m.account_licences_title(), m.account_licences_text()],
          [m.account_downloads_title(), m.account_downloads_text()],
          [m.account_invoices_title(), m.account_invoices_text()],
          [m.account_support_title(), m.account_support_text()],
        ].map(([title, text]) => (
          <div key={title} className="card-soon">
            <b>{title}</b>
            {text} <span className="chip">{m.nav_soon()}</span>
          </div>
        ))}
      </div>

      {viewer.organization?.visible ? null : (
        <section className="box" style={{ marginTop: 32 }} aria-labelledby="t-org">
          <div className="box-head">
            <h2 id="t-org">{m.org_company_title()}</h2>
          </div>
          <div className="box-body">
            <p>{m.org_company_text()}</p>
            <form className="form" style={{ marginTop: 18, maxWidth: 480 }} onSubmit={createOrganization}>
              {error ? (
                <p className="form-error" role="alert">
                  {error}
                </p>
              ) : null}
              <label className="field">
                <span>{m.org_field_name()}</span>
                <input className="input" name="name" type="text" autoComplete="organization" required />
              </label>
              <div>
                <button className="btn btn-primary" type="submit" disabled={busy}>
                  {busy ? m.busy() : m.org_create()}
                </button>
              </div>
            </form>
          </div>
        </section>
      )}
    </>
  );
}
