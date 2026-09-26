# Plan d'implémentation : Catalogue et pages composées

**Branche** : `feat-004-catalogue` · **Spécification** : [spec.md](spec.md) · **Recherche** : [research.md](research.md)

## Contrôle de constitution

| Principe | Conformité |
|---|---|
| II. Une couche métier | services `catalog`, `content`, `media` dans `@kya-em/domain` ; interface, MCP, API et amorçage les appellent tous |
| III. Sécurité serveur | droits vérifiés côté serveur (`catalog:write`, `content:write`, `content:publish`) ; Markdown sans HTML ; liens validés ; téléversement limité (type, taille) |
| V. Terrain | pages rendues côté serveur, images WebP, rien de lourd côté client hors exemple interactif |
| VI. Qualité | tests des schémas de blocs, du Markdown, des services (PGlite) ; parcours Playwright (pages publiques, administration, publication) avec axe |

## Structure

```text
packages/db/src/schema/
  catalog.ts              product, product_feature, edition, edition_feature, plan
  content.ts              page, page_version, media
packages/domain/src/
  catalog/                lecture publique, administration, schémas d'entrée
  content/fields.ts       champs de bloc → schéma Zod et formulaire
  content/blocks.ts       types de blocs (description par champs)
  content/pages.ts        brouillon, publication, versions, restauration
  content/markdown.ts     rendu assaini, sommaire
  media/                  port MediaStorage, adaptateurs S3 (Neon) et dossier local, conversion
  seed/                   contenu initial (FR/EN) repris de design/v5
apps/web/src/features/
  catalog/                pages Logiciels, en-tête de logiciel, tarifs
  content/                rendu des blocs, page composée, aperçu
  admin/catalog|pages|media  administration
  mcp/tools.server.ts     nouveaux outils
apps/web/src/routes/
  logiciels.tsx, logiciels/$slug.tsx (+ index, tarifs, ressources, support, $page)
  $page.tsx               pages de la marketplace (aide, à propos, légal…)
  media/$.ts              images du stockage objet
  api/v1/catalog.ts       API publique
  admin/catalogue*, admin/pages*, admin/medias
neon.ts                   seau `media` (Neon Object Storage)
scripts/seed.ts           pnpm db:seed
```
