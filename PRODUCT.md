# Produit

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

TanStack Start (rendu serveur, fonctions serveur, API REST, serveur MCP) + Neon Postgres (Drizzle).
Pas de backend séparé : une seule application TypeScript et une couche métier unique. Secrets dans un
fichier `.env` local au démarrage, Infisical plus tard. Paiement : Semoa Afrique d'abord, autres
fournisseurs plus tard derrière une interface commune. Déploiement : Coolify.

## Users

- **Bureaux d'études et installateurs solaires** (Afrique de l'Ouest d'abord) : ils dimensionnent,
  chiffrent et remettent des dossiers à leurs clients ; ils achètent une licence Commerciale.
- **Institutions** (financeurs, exploitants, administrations) : elles vérifient des projets et
  demandent souvent un devis avant de payer ; licence Commerciale.
- **Écoles, universités et étudiants** en énergie : licences Académique ou Étudiant.
- **Équipe KYA** : elle administre le catalogue, les contenus, les offres, les commandes, les
  licences, le support et les statistiques, depuis l'interface ou depuis Claude et Codex (MCP).

## Product Purpose

KYA-EnergyMarket est la marketplace des logiciels de KYA-Energy Group : KYA-SolDesign d'abord, puis
KYA-EcoLabel, KYA-BusinessModel et KYA-SolMonitor. Chaque logiciel se configure une fois dans
l'administration (éditions, durées, fonctions, prix, contenus, médias, versions) et s'affiche dans des
pages composées de blocs, avec du texte écrit en Markdown. Le client essaie, achète la licence qu'il
veut sans panier, paie par Mobile Money ou carte, reçoit sa clé et sa facture d'achat, et retrouve
tout dans son espace (licences, postes, téléchargements, factures d'achat, support, organisation).

La plateforme remplace l'API d'administration simulée de KYA-SolDesign : activation, rafraîchissement
et libération des licences, usage anonyme, avis et réponses.

Succès : un visiteur comprend l'offre, essaie ou achète, active KYA-SolDesign et retrouve tout dans
son espace, sans intervention manuelle de KYA.

## Positioning

KYA-SolDesign s'appuie sur une méthode de dimensionnement éprouvée sur **plus de 500 installations
en Afrique de l'Ouest** (fait fourni par KYA) : fiabilité technique (SRI), accessibilité économique
(SVI), simulation horaire sur l'année avec la météo réelle, conçu pour les systèmes autonomes du
terrain africain. Il est utilisé par des écoles et des universités.

## Operating Context

- Logiciel de bureau Windows 10/11 (installateur NSIS signé, mises à jour automatiques), bilingue
  FR/EN, qui fonctionne hors ligne ; Internet sert à la météo PVGIS, aux licences et aux mises à jour.
- Parcours KYA-SolDesign : site et météo, besoins, prédimensionnement, dimensionnement avec le
  catalogue de matériel, protections et câbles (IEC 60364-5-52), évaluation financière, schéma
  unifilaire, documents : **devis** pour le client final, documents techniques pour les techniciens.
- Devise d'affichage : franc CFA (FCFA, XOF) ; TVA selon le pays de facturation.
- Réseau souvent lent et mobile d'abord pour les pages publiques.

## Capabilities and Constraints

- **V1 : produits de type logiciel.** Le matériel, les formations et les services viendront dans le
  même modèle.
- Éditions KYA-SolDesign : **Commerciale** (1 mois, 1 trimestre, 1 an), **Académique** (1 an),
  **Étudiant** (1 jour, 1 mois). Fonctions par édition : parcours complet, optimisation, export Word,
  devis et prix de vente, émission du dossier, matériel ajouté au catalogue, nombre de projets ;
  filigrane en Académique et Étudiant ; délai de grâce puis lecture seule.
- **Licences multipostes** : un poste = un ordinateur ; attribution par courriel, libération,
  réattribution. Tarif dégressif : plus tard.
- **Essai** : une fois par compte et par logiciel, durée et contenu réglés dans l'administration.
- **Pas de panier** : achat direct d'une licence (édition, durée, postes) sur une seule page.
- **Prix : non fixés** — la maquette montre des valeurs d'exemple signalées comme telles.
- API REST et serveur MCP (OAuth) dès le départ ; toute action passe par une couche métier unique.

## Brand Commitments

- Noms exacts : **KYA-EnergyMarket**, **KYA-SolDesign**, **KYA-Energy Group**. Jamais « SolDesign »
  seul.
- Vocabulaire : **devis** (document que l'utilisateur de KYA-SolDesign remet à son client final),
  **facture d'achat** (ce que KYA-EnergyMarket envoie à son client), **documents techniques** (pour
  les techniciens). Voir `docs/glossaire.md`.
- Logo officiel KYA-Energy Group (fichier fourni, non modifié) ; logo produit KYA-SolDesign.
- Charte KYA : les **cinq couleurs du logo** — vert `#1ca18c`, orange `#f99d32`, blanc `#ffffff`, jaune
  `#e8e748`, café `#875028`. Le vert KYA est la couleur visible des actions principales et des grandes
  surfaces (avec du texte foncé, AA) ; l'orange est réservé à l'achat. Toute autre teinte est dérivée
  de ces cinq couleurs (`packages/ui/src/tokens.ts`). Polices Poppins (titres), Inter (texte),
  JetBrains Mono (nombres). Direction artistique retenue : `design/v5`. Voix institutionnelle,
  directe, en français d'abord.

## Evidence on Hand

- Fait confirmé : méthode appliquée à plus de 500 installations en Afrique de l'Ouest ; utilisateurs
  : écoles et universités ; KYA-Energy Group certifié ISO 9001:2015 ; KYA-SolDesign utilisé depuis
  2020.
- À recevoir de KYA : photos d'installations, témoignages, nombre de pays et d'établissements, prix,
  durée d'essai, numéro WhatsApp, textes juridiques, descriptions des autres logiciels.
- Captures réelles de KYA-SolDesign disponibles dans le dépôt de l'application.

## Product Principles

1. La preuve avant la promesse : chaque affirmation renvoie à une méthode, un chiffre sourcé ou un
   client réel ; rien d'inventé en production.
2. Configurer une fois, afficher partout : un produit décrit dans l'administration alimente sa page,
   l'espace client, l'API, les outils MCP et le logiciel lui-même.
3. L'étudiant et le bureau d'études trouvent chacun leur offre en moins d'une minute.
4. Le terrain d'abord : pages légères, mobile, Mobile Money.
5. Le client garde ses projets : une licence échue passe en lecture seule, rien n'est effacé.

## Accessibility & Inclusion

Navigation au clavier, contraste AA, textes lisibles sur mobile et connexions lentes ; français et
anglais.
