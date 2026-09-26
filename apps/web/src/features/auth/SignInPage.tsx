import { Icon } from '@kya-em/ui';
import { useRouter } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { m } from '@/paraglide/messages.js';
import { authClient } from './authClient';

type Tab = 'in' | 'up';

interface Props {
  readonly initialTab: Tab;
  /** Adresse interne où revenir après la connexion. */
  readonly redirectTo: string;
  readonly magicLink: boolean;
  readonly available: boolean;
}

/** Traduit une erreur de Better Auth en message neutre (spec 002, histoire 1). */
function messageFor(error: { status?: number; code?: string } | null | undefined): string {
  if (!error) return m.auth_error_generic();
  if (error.status === 429) return m.auth_error_rate();
  switch (error.code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
    case 'INVALID_PASSWORD':
    case 'USER_NOT_FOUND':
      return m.auth_error_credentials();
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return m.auth_error_exists();
    case 'PASSWORD_TOO_SHORT':
      return m.auth_error_password();
    default:
      return error.status === 401 ? m.auth_error_credentials() : m.auth_error_generic();
  }
}

export function SignInPage({ initialTab, redirectTo, magicLink, available }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const done = async () => {
    await router.invalidate();
    // « to » passe par la réécriture des adresses de langue (/fr, /en), contrairement à « href ».
    await router.navigate({ to: redirectTo as '/espace' });
  };

  const run = async (action: () => Promise<{ error?: { status?: number; code?: string } | null }>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await action();
      if (result.error) setError(messageFor(result.error));
      else await done();
    } catch {
      setError(m.auth_error_generic());
    } finally {
      setBusy(false);
    }
  };

  const onSignIn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run(() =>
      authClient.signIn.email({ email: String(data.get('email')), password: String(data.get('password')) }),
    );
  };

  const onSignUp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get('password'));
    if (password.length < 10) {
      setError(m.auth_error_password());
      return;
    }
    void run(() =>
      authClient.signUp.email({ name: String(data.get('name')), email: String(data.get('email')), password }),
    );
  };

  const onMagicLink = async (email: string) => {
    setBusy(true);
    setError(null);
    await authClient.signIn.magicLink({ email, callbackURL: redirectTo }).catch(() => undefined);
    setBusy(false);
    setNotice(m.auth_magic_sent());
  };

  return (
    <div className="auth">
      <aside className="auth-side">
        <img src="/images/terrain.jpg" alt="" width="1400" height="933" />
        <div className="in">
          <h2>{m.auth_side_title()}</h2>
          <ul>
            {[m.auth_side_1(), m.auth_side_2(), m.auth_side_3(), m.auth_side_4()].map((item) => (
              <li key={item}>
                <Icon name="check" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="auth-main">
        <div className="auth-box">
          <h1>{m.auth_welcome()}</h1>
          <p>{m.auth_intro()}</p>
          {!available ? (
            <p className="form-error" role="alert" style={{ marginTop: 24 }}>
              {m.auth_unavailable()}
            </p>
          ) : (
            <>
              <div className="seg" role="tablist">
                <button type="button" role="tab" aria-selected={tab === 'in'} onClick={() => setTab('in')}>
                  {m.nav_sign_in()}
                </button>
                <button type="button" role="tab" aria-selected={tab === 'up'} onClick={() => setTab('up')}>
                  {m.auth_tab_sign_up()}
                </button>
              </div>

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

              {tab === 'in' ? (
                <form className="form" onSubmit={onSignIn} aria-label={m.nav_sign_in()}>
                  <label className="field">
                    <span>{m.field_email()}</span>
                    <input className="input" name="email" type="email" autoComplete="email" required />
                  </label>
                  <label className="field">
                    <span>{m.field_password()}</span>
                    <input className="input" name="password" type="password" autoComplete="current-password" required />
                  </label>
                  <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
                    {busy ? m.busy() : m.nav_sign_in()}
                  </button>
                  {magicLink ? (
                    <button
                      className="btn btn-line btn-lg btn-block"
                      type="button"
                      disabled={busy}
                      onClick={(event) => {
                        const email = (event.currentTarget.form?.elements.namedItem('email') as HTMLInputElement | null)
                          ?.value;
                        if (email) void onMagicLink(email);
                      }}
                    >
                      <Icon name="mail" />
                      {m.auth_magic_link()}
                    </button>
                  ) : null}
                </form>
              ) : (
                <form className="form" onSubmit={onSignUp} aria-label={m.auth_tab_sign_up()}>
                  <label className="field">
                    <span>{m.field_name()}</span>
                    <input className="input" name="name" type="text" autoComplete="name" required />
                  </label>
                  <label className="field">
                    <span>{m.field_email()}</span>
                    <input className="input" name="email" type="email" autoComplete="email" required />
                  </label>
                  <label className="field">
                    <span>{m.field_password()}</span>
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
                  <label className="check-line">
                    <input type="checkbox" name="terms" required />
                    <span>{m.auth_terms()}</span>
                  </label>
                  <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
                    {busy ? m.busy() : m.auth_submit_sign_up()}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
