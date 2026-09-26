import { createServerFn } from '@tanstack/react-start';
import { activateTrial, loadTrialPage } from './trial.server';

// Fonctions serveur de la page Essai ; la session et les droits sont revérifiés dans trial.server.ts.
const slug = (value: unknown) => {
  if (typeof value !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/u.test(value) || value.length > 60) {
    throw new Error('logiciel invalide');
  }
  return value;
};

export const getTrialPage = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => ({ slug: slug(input.slug) }))
  .handler(({ data }) => loadTrialPage(data.slug));

export const activateTrialFn = createServerFn({ method: 'POST' })
  .validator((input: { slug: string }) => ({ slug: slug(input.slug) }))
  .handler(({ data }) => activateTrial(data.slug));
