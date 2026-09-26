import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Un message est un texte, ou une liste de variantes (pluriels) dont on vérifie chaque texte. */
type Message = string | { match: Record<string, string> }[];

const load = (locale: string) =>
  JSON.parse(readFileSync(new URL(`../../../messages/${locale}.json`, import.meta.url), 'utf8')) as Record<
    string,
    Message
  >;

const texts = (value: Message): string[] =>
  typeof value === 'string' ? [value] : value.flatMap((variant) => Object.values(variant.match));

describe('catalogues de messages (spec 001, SC-004)', () => {
  const fr = load('fr');
  const en = load('en');

  it('ont exactement les mêmes clés', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
  });

  it('n’ont aucun message vide', () => {
    for (const [key, value] of [...Object.entries(fr), ...Object.entries(en)]) {
      if (key === '$schema') continue;
      for (const text of texts(value)) expect(text.trim(), key).not.toBe('');
    }
  });

  it('écrivent toujours « KYA-SolDesign », jamais « SolDesign » seul', () => {
    for (const [key, value] of [...Object.entries(fr), ...Object.entries(en)]) {
      if (key === '$schema') continue;
      for (const text of texts(value)) expect(text.replaceAll('KYA-SolDesign', ''), key).not.toMatch(/SolDesign/u);
    }
  });
});
