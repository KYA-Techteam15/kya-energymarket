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

## Découpage du code (prévu par la spécification 001)

```text
apps/web/                 TanStack Start : routes, pages, fonctions serveur, API, MCP
  src/routes/             pages publiques, /compte, /espace, /admin, /api, /mcp
  src/server/             adaptateurs HTTP et MCP, sans règle métier
packages/domain/          services métier, règles, autorisations, événements d'audit
packages/db/              schéma Drizzle, migrations, accès aux données
packages/contracts/       schémas Zod partagés : REST, MCP, API des logiciels, webhooks
packages/ui/              composants et jetons de la charte (issus de design/v5)
packages/payments/        port PaymentProvider et adaptateur Semoa
packages/licensing/       émission et vérification des jetons (compatible KYA-SolDesign)
```

La structure exacte est fixée par le plan de la spécification 001 ; le principe ne change pas : une
couche métier, plusieurs portes.

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
