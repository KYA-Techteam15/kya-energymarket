# Spécification : Socle applicatif

**Branche** : `feat-001-socle` · **Dossier** : `specs/001-socle`
**Créée** : 2026-09-25 · **Statut** : prête pour le plan

**Demande** : « Commence par la phase 1. Suis le design validé (v5). Utilise bien le code couleur de
KYA. Bonnes pratiques, outils fournis par Neon, skills. Implémente le multilangue. »

## Scénarios et tests *(obligatoire)*

### Histoire 1 — Un visiteur découvre la marketplace (P1)

Un installateur de Lomé ouvre KYA-EnergyMarket sur son téléphone. Il voit l'en-tête de la
marketplace, la promesse, KYA-SolDesign présenté comme disponible, les logiciels à venir, le parcours
« essayer → acheter → tout gérer », KYA-Energy Group et les questions fréquentes, dans la charte KYA
de la maquette v5.

**Pourquoi P1** : c'est la preuve visible que le socle (charte, composants, rendu serveur, mise en
ligne) fonctionne ; toutes les spécifications suivantes s'y appuient.

**Test indépendant** : ouvrir `/` sur mobile et sur ordinateur, comparer à `design/v5/index.html`.

**Scénarios d'acceptation** :

1. **Étant donné** un visiteur sans préférence, **quand** il ouvre `/`, **alors** la page s'affiche en
   français, rendue par le serveur, avec l'en-tête `KYA-EnergyMarket · Logiciels ▾ · Aide · FR ▾ ·
   Se connecter`, fidèle à la maquette v5.
2. **Étant donné** un téléphone de 390 px, **quand** la page s'affiche, **alors** aucun défilement
   horizontal, le menu passe dans un bouton, les actions restent atteignables.
3. **Étant donné** la navigation au clavier seule, **quand** le visiteur parcourt la page, **alors**
   chaque lien et bouton reçoit un focus visible et un lien « Aller au contenu » est proposé.
4. **Étant donné** une valeur provisoire (chiffre, photo), **quand** elle s'affiche, **alors** elle
   porte l'étiquette « exemple » ou « Photo d'illustration ».

### Histoire 2 — Un visiteur lit le site en anglais (P1)

Une chargée de projet d'une institution internationale préfère l'anglais. Elle bascule la langue ; le
site reste en anglais dans toutes les pages et à sa prochaine visite.

**Pourquoi P1** : le multilangue est demandé dès le socle ; le prévoir plus tard coûterait une reprise
de toutes les pages.

**Test indépendant** : ouvrir `/en`, basculer FR/EN depuis l'en-tête, recharger, revenir.

**Scénarios d'acceptation** :

1. **Étant donné** `/en`, **quand** la page s'affiche, **alors** tous les textes sont en anglais et
   `<html lang="en">`.
2. **Étant donné** la page française, **quand** le visiteur choisit « English » dans le menu `FR ▾`,
   **alors** il arrive sur l'adresse anglaise équivalente et son choix est mémorisé.
3. **Étant donné** un navigateur réglé en anglais sans choix mémorisé, **quand** il ouvre `/`,
   **alors** la page anglaise est proposée ; le français reste la langue par défaut sinon.
4. **Étant donné** toute page, **quand** un moteur de recherche la lit, **alors** elle déclare ses
   versions linguistiques (`hreflang`) et son adresse canonique.

### Histoire 3 — Un développeur démarre et vérifie le projet (P2)

Un développeur de KYA clone le dépôt, relie le fichier de secrets, lance l'application et la porte
de qualité, puis crée une migration.

**Pourquoi P2** : sans cela, aucune spécification suivante ne peut avancer sereinement.

**Test indépendant** : sur un poste neuf, suivre `quickstart.md` jusqu'à `pnpm verify` vert.

**Scénarios d'acceptation** :

1. **Étant donné** le fichier de secrets du poste, **quand** le développeur lance `pnpm env:link` puis
   `pnpm dev`, **alors** l'application démarre sur `http://localhost:3000`.
2. **Étant donné** une variable obligatoire absente, **quand** l'application démarre, **alors** elle
   s'arrête avec le **nom** de la variable, jamais sa valeur.
3. **Étant donné** le projet Neon `kya-energy-market`, **quand** le développeur lance
   `pnpm db:migrate`, **alors** les migrations s'appliquent par la connexion directe (sans pooler).
4. **Étant donné** une modification, **quand** il lance `pnpm verify`, **alors** formatage, analyse
   statique, types, tests unitaires, tests de parcours, contrôle d'accessibilité, recherche de
   secrets et construction passent ou échouent avec un message clair.

### Histoire 4 — L'exploitation suit l'état et publie (P2)

L'équipe voit si l'application et la base répondent ; chaque pull request passe la porte de qualité ;
une image se construit et se déploie sur Coolify.

**Test indépendant** : appeler `/api/health`, ouvrir une pull request, construire l'image.

**Scénarios d'acceptation** :

1. **Étant donné** l'application démarrée, **quand** on appelle `GET /api/health`, **alors** elle
   répond l'état, la version et l'état de la base, sans aucun secret.
2. **Étant donné** la base injoignable, **quand** on appelle la santé, **alors** la réponse l'indique
   (statut dégradé) sans faire tomber l'application.
3. **Étant donné** une pull request vers `dev`, **quand** elle est ouverte, **alors** la CI lance la
   porte de qualité et vérifie le sens des branches (`feat-* → dev`, `dev → main`).
4. **Étant donné** le Dockerfile, **quand** l'image est construite, **alors** elle démarre sans outils
   de développement, en utilisateur non privilégié, et répond à la santé.

### Histoire 5 — Toute action sensible laisse une trace (P3)

Les futures actions de l'administration, du MCP et des paiements disposent déjà d'un journal
structuré et d'une table d'audit.

**Scénarios d'acceptation** :

1. **Étant donné** un appel au service d'audit, **quand** il enregistre une action, **alors** l'acteur,
   l'action, la ressource, le résultat et l'horodatage UTC sont conservés.
2. **Étant donné** un journal applicatif contenant une clé connue (`token`, `secret`, `password`…),
   **quand** il est écrit, **alors** la valeur est masquée.

### Cas limites

- Adresse en langue inconnue (`/de/...`) : page 404 localisée dans la langue par défaut.
- Cookie de langue invalide : ignoré, stratégie suivante appliquée.
- Neon en veille (scale-to-zero) : la première requête peut prendre quelques centaines de
  millisecondes ; la santé ne doit pas expirer pour autant.
- Polices non chargées (réseau lent) : repli système lisible, sans décalage de mise en page gênant.
- JavaScript désactivé : la page d'accueil reste lisible et les liens fonctionnent.

## Exigences *(obligatoire)*

### Fonctionnelles

- **FR-001** : Le dépôt DOIT être un espace de travail pnpm (application web + paquets `config`, `db`,
  `domain`, `ui`), en TypeScript strict.
- **FR-002** : L'application DOIT utiliser TanStack Start avec rendu serveur.
- **FR-003** : La charte DOIT reprendre exactement les cinq couleurs du logo KYA : vert `#1ca18c`,
  orange `#f99d32`, blanc `#ffffff`, jaune `#e8e748`, café `#875028`. Toute autre teinte (encre,
  fonds, états) DOIT être **dérivée** de ces couleurs (mélange avec du noir ou du blanc), jamais
  choisie à la main. L'orange est réservé aux actions d'achat.
- **FR-004** : Le texte DOIT respecter le contraste AA : un texte sur fond vert ou un texte vert
  utilise une nuance dérivée assez sombre ; un texte sur l'orange est sombre.
- **FR-005** : Les polices de la charte (Poppins pour les titres, Inter pour le texte, JetBrains Mono
  pour les nombres) DOIVENT être servies par l'application elle-même, sous-ensemble latin, avec
  repli système.
- **FR-006** : Les composants de base (boutons, en-têtes marketplace et logiciel, pied de page, menus
  déroulants, étiquette « exemple », icônes dessinées) DOIVENT reproduire la maquette `design/v5`.
- **FR-007** : Tous les textes d'interface DOIVENT venir de catalogues de messages français et
  anglais ; le français est la langue de base. Adresses : français sans préfixe, anglais sous `/en`.
- **FR-008** : La langue DOIT se déterminer par l'adresse, puis le choix mémorisé, puis la langue du
  navigateur, puis le français.
- **FR-009** : Les pages DOIVENT déclarer `lang`, `hreflang` et l'adresse canonique.
- **FR-010** : Les variables d'environnement DOIVENT être validées au démarrage ; une erreur nomme la
  variable sans afficher de valeur. Le dépôt ne contient que `.env.example`.
- **FR-011** : Une commande DOIT relier le fichier de secrets du poste à `.env.local`.
- **FR-012** : La base DOIT être un projet Neon dédié `kya-energy-market` (organisation KYA) avec les
  branches `main`, `dev` et `test` ; l'application utilise la connexion **poolée**, les migrations la
  connexion **directe**.
- **FR-013** : Le schéma et les migrations DOIVENT être gérés par Drizzle, versionnés dans le dépôt.
- **FR-014** : Une table d'audit et un service d'audit DOIVENT exister.
- **FR-015** : Les journaux DOIVENT être structurés (JSON) et masquer les valeurs sensibles.
- **FR-016** : `GET /api/health` DOIT renvoyer état, version et état de la base.
- **FR-017** : `pnpm verify` DOIT enchaîner formatage, analyse statique, types, tests unitaires et
  d'intégration, construction, tests de parcours avec contrôle d'accessibilité, recherche de secrets.
- **FR-018** : La CI GitHub DOIT exécuter la porte de qualité sur chaque pull request et vérifier le
  sens des branches.
- **FR-019** : Une image Docker de production DOIT être construite (multi-étapes, utilisateur non
  privilégié) et déployable sur Coolify.
- **FR-020** : Une page 404 localisée DOIT exister.

### Entités

- **Événement d'audit** : acteur (type et identifiant), action, ressource (type et identifiant),
  résultat, détails non sensibles, horodatage UTC.

## Critères de succès *(obligatoire)*

- **SC-001** : Sur mobile simulé (Lighthouse, 4G lente), l'accueil obtient au moins 90 en
  performance et 100 en accessibilité.
- **SC-002** : Aucune violation axe sur l'accueil, en français et en anglais.
- **SC-003** : Le poids transféré de l'accueil (HTML, CSS, JS, polices, hors photo) reste sous
  250 Ko.
- **SC-004** : 100 % des textes visibles de l'accueil existent en français et en anglais.
- **SC-005** : Un développeur passe de `git clone` à `pnpm verify` vert en moins de 15 minutes en
  suivant `quickstart.md`.
- **SC-006** : Aucune valeur secrète n'apparaît dans les journaux, les réponses ou le dépôt (tests
  et recherche de secrets verts).

## Hypothèses

- La nouvelle clé API Neon de KYA est fournie dans le fichier de secrets avant la création du projet
  Neon ; d'ici là, les tests d'intégration tournent sur une base Postgres embarquée (PGlite).
- Le contenu de l'accueil est statique dans ce socle (catalogues de messages) ; il passera dans
  l'administration avec la spécification 004.
- Le déploiement Coolify nécessite que le dépôt GitHub soit accessible à Coolify (application GitHub
  ou clé de déploiement) : action du responsable si besoin.
- Comptes, MCP, catalogue et paiements sont hors de ce socle (spécifications 002 à 007).
