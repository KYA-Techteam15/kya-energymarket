import { Link } from '@tanstack/react-router';
import { LanguageLinks } from '@/features/i18n/LanguageMenu';
import { SOFTWARE } from '@/features/marketplace/software';
import { m } from '@/paraglide/messages.js';

export function Footer() {
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
            {SOFTWARE.map((software) => (
              <li key={software.id}>
                <Link to="/" hash="logiciels">
                  {software.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>{m.foot_help()}</h2>
          <ul>
            <li>
              <Link to="/" hash="questions">
                {m.foot_faq()}
              </Link>
            </li>
            <li>
              <Link to="/" hash="comment">
                {m.foot_how()}
              </Link>
            </li>
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
