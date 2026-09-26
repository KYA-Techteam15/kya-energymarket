import { Link } from '@tanstack/react-router';
import { LanguageLinks } from '@/features/i18n/LanguageMenu';
import { useCatalog } from '@/features/marketplace/software';
import { m } from '@/paraglide/messages.js';

export function Footer() {
  const catalog = useCatalog();
  const page = (key: string, label: string) => (
    <li>
      <Link to="/$page" params={{ page: key }}>
        {label}
      </Link>
    </li>
  );
  return (
    <footer className="foot">
      <div className="wrap foot-top">
        <div className="foot-brand">
          <img src="/images/kya-energy-group-logo.png" alt="KYA-Energy Group" width="72" height="72" loading="lazy" />
          <p>{m.foot_tagline()}</p>
        </div>
        <div>
          <h2>{m.foot_software()}</h2>
          <ul>
            {catalog.map((software) => (
              <li key={software.slug}>
                {software.status === 'available' ? (
                  <Link to="/logiciels/$slug" params={{ slug: software.slug }}>
                    {software.name}
                  </Link>
                ) : (
                  <Link to="/logiciels" hash={software.slug}>
                    {software.name}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>{m.foot_help()}</h2>
          <ul>
            {page('aide', m.foot_faq())}
            {page('contact', m.foot_contact())}
            {page('a-propos', m.foot_about())}
          </ul>
        </div>
        <div>
          <h2>{m.foot_legal()}</h2>
          <ul>
            {page('cgv', m.foot_terms())}
            {page('confidentialite', m.foot_privacy())}
            {page('mentions-legales', m.foot_notice())}
          </ul>
        </div>
        <div>
          <h2>{m.foot_language()}</h2>
          <ul className="foot-langs">
            <LanguageLinks className="" asListItems />
          </ul>
        </div>
      </div>
      <div className="wrap foot-bottom">
        <span>{m.foot_rights()}</span>
        <span>{m.foot_mockup_note()}</span>
      </div>
    </footer>
  );
}
