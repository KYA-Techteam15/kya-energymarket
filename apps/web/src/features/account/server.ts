import { createServerFn } from '@tanstack/react-start';
import { loadActiveOrganization, loadInvitation } from './organization.server';

// Fonctions serveur de l'espace client ; la logique reste dans organization.server.ts.
export const getActiveOrganization = createServerFn({ method: 'GET' }).handler(() => loadActiveOrganization());

export const getInvitation = createServerFn({ method: 'GET' })
  .validator((id: unknown) => {
    if (typeof id !== 'string' || !/^[\w-]{6,64}$/u.test(id)) throw new Error('identifiant invalide');
    return id;
  })
  .handler(({ data: id }) => loadInvitation(id));
