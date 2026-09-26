import type { DashboardStats } from '@kya-em/domain';
import { Link, useNavigate } from '@tanstack/react-router';
import { m } from '@/paraglide/messages.js';
import { ConsoleIcon, ConsolePage, fcfa, formatDateTime } from '../console/ui';

/** Tableau de bord (spec 005b, histoire 4) : résumé, série hebdomadaire, à traiter, activité. */
export function DashboardPage({
  stats,
  name,
  canWrite,
}: {
  stats: DashboardStats | null;
  name: string;
  canWrite: boolean;
}) {
  const navigate = useNavigate();
  const firstName = name.trim().split(/\s+/u)[0] ?? name;
  return (
    <ConsolePage crumbs={[{ label: m.cx_nav_dashboard() }]}>
      <div className="cx-head">
        <div>
          <h1>{m.cx_dash_hello({ name: firstName })}</h1>
          <p>{stats ? m.cx_dash_scope() : m.cx_dash_no_stats()}</p>
        </div>
        <div className="cx-actions">
          {stats ? (
            <select
              className="cx-input"
              style={{ width: 'auto' }}
              aria-label={m.cx_dash_period()}
              value={stats.period}
              onChange={(event) => void navigate({ to: '/admin', search: { periode: event.target.value } as never })}
            >
              <option value="30j">{m.cx_period_30()}</option>
              <option value="90j">{m.cx_period_90()}</option>
              <option value="365j">{m.cx_period_365()}</option>
            </select>
          ) : null}
          {canWrite ? (
            <Link to="/admin/lots/nouveau" className="cx-btn cx-btn-primary">
              <ConsoleIcon name="plus" />
              {m.cx_generate()}
            </Link>
          ) : null}
        </div>
      </div>
      {stats ? <Stats stats={stats} /> : null}
    </ConsolePage>
  );
}

function Stats({ stats }: { stats: DashboardStats }) {
  const idle = stats.todo.idleBatches.reduce((acc, batch) => acc + batch.n, 0);
  const todoCount = [stats.todo.expiringPurchased > 0, idle > 0, stats.todo.failedMails > 0].filter(Boolean).length;
  return (
    <>
      <section className="cx-kpis" aria-label={m.cx_dash_summary()}>
        <div className="cx-card cx-kpi">
          <span className="cx-eyebrow">{m.cx_kpi_sold()}</span>
          <span className="v">
            {new Intl.NumberFormat('fr-FR').format(stats.sold.amount)}
            <small>FCFA</small>
          </span>
          <span className="d">
            {stats.sold.change !== null ? <b>{`${stats.sold.change > 0 ? '+' : ''}${stats.sold.change} %`}</b> : null}{' '}
            {m.cx_kpi_sold_count({ count: stats.sold.count })}
          </span>
        </div>
        <div className="cx-card cx-kpi">
          <span className="cx-eyebrow">{m.cx_kpi_offered()}</span>
          <span className="v">
            {stats.offered}
            <small>{m.cx_licenses_unit()}</small>
          </span>
          <span className="d">{m.cx_kpi_offered_hint()}</span>
        </div>
        <div className="cx-card cx-kpi">
          <span className="cx-eyebrow">{m.cx_kpi_trials()}</span>
          <span className="v">
            {stats.trials.started}
            <small>{m.cx_kpi_started()}</small>
          </span>
          <span className="d">
            <b>{m.cx_kpi_converted({ count: stats.trials.converted })}</b>
            {stats.trials.started ? ` · ${Math.round((stats.trials.converted / stats.trials.started) * 100)} %` : ''}
          </span>
        </div>
        <div className="cx-card cx-kpi">
          <span className="cx-eyebrow">{m.cx_kpi_devices()}</span>
          <span className="v">{stats.devices.active}</span>
          <span className="d">{m.cx_kpi_devices_new({ count: stats.devices.activatedInPeriod })}</span>
        </div>
      </section>

      <section className="cx-dash">
        <div className="cx-card cx-chart">
          <div className="cx-card-h">
            <h2>{m.cx_chart_title()}</h2>
            <div className="cx-legend">
              <span>
                <i style={{ background: 'var(--cx-accent)' }} />
                {m.cx_channel_purchase()}
              </span>
              <span>
                <i style={{ background: 'var(--cx-info)' }} />
                {m.cx_channel_trial()}
              </span>
              <span>
                <i style={{ background: 'var(--cx-warn-dot)' }} />
                {m.cx_chart_offered()}
              </span>
            </div>
          </div>
          <div className="cx-card-b">
            <WeeklyChart weekly={stats.weekly} />
          </div>
        </div>
        <div className="cx-card">
          <div className="cx-card-h">
            <h2>{m.cx_todo()}</h2>
            {todoCount ? <span className="cx-pill warn">{todoCount}</span> : null}
          </div>
          {todoCount === 0 ? (
            <p className="cx-empty">{m.cx_todo_none()}</p>
          ) : (
            <ul className="cx-todo">
              {stats.todo.expiringPurchased > 0 ? (
                <li>
                  <span className="cx-sev warn" />
                  <div>
                    <b>{m.cx_todo_expiring({ count: stats.todo.expiringPurchased })}</b>
                    <p>{m.cx_todo_expiring_hint()}</p>
                    <Link to="/admin/licences" search={{ vue: 'expiring' } as never} className="cx-btn cx-btn-sm">
                      {m.cx_see_licenses()}
                    </Link>
                  </div>
                </li>
              ) : null}
              {idle > 0 ? (
                <li>
                  <span className="cx-sev warn" />
                  <div>
                    <b>{m.cx_todo_idle({ count: idle })}</b>
                    <p>{stats.todo.idleBatches.map((batch) => `${batch.label} (${batch.n})`).join(' · ')}</p>
                    <Link
                      to="/admin/lots/$id"
                      params={{ id: stats.todo.idleBatches[0]!.id }}
                      className="cx-btn cx-btn-sm"
                    >
                      {m.cx_open_batch()}
                    </Link>
                  </div>
                </li>
              ) : null}
              {stats.todo.failedMails > 0 ? (
                <li>
                  <span className="cx-sev danger" />
                  <div>
                    <b>{m.cx_todo_mails({ count: stats.todo.failedMails })}</b>
                    <p>{m.cx_todo_mails_hint()}</p>
                    <Link to="/admin/lots" className="cx-btn cx-btn-sm">
                      {m.cx_nav_batches()}
                    </Link>
                  </div>
                </li>
              ) : null}
            </ul>
          )}
        </div>
      </section>

      <section className="cx-card">
        <div className="cx-card-h">
          <h2>{m.cx_recent()}</h2>
          <Link to="/admin/journal" className="cx-btn cx-btn-sm cx-btn-ghost">
            {m.cx_all_journal()}
          </Link>
        </div>
        {stats.recent.length === 0 ? (
          <p className="cx-empty">{m.cx_recent_none()}</p>
        ) : (
          <ul className="cx-feed">
            {stats.recent.map((event) => (
              <li key={event.id}>
                <time dateTime={event.occurredAt}>{formatDateTime(event.occurredAt)}</time>
                <div>
                  <span className={event.actorType === 'mcp_client' ? 'cx-actor ai' : 'cx-actor'}>
                    {actorLabel(event.actorType, event.actorName)}
                  </span>{' '}
                  · {actionLabel(event.action)}
                  {event.resourceId && event.resourceType === 'license' ? (
                    <>
                      {' '}
                      <Link to="/admin/licences" search={{ licence: event.resourceId } as never} className="mono">
                        {event.resourceId}
                      </Link>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export const actorLabel = (type: string, name: string | null) => {
  if (type === 'mcp_client') return m.cx_actor_mcp({ name: name ?? '' });
  if (type === 'software') return 'KYA-SolDesign';
  if (type === 'system') return m.cx_actor_system();
  return name ?? m.cx_actor_unknown();
};

export const actionLabel = (action: string) =>
  (
    ({
      'license.issued': m.cx_act_issued,
      'license.batch_generated': m.cx_act_batch,
      'license.extended': m.cx_act_extended,
      'license.revoked': m.cx_act_revoked,
      'license.claimed': m.cx_act_claimed,
      'license.activated': m.cx_act_activated,
      'license.seat_released': m.cx_act_released,
      'license.seats_changed': m.cx_act_seats,
      'license.seat_assigned': m.cx_act_assigned,
      'catalog.published': m.cx_act_published,
      'catalog.draft_changed': m.cx_act_draft,
      'catalog.draft_discarded': m.cx_act_discarded,
      'mcp.tool_called': m.cx_act_mcp,
    }) as Record<string, (() => string) | undefined>
  )[action]?.() ?? action;

/** Licences émises par semaine et par canal : barres empilées, une seule échelle. */
function WeeklyChart({ weekly }: { weekly: DashboardStats['weekly'] }) {
  const W = 640;
  const H = 240;
  const L = 34;
  const B = 26;
  const T = 14;
  const R = 8;
  const top = Math.max(4, ...weekly.map((week) => week.purchase + week.trial + week.offered));
  const step = top <= 8 ? 2 : top <= 20 ? 5 : top <= 50 ? 10 : top <= 200 ? 50 : 100;
  const max = Math.ceil(top / step) * step;
  const ticks = Array.from({ length: max / step + 1 }, (_, index) => index * step);
  const y = (value: number) => T + (H - T - B) * (1 - value / max);
  const band = (W - L - R) / weekly.length;
  const label = weekly
    .map(
      (week) =>
        `${week.week} : ${week.purchase} ${m.cx_channel_purchase()}, ${week.trial} ${m.cx_channel_trial()}, ${week.offered} ${m.cx_chart_offered()}`,
    )
    .join(' ; ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${m.cx_chart_title()} — ${label}`}>
      {ticks.map((tick) => (
        <g key={tick}>
          <line className="gl" x1={L} x2={W - R} y1={y(tick)} y2={y(tick)} />
          <text x={L - 8} y={y(tick) + 4} textAnchor="end">
            {tick}
          </text>
        </g>
      ))}
      {weekly.map((week, index) => {
        const x = L + index * band + band * 0.22;
        const width = band * 0.56;
        let acc = 0;
        const parts = (
          [
            ['purchase', 'var(--cx-accent)'],
            ['trial', 'var(--cx-info)'],
            ['offered', 'var(--cx-warn-dot)'],
          ] as const
        ).map(([key, color]) => {
          const value = week[key];
          if (!value) return null;
          const y0 = y(acc);
          const y1 = y(acc + value);
          acc += value;
          return (
            <rect
              key={key}
              x={x}
              y={y1}
              width={width}
              height={Math.max(1, y0 - y1 - 1.5)}
              rx={2}
              style={{ fill: color }}
            />
          );
        });
        return (
          <g key={week.start}>
            {parts}
            <text x={x + width / 2} y={y(acc) - 6} textAnchor="middle" className="tot">
              {acc}
            </text>
            <text x={x + width / 2} y={H - 8} textAnchor="middle">
              {week.week}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export { fcfa };
