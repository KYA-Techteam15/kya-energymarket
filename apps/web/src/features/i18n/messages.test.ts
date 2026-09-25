import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const load = (locale: string) =>
  JSON.parse(readFileSync(new URL(`../../../messages/${locale}.json`, import.meta.url), 'utf8')) as Record<
    string,
    string
  >;

describe('catalogues de messages (spec 001, SC-004)', () => {
  const fr = load('fr');
  const en = load('en');

  it('ont exactement les mêmes clés', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
  });

  it('n’ont aucun message vide', () => {
    for (const [key, value] of [...Object.entries(fr), ...Object.entries(en)]) {
      if (key !== '$schema') expect(value.trim(), key).not.toBe('');
    }
  });

  it('écrivent toujours « KYA-SolDesign », jamais « SolDesign » seul', () => {
    for (const value of [...Object.values(fr), ...Object.values(en)]) {
      expect(value.replaceAll('KYA-SolDesign', '')).not.toMatch(/SolDesign/u);
    }
  });
});
