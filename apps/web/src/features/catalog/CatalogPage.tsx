import { Link } from '@tanstack/react-router';
import { m } from '@/paraglide/messages.js';
import type { CatalogSummary } from './server';

/** Logiciels de la marketplace, depuis le catalogue (spec 004, design/v5/logiciels.html). */
export function CatalogPage({ products }: { products: CatalogSummary }) {
  return (
    <>
      <header className="wrap page-head">
        <h1>{m.catalog_title()}.</h1>
        <p>{m.catalog_intro()}</p>
      </header>
      <section className="wrap" style={{ paddingBottom: 110 }} aria-label={m.catalog_title()}>
        <div className="soft-list">
          {products.map((product) => {
            const available = product.status === 'available';
            return (
              <article key={product.slug} className={available ? 'soft-item' : 'soft-item is-soon'} id={product.slug}>
                <span className="logo">
                  {product.logo ? <img src={product.logo} alt="" width="40" height="33" /> : <b>{product.monogram}</b>}
                </span>
                <div>
                  <h2 className="h3">{product.name}</h2>
                  <p className="kind">{product.kind}</p>
                </div>
                <p>{product.summary}</p>
                <div className="act">
                  <span className={available ? 'state state-ok' : 'state state-soon'}>
                    {available ? m.state_available() : m.state_soon()}
                  </span>
                  {available ? (
                    <Link to="/logiciels/$slug" params={{ slug: product.slug }} className="btn btn-primary btn-sm">
                      {m.catalog_discover()}
                      <span className="sr"> {product.name}</span>
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
