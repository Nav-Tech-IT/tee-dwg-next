// Excel / CSV import. One row = one product:
//   brand, type, series, part_number, name, <field keys…>, source_title, source_url, source_page
// Brands and series are created when new; the type must exist. Rows are previewed
// before anything is written. Imported products are "extracted" (never verified).
import ExcelJS from "exceljs";
import { listBrands, listProducts, listSeries, listSources, listTypes, saveBrand, saveProduct, saveSeries, saveSource } from "./repo";
import { parsePoints } from "./resolve";
import type { ComponentType, RawValue, Specs } from "./schema";

export const BASE_COLUMNS = ["brand", "type", "series", "part_number", "name"];
export const SOURCE_COLUMNS = ["source_title", "source_url", "source_page"];

export function csvTemplate(type: ComponentType) {
  return [...BASE_COLUMNS, ...type.fields.map((f) => f.key), ...SOURCE_COLUMNS].join(",") + "\r\n";
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

async function parseXlsx(buf: ArrayBuffer): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  const rows: string[][] = [];
  ws.eachRow((r) => {
    const vals = (r.values as unknown[]).slice(1).map((v) => {
      if (v == null) return "";
      if (typeof v === "object" && v && "result" in v) return String((v as { result: unknown }).result ?? "");
      if (typeof v === "object" && v && "text" in v) return String((v as { text: unknown }).text ?? "");
      return String(v);
    });
    rows.push(vals);
  });
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export async function readTable(name: string, buf: ArrayBuffer) {
  return /\.xlsx$/i.test(name) ? parseXlsx(buf) : parseCsv(new TextDecoder().decode(buf));
}

export interface PreviewRow {
  line: number;
  brand: string;
  type: string;
  series: string;
  partNumber: string;
  name: string;
  action: "create" | "update";
  newBrand: boolean;
  newSeries: boolean;
  specs: Specs;
  source?: { title: string; url: string; page: string };
  errors: string[];
  warnings: string[];
}

export function preview(table: string[][]): { rows: PreviewRow[]; unknownColumns: string[] } {
  const [head, ...body] = table;
  const cols = (head ?? []).map((h) => h.trim().toLowerCase());
  const types = listTypes(), brands = listBrands(), series = listSeries(), products = listProducts({ includeInactive: true });
  const known = new Set([...BASE_COLUMNS, ...SOURCE_COLUMNS, ...types.flatMap((t) => t.fields.map((f) => f.key))]);
  const unknownColumns = cols.filter((c) => c && !known.has(c));

  const rows = body.map((cells, i): PreviewRow => {
    const get = (k: string) => (cells[cols.indexOf(k)] ?? "").trim();
    const errors: string[] = [], warnings: string[] = [];
    const typeName = get("type");
    const type = types.find((t) => t.id === typeName.toLowerCase() || t.name.toLowerCase() === typeName.toLowerCase());
    if (!type) errors.push(`Unknown type "${typeName}"`);
    const brandName = get("brand");
    const brand = brands.find((b) => b.id === brandName.toLowerCase() || b.name.toLowerCase() === brandName.toLowerCase());
    if (!brandName) errors.push("Brand is empty");
    const seriesName = get("series"), partNumber = get("part_number");
    if (!seriesName) errors.push("Series is empty");
    if (!partNumber) errors.push("Part number is empty");
    const ser = brand && type ? series.find((s) => s.brandId === brand.id && s.typeId === type.id && s.name.toLowerCase() === seriesName.toLowerCase()) : undefined;
    const existing = ser ? products.find((p) => p.series.id === ser.id && p.product.partNumber.toLowerCase() === partNumber.toLowerCase()) : undefined;

    const specs: Specs = {};
    const title = get("source_title"), url = get("source_url"), page = get("source_page");
    for (const fd of type?.fields ?? []) {
      const raw = get(fd.key);
      if (!raw) continue;
      let v: RawValue | null = raw;
      if (fd.kind === "number") {
        const n = Number(raw.replace(",", "."));
        if (!Number.isFinite(n)) { errors.push(`${fd.key}: "${raw}" is not a number`); continue; }
        v = n;
      } else if (fd.kind === "bool") v = /^(1|y|yes|true)$/i.test(raw);
      else if (fd.kind === "points") {
        v = parsePoints(raw);
        if (!v) { errors.push(`${fd.key}: write points as "x, y; x, y"`); continue; }
      } else if (fd.kind === "enum" && fd.options && !fd.options.includes(raw)) warnings.push(`${fd.key}: "${raw}" is not one of ${fd.options.join(" / ")}`);
      specs[fd.key] = { v, ...(title ? { src: "__row__" } : {}), ...(page ? { page } : {}) };
    }
    if (Object.keys(specs).length && !title) warnings.push("No source given: values will be imported without a source and cannot be verified until one is added");
    return {
      line: i + 2, brand: brand?.name ?? brandName, type: type?.name ?? typeName, series: seriesName, partNumber, name: get("name"),
      action: existing ? "update" : "create", newBrand: !brand && !!brandName, newSeries: !ser && !!seriesName, specs,
      source: title ? { title, url, page } : undefined, errors, warnings,
    };
  });
  return { rows, unknownColumns };
}

/** Write the valid rows. Returns how many products were created / updated. */
export function commit(rows: PreviewRow[]) {
  const sources = new Map<string, string>();
  let created = 0, updated = 0;
  for (const r of rows) {
    if (r.errors.length) continue;
    const types = listTypes(), type = types.find((t) => t.name === r.type)!;
    let brand = listBrands().find((b) => b.name.toLowerCase() === r.brand.toLowerCase());
    if (!brand) { saveBrand({ name: r.brand }); brand = listBrands().find((b) => b.name === r.brand)!; }
    let ser = listSeries({ brandId: brand.id, typeId: type.id }).find((s) => s.name.toLowerCase() === r.series.toLowerCase());
    const seriesId = ser?.id ?? saveSeries({ brandId: brand.id, typeId: type.id, name: r.series });
    ser = ser ?? listSeries({ brandId: brand.id, typeId: type.id }).find((s) => s.id === seriesId)!;

    let srcId: string | undefined;
    if (r.source) {
      const key = `${brand.id}|${r.source.title}|${r.source.url}`;
      const same = listSources().find((s) => s.brandId === brand!.id && s.title === r.source!.title && s.url === r.source!.url);
      srcId = sources.get(key) ?? same?.id ?? saveSource({ brandId: brand.id, title: r.source.title, url: r.source.url, kind: "catalogue", notes: "Created by import" });
      sources.set(key, srcId);
    }
    const specs: Specs = Object.fromEntries(Object.entries(r.specs).map(([k, v]) => [k, { ...v, src: v.src === "__row__" ? srcId : v.src }]));
    const existing = listProducts({ includeInactive: true }).find((p) => p.series.id === seriesId && p.product.partNumber.toLowerCase() === r.partNumber.toLowerCase());
    if (existing) {
      saveProduct({ ...existing.product, name: r.name || existing.product.name, specs: { ...existing.product.specs, ...specs }, status: existing.product.status === "verified" ? "verified" : "extracted" });
      updated++;
    } else {
      saveProduct({ seriesId, partNumber: r.partNumber, name: r.name, specs, status: "extracted" });
      created++;
    }
  }
  return { created, updated };
}
