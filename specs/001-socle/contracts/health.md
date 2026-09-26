# Contrat — `GET /api/health`

Public, sans authentification, sans cache (`Cache-Control: no-store`). Ne révèle aucun secret ni
aucune adresse de base.

## 200 — application en état de servir

```json
{
  "status": "ok",
  "version": "0.1.0",
  "environment": "development",
  "checks": { "database": "ok" },
  "time": "2026-09-25T12:00:00.000Z"
}
```

## 503 — base injoignable

```json
{
  "status": "degraded",
  "version": "0.1.0",
  "environment": "production",
  "checks": { "database": "unavailable" },
  "time": "2026-09-25T12:00:00.000Z"
}
```

`checks.database` vaut `ok`, `unavailable` (échec ou délai de 3 s dépassé) ou `not_configured`
(aucune `DATABASE_URL` en développement ; statut global `ok`, code 200).
