import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { countMails, linkFromMail } from './outbox';

// Parcours avec courriel (spec 002, avenant A). Demandent une base : ignorés sans E2E_DATABASE_URL.
test.skip(!process.env.E2E_DATABASE_URL, 'aucune base de test (E2E_DATABASE_URL)');
test.describe.configure({ mode: 'serial' });

const run = Date.now().toString(36);
const email = (name: string) => `${name}-${run}@exemple.test`;
const PASSWORD = 'motdepasse-de-test';

async function fillSignUp(page: Page, name: string, address: string) {
  await page.goto('/fr/connexion?onglet=creer');
  await page.getByLabel('Nom et prénom').fill(name);
  await page.getByLabel('Courriel').fill(address);
  await page.getByLabel('Mot de passe').fill(PASSWORD);
  await page.getByLabel(/J'accepte/u).check();
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page.getByRole('heading', { name: 'Vérifiez votre boîte.' })).toBeVisible();
}

async function signIn(page: Page, address: string, password: string) {
  await page.getByLabel('Courriel').fill(address);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).last().click();
}

test.describe('courriel (spec 002, avenant A)', () => {
  test.skip(({ isMobile }) => isMobile, 'parcours complets sur ordinateur');

  test('adresse non confirmée : connexion refusée et lien renvoyé', async ({ page }) => {
    await fillSignUp(page, 'Yao Agbo', email('yao'));
    const sent = countMails(email('yao'), 'verify-email');
    await page.goto('/fr/connexion');
    await signIn(page, email('yao'), PASSWORD);
    await expect(page.getByRole('alert')).toHaveText(
      "Votre adresse n'est pas encore confirmée. Nous venons de vous renvoyer le lien.",
    );
    await linkFromMail(email('yao'), 'verify-email', sent);
  });

  test('lien de confirmation faux : message clair', async ({ page }) => {
    await page.goto('/api/auth/verify-email?token=faux&callbackURL=%2Ffr%2Fconnexion');
    await expect(page).toHaveURL(/\/fr\/connexion\?error=/u);
    await expect(page.getByRole('alert')).toHaveText(
      "Ce lien n'est plus valable. Connectez-vous pour en recevoir un nouveau.",
    );
  });

  test('mot de passe oublié : lien, nouveau mot de passe, connexion', async ({ page }) => {
    await fillSignUp(page, 'Esi Mawuena', email('esi'));
    await page.goto(await linkFromMail(email('esi'), 'verify-email'));
    await expect(page).toHaveURL(/\/fr\/espace\/?$/u);
    await page.getByLabel('Mon espace').click();
    await page.getByRole('button', { name: 'Se déconnecter' }).first().click();

    await page.goto('/fr/connexion');
    await page.getByRole('link', { name: 'Mot de passe oublié ?' }).click();
    await expect(page.getByRole('heading', { name: 'Mot de passe oublié.' })).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);

    await page.getByLabel('Courriel').fill(email('esi'));
    await page.getByRole('button', { name: 'Recevoir le lien' }).click();
    await expect(page.getByRole('status')).toContainText('Si un compte existe pour cette adresse');

    await page.goto(await linkFromMail(email('esi'), 'reset-password'));
    await expect(page.getByRole('heading', { name: 'Nouveau mot de passe.' })).toBeVisible();
    await page.getByRole('textbox', { name: /Nouveau mot de passe/u }).fill('un-nouveau-mot-de-passe');
    await page.getByRole('button', { name: 'Enregistrer le mot de passe' }).click();
    await expect(page).toHaveURL(/\/fr\/connexion\?motdepasse=change/u);
    await expect(page.getByRole('status')).toHaveText('Mot de passe enregistré. Connectez-vous avec le nouveau.');

    await signIn(page, email('esi'), 'un-nouveau-mot-de-passe');
    await expect(page).toHaveURL(/\/fr\/espace\/?$/u);
  });

  test('lien de mot de passe déjà servi : refusé', async ({ page }) => {
    await page.goto(await linkFromMail(email('esi'), 'reset-password'));
    await expect(page).toHaveURL(/\/fr\/mot-de-passe\?error=/u);
    await expect(page.getByRole('alert')).toContainText("Ce lien n'est plus valable");
  });
});
