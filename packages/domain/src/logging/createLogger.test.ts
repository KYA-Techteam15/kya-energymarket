import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createLogger } from './createLogger.ts';

describe('journaux (spec 001, FR-015)', () => {
  it('masque les valeurs sensibles', () => {
    const lines: string[] = [];
    const sink = new Writable({
      write(chunk, _encoding, done) {
        lines.push(String(chunk));
        done();
      },
    });
    const logger = createLogger({ level: 'info' }, sink);
    logger.info(
      { user: 'afi', token: 'jeton-secret', config: { DATABASE_URL: 'postgresql://u:mdp@h/db' } },
      'connexion',
    );
    const output = lines.join('');
    expect(output).toContain('"user":"afi"');
    expect(output).not.toContain('jeton-secret');
    expect(output).not.toContain('mdp@h');
    expect(output).toContain('[masqué]');
  });
});
