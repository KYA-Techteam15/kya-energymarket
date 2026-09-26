# Connecter Claude ou Codex au serveur MCP

Le serveur MCP de KYA-EnergyMarket sert à **administrer la plateforme depuis un assistant IA**. Il
est réservé à l'équipe KYA : un compte sans rôle d'équipe (`kya_admin`, `kya_sales`, `kya_content`,
`kya_support`) n'obtient jamais de jeton. Spécification : [`specs/003-mcp`](../../specs/003-mcp/spec.md).

## Adresses

| Environnement | Serveur MCP |
|---|---|
| `dev` | `https://kya-energy-market-dev.13.140.178.49.sslip.io/mcp` |
| local | `http://localhost:3000/mcp` |
| production | `https://<domaine>/mcp` (domaine à choisir) |

L'administration affiche l'adresse de l'environnement courant : **Administration → MCP**.

## Claude (application ou claude.ai)

1. Paramètres → Connecteurs → **Ajouter un connecteur personnalisé**.
2. Collez l'adresse du serveur MCP, validez.
3. Claude ouvre la page **Se connecter** du site : connectez-vous avec votre compte de l'équipe KYA.
4. La page **Autoriser Claude ?** s'affiche : vérifiez le compte et les droits, puis **Autoriser**.

## Claude Code

```bash
claude mcp add --transport http kya-energy-market https://<site>/mcp
```

Puis `/mcp` dans Claude Code pour lancer la connexion : le navigateur s'ouvre sur les mêmes pages.

## Codex

```bash
codex mcp add kya-energy-market --url https://<site>/mcp
codex mcp login kya-energy-market
```

## Outils

| Outil | Portée | Rôle |
|---|---|---|
| `whoami` | `admin:read` | votre identité, vos rôles d'équipe et les portées accordées au client |
| `list_staff` | `admin:read` | l'équipe KYA et ses rôles |
| `find_customer` | `admin:read` | recherche d'un compte client par courriel ou nom (20 résultats au plus) |
| `search_catalog`, `get_product` | `admin:read` | catalogue et offre d'un logiciel |
| `list_pages`, `get_page` | `admin:read` | pages, blocs et description des types de blocs |
| `update_product`, `update_edition`, `set_plan_price` | `admin:catalog` | modifier le catalogue (rôles administrateur, contenus) |
| `update_page_draft`, `publish_page` | `admin:content` | écrire un brouillon, publier (rôles administrateur, contenus) |

| `find_license` | `admin:read` | chercher une licence, ses postes et son journal |
| `issue_license`, `extend_license`, `set_license_seats`, `release_seat`, `revoke_license` | `admin:licenses` | licences (rôles administrateur et ventes ; révoquer : administrateur) |

Un client connecté avant la spécification 004 n'a que `admin:read` : retirez-le puis ajoutez-le de
nouveau pour accorder les portées d'écriture.

Chaque spécification ajoute ses outils (catalogue, licences, ventes, support…) avec les portées
correspondantes ; voir [API et MCP](../architecture/api-et-mcp.md).

## Sécurité

- OAuth 2.1 avec PKCE ; le client s'enregistre seul (RFC 7591) ou présente un document de métadonnées
  client (CIMD). Jeton d'accès JWT de 15 minutes, lié à l'adresse `/mcp` ; jeton de rafraîchissement
  rotatif.
- Le rôle d'équipe est vérifié trois fois : sur la page d'autorisation, à chaque émission de jeton
  (y compris au rafraîchissement) et à chaque appel `/mcp` (relu en base).
- **Révoquer** un client dans Administration → MCP le coupe dès son appel suivant.
- Chaque appel d'outil est tracé dans l'audit (`mcp.tool_called`) ; aucune valeur secrète n'est rendue.

## Dépannage

- `401` : jeton absent ou expiré ; le client relance la connexion ou rafraîchit son jeton.
- `403 insufficient_scope` : le client n'a pas demandé la portée ; reconnectez-le.
- `403` « réservé à l'équipe KYA » : le compte n'a plus de rôle d'équipe.
- `403` « autorisation retirée » : le client a été révoqué ; reconnectez-le.
