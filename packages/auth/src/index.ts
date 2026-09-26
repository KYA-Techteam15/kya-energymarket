export { createAuth, type Auth, type AuthDependencies } from './createAuth.ts';
export {
  ac,
  isStaff,
  roles,
  staffCan,
  STAFF_ROLES,
  staffRolesOf,
  type Resource,
  type StaffRole,
} from './permissions.ts';
export { inviteStaffMember, nameFromEmail, type StaffInvitation } from './staffInvitation.ts';
export { MCP_READ_SCOPE, MCP_SCOPES, mcpIssuerOf, mcpResourceOf, STAFF_ROLES_CLAIM, type McpScope } from './mcp.ts';
export { requireMcpAuth } from '@better-auth/mcp';
