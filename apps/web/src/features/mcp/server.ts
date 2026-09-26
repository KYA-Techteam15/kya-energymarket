import { createServerFn } from '@tanstack/react-start';
import { loadConsent, loadMcpAdmin, revokeConnection } from './consent.server';

// Fonctions serveur du MCP ; les droits sont revérifiés dans consent.server.ts.
const idInput = (input: unknown) => {
  const { id } = (input ?? {}) as { id?: unknown };
  if (typeof id !== 'string' || id.length === 0 || id.length > 200) throw new Error('identifiant invalide');
  return { id };
};

export const getConsent = createServerFn({ method: 'GET' })
  .validator(idInput)
  .handler(({ data }) => loadConsent(data.id));

export const getMcpAdmin = createServerFn({ method: 'GET' }).handler(() => loadMcpAdmin());

export const revokeMcpClient = createServerFn({ method: 'POST' })
  .validator(idInput)
  .handler(({ data }) => revokeConnection(data.id));
