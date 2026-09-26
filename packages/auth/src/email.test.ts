import { auditEvents, user, type Database } from '@kya-em/db';
import { createTestDatabase } from '@kya-em/db/testing';
import { createMemoryMailer } from '@kya-em/mail';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAuth, type Auth } from './createAuth.ts';
import { inviteStaffMember, nameFromEmail } from './staffInvitation.ts';

// Comptes avec courriel (spec 002, avenant A) : vérification d'adresse, mot de passe oublié, équipe KYA.
const BASE = 'http://localhost:3000';
let handle: Awaited<ReturnType<typeof createTestDatabase>>;
let db: Database;
let auth: Auth;
const mailer = createMemoryMailer();

beforeAll(async () => {
  handle = await createTestDatabase();
  db = handle.db;
  auth = createAuth({
    db,
    secret: 'secret-de-test-long-de-plus-de-32-caracteres',
    baseUrl: BASE,
    environment: 'test',
    mailer,
    tanstackCookies: false,
  });
});
afterAll(async () => {
  await handle.close();
});

const lastMailTo = (email: string) => {
  const mail = mailer.sent.findLast((message) => message.to === email);
  if (!mail) throw new Error(`aucun courriel pour ${email}`);
  return mail;
};
const linkIn = (text: string) => /https?:\/\/\S+/u.exec(text)?.[0] ?? '';

/** Suit un lien d'un courriel sur le gestionnaire Better Auth ; rend la redirection et les cookies. */
async function follow(url: string) {
  const response = await auth.handler(new Request(url, { headers: { 'accept-language': 'fr-FR' } }));
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ');
  return { location: response.headers.get('location') ?? '', cookie };
}

describe('vérification de l’adresse', () => {
  it('envoie le lien à l’inscription, refuse la connexion avant, connecte après', async () => {
    const email = 'afi@exemple.tg';
    const signUp = await auth.api.signUpEmail({
      body: { email, password: 'motdepasse-solide', name: 'Afi Kodjo', callbackURL: '/fr/espace' },
    });
    expect(signUp.token).toBeNull();
    const mail = lastMailTo(email);
    expect(mail.kind).toBe('verify-email');
    expect(mail.subject).toBe('Confirmez votre adresse — KYA-EnergyMarket');

    await expect(auth.api.signInEmail({ body: { email, password: 'motdepasse-solide' } })).rejects.toMatchObject({
      statusCode: 403,
    });

    const { location, cookie } = await follow(linkIn(mail.text));
    expect(location).toBe('/fr/espace');
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(session?.user.emailVerified).toBe(true);

    const trace = await db.select().from(auditEvents).where(eq(auditEvents.action, 'account.email_verified'));
    expect(trace.map((event) => event.resourceId)).toContain(session?.user.id);
  });

  it('renvoie vers la page prévue avec une erreur si le lien est faux', async () => {
    const { location } = await follow(`${BASE}/api/auth/verify-email?token=faux&callbackURL=%2Ffr%2Fconnexion`);
    expect(location).toMatch(/^\/fr\/connexion\?error=/u);
  });
});

describe('mot de passe oublié', () => {
  it('envoie un lien, change le mot de passe et le trace', async () => {
    const email = 'afi@exemple.tg';
    await auth.api.requestPasswordReset({ body: { email, redirectTo: '/fr/mot-de-passe' } });
    const mail = lastMailTo(email);
    expect(mail.kind).toBe('reset-password');

    const { location } = await follow(linkIn(mail.text));
    const token = new URL(location, BASE).searchParams.get('token');
    expect(location).toBe(`${BASE}/fr/mot-de-passe?token=${token}`);
    await auth.api.resetPassword({ body: { token: token!, newPassword: 'nouveau-mot-de-passe' } });

    const signedIn = await auth.api.signInEmail({ body: { email, password: 'nouveau-mot-de-passe' } });
    expect(signedIn.token).toBeTruthy();
    const trace = await db.select().from(auditEvents).where(eq(auditEvents.action, 'account.password_reset'));
    expect(trace).toHaveLength(1);
  });

  it('ne dit pas si l’adresse existe', async () => {
    const before = mailer.sent.length;
    const result = await auth.api.requestPasswordReset({ body: { email: 'inconnu@exemple.tg' } });
    expect(result.status).toBe(true);
    expect(mailer.sent.length).toBe(before);
  });
});

describe('équipe KYA', () => {
  it('ouvre un compte, attribue le rôle et envoie le lien du mot de passe', async () => {
    const email = 'jeanne.dupont@kya.tg';
    const result = await inviteStaffMember(
      { auth, db, mailer, baseUrl: BASE },
      { email, role: 'kya_admin', actor: { type: 'system', id: null } },
    );
    expect(result).toMatchObject({ created: true, roles: ['kya_admin'] });
    const [row] = await db.select().from(user).where(eq(user.email, email));
    expect(row).toMatchObject({ name: 'Jeanne Dupont', emailVerified: true, role: 'kya_admin' });

    const mail = lastMailTo(email);
    expect(mail.kind).toBe('staff-welcome');
    expect(mail.text).toContain('administrateur');
    const { location } = await follow(linkIn(mail.text));
    const token = new URL(location, BASE).searchParams.get('token');
    await auth.api.resetPassword({ body: { token: token!, newPassword: 'mot-de-passe-equipe' } });
    const signedIn = await auth.api.signInEmail({ body: { email, password: 'mot-de-passe-equipe' } });
    expect(signedIn.user.email).toBe(email);
  });

  it('se contente d’attribuer le rôle à un compte existant', async () => {
    const before = mailer.sent.length;
    const result = await inviteStaffMember(
      { auth, db, mailer, baseUrl: BASE },
      { email: 'afi@exemple.tg', role: 'kya_support', actor: { type: 'system', id: null } },
    );
    expect(result.created).toBe(false);
    expect(mailer.sent.length).toBe(before);
  });

  it('tire un nom lisible de l’adresse', () => {
    expect(nameFromEmail('jeanclaude.messan@kya-energy.com')).toBe('Jeanclaude Messan');
    expect(nameFromEmail('afi_kodjo@exemple.tg')).toBe('Afi Kodjo');
  });
});
