import { useRouteContext } from '@tanstack/react-router';
import { m } from '@/paraglide/messages.js';

const ROLE_LABELS: Record<string, () => string> = {
  kya_admin: m.role_kya_admin,
  kya_sales: m.role_kya_sales,
  kya_content: m.role_kya_content,
  kya_support: m.role_kya_support,
};

export const roleLabel = (role: string) => ROLE_LABELS[role]?.() ?? role;

/** Coquille de l'administration : chaque rubrique arrive avec sa spécification (feuille de route). */
export function AdminHomePage() {
  const { viewer } = useRouteContext({ from: '/admin' });
  const sections = [
    [m.admin_section_catalog(), '004'],
    [m.admin_section_content(), '004'],
    [m.admin_section_licenses(), '005'],
    [m.admin_section_sales(), '007'],
    [m.admin_section_support(), '009'],
    [m.admin_section_stats(), '010'],
  ] as const;
  return (
    <>
      <header className="acct-head">
        <div>
          <h1>{m.admin_title()}</h1>
          <p>{m.admin_intro()}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {viewer.staffRoles.map((role) => (
            <span key={role} className="chip chip-staff">
              {roleLabel(role)}
            </span>
          ))}
        </div>
      </header>
      <div className="cards">
        {sections.map(([title, spec]) => (
          <div key={title} className="card-soon">
            <b>{title}</b>
            {m.admin_soon({ spec })}
          </div>
        ))}
      </div>
    </>
  );
}
