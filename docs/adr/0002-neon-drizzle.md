# ADR 0002 — Neon Postgres avec Drizzle, une branche par environnement

- **Statut** : acceptée · **Date** : 2026-09-25

## Contexte

KYA utilise déjà Neon (organisation « techteam@kya-energy.com », projets `KYA` et
`KYA-Platform-Recette`). Les branches Neon donnent des données isolées par preview.

## Décision

- Un projet Neon dédié `kya-energy-market`, créé par la spécification 001, dans l'organisation KYA.
- Branches : `main` (production), `dev`, `test` (tests automatisés), `preview/<n°-de-PR>` éphémères.
- Drizzle ORM ; migrations SQL versionnées dans le dépôt, immuables une fois publiées, exécutées par
  le pipeline avec une URL de migration distincte de l'URL applicative.
- Rôle applicatif sans droits de schéma ; rôle propriétaire réservé aux migrations.

## Conséquences

- Les tests d'intégration tournent sur une vraie base Postgres (branche `test` ou conteneur local).
- Le plan gratuit de l'organisation limite les ressources : à surveiller avant la production.

## Révision

Si le plan Neon ou la latence depuis l'Afrique de l'Ouest devient un frein.
