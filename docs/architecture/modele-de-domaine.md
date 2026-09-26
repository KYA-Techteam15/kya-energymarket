# Modèle de domaine

Première version, à préciser spécification par spécification. Les noms suivent le
[glossaire](../glossaire.md).

```text
Organization 1──* Member *──1 User
     │
     ├──* Order ──1 Payment*        (une commande, un ou plusieurs essais de paiement)
     │     └──1 Invoice             (émise quand le paiement est confirmé)
     ├──* Quote                     (devis pour organisation, peut devenir une commande)
     ├──* License ──* Seat ──0..1 Device activation
     │     └── Trial (licence d'essai, une par User et par Product)
     └──* SupportThread ──* SupportMessage

Product 1──* Edition 1──* Plan (durée, prix par poste)
   │           └── features, limits, watermark, graceDays
   ├──* Page ──* Block             (contenus composés, Markdown)
   ├──* Media
   └──* SoftwareRelease            (version, canal, notes, fichier)

UsageBatch (installation anonyme) · AuditEvent (qui, quoi, quand, résultat)
```

## Règles déjà connues

| Sujet | Règle |
|---|---|
| Éditions KYA-SolDesign | Commerciale (1 mois, 1 trimestre, 1 an ; toutes fonctions ; grâce 7 j), Académique (1 an ; sans devis ni prix de vente ; filigrane ; grâce 3 j), Étudiant (1 jour, 1 mois ; parcours seul ; 5 projets ; filigrane ; sans grâce). Tout est configurable. |
| Fonctions | Identifiants fixés par le logiciel : `system.aio`, `sizing.optimize`, `documents.word`, `documents.pricing`, `lifecycle.issue`, `catalog.userEquipment`. |
| Postes | Prix = prix par poste × postes (dégressif plus tard). Étudiant : un poste. Attribution par courriel ; libération immédiate côté plateforme, effective sur le poste à sa prochaine connexion. |
| Essai | Une fois par compte et par logiciel ; durée, édition de référence et fonctions réglées dans l'administration. |
| Commande | Pas de panier : une commande = une licence (nouvelle, renouvellement ou postes ajoutés). Idempotente. |
| Montants | Entiers en FCFA. TVA selon le pays de facturation, calculée côté serveur, figée sur la facture. |
| Facture d'achat | Numérotation continue par année (`FA-AAAA-NNNNN`), immuable, PDF. Une correction = avoir. |
| Échéance | Délai de grâce puis lecture seule ; aucun projet effacé. |
| Organisation | Invisible par défaut : un particulier en a une, créée d'office et jamais montrée. Elle apparaît dès qu'on achète pour une structure ou plusieurs postes. Rôles : propriétaire, membre. |
| Équipe KYA | Rôles distincts des rôles clients : administrateur, ventes, contenus, support. Seuls ces rôles accèdent à `/admin` et au MCP. |
| Audit | Toute écriture de l'administration, toute action MCP en écriture, tout changement de licence ou de paiement. |
