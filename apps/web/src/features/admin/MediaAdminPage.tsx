import { useRouter } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { m } from '@/paraglide/messages.js';
import { uploadMediaFn, updateMediaFn, type getMediaAdmin } from './content';

type MediaAdmin = NonNullable<Awaited<ReturnType<typeof getMediaAdmin>>>;

const errorOf = (code: string) =>
  ({
    TOO_LARGE: m.admin_media_too_large(),
    UNSUPPORTED_TYPE: m.admin_media_unsupported(),
    NOT_AN_IMAGE: m.admin_media_unsupported(),
    FORBIDDEN: m.admin_only(),
  })[code] ?? m.admin_editor_invalid();

/** Médiathèque (spec 004, histoire 4) : téléverser une image, régler ses textes alternatifs. */
export function MediaAdminPage({ admin }: { admin: MediaAdmin }) {
  const router = useRouter();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    const result = await uploadMediaFn({ data: new FormData(form) });
    setBusy(false);
    if (result.ok) {
      setNotice({ ok: true, text: m.admin_media_done() });
      form.reset();
      await router.invalidate();
    } else setNotice({ ok: false, text: errorOf(result.code) });
  };

  const saveTexts = async (event: FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const en = String(data.get('en') ?? '').trim();
    const result = await updateMediaFn({
      data: { id, values: { alt: { fr: String(data.get('fr') ?? ''), ...(en ? { en } : {}) } } },
    });
    setNotice(result.ok ? { ok: true, text: m.admin_media_saved() } : { ok: false, text: errorOf(result.code) });
    if (result.ok) await router.invalidate();
  };

  return (
    <>
      <header className="acct-head">
        <div>
          <h1>{m.admin_media()}.</h1>
          <p>{m.admin_media_intro()}</p>
        </div>
      </header>
      {notice ? (
        <p className={notice.ok ? 'form-ok' : 'form-error'} role="status" style={{ marginBottom: 16 }}>
          {notice.text}
        </p>
      ) : null}
      {admin.canWrite ? (
        <section className="box" aria-labelledby="t-upload">
          <div className="box-head">
            <h2 id="t-upload">{m.admin_media_upload()}</h2>
          </div>
          <form className="box-body fields" onSubmit={(event) => void upload(event)}>
            <label className="field">
              <span className="field-label">{m.admin_media_file()}</span>
              <input
                className="input"
                type="file"
                name="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                required
              />
              <small className="field-help">{m.admin_media_file_help()}</small>
            </label>
            <div className="field-pair">
              <label className="field">
                <span className="field-label">{m.admin_media_alt_fr()}</span>
                <input className="input" name="altFr" required maxLength={300} />
              </label>
              <label className="field">
                <span className="field-label">{m.admin_media_alt_en()}</span>
                <input className="input" name="altEn" maxLength={300} />
              </label>
            </div>
            <div className="field-pair">
              <label className="field">
                <span className="field-label">{m.admin_media_credit_fr()}</span>
                <input className="input" name="creditFr" maxLength={300} placeholder="Photo d’illustration" />
              </label>
              <label className="field">
                <span className="field-label">{m.admin_media_credit_en()}</span>
                <input className="input" name="creditEn" maxLength={300} placeholder="Illustration photo" />
              </label>
            </div>
            <div>
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? m.busy() : m.admin_media_send()}
              </button>
            </div>
          </form>
        </section>
      ) : null}
      <section className="media-grid" aria-label={m.admin_media()}>
        {admin.media.map((item) => (
          <article key={item.id} className="media-card">
            <img src={item.src} alt="" loading="lazy" />
            <div className="media-meta">
              <code>{item.ref}</code>
              <small className="muted">{item.width && item.height ? `${item.width} × ${item.height}` : ''}</small>
            </div>
            <form className="fields" onSubmit={(event) => void saveTexts(event, item.id)}>
              <label className="field">
                <span className="field-label">{m.admin_media_alt_fr()}</span>
                <input
                  className="input"
                  name="fr"
                  defaultValue={item.alt.fr}
                  required
                  maxLength={300}
                  disabled={!admin.canWrite}
                />
              </label>
              <label className="field">
                <span className="field-label">{m.admin_media_alt_en()}</span>
                <input
                  className="input"
                  name="en"
                  defaultValue={item.alt.en ?? ''}
                  maxLength={300}
                  disabled={!admin.canWrite}
                />
              </label>
              {admin.canWrite ? (
                <button className="btn btn-line btn-sm" type="submit">
                  {m.admin_media_save()}
                </button>
              ) : null}
            </form>
          </article>
        ))}
      </section>
    </>
  );
}
