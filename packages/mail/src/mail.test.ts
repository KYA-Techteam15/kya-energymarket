import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { localeFromRequest } from './locale.ts';
import { createOutboxMailer } from './mailer.ts';
import { renderMail } from './templates.ts';

describe('modèles de courriel', () => {
  it('rend le texte et le HTML dans la langue demandée, lien compris', () => {
    const url = 'https://exemple.test/api/auth/verify-email?token=abc&callbackURL=%2Ffr%2Fespace';
    const fr = renderMail({ kind: 'verify-email', name: 'Afi Kodjo', url }, 'fr', 'afi@exemple.test');
    expect(fr.subject).toBe('Confirmez votre adresse — KYA-EnergyMarket');
    expect(fr.text).toContain('Bonjour Afi,');
    expect(fr.text).toContain(url);
    expect(fr.html).toContain('lang="fr"');
    expect(fr.html).toContain(url.replace(/&/gu, '&#38;'));

    const en = renderMail({ kind: 'verify-email', name: 'Afi Kodjo', url }, 'en', 'afi@exemple.test');
    expect(en.subject).toBe('Confirm your email — KYA-EnergyMarket');
  });

  it('échappe les données saisies par les personnes', () => {
    const mail = renderMail(
      {
        kind: 'invitation',
        organizationName: '<script>x</script>',
        inviterName: 'Koffi',
        url: 'https://exemple.test/i',
      },
      'fr',
      'ama@exemple.test',
    );
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&#60;script&#62;');
  });

  it('existe pour chaque nature de courriel, dans les deux langues', () => {
    const templates = [
      { kind: 'verify-email', name: 'A', url: 'u' },
      { kind: 'magic-link', url: 'u' },
      { kind: 'reset-password', name: 'A', url: 'u' },
      { kind: 'invitation', organizationName: 'O', inviterName: 'I', url: 'u' },
      { kind: 'staff-welcome', name: 'A', roleLabel: 'administrateur', url: 'u' },
      {
        kind: 'license-seat',
        productName: 'KYA-SolDesign',
        inviterName: 'Koffi',
        key: 'KYA-COM-12M-AAAA-BBBB-CCCC',
        url: 'u',
      },
    ] as const;
    for (const template of templates) {
      for (const locale of ['fr', 'en'] as const) {
        const mail = renderMail(template, locale, 'x@exemple.test');
        expect(mail.subject.length).toBeGreaterThan(10);
        expect(mail.kind).toBe(template.kind);
      }
    }
  });
});

describe('langue du courriel', () => {
  const request = (headers: Record<string, string>) => new Request('https://exemple.test', { headers });

  it('suit le cookie du site, puis le navigateur, puis le français', () => {
    expect(localeFromRequest(request({ cookie: 'a=1; KYA_LOCALE=en' }))).toBe('en');
    expect(localeFromRequest(request({ 'accept-language': 'en-US,en;q=0.9' }))).toBe('en');
    expect(localeFromRequest(request({ 'accept-language': 'de-DE' }))).toBe('fr');
    expect(localeFromRequest(undefined)).toBe('fr');
  });
});

describe('boîte d’envoi des tests', () => {
  it('écrit chaque courriel dans un fichier JSON', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'kya-em-outbox-'));
    try {
      const mailer = createOutboxMailer(directory);
      await mailer.send({ to: 'a@exemple.test', subject: 'S', text: 'T', kind: 'magic-link' });
      const [file] = readdirSync(directory);
      expect(JSON.parse(readFileSync(join(directory, file!), 'utf8'))).toMatchObject({ to: 'a@exemple.test' });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
