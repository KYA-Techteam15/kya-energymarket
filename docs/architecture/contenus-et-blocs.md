# Contenus et blocs

Presque tout ce qui s'affiche se configure dans l'administration. Les pages sont composées de
**blocs** typés, dans un gabarit de haute qualité issu de `design/v5` ; les textes longs s'écrivent en
**Markdown**.

## Pages

- Marketplace : accueil, catalogue, aide, contact, à propos, pages légales.
- Par logiciel : Présentation, Tarifs, Ressources, Support (en-tête du logiciel à quatre onglets,
  plus « Essayer gratuitement » et « Acheter »).

Chaque page = liste ordonnée de blocs, en brouillon ou publiée, par langue. Publier fige une version
(retour arrière possible).

## Types de blocs (première liste, issue de la maquette v5)

| Bloc | Contenu configurable |
|---|---|
| Héros | titre, texte, photo (média), deux actions |
| Repères | 2 à 4 chiffres avec légende (marqués « exemple » tant qu'ils ne sont pas prouvés) |
| Capture | image réelle du logiciel, légende |
| Texte en deux colonnes | titre, deux sous-titres, textes, listes |
| Exemple interactif | données d'un projet exemple (indicateurs, séries mensuelles), textes d'explication |
| Graphique réglable | paramètres de la courbe « point juste » |
| Étapes | accordéon avec une capture par étape |
| Livrables | deux colonnes : pour le client final (devis), pour les techniciens |
| Liste « pour qui » | profils et édition conseillée |
| Preuve | chiffres, photo, témoignages |
| Tarifs | lié au catalogue (éditions, durées, prix) — aucun prix saisi à la main dans le bloc |
| Comparatif | lié aux fonctions des éditions |
| Questions | questions et réponses en Markdown |
| Texte Markdown | contenu libre (guide, pages légales) avec sommaire |
| Clôture | grand titre, citation, actions |

## Markdown

CommonMark + tableaux, rendu côté serveur, **assaini** (liste blanche de balises, liens externes en
`rel="noopener"`), sans HTML brut. Aperçu en direct dans l'administration. Les ancres de titres
alimentent le sommaire.

## Médias

Téléversés dans Neon Object Storage (seau privé `media`, branché avec la base) derrière un port
(`MediaStorage`), convertis en WebP (2 400 px de large au plus), servis par `/media/<clé>` avec un cache
immuable ; texte alternatif obligatoire (FR, EN), mention « Photo d'illustration » possible. Mis en
place par la spécification 004 : les champs de chaque type de bloc sont décrits dans
`packages/domain/src/content/blocks.ts` (schéma et formulaire de l'éditeur en découlent).

## Données liées plutôt que recopiées

Un bloc Tarifs ou Comparatif lit le catalogue : changer un prix dans l'administration change la page,
l'espace client, l'API, le MCP et la licence émise.
