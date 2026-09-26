import { Icon } from '@kya-em/ui';
import { Link, Outlet, useRouteContext, useRouter } from '@tanstack/react-router';
import { authClient } from '@/features/auth/authClient';
import { m } from '@/paraglide/messages.js';

/** Espace client : menu latéral de la maquette v5 ; les rubriques à venir sont annoncées, pas cliquables. */
export function AccountLayout() {
  const { viewer } = useRouteContext({ from: '/espace' });
  const router = useRouter();
  const signOut = async () => {
    await authClient.signOut();
    await router.invalidate();
    await router.navigate({ to: '/' });
  };
  const upcoming = [
    m.account_licences_title(),
    m.account_downloads_title(),
    m.account_invoices_title(),
    m.account_support_title(),
  ];
  return (
    <div className="acct">
      <nav className="acct-side" aria-label={m.account_nav_label()}>
        <div className="acct-org">
          <span className="avatar" aria-hidden="true">
            {viewer.initials}
          </span>
          <div>
            <b>{viewer.organization?.visible ? viewer.organization.name : viewer.name}</b>
            <small>{viewer.email}</small>
          </div>
        </div>
        <Link to="/espace" activeOptions={{ exact: true }} activeProps={{ 'aria-current': 'page' }}>
          <Icon name="check" />
          {m.me_dashboard()}
        </Link>
        {viewer.organization?.visible ? (
          <Link to="/espace/organisation" activeProps={{ 'aria-current': 'page' }}>
            <Icon name="globe" />
            {m.me_organization()}
          </Link>
        ) : null}
        {upcoming.map((label) => (
          <span key={label} className="soon" aria-disabled="true">
            {label}
            <small>{m.nav_soon()}</small>
          </span>
        ))}
        <div className="bottom">
          <button type="button" className="dd-lang dd-button" onClick={signOut}>
            {m.me_sign_out()}
          </button>
        </div>
      </nav>
      <main className="acct-main">
        <Outlet />
      </main>
    </div>
  );
}
