import { Icon } from '@kya-em/ui';
import { useRouterState } from '@tanstack/react-router';
import { m } from '@/paraglide/messages.js';
import { getLocale, localizeHref, locales, setLocale } from '@/paraglide/runtime.js';

const LABELS: Record<string, () => string> = { fr: m.lang_fr, en: m.lang_en };

/**
 * Choix de la langue. Chaque entrée est un vrai lien vers l'adresse traduite (fonctionne sans
 * JavaScript) ; avec JavaScript, le choix est aussi mémorisé dans un cookie (spec 001, FR-008).
 */
export function LanguageLinks({ className, asListItems = false }: { className: string; asListItems?: boolean }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const current = getLocale();
  return (
    <>
      {locales.map((locale) => {
        const link = (
          <a
            key={locale}
            className={className || undefined}
            href={localizeHref(pathname, { locale })}
            hrefLang={locale}
            lang={locale}
            aria-current={locale === current ? 'true' : undefined}
            onClick={(event) => {
              event.preventDefault();
              void setLocale(locale);
            }}
          >
            {LABELS[locale]?.() ?? locale}
          </a>
        );
        return asListItems ? <li key={locale}>{link}</li> : link;
      })}
    </>
  );
}

export function LanguageMenu() {
  return (
    <details className="dd lang-menu">
      <summary className="mk-link" aria-label={m.nav_language()}>
        {getLocale().toUpperCase()} <Icon name="down" size={12} />
      </summary>
      <div className="dd-panel right">
        <LanguageLinks className="dd-lang" />
      </div>
    </details>
  );
}
