import { Icon } from '@kya-em/ui';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { authClient } from '@/features/auth/authClient';
import { m } from '@/paraglide/messages.js';
import type { getConsent } from './server';

type Consent = Awaited<ReturnType<typeof getConsent>>;

const scopeLabels: Record<string, () => string> = {
  openid: m.consent_scope_openid,
  profile: m.consent_scope_profile,
  email: m.consent_scope_email,
  offline_access: m.consent_scope_offline_access,
  'admin:read': m.consent_scope_admin_read,
  'admin:catalog': m.consent_scope_admin_catalog,
  'admin:content': m.consent_scope_admin_content,
  'admin:licenses': m.consent_scope_admin_licenses,
};

/**
 * Page d'autorisation OAuth du serveur MCP (spec 003). La requête signée de Better Auth reste dans
 * l'adresse : le client navigateur la joint à la réponse, qui renvoie vers le client IA.
 */
export function ConsentPage({ consent, scopes }: { consent: Consent; scopes: readonly string[] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answer = async (accept: boolean) => {
    setBusy(true);
    setError(null);
    const result = await authClient.oauth2
      .consent({ accept, ...(accept ? { scope: scopes.join(' ') } : {}) })
      .catch(() => ({ data: null, error: {} }));
    const url = (result.data as { url?: string } | null)?.url;
    if (url) {
      window.location.href = url;
      return;
    }
    setBusy(false);
    setError(m.consent_error());
  };

  if (!consent.signedIn) {
    return (
      <section className="wrap page-head">
        <h1>{m.consent_signin()}</h1>
        <p>
          <Link className="btn btn-primary" to="/connexion">
            {m.nav_sign_in()}
          </Link>
        </p>
      </section>
    );
  }

  const client = consent.client.name;
  return (
    <div className="auth">
      <aside className="auth-side">
        <img src="/images/terrain.jpg" alt="" width="1400" height="933" />
      </aside>
      <div className="auth-main">
        <div className="auth-box">
          {consent.staff ? (
            <>
              <h1>{m.consent_title({ client })}</h1>
              <p>{m.consent_intro({ client })}</p>
            </>
          ) : (
            <>
              <h1>{m.consent_denied_title()}</h1>
              <p role="alert">{m.consent_denied_text()}</p>
            </>
          )}

          <dl className="consent-facts">
            <div>
              <dt>{m.consent_account()}</dt>
              <dd>
                {consent.name} · {consent.email}
              </dd>
            </div>
            {consent.staff ? (
              <div>
                <dt>{m.consent_scopes()}</dt>
                <dd>
                  <ul>
                    {scopes.map((scope) => (
                      <li key={scope}>
                        <Icon name="check" />
                        {scopeLabels[scope]?.() ?? scope}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}
          </dl>

          {error ? (
            <p className="form-error" role="alert" style={{ marginTop: 20 }}>
              {error}
            </p>
          ) : null}

          <div className="form">
            {consent.staff ? (
              <button
                className="btn btn-primary btn-lg btn-block"
                type="button"
                disabled={busy}
                onClick={() => void answer(true)}
              >
                {busy ? m.busy() : m.consent_allow()}
              </button>
            ) : null}
            <button
              className="btn btn-line btn-lg btn-block"
              type="button"
              disabled={busy}
              onClick={() => void answer(false)}
            >
              {m.consent_deny()}
            </button>
            {consent.staff ? <small className="muted">{m.consent_note()}</small> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
