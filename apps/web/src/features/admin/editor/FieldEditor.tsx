import type { Field, Fields } from '@kya-em/domain';
import { Icon } from '@kya-em/ui';
import { useId } from 'react';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';

/**
 * Formulaire guidé d'un bloc (spec 004, ADR 0008) : construit à partir de la description des champs.
 * Aucune mise en page libre : chaque champ a son contrôle, ses bornes et son aide.
 */
export interface MediaOption {
  readonly ref: string;
  readonly src: string;
  readonly label: string;
}

type Value = unknown;
type Record_ = Record<string, unknown>;

const label = (value: { fr: string; en: string }) => (getLocale() === 'en' ? value.en : value.fr);

/** Valeur vide d'un champ (miroir de `emptyValue` du domaine, sans importer le domaine côté navigateur). */
export function emptyOf(field: Field): Value {
  switch (field.kind) {
    case 'number':
      return field.min ?? 0;
    case 'numberList':
    case 'textList':
      return [];
    case 'boolean':
      return false;
    case 'select':
      return field.options[0]?.value;
    case 'link':
      return { label: '', href: '' };
    case 'list':
      return Array.from({ length: field.min ?? 0 }, () => emptyRecord(field.of));
    default:
      return '';
  }
}
export const emptyRecord = (fields: Fields) =>
  Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, emptyOf(field)]));

/** Nettoie avant l'envoi : un champ facultatif vide disparaît (le schéma le refuserait vide). */
export function clean(fields: Fields, data: Record_): Record_ {
  const result: Record_ = {};
  for (const [key, field] of Object.entries(fields)) {
    let value = data[key];
    if (field.kind === 'list' && Array.isArray(value)) value = value.map((item) => clean(field.of, item as Record_));
    if (field.kind === 'link' && value && typeof value === 'object') {
      const link = value as { label?: string; href?: string };
      if (!link.label?.trim() && !link.href?.trim()) value = undefined;
    }
    const empty =
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '') ||
      (Array.isArray(value) && value.length === 0 && field.optional) ||
      (field.kind === 'number' && Number.isNaN(value as number));
    if (empty && field.optional) continue;
    if (field.kind === 'boolean' && value !== true) continue;
    result[key] = value;
  }
  return result;
}

function Control({
  field,
  value,
  onChange,
  media,
  id,
}: {
  field: Field;
  value: Value;
  onChange: (value: Value) => void;
  media: readonly MediaOption[];
  id: string;
}) {
  switch (field.kind) {
    case 'text':
      return (
        <input
          id={id}
          className="input"
          value={String(value ?? '')}
          maxLength={field.max ?? 200}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      );
    case 'longText':
    case 'markdown':
      return (
        <textarea
          id={id}
          className={field.kind === 'markdown' ? 'input textarea mono' : 'input textarea'}
          rows={field.kind === 'markdown' ? 10 : 3}
          value={String(value ?? '')}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      );
    case 'number':
      return (
        <input
          id={id}
          className="input"
          type="number"
          step={field.integer ? 1 : 'any'}
          min={field.min}
          max={field.max}
          value={value === undefined || value === null ? '' : String(value)}
          onChange={(event) =>
            onChange(event.currentTarget.value === '' ? undefined : Number(event.currentTarget.value))
          }
        />
      );
    case 'numberList':
      return (
        <input
          id={id}
          className="input mono"
          value={Array.isArray(value) ? value.join(' ; ') : ''}
          placeholder="99 ; 98 ; 97"
          onChange={(event) =>
            onChange(
              event.currentTarget.value
                .split(';')
                .map((part) => part.trim().replace(',', '.'))
                .filter(Boolean)
                .map(Number),
            )
          }
        />
      );
    case 'boolean':
      return (
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
      );
    case 'select':
      return (
        <select
          id={id}
          className="input"
          value={String(value ?? '')}
          onChange={(event) => onChange(event.currentTarget.value)}
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {label(option.label)}
            </option>
          ))}
        </select>
      );
    case 'media': {
      const current = media.find((item) => item.ref === value);
      return (
        <div className="media-pick">
          {current ? <img src={current.src} alt="" width="96" height="60" /> : null}
          <select
            id={id}
            className="input"
            value={String(value ?? '')}
            onChange={(event) => onChange(event.currentTarget.value)}
          >
            <option value="">{m.admin_editor_no_media()}</option>
            {media.map((item) => (
              <option key={item.ref} value={item.ref}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      );
    }
    case 'link': {
      const link = (value ?? { label: '', href: '' }) as { label: string; href: string };
      return (
        <div className="field-pair">
          <input
            id={id}
            className="input"
            placeholder={m.admin_editor_link_label()}
            aria-label={m.admin_editor_link_label()}
            value={link.label}
            onChange={(event) => onChange({ ...link, label: event.currentTarget.value })}
          />
          <input
            className="input mono"
            placeholder="/logiciels/kya-soldesign · https://… · mailto:…"
            aria-label={m.admin_editor_link_href()}
            value={link.href}
            onChange={(event) => onChange({ ...link, href: event.currentTarget.value })}
          />
        </div>
      );
    }
    case 'textList':
      return (
        <textarea
          id={id}
          className="input textarea"
          rows={Math.max(2, (Array.isArray(value) ? value.length : 0) + 1)}
          value={Array.isArray(value) ? value.join('\n') : ''}
          onChange={(event) => onChange(event.currentTarget.value.split('\n'))}
          onBlur={(event) =>
            onChange(
              event.currentTarget.value
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean),
            )
          }
        />
      );
    case 'list':
      return (
        <ListEditor
          field={field}
          value={Array.isArray(value) ? (value as Record_[]) : []}
          onChange={onChange}
          media={media}
        />
      );
  }
}

function ListEditor({
  field,
  value,
  onChange,
  media,
}: {
  field: Extract<Field, { kind: 'list' }>;
  value: Record_[];
  onChange: (value: Value) => void;
  media: readonly MediaOption[];
}) {
  const move = (index: number, step: number) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + step, 0, item!);
    onChange(next);
  };
  return (
    <div className="list-editor">
      {value.map((item, index) => {
        const title = field.titleField ? String(item[field.titleField] ?? '') : '';
        return (
          <div key={index} className="list-item-wrap">
            <div className="list-actions">
              <button
                type="button"
                className="btn btn-line btn-xs"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                {m.admin_editor_up()}
              </button>
              <button
                type="button"
                className="btn btn-line btn-xs"
                disabled={index === value.length - 1}
                onClick={() => move(index, 1)}
              >
                {m.admin_editor_down()}
              </button>
              <button
                type="button"
                className="btn btn-line btn-xs"
                disabled={value.length <= (field.min ?? 0)}
                onClick={() => onChange(value.filter((_, position) => position !== index))}
              >
                {m.admin_editor_remove()}
              </button>
            </div>
            <details className="list-item" open={!title}>
              <summary>
                <span className="n">{index + 1}</span>
                <span>{title || m.admin_editor_item()}</span>
              </summary>
              <FieldsEditor
                fields={field.of}
                data={item}
                media={media}
                onChange={(next) => onChange(value.map((row, position) => (position === index ? next : row)))}
              />
            </details>
          </div>
        );
      })}
      {value.length < (field.max ?? 40) ? (
        <button
          type="button"
          className="btn btn-line btn-sm"
          onClick={() => onChange([...value, emptyRecord(field.of)])}
        >
          <Icon name="plus" />
          {m.admin_editor_add_item()}
        </button>
      ) : null}
    </div>
  );
}

export function FieldsEditor({
  fields,
  data,
  onChange,
  media,
}: {
  fields: Fields;
  data: Record_;
  onChange: (data: Record_) => void;
  media: readonly MediaOption[];
}) {
  const base = useId();
  return (
    <div className="fields">
      {Object.entries(fields).map(([key, field]) => {
        const id = `${base}-${key}`;
        const inline = field.kind === 'boolean';
        return (
          <div key={key} className={inline ? 'field field-inline' : 'field'}>
            {field.kind === 'list' ? (
              <span className="field-label">{label(field.label)}</span>
            ) : (
              <label htmlFor={id} className="field-label">
                {label(field.label)}
                {field.optional ? <small> · {m.admin_editor_optional()}</small> : null}
              </label>
            )}
            <Control
              field={field}
              value={data[key]}
              media={media}
              id={id}
              onChange={(value) => onChange({ ...data, [key]: value })}
            />
            {field.help ? <small className="field-help">{label(field.help)}</small> : null}
          </div>
        );
      })}
    </div>
  );
}
