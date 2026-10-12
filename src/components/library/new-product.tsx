"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Brand, ComponentType, Series } from "@/library/schema";
import { btnPrimary, input, label } from "./ui";

/** Category › Type → Brand → Series (existing or new) → part number. */
export function NewProductForm({ types, brands, series }: { types: ComponentType[]; brands: Brand[]; series: Series[] }) {
  const router = useRouter();
  const [typeId, setTypeId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [newSeries, setNewSeries] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const options = series.filter((s) => s.typeId === typeId && s.brandId === brandId);
  const categories = [...new Set(types.map((t) => t.category))];

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    let sid = seriesId;
    if (sid === "__new") {
      const r = await fetch("/api/library/series", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brandId, typeId, name: newSeries }) });
      const j = await r.json();
      if (!r.ok) { setError(j.error); return; }
      sid = j.id;
    }
    const r = await fetch("/api/library/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seriesId: sid, partNumber, name }) });
    const j = await r.json();
    if (!r.ok) { setError(j.error); return; }
    router.push(`/library/products/${j.id}`);
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 grid gap-4">
      <nav className="text-sm text-muted"><Link href="/library" className="hover:text-fg">Library</Link> › New product</nav>
      <h1 className="font-display text-3xl font-bold tracking-wide">Add a product</h1>
      <p className="text-sm text-muted">Pick where it belongs, then fill in its values from the manufacturer&apos;s datasheet on the next page. Products in an existing series inherit the series&apos; dimensions.</p>
      <form onSubmit={create} className="rounded-md border border-rule bg-panel p-4 grid gap-3">
        <label className={label}>Component type
          <select className={input} value={typeId} onChange={(e) => { setTypeId(e.target.value); setSeriesId(""); }} required>
            <option value="">Choose…</option>
            {categories.map((c) => <optgroup key={c} label={c}>{types.filter((t) => t.category === c).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>)}
          </select>
        </label>
        <label className={label}>Brand
          <select className={input} value={brandId} onChange={(e) => { setBrandId(e.target.value); setSeriesId(""); }} required>
            <option value="">Choose…</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <span className="normal-case tracking-normal font-sans text-xs">Brand missing? Add it under <Link href="/library/brands" className="underline">Brands</Link>.</span>
        </label>
        <label className={label}>Series / frame
          <select className={input} value={seriesId} onChange={(e) => setSeriesId(e.target.value)} required disabled={!typeId || !brandId}>
            <option value="">Choose…</option>
            {options.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            <option value="__new">+ New series…</option>
          </select>
        </label>
        {seriesId === "__new" && <label className={label}>New series name<input className={input} value={newSeries} onChange={(e) => setNewSeries(e.target.value)} placeholder="e.g. NM8N-250" required /></label>}
        <div className="grid sm:grid-cols-2 gap-3">
          <label className={label}>Part number<input className={input} value={partNumber} onChange={(e) => setPartNumber(e.target.value)} required /></label>
          <label className={label}>Name<input className={input} value={name} onChange={(e) => setName(e.target.value)} /></label>
        </div>
        {error && <p className="text-bad text-sm">{error}</p>}
        <button className={`${btnPrimary} justify-self-start`}>Create and fill in values</button>
      </form>
    </main>
  );
}
