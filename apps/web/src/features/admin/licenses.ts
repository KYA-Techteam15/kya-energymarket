import { createServerFn } from '@tanstack/react-start';
import {
  extendLicenseAdmin,
  issueLicenseAdmin,
  loadLicenseAdmin,
  loadLicensesAdmin,
  releaseSeatAdmin,
  revokeLicenseAdmin,
  setSeatsAdmin,
} from './licenses.server';

// Fonctions serveur de l'administration des licences ; droits revérifiés dans licenses.server.ts.
const record = (input: unknown) => (input ?? {}) as Record<string, unknown>;
const text = (value: unknown, max: number) => {
  if (typeof value !== 'string' || value.length === 0 || value.length > max) throw new Error('valeur invalide');
  return value;
};
const integer = (value: unknown) => {
  const number = Number(value);
  if (!Number.isInteger(number)) throw new Error('nombre entier attendu');
  return number;
};

export const getLicensesAdmin = createServerFn({ method: 'GET' })
  .validator((input: unknown) => ({ query: String(record(input).query ?? '').slice(0, 120) }))
  .handler(({ data }) => loadLicensesAdmin(data.query));

export const getLicenseAdmin = createServerFn({ method: 'GET' })
  .validator((input: unknown) => ({ id: text(record(input).id, 40) }))
  .handler(({ data }) => loadLicenseAdmin(data.id));

export const issueLicenseFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    email: text(record(input).email, 254),
    editionCode: text(record(input).editionCode, 30),
    duration: text(record(input).duration, 5),
    seats: integer(record(input).seats),
  }))
  .handler(({ data }) => issueLicenseAdmin(data));

export const extendLicenseFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({ id: text(record(input).id, 40), expiresAt: text(record(input).expiresAt, 40) }))
  .handler(({ data }) => extendLicenseAdmin(data.id, data.expiresAt));

export const setSeatsFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({ id: text(record(input).id, 40), seats: integer(record(input).seats) }))
  .handler(({ data }) => setSeatsAdmin(data.id, data.seats));

export const releaseSeatAdminFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    id: text(record(input).id, 40),
    activationId: text(record(input).activationId, 40),
  }))
  .handler(({ data }) => releaseSeatAdmin(data.id, data.activationId));

export const revokeLicenseFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({ id: text(record(input).id, 40) }))
  .handler(({ data }) => revokeLicenseAdmin(data.id));
