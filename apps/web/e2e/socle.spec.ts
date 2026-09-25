import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('accueil de la marketplace (spec 001, histoire 1)', () => {
  test('la racine mène au français par défaut', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/fr\/?$/u);
  });

  test('une langue non gérée retombe sur le français', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'de-DE' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page).toHaveURL(/\/fr\/?$/u);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Les logiciels de KYA-Energy Group, réunis au même endroit.',
    );
    await context.close();
  });

  test('affiche l’en-tête validé et les sections de la maquette v5', async ({ page, isMobile }) => {
    await page.goto('/fr/');
    const header = page.locator('header.mk');
    await expect(header.getByRole('link', { name: 'KYA-EnergyMarket' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Se connecter' })).toBeVisible();
    if (!isMobile) {
      await expect(header.getByText('Logiciels', { exact: true })).toBeVisible();
      await expect(header.getByRole('link', { name: 'Aide' })).toBeVisible();
    }
    for (const title of ['KYA-SolDesign.', 'Comment ça marche.', 'KYA-Energy Group.', 'Questions.']) {
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
    }
    await expect(page.getByText("Photo d'illustration")).toBeVisible();
  });

  test('aucun défilement horizontal', async ({ page }) => {
    await page.goto('/fr/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('aucune violation d’accessibilité (axe)', async ({ page }) => {
    for (const path of ['/fr/', '/en/']) {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(results.violations, path).toEqual([]);
    }
  });

  test('propose un lien d’évitement au clavier', async ({ page }) => {
    await page.goto('/fr/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Aller au contenu' })).toBeFocused();
  });
});

test.describe('anglais (spec 001, histoire 2)', () => {
  test('la page anglaise est entièrement en anglais', async ({ page }) => {
    await page.goto('/en/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("KYA-Energy Group's software, all in one place.");
    await expect(page).toHaveTitle(/software by KYA-Energy Group/u);
  });

  test('le choix de langue est mémorisé', async ({ page, isMobile }) => {
    await page.goto('/fr/');
    if (isMobile) {
      await page.getByRole('button', { name: 'Menu' }).click();
      await page.locator('#mk-nav').getByRole('link', { name: 'English' }).click();
    } else {
      await page.getByLabel('Langue : français').click();
      await page.getByRole('link', { name: 'English' }).first().click();
    }
    await expect(page).toHaveURL(/\/en\/?$/u);
    await page.goto('/');
    await expect(page).toHaveURL(/\/en\/?$/u);
  });

  test('un navigateur anglais reçoit l’anglais à la racine', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-US' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page).toHaveURL(/\/en\/?$/u);
    await context.close();
  });

  test('déclare les versions linguistiques et l’adresse canonique', async ({ page }) => {
    await page.goto('/fr/');
    // Une seule balise de chaque : le serveur et le navigateur produisent les mêmes adresses.
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
      'href',
      'http://localhost:4173/en/',
    );
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', /\/en\/?$/u);
    await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveAttribute('href', /\/fr\/?$/u);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/fr\/?$/u);
  });
});

test.describe('pages annexes', () => {
  test('page introuvable localisée', async ({ page }) => {
    await page.goto('/fr/adresse-inexistante');
    await expect(page.getByRole('heading', { name: 'Page introuvable.' })).toBeVisible();
  });
});

test.describe('exploitation (spec 001, histoire 4)', () => {
  test('GET /api/health répond sans secret', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('no-store');
    const body = await response.json();
    expect(body).toMatchObject({ status: 'ok', environment: 'test', checks: { database: 'not_configured' } });
    expect(JSON.stringify(body)).not.toMatch(/postgres|password|secret/iu);
  });
});
