import { describe, expect, it } from 'vitest';
import { EnvError, loadServerEnv } from './env.ts';

// Valeurs factices, assemblées à l'exécution pour que la recherche de secrets reste stricte.
const SECRET_URL = ['postgresql://owner', 'tres-secret@ep-example-pooler.eu-central-1.aws.neon.tech/app'].join(':');
const MYSQL_URL = ['mysql://root', 'tres-secret@host/db'].join(':');

describe('variables d’environnement (spec 001, FR-010)', () => {
  it('applique les valeurs par défaut du développement', () => {
    const env = loadServerEnv({});
    expect(env).toMatchObject({ APP_ENV: 'development', APP_BASE_URL: 'http://localhost:3000', LOG_LEVEL: 'info' });
    expect(env.DATABASE_URL).toBeUndefined();
  });

  it('traite une variable vide comme absente', () => {
    expect(loadServerEnv({ DATABASE_URL: '', APP_ENV: ' ' }).APP_ENV).toBe('development');
  });

  it('exige le secret des sessions en production', () => {
    expect(() => loadServerEnv({ APP_ENV: 'production', DATABASE_URL: SECRET_URL })).toThrow(
      /BETTER_AUTH_SECRET \(obligatoire en production\)/u,
    );
  });

  it('exige la base en production et nomme la variable', () => {
    expect(() => loadServerEnv({ APP_ENV: 'production' })).toThrow(/DATABASE_URL \(obligatoire en production\)/u);
  });

  it('ne révèle jamais la valeur d’une variable invalide', () => {
    try {
      loadServerEnv({ DATABASE_URL: MYSQL_URL, APP_BASE_URL: 'pas-une-url' });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(EnvError);
      const message = (error as Error).message;
      expect(message).toContain('DATABASE_URL (valeur invalide)');
      expect(message).toContain('APP_BASE_URL (valeur invalide)');
      expect(message).not.toContain('tres-secret');
      expect(message).not.toContain('pas-une-url');
    }
  });

  it('accepte une connexion Neon valide', () => {
    expect(loadServerEnv({ DATABASE_URL: SECRET_URL }).DATABASE_URL).toBe(SECRET_URL);
  });
});
