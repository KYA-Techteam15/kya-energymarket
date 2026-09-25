import { Link } from '@tanstack/react-router';
import { m } from '@/paraglide/messages.js';

export function NotFoundPage() {
  return (
    <section className="wrap page-head">
      <h1>{m.not_found_title()}</h1>
      <p>{m.not_found_text()}</p>
      <p>
        <Link className="btn btn-deep" to="/">
          {m.back_home()}
        </Link>
      </p>
    </section>
  );
}
