import type { CatalogEdition, CatalogProduct, LinkValue } from '@kya-em/domain';
import { createContext, useContext, useId, useMemo, useState } from 'react';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { asList, Example, Icon, Markdown, SmartLink, text } from './shared';

// Tarifs et comparatif (spec 004) : blocs liés, qui lisent l'offre du logiciel dans le catalogue.
type Data = Record<string, unknown>;
type Locale = 'fr' | 'en';

/** Offre du logiciel de la page, et édition demandée par l'adresse (`?edition=`). */
export const CatalogContext = createContext<{
  product: CatalogProduct | null;
  edition?: string;
  /** Édition choisie dans le bloc Tarifs, mise en avant dans le Comparatif. */
  selected?: string;
  select?: (code: string) => void;
}>({ product: null });

const pickText = (value: { fr: string; en?: string } | null | undefined, locale: Locale) =>
  value ? (locale === 'en' ? value.en || value.fr : value.fr) : '';

const fcfa = (value: number) => new Intl.NumberFormat(getLocale()).format(value);

/** Ce que comprend une édition : fonctions du catalogue, projets, filigrane, mises à jour. */
function included(product: CatalogProduct, edition: CatalogEdition, locale: Locale) {
  const items = product.features.map((feature) => ({
    label: pickText(feature.label, locale),
    yes: edition.features.includes(feature.key),
  }));
  items.push({
    label:
      edition.maxProjects === null
        ? m.block_projects_unlimited()
        : m.block_projects_up_to({ count: edition.maxProjects }),
    yes: true,
  });
  if (edition.watermark)
    items.push({ label: m.block_watermark({ text: pickText(edition.watermark, locale) }), yes: true });
  // Caractéristiques affichées de l'édition (spec 005b) : texte libre, sans effet dans le logiciel.
  for (const highlight of edition.highlights) items.push({ label: pickText(highlight, locale), yes: true });
  items.push({ label: m.block_updates_included(), yes: true });
  return [...items.filter((item) => item.yes), ...items.filter((item) => !item.yes)];
}

export function PricingBlock({ data }: { data: Data }) {
  const { product, edition: requested, select } = useContext(CatalogContext);
  const locale = getLocale() as Locale;
  const editions = (product?.editions ?? []).filter((edition) => edition.types.length > 0);
  const initial = editions.find((edition) => edition.code === requested) ?? editions[0];
  const [code, setCode] = useState(initial?.code ?? '');
  const edition = editions.find((item) => item.code === code) ?? initial;
  const defaultType = (item: CatalogEdition | undefined) => item?.types.at(-1)?.id ?? '';
  const [typeId, setTypeId] = useState(defaultType(initial));
  const [seats, setSeats] = useState(1);
  const name = useId();
  if (!product || !edition) return null;

  const plan = edition.types.find((item) => item.id === typeId) ?? edition.types.at(-1)!;
  const maxSeats = plan.seatsMax ?? edition.maxSeats ?? 999;
  const minSeats = Math.min(plan.seatsMin, maxSeats);
  const count = Math.min(Math.max(seats, minSeats), maxSeats);
  const total = plan.pricePerSeat * count;
  const anyIndicative = edition.types.some((item) => item.indicative);
  const buy = data.buy as LinkValue;
  // Visible mais pas en vente : l'offre se montre, l'achat en ligne attend (spec 005b).
  const buyable = edition.forSale && plan.forSale;
  const buyLink: LinkValue = {
    label: buy.label,
    href: `${buy.href}${buy.href.includes('?') ? '&' : '?'}logiciel=${product.slug}&edition=${edition.code}&offre=${plan.id}&postes=${count}`,
  };

  const chooseEdition = (next: string) => {
    const nextEdition = editions.find((item) => item.code === next);
    setCode(next);
    select?.(next);
    setTypeId(defaultType(nextEdition));
    setSeats((value) => Math.min(value, nextEdition?.maxSeats ?? 999));
  };

  return (
    <section className="wrap" id="acheter" style={{ paddingBottom: 96 }}>
      <div className="buy">
        <div>
          <fieldset className="cfg">
            <legend className="step-title">
              <span>1</span>
              {m.block_pricing_edition()}
            </legend>
            <div className={`choice cols-${Math.min(editions.length, 3)}`}>
              {editions.map((item) => (
                <label className="opt" key={item.code}>
                  <input
                    type="radio"
                    name={`${name}-edition`}
                    value={item.code}
                    checked={item.code === edition.code}
                    onChange={() => chooseEdition(item.code)}
                  />
                  <b>{pickText(item.name, locale)}</b>
                  <small>{pickText(item.audience, locale)}</small>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="cfg">
            <legend className="step-title">
              <span>2</span>
              {m.block_pricing_duration()}
            </legend>
            <div className={`choice cols-${Math.min(edition.types.length, 3)}`}>
              {edition.types.map((item) => (
                <label className="opt" key={item.id}>
                  {item.id === defaultType(edition) && edition.types.length > 1 ? (
                    <span className="badge-top">{m.block_pricing_preselected()}</span>
                  ) : null}
                  <input
                    type="radio"
                    name={`${name}-plan`}
                    value={item.id}
                    checked={item.id === plan.id}
                    onChange={() => setTypeId(item.id)}
                  />
                  <b>{pickText(item.name, locale)}</b>
                  <span className="price">
                    <span className="num">{fcfa(item.pricePerSeat)}</span> FCFA <Example show={item.indicative} />
                  </span>
                  <small>{m.block_pricing_per_seat()}</small>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="cfg">
            <p className="step-title" id={`${name}-seats`}>
              <span>3</span>
              {m.block_pricing_seats()}
            </p>
            <div className="seats-row">
              <div className="stepper">
                <button
                  type="button"
                  aria-label={m.block_pricing_less()}
                  disabled={count <= minSeats}
                  onClick={() => setSeats(count - 1)}
                >
                  <svg className="kya-icon" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M3 8h10" />
                  </svg>
                </button>
                <input
                  type="number"
                  min={minSeats}
                  max={maxSeats}
                  value={count}
                  aria-labelledby={`${name}-seats`}
                  onChange={(event) => setSeats(Number(event.currentTarget.value) || 1)}
                />
                <button
                  type="button"
                  aria-label={m.block_pricing_more()}
                  disabled={count >= maxSeats}
                  onClick={() => setSeats(count + 1)}
                >
                  <Icon name="plus" />
                </button>
              </div>
              <p>{maxSeats === 1 ? m.block_pricing_single_seat() : m.block_pricing_seat_note()}</p>
            </div>
          </div>
          {data.callout ? (
            <div className="callout">
              <Icon name="lock" />
              <Markdown value={data.callout} as="span" />
            </div>
          ) : null}
        </div>
        <aside className="summary" aria-label={m.block_pricing_summary()}>
          <h3>{m.block_pricing_your_licence()}</h3>
          <dl>
            <dt>{m.block_pricing_software()}</dt>
            <dd>
              {product.name} · {pickText(edition.name, locale)}
            </dd>
            <dt>{m.block_pricing_duration()}</dt>
            <dd>{pickText(plan.name, locale)}</dd>
            <dt>{m.block_pricing_seats_short()}</dt>
            <dd>{count === 1 ? m.block_pricing_seat_one() : m.block_pricing_seat_many({ count })}</dd>
            <dt>{m.block_pricing_unit()}</dt>
            <dd>
              <span className="num">{fcfa(plan.pricePerSeat)}</span> FCFA
            </dd>
          </dl>
          <div className="total">
            <span>
              {m.block_pricing_total()} <small>{m.block_pricing_excl_tax()}</small>
            </span>
            <b>
              <span className="num" data-testid="pricing-total">
                {fcfa(total)}
              </span>{' '}
              <small>FCFA</small>
            </b>
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            {text(data.taxNote)} {anyIndicative ? <Example show /> : null}
          </p>
          {buyable ? (
            <SmartLink link={buyLink} className="btn btn-buy btn-lg btn-block" />
          ) : (
            <p className="callout" role="note">
              {m.block_pricing_not_for_sale()}
            </p>
          )}
          <p className="alt">
            {m.block_pricing_not_sure()} <SmartLink link={data.trial as LinkValue} className="link" />
          </p>
          <ul className="inc">
            {included(product, edition, locale).map((item) => (
              <li key={item.label} className={item.yes ? undefined : 'no'}>
                <Icon name={item.yes ? 'check' : 'x'} />
                {item.label}
              </li>
            ))}
          </ul>
          <div className="pay-logos">
            {asList<string>(data.payments).map((payment) => (
              <span key={payment}>{payment}</span>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

export function ComparisonBlock({ data, headingId }: { data: Data; headingId: string }) {
  const { product, selected, edition: requested } = useContext(CatalogContext);
  const locale = getLocale() as Locale;
  const editions = product?.editions ?? [];
  const highlighted = selected ?? requested ?? editions[0]?.code;
  const hl = (index: number) => (editions[index]?.code === highlighted ? 'hl' : undefined);
  const rows = useMemo(() => {
    if (!product) return [];
    const editions = product.editions;
    type Cell = { yes?: boolean; text?: string; num?: boolean };
    const yesNo = (yes: boolean): Cell => ({ yes });
    const rows: { label: string; cells: Cell[] }[] = [
      ...product.features.map((feature) => ({
        label: pickText(feature.label, locale),
        cells: editions.map((edition) => yesNo(edition.features.includes(feature.key))),
      })),
      {
        label: m.block_cmp_projects(),
        cells: editions.map((edition) => ({
          text: edition.maxProjects === null ? m.block_cmp_unlimited() : String(edition.maxProjects),
          num: edition.maxProjects !== null,
        })),
      },
      {
        label: m.block_cmp_watermark(),
        cells: editions.map((edition) => ({
          text: edition.watermark ? `« ${pickText(edition.watermark, locale)} »` : m.block_cmp_none(),
        })),
      },
      {
        label: m.block_cmp_seats(),
        cells: editions.map((edition) => ({
          text: edition.maxSeats === 1 ? '1' : m.block_cmp_one_or_more(),
          num: edition.maxSeats === 1,
        })),
      },
      {
        label: m.block_cmp_grace(),
        cells: editions.map((edition) => ({
          text:
            edition.graceDays === 1
              ? m.block_cmp_day_one()
              : edition.graceDays
                ? m.block_cmp_days({ count: edition.graceDays })
                : m.block_cmp_none(),
          num: edition.graceDays > 0,
        })),
      },
      { label: m.block_cmp_updates(), cells: editions.map(() => ({ text: m.block_cmp_included() })) },
    ];
    return rows;
  }, [product, locale]);
  if (!product) return null;

  return (
    <section className="section soft" aria-labelledby={headingId}>
      <div className="wrap">
        <div className="sec-head">
          <h2 id={headingId} className="h2">
            {text(data.title)}
          </h2>
          {data.intro ? <p>{text(data.intro)}</p> : null}
        </div>
        {/* Défilement horizontal sur mobile : zone atteignable au clavier. */}
        <div className="tbl-wrap" tabIndex={0} role="region" aria-label={text(data.title)}>
          <table className="cmp-table">
            <thead>
              <tr>
                <td />
                {editions.map((edition) => (
                  <th scope="col" key={edition.code} className={edition.code === highlighted ? 'hl' : undefined}>
                    {pickText(edition.name, locale)}
                    <small>{edition.types.map((type) => pickText(type.name, locale)).join(' · ')}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {row.cells.map((cell, index) =>
                    cell.yes !== undefined ? (
                      <td key={index} className={[cell.yes ? 'yes' : 'no', hl(index)].filter(Boolean).join(' ')}>
                        {cell.yes ? <Icon name="check" /> : '—'}
                        <span className="sr">{cell.yes ? m.yes() : m.no()}</span>
                      </td>
                    ) : (
                      <td
                        key={index}
                        className={[cell.num ? 'num' : '', hl(index)].filter(Boolean).join(' ') || undefined}
                      >
                        {cell.text}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.note ? (
          <p className="muted" style={{ marginTop: 14, fontSize: 13.5 }}>
            {text(data.note)}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function NoteBandBlock({ data }: { data: Data }) {
  return (
    <section className="section">
      <div className="wrap note-band">
        {asList<{ title: string; text: string; link: LinkValue }>(data.items).map((item) => (
          <div key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
            <SmartLink link={item.link} className="link-arrow">
              {item.link.label} <Icon name="right" className="i-sm" />
            </SmartLink>
          </div>
        ))}
      </div>
    </section>
  );
}
