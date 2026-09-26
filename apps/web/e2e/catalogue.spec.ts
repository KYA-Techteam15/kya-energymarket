import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { linkFromMail } from './outbox';

// Catalogue et pages composées (spec 004). Demandent une base (contenu initial chargé au démarrage).
test.skip(!process.env.E2E_DATABASE_URL, 'aucune base de test (E2E_DATABASE_URL)');

const run = Date.now().toString(36);
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const axe = async (page: Page) => (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations;

test.describe('pages publiques (spec 004)', () => {
  test('le catalogue mène à KYA-SolDesign ; les logiciels « bientôt » n’ont pas de page', async ({ page }) => {
    await page.goto('/fr/logiciels');
    await expect(page.getByRole('heading', { name: 'Les logiciels.' })).toBeVisible();
    await expect(page.locator('#kya-ecolabel')).toContainText('Bientôt');
    expect(await axe(page)).toEqual([]);
    await page.getByRole('link', { name: 'Découvrir KYA-SolDesign' }).click();
    await expect(page).toHaveURL(/\/fr\/logiciels\/kya-soldesign\/?$/u);
    const response = await page.request.get('/fr/logiciels/kya-ecolabel');
    expect(response.status()).toBe(404);
  });

  test('la présentation déroule les sections de la maquette, sans violation axe', async ({ page }) => {
    await page.goto('/fr/logiciels/kya-soldesign');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Concevez des systèmes solaires fiables et économiquement accessibles.',
    );
    for (const title of [
      'Du site au schéma. Dans un seul logiciel.',
      "Le prix de l'erreur.",
      'Deux indicateurs pour décider.',
      'Le point juste.',
      'Une étude en trois temps.',
      'Ce que vous obtenez.',
      'Pour qui ?',
      'La preuve.',
    ]) {
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
    }
    // Sur mobile, les onglets du logiciel sont dans le menu.
    const menu = page.locator('.sw .menu-btn');
    if (await menu.isVisible()) await menu.click();
    await expect(
      page.getByRole('navigation', { name: 'KYA-SolDesign' }).getByRole('link', { name: 'Présentation' }),
    ).toHaveAttribute('aria-current', 'page');
    // Exemple interactif : l'onglet Accessibilité change l'indicateur.
    await page.getByRole('tab', { name: 'Accessibilité' }).click();
    await expect(page.getByRole('tabpanel')).toContainText('Accessibilité économique (SVI)');
    // Point juste : pousser la fiabilité au maximum dépasse le prix du réseau.
    await page.getByLabel('Fiabilité visée (SRI)').fill('990');
    await expect(page.getByRole('status').filter({ hasText: 'Trop grand' })).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });

  test('les tarifs calculent le total depuis le catalogue ; le comparatif suit l’édition choisie', async ({ page }) => {
    await page.goto('/fr/logiciels/kya-soldesign/tarifs');
    await expect(page.getByTestId('pricing-total')).toHaveText(/220\s000/u);
    // Les boutons radio sont masqués derrière leur carte (maquette v5) : on choisit la carte.
    await page.locator('label.opt', { hasText: 'Étudiant' }).click();
    await page.locator('label.opt', { hasText: '1 mois' }).click();
    await expect(page.getByTestId('pricing-total')).toHaveText(/7\s500/u);
    await expect(page.getByText('Cette édition se prend pour un seul poste.')).toBeVisible();
    await expect(page.locator('.cmp-table thead th.hl')).toContainText('Étudiant');
    await page.locator('label.opt', { hasText: 'Commerciale' }).click();
    await page.getByRole('button', { name: 'Un poste de plus' }).click();
    await page.getByRole('button', { name: 'Un poste de plus' }).click();
    await expect(page.getByTestId('pricing-total')).toHaveText(/660\s000/u);
    expect(await axe(page)).toEqual([]);
  });

  test('ressources, support (recherche) et aide sont servis depuis la base', async ({ page }) => {
    await page.goto('/fr/logiciels/kya-soldesign/ressources');
    await expect(page.getByRole('heading', { name: 'Nouveautés.' })).toBeVisible();
    expect(await axe(page)).toEqual([]);

    await page.goto('/fr/logiciels/kya-soldesign/support');
    await page.getByRole('searchbox').fill('météo');
    await expect(page.getByText('La météo du site ne se télécharge pas.')).toBeVisible();
    await expect(page.getByText('Comment activer mon essai ?')).toHaveCount(0);
    expect(await axe(page)).toEqual([]);

    await page.goto('/fr/aide');
    await expect(page.getByRole('heading', { name: 'Aide.' })).toBeVisible();
    await expect(page.locator('#licences')).toContainText("Qu'est-ce qu'un poste ?");
    expect(await axe(page)).toEqual([]);
  });

  test('la page anglaise est en anglais ; le guide a son sommaire', async ({ page, isMobile }) => {
    await page.goto('/en/logiciels/kya-soldesign');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Design solar systems that are reliable and economically affordable.',
    );
    await page.goto('/fr/logiciels/kya-soldesign/guide');
    await expect(page.getByRole('heading', { name: 'La méthode' })).toBeVisible();
    // Le sommaire est masqué sur petit écran (maquette v5).
    if (isMobile) return;
    await page.getByRole('navigation', { name: 'Sommaire' }).getByRole('link', { name: 'La méthode' }).click();
    await expect(page).toHaveURL(/#la-methode$/u);
  });

  test('l’API publique rend le catalogue et ses prix', async ({ request }) => {
    const response = await request.get('/api/v1/catalog');
    expect(response.status()).toBe(200);
    const body = await response.json();
    const soldesign = body.products.find((product: { slug: string }) => product.slug === 'kya-soldesign');
    expect(soldesign.editions.map((edition: { code: string }) => edition.code)).toEqual([
      'commercial',
      'academic',
      'student',
    ]);
    expect(soldesign.editions[0].types[0]).toMatchObject({ currency: 'XOF', forSale: true });
  });
});

test.describe('administration des contenus (spec 004)', () => {
  test.describe.configure({ mode: 'serial', timeout: 180_000 });
  test.skip(({ isMobile }) => isMobile, 'administration sur ordinateur');

  const email = `contenus-${run}@exemple.test`;

  test('catalogue : un prix changé passe par le brouillon, puis la publication change la page Tarifs et l’API', async ({
    page,
    request,
  }) => {
    await page.goto('/fr/connexion?onglet=creer');
    await page.getByLabel('Nom et prénom').fill('Afi Contenus');
    await page.getByLabel('Courriel').fill(email);
    await page.getByLabel('Mot de passe').fill('motdepasse-de-test');
    await page.getByLabel(/J'accepte/u).check();
    await page.getByRole('button', { name: 'Créer mon compte' }).click();
    await page.goto(await linkFromMail(email, 'verify-email'));
    execFileSync('pnpm', ['staff:grant', '--email', email, '--role', 'kya_admin'], {
      cwd: repoRoot,
      shell: true,
      env: { ...process.env, DATABASE_URL: process.env.E2E_DATABASE_URL },
      stdio: 'pipe',
    });

    // Prix propre à ce passage : la base des parcours garde l'état des passages précédents.
    const price = 70_000 + (Number.parseInt(run, 36) % 90) * 100;
    const shown = new RegExp(new Intl.NumberFormat('fr-FR').format(price).replace(/\s/gu, '\\s'), 'u');

    await page.goto('/fr/admin/catalogue');
    await expect(page.getByRole('heading', { name: 'Logiciels' })).toBeVisible();
    await page.getByRole('link', { name: 'KYA-SolDesign' }).click();
    await expect(page.getByRole('heading', { name: 'Éditions' })).toBeVisible();
    // Brouillon laissé par un passage précédent : on repart de l'offre publiée.
    const draftBar = page.getByRole('region', { name: 'Modifications non publiées' });
    if (await draftBar.isVisible()) {
      await draftBar.getByRole('button', { name: 'Annuler' }).click();
      await draftBar.getByRole('button', { name: 'Abandonner' }).click();
      await expect(draftBar).toBeHidden({ timeout: 30_000 });
    }
    expect(await axe(page)).toEqual([]);

    await page.getByRole('link', { name: 'Commerciale', exact: true }).click();
    await page.getByRole('tab', { name: /Types de licence/u }).click();
    await page.getByRole('link', { name: '1 trimestre' }).click();
    await page.getByLabel('Prix par poste (FCFA)').fill(String(price));
    await page.getByRole('button', { name: 'Enregistrer dans le brouillon' }).click();
    await expect(page.getByRole('status')).toContainText('Enregistré dans le brouillon.');
    await expect(draftBar).toContainText('1 modification en brouillon');
    expect(await axe(page)).toEqual([]);

    // Brouillon : le site ne change pas.
    await page.goto('/fr/logiciels/kya-soldesign/tarifs');
    await page.locator('label.opt', { hasText: '1 trimestre' }).click();
    await expect(page.getByTestId('pricing-total')).not.toHaveText(shown);

    await page.goBack();
    await draftBar.getByRole('button', { name: 'Publier' }).click();
    await expect(page.getByRole('status')).toContainText('Publié');
    await expect(draftBar).toBeHidden({ timeout: 30_000 });

    await page.goto('/fr/logiciels/kya-soldesign/tarifs');
    await page.locator('label.opt', { hasText: '1 trimestre' }).click();
    await expect(page.getByTestId('pricing-total')).toHaveText(shown);
    const api = await (await request.get('/api/v1/catalog')).json();
    const commercial = api.products[0].editions[0];
    expect(commercial.types.find((type: { days: number }) => type.days === 91).pricePerSeat).toBe(price);
  });

  test('pages : un brouillon reste privé jusqu’à la publication, puis se restaure', async ({ page }) => {
    await page.goto('/fr/connexion');
    await page.getByLabel('Courriel').fill(email);
    await page.getByLabel('Mot de passe').fill('motdepasse-de-test');
    await page.getByRole('button', { name: 'Se connecter', exact: true }).last().click();
    await expect(page).toHaveURL(/\/fr\/espace/u);

    // Titre public avant modification (la base des parcours garde l'état des passages précédents).
    await page.goto('/fr/mentions-legales');
    const before = (await page.getByRole('heading', { level: 1 }).textContent()) ?? '';

    await page.goto('/fr/admin/pages');
    await expect(page.getByRole('heading', { name: 'Pages.' })).toBeVisible();
    await page.getByRole('link', { name: 'Modifier Mentions légales' }).click();
    const card = page.locator('.block-card').first();
    await card.locator('summary').first().click();
    const title = `Mentions légales ${run}.`;
    await card.getByLabel('Titre', { exact: true }).fill(title);
    await page.getByRole('button', { name: 'Enregistrer le brouillon' }).click();
    await expect(page.getByRole('status')).toHaveText('Brouillon enregistré.');
    expect(await axe(page)).toEqual([]);

    // Le public ne voit pas le brouillon ; l'aperçu de l'équipe, si.
    const visitor = await page.context().browser()!.newContext({ locale: 'fr-FR' });
    const publicPage = await visitor.newPage();
    await publicPage.goto('/fr/mentions-legales?apercu=1');
    await expect(publicPage.getByRole('heading', { level: 1 })).toHaveText(before);
    await page.goto('/fr/mentions-legales?apercu=1');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.getByRole('status')).toContainText('Aperçu du brouillon');

    await page.goBack();
    await page.getByRole('button', { name: 'Publier' }).click();
    await expect(page.getByRole('status')).toHaveText('Page publiée.');
    await publicPage.goto('/fr/mentions-legales');
    await expect(publicPage.getByRole('heading', { level: 1 })).toHaveText(title);

    // Retour à la version d'origine : restaurer, puis publier.
    // v1 : la version d'origine, chargée par l'amorçage.
    await page
      .locator('.tbl tr')
      .filter({ has: page.locator('td.num', { hasText: /^v1$/u }) })
      .getByRole('button', { name: 'Restaurer' })
      .click();
    await expect(page.getByRole('status')).toContainText('Version restaurée');
    await page.getByRole('button', { name: 'Publier' }).click();
    await expect(page.getByRole('status')).toHaveText('Page publiée.');
    await publicPage.goto('/fr/mentions-legales');
    await expect(publicPage.getByRole('heading', { level: 1 })).toHaveText('Mentions légales.');
    await visitor.close();
  });

  test('médias : une image téléversée est convertie et servie', async ({ page, request }) => {
    await page.goto('/fr/connexion');
    await page.getByLabel('Courriel').fill(email);
    await page.getByLabel('Mot de passe').fill('motdepasse-de-test');
    await page.getByRole('button', { name: 'Se connecter', exact: true }).last().click();
    await expect(page).toHaveURL(/\/fr\/espace/u);

    await page.goto('/fr/admin/medias');
    // PNG de 4 × 4 pixels, vert KYA.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEElEQVQImWOQWdgDRwzEcQAP8hSRTOjr+wAAAABJRU5ErkJggg==',
      'base64',
    );
    await page.getByLabel(/^Image/u).setInputFiles({ name: 'vert.png', mimeType: 'image/png', buffer: png });
    await page.getByLabel('Texte alternatif · FR').first().fill(`Carré vert ${run}`);
    await page.getByRole('button', { name: 'Téléverser' }).click();
    await expect(page.getByRole('status')).toHaveText('Image ajoutée à la médiathèque.');
    const card = page.locator('.media-card', { has: page.locator(`input[value="Carré vert ${run}"]`) });
    const src = await card.locator('img').getAttribute('src');
    expect(src).toMatch(/^\/media\/images\/[0-9a-f-]{36}\.webp$/u);
    const image = await request.get(src!);
    expect(image.status()).toBe(200);
    expect(image.headers()['content-type']).toBe('image/webp');
    expect(image.headers()['cache-control']).toContain('immutable');
  });
});
