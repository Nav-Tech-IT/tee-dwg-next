// Library data access. Every write is logged in `history`. A verified product that
// is edited (directly or through its series) drops back to "extracted", so a
// verified value is always one an engineer has looked at.
import { db } from "./db";
import { resolveProduct, type Resolved } from "./resolve";
import type { Brand, ComponentType, FieldDef, Product, ProductStatus, Series, Source, Specs } from "./schema";

const newId = (p: string) => `${p}_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
const now = () => new Date().toISOString().replace("T", " ").slice(0, 19);

/* ---------- row mapping ---------- */

type Row = Record<string, unknown>;
const brandOf = (r: Row): Brand => ({ id: r.id as string, name: r.name as string, website: r.website as string, notes: r.notes as string, active: !!r.active });
const typeOf = (r: Row): ComponentType => ({ id: r.id as string, category: r.category as string, name: r.name as string, fields: JSON.parse(r.fields as string), sort: r.sort as number });
const seriesOf = (r: Row): Series => ({
  id: r.id as string, brandId: r.brand_id as string, typeId: r.type_id as string, name: r.name as string, notes: r.notes as string,
  specs: JSON.parse(r.specs as string), files: JSON.parse(r.files as string), active: !!r.active, updatedAt: r.updated_at as string,
});
const productOf = (r: Row): Product => ({
  id: r.id as string, seriesId: r.series_id as string, partNumber: r.part_number as string, name: r.name as string,
  specs: JSON.parse(r.specs as string), files: JSON.parse(r.files as string), status: r.status as ProductStatus, active: !!r.active, updatedAt: r.updated_at as string,
});
const sourceOf = (r: Row): Source => ({
  id: r.id as string, brandId: (r.brand_id as string) ?? null, title: r.title as string, kind: r.kind as Source["kind"], url: r.url as string,
  file: (r.file as string) ?? null, notes: r.notes as string, retrievedAt: r.retrieved_at as string,
});

function log(entity: string, entityId: string, action: string, detail: unknown = {}) {
  db().prepare("INSERT INTO history (entity, entity_id, action, detail) VALUES (?, ?, ?, ?)").run(entity, entityId, action, JSON.stringify(detail));
}

/** Keys whose value or source changed between two spec sets. */
function changedKeys(a: Specs, b: Specs) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].filter((k) => JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null));
}

/* ---------- types ---------- */

export const listTypes = () => (db().prepare("SELECT * FROM types ORDER BY sort, name").all() as Row[]).map(typeOf);
export const getType = (id: string) => {
  const r = db().prepare("SELECT * FROM types WHERE id = ?").get(id) as Row | undefined;
  return r ? typeOf(r) : null;
};
export function saveType(t: { id?: string; category: string; name: string; fields: FieldDef[]; sort?: number }) {
  const keys = t.fields.map((f) => f.key);
  if (new Set(keys).size !== keys.length) throw new Error("Field keys must be unique");
  if (keys.some((k) => !/^[a-z][a-z0-9_]*$/.test(k))) throw new Error("Field keys: lower case letters, digits and _ only");
  const id = t.id || t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const exists = getType(id);
  db().prepare(`INSERT INTO types (id, category, name, fields, sort, updated_at) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET category = excluded.category, name = excluded.name, fields = excluded.fields, sort = excluded.sort, updated_at = excluded.updated_at`)
    .run(id, t.category, t.name, JSON.stringify(t.fields), t.sort ?? exists?.sort ?? 100, now());
  log("type", id, exists ? "update" : "create", { name: t.name, fields: keys });
  return id;
}

/* ---------- brands ---------- */

export const listBrands = () => (db().prepare("SELECT * FROM brands ORDER BY name").all() as Row[]).map(brandOf);
export function saveBrand(b: Partial<Brand> & { name: string }) {
  const id = b.id || b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const exists = db().prepare("SELECT 1 FROM brands WHERE id = ?").get(id);
  db().prepare(`INSERT INTO brands (id, name, website, notes, active, updated_at) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, website = excluded.website, notes = excluded.notes, active = excluded.active, updated_at = excluded.updated_at`)
    .run(id, b.name, b.website ?? "", b.notes ?? "", b.active === false ? 0 : 1, now());
  log("brand", id, exists ? "update" : "create", b);
  return id;
}

/* ---------- sources ---------- */

export const listSources = () => (db().prepare("SELECT * FROM sources ORDER BY retrieved_at DESC, title").all() as Row[]).map(sourceOf);
export const getSource = (id: string) => {
  const r = db().prepare("SELECT * FROM sources WHERE id = ?").get(id) as Row | undefined;
  return r ? sourceOf(r) : null;
};
export function saveSource(s: Partial<Source> & { title: string }) {
  const id = s.id || newId("src");
  const exists = getSource(id);
  db().prepare(`INSERT INTO sources (id, brand_id, title, kind, url, file, notes, retrieved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET brand_id = excluded.brand_id, title = excluded.title, kind = excluded.kind, url = excluded.url,
      file = excluded.file, notes = excluded.notes, retrieved_at = excluded.retrieved_at`)
    .run(id, s.brandId ?? null, s.title, s.kind ?? "catalogue", s.url ?? "", s.file ?? exists?.file ?? null, s.notes ?? "", s.retrievedAt || new Date().toISOString().slice(0, 10));
  log("source", id, exists ? "update" : "create", { title: s.title });
  return id;
}

/* ---------- series ---------- */

export function getSeries(id: string) {
  const r = db().prepare("SELECT * FROM series WHERE id = ?").get(id) as Row | undefined;
  return r ? seriesOf(r) : null;
}
export function listSeries(filter: { brandId?: string; typeId?: string } = {}) {
  const rows = db().prepare(`SELECT * FROM series WHERE (? IS NULL OR brand_id = ?) AND (? IS NULL OR type_id = ?) ORDER BY name`)
    .all(filter.brandId ?? null, filter.brandId ?? null, filter.typeId ?? null, filter.typeId ?? null) as Row[];
  return rows.map(seriesOf);
}
export function saveSeries(s: Partial<Series> & { brandId: string; typeId: string; name: string }) {
  const id = s.id || newId("ser");
  const before = getSeries(id);
  const specs = s.specs ?? before?.specs ?? {};
  db().prepare(`INSERT INTO series (id, brand_id, type_id, name, notes, specs, files, active, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET brand_id = excluded.brand_id, type_id = excluded.type_id, name = excluded.name, notes = excluded.notes,
      specs = excluded.specs, files = excluded.files, active = excluded.active, updated_at = excluded.updated_at`)
    .run(id, s.brandId, s.typeId, s.name, s.notes ?? before?.notes ?? "", JSON.stringify(specs), JSON.stringify(s.files ?? before?.files ?? []), s.active === false ? 0 : 1, now());
  const changed = before ? changedKeys(before.specs, specs) : Object.keys(specs);
  log("series", id, before ? "update" : "create", { name: s.name, changed });
  if (before && changed.length) {
    // Shared values changed: every verified product of the series needs a new check.
    const hit = db().prepare("UPDATE products SET status = 'extracted', updated_at = ? WHERE series_id = ? AND status = 'verified' RETURNING id").all(now(), id) as Row[];
    for (const p of hit) log("product", p.id as string, "unverified", { reason: `series values changed: ${changed.join(", ")}` });
  }
  return id;
}

/* ---------- products ---------- */

export interface ProductRow {
  product: Product;
  series: Series;
  type: ComponentType;
  brand: Brand;
  resolved: Resolved;
}

export function getProduct(id: string): ProductRow | null {
  const r = db().prepare("SELECT * FROM products WHERE id = ?").get(id) as Row | undefined;
  if (!r) return null;
  const product = productOf(r), series = getSeries(product.seriesId)!, type = getType(series.typeId)!;
  const brand = listBrands().find((b) => b.id === series.brandId)!;
  return { product, series, type, brand, resolved: resolveProduct(type, series, product) };
}

export function listProducts(filter: { q?: string; typeId?: string; brandId?: string; status?: string; includeInactive?: boolean } = {}): ProductRow[] {
  const types = new Map(listTypes().map((t) => [t.id, t])), brands = new Map(listBrands().map((b) => [b.id, b]));
  const series = new Map(listSeries().map((s) => [s.id, s]));
  const rows = (db().prepare("SELECT * FROM products ORDER BY part_number").all() as Row[]).map(productOf);
  const q = filter.q?.toLowerCase().trim();
  const out: ProductRow[] = [];
  for (const p of rows) {
    const s = series.get(p.seriesId)!, t = types.get(s.typeId)!, b = brands.get(s.brandId)!;
    if (!filter.includeInactive && (!p.active || !s.active)) continue;
    if (filter.typeId && t.id !== filter.typeId) continue;
    if (filter.brandId && b.id !== filter.brandId) continue;
    if (filter.status && p.status !== filter.status) continue;
    if (q && !`${p.partNumber} ${p.name} ${s.name} ${b.name} ${t.name}`.toLowerCase().includes(q)) continue;
    out.push({ product: p, series: s, type: t, brand: b, resolved: resolveProduct(t, s, p) });
  }
  return out;
}

export function saveProduct(p: Partial<Product> & { seriesId: string; partNumber: string }) {
  const id = p.id || newId("prd");
  const before = getProduct(id)?.product ?? null;
  const specs = p.specs ?? before?.specs ?? {};
  const changed = before ? changedKeys(before.specs, specs) : Object.keys(specs);
  let status: ProductStatus = p.status ?? before?.status ?? "draft";
  if (before?.status === "verified" && changed.length && status === "verified") status = "extracted";
  db().prepare(`INSERT INTO products (id, series_id, part_number, name, specs, files, status, active, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET series_id = excluded.series_id, part_number = excluded.part_number, name = excluded.name, specs = excluded.specs,
      files = excluded.files, status = excluded.status, active = excluded.active, updated_at = excluded.updated_at`)
    .run(id, p.seriesId, p.partNumber, p.name ?? before?.name ?? "", JSON.stringify(specs), JSON.stringify(p.files ?? before?.files ?? []), status, p.active === false ? 0 : 1, now());
  log("product", id, before ? "update" : "create", { changed, status, active: p.active !== false });
  return id;
}

/** Mark verified only when every required value is present and has a source. */
export function setProductStatus(id: string, status: ProductStatus) {
  const row = getProduct(id);
  if (!row) throw new Error("Product not found");
  if (status === "verified" && !row.resolved.complete) {
    const miss = [...row.resolved.missing.map((f) => `${f.label} (missing)`), ...row.resolved.unsourced.map((f) => `${f.label} (no source)`)];
    throw new Error(`Cannot verify: ${miss.join(", ")}`);
  }
  db().prepare("UPDATE products SET status = ?, updated_at = ? WHERE id = ?").run(status, now(), id);
  log("product", id, status === "verified" ? "verified" : "status", { status });
}

export function history(entity: string, entityId: string) {
  return db().prepare("SELECT at, action, detail FROM history WHERE entity = ? AND entity_id = ? ORDER BY id DESC LIMIT 100").all(entity, entityId) as { at: string; action: string; detail: string }[];
}

/* ---------- settings & export ---------- */

export function getSetting<T>(key: string): T | null {
  const r = db().prepare("SELECT value FROM settings WHERE key = ?").get(key) as Row | undefined;
  return r ? (JSON.parse(r.value as string) as T) : null;
}
export function setSetting(key: string, value: unknown) {
  db().prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, JSON.stringify(value));
  log("setting", key, "update", value);
}

/** Whole library as JSON: backup, diff, or hand-over to another machine. */
export function exportLibrary() {
  return {
    exportedAt: new Date().toISOString(),
    types: listTypes(), brands: listBrands(), sources: listSources(), series: listSeries(),
    products: (db().prepare("SELECT * FROM products").all() as Row[]).map(productOf),
    settings: Object.fromEntries((db().prepare("SELECT key, value FROM settings").all() as Row[]).map((r) => [r.key, JSON.parse(r.value as string)])),
  };
}
