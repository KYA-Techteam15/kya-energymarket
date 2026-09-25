import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { brand, colors, contrast, mix, renderTokensCss } from './tokens.ts';

const AA = 4.5;
const AA_LARGE = 3;

describe('charte KYA (spec 001, FR-003, FR-004)', () => {
  it('garde exactement les cinq couleurs du logo', () => {
    expect(brand).toEqual({
      green: '#1ca18c',
      orange: '#f99d32',
      white: '#ffffff',
      yellow: '#e8e748',
      coffee: '#875028',
    });
  });

  it('dérive les teintes par mélange', () => {
    expect(mix('#1ca18c', '#000000', 1)).toBe('#1ca18c');
    expect(mix('#1ca18c', '#ffffff', 0)).toBe('#ffffff');
  });

  it.each([
    ['texte principal', colors.ink, colors.white],
    ['texte secondaire', colors.muted, colors.white],
    ['texte secondaire sur fond doux', colors.muted, colors.soft],
    ['lien vert', colors.greenInk, colors.white],
    ['bouton principal : encre sur le vert KYA', colors.onGreen, colors.green],
    ['bouton principal survolé', colors.onGreen, colors.greenHover],
    ['texte courant sur une section vert KYA', colors.ink2, colors.green],
    ['lien d’évitement', colors.white, colors.greenDeep],
    ['bouton d’achat', colors.onOrange, colors.orange],
    ['bouton d’achat survolé', colors.onOrange, colors.orangeHover],
    ['étiquette exemple', colors.coffee, colors.white],
    ['texte orange', colors.orangeInk, colors.white],
    ['texte sur section verte profonde', colors.white, colors.greenDeep],
    ['état actif', colors.greenDeep, colors.greenWash],
  ])('%s : contraste AA', (_label, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(AA);
  });

  it('le blanc ne porte jamais de texte courant sur le vert KYA (3,1:1)', () => {
    expect(contrast(colors.white, colors.green)).toBeLessThan(AA);
  });

  it('le jaune ne sert qu’en accent sur fond sombre', () => {
    expect(contrast(colors.yellow, colors.greenDeep)).toBeGreaterThanOrEqual(AA_LARGE);
  });

  it('tokens.css est à jour (pnpm tokens)', () => {
    const file = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8').replace(/\r\n/gu, '\n');
    expect(file).toBe(renderTokensCss());
  });
});
