# Spécification : Licences et API KYA-SolDesign

**Branche** : `feat-005-licences` · **Dossier** : `specs/005-licences`
**Créée** : 2026-09-26 · **Statut** : implémentée

**Demande** : phase 5 de la feuille de route. La plateforme émet les licences et les jetons signés que
KYA-SolDesign vérifie hors ligne, expose l'API `/api/software/v1` que le logiciel appelle aujourd'hui
en simulation, et donne au client (espace Licences) comme à l'équipe (administration, MCP) la main
sur les licences et leurs postes. Références : [contrat KYA-SolDesign](../../docs/architecture/contrat-kya-soldesign.md),
ADR 0006. Le format du jeton est celui du logiciel, à l'octet près.

## Scénarios et tests *(obligatoire)*

### Histoire 1 — Le logiciel s'active et se tient à jour (P1)

1. **Étant donné** une clé valide, **quand** KYA-SolDesign appelle `POST /licenses/activate` avec la clé
   et l'identifiant du poste, **alors** il reçoit un jeton signé ECDSA P-256 que sa clé publique
   embarquée vérifie ; le poste occupe un poste de la licence.
2. **Étant donné** un poste déjà actif, **quand** il se réactive, **alors** il reçoit un jeton neuf sans
   consommer de poste.
3. **Étant donné** tous les postes occupés, **quand** un nouvel ordinateur s'active, **alors** la réponse
   est `SEATS_EXHAUSTED` ; une clé inconnue ou révoquée donne `KEY_UNKNOWN`.
4. **Étant donné** un poste actif, **quand** il rafraîchit (`POST /licenses/{id}/refresh`), **alors** il
   reçoit un jeton aux droits et aux dates du moment (renouvellement, changement d'offre) ; un poste
   libéré reçoit `DEVICE_RELEASED`, une licence révoquée `LICENSE_REVOKED`, une licence inconnue
   `LICENSE_UNKNOWN`.
5. **Étant donné** un poste, **quand** il se libère (`POST /licenses/{id}/release`), **alors** le poste
   redevient libre (204).
6. `GET /time` rend l'heure du serveur ; `GET /products/kya-soldesign/editions` rend les éditions,
   fonctions, limites, filigranes, délais de grâce et durées, lus dans le catalogue.

### Histoire 2 — Le client gère ses licences (P1)

1. **Étant donné** un membre d'une organisation qui a une licence, **quand** il ouvre Mon espace →
   Licences, **alors** il voit le logiciel, l'édition, la durée et les dates, l'état, la clé (masquée,
   à afficher et copier), le temps restant et les postes utilisés.
2. **Étant donné** la liste des ordinateurs activés, **quand** le propriétaire libère un poste, **alors**
   l'ordinateur passe en lecture seule à sa prochaine connexion et le poste est aussitôt libre.
3. **Étant donné** un poste libre, **quand** le propriétaire l'attribue à un collègue (courriel),
   **alors** le collègue reçoit la clé et la marche à suivre par courriel.
4. Un membre (non propriétaire) voit les licences mais ne libère ni n'attribue.

### Histoire 3 — L'équipe administre les licences (P1)

1. **Étant donné** Administration → Licences, **quand** l'équipe cherche une clé, un client ou un
   courriel, **alors** elle trouve la licence, ses postes et son journal.
2. **Étant donné** un client, **quand** l'équipe émet une licence (édition, durée, postes), **alors** une
   clé est créée au nom de son organisation, tracée dans l'audit.
3. **Étant donné** une licence, **quand** l'équipe la prolonge, change son nombre de postes, libère un
   poste ou la révoque (avec confirmation), **alors** le logiciel en tient compte au prochain
   rafraîchissement.

### Histoire 4 — Depuis Claude ou Codex (P2)

`find_license` (`admin:read`) ; `issue_license`, `extend_license`, `set_license_seats`,
`release_seat`, `revoke_license` (`admin:licenses`), avec les droits d'équipe `licenses:write` et
`licenses:revoke`.

### Cas limites

- Deux activations simultanées sur le dernier poste : une seule passe.
- Clé saisie en minuscules ou avec des espaces : acceptée.
- Licence échue : l'activation et le rafraîchissement rendent un jeton échu (le logiciel passe en
  lecture seule après la grâce) ; rien n'est effacé.
- Trop de tentatives d'activation : refus temporaire (`RATE_LIMITED`, 429).

## Exigences *(obligatoire)*

- **FR-001** : Licence : logiciel, édition, durée, postes, organisation titulaire, début, fin, état
  (active, révoquée), origine (achat, essai, émission manuelle), nom affiché.
- **FR-002** : Clé lisible `KYA-COM-12M-XXXX-XXXX-XXXX` (60 bits aléatoires, alphabet sans
  caractères ambigus), conservée chiffrée (AES-256-GCM) et retrouvée par son empreinte.
- **FR-003** : Jeton : `base64url(JSON) + "." + base64url(signature)`, ECDSA P-256 / SHA-256 au format
  brut (r‖s, comme WebCrypto), charge utile `LicensePayload` du logiciel ; droits calculés depuis
  le catalogue à chaque émission ; `offlineDays` 30.
- **FR-004** : Clés de signature par environnement (`LICENSE_SIGNING_PRIVATE_KEY`, JWK), jamais
  journalisées ; en développement et en test, une clé éphémère si aucune n'est fournie.
- **FR-005** : API `/api/software/v1` : `time`, `products/{slug}/editions`, `licenses/activate`,
  `licenses/{id}/refresh`, `licenses/{id}/release` ; codes d'erreur du contrat ; limitation de débit.
- **FR-006** : Postes : un poste par ordinateur actif ; réactivation sans consommation ; libération
  immédiate côté plateforme, effective au prochain rafraîchissement.
- **FR-007** : Espace client Licences (design v5) ; libérer et attribuer réservés au propriétaire.
- **FR-008** : Administration Licences : recherche, détail, émission, prolongation, postes, révocation,
  journal ; droits `licenses:read|write|revoke`.
- **FR-009** : Outils MCP de l'histoire 4 ; portée `admin:licenses`.
- **FR-010** : Audit : émission, activation, libération, prolongation, changement de postes,
  révocation, attribution.
- **FR-011** : Test de contrat : un jeton émis par la plateforme est vérifié par le code de
  vérification du logiciel (copie fidèle), et sa charge utile a la forme attendue.

## Critères de succès *(obligatoire)*

- **SC-001** : Un jeton de la plateforme passe `verifyLicense` du logiciel (test de contrat).
- **SC-002** : Le parcours activer → rafraîchir → libérer dans l'espace → `DEVICE_RELEASED` passe en
  test de parcours sur la version construite.
- **SC-003** : Aucune activation au-delà du nombre de postes, même en concurrence (test).

## Hypothèses

- L'achat (spec 007) et l'essai (spec 006) créeront des licences par le même service ; d'ici là,
  l'équipe les émet dans l'administration ou par le MCP.
- Côté logiciel, T061 (`HttpAdminApi`, clé publique de production) suit dans le dépôt KYA-SolDesign.
- `/usage` et `/feedback` arrivent avec la spécification 009.
