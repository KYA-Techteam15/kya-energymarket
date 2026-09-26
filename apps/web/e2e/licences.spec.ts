import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { linkFromMail, OUTBOX_DIR } from './outbox';

// Licences et API KYA-SolDesign (spec 005). Demandent une base.
test.skip(!process.env.E2E_DATABASE_URL, 'aucune base de test (E2E_DATABASE_URL)');
test.describe.configure({ mode: 'serial', timeout: 180_000 });

const run = Date.now().toString(36);
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const PASSWORD = 'motdepasse-de-test';
const admin = `lic-admin-${run}@exemple.test`;
const customer = `lic-client-${run}@exemple.test`;
const colleague = `lic-collegue-${run}@exemple.test`;
const axe = async (page: Page) => (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations;
const API = '/api/software/v1';
let key = '';
let licenseId = '';

async function signUp(page: Page, name: string, address: string) {
  await page.goto('/fr/connexion?onglet=creer');
  await page.getByLabel('Nom et prénom').fill(name);
  await page.getByLabel('Courriel').fill(address);
  await page.getByLabel('Mot de passe').fill(PASSWORD);
  await page.getByLabel(/J'accepte/u).check();
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await page.goto(await linkFromMail(address, 'verify-email'));
  await expect(page).toHaveURL(/\/fr\/espace\/?$/u);
}

async function signIn(page: Page, address: string) {
  await page.goto('/fr/connexion');
  await page.getByLabel('Courriel').fill(address);
  await page.getByLabel('Mot de passe').fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).last().click();
  await expect(page).toHaveURL(/\/fr\/espace/u);
}

test.describe('licences (spec 005)', () => {
  test.skip(({ isMobile }) => isMobile, 'parcours complets sur ordinateur');

  test('l’équipe émet une licence d’un poste pour un client', async ({ browser, page }) => {
    const client = await browser.newContext({ locale: 'fr-FR' });
    await signUp(await client.newPage(), 'Ama Cliente', customer);
    await client.close();

    await signUp(page, 'Admin Licences', admin);
    execFileSync('pnpm', ['staff:grant', '--email', admin, '--role', 'kya_admin'], {
      cwd: repoRoot,
      shell: true,
      env: { ...process.env, DATABASE_URL: process.env.E2E_DATABASE_URL },
      stdio: 'pipe',
    });
    await page.goto('/fr/admin/licences');
    await expect(page.getByRole('heading', { name: 'Licences.' })).toBeVisible();
    await page.getByLabel(/Courriel du titulaire/u).fill(customer);
    await page.getByLabel('Édition').selectOption('commercial');
    await page.getByLabel('Durée').selectOption('P1Y');
    await page.getByRole('spinbutton', { name: 'Postes' }).fill('1');
    await page.getByRole('button', { name: 'Émettre', exact: true }).click();
    await expect(page).toHaveURL(/\/fr\/admin\/licences\/lic_/u);
    key = (await page.getByTestId('admin-license-key').textContent())!.trim();
    licenseId = page.url().split('/').at(-1)!;
    expect(key).toMatch(/^KYA-COM-12M-/u);
    await expect(page.getByRole('heading', { name: 'Ama Cliente' })).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });

  test('le logiciel s’active, bute sur le nombre de postes, et lit l’offre', async ({ request }) => {
    const preflight = await request.fetch(`${API}/licenses/activate`, { method: 'OPTIONS' });
    expect(preflight.status()).toBe(204);
    expect(preflight.headers()['access-control-allow-origin']).toBe('*');

    const time = await (await request.get(`${API}/time`)).json();
    expect(Date.parse(time.now)).toBeGreaterThan(0);
    const editions = await (await request.get(`${API}/products/kya-soldesign/editions`)).json();
    expect(editions.map((edition: { edition: string }) => edition.edition)).toEqual([
      'commercial',
      'academic',
      'student',
    ]);

    const first = await request.post(`${API}/licenses/activate`, {
      data: { key: key.toLowerCase(), deviceId: `poste-a-${run}`, deviceName: 'PC-BUREAU-01' },
    });
    expect(first.status()).toBe(200);
    const { token } = await first.json();
    const payload = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'));
    expect(payload).toMatchObject({
      licenseId,
      customer: 'Ama Cliente',
      edition: 'commercial',
      plan: '12m',
      deviceId: `poste-a-${run}`,
    });

    const again = await request.post(`${API}/licenses/activate`, { data: { key, deviceId: `poste-a-${run}` } });
    expect(again.status()).toBe(200);
    const full = await request.post(`${API}/licenses/activate`, { data: { key, deviceId: `poste-b-${run}` } });
    expect(full.status()).toBe(409);
    expect(await full.json()).toEqual({ error: 'SEATS_EXHAUSTED' });
    const unknown = await request.post(`${API}/licenses/activate`, {
      data: { key: 'KYA-COM-12M-AAAA-BBBB-CCCC', deviceId: `poste-c-${run}` },
    });
    expect(await unknown.json()).toEqual({ error: 'KEY_UNKNOWN' });
  });

  test('le client voit sa licence, libère le poste ; le logiciel en est averti', async ({ page, request }) => {
    await signIn(page, customer);
    await page.getByRole('link', { name: 'Licences' }).click();
    await expect(page.getByRole('heading', { name: 'Licences.' })).toBeVisible();
    await expect(page.getByTestId('seats-used')).toHaveText('1 sur 1');
    await expect(page.getByTestId('license-key')).not.toHaveText(key);
    await page.getByRole('button', { name: 'Afficher la clé' }).click();
    await expect(page.getByTestId('license-key')).toHaveText(key);
    await expect(page.locator('.tbl')).toContainText('PC-BUREAU-01');
    expect(await axe(page)).toEqual([]);

    await page.getByRole('button', { name: /Libérer PC-BUREAU-01/u }).click();
    await expect(page.getByRole('status')).toContainText('Poste libéré');
    await expect(page.getByTestId('seats-used')).toHaveText('0 sur 1');

    const refused = await request.post(`${API}/licenses/${licenseId}/refresh`, {
      data: { deviceId: `poste-a-${run}` },
    });
    expect(await refused.json()).toEqual({ error: 'DEVICE_RELEASED' });
    const other = await request.post(`${API}/licenses/activate`, { data: { key, deviceId: `poste-b-${run}` } });
    expect(other.status()).toBe(200);
    const refreshed = await request.post(`${API}/licenses/${licenseId}/refresh`, {
      data: { deviceId: `poste-b-${run}` },
    });
    expect(refreshed.status()).toBe(200);
  });

  test('le client attribue un poste : la clé part par courriel', async ({ page }) => {
    await signIn(page, customer);
    await page.goto('/fr/espace/licences');
    await page.getByRole('button', { name: 'Attribuer un poste' }).click();
    await page.getByLabel('Courriel du collègue').fill(colleague);
    await page.getByRole('button', { name: 'Envoyer la clé' }).click();
    await expect(page.getByRole('status')).toContainText(`Clé et marche à suivre envoyées à ${colleague}`);
    await expect
      .poll(
        () =>
          readdirSync(OUTBOX_DIR)
            .map(
              (file) =>
                JSON.parse(readFileSync(join(OUTBOX_DIR, file), 'utf8')) as { to: string; kind: string; text: string },
            )
            .find((mail) => mail.to === colleague && mail.kind === 'license-seat')?.text ?? '',
      )
      .toContain(key);
  });

  test('l’équipe révoque : le logiciel reçoit LICENSE_REVOKED', async ({ page, request }) => {
    await signIn(page, admin);
    await page.goto(`/fr/admin/licences/${licenseId}`);
    await page.getByLabel('Je confirme la révocation de cette licence.').check();
    await page.getByRole('button', { name: 'Révoquer la licence' }).click();
    await expect(page.getByRole('status')).toHaveText('Enregistré.');
    const revoked = await request.post(`${API}/licenses/${licenseId}/refresh`, {
      data: { deviceId: `poste-b-${run}` },
    });
    expect(await revoked.json()).toEqual({ error: 'LICENSE_REVOKED' });
    await page.goto(`/fr/admin/licences?q=${encodeURIComponent(customer)}`);
    await expect(page.locator('.tbl')).toContainText('Révoquée');
  });
});
