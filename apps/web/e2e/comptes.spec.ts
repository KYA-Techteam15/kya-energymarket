import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { linkFromMail } from './outbox';

// Parcours des comptes (spec 002). Demandent une base : ignorés si E2E_DATABASE_URL est absente.
test.skip(!process.env.E2E_DATABASE_URL, 'aucune base de test (E2E_DATABASE_URL)');
test.describe.configure({ mode: 'serial' });

const run = Date.now().toString(36);
const email = (name: string) => `${name}-${run}@exemple.test`;
const PASSWORD = 'motdepasse-de-test';
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

async function signUp(page: Page, name: string, address: string) {
  await page.goto('/fr/connexion?onglet=creer');
  await page.getByLabel('Nom et prénom').fill(name);
  await page.getByLabel('Courriel').fill(address);
  await page.getByLabel('Mot de passe').fill(PASSWORD);
  await page.getByLabel(/J'accepte/u).check();
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  // Adresse à confirmer : le lien arrive par courriel, puis ouvre l'espace, connecté.
  await expect(page.getByRole('heading', { name: 'Vérifiez votre boîte.' })).toBeVisible();
  await page.goto(await linkFromMail(address, 'verify-email'));
  await expect(page).toHaveURL(/\/fr\/espace\/?$/u);
}

async function signIn(page: Page, address: string, password = PASSWORD) {
  await page.getByLabel('Courriel').fill(address);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).last().click();
}

test.describe('comptes (spec 002)', () => {
  test.skip(({ isMobile }) => isMobile, 'parcours complets sur ordinateur');

  test('créer son compte : espace sans jamais voir « organisation »', async ({ page }) => {
    await signUp(page, 'Afi Kodjo', email('afi'));
    await expect(page.getByRole('heading', { name: 'Bonjour Afi.' })).toBeVisible();
    await expect(page.locator('.acct-side')).not.toContainText('Organisation');
    await expect(page.getByRole('heading', { name: 'Vous achetez pour une organisation ?' })).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });

  test('se déconnecter, garde de l’espace, puis retour après connexion', async ({ page }) => {
    await page.goto('/fr/connexion');
    await signIn(page, email('afi'));
    await expect(page).toHaveURL(/\/fr\/espace\/?$/u);
    await page.getByLabel('Mon espace').click();
    await page.getByRole('button', { name: 'Se déconnecter' }).first().click();
    await expect(page.getByRole('link', { name: 'Se connecter' })).toBeVisible();

    await page.goto('/fr/espace');
    await expect(page).toHaveURL(/\/fr\/connexion\?redirect=/u);
    await signIn(page, email('afi'));
    await expect(page).toHaveURL(/\/fr\/espace\/?$/u);
  });

  test('mauvais mot de passe : message neutre', async ({ page }) => {
    await page.goto('/fr/connexion');
    await signIn(page, email('afi'), 'pas-le-bon-mot-de-passe');
    await expect(page.getByRole('alert')).toHaveText('Courriel ou mot de passe incorrect.');
  });

  test('organisation d’entreprise, invitation et acceptation', async ({ page, browser }) => {
    await signUp(page, 'Koffi Mensah', email('koffi'));
    await page.getByLabel('Raison sociale').fill('Soleil Plus');
    await page.getByRole('button', { name: 'Créer mon organisation' }).click();
    await expect(page).toHaveURL(/\/fr\/espace\/organisation\/?$/u);
    await expect(page.getByRole('heading', { name: 'Organisation.' })).toBeVisible();

    await page.getByLabel('Courriel du collègue').fill(email('ama'));
    await page.getByRole('button', { name: "Envoyer l'invitation" }).click();
    await expect(page.getByText(`Invitation envoyée par courriel à ${email('ama')}`)).toBeVisible();
    expect(await linkFromMail(email('ama'), 'invitation')).toMatch(/\/fr\/invitation\//u);
    const link = (await page.getByTestId('invite-link').textContent()) ?? '';
    expect(link).toMatch(/\/fr\/invitation\//u);

    const colleague = await (await browser.newContext({ locale: 'fr-FR' })).newPage();
    await signUp(colleague, 'Ama Diallo', email('ama'));
    await colleague.goto(new URL(link).pathname);
    await colleague.getByRole('button', { name: "Accepter l'invitation" }).click();
    await expect(colleague).toHaveURL(/\/fr\/espace\/organisation\/?$/u);
    await expect(colleague.getByText('Seul le propriétaire peut inviter ou retirer des membres.')).toBeVisible();

    await page.reload();
    await expect(page.locator('.tbl tbody tr')).toHaveCount(2);
    await colleague.context().close();
  });

  test('administration : refusée au client, ouverte après attribution du rôle', async ({ page }) => {
    await signUp(page, 'Admin KYA', email('admin'));
    await page.goto('/fr/admin');
    await expect(page.getByRole('heading', { name: 'Accès réservé.' })).toBeVisible();

    execFileSync('pnpm', ['staff:grant', '--email', email('admin'), '--role', 'kya_admin'], {
      cwd: repoRoot,
      shell: true,
      env: { ...process.env, DATABASE_URL: process.env.E2E_DATABASE_URL },
      stdio: 'pipe',
    });

    await page.goto('/fr/admin');
    await expect(page.getByRole('heading', { name: /^Bonjour Admin/u })).toBeVisible();
    await page.getByRole('link', { name: 'Équipe' }).click();
    await expect(page.locator('.tbl')).toContainText(email('admin'));
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });
});

test('page de connexion accessible sur mobile', async ({ page }) => {
  await page.goto('/fr/connexion');
  await expect(page.getByRole('heading', { name: 'Bienvenue.' })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
});
