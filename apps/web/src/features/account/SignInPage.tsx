import { Link } from '@tanstack/react-router';
import { m } from '@/paraglide/messages.js';

/** Page provisoire : les comptes arrivent avec la spécification 002. */
export function SignInPage() {
  return (
    <section className="wrap page-head">
      <h1>{m.sign_in_title()}</h1>
      <p>{m.sign_in_text()}</p>
      <p>
        <Link className="btn btn-deep" to="/">
          {m.back_home()}
        </Link>
      </p>
    </section>
  );
}
