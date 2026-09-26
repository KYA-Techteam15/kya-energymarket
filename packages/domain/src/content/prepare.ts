import type { StoredBlock } from '@kya-em/db';
import { blockDefinition } from './blocks.ts';
import type { Field, Fields } from './fields.ts';
import { renderMarkdown, type TocEntry } from './markdown.ts';

/**
 * Prépare les blocs pour l'affichage : chaque champ Markdown devient `{ html, toc }`, rendu et assaini
 * côté serveur. Le navigateur ne reçoit jamais de Markdown à interpréter ni de HTML non assaini.
 */
export interface RenderedMarkdown {
  readonly html: string;
  readonly toc: readonly TocEntry[];
}

export interface PreparedBlock {
  readonly id: string;
  readonly type: string;
  readonly data: Record<string, unknown>;
}

type Locale = 'fr' | 'en';

function prepareValue(field: Field, value: unknown, locale: Locale): unknown {
  if (value === undefined || value === null) return value;
  if (field.kind === 'markdown' && typeof value === 'string') return renderMarkdown(value, { locale });
  if (field.kind === 'list' && Array.isArray(value)) {
    return value.map((item) => prepareFields(field.of, item as Record<string, unknown>, locale));
  }
  return value;
}

function prepareFields(fields: Fields, data: Record<string, unknown>, locale: Locale) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      const field = fields[key];
      return [key, field ? prepareValue(field, value, locale) : value];
    }),
  );
}

export function prepareBlocks(blocks: readonly StoredBlock[], locale: Locale): PreparedBlock[] {
  return blocks.flatMap((block) => {
    const definition = blockDefinition(block.type);
    // Un type retiré du code n'est plus affiché (le contenu reste en base, visible dans l'éditeur).
    if (!definition) return [];
    return [{ id: block.id, type: block.type, data: prepareFields(definition.fields, block.data, locale) }];
  });
}
