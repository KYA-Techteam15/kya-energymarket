# Modèle de données — Socle

## `audit_events`

| Colonne | Type | Règle |
|---|---|---|
| `id` | uuid | clé primaire, générée |
| `occurred_at` | timestamptz | défaut `now()`, UTC |
| `actor_type` | text | `user`, `kya_staff`, `system`, `software`, `mcp_client` |
| `actor_id` | text, nullable | identifiant de l'acteur ; nul pour `system` |
| `action` | text | verbe pointé, ex. `license.revoke` |
| `resource_type` | text | ex. `license` |
| `resource_id` | text, nullable | identifiant de la ressource |
| `outcome` | text | `success`, `denied`, `failure` |
| `details` | jsonb | détails non sensibles ; défaut `{}` |
| `request_id` | text, nullable | corrélation avec les journaux |

Index : `(occurred_at desc)`, `(resource_type, resource_id)`, `(actor_type, actor_id)`.

Écriture seulement par le service `recordAuditEvent` ; aucune mise à jour ni suppression prévue
(table en ajout seul).
