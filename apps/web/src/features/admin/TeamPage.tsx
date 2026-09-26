import { Icon } from '@kya-em/ui';
import { useRouter } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { m } from '@/paraglide/messages.js';
import { roleLabel } from './roles';
import { grantRole, revokeRole, type listTeam } from './server';

type Team = NonNullable<Awaited<ReturnType<typeof listTeam>>>;
const ROLES = ['kya_admin', 'kya_sales', 'kya_content', 'kya_support'] as const;

const errorText = (code: string) =>
  code === 'ACCOUNT_NOT_FOUND'
    ? m.admin_error_account()
    : code === 'LAST_ADMIN'
      ? m.admin_error_last()
      : code === 'FORBIDDEN'
        ? m.admin_only()
        : m.auth_error_generic();

/** Équipe KYA : liste, attribution et retrait des rôles, réservés à un administrateur (spec 002, FR-005). */
export function TeamPage({ team }: { team: Team }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const apply = async (action: typeof grantRole, data: { email: string; role: string }) => {
    const result = await action({ data });
    if (!result.ok) {
      setError(errorText(result.code));
      return;
    }
    setError(null);
    await router.invalidate();
  };

  const onGrant = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void apply(grantRole, { email: String(form.get('email')).trim(), role: String(form.get('role')) });
  };

  return (
    <>
      <header className="acct-head">
        <div>
          <h1>{m.admin_team()}.</h1>
          <p>{m.admin_team_intro()}</p>
        </div>
      </header>
      {error ? (
        <p className="form-error" role="alert" style={{ marginBottom: 20 }}>
          {error}
        </p>
      ) : null}

      <section className="box" aria-labelledby="t-team">
        <div className="box-head">
          <h2 id="t-team">{m.admin_team()}</h2>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>{m.field_name()}</th>
                <th>{m.admin_grant_role()}</th>
              </tr>
            </thead>
            <tbody>
              {team.members.map((member) => (
                <tr key={member.id}>
                  <td className="who">
                    <b>{member.name}</b>
                    <small>{member.email}</small>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {member.roles.map((role) => (
                        <span key={role} className="chip chip-staff">
                          {roleLabel(role)}
                          {team.canGrant ? (
                            <button
                              type="button"
                              className="dd-button"
                              style={{ marginLeft: 6, width: 'auto' }}
                              aria-label={`${m.admin_revoke()} ${roleLabel(role)} — ${member.name}`}
                              onClick={() => void apply(revokeRole, { email: member.email, role })}
                            >
                              <Icon name="close" size={12} />
                            </button>
                          ) : null}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="box" aria-labelledby="t-grant">
        <div className="box-head">
          <h2 id="t-grant">{m.admin_grant()}</h2>
        </div>
        <div className="box-body">
          {team.canGrant ? (
            <form className="form" style={{ maxWidth: 560 }} onSubmit={onGrant}>
              <div className="form-row">
                <label className="field">
                  <span>{m.admin_grant_email()}</span>
                  <input className="input" name="email" type="email" required />
                </label>
                <label className="field">
                  <span>{m.admin_grant_role()}</span>
                  <select className="input" name="role" defaultValue="kya_support">
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {roleLabel(role)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div>
                <button className="btn btn-primary" type="submit">
                  {m.admin_grant()}
                </button>
              </div>
            </form>
          ) : (
            <p>{m.admin_only()}</p>
          )}
        </div>
      </section>
    </>
  );
}
