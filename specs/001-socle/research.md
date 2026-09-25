# Recherche — Socle

Date : 2026-09-25. Sources consultées et décisions retenues.

## TanStack Start

- Exemple officiel `TanStack/router/examples/react/start-i18n-paraglide` : `@tanstack/react-start`
  1.168, `@tanstack/react-router` 1.170, React 19, Vite 8, `@vitejs/plugin-react` 6, TypeScript 6
  (paquet `@typescript/typescript6`), sortie serveur `.output/server/index.mjs`.
- Décision : partir de cette base, sans Tailwind (la charte v5 est déjà écrite en CSS ; des variables
  CSS générées depuis des jetons TypeScript suffisent).

## Multilangue

- Paraglide JS 2 (inlang), recommandé par TanStack Router pour Start : messages compilés, typés,
  arborescence par message (seuls les messages utilisés partent au navigateur).
- Stratégie : `url` → `cookie` → `preferredLanguage` → `baseLocale`. Base `fr`, adresses françaises
  sans préfixe, anglaises sous `/en`. `paraglideMiddleware` dans l'entrée serveur ; réécriture
  `deLocalizeUrl`/`localizeUrl` dans le routeur ; `<html lang={getLocale()}>`.
- Les routes `/api/*` contournent le middleware (pas de redirection de langue sur une API).
- Sources : paraglidejs.com/tanstack-start ; tanstack.com/router/latest/docs/guide/internationalization-i18n.

## Neon

- Skills officiels installés dans le dépôt (`neondatabase/agent-skills`) : `neon`, `neon-postgres`,
  `neon-postgres-branches`, `neon-auth`, `neon-object-storage`. Serveur MCP Neon disponible
  (`mcp.neon.tech`) pour l'administration de la base depuis Claude.
- Connexion : application en **poolée** (`-pooler`), migrations en **directe** (Drizzle Kit), comme
  le recommande `neon-postgres`. Application Node longue durée sur Coolify → pilote `node-postgres`
  (`pg`) avec un pool, pas le pilote serverless HTTP.
- Branches : `main` (production), `dev`, `test` ; `preview/<PR>` plus tard par la CI
  (`neon-postgres-branches`).
- Neon Auth (Better Auth géré) ne fournit pas de serveur OAuth pour MCP : confirme l'ADR 0003
  (Better Auth dans l'application, données dans Neon), à trancher en spécification 002.
- Région du projet : `aws-eu-central-1` (Francfort), la plus proche de l'Afrique de l'Ouest parmi les
  régions AWS de Neon.

## Base de test

- PGlite (Postgres compilé en WebAssembly) avec `drizzle-orm/pglite` : tests d'intégration rapides,
  sans réseau ni Docker, mêmes migrations que Neon.

## Qualité

- ESLint 10 (configuration plate) + `typescript-eslint` + `eslint-plugin-jsx-a11y` +
  `eslint-plugin-react-hooks` ; Prettier ; Vitest 5 ; Playwright 1.63 avec `@axe-core/playwright` ;
  `secretlint` avec le préréglage recommandé.

## Polices

- `@fontsource/poppins` (500, 600), `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono` :
  servies par l'application, `font-display: swap`, découpées par `unicode-range`.

## Couleurs

- Charte : les cinq couleurs du logo. Les teintes dérivées sont calculées dans
  `packages/ui/src/tokens.ts` (mélange avec noir ou blanc) et écrites dans `tokens.css` par une
  commande ; un test vérifie les contrastes AA et l'absence de dérive entre les deux fichiers.
