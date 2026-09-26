import type { CatalogEdition } from '@kya-em/domain';
import { useRouter } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { m } from '@/paraglide/messages.js';
import { updateEdition, updateFeature, updatePlan, updateProduct, type getProductAdmin } from './content';

type ProductAdmin = NonNullable<Awaited<ReturnType<typeof getProductAdmin>>>;
type Result = { ok: boolean; code?: string; issues?: { path: string; message: string }[] };

const DURATIONS: Record<string, string> = {
  P1D: '1 j',
  P1W: '1 sem.',
  P1M: '1 mois',
  P3M: '3 mois',
  P6M: '6 mois',
  P1Y: '1 an',
};
const str = (data: FormData, name: string) => String(data.get(name) ?? '').trim();
const localized = (data: FormData, name: string) => {
  const fr = str(data, `${name}Fr`);
  const en = str(data, `${name}En`);
  return fr ? { fr, ...(en ? { en } : {}) } : undefined;
};
const intOrNull = (data: FormData, name: string) => (str(data, name) === '' ? null : Number(str(data, name)));

function Localized({
  name,
  label,
  value,
  disabled,
}: {
  name: string;
  label: string;
  value?: { fr: string; en?: string } | null;
  disabled: boolean;
}) {
  return (
    <div className="field-pair">
      <label className="field">
        <span className="field-label">{label} · FR</span>
        <input
          className="input"
          name={`${name}Fr`}
          defaultValue={value?.fr ?? ''}
          disabled={disabled}
          maxLength={400}
        />
      </label>
      <label className="field">
        <span className="field-label">{label} · EN</span>
        <input
          className="input"
          name={`${name}En`}
          defaultValue={value?.en ?? ''}
          disabled={disabled}
          maxLength={400}
        />
      </label>
    </div>
  );
}

/** Un logiciel : fiche, fonctions, éditions et durées (spec 004, histoire 2). */
export function ProductAdminPage({ admin }: { admin: ProductAdmin }) {
  const router = useRouter();
  const { product, canWrite } = admin;
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const disabled = !canWrite;

  const handle = async (promise: Promise<Result>) => {
    const result = await promise;
    if (result.ok) {
      await router.invalidate();
      setNotice({ ok: true, text: m.admin_catalog_saved() });
    } else {
      const detail = result.issues?.map((issue) => `${issue.path} : ${issue.message}`).join(' ; ');
      setNotice({
        ok: false,
        text:
          result.code === 'FORBIDDEN' ? m.admin_only() : `${m.admin_editor_invalid()} ${detail ?? result.code ?? ''}`,
      });
    }
  };

  const onProduct = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void handle(
      updateProduct({
        data: {
          slug: product.slug,
          values: {
            name: str(data, 'name'),
            status: str(data, 'status'),
            kind: localized(data, 'kind'),
            summary: localized(data, 'summary'),
            logo: str(data, 'logo') || null,
            monogram: str(data, 'monogram') || null,
          },
        },
      }),
    );
  };

  const onFeature = (event: FormEvent<HTMLFormElement>, key?: string) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void handle(
      updateFeature({
        data: { slug: product.slug, key: key ?? str(data, 'key'), values: { label: localized(data, 'label') } },
      }),
    );
    if (!key) event.currentTarget.reset();
  };

  const onEdition = (event: FormEvent<HTMLFormElement>, edition: CatalogEdition) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void handle(
      updateEdition({
        data: {
          slug: product.slug,
          code: edition.code,
          values: {
            name: localized(data, 'name'),
            audience: localized(data, 'audience'),
            watermark: localized(data, 'watermark') ?? null,
            graceDays: Number(str(data, 'graceDays') || 0),
            maxSeats: intOrNull(data, 'maxSeats'),
            maxProjects: intOrNull(data, 'maxProjects'),
            active: data.get('active') === 'on',
            features: data.getAll('features').map(String),
          },
        },
      }),
    );
  };

  const onPlan = (event: FormEvent<HTMLFormElement>, code: string, duration?: string) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void handle(
      updatePlan({
        data: {
          slug: product.slug,
          code,
          duration: duration ?? str(data, 'duration'),
          values: {
            pricePerSeat: Number(str(data, 'price')),
            indicative: data.get('indicative') === 'on',
            active: data.get('active') === 'on',
          },
        },
      }),
    );
  };

  const onNewEdition = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void handle(
      updateEdition({
        data: { slug: product.slug, code: str(data, 'code'), values: { name: localized(data, 'name') } },
      }),
    );
    event.currentTarget.reset();
  };

  return (
    <>
      <header className="acct-head">
        <div>
          <p className="mono-label">{product.slug}</p>
          <h1>{product.name}</h1>
          <p>{canWrite ? m.admin_catalog_product_intro() : m.admin_catalog_read_only()}</p>
        </div>
      </header>
      {notice ? (
        <p className={notice.ok ? 'form-ok' : 'form-error'} role="status" style={{ marginBottom: 16 }}>
          {notice.text}
        </p>
      ) : null}

      <section className="box" aria-labelledby="t-product">
        <div className="box-head">
          <h2 id="t-product">{m.admin_catalog_sheet()}</h2>
        </div>
        <form className="box-body fields" onSubmit={onProduct}>
          <div className="field-pair">
            <label className="field">
              <span className="field-label">{m.admin_catalog_name()}</span>
              <input className="input" name="name" defaultValue={product.name} required disabled={disabled} />
            </label>
            <label className="field">
              <span className="field-label">{m.admin_catalog_status()}</span>
              <select className="input" name="status" defaultValue={product.status} disabled={disabled}>
                <option value="available">{m.state_available()}</option>
                <option value="soon">{m.state_soon()}</option>
                <option value="hidden">{m.admin_catalog_hidden()}</option>
              </select>
            </label>
          </div>
          <Localized name="kind" label={m.admin_catalog_kind()} value={product.kind} disabled={disabled} />
          <Localized name="summary" label={m.admin_catalog_summary()} value={product.summary} disabled={disabled} />
          <div className="field-pair">
            <label className="field">
              <span className="field-label">{m.admin_catalog_logo()}</span>
              <input
                className="input mono"
                name="logo"
                defaultValue={product.logo ?? ''}
                placeholder="/images/… · media:…"
                disabled={disabled}
              />
            </label>
            <label className="field">
              <span className="field-label">{m.admin_catalog_monogram()}</span>
              <input
                className="input"
                name="monogram"
                defaultValue={product.monogram ?? ''}
                maxLength={3}
                disabled={disabled}
              />
            </label>
          </div>
          {canWrite ? (
            <div>
              <button className="btn btn-primary" type="submit">
                {m.admin_catalog_save()}
              </button>
            </div>
          ) : null}
        </form>
      </section>

      <section className="box" aria-labelledby="t-features">
        <div className="box-head">
          <h2 id="t-features">{m.admin_catalog_features()}</h2>
        </div>
        <div className="box-body fields">
          <p className="muted">{m.admin_catalog_features_help()}</p>
          {product.features.map((feature) => (
            <form key={feature.key} className="row-form" onSubmit={(event) => onFeature(event, feature.key)}>
              <code>{feature.key}</code>
              <Localized name="label" label={m.admin_catalog_label()} value={feature.label} disabled={disabled} />
              {canWrite ? (
                <button className="btn btn-line btn-sm" type="submit">
                  {m.admin_catalog_save()}
                </button>
              ) : null}
            </form>
          ))}
          {canWrite ? (
            <form className="row-form" onSubmit={(event) => onFeature(event)}>
              <input
                className="input mono"
                name="key"
                placeholder="documents.pdf"
                required
                aria-label={m.admin_catalog_feature_key()}
              />
              <Localized name="label" label={m.admin_catalog_label()} disabled={false} />
              <button className="btn btn-line btn-sm" type="submit">
                {m.admin_catalog_add_feature()}
              </button>
            </form>
          ) : null}
        </div>
      </section>

      {product.editions.map((edition) => (
        <section key={edition.code} className="box" aria-labelledby={`t-ed-${edition.code}`}>
          <div className="box-head">
            <h2 id={`t-ed-${edition.code}`}>
              {m.admin_catalog_edition()} · {edition.name.fr} <small className="mono muted">{edition.code}</small>
            </h2>
          </div>
          <form className="box-body fields" onSubmit={(event) => onEdition(event, edition)}>
            <Localized name="name" label={m.admin_catalog_name()} value={edition.name} disabled={disabled} />
            <Localized
              name="audience"
              label={m.admin_catalog_audience()}
              value={edition.audience}
              disabled={disabled}
            />
            <Localized
              name="watermark"
              label={m.admin_catalog_watermark()}
              value={edition.watermark}
              disabled={disabled}
            />
            <div className="field-trio">
              <label className="field">
                <span className="field-label">{m.admin_catalog_grace()}</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={90}
                  name="graceDays"
                  defaultValue={edition.graceDays}
                  disabled={disabled}
                />
              </label>
              <label className="field">
                <span className="field-label">{m.admin_catalog_max_seats()}</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  name="maxSeats"
                  defaultValue={edition.maxSeats ?? ''}
                  disabled={disabled}
                />
              </label>
              <label className="field">
                <span className="field-label">{m.admin_catalog_max_projects()}</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  name="maxProjects"
                  defaultValue={edition.maxProjects ?? ''}
                  disabled={disabled}
                />
              </label>
            </div>
            <fieldset className="check-grid">
              <legend className="field-label">{m.admin_catalog_included()}</legend>
              {product.features.map((feature) => (
                <label key={feature.key} className="check-line">
                  <input
                    type="checkbox"
                    name="features"
                    value={feature.key}
                    defaultChecked={edition.features.includes(feature.key)}
                    disabled={disabled}
                  />
                  <span>{feature.label.fr}</span>
                </label>
              ))}
            </fieldset>
            <label className="check-line">
              <input type="checkbox" name="active" defaultChecked={edition.active} disabled={disabled} />
              <span>{m.admin_catalog_edition_active()}</span>
            </label>
            {canWrite ? (
              <div>
                <button className="btn btn-primary" type="submit">
                  {m.admin_catalog_save_edition()}
                </button>
              </div>
            ) : null}
          </form>
          <div className="box-body">
            <h3 className="h3" style={{ fontSize: '1rem', marginBottom: 10 }}>
              {m.admin_catalog_plans()}
            </h3>
            {edition.plans.map((plan) => (
              <form
                key={plan.duration}
                className="row-form plan-row"
                onSubmit={(event) => onPlan(event, edition.code, plan.duration)}
              >
                <b>{DURATIONS[plan.duration] ?? plan.duration}</b>
                <label className="field">
                  <span className="field-label">{m.admin_catalog_price()}</span>
                  <input
                    className="input num"
                    type="number"
                    min={0}
                    step={1}
                    name="price"
                    defaultValue={plan.pricePerSeat}
                    disabled={disabled}
                    data-testid={`price-${edition.code}-${plan.duration}`}
                  />
                </label>
                <label className="check-line">
                  <input type="checkbox" name="indicative" defaultChecked={plan.indicative} disabled={disabled} />
                  <span>{m.admin_catalog_indicative()}</span>
                </label>
                <label className="check-line">
                  <input type="checkbox" name="active" defaultChecked={plan.active} disabled={disabled} />
                  <span>{m.admin_catalog_active()}</span>
                </label>
                {canWrite ? (
                  <button className="btn btn-line btn-sm" type="submit">
                    {m.admin_catalog_save()}
                    <span className="sr"> {DURATIONS[plan.duration]}</span>
                  </button>
                ) : null}
              </form>
            ))}
            {canWrite ? (
              <form className="row-form plan-row" onSubmit={(event) => onPlan(event, edition.code)}>
                <select className="input" name="duration" aria-label={m.block_pricing_duration()}>
                  {Object.entries(DURATIONS)
                    .filter(([duration]) => !edition.plans.some((plan) => plan.duration === duration))
                    .map(([duration, text]) => (
                      <option key={duration} value={duration}>
                        {text}
                      </option>
                    ))}
                </select>
                <label className="field">
                  <span className="field-label">{m.admin_catalog_price()}</span>
                  <input className="input num" type="number" min={0} step={1} name="price" required />
                </label>
                <label className="check-line">
                  <input type="checkbox" name="indicative" defaultChecked />
                  <span>{m.admin_catalog_indicative()}</span>
                </label>
                <label className="check-line">
                  <input type="checkbox" name="active" defaultChecked />
                  <span>{m.admin_catalog_active()}</span>
                </label>
                <button className="btn btn-line btn-sm" type="submit">
                  {m.admin_catalog_add_plan()}
                </button>
              </form>
            ) : null}
          </div>
        </section>
      ))}

      {canWrite ? (
        <section className="box" aria-labelledby="t-new-edition">
          <div className="box-head">
            <h2 id="t-new-edition">{m.admin_catalog_new_edition()}</h2>
          </div>
          <form className="box-body fields" onSubmit={onNewEdition}>
            <label className="field">
              <span className="field-label">{m.admin_catalog_code()}</span>
              <input
                className="input mono"
                name="code"
                pattern="[a-z][a-z0-9_]{1,30}"
                required
                placeholder="enterprise"
              />
            </label>
            <Localized name="name" label={m.admin_catalog_name()} disabled={false} />
            <div>
              <button className="btn btn-line" type="submit">
                {m.admin_catalog_create_edition()}
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </>
  );
}
