import { Link, Outlet, useRouteContext } from '@tanstack/react-router';
import { m } from '@/paraglide/messages.js';

/** Administration : réservée à l'équipe KYA ; un client voit « Accès réservé » (spec 002, histoire 4). */
export function AdminLayout() {
  const { viewer } = useRouteContext({ from: '/admin' });
  if (!viewer.isStaff) {
    return (
      <section className="wrap page-head">
        <h1>{m.admin_denied_title()}</h1>
        <p>{m.admin_denied_text()}</p>
        <p>
          <Link className="btn btn-primary" to="/espace">
            {m.me_dashboard()}
          </Link>
        </p>
      </section>
    );
  }
  return (
    <div className="acct">
      <nav className="acct-side" aria-label={m.admin_nav_label()}>
        <div className="acct-org">
          <span className="avatar" aria-hidden="true">
            KYA
          </span>
          <div>
            <b>{m.admin_nav_label()}</b>
            <small>{viewer.email}</small>
          </div>
        </div>
        <Link to="/admin" activeOptions={{ exact: true }} activeProps={{ 'aria-current': 'page' }}>
          {m.me_dashboard()}
        </Link>
        <Link to="/admin/equipe" activeProps={{ 'aria-current': 'page' }}>
          {m.admin_team()}
        </Link>
        <Link to="/admin/mcp" activeProps={{ 'aria-current': 'page' }}>
          {m.admin_mcp()}
        </Link>
      </nav>
      <main className="acct-main">
        <Outlet />
      </main>
    </div>
  );
}
