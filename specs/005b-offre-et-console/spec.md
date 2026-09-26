# Spécification : Offre modulable et console d'administration

**Branche** : `feat-005-offre-et-console` · **Dossier** : `specs/005b-offre-et-console`
**Créée** : 2026-09-26 · **Statut** : implémentée

**Demande** (responsable, 2026-09-26) : la modélisation et surtout l'interface d'administration doivent
suivre la réalité commerciale.

1. Les éditions varient et s'ajoutent quand on veut.
2. Les caractéristiques d'une édition varient.
3. Les types de licence de chaque édition varient.
4. On configure une édition ou un type de licence sans l'afficher. On émet depuis l'administration des
   licences distinctes pour des personnes, et on sait ce qui a été acheté pour des statistiques justes.
5. On génère des licences en lot.

Et : une console d'administration à part, plus agréable, qui tient toutes les fonctions (maquette
validée le 2026-09-26 : [Console KYA-EnergyMarket](https://claude.ai/artifact/JrK1SvLmAbMmx1WK5bKVGN)).

**Vocabulaire retenu** : **Logiciel** → **Édition** (Commerciale, Académique…) → **Type de licence**
(Mensuelle, Annuelle, Partenaire…) → **Licence**. « Version » reste réservé aux versions du
logiciel (1.2.1, spec 008). Un **lot** est un ensemble de licences distinctes générées en une fois.

## Scénarios et tests *(obligatoire)*

### Histoire 1 — Composer l'offre sans développeur (P1)

1. **Étant donné** la console, **quand** l'équipe crée une édition, **alors** elle naît en brouillon,
   masquée et hors vente ; on règle son public, ses fonctions (liste fixée par le logiciel), ses
   limites (projets, postes, filigrane, délai de grâce hors ligne), son profil dans le logiciel et ses
   caractéristiques affichées (lignes libres).
2. **Étant donné** une édition, **quand** l'équipe ajoute un type de licence, **alors** elle fixe son
   nom, sa nature (vente, essai, offerte, éducation, partenariat), sa durée en jours, son prix par
   poste, ses postes minimum et maximum, s'il est renouvelable.
3. **Étant donné** une édition ou un type, **quand** l'équipe coupe « Visible sur le site » ou « En
   vente », **alors** le site cesse de l'afficher ou de le vendre, et la console peut toujours s'en
   servir pour émettre des licences.
4. **Étant donné** des changements, **quand** l'équipe ne les a pas publiés, **alors** ni le site, ni
   l'API, ni le logiciel ne changent ; la barre « brouillon » compte les changements ; « Publier » les
   applique d'un bloc, « Annuler » les abandonne.
5. **Étant donné** des éditions, **quand** l'équipe change leur ordre, **alors** le site suit cet ordre
   après publication.
6. Une édition ou un type qui a déjà servi n'est jamais supprimé : on l'**archive** (il disparaît des
   listes, les licences émises restent intactes).

### Histoire 2 — Émettre une licence juste (P1)

1. **Étant donné** la console, **quand** l'équipe émet une licence, **alors** elle choisit un type (même
   masqué), un titulaire (compte, organisation ou courriel), le nombre de postes, le canal
   (attribution par l'équipe, achat hors plateforme, partenariat), le montant payé et un motif
   obligatoire.
2. **Étant donné** une licence, **alors** elle garde une **copie figée** du type au moment de
   l'émission : nom, nature, durée, prix par poste, montant payé, canal, motif, référence (commande,
   Devis). Changer ensuite le prix du type ne change ni la licence ni les statistiques.
3. **Étant donné** un courriel sans compte, **quand** une licence lui est émise, **alors** la personne
   reçoit sa clé par courriel ; la licence lui est rattachée quand elle ouvre son espace avec ce
   courriel vérifié, ou quand elle saisit la clé dans son espace.
4. La validité démarre à l'émission ou à la première activation, au choix.

### Histoire 3 — Générer un lot (P1)

1. **Étant donné** l'assistant « Générer des licences » (Offre → Destinataires → Vérifier → Clés),
   **quand** l'équipe colle une liste de courriels, **alors** les courriels invalides et les doublons
   sont signalés pendant la saisie, et chaque personne reçoit **sa** licence et **sa** clé.
2. **Étant donné** le mode « pour une organisation », **alors** les N licences sont rattachées à
   l'organisation, qui les attribue elle-même.
3. **Étant donné** le mode « clés à distribuer », **alors** N clés sans titulaire sont créées et
   affichées ; une clé s'active telle quelle dans le logiciel et se rattache au compte qui la saisit
   dans son espace.
4. **Étant donné** un double clic ou une page rechargée, **alors** le lot n'est créé qu'une fois.
5. **Étant donné** un lot, **quand** l'équipe l'ouvre, **alors** elle voit ses licences et leur
   activation, copie les clés au format CSV, prolonge ou révoque tout le lot, renvoie les courriels.

### Histoire 4 — Voir et agir vite (P1)

1. **Tableau de bord** (30 jours, trimestre, année) : vendu (FCFA), offert, essais et conversions,
   ordinateurs actifs ; licences émises par semaine et par canal ; « À traiter » (licences achetées
   qui expirent sous 30 jours, clés de lot jamais activées, envois de courriels en échec) ; activité
   récente, actions MCP comprises.
2. **Licences** : vues prêtes (toutes, expirent sous 30 j, achetées, offertes, essais, non activées,
   révoquées), recherche (clé, identifiant, titulaire, courriel), filtres (édition, canal, lot),
   sélection multiple et actions groupées (prolonger, copier en CSV, révoquer). La fiche s'ouvre dans
   un panneau latéral : clé, titulaire, offre à l'émission, ordinateurs, historique, actions.
3. **Ctrl K** : une recherche unique (clé collée, identifiant, courriel, organisation, lot, édition) et
   les actions courantes.
4. La console a son propre habillage (menu latéral groupé par domaine, filtré selon le rôle), sans
   l'en-tête ni le pied de page du site ; un lien mène à l'espace client.

### Histoire 5 — Depuis Claude ou Codex (P2)

Outils MCP : lecture et écriture du brouillon du catalogue, publication (confirmation explicite),
émission avec la copie figée, génération de lot (confirmation explicite, clé d'unicité), lecture des
lots et des statistiques. Mêmes services et mêmes droits que la console.

### Cas limites

- Une édition masquée garde ses licences actives ; ses postes continuent de se rafraîchir.
- Un type archivé ne s'émet plus ; ses licences vivent jusqu'à leur fin.
- Un lot de 500 licences au plus par génération ; au-delà, plusieurs lots.
- Un courriel qui échoue est relancé (5 tentatives espacées) et reste visible dans « À traiter ».
- Deux personnes publient le catalogue en même temps : la seconde publication est refusée si le
  brouillon a changé depuis sa lecture.
- Une clé libre activée dans le logiciel avant d'être rattachée : le logiciel affiche le nom choisi
  pour le lot ; le rattachement ultérieur ne coupe pas le poste.

## Exigences *(obligatoire)*

- **FR-001** : Édition : code stable, nom, public, ordre, fonctions incluses, projets et postes
  maximum, filigrane, délai de grâce, **profil dans le logiciel** (code d'édition que KYA-SolDesign
  connaît), caractéristiques affichées (liste de textes FR/EN), **visible**, **en vente**, archivée.
- **FR-002** : Type de licence : nom FR/EN, nature (`sale`, `trial`, `free`, `education`, `partner`),
  durée en jours (1 à 3 650), prix par poste en FCFA entiers, prix exemple ou définitif, postes
  minimum et maximum, renouvelable, **visible**, **en vente**, archivé, ordre.
- **FR-003** : Catalogue en **brouillon** par logiciel : toute modification de la console ou du MCP
  écrit dans le brouillon ; la publication applique tout le brouillon dans une transaction, trace les
  changements dans l'audit, et refuse un brouillon modifié depuis sa lecture. Le site, l'API
  publique, l'API du logiciel et les jetons lisent l'offre publiée.
- **FR-004** : Licence : type de licence, copie figée (nom, nature, jours, prix par poste), montant payé,
  canal (`purchase`, `trial`, `staff`, `batch`, `partner`), motif, référence, lot éventuel, courriel
  du destinataire, titulaire facultatif (organisation), début à l'émission ou à la première
  activation.
- **FR-005** : Lot : libellé, motif, type, mode (`emails`, `organization`, `keys`), postes par licence,
  nombre, nom affiché dans le logiciel, organisation éventuelle, clé d'unicité ; actions groupées.
- **FR-006** : Rattachement : une licence sans titulaire se rattache à l'organisation de la personne
  qui ouvre son espace avec le courriel destinataire vérifié, ou qui saisit la clé dans son espace.
- **FR-007** : File de travaux en base (courriels de clés, relances) : reprise après échec, au plus
  5 tentatives, état visible ; aucun courriel ne bloque une émission.
- **FR-008** : Jeton inchangé pour le logiciel : l'édition envoyée est le profil dans le logiciel, le
  code de formule vient de la durée (`1d`, `1w`, `1m`, `3m`, `6m`, `12m`, sinon `<jours>d`).
- **FR-009** : Statistiques calculées sur les copies figées et les activations : vendu, offert, essais,
  conversions, ordinateurs actifs, série hebdomadaire par canal, expirations à venir.
- **FR-010** : Console : habillage propre, tableau de bord, licences (vues, filtres, panneau, actions
  groupées), lots, assistant de génération, catalogue (logiciels, éditions, types, brouillon),
  pages, médias, équipe, MCP, journal ; recherche Ctrl K ; clavier et contraste AA ; mobile utilisable.
- **FR-011** : Outils MCP de l'histoire 5, avec les annotations lecture/écriture/destruction ; la
  génération de lot et la publication exigent `confirm: true`.
- **FR-012** : Données existantes reprises : éditions (visibles et en vente si elles étaient actives),
  durées devenues types de licence (même identifiant), licences complétées (type, copie figée, canal).

## Critères de succès *(obligatoire)*

- **SC-001** : Une édition et un type créés, masqués, servent à émettre une licence dont le jeton passe
  `verifyLicense` du logiciel, sans que le site ne les montre (test).
- **SC-002** : Un prix changé puis publié ne modifie ni les licences émises ni le montant vendu du
  tableau de bord (test).
- **SC-003** : Un lot de 30 courriels crée 30 licences distinctes et 30 courriels ; rejouer la même
  génération ne crée rien de plus (test).
- **SC-004** : Parcours console : générer un lot, l'ouvrir, trouver une clé par Ctrl K, publier un
  changement de prix visible sur la page Tarifs (Playwright, axe sans violation).

## Hypothèses

- KYA-SolDesign ne connaît aujourd'hui que les éditions `commercial`, `academic`, `student` et ses six
  fonctions : d'où le profil dans le logiciel. À T061, le logiciel ignorera les fonctions inconnues et
  acceptera un profil inconnu en lecture seule (principe « le logiciel accepte ce qu'il ne connaît
  pas ») ; voir [plan](plan.md).
- L'essai (spec 006) sera un type de licence de nature `trial` ; l'achat (spec 007) émettra avec le
  canal `purchase` et la référence de commande.
- Comptes, organisations, commandes et réglages auront leurs rubriques de console avec leurs
  spécifications.
