# ADR 0005 — Paiement derrière un port, Semoa en premier

- **Statut** : acceptée · **Date** : 2026-09-25

## Décision

Le domaine dépend d'un port `PaymentProvider` ; Semoa Afrique (Mobile Money et carte) est le premier
adaptateur. Aucune commande n'est payée sans confirmation vérifiée côté serveur (webhook signé puis
lecture du statut). Détails : [paiements](../architecture/paiements.md).

## Conséquences

- Ajouter un fournisseur = écrire un adaptateur et ses tests de contrat.
- La spécification d'achat dépend de l'accès à l'environnement de test de Semoa.
