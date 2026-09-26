# Spécification : Catalogue et pages composées

**Branche** : `feat-004-catalogue` · **Dossier** : `specs/004-catalogue`
**Créée** : 2026-09-26 · **Statut** : implémentée

**Demande** : phase 4 de la feuille de route. Le catalogue (logiciels, éditions, durées, fonctions,
limites, prix par poste) et les pages composées de blocs vivent en base, s'administrent dans
l'interface et depuis le MCP, et servent les pages publiques de la marketplace et de KYA-SolDesign
(Présentation, Tarifs, Ressources, Support), fidèles à `design/v5`. Décisions : ADR 0008 (blocs
typés, Markdown assaini, données liées plutôt que recopiées).

## Scénarios et tests *(obligatoire)*

### Histoire 1 — Le visiteur découvre KYA-SolDesign depuis la base (P1)

**Scénarios d'acceptation** :

1. **Étant donné** le catalogue en base, **quand** le visiteur ouvre `Logiciels`, **alors** il voit
   chaque logiciel publié (logo ou monogramme, nature, résumé, état « Disponible » ou « Bientôt »).
2. **Étant donné** KYA-SolDesign, **quand** il ouvre sa page, **alors** l'en-tête du logiciel propose
   quatre onglets — Présentation, Tarifs, Ressources, Support — plus « Essayer gratuitement » et
   « Acheter », et la Présentation déroule les neuf sections de la maquette (héros, repères, capture,
   prix de l'erreur, deux indicateurs avec l'exemple interactif, point juste réglable, étapes,
   livrables, pour qui, preuve, clôture).
3. **Étant donné** la page Tarifs, **quand** il choisit édition, durée et nombre de postes, **alors**
   le récapitulatif calcule le total à partir des prix du catalogue ; un prix non définitif porte la
   mention « prix exemple ».
4. **Étant donné** le comparatif des éditions, **quand** l'équipe change une fonction d'une édition,
   **alors** la page change sans que personne ne retouche le bloc.
5. **Étant donné** une page en anglais absente, **quand** le visiteur anglophone l'ouvre, **alors** la
   version française s'affiche, annoncée comme telle.

### Histoire 2 — L'équipe administre le catalogue (P1)

1. **Étant donné** un administrateur ou un membre « contenus », **quand** il ouvre Administration →
   Catalogue, **alors** il modifie un logiciel (nom, nature, résumé, état, logo), ses fonctions, ses
   éditions (public, fonctions incluses, filigrane, délai de grâce, postes et projets maximum) et ses
   durées (prix par poste en FCFA, prix exemple ou définitif, active ou non).
2. **Étant donné** une modification, **quand** elle est enregistrée, **alors** elle est tracée dans
   l'audit et visible aussitôt sur les pages, l'API et le MCP.
3. **Étant donné** un membre « ventes » ou « support », **quand** il ouvre le catalogue, **alors** il le
   lit sans pouvoir le modifier.

### Histoire 3 — L'équipe compose et publie les pages (P1)

1. **Étant donné** une page (d'un logiciel ou de la marketplace) et une langue, **quand** l'équipe
   l'ouvre, **alors** elle voit la liste ordonnée des blocs et peut ajouter, modifier, déplacer ou
   retirer un bloc parmi les types prévus, dans des champs guidés (aucune mise en page libre).
2. **Étant donné** un brouillon, **quand** elle l'enregistre, **alors** la page publique ne change pas ;
   l'aperçu du brouillon est réservé à l'équipe.
3. **Étant donné** un brouillon, **quand** elle publie, **alors** une version est figée, la page
   publique change, et les versions précédentes restent consultables et restaurables.
4. **Étant donné** du Markdown, **quand** il est rendu, **alors** il est assaini (aucun HTML brut, liens
   externes `rel="noopener"`), et ses titres alimentent un sommaire.

### Histoire 4 — Médias (P2)

1. **Étant donné** Administration → Médias, **quand** l'équipe téléverse une image, **alors** elle est
   convertie en WebP (largeur 2400 px au plus), rangée dans le stockage objet, et exige un texte
   alternatif (FR, EN) ; la mention « Photo d'illustration » est possible.
2. **Étant donné** un bloc qui demande une image, **quand** l'équipe la choisit, **alors** elle la prend
   dans la médiathèque.

### Histoire 5 — Depuis Claude ou Codex (P2)

1. Lecture (`admin:read`) : `search_catalog`, `get_product`, `list_pages`, `get_page`.
2. Catalogue (`admin:catalog`) : `update_product`, `update_edition`, `set_plan_price`.
3. Contenus (`admin:content`) : `update_page_draft`, `publish_page`.
4. Chaque outil vérifie le rôle d'équipe (mêmes droits que l'interface), valide ses entrées et laisse
   une trace d'audit.

### Cas limites

- Bloc invalide (champ manquant, lien `javascript:`) : refusé à l'enregistrement, message clair.
- Deux personnes publient la même page : la seconde est refusée si son brouillon n'est pas le dernier.
- Logiciel « Bientôt » : visible au catalogue, sans page ni achat.
- Durée inactive : absente des tarifs ; prix entiers positifs en FCFA.

## Exigences *(obligatoire)*

- **FR-001** : Catalogue en base : logiciel, fonction, édition, durée (plan), fonctions par édition ;
  textes en français et en anglais ; montants entiers en FCFA ; prix « exemple » signalé.
- **FR-002** : Pages en base : page (logiciel ou marketplace, clé), versions par langue (brouillon,
  publiée, archivée), blocs typés validés par schéma ; publier fige une version ; restaurer crée un
  brouillon depuis une version.
- **FR-003** : Types de blocs issus de `design/v5` : en-tête de page, héros, repères, capture, texte en
  deux colonnes, exemple interactif, graphique réglable, étapes, livrables, pour qui, preuve, clôture,
  tarifs (lié), comparatif (lié), encarts, questions, texte Markdown, ressources, versions, démarrer,
  contacts.
- **FR-004** : Markdown CommonMark + tableaux, rendu serveur, sans HTML brut, liens assainis, ancres.
- **FR-005** : Médias : port `MediaStorage` ; adaptateur Neon Object Storage (S3) en ligne, dossier
  local en développement et en test ; images servies par `/media/<clé>` avec cache immuable.
- **FR-006** : Pages publiques : `Logiciels`, page d'un logiciel et ses onglets, pages de la
  marketplace (aide, à propos, légal), toutes en FR/EN, référencement (titre, description, hreflang).
- **FR-007** : Administration : Catalogue, Pages (éditeur de blocs, aperçu, publication, versions),
  Médias ; droits : écrire le catalogue = `catalog:write`, publier = `content:publish`.
- **FR-008** : MCP : outils de l'histoire 5 ; portées `admin:catalog` et `admin:content`.
- **FR-009** : API publique `GET /api/v1/catalog` (logiciels publiés, éditions, durées actives).
- **FR-010** : Contenu initial chargé par `pnpm db:seed` (idempotent, ne remplace jamais une saisie) :
  KYA-SolDesign et ses quatre pages, pages de la marketplace, repris de `design/v5`, en FR et EN.
- **FR-011** : Audit de toute écriture (catalogue, page, publication, média).

## Critères de succès *(obligatoire)*

- **SC-001** : Les pages publiques de KYA-SolDesign rendent le contenu de la base, sans violation axe.
- **SC-002** : Changer un prix ou une fonction dans l'administration change la page Tarifs et l'API
  (test de parcours).
- **SC-003** : Un brouillon n'est jamais public avant publication (test).
- **SC-004** : Un outil MCP d'écriture refuse un rôle sans droit (test).

## Hypothèses

- Prix non fixés : les valeurs de la maquette sont chargées comme « prix exemple ».
- L'achat (spec 007) et l'essai (spec 006) ne sont pas encore ouverts : « Acheter » et « Essayer »
  mènent à une page qui l'annonce et propose le devis.
- Les versions logicielles viendront de la spécification 008 ; d'ici là, le bloc Versions est saisi.
