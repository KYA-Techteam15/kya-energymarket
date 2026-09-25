<!--
Sync Impact Report
- Version change: modèle non ratifié → 1.0.0
- Principes : I. Spécifier avant de construire ; II. Une couche métier, plusieurs portes ;
  III. Sécurité serveur et moindre privilège ; IV. L'argent, les licences et les données du client
  sont sacrés ; V. Le terrain d'abord ; VI. Qualité démontrée et réversible
- Sections ajoutées : Contraintes d'architecture ; Cycle de développement et portes de qualité
- Suivi : aucun
-->
# Constitution de KYA-EnergyMarket

## Principes

### I. Spécifier avant de construire

Toute fonctionnalité suit le cycle Spec Kit : spécification du besoin (acteurs, règles, critères
d'acceptation, cas limites), clarification, plan, tâches, analyse, implémentation, convergence. Une
branche `feat-NNN-nom` correspond à `specs/NNN-nom/`. Toute décision structurante est consignée dans
un ADR (contexte, options, décision, conséquences, condition de révision). Exigences, tâches, commits,
tests et versions restent reliés.

### II. Une couche métier, plusieurs portes

L'application est un monolithe modulaire TypeScript. Les règles métier vivent dans la couche
`domain` ; les pages, fonctions serveur, API REST, serveur MCP, API KYA-SolDesign et tâches de fond
l'appellent et ne réimplémentent rien. Chaque module (catalogue, contenus, comptes, commandes,
paiements, licences, support, statistiques) possède ses tables et n'écrit pas dans celles d'un autre.
Les contrats publics (REST, MCP, API des logiciels, webhooks) sont versionnés et testés par contrat.

Ce qui s'affiche se configure : offres, prix, fonctions, contenus, médias, essais et versions
viennent de l'administration, jamais du code.

### III. Sécurité serveur et moindre privilège

Toute autorisation est décidée côté serveur, refusée par défaut, à partir de l'identité, de
l'organisation, du rôle et de la ressource. Un outil MCP applique les mêmes contrôles que l'API ;
un consentement OAuth accorde des portées, jamais un droit métier. Les actions à impact (remboursement,
révocation, publication, suppression) demandent une confirmation explicite et laissent une trace
d'audit.

Aucun secret en clair dans Git, les journaux, les réponses d'API ou MCP, ni les tables métier. Les
jetons et codes sont stockés sous forme de condensat. Les clés de signature des licences ne quittent
jamais le serveur. Environnements local, preview, test et production isolés, chacun avec sa branche
Neon et ses propres secrets.

### IV. L'argent, les licences et les données du client sont sacrés

- Un paiement n'est acquis que confirmé par le fournisseur (webhook signé ou vérification serveur) ;
  tout traitement est idempotent et rapprochable.
- Montants en entiers FCFA, TVA calculée côté serveur selon le pays de facturation, factures d'achat
  numérotées sans trou et immuables une fois émises.
- Une licence émise est signée, traçable et révocable ; un poste se libère sans intervention de KYA.
- Le client garde ses projets : l'échéance d'une licence mène à la lecture seule, jamais à la perte.
- Données personnelles minimales, finalité déclarée, export et suppression possibles.

### V. Le terrain d'abord

Pages publiques légères, rapides sur mobile et réseau lent ; Mobile Money au même rang que la carte ;
français d'abord, anglais ensuite ; accessibilité clavier et contraste AA dans les critères
d'acceptation. Toute affirmation publique est prouvée ou marquée « exemple ».

### VI. Qualité démontrée et réversible

Une fonctionnalité est terminée quand ses critères d'acceptation sont démontrés par des tests
proportionnés au risque : domaine, contrats, autorisations, migrations et paiements ont des tests
automatisés ; chaque défaut corrigé ajoute un test de non-régression. Journaux structurés sans
secret, audit des actions sensibles. Migrations immuables après publication, exécutées par le
pipeline, avec un plan de retour arrière. La documentation fait partie de la livraison.

## Contraintes d'architecture

- Une seule application TanStack Start, déployée comme une image ; pas de backend séparé.
- Neon Postgres via Drizzle ; une branche Neon par environnement et par preview.
- Comptes, organisations et serveur OAuth 2.1 pour MCP dans l'application (ADR 0003).
- Paiement derrière un port `PaymentProvider` ; Semoa en premier adaptateur.
- API REST sous `/api/v1`, décrite en OpenAPI ; serveur MCP sous `/mcp` (Streamable HTTP, OAuth 2.1
  avec PKCE, métadonnées de ressource protégée).
- Contenus longs en Markdown, rendus côté serveur et assainis ; médias dans un stockage objet derrière
  un port.
- Secrets : fichier local hors dépôt au démarrage, Infisical ensuite, sans changer les noms.

## Cycle de développement et portes de qualité

1. Une recherche ciblée (documentation officielle, projets de référence) précède toute décision
   technique structurante.
2. Spec Kit produit spécification, plan et tâches ; le plan contient un contrôle de constitution.
3. Tranches verticales démontrables ; tests écrits avec le comportement.
4. Avant fusion dans `dev` : formatage, analyse statique, types, tests unitaires, de contrat et de
   parcours, recherche de secrets — regroupés dans `pnpm verify`.
5. Les changements touchant autorisations, secrets, paiements, licences, migrations ou pipeline
   demandent une revue humaine.
6. `dev` fusionne vers `main` par version ; chaque version porte une étiquette, des notes et une
   procédure de retour arrière.

## Gouvernance

Cette constitution prévaut sur les habitudes locales et les sorties d'agents. Une exception est
documentée, limitée dans le temps et approuvée par le responsable technique. Versions SemVer : MAJOR
pour une rupture de principe, MINOR pour une obligation ajoutée, PATCH pour une clarification.

**Version** : 1.0.0 | **Ratifiée** : 2026-09-25 | **Dernière modification** : 2026-09-25
