# Plan d'implémentation : Socle applicatif

**Branche** : `feat-001-socle` · **Spécification** : [spec.md](spec.md) · **Recherche** : [research.md](research.md)

## Résumé

Mettre en place l'espace de travail, l'application TanStack Start multilingue (FR/EN) avec la charte
KYA et les composants de la maquette v5, la page d'accueil de la marketplace, la base Neon avec
Drizzle, la validation des secrets, les journaux et l'audit, la santé, la porte de qualité, la CI et
l'image Docker pour Coolify.

## Contexte technique

| Sujet | Choix |
|---|---|
| Langage | TypeScript 6 strict, ESM, Node 22 |
| Application | TanStack Start 1.168 (React 19, Vite 8), rendu serveur |
| Multilangue | Paraglide JS 2, `fr` (base) et `en` |
| Base | Neon Postgres, Drizzle ORM 0.45, `pg` ; PGlite pour les tests |
| Validation | Zod 4 |
| Journaux | pino, masquage des clés sensibles |
| Tests | Vitest 5, Playwright 1.63, axe |
| Qualité | ESLint 10, Prettier, secretlint |
| Paquets | pnpm 11, espace de travail |
| Livraison | Docker multi-étapes, Coolify ; GitHub Actions |
| Cibles | mobile d'abord, réseau lent ; LCP < 2,5 s sur 4G |

## Contrôle de constitution

| Principe | Conformité |
|---|---|
| I. Spécifier avant de construire | spécification, recherche, plan, tâches sur `feat-001-socle` |
| II. Une couche métier | paquet `domain` (audit, santé) appelé par les routes ; `db` isolé |
| III. Sécurité serveur | secrets validés au démarrage, jamais affichés ; `.env.example` seul suivi ; secretlint en CI ; image non privilégiée |
| IV. Argent, licences, données | non concerné (aucune donnée client) ; audit prêt |
| V. Le terrain d'abord | rendu serveur, polices locales, poids mesuré, FR/EN, axe en CI |
| VI. Qualité démontrée | `pnpm verify`, tests de contrat santé, migrations versionnées |

Aucune exception.

## Structure

```text
apps/web/
  project.inlang/settings.json    langues fr (base), en
  messages/fr.json, en.json       catalogues de messages
  src/server.ts                   entrée serveur : Paraglide sauf /api/*
  src/router.tsx                  routeur + réécriture des adresses localisées
  src/routes/__root.tsx           document, en-têtes, pied, 404
  src/routes/index.tsx            accueil de la marketplace (maquette v5)
  src/routes/api/health.ts        GET /api/health
  src/components/                 en-tête marketplace, en-tête logiciel, pied, sections
  src/server/                     accès serveur (env, base, journaux)
  public/images/                  photo et capture de l'accueil
  e2e/                            tests Playwright
packages/config/                  schéma des variables d'environnement (Zod)
packages/db/                      schéma Drizzle, migrations, client pg, base de test PGlite
packages/domain/                  services : audit, santé
packages/ui/                      jetons de la charte, tokens.css, base.css, icônes, boutons
scripts/                          env-link, neon-setup, tokens, check-branch
.github/workflows/quality.yml     porte de qualité et sens des branches
Dockerfile, .dockerignore
```

## Données

Voir [data-model.md](data-model.md) : table `audit_events`.

## Contrats

Voir [contracts/health.md](contracts/health.md).

## Démarrage

Voir [quickstart.md](quickstart.md).

## Risques

| Risque | Parade |
|---|---|
| Clé Neon pas encore fournie | tests sur PGlite ; `neon-setup` lancé dès que la clé est là |
| Accès de Coolify au dépôt privé | application GitHub ou clé de déploiement à installer par le responsable |
| Nouveautés d'outils (Vite 8, ESLint 10, TS 6) | versions de l'exemple officiel ; verrouillage `pnpm-lock.yaml` |
