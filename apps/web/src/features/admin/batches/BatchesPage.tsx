import { Link } from '@tanstack/react-router';
import { m } from '@/paraglide/messages.js';
import { actorLabel } from '../dashboard/DashboardPage';
import { ConsoleIcon, ConsolePage, formatDate, loc } from '../console/ui';
import type { getBatches } from './batches';

type Data = NonNullable<Awaited<ReturnType<typeof getBatches>>>;

export const modeLabel = (mode: string) =>
  (
    ({ emails: m.cx_mode_emails, organization: m.cx_mode_organization, keys: m.cx_mode_keys }) as Record<
      string,
      () => string
    >
  )[mode]?.() ?? mode;

/** Lots (spec 005b, histoire 3). */
export function BatchesPage({ data }: { data: Data }) {
  return (
    <ConsolePage crumbs={[{ label: m.cx_nav_sales(), to: '/admin/licences' }, { label: m.cx_nav_batches() }]}>
      <div className="cx-head">
        <div>
          <h1>{m.cx_nav_batches()}</h1>
          <p>{m.cx_batches_intro()}</p>
        </div>
        {data.can.write ? (
          <div className="cx-actions">
            <Link to="/admin/lots/nouveau" className="cx-btn cx-btn-primary">
              <ConsoleIcon name="plus" />
              {m.cx_generate_batch()}
            </Link>
          </div>
        ) : null}
      </div>
      <section className="cx-card">
        <div className="cx-tbl-wrap">
          <table className="cx-tbl">
            <thead>
              <tr>
                <th scope="col">{m.cx_batch()}</th>
                <th scope="col">{m.cx_offer()}</th>
                <th scope="col">{m.cx_recipients()}</th>
                <th scope="col">{m.cx_activated()}</th>
                <th scope="col">{m.cx_created()}</th>
                <th scope="col">{m.cx_by()}</th>
              </tr>
            </thead>
            <tbody>
              {data.batches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="cx-empty">
                    {m.cx_batches_none()}
                  </td>
                </tr>
              ) : (
                data.batches.map((batch) => (
                  <tr key={batch.id}>
                    <td className="cx-who">
                      <Link to="/admin/lots/$id" params={{ id: batch.id }} className="cx-rowlink">
                        {batch.label}
                      </Link>
                      <small className="num">
                        {m.cx_n_licenses({ count: batch.count })}
                        {batch.failedMails ? ` · ${m.cx_failed_mails({ count: batch.failedMails })}` : ''}
                      </small>
                    </td>
                    <td>
                      {loc(batch.editionName)} · {loc(batch.typeName)}
                    </td>
                    <td>{modeLabel(batch.mode)}</td>
                    <td>
                      <div className="cx-seats">
                        <div className="cx-bar" style={{ width: 80 }}>
                          <i style={{ width: `${(batch.activated / Math.max(1, batch.count)) * 100}%` }} />
                        </div>
                        <span className="num">
                          {batch.activated}/{batch.count}
                        </span>
                      </div>
                    </td>
                    <td className="num">{formatDate(batch.createdAt)}</td>
                    <td>{actorLabel('kya_staff', batch.createdByName)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      <p className="cx-hint">{m.cx_batches_hint()}</p>
    </ConsolePage>
  );
}
