# Recherche — Catalogue et pages composées

Date : 2026-09-26.

## Blocs : une seule description, trois usages

Chaque type de bloc est décrit une fois par des **champs** (texte, texte long, Markdown, nombre,
case, choix, média, lien, liste d'éléments). De cette description on dérive :

1. le **schéma Zod** qui valide l'enregistrement (interface, MCP, amorçage) ;
2. le **formulaire** de l'éditeur de l'administration (champs guidés, pas de mise en page libre) ;
3. la **documentation** des blocs rendue aux clients MCP (`get_page` rend les champs attendus).

Le rendu (React) est à part, dans `apps/web/src/features/content/blocks`, fidèle aux gabarits v5.
Un lien est validé : chemin interne (`/…`), ancre (`#…`), `https:` ou `mailto:` ; jamais `javascript:`.

## Markdown

`markdown-it` 15 avec `html: false` (le HTML brut est échappé, jamais interprété), `linkify`, tableaux ;
`validateLink` refuse `javascript:`, `vbscript:`, `data:` ; liens externes en `rel="noopener"` ;
ancres de titres pour le sommaire. Rendu serveur à chaque requête (contenus courts), pas de HTML stocké.

## Médias : Neon Object Storage

- Stockage objet compatible S3 de Neon, disponible dans la région du projet (`aws-eu-central-1`),
  **branché avec la base** : chaque branche Neon (dev, test, main) a son propre état de stockage.
- Déclaré dans `neon.ts` (`buckets: { media: {} }`, privé), provisionné par la CLI `neon`
  (`neon deploy`), identifiants S3 par branche (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
  `AWS_ENDPOINT_URL_S3`, `AWS_REGION`) ; client `@aws-sdk/client-s3` avec `forcePathStyle: true`.
- Seau privé : l'application sert les images par `/media/<clé>` (clé unique par téléversement, donc
  cache `immutable` d'un an). Pas de CDN pour l'instant ; il se placera devant `/media` plus tard.
- Conversion à l'envoi par `sharp` : WebP, 2400 px de large au plus, métadonnées retirées.
- En développement sans identifiants et en test : adaptateur **dossier local** (même port).
- Images livrées avec l'application (`/images/...`) : médias « statiques » référencés par leur chemin.

## Données liées

Les blocs Tarifs et Comparatif ne portent que l'identifiant du logiciel (et des réglages d'affichage) :
le chargeur de la page lit le catalogue. Un prix change → la page, l'API et le MCP changent.

## Versions de page

Une version = une langue, une liste de blocs, un état (`draft`, `published`, `archived`). Au plus un
brouillon par page et par langue ; publier archive la version publiée précédente. Concurrence :
publier exige le numéro de brouillon attendu.
