import type { CatalogChange } from '@kya-em/domain';
import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { m } from '@/paraglide/messages.js';
import { errorText, type useNotice } from '../console/ui';
import { changeCatalogFn, discardCatalogFn, publishCatalogFn, type getEditing } from './catalog';

export type Editing = NonNullable<Awaited<ReturnType<typeof getEditing>>>;

/**
 * Écritures du catalogue depuis la console (spec 005b, FR-003) : chaque changement part dans le
 * brouillon avec la révision lue ; un conflit recharge l'offre et le dit.
 */
export function useCatalogEditor(slug: string, editing: Editing, notice: ReturnType<typeof useNotice>) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const change = async (changes: CatalogChange[], success?: string) => {
    setBusy(true);
    const result = await changeCatalogFn({ data: { slug, changes, expectedRevision: editing.revision } });
    setBusy(false);
    await router.invalidate();
    if (!result.ok) {
      notice.show(errorText(result.code, result.issues), true);
      return false;
    }
    if (success) notice.show(success);
    return true;
  };

  const publish = async () => {
    if (editing.revision === null) return;
    setBusy(true);
    const result = await publishCatalogFn({ data: { slug, revision: editing.revision } });
    setBusy(false);
    await router.invalidate();
    if (!result.ok) return notice.show(errorText(result.code, result.issues), true);
    notice.show(m.cx_published({ count: result.value.changes }));
  };

  const discard = async () => {
    setBusy(true);
    const result = await discardCatalogFn({ data: { slug } });
    setBusy(false);
    await router.invalidate();
    if (!result.ok) return notice.show(errorText(result.code), true);
    notice.show(m.cx_discarded());
  };

  return { change, publish, discard, busy, canWrite: editing.canWrite };
}

/** Barre du brouillon : nombre de changements, abandon, publication. */
export function DraftBar({ editor, editing }: { editor: ReturnType<typeof useCatalogEditor>; editing: Editing }) {
  const [confirm, setConfirm] = useState(false);
  if (!editing.changes.length) return null;
  return (
    <div className="cx-draftbar" role="region" aria-label={m.cx_draft_label()}>
      <span className="dot" aria-hidden="true" />
      <span className="grow">
        <b>{m.cx_draft_count({ count: editing.changes.length })}</b>{' '}
        <span className="cx-muted">{m.cx_draft_hint()}</span>
      </span>
      {editor.canWrite ? (
        confirm ? (
          <>
            <span className="cx-muted" style={{ fontSize: 13 }}>
              {m.cx_discard_confirm()}
            </span>
            <button
              className="cx-btn cx-btn-sm cx-btn-danger"
              type="button"
              disabled={editor.busy}
              onClick={() => void editor.discard()}
            >
              {m.cx_discard()}
            </button>
            <button className="cx-btn cx-btn-sm cx-btn-ghost" type="button" onClick={() => setConfirm(false)}>
              {m.cx_keep()}
            </button>
          </>
        ) : (
          <>
            <details style={{ position: 'relative' }}>
              <summary className="cx-btn cx-btn-sm cx-btn-ghost" style={{ listStyle: 'none' }}>
                {m.cx_draft_details()}
              </summary>
              <ul
                className="cx-card"
                style={{
                  position: 'absolute',
                  bottom: '120%',
                  right: 0,
                  width: 340,
                  maxHeight: 280,
                  overflow: 'auto',
                  margin: 0,
                  padding: '10px 14px 10px 28px',
                  fontSize: 12.5,
                  boxShadow: 'var(--cx-shadow)',
                }}
              >
                {editing.changes.map((change, index) => (
                  <li key={index}>
                    {change.kind === 'added' ? m.cx_diff_added() : m.cx_diff_changed()} · {change.target}
                    {change.field ? <span className="cx-muted"> ({fieldLabel(change.field)})</span> : null}
                  </li>
                ))}
              </ul>
            </details>
            <button className="cx-btn cx-btn-sm cx-btn-ghost" type="button" onClick={() => setConfirm(true)}>
              {m.cx_cancel()}
            </button>
            <button
              className="cx-btn cx-btn-sm cx-btn-primary"
              type="button"
              disabled={editor.busy}
              onClick={() => void editor.publish()}
            >
              {m.cx_publish()}
            </button>
          </>
        )
      ) : null}
    </div>
  );
}

const fieldLabel = (field: string) =>
  (
    ({
      name: m.cx_f_name,
      audience: m.cx_f_audience,
      softwareEdition: m.cx_f_profile,
      watermark: m.cx_f_watermark,
      graceDays: m.cx_f_grace,
      maxSeats: m.cx_f_max_seats,
      maxProjects: m.cx_f_max_projects,
      highlights: m.cx_f_highlights,
      visible: m.cx_f_visible,
      forSale: m.cx_f_for_sale,
      archived: m.cx_f_archived,
      features: m.cx_f_features,
      pricePerSeat: m.cx_price_per_seat,
      days: m.cx_duration,
      nature: m.cx_nature,
      seatsMin: m.cx_f_seats_min,
      seatsMax: m.cx_f_seats_max,
      renewable: m.cx_f_renewable,
      indicative: m.cx_f_indicative,
      status: m.cx_f_status,
    }) as Record<string, (() => string) | undefined>
  )[field]?.() ?? field;
