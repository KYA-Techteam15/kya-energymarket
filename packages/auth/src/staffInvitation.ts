import { randomBytes } from 'node:crypto';
import { user, type Database } from '@kya-em/db';
import { accountIdByEmail, grantStaffRole, recordAuditEvent, type StaffRole } from '@kya-em/domain';
import { renderMail, type MailLocale, type Mailer } from '@kya-em/mail';
import { eq } from 'drizzle-orm';
import type { Auth } from './createAuth.ts';

const HOUR = 60 * 60 * 1000;

const roleLabels: Record<MailLocale, Record<StaffRole, string>> = {
  fr: {
    kya_admin: 'administrateur',
    kya_sales: 'commercial',
    kya_content: 'contenus',
    kya_support: 'support',
  },
  en: {
    kya_admin: 'administrator',
    kya_sales: 'sales',
    kya_content: 'content',
    kya_support: 'support',
  },
};

/** « jeanclaude.messan@… » → « Jeanclaude Messan » : nom provisoire, modifiable par la personne. */
export const nameFromEmail = (email: string) =>
  (email.split('@')[0] ?? email)
    .split(/[._-]+/u)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(' ') || email;

export interface StaffInvitation {
  readonly email: string;
  readonly role: StaffRole;
  readonly name?: string;
  readonly locale?: MailLocale;
  readonly actor: { type: 'kya_staff' | 'system'; id: string | null };
}

/**
 * Fait entrer quelqu'un dans l'équipe KYA (spec 002, avenant A). Sans compte, un compte sans mot de
 * passe est ouvert (adresse tenue pour vérifiée : seul son titulaire reçoit le lien), le rôle est
 * attribué, puis un courriel de bienvenue mène au choix du mot de passe (lien valable 72 heures).
 * Avec un compte existant, seul le rôle est attribué.
 */
export async function inviteStaffMember(
  dependencies: { auth: Auth; db: Database; mailer: Mailer; baseUrl: string },
  invitation: StaffInvitation,
) {
  const { auth, db, mailer, baseUrl } = dependencies;
  const email = invitation.email.trim().toLowerCase();
  const locale = invitation.locale ?? 'fr';
  let userId = await accountIdByEmail(db, email);
  const created = !userId;
  if (!userId) {
    const name = invitation.name?.trim() || nameFromEmail(email);
    const result = await auth.api.createUser({ body: { email, name, data: { emailVerified: true } } });
    userId = result.user.id;
  }
  const { roles } = await grantStaffRole(db, { email, role: invitation.role, actor: invitation.actor });

  if (created) {
    // Même jeton que « mot de passe oublié » : Better Auth le vérifie puis ouvre la page du mot de passe.
    const token = randomBytes(24).toString('base64url');
    const context = await auth.$context;
    await context.internalAdapter.createVerificationValue({
      value: userId,
      identifier: `reset-password:${token}`,
      expiresAt: new Date(Date.now() + 72 * HOUR),
    });
    const callbackURL = encodeURIComponent(`/${locale}/mot-de-passe`);
    const url = `${baseUrl}/api/auth/reset-password/${token}?callbackURL=${callbackURL}`;
    const [account] = await db.select({ name: user.name }).from(user).where(eq(user.id, userId)).limit(1);
    await mailer.send(
      renderMail(
        { kind: 'staff-welcome', name: account?.name ?? email, roleLabel: roleLabels[locale][invitation.role], url },
        locale,
        email,
      ),
    );
    await recordAuditEvent(db, {
      actorType: invitation.actor.type,
      actorId: invitation.actor.id,
      action: 'staff.invited',
      resourceType: 'user',
      resourceId: userId,
      outcome: 'success',
      details: { role: invitation.role },
    });
  }
  return { userId, created, roles };
}
