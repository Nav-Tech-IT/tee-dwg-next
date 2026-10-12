// Effective specification of a product: product values override series values,
// byPoles values are picked for the product's pole count. Pure, no database —
// this is what the design engine will receive (as a snapshot).
import type { ComponentType, FieldDef, Product, RawValue, Scalar, Series, Specs } from "./schema";

export interface ResolvedValue {
  value: Scalar;
  from: "product" | "series";
  src?: string;
  page?: string;
}

export interface Resolved {
  productId: string;
  values: Record<string, ResolvedValue>;
  /** Required fields with no value. */
  missing: FieldDef[];
  /** Required fields with a value but no source. */
  unsourced: FieldDef[];
  /** Ready to be marked verified (complete and every required value sourced). */
  complete: boolean;
}

const isEmpty = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

/** Pick the value for a pole count from a byPoles map (or return a plain value as is). */
export function forPoles(v: RawValue, byPoles: boolean | undefined, poles: string | undefined): Scalar | undefined {
  if (!byPoles || typeof v !== "object" || Array.isArray(v) || v === null) return v as Scalar;
  if (poles && !isEmpty((v as Record<string, Scalar>)[poles])) return (v as Record<string, Scalar>)[poles];
  return undefined;
}

export function resolveProduct(type: ComponentType, series: Series, product: Product): Resolved {
  const values: Record<string, ResolvedValue> = {};
  const poles = String(product.specs.poles?.v ?? series.specs.poles?.v ?? "");
  for (const fd of type.fields) {
    for (const [from, specs] of [["product", product.specs], ["series", series.specs]] as [ResolvedValue["from"], Specs][]) {
      const sv = specs[fd.key];
      if (!sv || isEmpty(sv.v)) continue;
      const v = forPoles(sv.v, fd.byPoles, poles);
      if (isEmpty(v)) continue;
      values[fd.key] = { value: v!, from, src: sv.src, page: sv.page };
      break;
    }
  }
  const missing = type.fields.filter((fd) => fd.required && !values[fd.key]);
  const unsourced = type.fields.filter((fd) => fd.required && values[fd.key] && !values[fd.key].src);
  return { productId: product.id, values, missing, unsourced, complete: missing.length === 0 && unsourced.length === 0 };
}

export function formatValue(v: Scalar | undefined, unit?: string): string {
  if (v === undefined) return "—";
  if (Array.isArray(v)) return v.map(([x, y]) => `(${x}, ${y})`).join(" ");
  if (typeof v === "boolean") return v ? "yes" : "no";
  return unit ? `${v} ${unit}` : String(v);
}

/** "x,y; x,y" ⇄ points. */
export function parsePoints(s: string): [number, number][] | null {
  const t = s.trim();
  if (!t) return [];
  const pts = t.split(/[;\n]+/).map((p) => p.trim()).filter(Boolean).map((p) => p.replace(/[()]/g, "").split(/[,\s]+/).map(Number));
  if (pts.some((p) => p.length !== 2 || p.some((n) => !Number.isFinite(n)))) return null;
  return pts as [number, number][];
}
export const pointsToText = (p: [number, number][]) => p.map(([x, y]) => `${x}, ${y}`).join("; ");
