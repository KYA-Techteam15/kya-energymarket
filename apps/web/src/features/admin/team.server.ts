import { staffCan } from '@kya-em/auth';
import { grantStaffRole, listStaff, revokeStaffRole, StaffError } from '@kya-em/domain';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { runtime } from '@/shared/server/runtime.server';

export type StaffResult =
  { ok: true } | { ok: false; code: 'FORBIDDEN' | 'ACCOUNT_NOT_FOUND' | 'UNKNOWN_ROLE' | 'LAST_ADMIN' };

/** Personne connectée et son rôle d'équipe ; toute fonction d'administration repart de là (FR-006). */
async function staffSession() {
  const { auth, database } = runtime();
  if (!auth || !database) return null;
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  if (!session) return null;
  return { db: database.db, userId: session.user.id, role: (session.user as { role?: string | null }).role ?? null };
}

export async function loadTeam() {
  const session = await staffSession();
  if (!session || !staffCan(session.role, 'staff', 'read')) return null;
  return { members: await listStaff(session.db), canGrant: staffCan(session.role, 'staff', 'grant') };
}

export async function changeStaffRole(
  input: { email: string; role: string },
  mode: 'grant' | 'revoke',
): Promise<StaffResult> {
  const session = await staffSession();
  if (!session || !staffCan(session.role, 'staff', 'grant')) return { ok: false, code: 'FORBIDDEN' };
  try {
    const change = mode === 'grant' ? grantStaffRole : revokeStaffRole;
    await change(session.db, { ...input, actor: { type: 'kya_staff', id: session.userId } });
    return { ok: true };
  } catch (error) {
    if (error instanceof StaffError) return { ok: false, code: error.code };
    throw error;
  }
}
