import { Link, Outlet } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { m } from '@/paraglide/messages.js';
import type { getConsoleContext } from './console';
import { CommandPalette } from './CommandPalette';
import { ConsoleIcon, ConsoleShellContext, type ConsoleIconName } from './ui';

type Context = NonNullable<Awaited<ReturnType<typeof getConsoleContext>>>;

interface NavItem {
  readonly to: string;
  readonly label: string;
  readonly icon: ConsoleIconName;
  readonly exact?: boolean;
  readonly soon?: boolean;
}

/** Coquille de la console (spec 005b, FR-010) : menu par domaine filtré selon le rôle, Ctrl K. */
export function ConsoleLayout({ context }: { context: Context }) {
  const [palette, setPalette] = useState(false);
  const [menu, setMenu] = useState(false);
  const { can } = context;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPalette((open) => !open);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const groups = useMemo(() => {
    const list: { title: string | null; items: NavItem[] }[] = [
      { title: null, items: [{ to: '/admin', label: m.cx_nav_dashboard(), icon: 'home', exact: true }] },
    ];
    if (can.licenses.read) {
      list.push({
        title: m.cx_nav_sales(),
        items: [
          { to: '/admin/licences', label: m.cx_nav_licenses(), icon: 'key' },
          { to: '/admin/lots', label: m.cx_nav_batches(), icon: 'stack' },
          { to: '/admin', label: m.cx_nav_orders(), icon: 'cart', soon: true },
        ],
      });
    }
    if (can.catalog.read) {
      list.push({
        title: m.cx_nav_catalog(),
        items: [{ to: '/admin/catalogue', label: m.cx_nav_products(), icon: 'box' }],
      });
    }
    if (can.content.read) {
      list.push({
        title: m.cx_nav_content(),
        items: [
          { to: '/admin/pages', label: m.cx_nav_pages(), icon: 'page' },
          { to: '/admin/medias', label: m.cx_nav_media(), icon: 'image' },
        ],
      });
    }
    list.push({
      title: m.cx_nav_system(),
      items: [
        { to: '/admin/equipe', label: m.cx_nav_team(), icon: 'team' },
        { to: '/admin/mcp', label: m.cx_nav_mcp(), icon: 'bot' },
        { to: '/admin/journal', label: m.cx_nav_journal(), icon: 'log' },
      ],
    });
    return list;
  }, [can]);

  const openPalette = useCallback(() => setPalette(true), []);
  const toggleMenu = useCallback(() => setMenu((open) => !open), []);
  const shell = useMemo(
    () => ({ openPalette, toggleMenu, environment: context.environment }),
    [openPalette, toggleMenu, context.environment],
  );
  const initials =
    context.name
      .split(/\s+/u)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';

  return (
    <ConsoleShellContext.Provider value={shell}>
      <div className="cx">
        <aside
          className="cx-side"
          data-open={menu}
          aria-label={m.cx_nav_label()}
          // Un lien suivi referme le menu mobile.
          onClickCapture={(event) => {
            if ((event.target as HTMLElement).closest('a')) setMenu(false);
          }}
        >
          <Link to="/admin" className="cx-brand">
            <img src="/images/kya-mark.png" alt="" width={30} height={30} />
            <span>
              <b>{m.cx_brand()}</b>
              <small>KYA-EnergyMarket</small>
            </span>
          </Link>
          <button className="cx-side-search" type="button" onClick={openPalette}>
            {m.cx_search_act()} <kbd>Ctrl K</kbd>
          </button>
          <nav aria-label={m.cx_nav_label()} style={{ display: 'contents' }}>
            {groups.map((group) => (
              <div key={group.title ?? 'accueil'} style={{ display: 'contents' }}>
                {group.title ? <div className="cx-nav-group">{group.title}</div> : null}
                {group.items.map((item) =>
                  item.soon ? (
                    <span
                      key={item.label}
                      className="cx-nav-item"
                      aria-disabled="true"
                      style={{ opacity: 0.55, cursor: 'default' }}
                    >
                      <ConsoleIcon name={item.icon} />
                      <span>{item.label}</span>
                      <span className="cx-count">{m.cx_soon()}</span>
                    </span>
                  ) : (
                    <Link
                      key={item.to}
                      to={item.to as never}
                      className="cx-nav-item"
                      activeOptions={{ exact: item.exact ?? false }}
                      activeProps={{ 'aria-current': 'page' }}
                    >
                      <ConsoleIcon name={item.icon} />
                      <span>{item.label}</span>
                    </Link>
                  ),
                )}
              </div>
            ))}
          </nav>
          <div className="cx-side-foot">
            <Link to="/espace" className="cx-nav-item">
              <ConsoleIcon name="swap" />
              <span>{m.cx_to_customer_space()}</span>
            </Link>
            <div className="cx-me">
              <span className="cx-avatar" aria-hidden="true">
                {initials}
              </span>
              <span style={{ minWidth: 0 }}>
                <b>{context.name}</b>
                <small>{context.email}</small>
              </span>
            </div>
          </div>
        </aside>
        <div className="cx-main">
          <Outlet />
        </div>
      </div>
      {palette ? <CommandPalette can={can} onClose={() => setPalette(false)} /> : null}
    </ConsoleShellContext.Provider>
  );
}
