import type { LicenseChannel, LicenseTypeNature } from '@kya-em/domain';
import { Link } from '@tanstack/react-router';
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';

/** Éléments communs de la console (spec 005b) : icônes, interrupteur, panneau, notifications, formats. */

const ICONS = {
  home: 'M3 11 12 4l9 7M5 10v10h14V10',
  key: 'M8 19a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM11 12l9-9M17 6l3 3M15 8l2 2',
  stack: 'm12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5',
  cart: 'M4 5h2l2 11h10l2-8H7M10 20h.01M17 20h.01',
  box: 'M3 7l9-4 9 4v10l-9 4-9-4V7ZM3 7l9 4 9-4M12 11v10',
  page: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5',
  image: 'M3 4h18v16H3zM9 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM21 17l-5-5-9 8',
  team: 'M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20c.8-3.5 3.3-5 6.5-5s5.7 1.5 6.5 5M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .6 3.2 2.2 3.5 5',
  bot: 'M4 8h16v12H4zM12 4v4M9 14h.01M15 14h.01',
  log: 'M4 6h16M4 12h16M4 18h10',
  plus: 'M12 5v14M5 12h14',
  swap: 'M7 7h13l-3-3M17 17H4l3 3',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-3.5-3.5',
  close: 'M6 6l12 12M18 6 6 18',
  menu: 'M4 7h16M4 17h16',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  mail: 'M3 5h18v14H3zM3 6l9 7 9-7',
} as const;
export type ConsoleIconName = keyof typeof ICONS;

export function ConsoleIcon({ name }: { name: ConsoleIconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

// ---------------------------------------------------------------- contexte de la coquille

export interface ConsoleShell {
  readonly openPalette: () => void;
  readonly toggleMenu: () => void;
  readonly environment: string;
}
export const ConsoleShellContext = createContext<ConsoleShell>({
  openPalette: () => undefined,
  toggleMenu: () => undefined,
  environment: 'development',
});

export interface Crumb {
  readonly label: string;
  readonly to?: string;
  readonly params?: Record<string, string>;
}

/** Page de la console : barre (fil d'Ariane, environnement, recherche) puis contenu. */
export function ConsolePage({ crumbs, children }: { crumbs: readonly Crumb[]; children: ReactNode }) {
  const shell = useContext(ConsoleShellContext);
  return (
    <>
      <header className="cx-top">
        <button
          className="cx-btn cx-btn-ghost cx-btn-sm cx-menu-btn"
          type="button"
          onClick={shell.toggleMenu}
          aria-label={m.cx_menu_open()}
        >
          <ConsoleIcon name="menu" />
        </button>
        <nav className="cx-crumbs" aria-label={m.cx_breadcrumb()}>
          {crumbs.map((crumb, index) =>
            index === crumbs.length - 1 || !crumb.to ? (
              <b key={crumb.label}>{crumb.label}</b>
            ) : (
              <span key={crumb.label} style={{ display: 'contents' }}>
                <Link to={crumb.to as never} params={crumb.params as never}>
                  {crumb.label}
                </Link>
                <span aria-hidden="true">/</span>
              </span>
            ),
          )}
        </nav>
        <span className="cx-spacer" />
        <span className="cx-env" data-env={shell.environment} title={m.cx_environment()}>
          {shell.environment}
        </span>
        <button className="cx-btn cx-btn-sm cx-hide-sm" type="button" onClick={shell.openPalette}>
          <ConsoleIcon name="search" />
          {m.cx_search()} <kbd>Ctrl K</kbd>
        </button>
      </header>
      <main className="cx-content" id="contenu">
        {children}
      </main>
    </>
  );
}

// ---------------------------------------------------------------- interrupteur

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      className="cx-switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  );
}

// ---------------------------------------------------------------- panneau latéral

/** Panneau à droite : Échap ou le fond le ferment, le focus y entre puis revient à l'ouverture. */
export function Drawer({
  eyebrow,
  title,
  onClose,
  children,
  footer,
}: {
  eyebrow?: string;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const titleId = useId();
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>('[data-autofocus], button, input, select, textarea')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [onClose]);
  return (
    <>
      <button className="cx-scrim" type="button" aria-label={m.cx_close()} tabIndex={-1} onClick={onClose} />
      <aside className="cx-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panel}>
        <div className="cx-drawer-h">
          <div style={{ flex: 1, minWidth: 0 }}>
            {eyebrow ? <div className="cx-eyebrow">{eyebrow}</div> : null}
            <h2 id={titleId} style={{ fontSize: 18, marginTop: 4 }}>
              {title}
            </h2>
          </div>
          <button className="cx-btn cx-btn-ghost cx-btn-sm" type="button" onClick={onClose} aria-label={m.cx_close()}>
            <ConsoleIcon name="close" />
          </button>
        </div>
        <div className="cx-drawer-b">{children}</div>
        {footer ? <div className="cx-drawer-f">{footer}</div> : null}
      </aside>
    </>
  );
}

// ---------------------------------------------------------------- notifications

export interface Notice {
  readonly text: string;
  readonly error?: boolean;
}

export function useNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((text: string, error = false) => {
    setNotice({ text, error });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(null), error ? 6000 : 3200);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return { notice, show };
}

export function Toast({ notice }: { notice: Notice | null }) {
  return (
    <div role="status" aria-live="polite">
      {notice ? <div className={notice.error ? 'cx-toast error' : 'cx-toast'}>{notice.text}</div> : null}
    </div>
  );
}

/** Texte d'une erreur rendue par une fonction serveur. */
export function errorText(code: string | undefined, issues?: readonly { path: string; message: string }[]) {
  const known: Record<string, () => string> = {
    FORBIDDEN: m.cx_err_forbidden,
    INVALID: m.cx_err_invalid,
    INVALID_CATALOG: m.cx_err_invalid,
    DRAFT_CONFLICT: m.cx_err_draft_conflict,
    NOTHING_TO_PUBLISH: m.cx_err_nothing,
    NOT_REMOVABLE: m.cx_err_not_removable,
    TOO_MANY_SEATS: m.cx_err_too_many_seats,
    TOO_FEW_SEATS: m.cx_err_too_few_seats,
    REASON_REQUIRED: m.cx_err_reason,
    SEATS_BELOW_ACTIVE: m.cx_err_seats_below,
    TYPE_ARCHIVED: m.cx_err_type_archived,
    NO_RECIPIENT: m.cx_err_no_recipient,
    ORGANIZATION_NOT_FOUND: m.cx_err_holder,
  };
  const base = (code && known[code]?.()) || m.cx_err_generic();
  const first = issues?.[0];
  return first ? `${base} (${first.path} : ${first.message})` : base;
}

// ---------------------------------------------------------------- formats

type Localized = { fr: string; en?: string };
export const loc = (text: Localized | null | undefined) =>
  text ? (getLocale() === 'en' ? text.en || text.fr : text.fr) : '';

export const fcfa = (value: number) => `${new Intl.NumberFormat(getLocale()).format(value)} FCFA`;
export const formatDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium' }).format(Date.parse(iso)) : '—';
export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat(getLocale(), { dateStyle: 'short', timeStyle: 'short' }).format(Date.parse(iso));
export const formatDays = (days: number) => {
  const named: Record<number, () => string> = {
    1: m.cx_days_1,
    7: m.cx_days_7,
    30: m.cx_days_30,
    91: m.cx_days_91,
    182: m.cx_days_182,
    365: m.cx_days_365,
    730: m.cx_days_730,
  };
  return named[days]?.() ?? m.cx_days_n({ count: days });
};

export const channelLabel = (channel: LicenseChannel) =>
  ({
    purchase: m.cx_channel_purchase,
    trial: m.cx_channel_trial,
    staff: m.cx_channel_staff,
    batch: m.cx_channel_batch,
    partner: m.cx_channel_partner,
  })[channel]();
const CHANNEL_TONE: Record<LicenseChannel, string> = {
  purchase: 'ok',
  trial: 'info',
  staff: 'plain',
  batch: 'warn',
  partner: 'plain',
};
export function ChannelPill({ channel }: { channel: LicenseChannel }) {
  return <span className={`cx-pill ${CHANNEL_TONE[channel]}`}>{channelLabel(channel)}</span>;
}

export const natureLabel = (nature: LicenseTypeNature) =>
  ({
    sale: m.cx_nature_sale,
    trial: m.cx_nature_trial,
    free: m.cx_nature_free,
    education: m.cx_nature_education,
    partner: m.cx_nature_partner,
  })[nature]();

/** Jours avant une date (négatif : passée), à l'heure du rendu. */
export function daysUntil(iso: string | null, now: number) {
  return iso ? Math.ceil((Date.parse(iso) - now) / 86_400_000) : null;
}

export function LicenseState({
  license,
  now,
}: {
  license: { status: string; expiresAt: string | null; everActivated: boolean };
  now: number;
}) {
  if (license.status === 'revoked') return <span className="cx-pill danger">{m.cx_state_revoked()}</span>;
  const left = daysUntil(license.expiresAt, now);
  if (left !== null && left < 0) return <span className="cx-pill plain">{m.cx_state_expired()}</span>;
  if (!license.everActivated) return <span className="cx-pill plain">{m.cx_state_waiting()}</span>;
  if (left !== null && left <= 30) return <span className="cx-pill warn">{m.cx_state_soon()}</span>;
  return <span className="cx-pill ok">{m.cx_state_active()}</span>;
}

/** Copie dans le presse-papiers ; rend faux si le navigateur refuse. */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Nouvel identifiant d'unicité (génération de lot, émission). */
export const newIdempotencyKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
