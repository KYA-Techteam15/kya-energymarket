# Tâches — Offre modulable et console d'administration

## Fondations
- [x] T001 Schéma : éditions (profil, caractéristiques, visible, en vente, archivée), `license_types`, `catalog_drafts`, licences (type, copie figée, canal, lot, destinataire), `license_batches`, `jobs` ; migrations `0005_offre` (reprise des données) et `0006_offre_nettoyage`
- [x] T002 Domaine catalogue : lecture publique et complète avec types de licence ; brouillon, changements typés, validation, publication, abandon
- [x] T003 Domaine licences : émission avec copie figée, début à l'activation, jeton (profil, code de formule), rattachement par courriel et par clé
- [x] T004 Domaine lots : génération idempotente (courriels, organisation, clés), actions groupées
- [x] T005 File de travaux : mise en file, exécution, reprise ; courriel `license-key` (FR/EN)
- [x] T006 Statistiques : vendu, offert, essais, conversions, ordinateurs actifs, série hebdomadaire, à traiter

## Histoire 1 et 4 — Console (P1)
- [x] T010 Coquille de la console : menu par domaine filtré par rôle, barre, environnement, Ctrl K, panneau, notifications ; site sans en-tête sous `/admin`
- [x] T011 Tableau de bord
- [x] T012 Catalogue : logiciels, logiciel (fiche, éditions, ordre, interrupteurs, fonctions), édition (droits, caractéristiques, types), barre de brouillon
- [x] T013 Journal ; pages, médias, équipe et MCP dans la coquille

## Histoire 2 et 3 — Licences et lots (P1)
- [x] T020 Licences : vues, recherche, filtres, sélection et actions groupées, panneau de licence, émission
- [x] T021 Lots : liste, fiche (activation, CSV, prolonger, révoquer, renvoyer), assistant en quatre étapes
- [x] T022 Espace client : types et dates, licences non activées, « Ajouter une clé », rattachement par courriel

## Histoire 5 — MCP (P2)
- [x] T030 Catalogue : `get_product` (brouillon compris), `change_catalog`, `publish_catalog`, `discard_catalog_draft`
- [x] T031 Licences : `issue_license` (copie figée), `generate_license_batch`, `find_batches`, `license_stats`

## Transverse
- [x] T040 Pages publiques, API catalogue et API du logiciel sur les types de licence et les drapeaux visible et en vente
- [x] T041 Tests PGlite ; parcours Playwright (console, lot, Ctrl K, publication, tarifs) avec axe
- [ ] T042 Documentation (glossaire, contrat, MCP, feuille de route), journal ; `pnpm verify` ; déploiement `dev`
