import type { LicenseChannel } from '@kya-em/domain';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { m } from '@/paraglide/messages.js';
import { Drawer, errorText, fcfa, formatDays, loc, newIdempotencyKey } from '../console/ui';
import { issueLicenseFn, searchHoldersFn, type getLicenses } from './licenses';

type Offer = NonNullable<Awaited<ReturnType<typeof getLicenses>>>['offer'];
type Holders = Awaited<ReturnType<typeof searchHoldersFn>>;
type HolderMode = 'account' | 'email' | 'keys';

/** « Annuelle · 1 an », ou « 1 an » seul quand le nom est déjà la durée. */
const typeLabel = (type: { name: { fr: string; en?: string }; days: number }) =>
  loc(type.name) === formatDays(type.days) ? loc(type.name) : `${loc(type.name)} · ${formatDays(type.days)}`;

/** Émettre une licence (spec 005b, histoire 2) : type (masqués compris), titulaire, canal, montant, motif. */
export function IssueDrawer({
  offer,
  onClose,
  onIssued,
  onError,
}: {
  offer: Offer;
  onClose: () => void;
  onIssued: (id: string) => void;
  onError: (text: string) => void;
}) {
  const types = useMemo(() => offer.flatMap((edition) => edition.types.map((type) => ({ ...type, edition }))), [offer]);
  const [typeId, setTypeId] = useState(types.find((type) => type.forSale)?.id ?? types[0]?.id ?? '');
  const [mode, setMode] = useState<HolderMode>('account');
  const [holderQuery, setHolderQuery] = useState('');
  const [holders, setHolders] = useState<Holders>([]);
  const [holder, setHolder] = useState<Holders[number] | null>(null);
  const [email, setEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [seats, setSeats] = useState(1);
  const [channel, setChannel] = useState<LicenseChannel>('staff');
  const [amount, setAmount] = useState(0);
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [startsOnActivation, setStartsOnActivation] = useState(false);
  const [sendKey, setSendKey] = useState(true);
  const [busy, setBusy] = useState(false);
  const [idempotencyKey] = useState(newIdempotencyKey);
  const type = types.find((item) => item.id === typeId);

  useEffect(() => {
    if (mode !== 'account' || holderQuery.trim().length < 2 || holder) return;
    const timer = setTimeout(() => void searchHoldersFn({ data: { query: holderQuery } }).then(setHolders), 250);
    return () => clearTimeout(timer);
  }, [holderQuery, mode, holder]);

  const recipient =
    mode === 'email' ? email.trim() : mode === 'account' && holder?.detail.includes('@') ? holder.detail : '';
  const ready =
    Boolean(type) &&
    (mode === 'account' ? Boolean(holder) : mode === 'email' ? email.includes('@') : customerName.trim().length > 0) &&
    (channel === 'purchase' || reason.trim().length >= 3);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!type || !ready) return;
    setBusy(true);
    const result = await issueLicenseFn({
      data: {
        licenseTypeId: type.id,
        seats,
        organizationId: mode === 'account' ? holder!.organizationId : null,
        recipientEmail: recipient || null,
        customerName: mode === 'keys' ? customerName.trim() : undefined,
        channel,
        amount,
        reason: reason.trim() || null,
        reference: reference.trim() || null,
        startsOnActivation,
        idempotencyKey,
        sendKey: sendKey && Boolean(recipient),
      },
    });
    setBusy(false);
    if (result.ok) onIssued(result.value);
    else onError(errorText(result.code, result.issues));
  };

  return (
    <Drawer
      eyebrow={m.cx_nav_sales()}
      title={m.cx_issue()}
      onClose={onClose}
      footer={
        <>
          <button className="cx-btn cx-btn-primary" type="submit" form="issue-form" disabled={!ready || busy}>
            {m.cx_issue_submit()}
          </button>
          <button className="cx-btn cx-btn-ghost" type="button" onClick={onClose}>
            {m.cx_cancel()}
          </button>
        </>
      }
    >
      <form id="issue-form" onSubmit={(event) => void submit(event)} style={{ display: 'grid', gap: 16 }}>
        <div className="cx-field">
          <label htmlFor="issue-type">{m.cx_offer()}</label>
          <select
            id="issue-type"
            className="cx-input"
            value={typeId}
            onChange={(event) => setTypeId(event.target.value)}
          >
            {offer.map((edition) => (
              <optgroup
                key={edition.editionId}
                label={`${edition.productName} · ${loc(edition.editionName)}${edition.editionVisible ? '' : ` (${m.cx_hidden()})`}`}
              >
                {edition.types.map((item) => (
                  <option key={item.id} value={item.id}>
                    {`${typeLabel(item)} · ${item.pricePerSeat ? `${fcfa(item.pricePerSeat)}/${m.cx_seat()}` : m.cx_free()}${item.visible ? '' : ` (${m.cx_hidden()})`}`}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <fieldset className="cx-field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="cx-label" style={{ marginBottom: 6 }}>
            {m.cx_holder()}
          </legend>
          <div className="cx-seg" role="group" aria-label={m.cx_holder()}>
            {(
              [
                ['account', m.cx_holder_account()],
                ['email', m.cx_holder_email()],
                ['keys', m.cx_holder_none()],
              ] as const
            ).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)}>
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {mode === 'account' ? (
          <div className="cx-field">
            <label htmlFor="issue-holder">{m.cx_holder_search()}</label>
            {holder ? (
              <div className="cx-keybox">
                <span style={{ flex: 1 }}>
                  <b style={{ fontWeight: 500 }}>{holder.name}</b> <small className="cx-muted">{holder.detail}</small>
                </span>
                <button className="cx-btn cx-btn-sm cx-btn-ghost" type="button" onClick={() => setHolder(null)}>
                  {m.cx_change()}
                </button>
              </div>
            ) : (
              <>
                <input
                  id="issue-holder"
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
                          <small>
                            {item.kind === 'organization' ? m.cx_organization() : m.cx_person()} · {item.detail}
                          </small>
                        </div>
                        <button className="cx-btn cx-btn-sm" type="button" onClick={() => setHolder(item)}>
                          {m.cx_choose()}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : holderQuery.trim().length >= 2 ? (
                  <span className="cx-hint">{m.cx_holder_none_found()}</span>
                ) : null}
              </>
            )}
          </div>
        ) : null}
        {mode === 'email' ? (
          <div className="cx-field">
            <label htmlFor="issue-email">{m.cx_recipient_email()}</label>
            <input
              id="issue-email"
              className="cx-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <span className="cx-hint">{m.cx_recipient_hint()}</span>
          </div>
        ) : null}
        {mode === 'keys' ? (
          <div className="cx-field">
            <label htmlFor="issue-name">{m.cx_shown_in_software()}</label>
            <input
              id="issue-name"
              className="cx-input"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
            />
            <span className="cx-hint">{m.cx_free_key_hint()}</span>
          </div>
        ) : null}

        <div className="cx-grid2">
          <div className="cx-field">
            <label htmlFor="issue-seats">{m.cx_col_seats()}</label>
            <input
              id="issue-seats"
              className="cx-input"
              type="number"
              min={type?.seatsMin ?? 1}
              max={type?.seatsMax ?? undefined}
              value={seats}
              onChange={(event) => setSeats(Number(event.target.value))}
            />
            {type ? (
              <span className="cx-hint">
                {type.seatsMax
                  ? m.cx_seats_range({ min: type.seatsMin, max: type.seatsMax })
                  : m.cx_seats_min({ min: type.seatsMin })}
              </span>
            ) : null}
          </div>
          <div className="cx-field">
            <label htmlFor="issue-channel">{m.cx_channel()}</label>
            <select
              id="issue-channel"
              className="cx-input"
              value={channel}
              onChange={(event) => setChannel(event.target.value as LicenseChannel)}
            >
              <option value="staff">{m.cx_channel_staff()}</option>
              <option value="purchase">{m.cx_channel_offline_purchase()}</option>
              <option value="partner">{m.cx_channel_partner()}</option>
            </select>
          </div>
        </div>
        <div className="cx-grid2">
          <div className="cx-field">
            <label htmlFor="issue-amount">{m.cx_amount_paid_fcfa()}</label>
            <input
              id="issue-amount"
              className="cx-input"
              type="number"
              min={0}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
            />
            {type && type.pricePerSeat ? (
              <span className="cx-hint">{m.cx_catalog_price({ price: fcfa(type.pricePerSeat * seats) })}</span>
            ) : null}
          </div>
          <div className="cx-field">
            <label htmlFor="issue-reference">{m.cx_reference()}</label>
            <input
              id="issue-reference"
              className="cx-input"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="D-2026-031"
            />
          </div>
        </div>
        <div className="cx-field">
          <label htmlFor="issue-reason">{channel === 'purchase' ? m.cx_reason() : m.cx_reason_required()}</label>
          <input
            id="issue-reason"
            className="cx-input"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={m.cx_reason_example()}
          />
        </div>
        <label className="cx-toggle">
          <input
            type="checkbox"
            checked={startsOnActivation}
            onChange={(event) => setStartsOnActivation(event.target.checked)}
          />
          {m.cx_starts_on_activation_choice()}
        </label>
        {recipient ? (
          <label className="cx-toggle">
            <input type="checkbox" checked={sendKey} onChange={(event) => setSendKey(event.target.checked)} />
            {m.cx_send_key_to({ email: recipient })}
          </label>
        ) : null}
      </form>
    </Drawer>
  );
}
