# Paiements

## Principe

Le domaine ne connaît qu'un port `PaymentProvider`. Semoa Afrique en est le premier adaptateur
(Mobile Money et carte) ; d'autres fournisseurs se branchent plus tard sans toucher aux commandes,
licences ni factures.

```text
PaymentProvider
  createPayment(order, method, payer) → { providerRef, redirectUrl | instructions }
  getPayment(providerRef)              → statut vérifié auprès du fournisseur
  verifyWebhook(headers, body)         → événement authentifié ou rejet
  refund(providerRef, amount)          → remboursement (si le fournisseur le permet)
```

## Parcours d'achat

1. Page d'achat unique : édition, durée, postes, organisation de facturation, pays, moyen de
   paiement. Le serveur recalcule prix et TVA, crée la **commande** (`pending`) avec une clé
   d'idempotence.
2. Création du **paiement** chez Semoa ; redirection ou confirmation sur le téléphone (Mobile Money).
3. **Webhook signé** de Semoa → vérification de signature → vérification du statut par appel serveur
   → transition `pending → paid` une seule fois (idempotence sur `providerRef`).
4. À `paid`, dans une transaction : émission de la **licence**, émission de la **facture d'achat**,
   événement d'audit ; puis courriel (clé, facture, téléchargement, guide d'activation).
5. Page de confirmation ; tout est aussi dans l'espace client.

Un retour navigateur ne vaut jamais confirmation. Une tâche de rapprochement relance périodiquement
les paiements restés en attente.

## Devis pour les organisations

Une institution demande un devis (édition, durée, postes) → l'équipe KYA l'émet depuis
l'administration (PDF, validité) → l'organisation paie en ligne depuis le devis, ou par virement
rapproché manuellement par l'équipe (confirmation et audit).

## Montants et factures

- Entiers en FCFA ; prix hors taxes configurés dans l'administration ; TVA par pays de facturation
  (table configurable), figée sur la commande.
- Facture d'achat numérotée `FA-AAAA-NNNNN`, sans trou, immuable, PDF archivé. Correction = avoir.

## À obtenir de Semoa

Documentation d'API, environnement de test (sandbox), identifiants, format et signature des
webhooks, liste des moyens de paiement par pays, règles de remboursement. Variables prévues :
`SEMOA_API_URL`, `SEMOA_CLIENT_ID`, `SEMOA_CLIENT_SECRET`, `SEMOA_WEBHOOK_SECRET`.
