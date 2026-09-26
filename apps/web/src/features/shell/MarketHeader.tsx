import { Icon } from '@kya-em/ui';
import { Link, useLoaderData, useMatches } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { LanguageLinks, LanguageMenu } from '@/features/i18n/LanguageMenu';
import { useCatalog } from '@/features/marketplace/software';
import { m } from '@/paraglide/messages.js';
import { MeMenu } from './MeMenu';

/** En-tête de la marketplace : `[Logo] KYA-EnergyMarket  Logiciels ▾  Aide  FR ▾  Se connecter`. */
export function MarketHeader() {
  const [open, setOpen] = useState(false);
  const [stuck, setStuck] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const { viewer } = useLoaderData({ from: '__root__' });
  const catalog = useCatalog();
  // Sous l'en-tête d'un logiciel, celui de la marketplace se fait compact (design/v5).
  const compact = useMatches({ select: (matches) => matches.some((match) => match.routeId === '/logiciels/$slug') });

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Un seul menu déroulant ouvert à la fois ; un clic ailleurs ou Échap les ferme.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const closeOthers = (keep?: EventTarget | null) =>
      header.querySelectorAll('details[open]').forEach((details) => {
        if (details !== keep) details.removeAttribute('open');
      });
    const onToggle = (event: Event) => {
      const target = event.target as HTMLDetailsElement;
      if (target.open) closeOthers(target);
    };
    const onPointer = (event: PointerEvent) => {
      if (!header.contains(event.target as Node)) closeOthers();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeOthers();
        setOpen(false);
      }
    };
    header.addEventListener('toggle', onToggle, true);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      header.removeEventListener('toggle', onToggle, true);
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <header
      ref={headerRef}
      className={['mk', compact ? 'is-compact' : '', stuck && !compact ? 'is-stuck' : ''].join(' ').trim()}
    >
      <div className="wrap mk-row">
        <Link to="/" className="mk-brand">
          <img src="/images/kya-mark.png" alt="" width="34" height="29" />
          KYA-EnergyMarket
        </Link>
        <nav id="mk-nav" className={open ? 'mk-nav is-open' : 'mk-nav'} aria-label={m.nav_label()}>
          <details className="dd">
            <summary className="mk-link">
              {m.nav_software()} <Icon name="down" size={12} />
            </summary>
            <div className="dd-panel">
              {catalog.map((software) => {
                const available = software.status === 'available';
                const content = (
                  <>
                    {software.logo ? (
                      <img src={software.logo} alt="" width="34" height="28" />
                    ) : (
                      <span className="ph">{software.monogram}</span>
                    )}
                    <b>{software.name}</b>
                    <small>{software.kind}</small>
                    <span className={available ? 'state state-ok' : 'state state-soon'}>
                      {available ? m.state_available() : m.state_soon()}
                    </span>
                  </>
                );
                return available ? (
                  <Link
                    key={software.slug}
                    className="dd-item"
                    to="/logiciels/$slug"
                    params={{ slug: software.slug }}
                    onClick={() => setOpen(false)}
                  >
                    {content}
                  </Link>
                ) : (
                  <Link
                    key={software.slug}
                    className="dd-item"
                    to="/logiciels"
                    hash={software.slug}
                    onClick={() => setOpen(false)}
                  >
                    {content}
                  </Link>
                );
              })}
              <div className="dd-foot">
                <Link className="link-arrow" to="/logiciels" onClick={() => setOpen(false)}>
                  {m.nav_all_software()} <Icon name="right" size={12} />
                </Link>
              </div>
            </div>
          </details>
          <Link
            className="mk-link"
            to="/$page"
            params={{ page: 'aide' }}
            activeProps={{ 'aria-current': 'page' }}
            onClick={() => setOpen(false)}
          >
            {m.nav_help()}
          </Link>
          <div className="nav-lang">
            <Icon name="globe" />
            <LanguageLinks className="mk-link" />
          </div>
        </nav>
        <div className="mk-end">
          <LanguageMenu />
          {viewer ? (
            <MeMenu viewer={viewer} />
          ) : (
            <Link to="/connexion" className="mk-link">
              {m.nav_sign_in()}
            </Link>
          )}
          <button
            type="button"
            className="menu-btn"
            aria-expanded={open}
            aria-controls="mk-nav"
            aria-label={m.nav_menu()}
            onClick={() => setOpen((value) => !value)}
          >
            <Icon name={open ? 'close' : 'menu'} size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
