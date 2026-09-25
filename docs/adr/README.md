# Décisions d'architecture (ADR)

Une décision structurante = un fichier `NNNN-titre.md` : contexte, options, décision, conséquences,
condition de révision. Statuts : **acceptée** (décidée par le responsable), **proposée** (à confirmer
par la recherche de la spécification concernée), **remplacée**.

| N° | Décision | Statut |
|---|---|---|
| [0001](0001-application-tanstack-start-unique.md) | Une seule application TanStack Start, sans backend séparé | acceptée |
| [0002](0002-neon-drizzle.md) | Neon Postgres avec Drizzle, une branche par environnement | acceptée |
| [0003](0003-comptes-et-oauth-better-auth.md) | Comptes, organisations et serveur OAuth 2.1 avec Better Auth | proposée |
| [0004](0004-mcp-oauth.md) | Serveur MCP distant protégé par OAuth, dès le départ | acceptée |
| [0005](0005-paiement-semoa-port.md) | Paiement derrière un port, Semoa en premier | acceptée |
| [0006](0006-licences-signees-compatibles.md) | Licences signées ECDSA compatibles avec KYA-SolDesign | acceptée |
| [0007](0007-secrets-env-puis-infisical.md) | Secrets dans un fichier local, puis Infisical ; déploiement Coolify | acceptée |
| [0008](0008-contenus-blocs-markdown.md) | Pages composées de blocs et Markdown assaini | acceptée |
