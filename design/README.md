# Maquettes

Toutes les propositions de design de KYA-EnergyMarket, en HTML, CSS et JavaScript statiques. Ouvrir
un fichier `index.html` dans un navigateur, sans serveur.

| Dossier | Proposition | État |
|---|---|---|
| [v5](v5/plan.html) | **Direction retenue** : style de la v4 sous charte KYA (Poppins, Inter, JetBrains Mono ; teal, teal profond, orange réservé à l'achat). Site complet de bout en bout : marketplace, KYA-SolDesign (Présentation, Tarifs, Ressources, Support), essai, achat, confirmation, espace client, aide, pages légales. Commencer par `plan.html`. | référence pour l'implémentation |
| [v4](v4/index.html) | Une page légère inspirée d'un site de référence : blanc, photo pleine largeur, très grands titres serrés, exemple interactif. | validée comme direction |
| [v3](v3/index.html) | Clair, « instrument de mesure » : deux en-têtes (marketplace, logiciel), jauges SRI et SVI. | abandonnée |
| [v2](v2/index.html) | Sombre, inspirée de l'interface Copilot KYA. | abandonnée |
| [v1](v1/index.html) | Première proposition, claire ; variante sombre dans `v1/v2/`. | abandonnée |

## Règles reprises de la v5 pour l'application

- En-tête de la marketplace : `[Logo] KYA-EnergyMarket  Logiciels ▾  Aide  FR ▾  Se connecter`.
- En-tête d'un logiciel : `[icône] KYA-SolDesign  Présentation  Tarifs  Ressources  Support
  [Essayer gratuitement] [Acheter]`.
- SRI et SVI dans le corps des pages seulement, expliqués simplement : fiabilité technique et
  accessibilité économique.
- Orange KYA uniquement pour acheter, renouveler, payer.
- Vocabulaire : **devis** pour le client final, **documents techniques** pour les techniciens,
  **facture d'achat** pour ce que KYA-EnergyMarket envoie.
- Toute valeur provisoire porte l'étiquette « exemple ».
- Bouton « Afficher les blocs » : montre les blocs que l'administration compose.

## À remplacer par du contenu réel

Photos (actuellement Unsplash, mention « Photo d'illustration »), prix, durée d'essai, nombre de pays
et d'établissements, témoignages, numéro WhatsApp, courriel de contact, textes juridiques,
descriptions de KYA-EcoLabel, KYA-BusinessModel et KYA-SolMonitor.
