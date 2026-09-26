import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect } from '@playwright/test';

/** Boîte d'envoi des tests : le serveur y écrit chaque courriel au lieu de l'envoyer (MAIL_OUTBOX_DIR). */
export const OUTBOX_DIR = join(tmpdir(), 'kya-em-e2e-outbox');

interface OutboxMail {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly kind?: string;
}

function mailsTo(address: string, kind: string): OutboxMail[] {
  if (!existsSync(OUTBOX_DIR)) return [];
  return readdirSync(OUTBOX_DIR)
    .sort()
    .map((file) => JSON.parse(readFileSync(join(OUTBOX_DIR, file), 'utf8')) as OutboxMail)
    .filter((mail) => mail.to === address && mail.kind === kind);
}

/** Attend le dernier courriel de cette nature pour cette adresse et rend le lien qu'il contient. */
export async function linkFromMail(address: string, kind: string, after = 0): Promise<string> {
  let link = '';
  await expect
    .poll(() => {
      const mails = mailsTo(address, kind);
      link = mails.length > after ? (/https?:\/\/\S+/u.exec(mails.at(-1)!.text)?.[0] ?? '') : '';
      return link;
    })
    .not.toBe('');
  return link;
}

export const countMails = (address: string, kind: string) => mailsTo(address, kind).length;
