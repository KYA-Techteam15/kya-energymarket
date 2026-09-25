# Maquette KYA Energy Market

> **Version 2 (à valider) : `v2/index.html` et `v2/logiciels/kya-soldesign.html`.**
> Toile sombre (style copilot-demo) avec les accents KYA : teal pour l'action et ce qui est validé,
> orange pour l'achat, jaune pour le trait manuscrit. Le mouvement s'inspire de xmind : nœuds de
> l'étude reliés qui convergent vers le dossier, curseurs animés, bandeau défilant, blocs à fragments
> d'écrans. Comme chez Linear et Raycast, l'interface réelle de KYA-SolDesign est au premier plan.
> Prix et témoignages : `v2/assets/v2.js` (`OFFERS`, `QUOTES`), marqués « exemple ». La version 1
> (claire) reste ci-dessous pour comparer.

Maquette statique (HTML, CSS, JS sans dépendance) du site vitrine et d'une page logiciel. Elle
précède le projet TanStack Start : une fois validée, ses jetons et composants y seront repris.

## Ouvrir

Double-cliquer `index.html` (aucun serveur nécessaire). Pages :

- `index.html` : accueil, les deux portes (bureaux d'études / enseignement), la méthode, les huit
  étapes (captures réelles cliquables), le catalogue des logiciels, témoignages, terrain.
- `logiciels/kya-soldesign.html` : page produit construite en blocs (canevas) ; sélecteur d'édition
  et de durée, grille des fonctions, fiche technique, versions, questions.

Le bouton **« Afficher le canevas »** (en bas à droite) révèle les blocs dont chaque page est faite :
ce sont les blocs que l'admin configurera pour chaque produit.

## Ce qui est réel

- Captures de KYA-SolDesign 1.2.0 sur le projet exemple (centre de santé de Bombouaka).
- Éditions, durées, fonctions par édition, délais de grâce, versions et nouveautés.
- Fait KYA : méthode appliquée à plus de 500 installations en Afrique de l'Ouest ; utilisée par des
  écoles et universités ; KYA-Energy Group certifié ISO 9001:2015.
- Moyens de paiement de Semoa (Mobile Money, carte bancaire).

## À remplacer (marqué « exemple » ou « à fournir »)

| Élément | Où |
|---|---|
| Prix des six offres | `assets/js/site.js` (`OFFERS`) |
| Témoignages (4) | `index.html`, `logiciels/kya-soldesign.html` |
| Logos des écoles et universités (4) | `index.html`, bloc « références » |
| Photos de terrain (5) | `index.html`, bloc « réalisations » |
| Présentation de KYA-EcoLabel | `index.html`, catalogue |

## Charte

Palette et pile typographique du système visuel KYA (`assets/css/tokens.css`) ; logo officiel
KYA-Energy Group non modifié. Orange réservé à l'achat, teal profond pour la structure.
