# Spécification : Comptes, organisations et rôles

**Branche** : `feat-002-comptes` · **Dossier** : `specs/002-comptes`
**Créée** : 2026-09-26 · **Statut** : prête pour le plan

**Demande** : phase 2 de la feuille de route — comptes (courriel et mot de passe, lien de connexion),
organisation invisible par défaut, membres et invitations, rôles propriétaire et membre, rôles de
l'équipe KYA, coquilles de l'espace client et de l'administration. Décisions déjà prises : MCP réservé
aux administrateurs KYA (spécification 003) ; organisation invisible par défaut.

## Scénarios et tests *(obligatoire)*

### Histoire 1 — Créer son compte et se connecter (P1)

Un étudiant crée son compte avec son nom, son courriel et un mot de passe, puis se connecte et se
déconnecte. Il ne voit jamais le mot « organisation ».

**Test indépendant** : créer un compte, se déconnecter, se reconnecter ; recharger la page reste
connecté.

**Scénarios d'acceptation** :

1. **Étant donné** la page `Se connecter`, **quand** le visiteur remplit « Créer un compte » (nom,
   courriel, mot de passe de 10 caractères au moins, acceptation des conditions), **alors** son compte
   est créé, il est connecté et arrive dans son espace.
2. **Étant donné** un compte, **quand** la personne se connecte avec de bons identifiants, **alors**
   elle arrive dans son espace ; avec de mauvais, un message neutre s'affiche (sans dire lequel est faux).
3. **Étant donné** une personne connectée, **quand** elle recharge la page, **alors** elle reste
   connectée ; **quand** elle choisit « Se déconnecter », **alors** la session est close.
4. **Étant donné** un visiteur non connecté, **quand** il ouvre une page de l'espace client, **alors**
   il est envoyé vers `Se connecter`, puis ramené à la page demandée après connexion.
5. **Étant donné** un courriel déjà utilisé, **quand** on crée un compte avec, **alors** un message
   clair invite à se connecter.

### Histoire 2 — Organisation invisible, puis visible quand elle sert (P1)

Chaque compte reçoit d'office une organisation personnelle, jamais montrée. Un bureau d'études qui
achète pour sa structure crée son organisation, qui devient alors visible dans son espace.

**Scénarios d'acceptation** :

1. **Étant donné** un compte neuf, **quand** il est créé, **alors** une organisation personnelle
   existe, dont il est propriétaire, active dans sa session, et l'interface n'en parle pas.
2. **Étant donné** un compte, **quand** il choisit « Acheter pour une organisation » puis donne la
   raison sociale, **alors** une organisation d'entreprise est créée, il en est propriétaire, elle
   devient active et la rubrique « Organisation » apparaît dans son espace.
3. **Étant donné** la rubrique Organisation, **quand** le propriétaire modifie la raison sociale,
   **alors** elle est enregistrée et tracée dans l'audit.

### Histoire 3 — Inviter un collègue (P2)

Le propriétaire d'une organisation d'entreprise invite un collègue par courriel ; celui-ci accepte
avec son compte et devient membre.

**Scénarios d'acceptation** :

1. **Étant donné** un propriétaire, **quand** il invite un courriel, **alors** une invitation valable
   7 jours est créée ; tant qu'aucun fournisseur de courriel n'est branché, le lien d'invitation est
   affiché pour être copié.
2. **Étant donné** un lien d'invitation, **quand** la personne invitée l'ouvre connectée avec ce
   courriel, **alors** elle accepte et devient membre ; avec un autre courriel, elle est refusée.
3. **Étant donné** un membre, **quand** il ouvre la rubrique Organisation, **alors** il voit les
   membres mais ne peut ni inviter ni retirer ; le propriétaire peut retirer un membre.

### Histoire 4 — L'équipe KYA accède à l'administration (P2)

Un administrateur KYA ouvre `/admin` ; un client ne le peut pas. Un administrateur attribue un rôle
d'équipe à un collègue.

**Scénarios d'acceptation** :

1. **Étant donné** un compte client, **quand** il ouvre `/admin`, **alors** l'accès est refusé (page
   « accès réservé ») et l'en-tête ne propose pas l'administration.
2. **Étant donné** le tout premier administrateur, **quand** le responsable lance
   `pnpm staff:grant --email … --role kya_admin`, **alors** le compte reçoit le rôle, tracé dans l'audit.
3. **Étant donné** un administrateur KYA, **quand** il ouvre `/admin`, **alors** il voit la coquille
   de l'administration et la liste de l'équipe ; il peut attribuer ou retirer les rôles
   `kya_admin`, `kya_sales`, `kya_content`, `kya_support`.

### Histoire 5 — Lien de connexion par courriel (P3)

Quand un fournisseur de courriel est configuré, on peut se connecter par un lien reçu par courriel.

**Scénarios d'acceptation** :

1. **Étant donné** un fournisseur configuré, **quand** la personne demande un lien, **alors** un lien
   à usage unique valable 10 minutes est envoyé.
2. **Étant donné** aucun fournisseur (situation actuelle), **quand** la page s'affiche, **alors**
   l'option n'est pas proposée ; en développement seulement, le lien s'écrit dans le journal local.

### Cas limites

- Deux onglets : se déconnecter dans l'un déconnecte l'autre au prochain appel.
- Mot de passe trop court, courriel mal formé : erreurs nommées, dans la langue de la page.
- Invitation expirée, déjà acceptée ou annulée : message clair, aucun changement.
- Le dernier propriétaire d'une organisation ne peut ni partir ni être retiré.
- Suppression de compte : hors de cette spécification (spécification 011, conformité).

## Exigences *(obligatoire)*

- **FR-001** : Comptes par courriel et mot de passe (10 caractères au moins), sessions par cookie
  sécurisé (`HttpOnly`, `Secure` hors local, `SameSite=Lax`), durée 30 jours glissants.
- **FR-002** : Une organisation personnelle est créée à l'inscription, active par défaut, jamais
  affichée. Une organisation d'entreprise se crée à la demande et devient visible.
- **FR-003** : Rôles d'organisation : `owner` (propriétaire) et `member` (membre) uniquement.
- **FR-004** : Invitations par courriel, 7 jours, rôle `member` ; lien affiché tant qu'aucun
  fournisseur de courriel n'est configuré.
- **FR-005** : Rôles de l'équipe KYA, distincts des rôles clients : `kya_admin`, `kya_sales`,
  `kya_content`, `kya_support`. Seul `kya_admin` attribue les rôles d'équipe.
- **FR-006** : `/espace/*` exige une session ; `/admin/*` exige un rôle d'équipe. Contrôle côté
  serveur, jamais seulement dans l'interface.
- **FR-007** : Commande `pnpm staff:grant` pour nommer le premier administrateur.
- **FR-008** : L'en-tête affiche « Se connecter » ou le menu « Mon espace » (tableau de bord,
  organisation si visible, administration si rôle d'équipe, se déconnecter).
- **FR-009** : Audit : création de compte, création et modification d'organisation, invitation,
  acceptation, retrait de membre, attribution et retrait de rôle d'équipe.
- **FR-010** : Tous les textes en français et en anglais ; pages fidèles à `design/v5` (connexion,
  espace, organisation).
- **FR-011** : Limitation des tentatives de connexion (anti force brute).
- **FR-012** : Lien de connexion par courriel derrière un port `Mailer` ; désactivé sans fournisseur.
- **FR-013** : Le code est rangé par fonctionnalité ; la configuration de Better Auth vit dans un paquet
  réutilisable par le serveur MCP (spécification 003).

### Entités

- **Compte** (`user`) : nom, courriel, courriel vérifié, rôle d'équipe éventuel.
- **Session** : jeton, expiration, organisation active.
- **Organisation** : nom, identifiant d'adresse, nature (`personal` ou `company`).
- **Membre** : compte, organisation, rôle (`owner`, `member`).
- **Invitation** : courriel, organisation, rôle, état, expiration, auteur.

## Critères de succès *(obligatoire)*

- **SC-001** : Créer un compte prend moins d'une minute, sans jamais voir le mot « organisation ».
- **SC-002** : Aucune page de l'espace ou de l'administration n'est servie sans le droit requis
  (tests de parcours et d'accès serveur).
- **SC-003** : 100 % des actions listées en FR-009 laissent une trace d'audit (tests).
- **SC-004** : Aucune violation axe sur les pages de connexion, d'espace et d'administration.

## Hypothèses

- Pas encore de fournisseur de courriel : vérification du courriel non obligatoire, lien de connexion
  désactivé, invitations par lien copié. Tout se branche sans rupture dès le fournisseur choisi.
- Connexion Google ou autre : hors de cette spécification.
- Les tests de parcours utilisent une base Postgres dédiée (conteneur en CI, branche Neon `test` en
  local).
