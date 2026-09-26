// Couche métier, rangée par fonctionnalité : une fonctionnalité = un dossier (service, schémas, tests).
export {
  AuditEventInput,
  recordAuditEvent,
  scrubDetails,
  type AuditEventInputValue,
} from './audit/recordAuditEvent.ts';
export { checkHealth, type HealthProbe, type HealthReport } from './health/checkHealth.ts';
export { createLogger, REDACTED_KEYS, type Logger } from './logging/createLogger.ts';
export {
  ensurePersonalOrganization,
  kindOf,
  listUserOrganizations,
  memberRole,
  metadataFor,
  preferredOrganizationId,
  slugFor,
  type OrganizationKind,
  type UserOrganization,
} from './accounts/organizations.ts';
export { findCustomers, type CustomerSummary } from './accounts/customers.ts';
export {
  grantStaffRole,
  accountIdByEmail,
  isStaffRole,
  listStaff,
  staffMemberById,
  revokeStaffRole,
  rolesOf,
  STAFF_ROLES,
  StaffError,
  staffRolesOf,
  type StaffRole,
} from './accounts/staff.ts';
export { hasMcpConnection, listMcpConnections, revokeMcpConnection, type McpConnection } from './mcp/connections.ts';
