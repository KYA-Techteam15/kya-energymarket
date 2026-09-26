import { Link, useNavigate } from '@tanstack/react-router';
import { m } from '@/paraglide/messages.js';
import { actionLabel, actorLabel } from '../dashboard/DashboardPage';
import { ConsolePage, formatDateTime } from '../console/ui';
import type { getJournal } from '../console/console';

type Entries = NonNullable<Awaited<ReturnType<typeof getJournal>>>;

export interface JournalSearch {
  readonly acteur?: string;
  readonly objet?: string;
}

const ACTORS = ['kya_staff', 'mcp_client', 'user', 'software', 'system'] as const;
const RESOURCES = ['license', 'license_batch', 'product', 'page', 'media', 'mcp_tool', 'user'] as const;

const actorTypeLabel = (type: string) =>
  (
    ({
      kya_staff: m.cx_actor_type_staff,
      mcp_client: m.cx_actor_type_mcp,
      user: m.cx_actor_type_user,
      software: () => 'KYA-SolDesign',
      system: m.cx_actor_system,
    }) as Record<string, () => string>
  )[type]?.() ?? type;

const resourceLabel = (type: string) =>
  (
    ({
      license: m.cx_res_license,
      license_batch: m.cx_res_batch,
      product: m.cx_res_product,
      page: m.cx_res_page,
      media: m.cx_res_media,
      mcp_tool: m.cx_res_mcp,
      user: m.cx_res_user,
    }) as Record<string, () => string>
  )[type]?.() ?? type;

/** Journal d'audit (spec 005b) : qui a fait quoi, filtré par acteur et par objet. */
export function JournalPage({ entries, search }: { entries: Entries; search: JournalSearch }) {
  const navigate = useNavigate();
  const go = (next: JournalSearch) => void navigate({ to: '/admin/journal', search: { ...search, ...next } as never });
  return (
    <ConsolePage crumbs={[{ label: m.cx_nav_system() }, { label: m.cx_nav_journal() }]}>
      <div className="cx-head">
        <div>
          <h1>{m.cx_nav_journal()}</h1>
          <p>{m.cx_journal_intro()}</p>
        </div>
      </div>
      <section className="cx-card">
        <div className="cx-filters">
          <select
            className="cx-input"
            aria-label={m.cx_actor()}
            value={search.acteur ?? ''}
            onChange={(event) => go({ acteur: event.target.value || undefined })}
          >
            <option value="">{m.cx_all_actors()}</option>
            {ACTORS.map((actor) => (
              <option key={actor} value={actor}>
                {actorTypeLabel(actor)}
              </option>
            ))}
          </select>
          <select
            className="cx-input"
            aria-label={m.cx_object()}
            value={search.objet ?? ''}
            onChange={(event) => go({ objet: event.target.value || undefined })}
          >
            <option value="">{m.cx_all_objects()}</option>
            {RESOURCES.map((resource) => (
              <option key={resource} value={resource}>
                {resourceLabel(resource)}
              </option>
            ))}
          </select>
        </div>
        <div className="cx-tbl-wrap">
          <table className="cx-tbl">
            <thead>
              <tr>
                <th scope="col">{m.cx_when()}</th>
                <th scope="col">{m.cx_actor()}</th>
                <th scope="col">{m.cx_action()}</th>
                <th scope="col">{m.cx_object()}</th>
                <th scope="col">{m.cx_outcome()}</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="cx-empty">
                    {m.cx_recent_none()}
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="num mono" style={{ whiteSpace: 'nowrap' }}>
                      {formatDateTime(entry.occurredAt)}
                    </td>
                    <td className="cx-who">
                      <b className={entry.actorType === 'mcp_client' ? 'cx-actor ai' : undefined}>
                        {actorLabel(entry.actorType, entry.actorName)}
                      </b>
                      <small>{actorTypeLabel(entry.actorType)}</small>
                    </td>
                    <td>
                      {actionLabel(entry.action)}
                      <small className="mono cx-muted" style={{ display: 'block' }}>
                        {entry.action}
                      </small>
                    </td>
                    <td>
                      {resourceLabel(entry.resourceType)}{' '}
                      {entry.resourceType === 'license' && entry.resourceId ? (
                        <Link to="/admin/licences" search={{ licence: entry.resourceId } as never} className="mono">
                          {entry.resourceId}
                        </Link>
                      ) : entry.resourceType === 'license_batch' && entry.resourceId ? (
                        <Link to="/admin/lots/$id" params={{ id: entry.resourceId }} className="mono">
                          {entry.resourceId.slice(0, 8)}
                        </Link>
                      ) : (
                        <span className="mono cx-muted">{entry.resourceId ?? ''}</span>
                      )}
                    </td>
                    <td>
                      <span className={entry.outcome === 'success' ? 'cx-pill ok' : 'cx-pill danger'}>
                        {entry.outcome === 'success' ? m.cx_success() : m.cx_failure()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </ConsolePage>
  );
}
