# ADR 0001 — Une seule application TanStack Start, sans backend séparé

- **Statut** : acceptée · **Date** : 2026-09-25 · **Décideur** : responsable technique KYA

## Contexte

La marketplace sert des pages publiques rapides, un espace client, une administration, une API REST,
un serveur MCP, l'API des logiciels et des webhooks de paiement. kya-platform a choisi FastAPI parce
qu'il orchestre des domaines Python et Frappe ; ici tout le métier est nouveau et web.

## Options

1. TanStack Start seul (TypeScript de bout en bout, fonctions serveur, routes serveur).
2. TanStack Start + backend FastAPI (comme kya-platform).
3. Next.js.

## Décision

Option 1. Une application, une couche `domain` partagée par toutes les portes, déployée en une image.
FastAPI n'apporte rien ici et doublerait les schémas, la sécurité et le déploiement.

## Conséquences

- Un seul langage, des schémas Zod partagés entre client, serveur, REST et MCP.
- Les règles métier ne doivent pas fuir dans les routes : la discipline « une couche métier » est
  vérifiée en revue et par les limites d'import.
- Les traitements longs (courriels, rapprochement des paiements) passent par une file de tâches
  interne, à choisir dans la spécification 001.

## Révision

Si une charge ou un cycle de publication impose d'extraire un module (par exemple les paiements).
