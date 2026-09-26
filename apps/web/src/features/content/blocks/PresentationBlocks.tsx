import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import type { LinkValue } from '@kya-em/domain';
import { m } from '@/paraglide/messages.js';
import { asList, Example, Icon, icon, Media, SmartLink, text, useMedia } from './shared';

// Blocs de la présentation d'un logiciel (spec 004), fidèles à design/v5/kya-soldesign/index.html.
type Data = Record<string, unknown>;
const link = (value: unknown) => value as LinkValue | undefined;

export function HeroBlock({ data, headingId }: { data: Data; headingId: string }) {
  const image = useMedia(data.image);
  return (
    <section className={data.flip ? 'hero is-flipped' : 'hero'} aria-labelledby={headingId}>
      <Media value={data.image} className="hero-img" eager alt="" sizes="100vw" />
      <div className="wrap hero-in">
        <h1 id={headingId}>{text(data.title)}</h1>
        <div className="hero-foot">
          <p>{text(data.text)}</p>
          <div className="hero-cta">
            <SmartLink link={link(data.primary)} className="btn btn-light btn-lg">
              {link(data.primary)?.label} <Icon name="go" className="i-go" />
            </SmartLink>
            <SmartLink link={link(data.secondary)} className="btn btn-ghost-light btn-lg" />
          </div>
        </div>
      </div>
      {image?.credit ? <span className="credit">{image.credit}</span> : null}
    </section>
  );
}

export function FactsBlock({ data }: { data: Data }) {
  return (
    <div className="facts">
      <div className="wrap facts-row">
        {asList<{ value: string; label: string; example?: boolean }>(data.items).map((item) => (
          <div className="fact" key={`${item.value}-${item.label}`}>
            <b className={/\d/u.test(item.value) ? 'num' : undefined}>
              {item.value} <Example show={item.example} />
            </b>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScreenshotBlock({ data, headingId }: { data: Data; headingId: string }) {
  return (
    <section className="section" aria-labelledby={headingId}>
      <div className="wrap">
        <div className="sec-head">
          <h2 id={headingId} className="h2">
            {text(data.title)}
          </h2>
          {data.intro ? <p>{text(data.intro)}</p> : null}
        </div>
        <figure className="shot">
          <div className="shot-bar">
            <i />
            <i />
            <i />
            {data.windowTitle ? <span>{text(data.windowTitle)}</span> : null}
          </div>
          <Media value={data.image} sizes="(max-width: 1200px) 100vw, 1200px" />
          {data.caption ? (
            <figcaption>
              <span>{text(data.caption)}</span>
              {data.captionRight ? <span>{text(data.captionRight)}</span> : null}
            </figcaption>
          ) : null}
        </figure>
      </div>
    </section>
  );
}

export function TwoColumnsBlock({ data, headingId }: { data: Data; headingId: string }) {
  const scale = asList<string>(data.scale);
  return (
    <section className="section soft" aria-labelledby={headingId}>
      <div className="wrap">
        <div className="sec-head">
          <h2 id={headingId} className="h2">
            {text(data.title)}
          </h2>
          {data.intro ? <p>{text(data.intro)}</p> : null}
        </div>
        <div className="err">
          {asList<{ title: string; text: string; points: string[] }>(data.columns).map((column) => (
            <div key={column.title}>
              <h3>{column.title}</h3>
              <p>{column.text}</p>
              <ul>
                {column.points.map((point) => (
                  <li key={point}>
                    <Icon name="x" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {scale.length ? (
          <div className="err-meter" aria-hidden="true">
            {scale.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

interface Step {
  title: string;
  lead: string;
  points: string[];
  tag?: string;
  image: string;
}

/** Accordéon : ouvrir une étape change la capture à côté. */
export function StepsBlock({ data, headingId }: { data: Data; headingId: string }) {
  const steps = asList<Step>(data.items);
  const [active, setActive] = useState(0);
  const current = useMedia(steps[active]?.image);
  const group = `etapes-${headingId}`;
  return (
    <section className="section" aria-labelledby={headingId}>
      <div className="wrap steps-grid">
        <div>
          <h2 id={headingId} className="h2" style={{ marginBottom: 36 }}>
            {text(data.title)}
          </h2>
          <div className="acc">
            {steps.map((step, index) => (
              <details
                key={step.title}
                name={group}
                open={index === 0}
                onToggle={(event: SyntheticEvent<HTMLDetailsElement>) => {
                  if (event.currentTarget.open) setActive(index);
                }}
              >
                <summary>
                  <span className="n">{String(index + 1).padStart(2, '0')}</span>
                  <span>{step.title}</span>
                  <Icon name="plus" className="plus" />
                </summary>
                <div className="acc-body">
                  <p>{step.lead}</p>
                  <ul>
                    {step.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                  {step.tag ? <p className="tag">{step.tag}</p> : null}
                </div>
              </details>
            ))}
          </div>
        </div>
        <figure className="steps-fig">
          <div className="shot">
            <div className="shot-bar">
              <i />
              <i />
              <i />
              <span>{current?.alt}</span>
            </div>
            <Media value={steps[active]?.image} />
          </div>
        </figure>
      </div>
    </section>
  );
}

interface Deliverable {
  who: string;
  icon: string;
  title: string;
  text: string;
  points: string[];
  image?: string;
  quoteTitle?: string;
  quoteRef?: string;
  quoteDate?: string;
  quoteRows?: { label: string; amount: string }[];
  quoteTotalLabel?: string;
  quoteTotal?: string;
}

export function DeliverablesBlock({ data, headingId }: { data: Data; headingId: string }) {
  return (
    <section className="section soft" aria-labelledby={headingId}>
      <div className="wrap">
        <div className="sec-head">
          <h2 id={headingId} className="h2">
            {text(data.title)}
          </h2>
          {data.intro ? <p>{text(data.intro)}</p> : null}
        </div>
        <div className="deliver">
          {asList<Deliverable>(data.items).map((item) => (
            <article key={item.title}>
              <span className="who">
                <Icon name={icon(item.icon, 'file')} />
                {item.who}
              </span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <ul>
                {item.points.map((point) => (
                  <li key={point}>
                    <Icon name="check" />
                    {point}
                  </li>
                ))}
              </ul>
              {item.quoteRows?.length ? (
                <div className="pic devis">
                  <div className="devis-doc" aria-label={item.quoteTitle}>
                    <header>
                      <div>
                        <b>{item.quoteTitle}</b>
                        <br />
                        <small className="muted">{item.quoteRef}</small>
                      </div>
                      <small className="num muted">{item.quoteDate}</small>
                    </header>
                    <table>
                      <tbody>
                        {item.quoteRows.map((row) => (
                          <tr key={row.label}>
                            <td>{row.label}</td>
                            <td>{row.amount}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>{item.quoteTotalLabel}</td>
                          <td>{item.quoteTotal}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : item.image ? (
                <div className="pic">
                  <Media value={item.image} />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AudiencesBlock({ data, headingId }: { data: Data; headingId: string }) {
  return (
    <section className="section" aria-labelledby={headingId}>
      <div className="wrap">
        <h2 id={headingId} className="h2" style={{ marginBottom: 40 }}>
          {text(data.title)}
        </h2>
        <ul className="who-list">
          {asList<{ title: string; text: string; edition: string; link: LinkValue }>(data.items).map((item) => (
            <li key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <div className="ed">
                <b>{item.edition}</b>
                <SmartLink link={item.link} className="link-arrow">
                  {item.link.label} <Icon name="right" className="i-sm" />
                </SmartLink>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

interface Quote {
  text: string;
  author: string;
  initials: string;
  example?: boolean;
}

export function ProofBlock({ data, headingId }: { data: Data; headingId: string }) {
  const image = useMedia(data.image);
  const quotes = asList<Quote>(data.quotes);
  const [current, setCurrent] = useState(0);
  return (
    <section className="section soft" aria-labelledby={headingId}>
      <div className="wrap proof">
        <figure className="proof-fig">
          <Media value={data.image} />
          {image?.credit ? <figcaption>{image.credit}</figcaption> : null}
        </figure>
        <div>
          <h2 id={headingId} className="h2" style={{ marginBottom: 32 }}>
            {text(data.title)}
          </h2>
          <div className="big-nums">
            {asList<{ value: string; label: string; example?: boolean }>(data.numbers).map((item) => (
              <div key={`${item.value}-${item.label}`}>
                <b className={/\d/u.test(item.value) ? 'num' : undefined}>{item.value}</b>
                <span>
                  {item.label} <Example show={item.example} />
                </span>
              </div>
            ))}
          </div>
          {quotes.length ? (
            <div className="quote">
              {quotes.map((quote, index) => (
                <figure key={quote.author} hidden={index !== current}>
                  <blockquote>{quote.text}</blockquote>
                  <figcaption>
                    <span className="avatar">{quote.initials}</span>
                    {quote.author} <Example show={quote.example} />
                  </figcaption>
                </figure>
              ))}
              {quotes.length > 1 ? (
                <div className="quote-nav">
                  {quotes.map((quote, index) => (
                    <button
                      key={quote.author}
                      type="button"
                      aria-label={m.block_quote_n({ n: index + 1 })}
                      aria-current={index === current}
                      onClick={() => setCurrent(index)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function ClosingBlock({ data, headingId }: { data: Data; headingId: string }) {
  const lines = text(data.title).split('\n');
  return (
    <section className="close" aria-labelledby={headingId}>
      <div className="wrap">
        <h2 id={headingId} className="giant">
          {lines.map((line, index) => (
            <span key={line}>
              {line}
              {index < lines.length - 1 ? <br /> : null}
            </span>
          ))}
        </h2>
        <div className="close-foot">
          {data.quote ? (
            <p>
              {text(data.quote)} {data.source ? <span className="muted">— {text(data.source)}</span> : null}
            </p>
          ) : (
            <span />
          )}
          <div className="cta-row">
            <SmartLink link={link(data.primary)} className="btn btn-primary btn-lg">
              {link(data.primary)?.label} <Icon name="go" className="i-go" />
            </SmartLink>
            <SmartLink link={link(data.buy)} className="btn btn-buy btn-lg" />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Jauge en demi-cercle (valeur de 0 à 1), animée à l'arrivée dans l'écran. */
export function Gauge({ value, kind, mini }: { value: number; kind?: string; mini?: boolean }) {
  const ARC = 157.08;
  const ref = useRef<SVGSVGElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setShown(true);
        observer.disconnect();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <svg ref={ref} className={mini ? 'gauge gauge-mini' : 'gauge'} viewBox="0 0 132 76" aria-hidden="true">
      <path className="track" d="M16 66a50 50 0 0 1 100 0" />
      <path
        className={kind === 'eco' ? 'val eco' : 'val'}
        d="M16 66a50 50 0 0 1 100 0"
        strokeDasharray={ARC}
        strokeDashoffset={shown ? ARC * (1 - Math.min(value, 1)) : ARC}
      />
    </svg>
  );
}
