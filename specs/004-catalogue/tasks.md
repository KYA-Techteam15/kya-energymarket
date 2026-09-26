# Tâches — Catalogue et pages composées

## Fondations
- [x] T001 Schéma `catalog.ts` (logiciels, fonctions, éditions, fonctions par édition, durées) et `content.ts` (pages, versions, médias) ; migration `0003_catalogue`
- [x] T002 Champs de bloc → schéma Zod et formulaire (`content/fields.ts`) ; 21 types de blocs issus de design/v5 (`content/blocks.ts`)
- [x] T003 Markdown assaini (`markdown-it`, HTML échappé, liens refusés, liens internes localisés, ancres, sommaire)
- [x] T004 Port `MediaStorage` : Neon Object Storage (S3) et dossier local ; conversion WebP par `sharp`

## Histoire 1 — Pages publiques (P1)
- [x] T010 Services du catalogue (lecture publique, offre d'un logiciel)
- [x] T011 Pages composées : version publiée, repli sur le français, aperçu réservé à l'équipe
- [x] T012 Rendu des 21 blocs, styles portés de design/v5 (`scripts/port-v5-blocks.mjs` → `blocks.css`), couleurs ramenées aux jetons de la charte, contrastes AA
- [x] T013 Routes : `Logiciels`, logiciel (en-tête à quatre onglets) et ses pages, pages de la marketplace ; en-tête, accueil et pied de page lisent le catalogue
- [x] T014 Tarifs et comparatif liés au catalogue ; édition choisie mise en avant

## Histoire 2 — Catalogue (P1)
- [x] T020 Écritures du catalogue avec audit ; droits `catalog:write`
- [x] T021 Administration → Catalogue : fiche, fonctions, éditions, durées et prix

## Histoire 3 — Pages (P1)
- [x] T030 Brouillon, publication (concurrence), restauration, historique ; audit
- [x] T031 Administration → Pages : éditeur de blocs guidé, aperçu, publication, versions

## Histoire 4 — Médias (P2)
- [x] T040 Téléversement (format lu par le serveur), textes alternatifs FR/EN, `/media/<clé>` à cache immuable
- [x] T041 Seau `media` provisionné sur la branche Neon `dev` ; identifiants par environnement dans le fichier de secrets

## Histoire 5 — MCP (P2)
- [x] T050 Outils `search_catalog`, `get_product`, `list_pages`, `get_page`, `update_product`, `update_edition`, `set_plan_price`, `update_page_draft`, `publish_page` ; portées `admin:catalog`, `admin:content`

## Transverse
- [x] T060 API `GET /api/v1/catalog`
- [x] T061 Contenu initial `pnpm db:seed` (FR/EN, idempotent), joué par les tests de parcours et le déploiement
- [x] T062 Tests : unitaires et intégration (blocs, Markdown, catalogue, pages, médias), parcours (pages publiques, tarifs, API, administration, médias, MCP) avec axe
- [x] T063 Documentation, journal, feuille de route ; déploiement `dev`

## Écarts constatés pendant l'implémentation

- `sharp` est un module natif : il reste hors de l'empaquetage (Vite `ssr.external`) et Nitro copie ses binaires (`traceDeps`).
- Les couleurs écrites en dur dans la maquette et son gris « faint » (3,4:1) sont remplacés par les jetons de la charte ; le texte sur le vert KYA est à l'encre foncée.
- Le type d'une image est lu par le serveur (sharp), jamais pris au navigateur.
- Le formulaire d'édition ne se remonte plus après un enregistrement : il se resynchronise sur la version enregistrée (sinon « Publier » partait avec un numéro de brouillon périmé).
- L'essai (spec 006) et l'achat (spec 007) ne sont pas ouverts : « Essayer » et « Acheter » mènent à des pages composées qui l'annoncent et proposent le devis.
