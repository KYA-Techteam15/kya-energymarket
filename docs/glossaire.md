# Glossaire

Les mots de l'interface, de la documentation et du code. Un terme par idée, le même partout.

| Terme | Sens | Nom dans le code |
|---|---|---|
| **KYA-EnergyMarket** | La marketplace (ce projet). | — |
| **Logiciel** | Un produit vendu : KYA-SolDesign, KYA-EcoLabel… | `Product` (type `software`) |
| **Édition** | Variante d'un logiciel : Commerciale, Académique, Étudiant, Partenaire… Définit les fonctions, limites, filigrane, délai de grâce, profil dans le logiciel et caractéristiques affichées. S'ajoute quand on veut ; visible ou non, en vente ou non ; s'archive, ne se supprime pas. | `Edition` |
| **Profil dans le logiciel** | Code d'édition que KYA-SolDesign connaît (`commercial`, `academic`, `student`) et reçoit dans le jeton. Une nouvelle édition choisit l'un d'eux. | `Edition.softwareEdition` |
| **Caractéristiques affichées** | Lignes libres d'une édition pour la page Tarifs (« Support prioritaire »…). Sans effet dans le logiciel. | `Edition.highlights` |
| **Type de licence** | Ce qu'on vend ou émet dans une édition : nom (Annuelle, Partenaire 1 an…), nature (vente, essai, offerte, éducation, partenariat), durée en jours, prix par poste, postes permis, renouvelable. Visible ou non, en vente ou non. Remplace l'ancienne « durée ». | `LicenseType` |
| **Version** | Version du logiciel (1.2.1), jamais une édition. Voir spécification 008. | `SoftwareRelease` |
| **Brouillon du catalogue** | Modifications de l'offre pas encore publiées. Le site, l'API et le logiciel ne voient que l'offre publiée. | `CatalogDraft` |
| **Lot** | Licences distinctes générées en une fois : une par courriel, N pour une organisation, ou N clés à distribuer. | `LicenseBatch` |
| **Canal** | D'où vient une licence : achat, essai, attribution par l'équipe, lot, partenariat. Sert aux statistiques. | `License.channel` |
| **Poste** | Un ordinateur sur lequel le logiciel est activé. Une licence compte un nombre de postes. | `Seat` |
| **Licence** | Droit d'utiliser un logiciel dans une édition, selon un type de licence, pour un nombre de postes. Garde une copie figée de son offre (type, jours, prix, montant payé, canal, motif). Identifiée par une clé ; peut attendre son titulaire (clé à distribuer, destinataire sans compte). | `License` |
| **Clé de licence** | Code lisible (`KYA-COM-12M-…`) saisi dans le logiciel, ou retrouvé par connexion au compte. | `License.key` |
| **Jeton de licence** | Charge utile signée (ECDSA P-256) remise au logiciel pour un poste ; vérifiable hors ligne. | `LicenseToken` |
| **Essai** | Licence gratuite, une fois par compte et par logiciel, réglée dans l'administration. | `Trial` |
| **Délai de grâce** | Jours après l'échéance pendant lesquels le logiciel fonctionne encore. Ensuite : **lecture seule**. | `graceDays` |
| **Commande** | Achat d'une licence (ou d'un renouvellement, de postes) par un compte. Pas de panier. | `Order` |
| **Paiement** | Tentative de règlement d'une commande auprès du fournisseur (Semoa). | `Payment` |
| **Facture d'achat** | Document émis par KYA-EnergyMarket après paiement, au nom de l'acheteur. Numéroté, immuable. | `Invoice` |
| **Devis** (marketplace) | Offre chiffrée émise par KYA pour une organisation qui veut valider avant de payer. | `Quote` |
| **Devis** (KYA-SolDesign) | Document que l'utilisateur du logiciel remet à son client final : le prix de l'installation. Remplace le terme « facture proforma ». | côté logiciel |
| **Documents techniques** | Schéma unifilaire, rapport, liste des protections : pour les techniciens. | côté logiciel |
| **Client final** | Le client de l'utilisateur de KYA-SolDesign (le propriétaire de l'installation). | — |
| **Compte** | Une personne qui se connecte. | `User` |
| **Organisation** | Titulaire des licences et des factures d'achat : entreprise, école, institution, ou organisation personnelle créée d'office pour un particulier. **Invisible par défaut** : elle n'apparaît que si l'on achète pour une structure ou plusieurs postes. Elle assure la continuité quand l'acheteur quitte la structure. | `Organization` |
| **Membre** | Compte rattaché à une organisation, avec un rôle : propriétaire ou membre. | `Member` |
| **Administration** | L'espace de l'équipe KYA, dans l'interface et par MCP (réservé à l'équipe). | `/admin`, `/mcp` |
| **Bloc** | Élément d'une page composée : héros, texte Markdown, exemple interactif, tarifs, questions… | `Block` |
| **Page composée** | Page d'un logiciel ou de la marketplace, assemblée de blocs dans l'administration. | `Page` |
| **Version logicielle** | Une publication d'un logiciel (numéro, date, canal, notes, fichier). | `SoftwareRelease` |
| **Demande de support** | Question, problème ou idée, avec ses réponses. Peut venir du logiciel. | `SupportThread` |
| **SRI** | Fiabilité technique : le système couvrira-t-il les besoins, sans coupure ? Proche de 1 = oui. | — |
| **SVI** | Accessibilité économique : coût du kWh produit ÷ prix du réseau. Sous 1 = moins cher que le réseau. | — |
