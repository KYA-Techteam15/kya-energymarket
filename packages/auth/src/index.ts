export { createAuth, type Auth, type AuthDependencies } from './createAuth.ts';
export { createDevelopmentMailer, type MailMessage, type Mailer } from './mailer.ts';
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
