import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { authSchema, type Database } from '@kya-em/db';
import { ensurePersonalOrganization, preferredOrganizationId, recordAuditEvent, type Logger } from '@kya-em/domain';
import { betterAuth } from 'better-auth';
import { admin, magicLink, organization } from 'better-auth/plugins';
import { tanstackStartCookies } from 'better-auth/tanstack-start';
import type { Mailer } from './mailer.ts';
import { ac, roles } from './permissions.ts';

export interface AuthDependencies {
  readonly db: Database;
  readonly secret: string;
  /** Adresse publique du site (sans /api/auth). */
  readonly baseUrl: string;
  readonly environment: 'development' | 'test' | 'production';
  /** `null` : aucun fournisseur de courriel (lien de connexion désactivé, invitations par lien). */
  readonly mailer: Mailer | null;
  readonly logger?: Logger;
  /** Écriture des cookies par TanStack Start ; désactivée hors du serveur web (tests, scripts). */
  readonly tanstackCookies?: boolean;
}

const DAY = 60 * 60 * 24;

/**
 * Configuration Better Auth de KYA-EnergyMarket (spec 002). Les règles métier (organisation
 * personnelle, organisation préférée) vivent dans `@kya-em/domain` ; ce fichier les branche.
 */
export function createAuth(dependencies: AuthDependencies) {
  const { db, mailer, logger } = dependencies;
  const audit = (event: Parameters<typeof recordAuditEvent>[1]) =>
    recordAuditEvent(db, event).catch((error: unknown) => logger?.error({ err: error }, 'audit impossible'));

  return betterAuth({
    appName: 'KYA-EnergyMarket',
    secret: dependencies.secret,
    baseURL: dependencies.baseUrl,
    basePath: '/api/auth',
    database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      autoSignIn: true,
      // Vérification obligatoire dès qu'un fournisseur de courriel sera branché.
      requireEmailVerification: false,
    },
    session: {
      expiresIn: 30 * DAY,
      updateAge: DAY,
      // Pas de cache de session dans le cookie : un rôle retiré ou une organisation changée doit valoir
      // à la requête suivante, pas cinq minutes plus tard (autorisation décidée côté serveur).
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: dependencies.environment !== 'test',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 5 },
        '/sign-in/magic-link': { window: 60, max: 3 },
      },
    },
    advanced: {
      cookiePrefix: 'kya-em',
      useSecureCookies: dependencies.environment === 'production',
    },
    databaseHooks: {
      user: {
        create: {
          // Organisation personnelle, créée d'office et jamais montrée (spec 002, FR-002).
          after: async (user) => {
            await ensurePersonalOrganization(db, { id: user.id, name: user.name });
            await audit({
              actorType: 'user',
              actorId: user.id,
              action: 'account.created',
              resourceType: 'user',
              resourceId: user.id,
              outcome: 'success',
            });
          },
        },
      },
      session: {
        create: {
          // Lecture seule : écrire ici (organisation, membre) attendrait la validation du compte encore en cours.
          before: async (session) => ({
            data: { ...session, activeOrganizationId: await preferredOrganizationId(db, session.userId) },
          }),
        },
      },
    },
    plugins: [
      organization({
        creatorRole: 'owner',
        invitationExpiresIn: 7 * DAY,
        cancelPendingInvitationsOnReInvite: true,
        sendInvitationEmail: async ({ email, organization: invitedTo, id }) => {
          if (!mailer) return; // le lien est affiché à l'invitant (FR-004)
          await mailer.send({
            to: email,
            subject: `Invitation à rejoindre ${invitedTo.name} sur KYA-EnergyMarket`,
            text: `Vous êtes invité à rejoindre ${invitedTo.name}. Acceptez l'invitation : ${dependencies.baseUrl}/fr/invitation/${id}`,
          });
        },
        organizationHooks: {
          afterCreateOrganization: async ({ organization: created, user }) => {
            await audit({
              actorType: 'user',
              actorId: user.id,
              action: 'organization.created',
              resourceType: 'organization',
              resourceId: created.id,
              outcome: 'success',
            });
          },
          afterUpdateOrganization: async ({ organization: updated, user }) => {
            await audit({
              actorType: 'user',
              actorId: user.id,
              action: 'organization.updated',
              resourceType: 'organization',
              resourceId: updated?.id ?? null,
              outcome: 'success',
            });
          },
          afterCreateInvitation: async ({ invitation, inviter }) => {
            await audit({
              actorType: 'user',
              actorId: inviter.id,
              action: 'organization.member_invited',
              resourceType: 'invitation',
              resourceId: invitation.id,
              outcome: 'success',
            });
          },
          afterAcceptInvitation: async ({ invitation, user }) => {
            await audit({
              actorType: 'user',
              actorId: user.id,
              action: 'organization.invitation_accepted',
              resourceType: 'invitation',
              resourceId: invitation.id,
              outcome: 'success',
            });
          },
          afterRemoveMember: async ({ member, user }) => {
            await audit({
              actorType: 'user',
              actorId: user.id,
              action: 'organization.member_removed',
              resourceType: 'member',
              resourceId: member.id,
              outcome: 'success',
            });
          },
        },
      }),
      admin({ ac, roles, defaultRole: 'user', adminRoles: ['kya_admin'] }),
      magicLink({
        expiresIn: 10 * 60,
        disableSignUp: true,
        sendMagicLink: async ({ email, url }) => {
          if (!mailer) throw new Error('Aucun fournisseur de courriel configuré.');
          await mailer.send({
            to: email,
            subject: 'Votre lien de connexion à KYA-EnergyMarket',
            text: `Connectez-vous : ${url} (valable 10 minutes)`,
          });
        },
      }),
      ...(dependencies.tanstackCookies === false ? [] : [tanstackStartCookies()]),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
