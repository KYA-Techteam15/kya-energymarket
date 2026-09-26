# Tâches — Licences et API KYA-SolDesign

## Fondations
- [x] T001 Schéma `licenses.ts` (licences, ordinateurs activés, postes attribués) ; migration `0004_licences`
- [x] T002 Cryptographie : clés lisibles (60 bits, alphabet sans ambiguïté), chiffrement AES-256-GCM au repos, empreinte SHA-256, signature WebCrypto ECDSA P-256 au format brut du logiciel
- [x] T003 Clés de signature par environnement : `pnpm license:keygen`, clé publique dans `docs/operations/cles-licences.md`, clé éphémère en développement et en test

## Histoire 1 — Logiciel (P1)
- [x] T010 Service : émission, activation sous verrou, réactivation sans consommation, rafraîchissement aux droits du moment, libération par le poste ; descripteurs d'édition
- [x] T011 `/api/software/v1` : `time`, `products/{slug}/editions`, `licenses/activate`, `licenses/{id}/refresh`, `licenses/{id}/release` ; CORS ouvert, limitation de débit
- [x] T012 Test de contrat : `verifyLicense` du logiciel (copie fidèle) accepte le jeton, refuse un jeton altéré

## Histoire 2 — Espace client (P1)
- [x] T020 Mon espace → Licences (design v5) : clé masquée à afficher et copier, temps restant, postes, ordinateurs
- [x] T021 Libérer un poste, attribuer un poste par courriel (modèle `license-seat`) ; réservés au propriétaire

## Histoire 3 — Administration (P1)
- [x] T030 Recherche (clé, identifiant, client, courriel), émission au nom de l'organisation d'un compte
- [x] T031 Détail : clé, ordinateurs, prolonger, nombre de postes, libérer, révoquer (confirmation), journal

## Histoire 4 — MCP (P2)
- [x] T040 `find_license`, `issue_license`, `extend_license`, `set_license_seats`, `release_seat`, `revoke_license` ; portée `admin:licenses`

## Transverse
- [x] T050 Tests d'intégration (PGlite) : postes, rafale, rafraîchissement, révocation, audit ; parcours complet (Playwright)
- [x] T051 Documentation (contrat, déploiement, secrets, MCP), journal, feuille de route ; déploiement `dev`
- [ ] T052 Côté logiciel (dépôt KYA-SolDesign, T061) : `HttpAdminApi`, clé publique de production, retrait de la simulation

## Écarts constatés pendant l'implémentation

- Signature : WebCrypto côté serveur aussi, pour obtenir exactement le format brut r‖s que le logiciel vérifie (le module `crypto` de Node signe en DER par défaut).
- Le logiciel appelle depuis sa vue web : CORS ouvert et préflight `OPTIONS` sur toute l'API.
- Ajouter dans l'administration une clé de fonction inconnue d'une version du logiciel rendrait ses jetons invalides pour cette version : les clés restent celles fixées par le logiciel.
