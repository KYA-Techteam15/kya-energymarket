import { describe, expect, it } from 'vitest';
import { BLOCKS, blockSchema, blocksSchema } from './blocks.ts';
import { emptyValues, zodForFields } from './fields.ts';
import { renderInlineMarkdown, renderMarkdown } from './markdown.ts';

describe('blocs de page (spec 004)', () => {
  it('décrit chaque type avec des libellés FR et EN', () => {
    expect(new Set(BLOCKS.map((block) => block.type)).size).toBe(BLOCKS.length);
    for (const block of BLOCKS) {
      expect(block.label.fr && block.label.en).toBeTruthy();
      for (const field of Object.values(block.fields)) expect(field.label.fr && field.label.en).toBeTruthy();
    }
  });

  it('valide un bloc complet et refuse un type inconnu', () => {
    const hero = {
      id: 'b1',
      type: 'hero',
      data: {
        title: 'Concevez des systèmes solaires fiables.',
        text: 'Avant de construire.',
        image: '/images/hero.jpg',
        primary: { label: 'Essayer', href: '/essai' },
      },
    };
    expect(blockSchema.safeParse(hero).success).toBe(true);
    expect(blockSchema.safeParse({ ...hero, type: 'carrousel' }).success).toBe(false);
  });

  it('refuse les liens dangereux, les médias inconnus et les champs en trop', () => {
    const base = { title: 'T', text: 'x', image: '/images/hero.jpg', primary: { label: 'Go', href: '/essai' } };
    const check = (data: object) => blockSchema.safeParse({ id: 'b', type: 'hero', data }).success;
    expect(check({ ...base, primary: { label: 'Go', href: 'javascript:alert(1)' } })).toBe(false);
    expect(check({ ...base, primary: { label: 'Go', href: '//evil.example' } })).toBe(false);
    expect(check({ ...base, primary: { label: 'Go', href: 'https://kya-energy.com' } })).toBe(true);
    expect(check({ ...base, image: 'https://evil.example/x.png' })).toBe(false);
    expect(check({ ...base, style: 'color:red' })).toBe(false);
  });

  it('borne les listes (repères : 2 à 4)', () => {
    const fact = { value: '500+', label: 'installations' };
    expect(blocksSchema.safeParse([{ id: 'f', type: 'facts', data: { items: [fact] } }]).success).toBe(false);
    expect(blocksSchema.safeParse([{ id: 'f', type: 'facts', data: { items: [fact, fact] } }]).success).toBe(true);
  });

  it('fournit une valeur vide pour chaque champ de l’éditeur', () => {
    for (const block of BLOCKS) {
      const empty = emptyValues(block.fields);
      expect(Object.keys(empty).sort()).toEqual(Object.keys(block.fields).sort());
      expect(zodForFields(block.fields)).toBeTruthy();
    }
  });
});

describe('Markdown assaini', () => {
  it('échappe le HTML brut et refuse javascript:', () => {
    const { html } = renderMarkdown('<script>alert(1)</script>\n\n[piège](javascript:alert(1)) [ok](/aide)');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('href="/aide"');
  });

  it('met les liens internes dans la langue de la page', () => {
    const { html } = renderMarkdown('[Aide](/aide) [déjà](/en/aide) [ancre](#haut) [site](//evil.example)', {
      locale: 'en',
    });
    expect(html).toContain('href="/en/aide"');
    expect(html).not.toContain('href="/en/en/aide"');
    expect(html).toContain('href="#haut"');
    expect(html).toContain('href="//evil.example"');
  });

  it('ouvre les liens externes sans donner la main à la page cible', () => {
    expect(renderMarkdown('[KYA](https://kya-energy.com)').html).toContain('rel="noopener noreferrer"');
  });

  it('ancre les titres et construit le sommaire', () => {
    const { html, toc } = renderMarkdown('## Démarrer vite\n\ntexte\n\n### Étape 1\n\n## Méthode');
    expect(toc).toEqual([
      { level: 2, id: 'demarrer-vite', text: 'Démarrer vite' },
      { level: 3, id: 'etape-1', text: 'Étape 1' },
      { level: 2, id: 'methode', text: 'Méthode' },
    ]);
    expect(html).toContain('id="demarrer-vite"');
  });

  it('rend les tableaux dans un conteneur défilant', () => {
    expect(renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |').html).toContain('<div class="md-table"><table>');
  });

  it('rend le Markdown d’une ligne sans paragraphe', () => {
    expect(renderInlineMarkdown('**Proche de 1** : oui')).toBe('<strong>Proche de 1</strong> : oui');
  });
});
