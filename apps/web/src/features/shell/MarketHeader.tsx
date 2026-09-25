import { Icon } from '@kya-em/ui';
import { Link } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { LanguageLinks, LanguageMenu } from '@/features/i18n/LanguageMenu';
import { SOFTWARE } from '@/features/marketplace/software';
import { m } from '@/paraglide/messages.js';

/** En-tête de la marketplace : `[Logo] KYA-EnergyMarket  Logiciels ▾  Aide  FR ▾  Se connecter`. */
export function MarketHeader() {
  const [open, setOpen] = useState(false);
  const [stuck, setStuck] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

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
    <header ref={headerRef} className={stuck ? 'mk is-stuck' : 'mk'}>
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
              {SOFTWARE.map((software) => (
                <Link
                  key={software.id}
                  className="dd-item"
                  to="/"
                  hash="logiciels"
                  activeOptions={{ includeHash: true }}
                  onClick={() => setOpen(false)}
                >
                  {software.logo ? (
                    <img src={software.logo} alt="" width="34" height="28" />
                  ) : (
                    <span className="ph">{software.mono}</span>
                  )}
                  <b>{software.name}</b>
                  <small>{software.kind()}</small>
                  <span className={software.available ? 'state state-ok' : 'state state-soon'}>
                    {software.available ? m.state_available() : m.state_soon()}
                  </span>
                </Link>
              ))}
              <div className="dd-foot">
                <Link
                  className="link-arrow"
                  to="/"
                  hash="logiciels"
                  activeOptions={{ includeHash: true }}
                  onClick={() => setOpen(false)}
                >
                  {m.nav_all_software()} <Icon name="right" size={12} />
                </Link>
              </div>
            </div>
          </details>
          <Link
            className="mk-link"
            to="/"
            hash="questions"
            activeOptions={{ includeHash: true }}
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
          <Link to="/connexion" className="mk-link">
            {m.nav_sign_in()}
          </Link>
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
