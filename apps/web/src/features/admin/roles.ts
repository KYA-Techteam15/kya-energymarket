import { m } from '@/paraglide/messages.js';

const ROLE_LABELS: Record<string, () => string> = {
  kya_admin: m.role_kya_admin,
  kya_sales: m.role_kya_sales,
  kya_content: m.role_kya_content,
  kya_support: m.role_kya_support,
};

/** Libellé d'un rôle d'équipe KYA. */
export const roleLabel = (role: string) => ROLE_LABELS[role]?.() ?? role;
