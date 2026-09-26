import { describe, expect, it } from 'vitest';
import { parseSearch, stringifySearch } from './search';

describe('paramètres d’adresse', () => {
  it('gardent les clés répétées et les valeurs en texte (requête OAuth signée)', () => {
    const raw = '?client_id=abc&exp=1790400395&ba_param=client_id&ba_param=exp&sig=a%2Bb%3D';
    const parsed = parseSearch(raw);
    expect(parsed).toEqual({ client_id: 'abc', exp: '1790400395', ba_param: ['client_id', 'exp'], sig: 'a+b=' });
    expect(new URLSearchParams(stringifySearch(parsed)).getAll('ba_param')).toEqual(['client_id', 'exp']);
    expect(stringifySearch(parsed)).toBe(raw);
  });

  it('omettent les valeurs absentes', () => {
    expect(stringifySearch({ redirect: '/espace', onglet: undefined })).toBe('?redirect=%2Fespace');
    expect(stringifySearch({})).toBe('');
  });
});
