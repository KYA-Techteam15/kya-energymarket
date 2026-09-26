# Spécification : Essai gratuit

**Branche** : `feat-006-essai` · **Dossier** : `specs/006-essai`
**Créée** : 2026-09-26 · **Statut** : en cours

**Demande** : phase 6 de la feuille de route. Un visiteur essaie KYA-SolDesign une fois par compte,
depuis la page Essai, en quatre étapes (maquette `design/v5/essai.html`). Depuis la spécification
005b, un essai est une licence d'un **type de licence de nature « essai »** : durée, édition et droits
se règlent dans la console, sans développement.

## Scénarios et tests *(obligatoire)*

### Histoire 1 — Essayer en quatre étapes (P1)

1. **Étant donné** un visiteur sans compte, **quand** il ouvre `/essai`, **alors** la première étape
   l'invite à se connecter ou à créer son compte, et le ramène ensuite à la page Essai.
2. **Étant donné** une personne connectée à l'adresse vérifiée, **quand** elle clique « Activer mon
   essai », **alors** une licence d'essai est émise à son nom (organisation d'entreprise sinon
   personnelle), valable dès maintenant pour la durée du type d'essai ; la clé s'affiche avec la date
   de fin et part aussi par courriel.
3. **Étant donné** l'essai actif, **alors** la troisième étape propose de télécharger le logiciel et
   la quatrième explique comment l'activer (coller la clé, ou plus tard se connecter depuis le
   logiciel).
4. **Étant donné** un compte qui a déjà utilisé l'essai de ce logiciel, **quand** il ouvre la page,
   **alors** le bouton est remplacé par « Essai utilisé le … » et renvoie vers les tarifs ; la
   licence d'essai reste visible dans son espace.

### Histoire 2 — Régler l'essai dans la console (P1)

1. **Étant donné** la fiche d'un logiciel dans la console, **quand** l'équipe choisit le type de
   licence d'essai (parmi les types de nature « essai ») ou « aucun essai », **alors** le choix passe
   par le brouillon et s'applique à la publication.
2. Sans essai réglé, la page Essai l'annonce et propose les tarifs.

### Histoire 3 — Relancer avant la fin (P2)

1. Trois jours avant la fin, un courriel rappelle la date de fin et propose les tarifs.
2. À la fin, un courriel propose d'acheter ; aucun courriel si l'organisation a acheté entre-temps ou
   si la licence a été révoquée.

### Cas limites

- Deux clics simultanés sur « Activer mon essai » : un seul essai.
- Adresse non vérifiée : l'essai attend la vérification (lien renvoyé).
- Type d'essai archivé ou retiré : la page annonce que l'essai n'est pas disponible.
- Plusieurs comptes pour une même personne : non traité ici (un essai par compte, comme annoncé).

## Exigences *(obligatoire)*

- **FR-001** : Réglage par logiciel : type de licence d'essai (nature `trial`), dans le brouillon du
  catalogue ; contenu initial : « Essai 14 jours » de l'édition Commerciale, masqué et hors vente.
- **FR-002** : Un essai par compte et par logiciel (`trial_grants`, unicité compte + logiciel).
- **FR-003** : L'essai est une licence du canal `trial`, montant 0, émise par le même service que
  les autres (copie figée) ; début immédiat.
- **FR-004** : Page `/essai?logiciel=…` : quatre étapes, états « à connecter », « à activer »,
  « actif », « déjà utilisé », « indisponible » ; FR/EN ; accessible au clavier.
- **FR-005** : Courriels `license-key` (clé), `trial-ending` (J−3) et `trial-ended` (fin), par la file
  de travaux, annulés s'il y a eu achat ou révocation.
- **FR-006** : Statistiques existantes (essais, conversions) alimentées sans changement.

## Critères de succès *(obligatoire)*

- **SC-001** : Parcours Playwright : créer son compte depuis la page Essai, activer, voir la clé et
  la date de fin, recevoir le courriel ; second passage : « Essai utilisé ».
- **SC-002** : Le jeton de l'essai passe `verifyLicense` du logiciel (test de contrat).
- **SC-003** : Deux activations simultanées ne donnent qu'un essai (test).
