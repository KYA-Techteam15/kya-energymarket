import { Icon } from '@kya-em/ui';
import { Link, useRouter } from '@tanstack/react-router';
import { authClient } from '@/features/auth/authClient';
import type { Viewer } from '@/features/auth/viewer';
import { m } from '@/paraglide/messages.js';

/** Menu de la personne connectée (spec 002, FR-008). L'administration n'apparaît qu'à l'équipe KYA. */
export function MeMenu({ viewer }: { viewer: Viewer }) {
  const router = useRouter();
  const signOut = async () => {
    await authClient.signOut();
    await router.invalidate();
    await router.navigate({ to: '/' });
  };
  return (
    <details className="dd me-menu">
      <summary className="mk-link" aria-label={m.me_menu()}>
        <span className="avatar" aria-hidden="true">
          {viewer.initials}
        </span>
        <span className="me-name">{m.me_menu()}</span> <Icon name="down" size={12} />
      </summary>
      <div className="dd-panel right">
        <Link className="dd-lang" to="/espace">
          {m.me_dashboard()}
        </Link>
        {viewer.organization?.visible ? (
          <Link className="dd-lang" to="/espace/organisation">
            {m.me_organization()}
          </Link>
        ) : null}
        {viewer.isStaff ? (
          <Link className="dd-lang" to="/admin">
            {m.me_admin()}
          </Link>
        ) : null}
        <button type="button" className="dd-lang dd-button" onClick={signOut}>
          {m.me_sign_out()}
        </button>
      </div>
    </details>
  );
}
