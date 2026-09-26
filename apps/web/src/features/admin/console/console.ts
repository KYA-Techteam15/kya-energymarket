import { PERIODS, type Period } from '@kya-em/domain/constants';
import { createServerFn } from '@tanstack/react-start';
import { loadConsoleContext, loadDashboard, loadJournal, searchConsole } from './console.server';

// Fonctions serveur de la coquille, du tableau de bord et du journal ; droits revérifiés côté serveur.
const record = (input: unknown) => (input ?? {}) as Record<string, unknown>;
const optionalText = (value: unknown, max: number) =>
  typeof value === 'string' && value.length > 0 && value.length <= max ? value : undefined;

export const getConsoleContext = createServerFn({ method: 'GET' }).handler(() => loadConsoleContext());

export const searchConsoleFn = createServerFn({ method: 'GET' })
  .validator((input: { query: string }) => ({ query: String(record(input).query ?? '').slice(0, 120) }))
  .handler(({ data }) => searchConsole(data.query));

export const getDashboard = createServerFn({ method: 'GET' })
  .validator((input: { period?: string }) => {
    const period = record(input).period;
    return { period: (typeof period === 'string' && period in PERIODS ? period : '30j') as Period };
  })
  .handler(({ data }) => loadDashboard(data.period));

export const getJournal = createServerFn({ method: 'GET' })
  .validator((input: { actorType?: string; resourceType?: string; before?: string }) => ({
    actorType: optionalText(record(input).actorType, 20),
    resourceType: optionalText(record(input).resourceType, 40),
    before: optionalText(record(input).before, 40),
  }))
  .handler(({ data }) => loadJournal(data));
