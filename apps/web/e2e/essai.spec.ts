import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { linkFromMail, OUTBOX_DIR } from './outbox';

// Essai gratuit (spec 006) : quatre étapes, un essai par compte. Demande une base.
test.skip(!process.env.E2E_DATABASE_URL, 'aucune base de test (E2E_DATABASE_URL)');
test.describe.configure({ mode: 'serial', timeout: 180_000 });

const run = Date.now().toString(36);
const email = `essai-${run}@exemple.test`;
const axe = async (page: Page) => (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations;
let key = '';

const mailTo = (address: string, kind: string) =>
  readdirSync(OUTBOX_DIR)
    .map(
      (file) => JSON.parse(readFileSync(join(OUTBOX_DIR, file), 'utf8')) as { to: string; kind: string; text: string },
    )
    .find((mail) => mail.to === address && mail.kind === kind);

test.describe('essai gratuit (spec 006)', () => {
  test('un visiteur crée son compte depuis la page Essai, active l’essai et reçoit sa clé', async ({ page }) => {
    await page.goto('/fr/essai');
    await expect(page.getByRole('heading', { name: 'Essayez KYA-SolDesign.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Connectez-vous pour commencer.' })).toBeVisible();
    expect(await axe(page)).toEqual([]);

    await page.getByRole('link', { name: 'Créer un compte' }).click();
    await page.getByLabel('Nom et prénom').fill('Yao Essai');
    await page.getByLabel('Courriel').fill(email);
    await page.getByLabel('Mot de passe').fill('motdepasse-de-test');
    await page.getByLabel(/J'accepte/u).check();
    await page.getByRole('button', { name: 'Créer mon compte' }).click();
    await page.goto(await linkFromMail(email, 'verify-email'));
    await page.goto('/fr/essai');

    await expect(page.getByRole('heading', { name: 'Activez votre essai.' })).toBeVisible();
    await expect(page.getByText(`Connecté en tant que ${email}`)).toBeVisible();
    await page.getByRole('button', { name: 'Activer mon essai' }).click();
    await expect(page.getByRole('heading', { name: 'Votre essai est actif.' })).toBeVisible();
    key = (await page.getByTestId('trial-key').textContent())!.trim();
    expect(key).toMatch(/^KYA-COM-14D-/u);
    expect(await axe(page)).toEqual([]);

    await expect.poll(() => mailTo(email, 'license-key')?.text ?? '', { timeout: 60_000 }).toContain(key);

    await page.getByRole('button', { name: 'J’ai installé le logiciel' }).click();
    await expect(page.getByRole('heading', { name: 'Ouvrez KYA-SolDesign.' })).toBeVisible();
  });

  test('la clé d’essai active le logiciel ; l’essai reste acquis au compte', async ({ page, request }) => {
    const activated = await request.post('/api/software/v1/licenses/activate', {
      data: { key, deviceId: `poste-essai-${run}` },
    });
    expect(activated.status()).toBe(200);
    const { token } = await activated.json();
    const payload = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'));
    expect(payload).toMatchObject({ edition: 'commercial', plan: '14d', customer: 'Yao Essai' });

    await page.goto('/fr/connexion');
    await page.getByLabel('Courriel').fill(email);
    await page.getByLabel('Mot de passe').fill('motdepasse-de-test');
    await page.getByRole('button', { name: 'Se connecter', exact: true }).last().click();
    await expect(page).toHaveURL(/\/fr\/espace/u);
    // Revenir sur la page Essai montre l'essai actif, sans nouveau bouton d'activation.
    await page.goto('/fr/essai');
    await expect(page.getByRole('heading', { name: 'Votre essai est actif.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Activer mon essai' })).toHaveCount(0);
    await page.goto('/fr/espace/licences');
    await expect(page.locator('.lic').first()).toContainText('Essai 14 jours');
  });
});
