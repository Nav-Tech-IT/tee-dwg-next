"use client";

import { useState } from "react";
import { FIELD_GROUPS, type Brand, type ComponentType, type FieldDef, type FieldKind, type Source } from "@/library/schema";
import { btn, btnPrimary, input, label } from "./ui";

const post = async (url: string, body: unknown) => {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error);
  return j;
};

/* ---------------- Brands ---------------- */

export function BrandsAdmin({ initial }: { initial: Brand[] }) {
  const [brands, setBrands] = useState(initial);
  const [edit, setEdit] = useState<Partial<Brand> | null>(null);
  const [err, setErr] = useState("");
  async function save() {
    try {
      await post("/api/library/brands", edit);
      setBrands(await (await fetch("/api/library/brands")).json());
      setEdit(null); setErr("");
    } catch (e) { setErr((e as Error).message); }
  }
  return (
    <div className="grid gap-3">
      <div className="rounded-md border border-rule bg-panel divide-y divide-rule">
        {brands.map((b) => (
          <div key={b.id} className={`flex flex-wrap items-center gap-3 px-3 py-2 ${b.active ? "" : "opacity-50"}`}>
            <span className="font-medium w-48">{b.name}</span>
            <a href={b.website} target="_blank" rel="noreferrer" className="text-xs text-muted underline truncate max-w-xs">{b.website}</a>
            <span className="text-xs text-muted flex-1 truncate">{b.notes}</span>
            <button className={btn} onClick={() => setEdit(b)}>Edit</button>
          </div>
        ))}
      </div>
      {edit ? (
        <div className="rounded-md border border-rule bg-panel p-3 grid gap-2 sm:grid-cols-2">
          <label className={label}>Name<input className={input} value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} disabled={!!edit.id} /></label>
          <label className={label}>Website<input className={input} value={edit.website ?? ""} onChange={(e) => setEdit({ ...edit, website: e.target.value })} /></label>
          <label className={`${label} sm:col-span-2`}>Notes<input className={input} value={edit.notes ?? ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.active !== false} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Active</label>
          <div className="flex gap-2 sm:col-span-2"><button className={btnPrimary} onClick={save}>Save brand</button><button className={btn} onClick={() => setEdit(null)}>Cancel</button></div>
          {err && <p className="text-bad text-sm sm:col-span-2">{err}</p>}
        </div>
      ) : (
        <button className={`${btn} justify-self-start`} onClick={() => setEdit({ active: true })}>+ Add brand</button>
      )}
    </div>
  );
}

/* ---------------- Sources & files ---------------- */

export function SourcesAdmin({ initial, brands }: { initial: Source[]; brands: Brand[] }) {
  const [sources, setSources] = useState(initial);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true); setErr("");
    const r = await fetch("/api/library/sources", { method: "POST", body: new FormData(form) });
    setBusy(false);
    if (!r.ok) { setErr((await r.json()).error); return; }
    form.reset();
    setSources(await (await fetch("/api/library/sources")).json());
  }
  const brandName = (id: string | null) => brands.find((b) => b.id === id)?.name ?? "—";
  return (
    <div className="grid gap-4">
      <form onSubmit={submit} className="rounded-md border border-rule bg-panel p-3 grid gap-2 sm:grid-cols-2">
        <h2 className="font-display text-lg font-semibold sm:col-span-2">Add a source</h2>
        <label className={label}>Title<input name="title" className={input} placeholder="e.g. CHINT NM8N MCCB catalogue 2025" required /></label>
        <label className={label}>Brand<select name="brandId" className={input}><option value="">—</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label className={label}>Kind<select name="kind" className={input}>{["catalogue", "datasheet", "drawing", "3d", "other"].map((k) => <option key={k}>{k}</option>)}</select></label>
        <label className={label}>Web address<input name="url" className={input} placeholder="https://…" /></label>
        <label className={label}>Retrieved on<input name="retrievedAt" type="date" className={input} /></label>
        <label className={label}>File (PDF, STEP, DXF, image, Excel)<input name="file" type="file" className="text-sm" /></label>
        <label className={`${label} sm:col-span-2`}>Notes<input name="notes" className={input} /></label>
        <div className="sm:col-span-2 flex items-center gap-3"><button className={btnPrimary} disabled={busy}>{busy ? "Uploading…" : "Add source"}</button>{err && <span className="text-bad text-sm">{err}</span>}</div>
      </form>
      <div className="overflow-x-auto rounded-md border border-rule bg-panel">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-muted font-mono"><tr className="border-b border-rule"><th className="px-3 py-2">Title</th><th className="px-3 py-2">Brand</th><th className="px-3 py-2">Kind</th><th className="px-3 py-2">Retrieved</th><th className="px-3 py-2">Links</th></tr></thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id} className="border-t border-rule/60">
                <td className="px-3 py-1.5">{s.title}{s.notes && <div className="text-xs text-muted">{s.notes}</div>}</td>
                <td className="px-3 py-1.5 text-xs">{brandName(s.brandId)}</td>
                <td className="px-3 py-1.5 text-xs">{s.kind}</td>
                <td className="px-3 py-1.5 text-xs font-mono">{s.retrievedAt}</td>
                <td className="px-3 py-1.5 text-xs space-x-2">{s.file && <a className="underline" target="_blank" href={`/api/library/files/${s.file}`}>file</a>}{s.url && <a className="underline" target="_blank" rel="noreferrer" href={s.url}>web</a>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Types & fields ---------------- */

const KINDS: FieldKind[] = ["number", "text", "enum", "bool", "points"];

export function TypesAdmin({ initial }: { initial: ComponentType[] }) {
  const [types, setTypes] = useState(initial);
  const [sel, setSel] = useState<ComponentType | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const setField = (i: number, patch: Partial<FieldDef>) => sel && setSel({ ...sel, fields: sel.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  const move = (i: number, d: number) => {
    if (!sel) return;
    const fs = [...sel.fields], j = i + d;
    if (j < 0 || j >= fs.length) return;
    [fs[i], fs[j]] = [fs[j], fs[i]];
    setSel({ ...sel, fields: fs });
  };
  async function save() {
    if (!sel) return;
    try {
      const { id } = await post("/api/library/types", sel);
      const all: ComponentType[] = await (await fetch("/api/library/types")).json();
      setTypes(all); setSel(all.find((t) => t.id === id) ?? null);
      setMsg({ ok: true, text: "Saved." });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  }
  const cell = "w-full rounded border border-rule bg-panel px-1.5 py-1 text-xs";
  return (
    <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <aside className="grid gap-1 content-start text-sm">
        {types.map((t) => <button key={t.id} onClick={() => { setSel(t); setMsg(null); }} className={`text-left px-2 py-1 rounded ${sel?.id === t.id ? "bg-fg text-bg" : "hover:bg-panel2"}`}><span className="text-[10px] font-mono opacity-60 block">{t.category}</span>{t.name}</button>)}
        <button className={`${btn} mt-2`} onClick={() => setSel({ id: "", category: "", name: "", fields: [], sort: 100 })}>+ New type</button>
      </aside>
      {sel ? (
        <section className="grid gap-3 content-start min-w-0">
          <div className="grid sm:grid-cols-3 gap-2">
            <label className={label}>Category<input className={input} value={sel.category} onChange={(e) => setSel({ ...sel, category: e.target.value })} placeholder="e.g. Breaker" /></label>
            <label className={label}>Type name<input className={input} value={sel.name} onChange={(e) => setSel({ ...sel, name: e.target.value })} placeholder="e.g. MCCB" /></label>
            <label className={label}>Sort<input className={input} type="number" value={sel.sort} onChange={(e) => setSel({ ...sel, sort: Number(e.target.value) })} /></label>
          </div>
          <p className="text-xs text-muted">Fields marked <b>required</b> must be filled and sourced before a product can be verified. <b>Per poles</b> lets a series hold one value per pole count. Changing a field key does not move existing values.</p>
          <div className="overflow-x-auto rounded-md border border-rule bg-panel">
            <table className="w-full text-xs">
              <thead className="text-left uppercase tracking-wider text-muted font-mono text-[10px]"><tr className="border-b border-rule">{["", "Key", "Label", "Kind", "Unit", "Group", "Options (enum)", "Req.", "Per poles", ""].map((h, i) => <th key={i} className="px-1.5 py-1.5">{h}</th>)}</tr></thead>
              <tbody>
                {sel.fields.map((f, i) => (
                  <tr key={i} className="border-t border-rule/60">
                    <td className="px-1 whitespace-nowrap"><button onClick={() => move(i, -1)} aria-label="Move up">↑</button><button onClick={() => move(i, 1)} aria-label="Move down">↓</button></td>
                    <td className="px-1 py-1 w-32"><input className={`${cell} font-mono`} value={f.key} onChange={(e) => setField(i, { key: e.target.value })} /></td>
                    <td className="px-1 py-1 min-w-48"><input className={cell} value={f.label} onChange={(e) => setField(i, { label: e.target.value })} /></td>
                    <td className="px-1 py-1"><select className={cell} value={f.kind} onChange={(e) => setField(i, { kind: e.target.value as FieldKind })}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></td>
                    <td className="px-1 py-1 w-16"><input className={cell} value={f.unit ?? ""} onChange={(e) => setField(i, { unit: e.target.value || undefined })} /></td>
                    <td className="px-1 py-1"><select className={cell} value={f.group} onChange={(e) => setField(i, { group: e.target.value as FieldDef["group"] })}>{FIELD_GROUPS.map((g) => <option key={g}>{g}</option>)}</select></td>
                    <td className="px-1 py-1 min-w-36"><input className={cell} value={(f.options ?? []).join(", ")} disabled={f.kind !== "enum"} onChange={(e) => setField(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} /></td>
                    <td className="px-1 text-center"><input type="checkbox" checked={!!f.required} onChange={(e) => setField(i, { required: e.target.checked })} /></td>
                    <td className="px-1 text-center"><input type="checkbox" checked={!!f.byPoles} onChange={(e) => setField(i, { byPoles: e.target.checked })} /></td>
                    <td className="px-1"><button className="text-muted hover:text-bad" onClick={() => setSel({ ...sel, fields: sel.fields.filter((_, j) => j !== i) })} aria-label="Remove field">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 items-center">
            <button className={btn} onClick={() => setSel({ ...sel, fields: [...sel.fields, { key: "", label: "", kind: "number", group: "Other" }] })}>+ Add field</button>
            <button className={btnPrimary} onClick={save}>Save type</button>
            {msg && <span className={`text-sm ${msg.ok ? "text-ok" : "text-bad"}`}>{msg.text}</span>}
          </div>
        </section>
      ) : (
        <p className="text-muted text-sm">Choose a type to edit its fields, or add a new one (e.g. Busbar support, Surge arrester).</p>
      )}
    </div>
  );
}
