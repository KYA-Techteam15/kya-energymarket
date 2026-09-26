import type { DocEdition, LicenseTypeNature } from '@kya-em/domain';
import { NATURES } from '@kya-em/domain/constants';
import { useState, type FormEvent } from 'react';
import { m } from '@/paraglide/messages.js';
import { Drawer, formatDays, natureLabel } from '../console/ui';
import type { useCatalogEditor } from './editor';

const PRESETS = [1, 7, 30, 91, 182, 365];

/** Créer ou modifier un type de licence dans le brouillon (spec 005b, histoire 1). */
export function LicenseTypeDrawer({
  edition,
  typeId,
  published,
  editor,
  onClose,
}: {
  edition: DocEdition;
  typeId: string;
  published: boolean;
  editor: ReturnType<typeof useCatalogEditor>;
  onClose: () => void;
}) {
  const creating = typeId === 'nouveau';
  const current = edition.types.find((type) => type.id === typeId);
  const [days, setDays] = useState(current?.days ?? 365);
  const disabled = !editor.canWrite || editor.busy;
  if (!creating && !current) {
    return (
      <Drawer title={m.cx_type()} onClose={onClose}>
        <p>{m.cx_type_missing()}</p>
      </Drawer>
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (key: string) => String(data.get(key) ?? '').trim();
    const fields = {
      name: { fr: text('name_fr'), en: text('name_en') || undefined },
      nature: text('nature') as LicenseTypeNature,
      days,
      pricePerSeat: Number(text('price') || 0),
      indicative: data.get('indicative') === 'on',
      seatsMin: Number(text('seatsMin') || 1),
      seatsMax: text('seatsMax') ? Number(text('seatsMax')) : null,
      renewable: data.get('renewable') === 'on',
      visible: data.get('visible') === 'on',
      forSale: data.get('forSale') === 'on',
    };
    const ok = await editor.change(
      [{ op: 'license_type', edition: edition.code, ...(creating ? {} : { id: typeId }), fields }],
      creating ? m.cx_type_created() : m.cx_saved_draft(),
    );
    if (ok) onClose();
  };

  return (
    <Drawer
      eyebrow={edition.name.fr}
      title={creating ? m.cx_new_type() : current!.name.fr}
      onClose={onClose}
      footer={
        editor.canWrite ? (
          <>
            <button className="cx-btn cx-btn-primary" type="submit" form="type-form" disabled={disabled}>
              {m.cx_save_draft()}
            </button>
            <button className="cx-btn cx-btn-ghost" type="button" onClick={onClose}>
              {m.cx_cancel()}
            </button>
            <span className="cx-spacer" />
            {!creating && published ? (
              <button
                className="cx-btn cx-btn-ghost"
                type="button"
                disabled={disabled}
                onClick={() =>
                  void editor
                    .change([
                      {
                        op: 'license_type',
                        edition: edition.code,
                        id: typeId,
                        fields: { archived: !current!.archived },
                      },
                    ])
                    .then((ok) => ok && onClose())
                }
              >
                {current!.archived ? m.cx_unarchive() : m.cx_archive()}
              </button>
            ) : null}
            {!creating && !published ? (
              <button
                className="cx-btn cx-btn-danger"
                type="button"
                disabled={disabled}
                onClick={() =>
                  void editor
                    .change([{ op: 'remove', edition: edition.code, id: typeId }], m.cx_removed())
                    .then((ok) => ok && onClose())
                }
              >
                {m.cx_remove_draft()}
              </button>
            ) : null}
          </>
        ) : null
      }
    >
      <form id="type-form" onSubmit={(event) => void submit(event)} style={{ display: 'grid', gap: 14 }}>
        <div className="cx-grid2">
          <div className="cx-field">
            <label htmlFor="t-name-fr">{m.cx_f_name()} (FR)</label>
            <input
              id="t-name-fr"
              name="name_fr"
              className="cx-input"
              defaultValue={current?.name.fr ?? ''}
              required
              placeholder={m.cx_type_example()}
              disabled={disabled}
            />
          </div>
          <div className="cx-field">
            <label htmlFor="t-name-en">{m.cx_f_name()} (EN)</label>
            <input
              id="t-name-en"
              name="name_en"
              className="cx-input"
              defaultValue={current?.name.en ?? ''}
              disabled={disabled}
            />
          </div>
        </div>
        <div className="cx-field">
          <label htmlFor="t-nature">{m.cx_nature()}</label>
          <select
            id="t-nature"
            name="nature"
            className="cx-input"
            defaultValue={current?.nature ?? 'sale'}
            disabled={disabled}
          >
            {NATURES.map((nature) => (
              <option key={nature} value={nature}>
                {natureLabel(nature)}
              </option>
            ))}
          </select>
          <span className="cx-hint">{m.cx_nature_hint()}</span>
        </div>
        <div className="cx-field">
          <label htmlFor="t-days">{m.cx_duration_days()}</label>
          <div className="cx-seg" role="group" aria-label={m.cx_duration()}>
            {PRESETS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={days === value}
                onClick={() => setDays(value)}
                disabled={disabled}
              >
                {formatDays(value)}
              </button>
            ))}
          </div>
          <input
            id="t-days"
            className="cx-input"
            type="number"
            min={1}
            max={3650}
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            style={{ maxWidth: 140 }}
            disabled={disabled}
          />
        </div>
        <div className="cx-grid2">
          <div className="cx-field">
            <label htmlFor="t-price">{m.cx_price_per_seat_fcfa()}</label>
            <input
              id="t-price"
              name="price"
              className="cx-input"
              type="number"
              min={0}
              defaultValue={current?.pricePerSeat ?? 0}
              disabled={disabled}
            />
          </div>
          <label className="cx-toggle" style={{ alignSelf: 'end', minHeight: 34 }}>
            <input type="checkbox" name="indicative" defaultChecked={current?.indicative ?? true} disabled={disabled} />
            {m.cx_f_indicative()}
          </label>
        </div>
        <div className="cx-grid2">
          <div className="cx-field">
            <label htmlFor="t-min">{m.cx_f_seats_min()}</label>
            <input
              id="t-min"
              name="seatsMin"
              className="cx-input"
              type="number"
              min={1}
              defaultValue={current?.seatsMin ?? 1}
              disabled={disabled}
            />
          </div>
          <div className="cx-field">
            <label htmlFor="t-max">{m.cx_f_seats_max()}</label>
            <input
              id="t-max"
              name="seatsMax"
              className="cx-input"
              type="number"
              min={1}
              defaultValue={current?.seatsMax ?? ''}
              placeholder={edition.maxSeats ? m.cx_edition_max({ max: edition.maxSeats }) : m.cx_unlimited()}
              disabled={disabled}
            />
          </div>
        </div>
        <label className="cx-toggle">
          <input type="checkbox" name="renewable" defaultChecked={current?.renewable ?? true} disabled={disabled} />
          {m.cx_f_renewable()}
        </label>
        <label className="cx-toggle">
          <input type="checkbox" name="visible" defaultChecked={current?.visible ?? false} disabled={disabled} />
          {m.cx_visible_on_site()}
        </label>
        <label className="cx-toggle">
          <input type="checkbox" name="forSale" defaultChecked={current?.forSale ?? false} disabled={disabled} />
          {m.cx_for_sale_on_site()}
        </label>
        {published ? <p className="cx-note">{m.cx_type_frozen_note()}</p> : null}
      </form>
    </Drawer>
  );
}
