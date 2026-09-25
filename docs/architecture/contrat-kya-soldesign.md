# Contrat avec KYA-SolDesign

KYA-SolDesign (dépôt `KYA-Techteam15/kya-soldesign`) joue aujourd'hui la plateforme avec
`SimulatedAdminApi` et `SimulatedUsageApi` et une clé de signature de démonstration **publique**.
Tant que ces simulations signent, n'importe qui peut fabriquer une licence : la tâche **T061** du
logiciel est bloquante avant toute vente. Ce document fixe ce que la plateforme doit exposer pour que
KYA-SolDesign passe à `HttpAdminApi` sans changer ses écrans.

Référence côté logiciel : `apps/desktop/src/app/licensing/adminApi.ts`, `token.ts`, `features.ts`,
`feedback/usageApi.ts`.

## Jeton de licence

Format existant, à reproduire à l'octet près :

- `base64url(JSON(payload)) + "." + base64url(signature)`, signature **ECDSA P-256 / SHA-256** sur la
  partie encodée ; vérifiable hors ligne avec la clé publique embarquée dans le logiciel.
- Charge utile `LicensePayload` :

| Champ | Type | Sens |
|---|---|---|
| `licenseId` | string | identifiant stable de la licence |
| `customer` | string | nom affiché (organisation ou personne) |
| `edition` | `commercial` \| `academic` \| `student` | édition |
| `plan` | string | `1d`, `1m`, `3m`, `12m`… |
| `features` | FeatureId[] | fonctions ouvertes (liste fermée du logiciel) |
| `limits` | `{ maxProjects: number \| null, seats: number }` | limites |
| `watermark` | `academic` \| `student` \| null | filigrane des documents |
| `deviceId` | string | poste auquel le jeton est lié |
| `issuedAt`, `startsAt`, `expiresAt` | ISO 8601 | dates |
| `graceDays` | number | délai de grâce après `expiresAt` |
| `offlineDays` | number | au-delà, le poste doit se reconnecter |

La clé privée vit dans les secrets du serveur (`LICENSE_SIGNING_PRIVATE_KEY`, identifiée par
`LICENSE_SIGNING_KEY_ID`) ; la clé publique correspondante remplace `LICENSE_PUBLIC_KEY` dans le
logiciel. Une rotation de clé suppose une version du logiciel qui connaît les deux clés.

## Points d'entrée `/api/software/v1`

Réponses JSON ; erreurs métier sous forme `{ "error": "CODE" }` avec les codes déjà attendus par le
logiciel.

| Méthode `AdminApi` | Route | Entrée | Sortie |
|---|---|---|---|
| `now()` | `GET /time` | — | `{ now }` (heure serveur, contre une horloge reculée) |
| `catalog()` | `GET /products/kya-soldesign/editions` | — | `EditionDescriptor[]` |
| `activate(key, deviceId)` | `POST /licenses/activate` | `{ key, deviceId }` ou session du compte + `deviceId` | `{ token }` \| `KEY_UNKNOWN` \| `SEATS_EXHAUSTED` |
| `refresh(licenseId, deviceId)` | `POST /licenses/{licenseId}/refresh` | `{ deviceId }` | `{ token }` \| `LICENSE_UNKNOWN` \| `LICENSE_REVOKED` \| `DEVICE_RELEASED` |
| `release(licenseId, deviceId)` | `POST /licenses/{licenseId}/release` | `{ deviceId }` | 204 |

| Méthode `UsageApi` | Route | Entrée | Sortie |
|---|---|---|---|
| `sendEvents(batch)` | `POST /usage` | `UsageBatch` (installation anonyme, version, édition, langue, événements) | 202 |
| `sendFeedback(installationId, draft)` | `POST /feedback` | `{ installationId, kind, message, contact, diagnostics }` | `FeedbackThread` |
| `listFeedback(installationId)` | `GET /feedback?installationId=` | — | `FeedbackThread[]` avec réponses de l'équipe |

À ajouter côté logiciel dans la même tranche : connexion au compte (OAuth, navigateur système avec
PKCE) pour activer sans saisir de clé, et activation d'une clé d'essai.

## Règles

- Une activation consomme un poste ; réactiver le même poste renvoie un jeton neuf sans consommer.
- Un poste libéré dans l'espace client reçoit `DEVICE_RELEASED` à son prochain rafraîchissement.
- Le logiciel n'envoie jamais de contenu de projet ; `diagnostics` n'est joint qu'avec l'accord de
  la personne.
- Limites de débit par clé et par poste ; journal d'activation consultable dans l'administration.
- Tests de contrat partagés : les exemples de requêtes et de jetons vivent dans
  `packages/contracts` et sont rejoués contre le logiciel.

## Changements côté logiciel (pour mémoire)

- T061 : `HttpAdminApi`, vraie clé publique, retrait des clés et de la licence de démonstration.
- Vocabulaire : « Devis » remplace « facture proforma » dans l'interface et les documents.
