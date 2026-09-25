/**
 * Jetons de la charte KYA.
 *
 * Le logo KYA compte cinq couleurs : vert, orange, blanc, jaune, café. Ce sont les seules couleurs
 * choisies. Toute autre teinte de l'interface (encre, fonds, filets, survols) est DÉRIVÉE de l'une
 * d'elles par mélange avec du noir ou du blanc, ici, et nulle part ailleurs. `tokens.css` est
 * généré depuis ce fichier (`pnpm tokens`) ; un test vérifie les contrastes et l'absence de dérive.
 */

/** Les cinq couleurs du logo (charte KYA, valeurs RVB officielles). */
export const brand = {
  green: '#1ca18c', // C79 M13 J55 N1 · R28 V161 B140
  orange: '#f99d32', // C0 M45 J91 N0 · R249 V157 B50
  white: '#ffffff', // C0 M0 J0 N0 · R255 V255 B255
  yellow: '#e8e748', // C12 M0 J85 N0 · R232 V231 B72
  coffee: '#875028', // C31 M67 J90 N31 · R135 V80 B40
} as const;

const BLACK = '#000000';
const WHITE = brand.white;

type Rgb = readonly [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16)) as unknown as Rgb;
}

export function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
}

/** Mélange sRGB : `share` de la couleur `color`, le reste de `base`. */
export function mix(color: string, base: string, share: number): string {
  const a = hexToRgb(color);
  const b = hexToRgb(base);
  return rgbToHex([0, 1, 2].map((index) => a[index]! * share + b[index]! * (1 - share)) as unknown as Rgb);
}

const shade = (color: string, share: number) => mix(color, BLACK, share);
const tint = (color: string, share: number) => mix(color, WHITE, share);

const ink = shade(brand.green, 0.16);

/** Rôles de l'interface, tous issus de la charte. */
export const colors = {
  // Charte, telles quelles
  green: brand.green,
  orange: brand.orange,
  white: brand.white,
  yellow: brand.yellow,
  coffee: brand.coffee,

  // Encres (texte) — vert assombri
  ink,
  ink2: shade(brand.green, 0.24),
  muted: mix(ink, WHITE, 0.64),
  faint: mix(ink, WHITE, 0.5),

  // Vert : structure, actions principales, liens
  greenDeep: shade(brand.green, 0.36),
  greenDeep2: shade(brand.green, 0.46),
  greenInk: shade(brand.green, 0.7),
  greenWash: tint(brand.green, 0.14),
  greenWash2: tint(brand.green, 0.28),

  // Fonds et filets — vert très éclairci
  soft: tint(brand.green, 0.05),
  soft2: tint(brand.green, 0.1),
  line: mix(ink, WHITE, 0.12),
  line2: mix(ink, WHITE, 0.2),

  // Orange : acheter, renouveler, payer — et rien d'autre
  orangeHover: shade(brand.orange, 0.9),
  onOrange: shade(brand.coffee, 0.4),
  orangeInk: shade(brand.orange, 0.55),
  orangeWash: tint(brand.orange, 0.16),

  // Café : exemple, provenance, alerte douce
  coffeeWash: tint(brand.coffee, 0.1),
  coffeeInk: shade(brand.coffee, 0.85),
} as const;

export type ColorRole = keyof typeof colors;

/** Luminance relative (WCAG 2.x). */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as unknown as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

const cssName = (role: string) => `--kya-${role.replace(/[A-Z]/gu, (char) => `-${char.toLowerCase()}`)}`;

/** Contenu de `tokens.css`. */
export function renderTokensCss(): string {
  const lines = Object.entries(colors).map(([role, value]) => `  ${cssName(role)}: ${value};`);
  return [
    '/* Généré par `pnpm tokens` depuis packages/ui/src/tokens.ts — ne pas modifier à la main. */',
    ':root {',
    ...lines,
    '  --kya-font-display: "Poppins", "Segoe UI", system-ui, sans-serif;',
    '  --kya-font-text: "Inter Variable", "Inter", "Segoe UI", system-ui, sans-serif;',
    '  --kya-font-mono: "JetBrains Mono Variable", "JetBrains Mono", "Cascadia Mono", Consolas, monospace;',
    '  --kya-radius: 6px;',
    '  --kya-radius-lg: 10px;',
    '  --kya-ease: cubic-bezier(0.16, 1, 0.3, 1);',
    '}',
    '',
  ].join('\n');
}
