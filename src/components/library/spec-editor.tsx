"use client";

import { forPoles, formatValue, parsePoints, pointsToText } from "@/library/resolve";
import { FIELD_GROUPS, type FieldDef, type Points, type RawValue, type Scalar, type Source, type SpecValue, type Specs } from "@/library/schema";

/** Editable form of a spec set: every value as text, so half-typed input is kept. */
export interface DraftValue { vals: Record<string, string>; src: string; page: string; note: string }
export type Draft = Record<string, DraftValue>;

const ONE = "_";

function toText(v: Scalar | undefined): string {
  if (v === undefined || v === null) return "";
  if (Array.isArray(v)) return pointsToText(v as Points);
  return String(v);
}

export function toDraft(specs: Specs, fields: FieldDef[], perPoles: boolean): Draft {
  const d: Draft = {};
  for (const f of fields) {
    const sv = specs[f.key];
    const vals: Record<string, string> = {};
    if (sv) {
      if (perPoles && f.byPoles && typeof sv.v === "object" && !Array.isArray(sv.v)) for (const [p, v] of Object.entries(sv.v as Record<string, Scalar>)) vals[p] = toText(v);
      else vals[ONE] = toText(sv.v as Scalar);
    }
    d[f.key] = { vals, src: sv?.src ?? "", page: sv?.page ?? "", note: sv?.note ?? "" };
  }
  return d;
}

function parseOne(f: FieldDef, s: string): { v?: Scalar; error?: string } {
  const t = s.trim();
  if (!t) return {};
  if (f.kind === "number") {
    const n = Number(t.replace(",", "."));
    return Number.isFinite(n) ? { v: n } : { error: `${f.label}: "${t}" is not a number` };
  }
  if (f.kind === "bool") return { v: /^(1|y|yes|true)$/i.test(t) };
  if (f.kind === "points") {
    const p = parsePoints(t);
    return p ? { v: p } : { error: `${f.label}: write points as "x, y; x, y"` };
  }
  return { v: t };
}

export function fromDraft(draft: Draft, fields: FieldDef[]): { specs: Specs; errors: string[] } {
  const specs: Specs = {}, errors: string[] = [];
  for (const f of fields) {
    const d = draft[f.key];
    if (!d) continue;
    let v: RawValue | undefined;
    const keys = Object.keys(d.vals).filter((k) => d.vals[k].trim() !== "");
    if (keys.length === 1 && keys[0] === ONE) {
      const r = parseOne(f, d.vals[ONE]);
      if (r.error) errors.push(r.error);
      v = r.v;
    } else if (keys.length) {
      const m: Record<string, Scalar> = {};
      for (const k of keys) {
        const r = parseOne(f, d.vals[k]);
        if (r.error) errors.push(`${r.error} (${k}P)`);
        else if (r.v !== undefined) m[k] = r.v;
      }
      v = m;
    }
    if (v === undefined) continue;
    const sv: SpecValue = { v };
    if (d.src) sv.src = d.src;
    if (d.page.trim()) sv.page = d.page.trim();
    if (d.note.trim()) sv.note = d.note.trim();
    specs[f.key] = sv;
  }
  return { specs, errors };
}

const cell = "w-full rounded border border-rule bg-panel px-2 py-1 text-sm";

export function SpecEditor({
  fields, draft, onChange, sources, polesColumns, inherited, productPoles,
}: {
  fields: FieldDef[];
  draft: Draft;
  onChange: (d: Draft) => void;
  sources: Source[];
  /** Series view: show one input per pole count for byPoles fields. */
  polesColumns?: string[];
  /** Product view: the series values, shown as the fallback. */
  inherited?: Specs;
  productPoles?: string;
}) {
  const set = (key: string, patch: Partial<DraftValue>) => onChange({ ...draft, [key]: { ...draft[key], ...patch } });
  const setVal = (key: string, k: string, s: string) => set(key, { vals: { ...draft[key].vals, [k]: s } });

  return (
    <div className="grid gap-5">
      {FIELD_GROUPS.map((g) => {
        const fs = fields.filter((f) => f.group === g);
        if (!fs.length) return null;
        return (
          <section key={g} className="grid gap-1.5">
            <h3 className="font-display text-base font-semibold tracking-wide">{g}</h3>
            <div className="grid gap-1.5">
              {fs.map((f) => {
                const d = draft[f.key];
                const inh = inherited?.[f.key] ? forPoles(inherited[f.key].v, f.byPoles, productPoles) : undefined;
                const cols = polesColumns && f.byPoles ? polesColumns : [ONE];
                return (
                  <div key={f.key} className="grid gap-2 items-start sm:grid-cols-[13rem_minmax(0,1fr)_12rem_5rem] rounded-md border border-rule/60 bg-panel px-2.5 py-2">
                    <label className="text-sm leading-tight pt-1">
                      {f.label}{f.required && <span className="text-bad" title="Needed by the design engine"> *</span>}
                      <span className="block font-mono text-[10px] text-muted">{f.key}{f.unit ? ` · ${f.unit}` : ""}{f.byPoles ? " · per poles" : ""}</span>
                    </label>
                    <div className={`grid gap-1.5 ${cols.length > 1 ? "grid-cols-4" : ""}`}>
                      {cols.map((k) => (
                        <div key={k} className="grid gap-0.5">
                          {cols.length > 1 && <span className="font-mono text-[10px] text-muted">{k}P</span>}
                          {f.kind === "enum" ? (
                            <select className={cell} value={d.vals[k] ?? ""} onChange={(e) => setVal(f.key, k, e.target.value)}>
                              <option value="">{inh !== undefined ? `— series: ${formatValue(inh)}` : "—"}</option>
                              {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : f.kind === "points" ? (
                            <textarea rows={2} className={`${cell} font-mono text-xs`} value={d.vals[k] ?? ""} onChange={(e) => setVal(f.key, k, e.target.value)}
                              placeholder={inh !== undefined ? `series: ${formatValue(inh)}` : "x, y; x, y"} />
                          ) : (
                            <input className={`${cell} ${f.kind === "number" ? "font-mono" : ""}`} value={d.vals[k] ?? ""} onChange={(e) => setVal(f.key, k, e.target.value)}
                              placeholder={inh !== undefined ? `series: ${formatValue(inh, f.unit)}` : f.kind === "bool" ? "yes / no" : ""} inputMode={f.kind === "number" ? "decimal" : undefined} />
                          )}
                        </div>
                      ))}
                      {f.help && <span className="text-[11px] text-muted col-span-full">{f.help}</span>}
                    </div>
                    <select className={cell} value={d.src} onChange={(e) => set(f.key, { src: e.target.value })} aria-label={`Source for ${f.label}`}>
                      <option value="">No source</option>
                      {sources.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                    <input className={cell} value={d.page} onChange={(e) => set(f.key, { page: e.target.value })} placeholder="page" aria-label={`Page for ${f.label}`} />
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
