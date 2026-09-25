import { ExampleTag, Icon } from '@kya-em/ui';
import { Link } from '@tanstack/react-router';
import { m } from '@/paraglide/messages.js';
import { SOFTWARE } from './software';

/** Accueil de la marketplace, fidèle à design/v5/index.html. Contenu statique jusqu'à la spécification 004. */
export function HomePage() {
  const upcoming = SOFTWARE.filter((software) => !software.available);
  return (
    <>
      <section className="hero" aria-labelledby="t-hero">
        <img className="hero-img" src="/images/terrain.jpg" alt="" width="1400" height="933" fetchPriority="high" />
        <div className="wrap hero-in">
          <h1 id="t-hero">{m.hero_title()}</h1>
          <div className="hero-foot">
            <p>{m.hero_text()}</p>
            <div className="hero-cta">
              <Link className="btn btn-light btn-lg" to="/" hash="logiciels">
                {m.hero_cta_primary()} <Icon name="go" />
              </Link>
              <Link className="btn btn-ghost-light btn-lg" to="/" hash="logiciels">
                {m.hero_cta_secondary()}
              </Link>
            </div>
          </div>
        </div>
        <span className="credit">{m.photo_illustration()}</span>
      </section>

      <section className="section" id="logiciels" aria-labelledby="t-soft">
        <div className="wrap">
          <div className="soft-feature">
            <div>
              <span className="state state-ok">{m.state_available()}</span>
              <h2 id="t-soft">{m.ksd_title()}</h2>
              <p>{m.ksd_text()}</p>
              <div className="cta-row">
                <Link className="btn btn-primary" to="/connexion">
                  {m.ksd_try()} <Icon name="go" />
                </Link>
              </div>
            </div>
            <figure className="shot">
              <div className="shot-bar" aria-hidden="true">
                <i />
                <i />
                <i />
                <span>{m.ksd_capture_label()}</span>
              </div>
              <img src="/images/chiffrage.webp" alt={m.ksd_capture_alt()} width="1600" height="1000" loading="lazy" />
            </figure>
          </div>

          <h3 className="h3 soon-title">{m.soon_title()}</h3>
          <div className="soft-list">
            {upcoming.map((software) => (
              <article key={software.id} className="soft-item" id={software.id}>
                <span className="logo" aria-hidden="true">
                  {software.mono ?? ''}
                </span>
                <div>
                  <h3>{software.name}</h3>
                  <p className="kind">{software.kind()}</p>
                </div>
                <p>{m.soon_text()}</p>
                <div className="act">
                  <span className="state state-soon">{m.state_soon()}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section soft" id="comment" aria-labelledby="t-how">
        <div className="wrap">
          <div className="sec-head">
            <h2 id="t-how" className="h2">
              {m.how_title()}
            </h2>
            <p>{m.how_intro()}</p>
          </div>
          <div className="how">
            {[
              ['01', m.how_try_title(), m.how_try_text()],
              ['02', m.how_buy_title(), m.how_buy_text()],
              ['03', m.how_manage_title(), m.how_manage_text()],
            ].map(([step, title, text]) => (
              <div key={step}>
                <span className="n">{step}</span>
                <h3>{title}</h3>
                <p>{text}</p>
                <span className="link-arrow">{m.how_soon()}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section brand" aria-labelledby="t-kya">
        <div className="wrap split">
          <div>
            <h2 id="t-kya" className="h2">
              {m.kya_title()}
            </h2>
            <p>{m.kya_text()}</p>
          </div>
          <div className="big-nums">
            <div>
              <b className="num">500+</b>
              <span>{m.kya_installations()}</span>
            </div>
            <div>
              <b>ISO</b>
              <span>{m.kya_iso()}</span>
            </div>
            <div>
              <b className="num">2020</b>
              <span>{m.kya_since()}</span>
            </div>
            <div>
              <b className="num">4</b>
              <span>{m.kya_software()}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="questions" aria-labelledby="t-faq">
        <div className="wrap">
          <div className="sec-head">
            <h2 id="t-faq" className="h2">
              {m.faq_title()}
            </h2>
            <p>{m.faq_intro()}</p>
          </div>
          <div className="faq">
            {[
              [m.faq_account_q(), m.faq_account_a()],
              [m.faq_pay_q(), m.faq_pay_a()],
              [m.faq_invoice_q(), m.faq_invoice_a()],
              [m.faq_seats_q(), m.faq_seats_a()],
            ].map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <Icon name="plus" />
                </summary>
                <div className="ans">
                  <p>{answer}</p>
                </div>
              </details>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 28, fontSize: 13 }}>
            <ExampleTag label={m.example()} /> {m.foot_mockup_note()}
          </p>
        </div>
      </section>
    </>
  );
}
