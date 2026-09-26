import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { m } from '@/paraglide/messages.js';
import { searchHoldersFn, type getOfferFn } from '../licenses/licenses';
import {
  ConsolePage,
  copyText,
  errorText,
  fcfa,
  formatDays,
  loc,
  natureLabel,
  newIdempotencyKey,
  Toast,
  useNotice,
} from '../console/ui';
import { generateBatchFn } from './batches';

type Offer = NonNullable<Awaited<ReturnType<typeof getOfferFn>>>;
type Holder = Awaited<ReturnType<typeof searchHoldersFn>>[number];
type Mode = 'emails' | 'organization' | 'keys';
type Keys = { licenseId: string; key: string; recipient: string }[];

const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/iu;
const MAX = 500;

/** Découpe une liste collée : courriels valides (sans doublon), invalides, doublons ignorés. */
export function parseEmails(text: string) {
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  let duplicates = 0;
  for (const raw of text.split(/[\s,;]+/u)) {
    const value = raw.trim().replace(/^<|>$/gu, '');
    if (!value) continue;
    if (!EMAIL.test(value)) invalid.push(value);
    else if (seen.has(value.toLowerCase())) duplicates += 1;
    else {
      seen.add(value.toLowerCase());
      valid.push(value.toLowerCase());
    }
  }
  return { valid, invalid, duplicates };
}

/** Générer des licences : Offre → Destinataires → Vérifier → Clés (spec 005b, histoire 3). */
export function BatchWizardPage({ offer, initialType }: { offer: Offer; initialType?: string }) {
  const navigate = useNavigate();
  const { notice, show } = useNotice();
  const types = useMemo(() => offer.flatMap((edition) => edition.types.map((type) => ({ ...type, edition }))), [offer]);
  const [step, setStep] = useState(1);
  const [typeId, setTypeId] = useState(initialType ?? types[0]?.id ?? '');
  const [mode, setMode] = useState<Mode>('emails');
  const [emails, setEmails] = useState('');
  const [count, setCount] = useState(10);
  const [seats, setSeats] = useState(1);
  const [label, setLabel] = useState('');
  const [reason, setReason] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [startsOnActivation, setStartsOnActivation] = useState(true);
  const [holderQuery, setHolderQuery] = useState('');
  const [holders, setHolders] = useState<Holder[]>([]);
  const [holder, setHolder] = useState<Holder | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ batchId: string; keys: Keys; replayed: boolean } | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const type = types.find((item) => item.id === typeId);
  const parsed = useMemo(() => parseEmails(emails), [emails]);
  const total = mode === 'emails' ? parsed.valid.length : count;

  // Postes bornés par le type choisi (sans effet : calculé à chaque rendu).
  const seatCount = type ? Math.min(Math.max(seats, type.seatsMin), type.seatsMax ?? Number.MAX_SAFE_INTEGER) : seats;

  useEffect(() => {
    if (mode !== 'organization' || holder || holderQuery.trim().length < 2) return;
    const timer = setTimeout(() => void searchHoldersFn({ data: { query: holderQuery } }).then(setHolders), 250);
    return () => clearTimeout(timer);
  }, [holderQuery, mode, holder]);

  const recipientsReady =
    total > 0 &&
    total <= MAX &&
    label.trim().length >= 3 &&
    reason.trim().length >= 3 &&
    (mode !== 'organization' || Boolean(holder));

  const generate = async () => {
    if (!type) return;
    setBusy(true);
    const response = await generateBatchFn({
      data: {
        licenseTypeId: type.id,
        mode,
        emails: mode === 'emails' ? parsed.valid : undefined,
        organizationId: mode === 'organization' ? holder?.organizationId : undefined,
        count: mode === 'emails' ? undefined : count,
        seats: seatCount,
        label: label.trim(),
        reason: reason.trim(),
        customerName: customerName.trim() || undefined,
        startsOnActivation,
        idempotencyKey,
      },
    });
    setBusy(false);
    if (!response.ok) return show(errorText(response.code, response.issues), true);
    setResult(response.value);
    setStep(4);
    show(m.cx_batch_generated({ count: response.value.keys.length }));
  };

  const restart = () => {
    setResult(null);
    setStep(1);
    setEmails('');
    setLabel('');
    setReason('');
    setIdempotencyKey(newIdempotencyKey());
  };

  const steps = [m.cx_step_offer(), m.cx_step_recipients(), m.cx_step_check(), m.cx_step_keys()];

  return (
    <ConsolePage
      crumbs={[
        { label: m.cx_nav_sales(), to: '/admin/licences' },
        { label: m.cx_nav_batches(), to: '/admin/lots' },
        { label: m.cx_generate() },
      ]}
    >
      <div className="cx-head">
        <div>
          <h1>{m.cx_generate()}</h1>
          <p>{m.cx_wizard_intro()}</p>
        </div>
        <ol className="cx-steps" aria-label={m.cx_steps()}>
          {steps.map((label, index) => (
            <li
              key={label}
              aria-current={step === index + 1 ? 'step' : undefined}
              className={step > index + 1 ? 'done' : undefined}
            >
              <span aria-hidden="true">{step > index + 1 ? '✓' : index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      </div>

      <div className="cx-wiz">
        <div style={{ display: 'grid', gap: 12 }}>
          {step === 1 ? (
            <div className="cx-card">
              <div className="cx-card-h">
                <h2>{m.cx_which_offer()}</h2>
                <p>{m.cx_hidden_available()}</p>
              </div>
              <div className="cx-card-b">
                {offer.map((edition) => (
                  <fieldset
                    key={edition.editionId}
                    className="cx-ed-group"
                    style={{ border: 0, padding: 0, margin: 0 }}
                  >
                    <legend className="cx-eyebrow" style={{ marginBottom: 8 }}>
                      {edition.productName} · {loc(edition.editionName)}
                      {edition.editionVisible ? '' : ` · ${m.cx_hidden()}`}
                    </legend>
                    {edition.types.map((item) => (
                      <label key={item.id} className="cx-opt">
                        <input
                          type="radio"
                          name="batch-type"
                          checked={typeId === item.id}
                          onChange={() => setTypeId(item.id)}
                        />
                        <span className="o">
                          <b>{loc(item.name)}</b>{' '}
                          {item.visible ? null : <span className="cx-tag">{m.cx_hidden()}</span>}
                          <small>
                            {natureLabel(item.nature)} · {formatDays(item.days)} ·{' '}
                            {item.seatsMax
                              ? m.cx_seats_range({ min: item.seatsMin, max: item.seatsMax })
                              : m.cx_seats_min({ min: item.seatsMin })}
                          </small>
                        </span>
                        <span className="price">
                          {item.pricePerSeat ? `${fcfa(item.pricePerSeat)} / ${m.cx_seat()}` : m.cx_free()}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                ))}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="cx-card">
              <div className="cx-card-h">
                <h2>{m.cx_for_whom()}</h2>
              </div>
              <div className="cx-card-b" style={{ display: 'grid', gap: 18 }}>
                <div className="cx-seg" role="group" aria-label={m.cx_recipients()}>
                  {(
                    [
                      ['emails', m.cx_mode_emails()],
                      ['organization', m.cx_mode_organization()],
                      ['keys', m.cx_mode_keys()],
                    ] as const
                  ).map(([value, text]) => (
                    <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)}>
                      {text}
                    </button>
                  ))}
                </div>
                {mode === 'emails' ? (
                  <div className="cx-field">
                    <label htmlFor="batch-emails">{m.cx_emails_label()}</label>
                    <textarea
                      id="batch-emails"
                      className="cx-input"
                      rows={9}
                      value={emails}
                      onChange={(event) => setEmails(event.target.value)}
                    />
                    <div className="cx-parse" aria-live="polite">
                      <span>
                        <b className="num">{parsed.valid.length}</b> {m.cx_valid()}
                      </span>
                      {parsed.invalid.length ? (
                        <span className="cx-soon">
                          <b className="num">{parsed.invalid.length}</b> {m.cx_invalid()} :{' '}
                          {parsed.invalid.slice(0, 5).join(', ')}
                        </span>
                      ) : null}
                      {parsed.duplicates ? (
                        <span className="cx-muted">{m.cx_duplicates({ count: parsed.duplicates })}</span>
                      ) : null}
                      {parsed.valid.length > MAX ? (
                        <span className="cx-error">{m.cx_too_many({ max: MAX })}</span>
                      ) : null}
                    </div>
                    <span className="cx-hint">{m.cx_emails_hint()}</span>
                  </div>
                ) : null}
                {mode === 'organization' ? (
                  <div className="cx-field">
                    <label htmlFor="batch-holder">{m.cx_organization_holder()}</label>
                    {holder ? (
                      <div className="cx-keybox">
                        <span style={{ flex: 1 }}>
                          <b style={{ fontWeight: 500 }}>{holder.name}</b>{' '}
                          <small className="cx-muted">{holder.detail}</small>
                        </span>
                        <button className="cx-btn cx-btn-sm cx-btn-ghost" type="button" onClick={() => setHolder(null)}>
                          {m.cx_change()}
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          id="batch-holder"
                          className="cx-input"
                          value={holderQuery}
                          onChange={(event) => setHolderQuery(event.target.value)}
                          placeholder={m.cx_holder_placeholder()}
                          autoComplete="off"
                        />
                        {holders.length ? (
                          <ul className="cx-devices" aria-label={m.cx_holder_results()}>
                            {holders.map((item) => (
                              <li key={`${item.kind}-${item.organizationId}`}>
                                <div>
                                  <b style={{ fontWeight: 500 }}>{item.name}</b>
                                  <small>{item.detail}</small>
                                </div>
                                <button className="cx-btn cx-btn-sm" type="button" onClick={() => setHolder(item)}>
                                  {m.cx_choose()}
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </>
                    )}
                    <span className="cx-hint">{m.cx_organization_hint()}</span>
                  </div>
                ) : null}
                {mode !== 'emails' ? (
                  <div className="cx-field">
                    <label htmlFor="batch-count">{m.cx_how_many()}</label>
                    <input
                      id="batch-count"
                      className="cx-input"
                      type="number"
                      min={1}
                      max={MAX}
                      value={count}
                      onChange={(event) => setCount(Number(event.target.value))}
                      style={{ maxWidth: 140 }}
                    />
                    {mode === 'keys' ? <span className="cx-hint">{m.cx_keys_hint()}</span> : null}
                  </div>
                ) : null}
                <div className="cx-grid2">
                  <div className="cx-field">
                    <label htmlFor="batch-seats">{m.cx_seats_each()}</label>
                    <input
                      id="batch-seats"
                      className="cx-input"
                      type="number"
                      min={type?.seatsMin ?? 1}
                      max={type?.seatsMax ?? undefined}
                      value={seatCount}
                      onChange={(event) => setSeats(Number(event.target.value))}
                    />
                  </div>
                  <div className="cx-field">
                    <label htmlFor="batch-start">{m.cx_validity_start()}</label>
                    <select
                      id="batch-start"
                      className="cx-input"
                      value={startsOnActivation ? 'activation' : 'today'}
                      onChange={(event) => setStartsOnActivation(event.target.value === 'activation')}
                    >
                      <option value="activation">{m.cx_start_activation()}</option>
                      <option value="today">{m.cx_start_today()}</option>
                    </select>
                  </div>
                </div>
                <div className="cx-grid2">
                  <div className="cx-field">
                    <label htmlFor="batch-label">{m.cx_batch_label()}</label>
                    <input
                      id="batch-label"
                      className="cx-input"
                      value={label}
                      onChange={(event) => setLabel(event.target.value)}
                      placeholder={m.cx_batch_label_example()}
                    />
                  </div>
                  <div className="cx-field">
                    <label htmlFor="batch-name">{m.cx_shown_in_software()}</label>
                    <input
                      id="batch-name"
                      className="cx-input"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      placeholder={label || m.cx_batch_label()}
                    />
                  </div>
                </div>
                <div className="cx-field">
                  <label htmlFor="batch-reason">{m.cx_reason_stats()}</label>
                  <input
                    id="batch-reason"
                    className="cx-input"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={m.cx_reason_example()}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === 3 && type ? (
            <div className="cx-card">
              <div className="cx-card-h">
                <h2>{m.cx_what_happens()}</h2>
              </div>
              <div className="cx-card-b" style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span className="cx-big">{total}</span>
                  <span>{m.cx_distinct_licenses()}</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6, color: 'var(--cx-muted)' }}>
                  <li>
                    {m.cx_check_offer({
                      offer: `${loc(type.edition.editionName)} · ${loc(type.name)}`,
                      seats: seatCount,
                      duration: formatDays(type.days),
                    })}{' '}
                    {startsOnActivation ? m.cx_check_from_activation() : m.cx_check_from_today()}
                  </li>
                  {mode === 'emails' ? <li>{m.cx_check_mails({ count: total })}</li> : null}
                  {mode === 'organization' && holder ? <li>{m.cx_check_organization({ name: holder.name })}</li> : null}
                  {mode === 'keys' ? <li>{m.cx_check_keys()}</li> : null}
                  <li>{m.cx_check_stats({ nature: natureLabel(type.nature), reason })}</li>
                  <li>{m.cx_check_actions()}</li>
                </ul>
                <p className="cx-note warn">{m.cx_check_once()}</p>
              </div>
            </div>
          ) : null}

          {step === 4 && result ? (
            <div className="cx-card">
              <div className="cx-card-h">
                <h2>{result.replayed ? m.cx_batch_replayed() : m.cx_batch_generated({ count: result.keys.length })}</h2>
                <div className="cx-actions">
                  <button
                    className="cx-btn cx-btn-sm"
                    type="button"
                    onClick={() =>
                      void copyText(
                        ['cle;destinataire', ...result.keys.map((item) => `${item.key};${item.recipient}`)].join('\n'),
                      ).then((ok) => show(ok ? m.cx_csv_copied() : m.cx_copy_refused(), !ok))
                    }
                  >
                    {m.cx_copy_csv()}
                  </button>
                  <Link
                    to="/admin/lots/$id"
                    params={{ id: result.batchId }}
                    className="cx-btn cx-btn-sm cx-btn-primary"
                  >
                    {m.cx_open_batch()}
                  </Link>
                </div>
              </div>
              <div className="cx-card-b">
                <ul className="cx-keys" data-testid="batch-keys">
                  {result.keys.map((item) => (
                    <li key={item.licenseId}>
                      <code>{item.key}</code>
                      <small>{item.recipient}</small>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {step < 4 ? (
            <div className="cx-actions" style={{ justifyContent: 'space-between' }}>
              <button className="cx-btn" type="button" disabled={step === 1} onClick={() => setStep(step - 1)}>
                {m.cx_back()}
              </button>
              {step < 3 ? (
                <button
                  className="cx-btn cx-btn-primary"
                  type="button"
                  disabled={!type || (step === 2 && !recipientsReady)}
                  onClick={() => setStep(step + 1)}
                >
                  {m.cx_continue()}
                </button>
              ) : (
                <button
                  className="cx-btn cx-btn-primary"
                  type="button"
                  disabled={busy || !recipientsReady}
                  onClick={() => void generate()}
                >
                  {m.cx_generate_n({ count: total })}
                </button>
              )}
            </div>
          ) : (
            <div className="cx-actions">
              <button className="cx-btn" type="button" onClick={restart}>
                {m.cx_generate_another()}
              </button>
              <button
                className="cx-btn cx-btn-ghost"
                type="button"
                onClick={() => void navigate({ to: '/admin/lots' })}
              >
                {m.cx_nav_batches()}
              </button>
            </div>
          )}
        </div>

        <aside className="cx-card cx-summary" aria-label={m.cx_summary()}>
          <div className="cx-card-h">
            <h2>{m.cx_summary()}</h2>
          </div>
          <div className="cx-card-b">
            <dl className="cx-kv">
              <dt>{m.cx_software()}</dt>
              <dd>{type?.edition.productName ?? '—'}</dd>
              <dt>{m.cx_offer()}</dt>
              <dd>
                {type ? `${loc(type.edition.editionName)} · ${loc(type.name)}` : '—'}{' '}
                {type && !type.visible ? <span className="cx-tag">{m.cx_hidden()}</span> : null}
              </dd>
              <dt>{m.cx_nature()}</dt>
              <dd>{type ? natureLabel(type.nature) : '—'}</dd>
              <dt>{m.cx_duration()}</dt>
              <dd>{type ? formatDays(type.days) : '—'}</dd>
              <dt>{m.cx_nav_licenses()}</dt>
              <dd className="num">{step >= 2 ? total : '—'}</dd>
              <dt>{m.cx_col_seats()}</dt>
              <dd className="num">{m.cx_seats_per_license({ count: seatCount })}</dd>
              <dt>{m.cx_channel()}</dt>
              <dd>
                <span className="cx-pill warn">{m.cx_channel_batch()}</span>
              </dd>
              <dt>{m.cx_col_amount()}</dt>
              <dd className="num">{fcfa(0)}</dd>
              <dt>{m.cx_reason()}</dt>
              <dd>{step >= 2 ? reason || <span className="cx-soon">{m.cx_to_fill()}</span> : '—'}</dd>
            </dl>
          </div>
        </aside>
      </div>
      <Toast notice={notice} />
    </ConsolePage>
  );
}
