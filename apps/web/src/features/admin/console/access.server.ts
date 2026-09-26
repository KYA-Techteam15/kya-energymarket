import { staffCan, type Resource } from '@kya-em/auth';
import { CatalogError, LicenseError, type Actor } from '@kya-em/domain';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { ZodError } from 'zod';
import { runtime } from '@/shared/server/runtime.server';

/**
 * Accès aux fonctions serveur de la console (spec 005b) : la session et le droit d'équipe sont relus à
 * chaque appel ; l'interface ne fait que refléter ces droits.
 */
export async function consoleStaff(resource: Resource, action: string) {
  const { auth, database, secret, env } = runtime();
  if (!auth || !database) return null;
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  const role = (session?.user as { role?: string | null } | undefined)?.role ?? null;
  if (!session || !staffCan(role, resource, action)) return null;
  const actor: Actor = { type: 'kya_staff', id: session.user.id };
  return {
    db: database.db,
    secret,
    env,
    actor,
    session,
    can: (target: Resource, what: string) => staffCan(role, target, what),
  };
}

/** Résultat d'une écriture, lisible par l'interface. */
export type ConsoleResult<T = null> =
  { ok: true; value: T } | { ok: false; code: string; issues?: { path: string; message: string }[] };

export const FORBIDDEN: { ok: false; code: string; issues?: { path: string; message: string }[] } = {
  ok: false,
  code: 'FORBIDDEN',
};

/** Exécute une écriture et traduit les erreurs métier ; toute autre erreur remonte. */
export async function attempt<T>(run: () => Promise<T>): Promise<ConsoleResult<T>> {
  try {
    return { ok: true, value: await run() };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        ok: false,
        code: 'INVALID',
        issues: error.issues.map((issue) => ({ path: issue.path.map(String).join('.'), message: issue.message })),
      };
    }
    if (error instanceof CatalogError) return { ok: false, code: error.code, issues: [...error.issues] };
    if (error instanceof LicenseError) return { ok: false, code: error.code };
    throw error;
  }
}
