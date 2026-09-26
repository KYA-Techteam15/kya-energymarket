import { useRouter } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { authClient } from '@/features/auth/authClient';
import { m } from '@/paraglide/messages.js';
import { localizeHref } from '@/paraglide/runtime.js';
import type { getActiveOrganization } from './server';

type Organization = NonNullable<Awaited<ReturnType<typeof getActiveOrganization>>>;

/** Organisation d'entreprise : nom, membres, invitations (spec 002, histoires 2 et 3). */
export function OrganizationPage({ organization }: { organization: Organization }) {
  const router = useRouter();
  const isOwner = organization.myRole === 'owner';
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const after = async (result: { error?: unknown }, ok?: string) => {
    if (result.error) {
      setError(m.auth_error_generic());
      return false;
    }
    setError(null);
    if (ok) setNotice(ok);
    await router.invalidate();
    return true;
  };

  const rename = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get('name')).trim();
    if (name)
      await after(
        await authClient.organization.update({ organizationId: organization.id, data: { name } }),
        m.org_saved(),
      );
  };

  const invite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get('email')).trim();
    const result = await authClient.organization.inviteMember({
      email,
      role: 'member',
      organizationId: organization.id,
    });
    if ((await after(result)) && result.data) {
      // Tant qu'aucun fournisseur de courriel n'est branché, le lien est remis à l'invitant (FR-004).
      setInviteLink(new URL(localizeHref(`/invitation/${result.data.id}`), window.location.origin).href);
      setCopied(false);
      form.reset();
    }
  };

  const remove = async (memberId: string) => {
    await after(
      await authClient.organization.removeMember({ memberIdOrEmail: memberId, organizationId: organization.id }),
    );
  };

  return (
    <>
      <header className="acct-head">
        <div>
          <h1>{m.org_title()}</h1>
          <p>{m.org_intro()}</p>
        </div>
      </header>

      {error ? (
        <p className="form-error" role="alert" style={{ marginBottom: 20 }}>
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="form-ok" role="status" style={{ marginBottom: 20 }}>
          {notice}
        </p>
      ) : null}

      <section className="box" aria-labelledby="t-name">
        <div className="box-head">
          <h2 id="t-name">{m.org_field_name()}</h2>
        </div>
        <div className="box-body">
          <form className="form" style={{ maxWidth: 520 }} onSubmit={rename}>
            <label className="field">
              <span className="sr-only">{m.org_field_name()}</span>
              <input className="input" name="name" defaultValue={organization.name} required disabled={!isOwner} />
            </label>
            {isOwner ? (
              <div>
                <button className="btn btn-line" type="submit">
                  {m.org_save()}
                </button>
              </div>
            ) : null}
          </form>
        </div>
      </section>

      <section className="box" aria-labelledby="t-members">
        <div className="box-head">
          <h2 id="t-members">{m.org_members()}</h2>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>{m.field_name()}</th>
                <th>{m.admin_grant_role()}</th>
                <th>
                  <span className="sr-only">{m.org_remove()}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {organization.members.map((member) => (
                <tr key={member.id}>
                  <td className="who">
                    <b>
                      {member.name} {member.isMe ? m.org_you() : ''}
                    </b>
                    <small>{member.email}</small>
                  </td>
                  <td>{member.role === 'owner' ? m.org_role_owner() : m.org_role_member()}</td>
                  <td className="act">
                    {isOwner && member.role !== 'owner' ? (
                      <button className="btn btn-line btn-sm" type="button" onClick={() => void remove(member.id)}>
                        {m.org_remove()}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="box" aria-labelledby="t-invite">
        <div className="box-head">
          <h2 id="t-invite">{m.org_invite()}</h2>
        </div>
        <div className="box-body">
          {isOwner ? (
            <form className="form" style={{ maxWidth: 520 }} onSubmit={invite}>
              <label className="field">
                <span>{m.org_invite_email()}</span>
                <input className="input" name="email" type="email" required />
              </label>
              <div>
                <button className="btn btn-primary" type="submit">
                  {m.org_invite_send()}
                </button>
              </div>
            </form>
          ) : (
            <p>{m.org_member_only()}</p>
          )}
          {inviteLink ? (
            <div role="status">
              <p style={{ marginTop: 18 }}>{m.org_invite_link()}</p>
              <div className="keybox">
                <code data-testid="invite-link">{inviteLink}</code>
                <button
                  className="btn btn-line btn-sm"
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(inviteLink);
                    setCopied(true);
                  }}
                >
                  {copied ? m.copied() : m.copy()}
                </button>
              </div>
            </div>
          ) : null}
          <h3 className="h3" style={{ marginTop: 28, fontSize: '1rem' }}>
            {m.org_pending()}
          </h3>
          {organization.invitations.length === 0 ? (
            <p style={{ marginTop: 8 }}>{m.org_none()}</p>
          ) : (
            <ul style={{ marginTop: 8, display: 'grid', gap: 6 }}>
              {organization.invitations.map((invitation) => (
                <li key={invitation.id}>
                  {invitation.email} <span className="chip">{invitation.expiresAt.slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
