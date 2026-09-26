import { z } from 'zod';

/**
 * Champs des blocs de page (spec 004, ADR 0008). Un type de bloc se décrit une seule fois par ses
 * champs ; on en dérive le schéma de validation (interface, MCP, amorçage) et le formulaire guidé de
 * l'administration. Aucune mise en page libre : seulement des champs.
 */
export interface FieldLabel {
  readonly fr: string;
  readonly en: string;
}

interface Base {
  readonly label: FieldLabel;
  readonly help?: FieldLabel;
  readonly optional?: boolean;
}

export type Field =
  | (Base & { readonly kind: 'text'; readonly max?: number })
  | (Base & { readonly kind: 'longText'; readonly max?: number })
  | (Base & { readonly kind: 'markdown'; readonly max?: number })
  | (Base & { readonly kind: 'number'; readonly min?: number; readonly max?: number; readonly integer?: boolean })
  | (Base & { readonly kind: 'numberList'; readonly min?: number; readonly max?: number })
  | (Base & { readonly kind: 'boolean' })
  | (Base & { readonly kind: 'select'; readonly options: readonly { value: string; label: FieldLabel }[] })
  | (Base & { readonly kind: 'media' })
  | (Base & { readonly kind: 'link' })
  | (Base & { readonly kind: 'textList'; readonly max?: number })
  | (Base & {
      readonly kind: 'list';
      readonly of: Readonly<Record<string, Field>>;
      readonly min?: number;
      readonly max?: number;
      /** Champ de l'élément qui lui sert de titre dans l'éditeur. */
      readonly titleField?: string;
    });

export type Fields = Readonly<Record<string, Field>>;

/** Lien sûr : chemin interne, ancre, `https:`, `mailto:` ou `tel:` ; jamais `javascript:` ni `data:`. */
export const SAFE_HREF = /^(\/(?!\/)[^\s]*|#[\w-]*|https:\/\/[^\s]+|mailto:[^\s]+|tel:\+?[\d\s]+)$/u;

export const linkSchema = z.object({
  label: z.string().trim().min(1).max(80),
  href: z.string().trim().regex(SAFE_HREF, 'lien refusé (chemin interne, https:, mailto: ou tel:)'),
});
export type LinkValue = z.infer<typeof linkSchema>;

/**
 * Référence de média : `/images/...` (image livrée avec l'application) ou `media:<uuid>`
 * (médiathèque, stockage objet).
 */
export const MEDIA_REF = /^(\/images\/[\w./-]+|media:[0-9a-f-]{36})$/u;

const optionalIf = (field: Field, schema: z.ZodType) => (field.optional ? schema.optional() : schema);

export function zodForField(field: Field): z.ZodType {
  switch (field.kind) {
    case 'text':
      return optionalIf(
        field,
        z
          .string()
          .trim()
          .min(1)
          .max(field.max ?? 200),
      );
    case 'longText':
      return optionalIf(
        field,
        z
          .string()
          .trim()
          .min(1)
          .max(field.max ?? 1200),
      );
    case 'markdown':
      return optionalIf(
        field,
        z
          .string()
          .trim()
          .min(1)
          .max(field.max ?? 40_000),
      );
    case 'number': {
      let schema = field.integer ? z.number().int() : z.number();
      if (field.min !== undefined) schema = schema.min(field.min);
      if (field.max !== undefined) schema = schema.max(field.max);
      return optionalIf(field, schema);
    }
    case 'numberList':
      return optionalIf(
        field,
        z
          .array(z.number())
          .min(field.min ?? 1)
          .max(field.max ?? 60),
      );
    case 'boolean':
      return z.boolean().optional();
    case 'select':
      return optionalIf(field, z.enum(field.options.map((option) => option.value) as [string, ...string[]]));
    case 'media':
      return optionalIf(field, z.string().regex(MEDIA_REF, 'média inconnu'));
    case 'link':
      return optionalIf(field, linkSchema);
    case 'textList':
      return optionalIf(field, z.array(z.string().trim().min(1).max(300)).max(field.max ?? 20));
    case 'list':
      return optionalIf(
        field,
        z
          .array(zodForFields(field.of))
          .min(field.min ?? 0)
          .max(field.max ?? 40),
      );
  }
}

export function zodForFields(fields: Fields) {
  return z.strictObject(Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, zodForField(field)])));
}

/** Valeur vide d'un champ, pour un nouveau bloc ou un nouvel élément de liste dans l'éditeur. */
export function emptyValue(field: Field): unknown {
  switch (field.kind) {
    case 'number':
      return field.min ?? 0;
    case 'numberList':
      return [];
    case 'boolean':
      return false;
    case 'select':
      return field.options[0]?.value;
    case 'link':
      return { label: '', href: '' };
    case 'textList':
      return [];
    case 'list':
      return Array.from({ length: field.min ?? 0 }, () => emptyValues(field.of));
    default:
      return '';
  }
}

export const emptyValues = (fields: Fields) =>
  Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, emptyValue(field)]));

// Petits constructeurs, pour des descriptions de blocs lisibles.
const l = (fr: string, en: string): FieldLabel => ({ fr, en });
export const f = {
  label: l,
  text: (fr: string, en: string, extra: Partial<Omit<Base, 'label'>> & { max?: number } = {}): Field => ({
    kind: 'text',
    label: l(fr, en),
    ...extra,
  }),
  longText: (fr: string, en: string, extra: Partial<Omit<Base, 'label'>> & { max?: number } = {}): Field => ({
    kind: 'longText',
    label: l(fr, en),
    ...extra,
  }),
  markdown: (fr: string, en: string, extra: Partial<Omit<Base, 'label'>> & { max?: number } = {}): Field => ({
    kind: 'markdown',
    label: l(fr, en),
    ...extra,
  }),
  number: (
    fr: string,
    en: string,
    extra: Partial<Omit<Base, 'label'>> & { min?: number; max?: number; integer?: boolean } = {},
  ): Field => ({ kind: 'number', label: l(fr, en), ...extra }),
  numbers: (
    fr: string,
    en: string,
    extra: Partial<Omit<Base, 'label'>> & { min?: number; max?: number } = {},
  ): Field => ({
    kind: 'numberList',
    label: l(fr, en),
    ...extra,
  }),
  flag: (fr: string, en: string, extra: Partial<Omit<Base, 'label'>> = {}): Field => ({
    kind: 'boolean',
    label: l(fr, en),
    ...extra,
  }),
  select: (
    fr: string,
    en: string,
    options: readonly { value: string; label: FieldLabel }[],
    extra: Partial<Omit<Base, 'label'>> = {},
  ): Field => ({ kind: 'select', label: l(fr, en), options, ...extra }),
  media: (fr: string, en: string, extra: Partial<Omit<Base, 'label'>> = {}): Field => ({
    kind: 'media',
    label: l(fr, en),
    ...extra,
  }),
  link: (fr: string, en: string, extra: Partial<Omit<Base, 'label'>> = {}): Field => ({
    kind: 'link',
    label: l(fr, en),
    ...extra,
  }),
  points: (fr: string, en: string, extra: Partial<Omit<Base, 'label'>> & { max?: number } = {}): Field => ({
    kind: 'textList',
    label: l(fr, en),
    ...extra,
  }),
  list: (
    fr: string,
    en: string,
    of: Fields,
    extra: Partial<Omit<Base, 'label'>> & { min?: number; max?: number; titleField?: string } = {},
  ): Field => ({ kind: 'list', label: l(fr, en), of, ...extra }),
};
