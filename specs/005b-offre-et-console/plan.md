# Plan d'implémentation : Offre modulable et console d'administration

**Branche** : `feat-005-offre-et-console` · **Spécification** : [spec.md](spec.md)

## Contrôle de constitution

| Principe | Conformité |
|---|---|
| II. Une couche métier | brouillon du catalogue, types de licence, émission, lots, rattachement, statistiques et file de travaux dans `@kya-em/domain` ; la console, le MCP, l'API et l'amorçage les appellent ; les schémas Zod du domaine valident aussi les fonctions serveur |
| III. Sécurité serveur | droits `catalog:*`, `licenses:*`, `stats:read` revérifiés à chaque fonction serveur et outil MCP ; génération de lot et publication avec confirmation côté MCP ; clés chiffrées au repos comme en 005 |
| IV. Traçabilité | chaque écriture laisse une trace d'audit ; la publication du catalogue trace la liste des changements ; les licences gardent la copie figée de leur offre |
| V. Terrain | la console n'est chargée que par l'équipe ; tableau de bord calculé côté serveur ; aucune bibliothèque de graphiques (SVG à l'échelle) |
| VI. Qualité | tests PGlite (brouillon, publication, émission, lots, idempotence, rattachement, statistiques, jetons) ; parcours Playwright de la console avec axe |

## Modèle

```text
products          + software_editions (codes que le logiciel connaît), catalog_version
editions          + software_edition, highlights[], visible, for_sale, archived_at   (− active)
license_types     remplace plans : name, nature, days, price_per_seat, indicative,
                  seats_min, seats_max, renewable, visible, for_sale, archived_at, sort
catalog_drafts    product_id, document (offre complète en JSON), revision, updated_by
licenses          + license_type_id, type_name, nature, days, price_per_seat, amount, channel,
                  reason, reference, batch_id, recipient_email, starts_on_activation,
                  idempotency_key ; organization_id, starts_at, expires_at facultatifs
                  (− duration, − source)
license_batches   label, reason, mode, license_type_id, seats, count, customer_name,
                  organization_id, starts_on_activation, idempotency_key, created_by
jobs              kind, payload, status, attempts, run_at, last_error, reference
```

Deux migrations : `0005_offre` ajoute et reprend les données (les durées deviennent des types de
licence avec le même identifiant, les licences reçoivent leur type et leur copie figée) ; `0006_offre_nettoyage`
retire `editions.active`, `plans`, `licenses.duration` et `licenses.source`. Deux temps, pour que
drizzle-kit n'ait jamais à deviner un renommage.

## Brouillon du catalogue

Le document du brouillon contient toute l'offre d'un logiciel (fiche, fonctions, éditions, types).
La console et le MCP envoient des **changements typés** (`CatalogChange`, union Zod : fiche,
édition, déplacement, type de licence, retrait d'un élément jamais publié). Chaque changement est
appliqué au document puis le document entier est validé (codes uniques, profils connus du logiciel,
fonctions connues, postes cohérents). `publishCatalog` compare le document à l'offre publiée, écrit
les différences dans une transaction, incrémente `catalog_version`, trace la liste des changements et
supprime le brouillon ; il refuse si la révision du brouillon a changé depuis sa lecture.

## Jeton et logiciel

- `edition` du jeton = `software_edition` de l'édition ; `plan` = code tiré des jours (`365` → `12m`,
  `14` → `14d`) ; fonctions et limites lues dans l'édition publiée, comme en 005.
- Côté KYA-SolDesign (T061, dépôt du logiciel) : ignorer une fonction inconnue au lieu de refuser le
  jeton, accepter un profil inconnu en lecture seule, afficher le nom du type au lieu du code de
  formule. Ces points rejoignent la tâche T052.

## Console

```text
apps/web/src/features/admin/
  console/       coquille (menu, barre, Ctrl K, panneau, interrupteur, notifications), styles console.css
  dashboard/     tableau de bord et statistiques
  licenses/      liste, panneau de licence, émission
  batches/       lots, assistant de génération
  catalog/       logiciels, logiciel (éditions, fonctions), édition (droits, caractéristiques, types)
  journal/       journal d'audit
apps/web/src/routes/admin/
  index, licences/(index, $id → redirection), lots/(index, nouveau, $id),
  catalogue/(index, $slug/index, $slug/$edition), journal, pages, medias, equipe, mcp
```

L'habillage du site (en-tête, pied de page) n'est pas rendu sous `/admin`. Les pages existantes
(pages, médias, équipe, MCP) sont reprises dans la nouvelle coquille sans changer de fond.

## File de travaux

Table `jobs` en base ; un intervalle du serveur (5 s) réclame les travaux dus avec
`FOR UPDATE SKIP LOCKED`, les exécute, reprogramme un échec (1, 5, 15, 60 min) jusqu'à 5 tentatives.
Premier travail : `mail.license_key` (courriel de clé d'une licence émise ou d'un lot).
