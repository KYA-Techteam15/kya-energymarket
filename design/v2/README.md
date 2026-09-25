# Proposition de conception n° 2 — KYA Energy Market

Maquette statique (HTML, CSS, JavaScript, sans dépendance) du site vitrine et de la page du
logiciel KYA-SolDesign. Elle remplace l'approche de la proposition n° 1 (`../design/`), conservée
pour comparaison.

Ouvrir `index.html` dans un navigateur ; la page produit est `logiciels/kya-soldesign.html`.
Le bouton « Afficher le canevas » (en bas à droite) révèle les blocs configurables de chaque page.

## Sources de la direction

| Référence | Ce qui en est retenu |
|---|---|
| `copilot-demo` (Stratégie IA KYA) | L'interface sombre de type Copilot : fond `#1b1b1b`, surfaces en échelle, filets gris, Segoe UI, icônes au trait fin, palette KYA en signaux |
| xmind.com | Le mouvement : une carte qui se déploie (l'arbre d'étude), des onglets qui avancent seuls avec barre de progression, des visuels produit qui s'animent au défilement |
| getdesign.md (Linear, Stripe) | Linear : une seule couleur d'accent rare, profondeur par l'élévation et non par les ombres, captures produit au premier plan. Stripe : chiffres tabulaires, une seule couleur de bouton d'achat |

## Rôle des couleurs

- **Teal** : ce qui est calculé, validé, inclus.
- **Orange** : acheter, et rien d'autre. Un seul élément se détache, l'action (effet de Von Restorff).
- **Jaune** : le seuil de fiabilité visé, dans le graphique.
- **Café** : les contenus provisoires (« exemple »).

## Méthode rédactionnelle et UX

### La Bible : la forme du message

- **Paraboles concrètes** plutôt qu'abstractions : « Avant de bâtir, on s'assied et on compte »
  reprend Luc 14, 28 (bâtir une tour après avoir calculé la dépense), qui résume le
  dimensionnement mieux qu'un argumentaire technique.
- **Phrases courtes et parallèles** : « Surdimensionner, c'est payer pour rien. Sous-dimensionner,
  c'est promettre des coupures. »
- **Le juste milieu** comme promesse : ni trop, ni trop peu, le point juste.
- La citation est affichée une seule fois, en exergue. Elle peut être retirée sans rien casser si
  KYA préfère une neutralité religieuse sur un site commercial.

### La science : l'ordre et la mise en page

- **Loi de Hick** : trois éditions, une seule action principale par écran.
- **Position sérielle** : la promesse en tête, l'appel à l'action en fin de page.
- **Lecture en F** : un axe d'alignement à gauche fort, titres courts en tête de bloc.
- **Aversion à la perte** : le risque (surdimensionner, sous-dimensionner) est posé avant la solution.
- **Ancrage** : le prix annuel est suivi de son équivalent mensuel.
- **Preuve sociale** : 500+ installations, 5 pays, établissements utilisateurs, témoignages.
- **Divulgation progressive** : grille des éditions et questions fréquentes repliées ou en fin de page.
- **Effet de génération** : le visiteur règle lui-même le seuil de fiabilité et voit le logiciel
  choisir ; ce qu'on manipule se retient mieux que ce qu'on lit.

### Alex Hormozi : l'offre

L'équation de valeur, *(résultat rêvé × probabilité perçue de l'atteindre) ÷ (délai × effort)*,
structure la section « Ce qui change dans chacune de vos études » :

| Levier | Formulation sur le site |
|---|---|
| Résultat rêvé | Un système qui sert la demande toute l'année, au coût le plus bas pour cette fiabilité |
| Probabilité | SRI et SVI chiffrés avec la météo réelle ; méthode appliquée à 500+ installations |
| Délai | Les étapes s'enchaînent sans ressaisie |
| Effort | Météo téléchargée, documents générés et modifiables |

Et, dans les tarifs : une **pile de valeur** (tout ce qui est inclus, les exclusions barrées), un
**engagement qui retire le risque** (« Vos projets vous appartiennent »), des **freins levés** sous
chaque bouton (Mobile Money ou carte, activation immédiate, hors ligne).

## Données

- **Réelles** : captures et valeurs du projet exemple de KYA-SolDesign 1.2.0 (2,85 kWc, 6,26 kWh,
  2,71 kW, SRI 0,903, SVI 0,84, 10,08 kWh/j, 6,17 kWh/m²/j) ; textes de la fiche produit
  (disponible depuis le 1er octobre 2020, caractéristiques, atouts, impacts, pays, domaines).
- **Illustration** : le nuage fiabilité × coût (déterministe, signalé comme tel).
- **À remplacer** (marqués « exemple ») : prix, témoignages, formulation de l'engagement.

## Fichiers

```text
design-v2/
├── README.md
├── index.html                  accueil : arbre d'étude, risque, mécanisme, gains, étapes,
│                               livrables, publics, témoignages, catalogue
├── logiciels/
│   └── kya-soldesign.html      fiche produit : repères, caractéristiques, atouts et impacts,
│                               dossier, tarifs, grille des éditions, versions, questions
└── assets/
    ├── css/tokens.css          palette et typographie (seul endroit de la charte)
    ├── css/site.css            composants et pages
    ├── js/site.js              arbre d'étude, nuage interactif, étapes, tarifs, canevas
    └── img/                    logos officiels, captures réelles (WebP)
```

Accessibilité : navigation au clavier (flèches dans les étapes), focus visible, animations
coupées si le système demande moins de mouvement, alternatives texte de l'arbre et du graphique.
