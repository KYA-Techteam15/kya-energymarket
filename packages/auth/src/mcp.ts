/**
 * Serveur MCP (spec 003) : constantes partagées entre la configuration OAuth et le serveur `/mcp`.
 * Réservé à l'équipe KYA (ADR 0004).
 */

/** Portées d'identité (serveur d'autorisation) et portées d'administration (ressource `/mcp`). */
export const MCP_SCOPES = ['openid', 'profile', 'email', 'offline_access', 'admin:read'] as const;
export type McpScope = (typeof MCP_SCOPES)[number];

/** Portée exigée par les outils de lecture. Les portées d'écriture viendront avec leurs outils. */
export const MCP_READ_SCOPE = 'admin:read';

/** Revendication du jeton d'accès portant les rôles d'équipe KYA au moment de l'émission. */
export const STAFF_ROLES_CLAIM = 'https://kya-energy.com/staff_roles';

/** Adresse canonique de la ressource protégée : audience exacte des jetons. */
export const mcpResourceOf = (baseUrl: string) => `${new URL(baseUrl).origin}/mcp`;

/** Émetteur des jetons (Better Auth : adresse du site + `/api/auth`). */
export const mcpIssuerOf = (baseUrl: string) => `${new URL(baseUrl).origin}/api/auth`;
