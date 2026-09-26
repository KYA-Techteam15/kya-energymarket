# Feuille de route

Une ligne = une spécification Spec Kit, sur sa branche `feat-NNN-nom`. Chaque spécification livre
une tranche verticale complète : domaine, base, interface (publique, espace client ou
administration), API REST, **outils MCP**, tests et documentation. L'ordre suit les dépendances ;
les dates se fixent spécification par spécification.

## Étape 0 — Fondations ✅

| N° | Spécification | Contenu |
|---|---|---|
| 000 | Fondations | Dépôt, documentation, constitution Spec Kit, ADR, feuille de route, maquettes `design/v1` à `v5` (v5 retenue). |

## Étape 1 — Ouvrir la boutique (première vente de KYA-SolDesign)

| N° | Spécification | Contenu | Dépend de |
|---|---|---|---|
| 001 | **Socle** | Monorepo pnpm, TanStack Start, TypeScript strict, Drizzle + projet Neon `kya-energy-market` (branches dev/test/preview), chargement et validation des secrets, charte et composants issus de `design/v5` (Poppins, Inter, JetBrains Mono), i18n FR/EN, journaux et audit, `pnpm verify` (lint, types, Vitest, Playwright), CI GitHub Actions, image Docker, santé, première page publique déployée sur Coolify. | — |
| 002 | **Comptes et organisations** | Better Auth (courriel + mot de passe, lien de connexion) ; organisation invisible par défaut (créée d'office pour un particulier, visible dès qu'on achète pour une structure ou plusieurs postes), membres, invitations, rôles propriétaire et membre ; rôles de l'équipe KYA ; coquille de l'espace client et de l'administration. ADR 0003 confirmée. | 001 |
| 003 | **Serveur MCP et OAuth (administrateurs)** | Réservé à l'équipe KYA. `/mcp` Streamable HTTP, OAuth 2.1 + PKCE, métadonnées RFC 8414 / RFC 9728, enregistrement des clients, consentement, portées, audit ; premiers outils (`whoami`, `list_my_organizations`) ; connexion testée depuis Claude et Codex ; guide de connexion. | 002 |
| 004 | **Catalogue et pages composées** | Logiciels, éditions, durées, fonctions, limites, prix par poste ; pages composées de blocs, Markdown assaini, médias ; administration et outils MCP ; pages publiques de la marketplace et de KYA-SolDesign (Présentation, Tarifs, Ressources, Support) servies depuis la base. | 002, 003 |
| 005 | **Licences et API KYA-SolDesign** | Émission de licences et jetons ECDSA compatibles, postes, `/api/software/v1` (heure, catalogue, activer, rafraîchir, libérer), espace client Licences (clé, temps restant, attribuer et libérer des postes), administration et outils MCP. Côté logiciel : T061 (`HttpAdminApi`, vraie clé publique). | 004 |
| 006 | **Essai gratuit** | Réglage de l'essai par logiciel dans l'administration, « Activer mon essai » une fois par compte, clé d'essai, parcours en quatre étapes, relances avant la fin. | 005 |
| 007 | **Achat, paiement et factures d'achat** | Page d'achat unique, commandes idempotentes, port `PaymentProvider` + Semoa (Mobile Money, carte), webhooks, rapprochement, TVA par pays, facture d'achat PDF numérotée, renouvellement et ajout de postes, devis pour les organisations, courriels transactionnels. | 005 |
| 008 | **Téléchargements et versions** | Versions logicielles (canal, notes, fichier ou lien de publication GitHub), page Nouveautés, espace Téléchargements ; outils MCP de publication. | 004 |
| 009 | **Support, avis et usage** | Demandes de support et réponses (espace client, administration, MCP), API avis et usage anonyme de KYA-SolDesign (`/feedback`, `/usage`), aide et questions fréquentes ; assistant de recherche dans la documentation. | 002, 005 |
| 010 | **Statistiques** | Tableau de bord de l'administration : ventes, licences actives, essais convertis, usage par version et édition ; outils MCP de lecture. | 007, 009 |
| 011 | **Mise en production** | Domaine, Infisical, sauvegardes et restauration testée, supervision, pages légales validées, contenus réels (photos, témoignages, prix), audit de sécurité, première version `v1.0.0`. | toutes |

## Étape 2 — Après la première version

- Tarif dégressif par nombre de postes.
- Autres moyens de paiement et fournisseurs.
- Interface en anglais complète.
- Pages de KYA-EcoLabel, KYA-BusinessModel et KYA-SolMonitor (descriptions à fournir).
- Plugin Claude KYA-EnergyMarket (skill + déclaration MCP), sur le modèle de kya-platform.
- Produits non logiciels : matériel (KYA-SoP, KYA-RemoteControl), formations, services.

## Dépendances externes à obtenir

| Besoin | Pour | Auprès de |
|---|---|---|
| Nouvelle clé API Neon de KYA | 001 | responsable (fichier de secrets) |
| Accès Semoa : documentation, sandbox, identifiants, webhooks | 007 | Semoa Afrique |
| Prix, durée d'essai, TVA par pays, mentions des factures | 004, 006, 007 | KYA (direction, comptabilité) |
| Photos, témoignages, chiffres, descriptions des autres logiciels | 004, 011 | KYA |
| Numéro WhatsApp, courriel de support, textes juridiques | 009, 011 | KYA |
| Domaine de production, fournisseur de courriel, stockage objet | 001, 007, 011 | responsable technique |

## Côté KYA-SolDesign

- T061 : brancher l'API réelle (spécification 005).
- Vocabulaire : « Devis » remplace « facture proforma » dans le logiciel.
- Connexion au compte depuis le logiciel (OAuth, navigateur système) et activation d'une clé d'essai.
