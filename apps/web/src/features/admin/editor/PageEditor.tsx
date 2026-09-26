import type { BlockDefinition } from '@kya-em/domain';
import { Link, useRouter } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { m } from '@/paraglide/messages.js';
import { getLocale, localizeHref } from '@/paraglide/runtime.js';
import { publishFn, restoreFn, saveDraftFn, type getPageEditor } from '../content';
import { clean, emptyRecord, FieldsEditor, type MediaOption } from './FieldEditor';

type Editor = NonNullable<Awaited<ReturnType<typeof getPageEditor>>>;
interface DraftBlock {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

const label = (value: { fr: string; en: string }) => (getLocale() === 'en' ? value.en : value.fr);
const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `b${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

/** Adresse publique d'une page (aperçu du brouillon avec `?apercu=1`). */
export function publicPath(page: { productSlug: string | null; key: string }) {
  if (!page.productSlug) return `/${page.key}`;
  return page.key === 'presentation' ? `/logiciels/${page.productSlug}` : `/logiciels/${page.productSlug}/${page.key}`;
}

/** Éditeur d'une page composée dans une langue (spec 004, histoire 3). */
export function PageEditor({ editor }: { editor: Editor }) {
  const router = useRouter();
  const source = editor.draft ?? editor.published;
  const [title, setTitle] = useState(source?.title ?? '');
  const [description, setDescription] = useState(source?.description ?? '');
  const [blocks, setBlocks] = useState<DraftBlock[]>(() =>
    (source?.blocks ?? []).map((block) => ({ id: block.id, type: block.type, data: block.data })),
  );
  const [adding, setAdding] = useState(editor.definitions[0]?.type ?? '');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [issues, setIssues] = useState<{ path: string; message: string }[]>([]);

  // Après un enregistrement, une publication ou une restauration, le formulaire repart de la version enregistrée.
  const sourceKey = `${editor.page.id}-${editor.locale}-${source?.version ?? 0}-${source?.updatedAt ?? ''}`;
  const [syncedKey, setSyncedKey] = useState(sourceKey);
  if (syncedKey !== sourceKey) {
    setSyncedKey(sourceKey);
    setTitle(source?.title ?? '');
    setDescription(source?.description ?? '');
    setBlocks((source?.blocks ?? []).map((block) => ({ id: block.id, type: block.type, data: block.data })));
    setDirty(false);
  }

  const definitions = useMemo(
    () => new Map(editor.definitions.map((definition) => [definition.type, definition as BlockDefinition])),
    [editor.definitions],
  );
  const media: MediaOption[] = editor.media.map((item) => ({
    ref: item.ref,
    src: item.src,
    label: `${item.alt.fr.slice(0, 60)} (${item.ref.startsWith('media:') ? m.admin_media_uploaded() : item.ref})`,
  }));

  const change = (next: DraftBlock[]) => {
    setBlocks(next);
    setDirty(true);
  };
  const move = (index: number, step: number) => {
    const next = [...blocks];
    const [block] = next.splice(index, 1);
    next.splice(index + step, 0, block!);
    change(next);
  };

  const payload = () =>
    blocks.map((block) => {
      const definition = definitions.get(block.type);
      return { ...block, data: definition ? clean(definition.fields, block.data) : block.data };
    });

  const run = async (
    action: () => Promise<{ ok: boolean; code?: string; issues?: { path: string; message: string }[] }>,
    ok: string,
  ) => {
    setBusy(true);
    setNotice(null);
    setIssues([]);
    const result = await action();
    setBusy(false);
    if (result.ok) {
      // Données rafraîchies d'abord : le bouton Publier connaît alors le nouveau numéro de brouillon.
      await router.invalidate();
      setDirty(false);
      setNotice(ok);
    } else {
      setNotice(
        result.code === 'FORBIDDEN'
          ? m.admin_only()
          : result.code === 'STALE_DRAFT'
            ? m.admin_editor_stale()
            : m.admin_editor_invalid(),
      );
      setIssues(result.issues ?? []);
    }
  };

  const save = () =>
    run(
      () =>
        saveDraftFn({ data: { pageId: editor.page.id, locale: editor.locale, title, description, blocks: payload() } }),
      m.admin_editor_saved(),
    );
  const publish = () =>
    run(
      () =>
        publishFn({
          data: { pageId: editor.page.id, locale: editor.locale, expectedVersion: editor.draft?.version ?? 0 },
        }),
      m.admin_editor_published(),
    );
  const restore = (version: number) =>
    run(
      () => restoreFn({ data: { pageId: editor.page.id, locale: editor.locale, version } }),
      m.admin_editor_restored(),
    );

  const path = publicPath(editor.page);
  const otherLocale = editor.locale === 'fr' ? 'en' : 'fr';
  const issueOf = (index: number) => issues.filter((issue) => issue.path.startsWith(`blocks.${index}.`));

  return (
    <>
      <header className="acct-head">
        <div>
          <p className="mono-label">
            {editor.page.productName ?? m.admin_pages_marketplace()} · {editor.page.key} · {editor.locale.toUpperCase()}
          </p>
          <h1>{title || editor.page.key}</h1>
          <p>
            {editor.draft
              ? m.admin_editor_state_draft({ version: editor.draft.version })
              : editor.published
                ? m.admin_editor_state_published({ version: editor.published.version })
                : m.admin_editor_state_empty()}
          </p>
        </div>
        <div className="editor-actions">
          <Link
            className="btn btn-line btn-sm"
            to="/admin/pages/$id"
            params={{ id: editor.page.id }}
            search={{ langue: otherLocale }}
          >
            {otherLocale === 'en' ? m.admin_editor_edit_en() : m.admin_editor_edit_fr()}
          </Link>
          <a
            className="btn btn-line btn-sm"
            href={`${localizeHref(path, { locale: editor.locale })}?apercu=1`}
            target="_blank"
            rel="noopener"
          >
            {m.admin_editor_preview()}
          </a>
        </div>
      </header>

      {notice ? (
        <p
          className={issues.length || notice === m.admin_only() ? 'form-error' : 'form-ok'}
          role="status"
          style={{ marginBottom: 16 }}
        >
          {notice}
        </p>
      ) : null}

      <section className="box" aria-labelledby="t-meta">
        <div className="box-head">
          <h2 id="t-meta">{m.admin_editor_meta()}</h2>
        </div>
        <div className="box-body fields">
          <label className="field">
            <span className="field-label">{m.admin_editor_title()}</span>
            <input
              className="input"
              value={title}
              maxLength={140}
              onChange={(event) => {
                setTitle(event.currentTarget.value);
                setDirty(true);
              }}
            />
          </label>
          <label className="field">
            <span className="field-label">{m.admin_editor_description()}</span>
            <textarea
              className="input textarea"
              rows={2}
              maxLength={300}
              value={description}
              onChange={(event) => {
                setDescription(event.currentTarget.value);
                setDirty(true);
              }}
            />
          </label>
        </div>
      </section>

      <ol className="block-list">
        {blocks.map((block, index) => {
          const definition = definitions.get(block.type);
          const errors = issueOf(index);
          return (
            <li key={block.id} className={errors.length ? 'block-card has-error' : 'block-card'}>
              <div className="list-actions">
                <button
                  type="button"
                  className="btn btn-line btn-xs"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  {m.admin_editor_up()}
                </button>
                <button
                  type="button"
                  className="btn btn-line btn-xs"
                  disabled={index === blocks.length - 1}
                  onClick={() => move(index, 1)}
                >
                  {m.admin_editor_down()}
                </button>
                <button
                  type="button"
                  className="btn btn-line btn-xs"
                  onClick={() => change(blocks.filter((_, position) => position !== index))}
                >
                  {m.admin_editor_remove()}
                </button>
              </div>
              <details open={errors.length > 0}>
                <summary>
                  <span className="n">{String(index + 1).padStart(2, '0')}</span>
                  <b>{definition ? label(definition.label) : block.type}</b>
                  <small>{definition ? label(definition.description) : m.admin_editor_unknown_type()}</small>
                </summary>
                {errors.length ? (
                  <ul className="form-error" role="alert">
                    {errors.map((error) => (
                      <li key={error.path}>
                        <code>{error.path.replace(`blocks.${index}.data.`, '')}</code> : {error.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {definition ? (
                  <FieldsEditor
                    fields={definition.fields}
                    data={block.data}
                    media={media}
                    onChange={(data) =>
                      change(blocks.map((item, position) => (position === index ? { ...item, data } : item)))
                    }
                  />
                ) : null}
              </details>
            </li>
          );
        })}
      </ol>

      {editor.canWrite ? (
        <div className="editor-add">
          <label className="field" style={{ flex: 1 }}>
            <span className="field-label">{m.admin_editor_add_block()}</span>
            <select className="input" value={adding} onChange={(event) => setAdding(event.currentTarget.value)}>
              {editor.definitions.map((definition) => (
                <option key={definition.type} value={definition.type}>
                  {label(definition.label)} — {label(definition.description)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn-line"
            onClick={() => {
              const definition = definitions.get(adding);
              if (definition) change([...blocks, { id: newId(), type: adding, data: emptyRecord(definition.fields) }]);
            }}
          >
            {m.admin_editor_add()}
          </button>
        </div>
      ) : null}

      <div className="editor-bar">
        <span>{dirty ? m.admin_editor_unsaved() : ' '}</span>
        {editor.canWrite ? (
          <button type="button" className="btn btn-line" disabled={busy} onClick={() => void save()}>
            {m.admin_editor_save()}
          </button>
        ) : null}
        {editor.canPublish ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || dirty || !editor.draft}
            title={dirty ? m.admin_editor_save_first() : undefined}
            onClick={() => void publish()}
          >
            {m.admin_editor_publish()}
          </button>
        ) : null}
      </div>

      <section className="box" aria-labelledby="t-history" style={{ marginTop: 28 }}>
        <div className="box-head">
          <h2 id="t-history">{m.admin_editor_history()}</h2>
        </div>
        <div className="box-body">
          <table className="tbl">
            <tbody>
              {editor.history.map((row) => (
                <tr key={row.version}>
                  <td className="num">v{row.version}</td>
                  <td>
                    <span className={row.status === 'published' ? 'chip chip-staff' : 'chip'}>
                      {row.status === 'draft'
                        ? m.admin_status_draft()
                        : row.status === 'published'
                          ? m.admin_status_published()
                          : m.admin_status_archived()}
                    </span>
                  </td>
                  <td>{row.title}</td>
                  <td className="muted">{(row.publishedAt ?? row.updatedAt).slice(0, 10)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {row.status !== 'draft' && editor.canWrite ? (
                      <button
                        type="button"
                        className="btn btn-line btn-sm"
                        disabled={busy}
                        onClick={() => void restore(row.version)}
                      >
                        {m.admin_editor_restore()}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
