# ADR 0004 — Serveur MCP distant protégé par OAuth, dès le départ

- **Statut** : acceptée · **Date** : 2026-09-25

## Contexte

L'équipe KYA veut agir sur la plateforme depuis Claude et Codex : créer une offre, publier une page,
répondre au support, suivre les ventes. Les clients aussi pourront consulter leurs licences.

## Décision

- Un serveur MCP distant sur `/mcp` (Streamable HTTP), protégé par OAuth 2.1 avec PKCE, dans
  l'application (voir ADR 0003).
- Il arrive juste après les comptes (spécification 003) ; ensuite, **chaque spécification ajoute ses
  outils** en même temps que son interface et son API.
- Un outil = un service de domaine existant, les mêmes contrôles de droits que l'interface, un audit.
  Écritures idempotentes ; actions à impact avec confirmation.

## Conséquences

- Le MCP n'est jamais en retard sur l'interface : une fonction d'administration sans outil MCP
  correspondant est incomplète, sauf exception motivée.
- Tests de contrat des outils (schémas, droits, erreurs) dans `pnpm verify`.
