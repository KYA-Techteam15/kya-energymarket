import { createServerFn } from '@tanstack/react-start';
import { assignSeat, claimMyKey, loadMyLicenses, releaseMySeat } from './client.server';

// Fonctions serveur de l'espace Licences ; droits revérifiés dans client.server.ts.
const text = (value: unknown, max: number) => {
  if (typeof value !== 'string' || value.length === 0 || value.length > max) throw new Error('valeur invalide');
  return value;
};
const record = (input: unknown) => (input ?? {}) as Record<string, unknown>;

export const getMyLicenses = createServerFn({ method: 'GET' }).handler(() => loadMyLicenses());

export const releaseSeatFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    licenseId: text(record(input).licenseId, 40),
    activationId: text(record(input).activationId, 40),
  }))
  .handler(({ data }) => releaseMySeat(data.licenseId, data.activationId));

export const assignSeatFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    licenseId: text(record(input).licenseId, 40),
    email: text(record(input).email, 254),
  }))
  .handler(({ data }) => assignSeat(data.licenseId, data.email));

export const claimKeyFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({ key: text(record(input).key, 64) }))
  .handler(({ data }) => claimMyKey(data.key));
