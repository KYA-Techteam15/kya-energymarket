# ADR 0007 — Secrets dans un fichier local, puis Infisical ; déploiement Coolify

- **Statut** : acceptée · **Date** : 2026-09-25

## Décision

- Pour aller vite : un fichier de secrets **hors du dépôt** sur le poste du responsable ; le dépôt ne
  contient que `.env.example` (noms sans valeurs). Voir
  [secrets et environnements](../operations/secrets-et-environnements.md).
- Ensuite : Infisical (comme kya-platform), mêmes noms de variables, injection au démarrage et en CI.
- Déploiement sur Coolify (équipe « KYA-TechTeam » sur Coolify Cloud), une image Docker, une
  application par environnement.

## Conséquences

- Aucune valeur secrète dans Git, les journaux ou les rapports d'agents.
- Passer à Infisical ne change pas le code : seul le chargement des variables change.
