# Tâches — Essai gratuit

- [x] T001 Schéma : `products.trial_license_type_id`, `trial_grants` (un par compte et par logiciel) ; migration `0007_essai` (type « Essai 14 jours » de KYA-SolDesign)
- [x] T002 Domaine : réglage dans le brouillon du catalogue (validation de la nature), `trialStatus`, `startTrial` (transaction, sûr en rafale), `trialFollowUp`
- [x] T003 File de travaux : courriel de clé, `trial-ending` (J−3), `trial-ended` ; modèles FR/EN
- [x] T004 Page `/essai` en quatre étapes (design v5), états connecté, actif, déjà utilisé, indisponible
- [x] T005 Console : carte « Essai gratuit » sur la fiche du logiciel ; MCP `change_catalog` (champ `trialLicenseTypeId`)
- [x] T006 Tests PGlite (contrat du jeton, rafale, relances) ; parcours Playwright (création du compte, activation, clé, logiciel)
- [x] T007 Documentation, journal ; `pnpm verify` ; déploiement `dev`
