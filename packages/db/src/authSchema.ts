import { account, invitation, member, organization, session, user, verification } from './schema/auth.ts';

/** Tables de Better Auth, passées à son adaptateur Drizzle (spec 002). */
export const authSchema = { user, session, account, verification, organization, member, invitation };
