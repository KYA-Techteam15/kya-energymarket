import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { linkFromMail } from './outbox';

// Serveur MCP et OAuth (spec 003). Demandent une base : ignorés sans E2E_DATABASE_URL.
test.skip(!process.env.E2E_DATABASE_URL, 'aucune base de test (E2E_DATABASE_URL)');
test.describe.configure({ mode: 'serial', timeout: 180_000 });

const run = Date.now().toString(36);
const email = (name: string) => `${name}-${run}@exemple.test`;
const PASSWORD = 'motdepasse-de-test';
const REDIRECT_URI = 'http://127.0.0.1:9/rappel';
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

async function signUpVerified(page: Page, name: string, address: string) {
  await page.goto('/fr/connexion?onglet=creer');
  await page.getByLabel('Nom et prénom').fill(name);
  await page.getByLabel('Courriel').fill(address);
  await page.getByLabel('Mot de passe').fill(PASSWORD);
  await page.getByLabel(/J'accepte/u).check();
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page.getByRole('heading', { name: 'Vérifiez votre boîte.' })).toBeVisible();
  await page.goto(await linkFromMail(address, 'verify-email'));
  await expect(page).toHaveURL(/\/fr\/espace\/?$/u);
}

interface Discovery {
  readonly resource: string;
  readonly authorizationEndpoint: string;
  readonly tokenEndpoint: string;
  readonly registrationEndpoint: string;
}

/** Découverte comme un client MCP : 401 → métadonnées de ressource → serveur d'autorisation. */
async function discover(request: APIRequestContext): Promise<Discovery> {
  const challenge = await request.post('/mcp', { data: { jsonrpc: '2.0', id: 1, method: 'tools/list' } });
  expect(challenge.status()).toBe(401);
  const metadataUrl = /resource_metadata="([^"]+)"/u.exec(challenge.headers()['www-authenticate'] ?? '')?.[1];
  expect(metadataUrl).toMatch(/\/\.well-known\/oauth-protected-resource\/mcp$/u);
  const resourceMetadata = await (await request.get(metadataUrl!)).json();
  const issuer = new URL(resourceMetadata.authorization_servers[0]);
  const server = await (
    await request.get(`${issuer.origin}/.well-known/oauth-authorization-server${issuer.pathname}`)
  ).json();
  return {
    resource: resourceMetadata.resource,
    authorizationEndpoint: server.authorization_endpoint,
    tokenEndpoint: server.token_endpoint,
    registrationEndpoint: server.registration_endpoint,
  };
}

/** Enregistrement dynamique d'un client public (RFC 7591). */
async function register(request: APIRequestContext, discovery: Discovery, name: string) {
  const response = await request.post(discovery.registrationEndpoint, {
    data: {
      client_name: name,
      // Client installé (Claude Code, Codex) : redirection vers une adresse locale.
      application_type: 'native',
      redirect_uris: [REDIRECT_URI],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope: 'openid profile email offline_access admin:read',
    },
  });
  expect(response.status()).toBeLessThan(300);
  return (await response.json()).client_id as string;
}

function pkce() {
  const verifier = randomBytes(32).toString('base64url');
  return { verifier, challenge: createHash('sha256').update(verifier).digest('base64url') };
}

/** Ouvre l'autorisation dans un navigateur neuf ; rend la page et la promesse du code reçu. */
async function authorize(browser: Browser, discovery: Discovery, clientId: string, challenge: string) {
  const context = await browser.newContext({ locale: 'fr-FR' });
  const page = await context.newPage();
  let resolveCode: (code: string) => void = () => {};
  const code = new Promise<string>((resolve) => (resolveCode = resolve));
  // Le client IA écouterait sur REDIRECT_URI : on intercepte l'arrivée du code.
  await page.route(`${REDIRECT_URI}**`, async (route) => {
    resolveCode(new URL(route.request().url()).searchParams.get('code') ?? '');
    await route.fulfill({ status: 200, contentType: 'text/plain', body: 'ok' });
  });
  const url = new URL(discovery.authorizationEndpoint);
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    scope: 'openid profile email offline_access admin:read',
    state: randomBytes(8).toString('hex'),
    code_challenge: challenge,
    code_challenge_method: 'S256',
    resource: discovery.resource,
  }).toString();
  await page.goto(url.toString());
  return { page, code };
}

async function token(request: APIRequestContext, discovery: Discovery, form: Record<string, string>) {
  return request.post(discovery.tokenEndpoint, { form: { resource: discovery.resource, ...form } });
}

/** Appel JSON-RPC sur /mcp ; la réponse peut arriver en JSON ou en flux SSE. */
async function rpc(request: APIRequestContext, accessToken: string, method: string, params: object = {}) {
  const response = await request.post('/mcp', {
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': '2025-06-18',
    },
    data: { jsonrpc: '2.0', id: 1, method, params },
  });
  const text = await response.text();
  const body = text.startsWith('{')
    ? JSON.parse(text)
    : JSON.parse(
        text
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5))
          .at(-1) ?? '{}',
      );
  return { status: response.status(), body };
}

async function signInOnPage(page: Page, address: string) {
  await expect(page).toHaveURL(/\/fr\/connexion\?/u);
  await page.getByLabel('Courriel').fill(address);
  await page.getByLabel('Mot de passe').fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).last().click();
}

test.describe('serveur MCP (spec 003)', () => {
  test.skip(({ isMobile }) => isMobile, 'parcours complets sur ordinateur');

  let discovery: Discovery;
  let accessToken = '';

  test('un administrateur connecte un client : découverte, enregistrement, autorisation, outils', async ({
    page,
    browser,
    request,
  }) => {
    await signUpVerified(page, 'Admin Mcp', email('admin'));
    execFileSync('pnpm', ['staff:grant', '--email', email('admin'), '--role', 'kya_admin'], {
      cwd: repoRoot,
      shell: true,
      env: { ...process.env, DATABASE_URL: process.env.E2E_DATABASE_URL },
      stdio: 'pipe',
    });

    discovery = await discover(request);
    const clientId = await register(request, discovery, 'Client de test');
    const { verifier, challenge } = pkce();
    const flow = await authorize(browser, discovery, clientId, challenge);

    await signInOnPage(flow.page, email('admin'));
    await expect(flow.page.getByRole('heading', { name: 'Autoriser Client de test ?' })).toBeVisible();
    await expect(flow.page.getByText("Lire ce que l'équipe KYA administre : équipe, comptes clients")).toBeVisible();
    const results = await new AxeBuilder({ page: flow.page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
    await flow.page.getByRole('button', { name: 'Autoriser' }).click();
    const code = await flow.code;
    expect(code).not.toBe('');
    await flow.page.context().close();

    const issued = await token(request, discovery, {
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      code_verifier: verifier,
    });
    expect(issued.status()).toBe(200);
    const tokens = await issued.json();
    accessToken = tokens.access_token;
    expect(tokens.refresh_token).toBeTruthy();

    const init = await rpc(request, accessToken, 'initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'test', version: '1' },
    });
    expect(init.status).toBe(200);
    expect(init.body.result.serverInfo.name).toBe('kya-energy-market');

    const tools = await rpc(request, accessToken, 'tools/list');
    expect(tools.body.result.tools.map((tool: { name: string }) => tool.name).sort()).toEqual([
      'extend_license',
      'find_customer',
      'find_license',
      'get_page',
      'get_product',
      'issue_license',
      'list_pages',
      'list_staff',
      'publish_page',
      'release_seat',
      'revoke_license',
      'search_catalog',
      'set_license_seats',
      'set_plan_price',
      'update_edition',
      'update_page_draft',
      'update_product',
      'whoami',
    ]);
    // Outils du catalogue (spec 004) : lecture avec admin:read, écriture refusée sans admin:catalog.
    const offer = await rpc(request, accessToken, 'tools/call', {
      name: 'get_product',
      arguments: { product: 'kya-soldesign' },
    });
    expect(offer.body.result.content[0].text).toContain('"code": "commercial"');
    const denied = await rpc(request, accessToken, 'tools/call', {
      name: 'set_plan_price',
      arguments: { product: 'kya-soldesign', edition: 'student', duration: 'P1M', pricePerSeat: 1 },
    });
    expect(denied.body.result.isError).toBe(true);
    expect(denied.body.result.content[0].text).toContain('admin:catalog');
    const whoami = await rpc(request, accessToken, 'tools/call', { name: 'whoami', arguments: {} });
    expect(whoami.body.result.structuredContent).toMatchObject({ email: email('admin'), staffRoles: ['kya_admin'] });
    const found = await rpc(request, accessToken, 'tools/call', {
      name: 'find_customer',
      arguments: { query: `admin-${run}` },
    });
    expect(found.body.result.structuredContent.customers[0].email).toBe(email('admin'));
  });

  test('un compte client ne peut ni autoriser ni obtenir de jeton', async ({ page, browser, request }) => {
    await signUpVerified(page, 'Client Mcp', email('client'));
    const clientId = await register(request, discovery, 'Client indiscret');
    const { verifier, challenge } = pkce();
    const flow = await authorize(browser, discovery, clientId, challenge);
    await signInOnPage(flow.page, email('client'));
    await expect(flow.page.getByRole('heading', { name: "Réservé à l'équipe KYA." })).toBeVisible();
    await expect(flow.page.getByRole('button', { name: 'Autoriser' })).toHaveCount(0);

    // Contournement de la page : la demande signée est envoyée telle quelle au serveur.
    const bypass = await flow.page.evaluate(async () => {
      const response = await fetch('/api/auth/oauth2/consent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          accept: true,
          scope: 'openid profile email offline_access admin:read',
          oauth_query: window.location.search.slice(1),
        }),
      });
      return (await response.json()) as { url?: string };
    });
    // Le consentement seul ne donne rien : c'est l'émission du jeton qui refuse le compte client.
    const code = new URL(bypass.url ?? 'http://x').searchParams.get('code');
    expect(code).toBeTruthy();
    const issued = await token(request, discovery, {
      grant_type: 'authorization_code',
      code: code!,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      code_verifier: verifier,
    });
    expect(issued.status()).toBe(403);
    expect(await issued.text()).not.toContain('access_token');
    await flow.page.context().close();
  });

  test('révoquer un client depuis l’administration le coupe aussitôt', async ({ page, request }) => {
    await page.goto('/fr/connexion');
    await page.getByLabel('Courriel').fill(email('admin'));
    await page.getByLabel('Mot de passe').fill(PASSWORD);
    await page.getByRole('button', { name: 'Se connecter', exact: true }).last().click();
    await expect(page).toHaveURL(/\/fr\/espace\/?$/u);

    await page.goto('/fr/admin/mcp');
    await expect(page.getByRole('heading', { name: 'MCP.' })).toBeVisible();
    await expect(page.getByTestId('mcp-url')).toHaveText(/\/mcp$/u);
    await expect(page.locator('.tbl')).toContainText('Client de test');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);

    await page.getByRole('button', { name: 'Révoquer' }).click();
    await expect(page.getByRole('status')).toContainText('Autorisation retirée');
    const after = await rpc(request, accessToken, 'tools/list');
    expect(after.status).toBe(403);
  });
});
