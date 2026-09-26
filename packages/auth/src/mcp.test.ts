import { oauthClient, oauthConsent, oauthRefreshToken, type Database } from '@kya-em/db';
import { createTestDatabase } from '@kya-em/db/testing';
import {
  findCustomers,
  grantStaffRole,
  hasMcpConnection,
  listMcpConnections,
  revokeMcpConnection,
  staffMemberById,
} from '@kya-em/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAuth, type Auth } from './createAuth.ts';
import { mcpIssuerOf, mcpResourceOf } from './mcp.ts';

// Serveur MCP (spec 003) : règles de domaine derrière les outils et les connexions.
let handle: Awaited<ReturnType<typeof createTestDatabase>>;
let db: Database;
let auth: Auth;

beforeAll(async () => {
  handle = await createTestDatabase();
  db = handle.db;
  auth = createAuth({
    db,
    secret: 'secret-de-test-long-de-plus-de-32-caracteres',
    baseUrl: 'http://localhost:3000',
    environment: 'test',
    mailer: null,
    tanstackCookies: false,
  });
});
afterAll(async () => {
  await handle.close();
});

const signUp = async (email: string, name: string) =>
  (await auth.api.signUpEmail({ body: { email, name, password: 'motdepasse-solide' } })).user;

describe('adresses du serveur MCP', () => {
  it('lie la ressource et l’émetteur à l’origine du site', () => {
    expect(mcpResourceOf('https://kya.example/fr/')).toBe('https://kya.example/mcp');
    expect(mcpIssuerOf('https://kya.example')).toBe('https://kya.example/api/auth');
  });
});

describe('outils : équipe et clients', () => {
  it('ne reconnaît que les membres de l’équipe, rôle relu en base', async () => {
    const staff = await signUp('equipe@kya.tg', 'Esi Equipe');
    const client = await signUp('client@exemple.tg', 'Kofi Client');
    expect(await staffMemberById(db, staff.id)).toBeNull();
    await grantStaffRole(db, { email: 'equipe@kya.tg', role: 'kya_support', actor: { type: 'system', id: null } });
    expect(await staffMemberById(db, staff.id)).toMatchObject({ email: 'equipe@kya.tg', roles: ['kya_support'] });
    expect(await staffMemberById(db, client.id)).toBeNull();
  });

  it('trouve un client par courriel ou nom, sans l’organisation personnelle', async () => {
    const [found] = await findCustomers(db, { query: 'kofi' });
    expect(found).toMatchObject({ email: 'client@exemple.tg', organizations: [], staffRoles: [] });
    expect(await findCustomers(db, { query: 'client@exemple' })).toHaveLength(1);
  });

  it('traite % et _ comme du texte, et refuse les recherches trop courtes', async () => {
    expect(await findCustomers(db, { query: '%' })).toEqual([]);
    expect(await findCustomers(db, { query: '%%' })).toEqual([]);
    expect(await findCustomers(db, { query: '__' })).toEqual([]);
  });
});

describe('connexions MCP', () => {
  it('liste, vérifie et révoque aussitôt l’autorisation d’un client', async () => {
    const [staff] = await findCustomers(db, { query: 'equipe@kya.tg' });
    const now = new Date();
    await db.insert(oauthClient).values({
      id: 'c1',
      clientId: 'client-claude',
      name: 'Claude',
      redirectUris: ['http://127.0.0.1:9/rappel'],
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(oauthConsent).values({
      id: 'consent-1',
      clientId: 'client-claude',
      userId: staff!.id,
      scopes: ['openid', 'admin:read'],
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(oauthRefreshToken).values({
      id: 'r1',
      token: 'empreinte',
      clientId: 'client-claude',
      userId: staff!.id,
      expiresAt: new Date(now.getTime() + 86_400_000),
      createdAt: now,
      scopes: ['admin:read'],
    });

    expect(await listMcpConnections(db, staff!.id)).toMatchObject([
      { clientName: 'Claude', scopes: ['openid', 'admin:read'] },
    ]);
    expect(await hasMcpConnection(db, staff!.id, 'client-claude')).toBe(true);

    expect(await revokeMcpConnection(db, { userId: 'autre', connectionId: 'consent-1' })).toBe(false);
    expect(await revokeMcpConnection(db, { userId: staff!.id, connectionId: 'consent-1' })).toBe(true);
    expect(await hasMcpConnection(db, staff!.id, 'client-claude')).toBe(false);
    const [refresh] = await db.select().from(oauthRefreshToken).where(eq(oauthRefreshToken.id, 'r1'));
    expect(refresh?.revoked).toBeInstanceOf(Date);
  });
});
