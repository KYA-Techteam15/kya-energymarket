# Clés publiques des licences

Clés publiques (ECDSA P-256, JWK) qui vérifient les jetons émis par chaque environnement. KYA-SolDesign embarque celle de la production (`LICENSE_PUBLIC_KEY`, tâche T061). Les clés privées vivent dans le fichier de secrets et dans Coolify, jamais ici.

## dev — `dev-2026-09-26`

```json
{
  "kty": "EC",
  "crv": "P-256",
  "x": "cst-1KzBdetUvapHCFwAIl-dw4SEEa_Y_MWnTMuSv-0",
  "y": "wHtqcCpjW5MxeYJE5VKRmcMSTY5IZl1GmD0g3vl7y3M"
}
```

## production — `production-2026-09-26`

```json
{
  "kty": "EC",
  "crv": "P-256",
  "x": "gIrGNfod9yXlmdGlpKCKV0tEtYSI3i3Y3j-IX6QrQgY",
  "y": "cDFjZR6VXtuCzoeShSJ-XjuDPCWNE3-KxyswVa4mtrU"
}
```
