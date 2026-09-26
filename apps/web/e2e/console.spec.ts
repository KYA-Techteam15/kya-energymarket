import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { linkFromMail, OUTBOX_DIR } from './outbox';

// Console d'administration (spec 005b) : lot de licences, courriels de clé, Ctrl K, rattachement.
test.skip(!process.env.E2E_DATABASE_URL, 'aucune base de test (E2E_DATABASE_URL)');
test.describe.configure({ mode: 'serial', timeout: 180_000 });

const run = Date.now().toString(36);
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const PASSWORD = 'motdepasse-de-test';
const admin = `console-admin-${run}@exemple.test`;
const students = [0, 1, 2].map((index) => `etudiant${index}-${run}@exemple.test`);
const label = `Promo de test ${run}`;
const axe = async (page: Page) => (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations;
/** Clé reçue par chaque destinataire. */
const keyOf = new Map<string, string>();

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

const keyMail = (address: string) =>
  readdirSync(OUTBOX_DIR)
    .map(
      (file) => JSON.parse(readFileSync(join(OUTBOX_DIR, file), 'utf8')) as { to: string; kind: string; text: string },
    )
    .find((mail) => mail.to === address && mail.kind === 'license-key');

test.describe('console (spec 005b)', () => {
  test.skip(({ isMobile }) => isMobile, 'console sur ordinateur');

  test('un lot par courriels : licences distinctes, clés envoyées, lot consultable', async ({ page }) => {
    await signUp(page, 'Admin Console', admin);
    execFileSync('pnpm', ['staff:grant', '--email', admin, '--role', 'kya_admin'], {
      cwd: repoRoot,
      shell: true,
      env: { ...process.env, DATABASE_URL: process.env.E2E_DATABASE_URL },
      stdio: 'pipe',
    });

    await page.goto('/fr/admin');
    await expect(page.getByRole('heading', { name: /^Bonjour Admin/u })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navigation de la console' }).first()).toBeVisible();
    // La console a son propre habillage : pas l'en-tête du site.
    await expect(page.locator('.mk-nav')).toHaveCount(0);
    expect(await axe(page)).toEqual([]);

    await page.getByRole('link', { name: 'Générer des licences' }).first().click();
    await expect(page).toHaveURL(/\/fr\/admin\/lots\/nouveau/u);
    await page
      .locator('fieldset')
      .filter({ has: page.locator('legend', { hasText: 'Étudiant' }) })
      .locator('label.cx-opt', { hasText: '1 mois' })
      .click();
    await page.getByRole('button', { name: 'Continuer' }).click();

    await page.getByLabel(/Courriels, un par ligne/u).fill([...students, 'pas-un-courriel', students[0]].join('\n'));
    await expect(page.locator('.cx-parse')).toContainText('3 valides');
    await expect(page.locator('.cx-parse')).toContainText('1 doublon ignoré');
    await page.getByLabel('Libellé du lot').fill(label);
    await page.getByLabel(/^Motif/u).fill('Parcours de test');
    expect(await axe(page)).toEqual([]);
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(page.locator('.cx-big')).toHaveText('3');
    await page.getByRole('button', { name: 'Générer 3 licences' }).click();

    const list = page.getByTestId('batch-keys');
    await expect(list.locator('li')).toHaveCount(3);
    for (const item of await list.locator('li').all()) {
      keyOf.set(
        (await item.locator('small').textContent())!.trim(),
        (await item.locator('code').textContent())!.trim(),
      );
    }
    expect([...keyOf.keys()].sort()).toEqual([...students].sort());
    expect(new Set(keyOf.values()).size).toBe(3);
    for (const key of keyOf.values()) expect(key).toMatch(/^KYA-ETU-1M-/u);

    // Chaque personne reçoit sa propre clé (file de travaux).
    for (const address of students) {
      await expect.poll(() => keyMail(address)?.text ?? '', { timeout: 60_000 }).toContain(keyOf.get(address)!);
    }

    await page.getByRole('link', { name: 'Ouvrir le lot' }).click();
    await expect(page.getByRole('heading', { name: label })).toBeVisible();
    await expect(page.locator('.cx-tbl tbody tr')).toHaveCount(3);
    expect(await axe(page)).toEqual([]);
  });

  test('Ctrl K retrouve une licence par sa clé et ouvre sa fiche', async ({ page }) => {
    await page.goto('/fr/connexion');
    await page.getByLabel('Courriel').fill(admin);
    await page.getByLabel('Mot de passe').fill(PASSWORD);
    await page.getByRole('button', { name: 'Se connecter', exact: true }).last().click();
    await expect(page).toHaveURL(/\/fr\/espace/u);

    await page.goto('/fr/admin');
    const palette = page.getByRole('dialog', { name: 'Recherche et actions' });
    // Le raccourci n'agit qu'une fois la page prête : on le répète jusqu'à l'ouverture.
    await expect(async () => {
      if (!(await palette.isVisible())) await page.keyboard.press('Control+k');
      await expect(palette).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 20_000 });
    await palette.getByRole('combobox').fill(keyOf.get(students[1]!)!);
    await expect(palette.getByRole('option').first()).toContainText(students[1]!);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/licence=lic_/u);
    const sheet = page.getByRole('dialog');
    await expect(sheet).toContainText(label);
    await expect(sheet).toContainText('Lot');
    expect(await axe(page)).toEqual([]);
  });

  test('le destinataire retrouve sa licence dans son espace en se connectant avec ce courriel', async ({ page }) => {
    await signUp(page, 'Étudiante Test', students[2]!);
    await page.goto('/fr/espace/licences');
    await page.getByRole('button', { name: 'Afficher la clé' }).first().click();
    await expect(page.getByTestId('license-key').first()).toHaveText(keyOf.get(students[2]!)!);
    await expect(page.locator('.lic').first()).toContainText('démarre à la première activation');
    expect(await axe(page)).toEqual([]);
  });
});
