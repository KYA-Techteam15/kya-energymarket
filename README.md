# KYA-EnergyMarket

La marketplace des logiciels de KYA-Energy Group. KYA-SolDesign d'abord, puis KYA-EcoLabel,
KYA-BusinessModel et KYA-SolMonitor.

Un visiteur découvre un logiciel, l'essaie, achète la licence qu'il veut (édition, durée, postes),
paie par Mobile Money ou carte, reçoit sa clé et sa facture d'achat, puis gère tout dans son espace.
L'équipe KYA administre le catalogue, les contenus, les offres, les commandes, les licences et le
support, depuis l'interface ou depuis Claude et Codex grâce au serveur MCP.

## État

Le dépôt contient la documentation, la constitution Spec Kit, la feuille de route et les maquettes.
Le code arrive avec la spécification 001 (socle). Voir [ROADMAP.md](ROADMAP.md).

## Pile

| Couche | Choix |
|---|---|
| Application | TanStack Start (React, rendu serveur, fonctions serveur), TypeScript strict |
| Données | Neon Postgres, Drizzle ORM, migrations versionnées |
| Comptes et OAuth | Better Auth (comptes, organisations, serveur OAuth 2.1 pour MCP) — voir ADR 0003 |
| API | REST versionnée `/api/v1`, OpenAPI, et serveur MCP `/mcp` |
| Paiement | Semoa Afrique (Mobile Money, carte), derrière un port `PaymentProvider` |
| Déploiement | Coolify, image Docker unique |
| Secrets | fichier local hors dépôt, puis Infisical |

## Carte du dépôt

| Chemin | Contenu |
|---|---|
| [PRODUCT.md](PRODUCT.md) | Le produit : utilisateurs, offre, contraintes, charte |
| [AGENTS.md](AGENTS.md) | Règles pour les agents (Claude, Codex) et les développeurs |
| [ROADMAP.md](ROADMAP.md) | Les spécifications à venir, dans l'ordre |
| [docs/](docs/index.md) | Architecture, décisions (ADR), exploitation, gouvernance, glossaire |
| [design/](design/README.md) | Toutes les maquettes ; `design/v5` est la direction retenue |
| `specs/` | Une spécification Spec Kit par fonctionnalité |
| `.specify/` | Spec Kit : constitution, modèles, scripts |

## Démarrer

1. Lire [AGENTS.md](AGENTS.md) et la [constitution](.specify/memory/constitution.md).
2. Secrets : voir [docs/operations/secrets-et-environnements.md](docs/operations/secrets-et-environnements.md).
3. Travailler par spécification : `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`,
   `/speckit-implement`, sur une branche `feat-NNN-nom` issue de `dev`.

Les commandes de développement (`pnpm dev`, `pnpm verify`…) arrivent avec la spécification 001.
