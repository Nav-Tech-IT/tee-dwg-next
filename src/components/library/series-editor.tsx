"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Brand, ComponentType, ProductStatus, Series, Source } from "@/library/schema";
import { SpecEditor, fromDraft, toDraft, type Draft } from "./spec-editor";
import { StatusPill, btn, btnPrimary, input, label } from "./ui";

interface Item { id: string; partNumber: string; status: ProductStatus; active: boolean; complete: boolean }

export function SeriesEditor({ initial, type, brand, products, sources, history }: {
  initial: Series; type: ComponentType; brand: Brand; products: Item[]; sources: Source[]; history: { at: string; action: string; detail: string }[];
}) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [name, setName] = useState(s.name);
  const [notes, setNotes] = useState(s.notes);
  const [active, setActive] = useState(s.active);
  const [draft, setDraft] = useState<Draft>(() => toDraft(s.specs, type.fields, true));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [newPart, setNewPart] = useState("");
  const parsed = useMemo(() => fromDraft(draft, type.fields), [draft, type.fields]);
  const poleOptions = type.fields.find((f) => f.key === "poles")?.options ?? ["3", "4"];
  const dirty = JSON.stringify(parsed.specs) !== JSON.stringify(s.specs) || name !== s.name || notes !== s.notes || active !== s.active;
  const verified = products.filter((p) => p.status === "verified").length;

  async function save() {
    if (parsed.errors.length) { setMsg({ ok: false, text: parsed.errors.join(" · ") }); return; }
    if (verified && JSON.stringify(parsed.specs) !== JSON.stringify(s.specs) && !confirm(`${verified} verified product(s) use these values and will go back to Extracted. Continue?`)) return;
    setBusy(true);
    const res = await fetch(`/api/library/series/${s.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, notes, active, specs: parsed.specs }) });
    setBusy(false);
    const j = await res.json();
    if (!res.ok) { setMsg({ ok: false, text: j.error }); return; }
    setS(j);
    setMsg({ ok: true, text: "Saved." });
  }

  async function addProduct() {
    if (!newPart.trim()) return;
    const res = await fetch("/api/library/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seriesId: s.id, partNumber: newPart.trim() }) });
    const j = await res.json();
    if (res.ok) router.push(`/library/products/${j.id}`);
    else setMsg({ ok: false, text: j.error });
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 grid gap-5">
      <nav className="text-sm text-muted flex flex-wrap gap-1">
        <Link href="/library" className="hover:text-fg">Library</Link> › <Link href={`/library?type=${type.id}`} className="hover:text-fg">{type.name}</Link> › <span>{brand.name}</span>
      </nav>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2 flex-1 min-w-72 max-w-2xl">
          <h1 className="font-display text-3xl font-bold tracking-wide">{brand.name} {s.name}</h1>
          <p className="text-sm text-muted">Series = one frame / product family. Values entered here are shared by every product below; per-poles values are entered once for each pole count.</p>
          <div className="grid sm:grid-cols-2 gap-2">
            <label className={label}>Series name<input className={input} value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className={`${label} sm:col-span-2`}>Notes<textarea className={input} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active</label>
        </div>
        <button className={btnPrimary} disabled={busy || !dirty} onClick={save}>{busy ? "Saving…" : "Save series"}</button>
      </header>
      {msg && <p className={`rounded-md px-3 py-2 text-sm ${msg.ok ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"}`}>{msg.text}</p>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <SpecEditor fields={type.fields} draft={draft} onChange={setDraft} sources={sources} polesColumns={poleOptions} />
        <aside className="grid gap-4 content-start">
          <section className="rounded-md border border-rule bg-panel p-3 grid gap-2 text-sm">
            <h3 className="font-display text-base font-semibold">Products ({products.length})</h3>
            {products.map((p) => (
              <Link key={p.id} href={`/library/products/${p.id}`} className={`flex items-center justify-between gap-2 hover:text-accent ${p.active ? "" : "opacity-50"}`}>
                <span className="font-mono text-xs truncate">{p.partNumber}</span><StatusPill status={p.status} />
              </Link>
            ))}
            <div className="flex gap-1.5 pt-1">
              <input className={input} placeholder="New part number" value={newPart} onChange={(e) => setNewPart(e.target.value)} />
              <button className={btn} onClick={addProduct}>Add</button>
            </div>
          </section>
          <section className="rounded-md border border-rule bg-panel p-3 grid gap-1 text-xs">
            <h3 className="font-display text-base font-semibold">History</h3>
            {history.map((h, i) => <div key={i}><span className="font-mono text-muted">{h.at.slice(0, 16)}</span> {h.action}</div>)}
          </section>
        </aside>
      </div>
    </main>
  );
}
