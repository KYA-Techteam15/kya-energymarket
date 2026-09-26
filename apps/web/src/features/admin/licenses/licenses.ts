import type { IssueInputValue, LicenseFilters } from '@kya-em/domain';
import { CHANNELS, LICENSE_VIEWS } from '@kya-em/domain/constants';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import {
  bulkFromConsole,
  extendFromConsole,
  issueFromConsole,
  loadLicenseDetail,
  loadLicenses,
  loadOffer,
  releaseFromConsole,
  resendFromConsole,
  revokeFromConsole,
  searchHolders,
  setSeatsFromConsole,
} from './licenses.server';

// Fonctions serveur des licences. Aucune valeur du domaine n'est importée ici (module aussi chargé par le
// navigateur) : les services du domaine revalident chaque entrée avec leurs schémas, et les droits sont
// revérifiés côté serveur.
const licenseId = z.string().min(4).max(40);

export const getLicenses = createServerFn({ method: 'GET' })
  .validator((input: z.input<typeof LicenseFilters>) => input)
  .handler(({ data }) => loadLicenses(data));

export const getLicenseDetail = createServerFn({ method: 'GET' })
  .validator((input: { id: string }) => ({ id: licenseId.parse(input.id) }))
  .handler(({ data }) => loadLicenseDetail(data.id));

export const searchHoldersFn = createServerFn({ method: 'GET' })
  .validator((input: { query: string }) => ({ query: z.string().max(120).parse(input.query) }))
  .handler(({ data }) => searchHolders(data.query));

type IssueRequest = Omit<IssueInputValue, 'startsAt'> & { sendKey?: boolean };
export const issueLicenseFn = createServerFn({ method: 'POST' })
  // La date de début n'est jamais fixée par la console (émission ou première activation).
  .validator((input: IssueRequest) => ({ ...input, startsAt: undefined, sendKey: input.sendKey === true }))
  .handler(({ data }) => issueFromConsole(data));

const ExtendRequest = z.strictObject({
  id: licenseId,
  days: z.number().int().min(1).max(3650).optional(),
  expiresAt: z.iso.datetime().optional(),
  reason: z.string().trim().max(300).optional(),
});
export const extendLicenseFn = createServerFn({ method: 'POST' })
  .validator((input: z.input<typeof ExtendRequest>) => ExtendRequest.parse(input))
  .handler(({ data }) => extendFromConsole(data));

export const setSeatsFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string; seats: number }) =>
    z.strictObject({ id: licenseId, seats: z.number().int().min(1).max(10_000) }).parse(input),
  )
  .handler(({ data }) => setSeatsFromConsole(data));

export const releaseSeatFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string; activationId: string }) =>
    z.strictObject({ id: licenseId, activationId: z.uuid() }).parse(input),
  )
  .handler(({ data }) => releaseFromConsole(data));

export const revokeLicenseFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string; reason: string }) =>
    z.strictObject({ id: licenseId, reason: z.string().trim().min(3).max(300) }).parse(input),
  )
  .handler(({ data }) => revokeFromConsole(data));

export const resendKeyFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string; email?: string }) =>
    z.strictObject({ id: licenseId, email: z.email().optional() }).parse(input),
  )
  .handler(({ data }) => resendFromConsole(data));

const BulkRequest = z.strictObject({
  ids: z.array(licenseId).min(1).max(200),
  action: z.enum(['extend', 'revoke', 'csv']),
  days: z.number().int().min(1).max(3650).optional(),
  reason: z.string().trim().max(300).optional(),
});
export const bulkLicensesFn = createServerFn({ method: 'POST' })
  .validator((input: z.input<typeof BulkRequest>) => BulkRequest.parse(input))
  .handler(({ data }) => bulkFromConsole(data));

export const getOfferFn = createServerFn({ method: 'GET' }).handler(() => loadOffer());

export { CHANNELS, LICENSE_VIEWS };
