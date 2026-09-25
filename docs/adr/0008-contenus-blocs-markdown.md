# ADR 0008 — Pages composées de blocs et Markdown assaini

- **Statut** : acceptée · **Date** : 2026-09-25

## Décision

Les pages de la marketplace et des logiciels sont des listes de blocs typés, rendues dans les gabarits
de `design/v5`. Les textes longs sont en Markdown, rendus côté serveur et assainis. Les blocs liés
(tarifs, comparatif) lisent le catalogue au lieu de recopier ses valeurs. Détails :
[contenus et blocs](../architecture/contenus-et-blocs.md).

## Conséquences

- La qualité visuelle tient au gabarit, pas à la saisie : l'administration choisit des blocs et remplit
  des champs, elle ne fait pas de mise en page libre.
- Un nouveau type de bloc = du code (gabarit, schéma, rendu, tests).
