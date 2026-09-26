// Porte les styles des blocs de page depuis design/v5 vers packages/ui/styles/blocks.css (spec 004).
// Ne garde que les règles dont chaque sélecteur commence par une classe de bloc (pas de doublon avec
// base.css), traduit les variables de la maquette vers les jetons de la charte et adapte les icônes.
// Usage : node scripts/port-v5-blocks.mjs  (le fichier produit est versionné et relu).
import { readFileSync, writeFileSync } from 'node:fs';

const source = readFileSync(new URL('../design/v5/assets/css/site.css', import.meta.url), 'utf8');

// Classes racines des blocs portés.
const ALLOW = new Set(
  (
    'meter lic lic-top lic-stats key icon-btn seats seats-head assign giant sw sw-row sw-id sw-nav sw-end menu-btn facts facts-row fact crumbs err err-meter qs q gauge gauge-mini app app-side ' +
    'app-brand app-tabs app-note app-main app-top app-hello app-figs app-label app-bigrow app-big app-side-fig app-mid ' +
    'app-say chart bar ref cmp chart-legend rows fit fit-controls fit-read fit-verdict fit-plot fit-note range acc ' +
    'acc-body steps-grid steps-fig deliver who pic devis devis-doc who-list ed proof proof-fig quote quote-nav close ' +
    'close-foot grid-2 grid-3 faq-groups faq-index faq-group buy step-title cfg choice opt badge-top price seats-row ' +
    'stepper summary total alt inc pay-logos cmp-table tbl-wrap note-band res-grid res play dur versions v panel ' +
    'guide-steps sysreq contact-ways way ic search suggest doc-layout doc-toc prose callout link-arrow ' +
    // Parcours d'essai, d'achat et confirmation (spécifications 006 et 007).
    'flow flow-steps flow-card dl inapp mock-win checkout co-block co-me pay-opt secure done-head ok-mark done-grid recap'
  ).split(' '),
);

const VARS = [
  ['--soft-2', '--kya-soft2'],
  ['--line-2', '--kya-line2'],
  ['--ink-2', '--kya-ink2'],
  ['--teal-ink', '--kya-green-ink'],
  ['--teal-dark', '--kya-green-hover'],
  ['--mint-2', '--kya-green-wash2'],
  ['--deep-2', '--kya-green-deep2'],
  ['--orange-hover', '--kya-orange-hover'],
  ['--on-orange', '--kya-on-orange'],
  ['--orange-ink', '--kya-orange-ink'],
  ['--r-lg', '--kya-radius-lg'],
  ['--bg', '--kya-white'],
  ['--soft', '--kya-soft'],
  ['--line', '--kya-line'],
  ['--ink', '--kya-ink'],
  ['--muted', '--kya-muted'],
  // Gris « faint » de la maquette : 3,4:1 sur blanc, trop pâle pour du texte ; le gris « muted » passe AA.
  ['--faint', '--kya-muted'],
  ['--teal', '--kya-green'],
  ['--mint', '--kya-green-wash'],
  ['--deep', '--kya-green-deep'],
  ['--orange', '--kya-orange'],
  ['--yellow', '--kya-yellow'],
  ['--coffee', '--kya-coffee'],
  ['--danger', '--kya-coffee-ink'],
  ['--display', '--kya-font-display'],
  ['--font', '--kya-font-text'],
  ['--mono', '--kya-font-mono'],
  ['--r', '--kya-radius'],
  ['--ease', '--kya-ease'],
  ['--lift', '--kya-lift'],
];

const COLORS = [
  ['#f4c7a1', 'var(--kya-orange-wash)'],
  ['#fcfdfd', 'var(--kya-soft)'],
  ['#fdf0de', 'var(--kya-orange-wash)'],
  ['#7a4308', 'var(--kya-orange-ink)'],
  ['#fbe9e7', 'var(--kya-coffee-wash)'],
  ['#8c2a22', 'var(--kya-coffee-ink)'],
];

const translate = (css) => {
  let out = css;
  for (const [from, to] of VARS) out = out.replace(new RegExp(`var\\(${from}(?![\\w-])`, 'gu'), `var(${to}`);
  // Couleurs écrites en dur dans la maquette : ramenées aux jetons de la charte (tokens.ts).
  for (const [from, to] of COLORS) out = out.replaceAll(from, to);
  const mixWith = (token) => (_, alpha) => `color-mix(in srgb, var(${token}) ${alpha.padEnd(2, '0')}%, transparent)`;
  out = out
    .replace(/rgba\(6, 61, 58, \.(\d+)\)/gu, mixWith('--kya-green-deep'))
    .replace(/rgba\(255, 255, 255, \.(\d+)\)/gu, mixWith('--kya-white'))
    .replace(/#fff\b/gu, 'var(--kya-white)');
  // Texte sur le vert KYA : encre foncée (le blanc n'atteint que 3,1:1).
  out = out.replace(
    '.cmp.is-hot div { background: var(--kya-green); color: var(--kya-white); }',
    '.cmp.is-hot div { background: var(--kya-green); color: var(--kya-on-green); }',
  );
  // Icônes : la maquette utilise <svg class="i">, l'application <svg class="kya-icon">.
  return out.replace(/\.i(?=[\s,.:{)[])/gu, '.kya-icon');
};

const rootClass = (selector) => /^\s*\.([\w-]+)/u.exec(selector)?.[1];
/**
 * Garde, dans une liste de sélecteurs, ceux des blocs portés (`.sw-nav, .mk.is-main .mk-nav` → `.sw-nav`).
 * Rend la règle réécrite, ou `null` si aucun sélecteur n'est gardé.
 */
const keepRule = (rule) => {
  const brace = rule.indexOf('{');
  const selectors = rule
    .slice(0, brace)
    .split(',')
    .map((selector) => selector.trim())
    .filter((selector) => ALLOW.has(rootClass(selector) ?? ''));
  return selectors.length ? `${selectors.join(', ')} ${rule.slice(brace)}` : null;
};

/** Découpe une feuille en règles de premier niveau (et blocs @media). */
function rules(css) {
  const result = [];
  let depth = 0;
  let current = '';
  for (const char of css.replace(/\/\*[\s\S]*?\*\//gu, '')) {
    current += char;
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        result.push(current.trim());
        current = '';
      }
    }
  }
  return result;
}

const kept = [];
for (const rule of rules(source)) {
  if (rule.startsWith('@media')) {
    const head = rule.slice(0, rule.indexOf('{')).trim();
    const inner = rules(rule.slice(rule.indexOf('{') + 1, rule.lastIndexOf('}')))
      .map(keepRule)
      .filter((inner) => inner !== null);
    if (inner.length) kept.push(`${head} {\n  ${inner.join('\n  ')}\n}`);
  } else if (rule.startsWith('@keyframes')) {
    continue;
  } else {
    const rewritten = keepRule(rule);
    if (rewritten) kept.push(rewritten);
  }
}

const header = `/*
 * Blocs des pages composées (spec 004) et parcours d'essai et d'achat (006, 007), portés depuis design/v5/assets/css/site.css par
 * scripts/port-v5-blocks.mjs : variables traduites vers les jetons de la charte, icônes .kya-icon.
 * Fichier produit : le relire, ne pas le modifier à la main (relancer le script).
 */
:root {
  --kya-lift: 0 1px 2px color-mix(in srgb, var(--kya-green-deep) 5%, transparent),
    0 24px 48px -32px color-mix(in srgb, var(--kya-green-deep) 32%, transparent);
}
`;
writeFileSync(
  new URL('../packages/ui/styles/blocks.css', import.meta.url),
  `${header}\n${translate(kept.join('\n'))}\n`,
);
console.log(`${kept.length} règles portées vers packages/ui/styles/blocks.css`);
