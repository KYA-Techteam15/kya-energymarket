import { useNavigate } from '@tanstack/react-router';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { m } from '@/paraglide/messages.js';
import { searchConsoleFn, type getConsoleContext } from './console';
import { ConsoleIcon, type ConsoleIconName } from './ui';

type Can = NonNullable<Awaited<ReturnType<typeof getConsoleContext>>>['can'];
type Found = NonNullable<Awaited<ReturnType<typeof searchConsoleFn>>>;

interface Item {
  readonly group: string;
  readonly label: string;
  readonly meta?: string;
  readonly icon: ConsoleIconName;
  readonly go: () => void;
}

/**
 * Recherche Ctrl K (spec 005b, histoire 4) : une clé collée, un identifiant, un courriel, une
 * organisation, un lot ou une édition ; et les actions courantes. Flèches, Entrée, Échap.
 */
export function CommandPalette({ can, onClose }: { can: Can; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Found | null>(null);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    input.current?.focus();
    return () => opener?.focus?.();
  }, []);

  // Recherche serveur, 200 ms après la dernière frappe.
  useEffect(() => {
    if (query.trim().length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void searchConsoleFn({ data: { query } }).then((result) => {
        if (!cancelled) setFound(result);
      });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Moins de deux caractères : aucun résultat serveur affiché.
  const shown = query.trim().length < 2 ? null : found;
  const items = useMemo(() => {
    const close = (run: () => void) => () => {
      onClose();
      run();
    };
    const actions: Item[] = [];
    if (can.licenses.write) {
      actions.push(
        {
          group: m.cx_p_actions(),
          label: m.cx_p_generate(),
          icon: 'stack',
          go: close(() => void navigate({ to: '/admin/lots/nouveau' })),
        },
        {
          group: m.cx_p_actions(),
          label: m.cx_p_issue(),
          icon: 'plus',
          go: close(() => void navigate({ to: '/admin/licences', search: { emettre: '1' } as never })),
        },
      );
    }
    if (can.licenses.read) {
      actions.push({
        group: m.cx_p_actions(),
        label: m.cx_p_expiring(),
        icon: 'key',
        go: close(() => void navigate({ to: '/admin/licences', search: { vue: 'expiring' } as never })),
      });
    }
    if (can.catalog.read) {
      actions.push({
        group: m.cx_p_actions(),
        label: m.cx_p_catalog(),
        icon: 'box',
        go: close(() => void navigate({ to: '/admin/catalogue' })),
      });
    }
    const needle = query.trim().toLowerCase();
    const matching = needle ? actions.filter((item) => item.label.toLowerCase().includes(needle)) : actions;
    const results: Item[] = [
      ...(shown?.licenses ?? []).map((license) => ({
        group: m.cx_p_licenses(),
        label: `${license.label ?? license.recipient ?? m.cx_unassigned()} · ${license.offer}`,
        meta: license.id,
        icon: 'key' as const,
        go: close(() => void navigate({ to: '/admin/licences', search: { licence: license.id } as never })),
      })),
      ...(shown?.batches ?? []).map((batch) => ({
        group: m.cx_p_batches(),
        label: batch.label,
        meta: m.cx_n_licenses({ count: batch.count }),
        icon: 'stack' as const,
        go: close(() => void navigate({ to: '/admin/lots/$id', params: { id: batch.id } })),
      })),
      ...(shown?.editions ?? []).map((edition) => ({
        group: m.cx_p_catalog_group(),
        label: `${edition.product} · ${edition.label}`,
        meta: edition.visible ? undefined : m.cx_hidden(),
        icon: 'box' as const,
        go: close(
          () =>
            void navigate({
              to: '/admin/catalogue/$slug/$edition',
              params: { slug: edition.slug, edition: edition.code },
            }),
        ),
      })),
    ];
    return [...results, ...matching];
  }, [can, shown, navigate, onClose, query]);
  const current = Math.min(active, Math.max(0, items.length - 1));

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') onClose();
    else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(Math.min(items.length - 1, current + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(Math.max(0, current - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      items[current]?.go();
    }
  };

  let lastGroup = '';
  return (
    <>
      <button className="cx-scrim palette" type="button" aria-label={m.cx_close()} tabIndex={-1} onClick={onClose} />
      <div className="cx-palette" role="dialog" aria-modal="true" aria-label={m.cx_p_title()}>
        <div className="cx-palette-in">
          <ConsoleIcon name="search" />
          <input
            ref={input}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={m.cx_p_placeholder()}
            aria-label={m.cx_p_title()}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={items[current] ? `${listId}-${current}` : undefined}
            autoComplete="off"
          />
          <kbd>Échap</kbd>
        </div>
        <div className="cx-palette-list" id={listId} role="listbox" aria-label={m.cx_p_title()}>
          {items.length === 0 ? (
            <p className="cx-empty" style={{ padding: 24 }}>
              {m.cx_p_nothing()}
            </p>
          ) : (
            items.map((item, index) => {
              const head = item.group !== lastGroup ? item.group : null;
              lastGroup = item.group;
              return (
                <div key={`${item.group}-${item.label}-${index}`} role="presentation">
                  {head ? (
                    <div className="cx-p-group cx-eyebrow" role="presentation">
                      {head}
                    </div>
                  ) : null}
                  <button
                    id={`${listId}-${index}`}
                    type="button"
                    role="option"
                    className="cx-p-item"
                    aria-selected={index === current}
                    onMouseEnter={() => setActive(index)}
                    onClick={item.go}
                  >
                    <ConsoleIcon name={item.icon} />
                    <span>{item.label}</span>
                    {item.meta ? <small className="mono">{item.meta}</small> : null}
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div className="cx-p-foot">
          <span>{m.cx_p_help_nav()}</span>
          <span>{m.cx_p_help_key()}</span>
        </div>
      </div>
    </>
  );
}
