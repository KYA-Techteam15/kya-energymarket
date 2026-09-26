import { useRouter } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { m } from '@/paraglide/messages.js';
import { localizeHref } from '@/paraglide/runtime.js';
import { authClient } from './authClient';

interface Props {
  /** Présent : choix du nouveau mot de passe ; absent : demande du lien. */
  readonly token?: string;
  readonly invalid: boolean;
  /** Un courriel peut-il partir ? Sinon, la page renvoie vers le support. */
  readonly mail: boolean;
}

/** Mot de passe oublié et choix d'un nouveau mot de passe (spec 002, avenant A). */
export function PasswordPage({ token, invalid, mail }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(invalid ? m.pwd_invalid() : null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const request = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get('email'));
    setBusy(true);
    setError(null);
    const result = await authClient
      .requestPasswordReset({ email, redirectTo: localizeHref('/mot-de-passe') })
      .catch(() => ({ error: { status: 500 } }));
    setBusy(false);
    // Réponse identique que le compte existe ou non ; seule la limitation de débit est signalée.
    if (result.error?.status === 429) setError(m.auth_error_rate());
    else setNotice(m.pwd_sent());
  };

  const reset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newPassword = String(new FormData(event.currentTarget).get('password'));
    if (newPassword.length < 10) {
      setError(m.auth_error_password());
      return;
    }
    setBusy(true);
    setError(null);
    const result = await authClient.resetPassword({ newPassword, token: token! }).catch(() => ({ error: {} }));
    setBusy(false);
    if (result.error) setError(m.pwd_invalid());
    else await router.navigate({ to: '/connexion', search: { motdepasse: 'change' } });
  };

  const choosing = token !== undefined && !invalid;

  return (
    <div className="auth">
      <aside className="auth-side">
        <img src="/images/terrain.jpg" alt="" width="1400" height="933" />
      </aside>
      <div className="auth-main">
        <div className="auth-box">
          <h1>{choosing ? m.pwd_new_title() : m.pwd_title()}</h1>
          <p>{choosing ? m.pwd_new_intro() : m.pwd_intro()}</p>
          {error ? (
            <p className="form-error" role="alert" style={{ marginTop: 20 }}>
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="form-ok" role="status" style={{ marginTop: 20 }}>
              {notice}
            </p>
          ) : null}
          {!mail ? (
            <p className="form-error" role="alert" style={{ marginTop: 20 }}>
              {m.pwd_unavailable()}
            </p>
          ) : choosing ? (
            <form className="form" onSubmit={reset} aria-label={m.pwd_new_title()}>
              <label className="field">
                <span>{m.pwd_new_field()}</span>
                <input
                  className="input"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  required
                />
                <small>{m.field_password_hint()}</small>
              </label>
              <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
                {busy ? m.busy() : m.pwd_new_submit()}
              </button>
            </form>
          ) : (
            <form className="form" onSubmit={request} aria-label={m.pwd_title()}>
              <label className="field">
                <span>{m.field_email()}</span>
                <input className="input" name="email" type="email" autoComplete="email" required />
              </label>
              <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
                {busy ? m.busy() : m.pwd_send()}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
