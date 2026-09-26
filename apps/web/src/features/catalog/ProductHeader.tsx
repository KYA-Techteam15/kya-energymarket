import { Icon } from '@kya-em/ui';
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { m } from '@/paraglide/messages.js';

interface Props {
  readonly slug: string;
  readonly name: string;
  readonly logo: string | null;
  readonly monogram: string | null;
}

/** En-tête d'un logiciel (spec 004, design/v5) : quatre onglets, « Essayer » et « Acheter ». */
export function ProductHeader({ slug, name, logo, monogram }: Props) {
  const [open, setOpen] = useState(false);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const tab = (page: string | null, label: string) =>
    page ? (
      <Link
        to="/logiciels/$slug/$page"
        params={{ slug, page }}
        activeOptions={{ includeSearch: false }}
        activeProps={{ 'aria-current': 'page' }}
        onClick={() => setOpen(false)}
      >
        {label}
      </Link>
    ) : (
      <Link
        to="/logiciels/$slug"
        params={{ slug }}
        activeOptions={{ exact: true, includeSearch: false }}
        activeProps={{ 'aria-current': 'page' }}
        onClick={() => setOpen(false)}
      >
        {label}
      </Link>
    );
  return (
    <header className={stuck ? 'sw is-stuck' : 'sw'}>
      <div className="wrap sw-row">
        <Link to="/logiciels/$slug" params={{ slug }} className="sw-id">
          {logo ? <img src={logo} alt="" width="34" height="28" /> : <span className="ph">{monogram}</span>}
          {name}
        </Link>
        <nav id="sw-nav" className={open ? 'sw-nav is-open' : 'sw-nav'} aria-label={name}>
          {tab(null, m.product_tab_presentation())}
          {tab('tarifs', m.product_tab_pricing())}
          {tab('ressources', m.product_tab_resources())}
          {tab('support', m.product_tab_support())}
        </nav>
        <div className="sw-end">
          <Link to="/$page" params={{ page: 'essai' }} className="btn btn-primary btn-sm">
            {m.product_try()}
          </Link>
          <Link
            to="/logiciels/$slug/$page"
            params={{ slug, page: 'tarifs' }}
            hash="acheter"
            className="btn btn-buy btn-sm"
          >
            {m.product_buy()}
          </Link>
          <button
            type="button"
            className="menu-btn"
            aria-expanded={open}
            aria-controls="sw-nav"
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
