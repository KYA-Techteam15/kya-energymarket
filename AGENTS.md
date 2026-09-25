# Règles du dépôt KYA-EnergyMarket

Ce fichier s'applique à toute personne et à tout agent (Claude Code, Codex) qui travaille ici. La
[constitution](.specify/memory/constitution.md) prévaut en cas de doute.

## Langue et vocabulaire

- Documentation, spécifications, interface et messages de commit en **français**. Identifiants de
  code en anglais.
- Noms exacts : **KYA-EnergyMarket**, **KYA-SolDesign**, **KYA-Energy Group**. Jamais « SolDesign »
  seul.
- **Devis** : document que l'utilisateur de KYA-SolDesign remet à son client final. **Facture
  d'achat** : ce que KYA-EnergyMarket envoie à son client après paiement. **Documents techniques** :
  pour les techniciens. Le terme « facture proforma » n'est plus employé. Voir
  [docs/glossaire.md](docs/glossaire.md).

## Branches et commits

- `main` : versions publiées, chaque commit reçoit une étiquette SemVer annotée.
- `dev` : intégration. Seule `dev` fusionne vers `main`.
- `feat-NNN-nom` : une branche par spécification, issue de `dev`, qui revient dans `dev`. Elle
  correspond au dossier `specs/NNN-nom/` (Spec Kit ne crée pas la branche : la créer avec
  `git switch -c feat-NNN-nom dev`, puis lancer `/speckit-specify`).
- Commits en français, au format `type(portée): résumé` (`feat`, `fix`, `docs`, `chore`, `test`,
  `refactor`). Pas de `--no-verify`.
- Ne jamais pousser directement sur `main`. Pousser une étiquette `v*` = publier : seulement à la
  demande du responsable.

## Cycle Spec Kit

`/speckit-specify` → `/speckit-clarify` si besoin → `/speckit-plan` → `/speckit-tasks` →
`/speckit-analyze` → `/speckit-implement` → `/speckit-converge`. Chaque plan déclare sa conformité à
la constitution. Une décision structurante donne un ADR dans `docs/adr/`.

## Architecture en une phrase

Une application TanStack Start ; toute règle métier vit dans la couche `domain`, que réutilisent les
pages, les fonctions serveur, l'API REST, le serveur MCP et les tâches de fond. Voir
[docs/architecture/vue-ensemble.md](docs/architecture/vue-ensemble.md).

- Aucune règle métier dans un composant d'interface ni dans un gestionnaire HTTP ou MCP.
- Toute autorisation est décidée côté serveur. Un outil MCP vérifie les droits comme l'API.
- Toute écriture passe par un service de domaine, dans une transaction, et laisse une trace d'audit.
- Les montants sont des entiers en FCFA ; les dates sont en UTC, affichées dans le fuseau de
  l'utilisateur.

## Secrets

- Aucun secret dans Git, dans les journaux, dans les réponses MCP ou dans les tables métier.
- Poste local : fichier hors dépôt, voir
  [docs/operations/secrets-et-environnements.md](docs/operations/secrets-et-environnements.md). Le
  dépôt ne contient que `.env.example` (noms, sans valeurs).
- Ne jamais afficher la valeur d'un secret dans un terminal ou un rapport, même pour vérifier : ne
  montrer que le nom de la variable et « rempli » ou « vide ».

## Qualité

- TypeScript strict, pas de `any` non justifié. Tests avec le comportement : Vitest (domaine,
  contrats), Playwright (parcours), tests de contrat pour l'API REST, MCP et l'API KYA-SolDesign.
- Interfaces : charte et composants de `design/v5`, accessibles au clavier, contraste AA, testées sur
  mobile.
- La porte `pnpm verify` doit être verte avant toute fusion (arrive avec la spécification 001).

## Données de démonstration

Toute valeur provisoire (prix, témoignages, chiffres) est marquée « exemple » dans l'interface et ne
part jamais en production comme une donnée réelle.
