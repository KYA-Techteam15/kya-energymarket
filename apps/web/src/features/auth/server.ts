import { createServerFn } from '@tanstack/react-start';
import { authCapabilities, loadViewer } from './session.server';

// Fonctions serveur appelées par l'interface ; la logique reste dans session.server.ts.
export const getViewer = createServerFn({ method: 'GET' }).handler(() => loadViewer());

/** Capacités publiques des comptes (lien de connexion disponible ?). */
export const getAuthCapabilities = createServerFn({ method: 'GET' }).handler(() => authCapabilities());
