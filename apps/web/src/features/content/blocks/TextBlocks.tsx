import type { LinkValue, RenderedMarkdown } from '@kya-em/domain';
import { useContext } from 'react';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { asList, Example, Icon, icon, Markdown, Media, SearchContext, SmartLink, text } from './shared';

// Blocs de texte (spec 004) : en-tête de page, questions, Markdown, ressources, versions, support.
type Data = Record<string, unknown>;

export function PageHeaderBlock({ data, headingId, first }: { data: Data; headingId: string; first: boolean }) {
  const { query, setQuery } = useContext(SearchContext);
  const Heading = first ? 'h1' : 'h2';
  return (
    <header className="wrap page-head">
      <Heading id={headingId}>{text(data.title)}</Heading>
      {data.intro ? <p>{text(data.intro)}</p> : null}
      {data.searchPlaceholder ? (
        <div className="search" style={{ marginTop: 32, maxWidth: 760 }} role="search">
          <Icon name="search" />
          <input
            className="input"
            type="search"
            value={query}
            placeholder={text(data.searchPlaceholder)}
            aria-label={text(data.searchPlaceholder)}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </div>
      ) : null}
      {asList<{ link: LinkValue }>(data.shortcuts).length ? (
        <div className="suggest">
          {asList<{ link: LinkValue }>(data.shortcuts).map((item) => (
            <SmartLink key={item.link.href} link={item.link} />
          ))}
        </div>
      ) : null}
    </header>
  );
}

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/gu, '').toLowerCase();

export function FaqBlock({ data, headingId, anchor }: { data: Data; headingId: string; anchor: string }) {
  const { query } = useContext(SearchContext);
  const items = asList<{ question: string; answer: RenderedMarkdown }>(data.items);
  const needle = normalize(query.trim());
  const visible = needle
    ? items.filter((item) =>
        normalize(`${item.question} ${item.answer.html.replace(/<[^>]+>/gu, ' ')}`).includes(needle),
      )
    : items;
  if (needle && visible.length === 0) return null;
  return (
    <section className="section soft" id={anchor} aria-labelledby={headingId}>
      <div className="wrap">
        <h2 id={headingId} className="h2" style={{ marginBottom: 28 }}>
          {text(data.title)}
        </h2>
        <div className="faq">
          {visible.map((item) => (
            <details key={item.question} open={needle.length > 0 || undefined}>
              <summary>
                {item.question}
                <Icon name="plus" className="plus" />
              </summary>
              <Markdown value={item.answer} className="ans" />
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function MarkdownBlock({ data }: { data: Data }) {
  const body = data.body as RenderedMarkdown | undefined;
  if (!body) return null;
  const toc = data.toc ? body.toc.filter((entry) => entry.level === 2) : [];
  return (
    <div className={toc.length ? 'wrap doc-layout' : 'wrap'} style={toc.length ? undefined : { paddingBottom: 96 }}>
      {toc.length ? (
        <nav className="doc-toc" aria-label={m.block_toc()}>
          <b>{m.block_toc()}</b>
          {toc.map((entry) => (
            <a key={entry.id} href={`#${entry.id}`}>
              {entry.text}
            </a>
          ))}
        </nav>
      ) : null}
      <article className="prose" dangerouslySetInnerHTML={{ __html: body.html }} />
    </div>
  );
}

export function ResourcesBlock({ data }: { data: Data }) {
  return (
    <section className="wrap" style={{ paddingBottom: 96 }}>
      <div className="res-grid">
        {asList<{
          kind: string;
          title: string;
          text: string;
          image?: string;
          link: LinkValue;
          duration?: string;
          example?: boolean;
        }>(data.items).map((item) => (
          <SmartLink key={item.title} link={item.link} className="res">
            <div className="pic">
              {item.image ? (
                <Media value={item.image} alt="" />
              ) : (
                <span className="pic-fill" aria-hidden="true">
                  {item.kind}
                </span>
              )}
              {item.duration ? (
                <>
                  <span className="play">
                    <Icon name="play" />
                  </span>
                  <span className="dur">{item.duration}</span>
                </>
              ) : null}
            </div>
            <div className="body">
              <span className="kind">{item.kind}</span>
              <h3>{item.title}</h3>
              <p>
                {item.text} <Example show={item.example} />
              </p>
            </div>
          </SmartLink>
        ))}
      </div>
    </section>
  );
}

export function ReleasesBlock({ data, headingId }: { data: Data; headingId: string }) {
  const date = new Intl.DateTimeFormat(getLocale(), { dateStyle: 'long' });
  return (
    <section className="section soft" id="nouveautes" aria-labelledby={headingId}>
      <div className="wrap">
        <div className="sec-head">
          <h2 id={headingId} className="h2">
            {text(data.title)}
          </h2>
          {data.intro ? <p>{text(data.intro)}</p> : null}
        </div>
        <ol className="versions">
          {asList<{ version: string; date: string; title: string; text: string; download?: LinkValue }>(data.items).map(
            (item) => (
              <li key={item.version}>
                <div>
                  <span className="v">{item.version}</span>
                  {/^\d{4}-\d{2}-\d{2}$/u.test(item.date) ? (
                    <time dateTime={item.date}>{date.format(new Date(`${item.date}T12:00:00Z`))}</time>
                  ) : null}
                </div>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
                {item.download ? (
                  <SmartLink link={item.download} className="btn btn-line btn-sm">
                    <Icon name="download" />
                    {item.download.label}
                  </SmartLink>
                ) : null}
              </li>
            ),
          )}
        </ol>
      </div>
    </section>
  );
}

export function StartGuideBlock({ data, headingId }: { data: Data; headingId: string }) {
  const requirements = asList<{ label: string; value: string }>(data.requirements);
  return (
    <section className="wrap grid-2" id="demarrer" style={{ paddingBottom: 96, alignItems: 'start' }}>
      <div className="panel">
        <h2 id={headingId} className="h3">
          {text(data.title)}
        </h2>
        <ol className="guide-steps">
          {asList<{ title: string; text: string }>(data.steps).map((step) => (
            <li key={step.title}>
              <div>
                <b>{step.title}</b>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        {data.action ? (
          <SmartLink link={data.action as LinkValue} className="btn btn-primary">
            <Icon name="download" />
            {(data.action as LinkValue).label}
          </SmartLink>
        ) : null}
      </div>
      {requirements.length ? (
        <div className="panel soft">
          <h2 className="h3" style={{ marginBottom: 16 }}>
            {text(data.requirementsTitle)}
          </h2>
          <dl className="sysreq">
            {requirements.map((item) => (
              <div key={item.label} style={{ display: 'contents' }}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </section>
  );
}

export function ContactWaysBlock({ data, headingId }: { data: Data; headingId: string }) {
  return (
    <section className="section" id="contacter" aria-labelledby={headingId}>
      <div className="wrap">
        <div className="sec-head">
          <h2 id={headingId} className="h2">
            {text(data.title)}
          </h2>
          {data.intro ? <p>{text(data.intro)}</p> : null}
        </div>
        <div className="contact-ways">
          {asList<{ icon: string; title: string; text: string; example?: boolean; link: LinkValue }>(data.items).map(
            (item) => (
              <div className="way" key={item.title}>
                <span className="ic">
                  <Icon name={icon(item.icon, 'mail')} />
                </span>
                <b>{item.title}</b>
                <small>
                  {item.text} <Example show={item.example} />
                </small>
                <SmartLink link={item.link} className="btn btn-line" />
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
