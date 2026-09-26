import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { authClient } from '@/features/auth/authClient';
import { m } from '@/paraglide/messages.js';

/** Acceptation d'une invitation par la personne invitée, connectée avec le courriel invité (spec 002, histoire 3). */
export function InvitationPage({ invitation }: { invitation: { id: string; organizationName: string } | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!invitation || failed) {
    return (
      <section className="wrap page-head">
        <h1>{m.invite_title()}</h1>
        <p>{m.invite_invalid()}</p>
      </section>
    );
  }

  const accept = async () => {
    setBusy(true);
    const result = await authClient.organization.acceptInvitation({ invitationId: invitation.id });
    setBusy(false);
    if (result.error || !result.data) {
      setFailed(true);
      return;
    }
    // L'organisation rejointe devient l'organisation active (la session en cache pourrait garder l'ancienne).
    await authClient.organization.setActive({ organizationId: result.data.member.organizationId });
    await router.invalidate();
    await router.navigate({ to: '/espace/organisation' });
  };

  return (
    <section className="wrap page-head">
      <h1>{m.invite_title()}</h1>
      <p>{m.invite_text({ organization: invitation.organizationName })}</p>
      <p>
        <button className="btn btn-primary btn-lg" type="button" onClick={() => void accept()} disabled={busy}>
          {busy ? m.busy() : m.invite_accept()}
        </button>
      </p>
    </section>
  );
}
