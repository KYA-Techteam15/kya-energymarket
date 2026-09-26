import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { getLocale } from '@/paraglide/runtime.js';
import { Gauge } from './PresentationBlocks';
import { asList, Icon, icon, Markdown, text } from './shared';

// Exemple interactif et graphique réglable (spec 004), repris du script de design/v5.
type Data = Record<string, unknown>;

interface View {
  tab: string;
  icon: string;
  label: string;
  big: string;
  unit: string;
  gauge?: number;
  gaugeKind: string;
  label2: string;
  mid: string;
  unit2: string;
  say: unknown;
  legend: string;
  legendRight: string;
  chart: 'bars' | 'compare';
  months?: string[];
  values?: number[];
  low?: number;
  high?: number;
  highlight?: number;
  reference?: number;
  referenceLabel?: string;
  compare?: { name: string; value: number; highlight?: boolean }[];
  rows: { title: string; note: string; value: string; unit?: string }[];
}

const decimal = (value: number) => new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 1 }).format(value);

function Bars({ view }: { view: View }) {
  const values = view.values ?? [];
  const low = view.low ?? 0;
  const high = view.high ?? Math.max(...values, 1);
  const height = (value: number) => `${(((value - low) / (high - low || 1)) * 92).toFixed(1)}%`;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div className="chart" aria-hidden="true">
      {values.map((value, index) => (
        <div
          key={index}
          className={index + 1 === view.highlight ? 'bar is-hot' : 'bar'}
          style={{ '--h': ready ? height(value) : '0%' } as React.CSSProperties}
        >
          <i>{view.months?.[index] ?? ''}</i>
        </div>
      ))}
      {view.reference !== undefined ? (
        <div className="ref" style={{ '--h': height(view.reference) } as React.CSSProperties}>
          <span>{view.referenceLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

function Compare({ view }: { view: View }) {
  const items = view.compare ?? [];
  const top = Math.max(...items.map((item) => item.value), 1);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div className="chart is-compare" aria-hidden="true">
      {items.map((item) => (
        <div key={item.name} className={item.highlight ? 'cmp is-hot' : 'cmp'}>
          <span>{item.name}</span>
          <div style={{ '--w': ready ? `${(item.value / top) * 100}%` : '0%' } as React.CSSProperties}>
            {decimal(item.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function InteractiveExampleBlock({ data, headingId }: { data: Data; headingId: string }) {
  const views = asList<View>(data.views);
  const [index, setIndex] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();
  const view = views[index];

  const onKey = (event: KeyboardEvent<HTMLButtonElement>, position: number) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (position + step + views.length) % views.length;
    setIndex(next);
    tabs.current[next]?.focus();
  };

  return (
    <section className="section" id="indicateurs" aria-labelledby={headingId}>
      <div className="wrap">
        <div className="sec-head">
          <h2 id={headingId} className="h2">
            {text(data.title)}
          </h2>
          {data.intro ? <p>{text(data.intro)}</p> : null}
        </div>
        <div className="qs">
          {asList<{ value: number; kind: string; title: string; text: string }>(data.gauges).map((gauge) => (
            <div className="q" key={gauge.title}>
              <Gauge value={gauge.value} kind={gauge.kind} mini />
              <b>{gauge.title}</b>
              <p>{gauge.text}</p>
            </div>
          ))}
        </div>

        {view ? (
          <div className="app">
            <aside className="app-side">
              <div className="app-brand">
                <img src="/images/ksd-mark.png" alt="" width="24" height="20" />
                {text(data.brand)}
              </div>
              <div className="app-tabs" role="tablist" aria-label={text(data.projectName)}>
                {views.map((item, position) => (
                  <button
                    key={item.tab}
                    ref={(node) => {
                      tabs.current[position] = node;
                    }}
                    role="tab"
                    type="button"
                    id={`${baseId}-tab-${position}`}
                    aria-selected={position === index}
                    aria-controls={`${baseId}-panel`}
                    tabIndex={position === index ? 0 : -1}
                    onClick={() => setIndex(position)}
                    onKeyDown={(event) => onKey(event, position)}
                  >
                    <Icon name={icon(item.icon, 'sun')} />
                    {item.tab}
                    <Icon name="go" className="i-go" />
                  </button>
                ))}
              </div>
              <p className="app-note">{text(data.note)}</p>
            </aside>
            <div className="app-main" id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${index}`}>
              <div className="app-top">
                <div>
                  <p className="mono-label">{text(data.period)}</p>
                  <p className="app-hello">{text(data.projectName)}</p>
                </div>
              </div>
              <div className="app-figs">
                <div>
                  <p className="app-label">{view.label}</p>
                  <div className="app-bigrow">
                    <p className="app-big">
                      <span>{view.big}</span>
                      <small>{view.unit}</small>
                    </p>
                    {view.gauge !== undefined ? <Gauge value={view.gauge} kind={view.gaugeKind} /> : null}
                  </div>
                </div>
                <div className="app-side-fig">
                  <p className="app-label">{view.label2}</p>
                  <p className="app-mid">
                    <span>{view.mid}</span> <small>{view.unit2}</small>
                  </p>
                </div>
              </div>
              <Markdown value={view.say} className="app-say" />
              {view.chart === 'compare' ? <Compare key={index} view={view} /> : <Bars key={index} view={view} />}
              <p className="chart-legend">
                <span>{view.legend}</span>
                <span>{view.legendRight}</span>
              </p>
              <ul className="rows">
                {view.rows.map((row) => (
                  <li key={row.title}>
                    <b>{row.title}</b>
                    <small>{row.note}</small>
                    <span>
                      {row.value} {row.unit ? <em>{row.unit}</em> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Le point juste : coût du kWh selon la fiabilité visée, comparé au prix du réseau. */
export function FitChartBlock({ data, headingId }: { data: Data; headingId: string }) {
  const W = 560;
  const H = 320;
  const L = 48;
  const R = 16;
  const T = 16;
  const B = 40;
  const sMin = 0.8;
  const sMax = 0.99;
  const cMax = 260;
  const grid = Number(data.gridPrice ?? 120);
  const base = Number(data.base ?? 62);
  const factor = Number(data.factor ?? 5.97);
  const exponent = Number(data.exponent ?? 0.8);
  const reliableFrom = Number(data.reliableFrom ?? 0.88);
  const cost = (s: number) => base + factor / Math.pow(1 - s, exponent);
  const x = (s: number) => L + ((s - sMin) / (sMax - sMin)) * (W - L - R);
  const y = (c: number) => T + (1 - c / cMax) * (H - T - B);
  const points: string[] = [];
  for (let s = sMin; s <= sMax + 1e-9; s += 0.0025)
    points.push(`${x(s).toFixed(1)},${y(Math.min(cost(s), cMax)).toFixed(1)}`);
  // Fiabilité où le coût rejoint le prix du réseau (fin de la zone verte).
  let crossing = sMax;
  for (let s = reliableFrom; s <= sMax; s += 0.0005) {
    if (cost(s) >= grid) {
      crossing = s;
      break;
    }
  }
  const [sri, setSri] = useState(Math.round(Number(data.start ?? 0.9) * 1000));
  const s = sri / 1000;
  const c = cost(s);
  const ratio = c / grid;
  const format = (value: number, digits: number) =>
    new Intl.NumberFormat(getLocale(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  const verdict = s < reliableFrom ? text(data.low) : ratio > 1 ? text(data.over) : text(data.good);
  const cy = y(Math.min(c, cMax));
  const inputId = useId();

  return (
    <section className="section soft" aria-labelledby={headingId}>
      <div className="wrap fit">
        <div className="fit-controls">
          <h2 id={headingId} className="h2">
            {text(data.title)}
          </h2>
          <p className="muted" style={{ fontSize: 17 }}>
            {text(data.text)}
          </p>
          <div className="range">
            <label htmlFor={inputId}>
              {text(data.sliderLabel)} <output htmlFor={inputId}>{format(s, 2)}</output>
            </label>
            <input
              id={inputId}
              type="range"
              min={800}
              max={990}
              step={1}
              value={sri}
              onChange={(event) => setSri(Number(event.currentTarget.value))}
              style={{ '--p': `${((s - sMin) / (sMax - sMin)) * 100}%` } as React.CSSProperties}
            />
          </div>
          <div className="fit-read">
            <div>
              <b>
                <span>{format(c, 1)}</span> <small>{text(data.currency)}</small>
              </b>
              <small>{text(data.costLabel)}</small>
            </div>
            <div>
              <b>{format(ratio, 2)}</b>
              <small>{text(data.ratioLabel)}</small>
            </div>
          </div>
          <p
            className={['fit-verdict', ratio > 1 ? 'is-over' : '', s < reliableFrom ? 'is-low' : ''].join(' ').trim()}
            role="status"
          >
            {verdict}
          </p>
        </div>
        <div>
          <svg className="fit-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={text(data.title)}>
            {[0, 60, 120, 180, 240].map((value) => (
              <g key={value}>
                <line className="grid" x1={L} x2={W - R} y1={y(value)} y2={y(value)} />
                <text className="axis" x={L - 8} y={y(value) + 4} textAnchor="end">
                  {value}
                </text>
              </g>
            ))}
            {[0.8, 0.85, 0.9, 0.95, 0.99].map((value) => (
              <text key={value} className="axis" x={x(value)} y={H - 14} textAnchor="middle">
                {format(value, 2)}
              </text>
            ))}
            <rect
              className="zone"
              x={x(reliableFrom)}
              y={T}
              width={Math.max(0, x(crossing) - x(reliableFrom))}
              height={H - T - B}
            />
            <line className="gridline" x1={L} x2={W - R} y1={y(grid)} y2={y(grid)} />
            <text className="gridlabel" x={L + 6} y={y(grid) - 8}>
              {text(data.gridLabel)}
            </text>
            <polyline className="curve" points={points.join(' ')} />
            <line className="guide" x1={x(s)} x2={x(s)} y1={cy} y2={H - B} />
            <line className="guide" x1={L} x2={x(s)} y1={cy} y2={cy} />
            <circle className="dot" r={8} cx={x(s)} cy={cy} />
            <text className="axis" x={0} y={T - 4}>
              {text(data.axisLabel)}
            </text>
          </svg>
          <p className="fit-note">{text(data.note)}</p>
        </div>
      </div>
    </section>
  );
}
