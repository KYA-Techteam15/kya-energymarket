import { Icon } from '@kya-em/ui';
import { Link, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { activateTrialFn, type getTrialPage } from './trial';

type Data = NonNullable<Awaited<ReturnType<typeof getTrialPage>>>;

const pick = (text: { fr: string; en?: string }) => (getLocale() === 'en' ? text.en || text.fr : text.fr);

/**
 * Essai gratuit en quatre étapes (spec 006, design/v5/essai.html) : compte, activation, téléchargement,
 * activation dans le logiciel.
 */
export function TrialPage({ data, slug }: { data: Data; slug: string }) {
  const router = useRouter();
  const { status, viewer } = data;
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const date = new Intl.DateTimeFormat(getLocale(), { dateStyle: 'long' });
  const here = `/essai?logiciel=${slug}`;

  const active = status.used?.key ? status.used : null;
  const step = !viewer ? 1 : active ? (installed ? 4 : 3) : 2;
  const stepClass = (index: number) => (index < step ? 'is-done' : index === step ? 'is-now' : undefined);
  const name = status.product.name;

  const activate = async () => {
    setBusy(true);
    setError(null);
    const result = await activateTrialFn({ data: { slug } });
    setBusy(false);
    if (result.ok) {
      await router.invalidate();
      return;
    }
    setError(
      result.code === 'TRIAL_USED'
        ? m.trial_err_used()
        : result.code === 'TRIAL_UNAVAILABLE'
          ? m.trial_unavailable_text()
          : m.trial_err_generic(),
    );
    await router.invalidate();
  };

  const copy = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <section className="wrap page-head">
        <h1>{m.trial_title({ product: name })}</h1>
        <p>{m.trial_intro()}</p>
      </section>
      <div className="wrap flow">
        <ol className="flow-steps" aria-label={m.trial_steps()}>
          <li className={stepClass(1)} aria-current={step === 1 ? 'step' : undefined}>
            <b>{m.trial_step_account()}</b>
            <small>{m.trial_step_account_hint()}</small>
          </li>
          <li className={stepClass(2)} aria-current={step === 2 ? 'step' : undefined}>
            <b>{m.trial_step_activate()}</b>
            <small>{m.trial_step_activate_hint()}</small>
          </li>
          <li className={stepClass(3)} aria-current={step === 3 ? 'step' : undefined}>
            <b>{m.trial_step_download()}</b>
            <small>{m.trial_step_download_hint()}</small>
          </li>
          <li className={stepClass(4)} aria-current={step === 4 ? 'step' : undefined}>
            <b>{m.trial_step_software()}</b>
            <small>{m.trial_step_software_hint()}</small>
          </li>
        </ol>

        <div>
          {step === 1 ? (
            <section className="flow-card is-now" aria-labelledby="essai-titre">
              <h2 id="essai-titre">{m.trial_signin_title()}</h2>
              <p>{m.trial_signin_text()}</p>
              <div className="cta-row">
                <Link
                  className="btn btn-deep btn-lg"
                  to="/connexion"
                  search={{ redirect: here, onglet: undefined } as never}
                >
                  {m.trial_signin()}
                </Link>
                <Link
                  className="btn btn-line btn-lg"
                  to="/connexion"
                  search={{ redirect: here, onglet: 'creer' } as never}
                >
                  {m.trial_create_account()}
                </Link>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="flow-card is-now" aria-labelledby="essai-titre">
              <h2 id="essai-titre">{m.trial_activate_title()}</h2>
              {status.used ? (
                <>
                  <p>{m.trial_used_text({ date: date.format(Date.parse(status.used.at)) })}</p>
                  <div className="cta-row">
                    <Link
                      className="btn btn-buy btn-lg"
                      to="/logiciels/$slug/$page"
                      params={{ slug, page: 'tarifs' }}
                      hash="acheter"
                    >
                      {m.trial_see_pricing()}
                    </Link>
                    <Link className="btn btn-line btn-lg" to="/espace/licences">
                      {m.trial_my_licences()}
                    </Link>
                  </div>
                </>
              ) : status.offer ? (
                <>
                  <p>
                    {m.trial_activate_text({
                      edition: pick(status.offer.editionName),
                      days: status.offer.days,
                    })}
                  </p>
                  <div className="dl">
                    <img src="/images/ksd-mark.png" alt="" width={48} height={39} />
                    <div>
                      <b>{m.trial_of({ product: name })}</b>
                      <small>{m.trial_signed_in_as({ email: viewer!.email })}</small>
                    </div>
                    <span className="state state-ok">{m.trial_available()}</span>
                  </div>
                  <div className="cta-row">
                    <button
                      className="btn btn-deep btn-lg"
                      type="button"
                      disabled={busy}
                      onClick={() => void activate()}
                    >
                      {m.trial_activate()}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p>{m.trial_unavailable_text()}</p>
                  <div className="cta-row">
                    <Link className="btn btn-buy btn-lg" to="/logiciels/$slug/$page" params={{ slug, page: 'tarifs' }}>
                      {m.trial_see_pricing()}
                    </Link>
                  </div>
                </>
              )}
              {error ? (
                <p className="form-error" role="alert" style={{ marginTop: 16 }}>
                  {error}
                </p>
              ) : null}
            </section>
          ) : null}

          {step === 3 && active ? (
            <section className="flow-card is-now" aria-labelledby="essai-titre">
              <h2 id="essai-titre">{m.trial_active_title()}</h2>
              <p>
                {active.expiresAt
                  ? m.trial_active_text({ date: date.format(Date.parse(active.expiresAt)) })
                  : m.trial_active_text_short()}
              </p>
              <div className="keybox">
                <code data-testid="trial-key">{active.key}</code>
                <button className="btn btn-line btn-sm" type="button" onClick={() => void copy(active.key!)}>
                  <Icon name={copied ? 'check' : 'copy'} />
                  {copied ? m.copied() : m.trial_copy()}
                </button>
              </div>
              <div className="dl">
                <img src="/images/ksd-mark.png" alt="" width={48} height={39} />
                <div>
                  <b>{name}</b>
                  <small>{m.trial_download_hint()}</small>
                </div>
                <Link className="btn btn-deep btn-sm" to="/logiciels/$slug/$page" params={{ slug, page: 'ressources' }}>
                  <Icon name="download" />
                  {m.trial_download()}
                </Link>
              </div>
              <div className="cta-row">
                <button className="btn btn-deep btn-lg" type="button" onClick={() => setInstalled(true)}>
                  {m.trial_installed()}
                </button>
              </div>
              <p className="muted" style={{ fontSize: 14 }}>
                {m.trial_key_mailed({ email: viewer!.email })}
              </p>
            </section>
          ) : null}

          {step === 4 && active ? (
            <section className="flow-card is-now" aria-labelledby="essai-titre">
              <h2 id="essai-titre">{m.trial_software_title({ product: name })}</h2>
              <p>{m.trial_software_text()}</p>
              <div className="inapp">
                <div>
                  <b>{m.trial_paste_key()}</b>
                  <p>{m.trial_paste_key_text()}</p>
                  <div className="mock-win" aria-hidden="true">
                    <input className="input" value={active.key ?? ''} readOnly tabIndex={-1} />
                    <span className="btn btn-deep btn-sm btn-block">{m.trial_activate_in_app()}</span>
                  </div>
                </div>
                <div>
                  <b>{m.trial_example_title()}</b>
                  <p>{m.trial_example_text()}</p>
                </div>
              </div>
              <div className="cta-row">
                <Link className="btn btn-deep btn-lg" to="/espace/licences">
                  {m.trial_my_licences()}
                </Link>
                <Link className="btn btn-line btn-lg" to="/logiciels/$slug/$page" params={{ slug, page: 'guide' }}>
                  {m.trial_tutorials()}
                </Link>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
