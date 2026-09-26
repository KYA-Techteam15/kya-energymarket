# Vue d'ensemble

## Le système et ses voisins

```text
                    Visiteurs, clients                    Équipe KYA
                    (navigateur, mobile)            (navigateur, Claude, Codex)
                           │                                  │
                           ▼                                  ▼
 ┌───────────────────────────────────────────────────────────────────────────────┐
 │                         KYA-EnergyMarket (une application)                    │
 │                                                                               │
 │  Pages publiques ─ Espace client ─ Administration        Portes machine        │
 │  (TanStack Start, rendu serveur)                         /api/v1  (REST)       │
 │            │                                              /mcp     (MCP)       │
 │            │ fonctions serveur                            /api/software/v1     │
 │            ▼                                              /webhooks/*          │
 │  ┌──────────────────────── couche métier (domain) ───────────────────────┐    │
 │  │ catalogue · contenus · comptes · commandes · paiements · factures      │    │
 │  │ licences · essais · versions · support · usage · statistiques · audit  │    │
 │  └────────────────────────────────┬──────────────────────────────────────┘    │
 │                                   │ ports                                     │
 └──────────┬───────────────┬────────┼──────────────┬───────────────┬────────────┘
            ▼               ▼        ▼              ▼               ▼
      Neon Postgres    Stockage   Semoa         Courriel         Secrets
      (Drizzle)        objet      (paiement)    transactionnel   (.env → Infisical)
                                   ▲
                                   │ webhooks signés
 KYA-SolDesign (poste Windows) ──► /api/software/v1 : activer, rafraîchir, libérer,
                                   usage anonyme, avis et réponses
```

## Découpage du code : par fonctionnalité

```text
apps/web/src/
  routes/                 routes TanStack (points d'entrée minces)
  features/               une fonctionnalité = un dossier : shell, i18n, marketplace, account, health…
  shared/                 runtime serveur et utilitaires communs
packages/domain/src/      services métier par fonctionnalité : audit/, health/, logging/, puis catalog/,
                          licensing/, orders/, payments/, support/…
packages/db/              schéma Drizzle, migrations, client, base de test PGlite
packages/config/          variables d'environnement validées
packages/ui/              jetons de la charte KYA, styles de base, icônes
packages/contracts/       (à venir) schémas partagés : REST, MCP, API des logiciels, webhooks
packages/payments/        (à venir) port PaymentProvider et adaptateur Semoa
packages/licensing/       (à venir) émission et vérification des jetons
```

Principe inchangé : une couche métier, plusieurs portes ; rangement par fonctionnalité à l'intérieur
de chaque paquet.
## Flux principaux

1. **Découvrir** : pages composées de blocs (catalogue, logiciel, tarifs), rendues côté serveur,
   mises en cache.
2. **Essayer** : compte → « Activer mon essai » (une fois par logiciel) → licence d'essai → clé.
3. **Acheter** : une page (édition, durée, postes, facturation, paiement) → commande → paiement Semoa
   → confirmation par webhook → licence émise + facture d'achat → courriel.
4. **Activer** : KYA-SolDesign envoie la clé ou la session du compte et l'identifiant du poste ;
   la plateforme renvoie un jeton signé. Rafraîchissement périodique ; libération depuis l'espace.
5. **Administrer** : l'équipe KYA configure tout dans `/admin` ou par MCP, avec les mêmes droits.

## Choix transverses

- Rendu serveur et HTML léger pour les pages publiques ; JavaScript seulement là où il sert.
- Français par défaut, anglais prévu dès le socle (textes externalisés).
- Heures en UTC en base ; affichage dans le fuseau de l'utilisateur.
- Journaux structurés sans secret ; table d'audit pour toute action sensible.
