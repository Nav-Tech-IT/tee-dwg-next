"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ProductRow } from "@/library/repo";
import { formatValue, resolveProduct } from "@/library/resolve";
import type { ProductStatus, Source } from "@/library/schema";
import { SpecEditor, fromDraft, toDraft, type Draft } from "./spec-editor";
import { StatusPill, btn, btnPrimary, input, label } from "./ui";

type History = { at: string; action: string; detail: string }[];

export function ProductEditor({ initial, sources, history }: { initial: ProductRow; sources: Source[]; history: History }) {
  const [row, setRow] = useState(initial);
  const { type, series, brand } = row;
  const [partNumber, setPartNumber] = useState(row.product.partNumber);
  const [name, setName] = useState(row.product.name);
  const [active, setActive] = useState(row.product.active);
  const [files, setFiles] = useState<string[]>(row.product.files);
  const [draft, setDraft] = useState<Draft>(() => toDraft(row.product.specs, type.fields, false));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const parsed = useMemo(() => fromDraft(draft, type.fields), [draft, type.fields]);
  // Live completeness of what is on screen (not yet saved).
  const live = useMemo(() => resolveProduct(type, series, { ...row.product, specs: parsed.specs }), [type, series, row.product, parsed.specs]);
  const dirty = JSON.stringify(parsed.specs) !== JSON.stringify(row.product.specs) || partNumber !== row.product.partNumber || name !== row.product.name || active !== row.product.active || JSON.stringify(files) !== JSON.stringify(row.product.files);

  async function save() {
    if (parsed.errors.length) { setMsg({ ok: false, text: parsed.errors.join(" · ") }); return; }
    setBusy(true);
    const res = await fetch(`/api/library/products/${row.product.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ partNumber, name, active, files, specs: parsed.specs }) });
    setBusy(false);
    const j = await res.json();
    if (!res.ok) { setMsg({ ok: false, text: j.error }); return; }
    setRow(j);
    setMsg({ ok: true, text: row.product.status === "verified" && j.product.status !== "verified" ? "Saved. Values changed, so the product is back to Extracted: verify it again." : "Saved." });
  }

  async function setStatus(status: ProductStatus) {
    setBusy(true);
    const res = await fetch(`/api/library/products/${row.product.id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setBusy(false);
    const j = await res.json();
    if (!res.ok) { setMsg({ ok: false, text: j.error }); return; }
    setRow(j);
    setMsg({ ok: true, text: status === "verified" ? "Verified: this product can now be used in designs." : "Status changed." });
  }

  const poles = String(live.values.poles?.value ?? "");
  const attachable = sources.filter((s) => s.file || s.url);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 grid gap-5">
      <nav className="text-sm text-muted flex flex-wrap gap-1">
        <Link href="/library" className="hover:text-fg">Library</Link> ›
        <Link href={`/library?type=${type.id}`} className="hover:text-fg">{type.name}</Link> ›
        <Link href={`/library?brand=${brand.id}`} className="hover:text-fg">{brand.name}</Link> ›
        <Link href={`/library/series/${series.id}`} className="hover:text-fg">{series.name}</Link>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2 min-w-72 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-bold tracking-wide">{row.product.partNumber}</h1>
            <StatusPill status={row.product.status} />
            {!row.product.active && <span className="text-xs text-muted">deactivated</span>}
          </div>
          <div className="grid sm:grid-cols-2 gap-2 max-w-2xl">
            <label className={label}>Part number<input className={input} value={partNumber} onChange={(e) => setPartNumber(e.target.value)} /></label>
            <label className={label}>Name<input className={input} value={name} onChange={(e) => setName(e.target.value)} /></label>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active (deactivated products stay in old projects but cannot be picked for new ones)</label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btnPrimary} disabled={busy || !dirty} onClick={save}>{busy ? "Saving…" : "Save"}</button>
          {row.product.status !== "verified" ? (
            <button className={btn} disabled={busy || dirty || !row.resolved.complete} onClick={() => setStatus("verified")}
              title={dirty ? "Save first" : row.resolved.complete ? "I have checked every value against its source" : "Fill in and source every required value first"}>
              Mark verified
            </button>
          ) : (
            <button className={btn} disabled={busy} onClick={() => setStatus("extracted")}>Withdraw verification</button>
          )}
        </div>
      </header>

      {msg && <p className={`rounded-md px-3 py-2 text-sm ${msg.ok ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"}`}>{msg.text}</p>}

      <section className={`rounded-md border px-4 py-3 text-sm ${live.complete ? "border-ok bg-ok-soft" : "border-warn bg-warn-soft"}`}>
        {live.complete ? (
          <p className="text-ok">Every required value is filled in and has a source{row.product.status !== "verified" ? ". Check them against the documents, then mark the product verified." : "."}</p>
        ) : (
          <div className="text-warn grid gap-1">
            <p className="font-medium">Not ready for design yet.</p>
            {live.missing.length > 0 && <p>Missing: {live.missing.map((f) => f.label).join(", ")}</p>}
            {live.unsourced.length > 0 && <p>No source: {live.unsourced.map((f) => f.label).join(", ")}</p>}
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid gap-3 content-start">
          <p className="text-sm text-muted">
            Values left empty here come from the series <Link href={`/library/series/${series.id}`} className="underline">{series.name}</Link> (shown greyed).
            Fill a value here only where this product differs.{poles && ` Per-poles values are read for ${poles}P.`}
          </p>
          <SpecEditor fields={type.fields} draft={draft} onChange={setDraft} sources={sources} inherited={series.specs} productPoles={poles} />
        </div>

        <aside className="grid gap-4 content-start">
          <section className="rounded-md border border-rule bg-panel p-3 grid gap-2 text-sm">
            <h3 className="font-display text-base font-semibold">Effective values</h3>
            <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-xs">
              {type.fields.filter((f) => live.values[f.key]).map((f) => (
                <div key={f.key} className="contents">
                  <dt className="text-muted truncate">{f.label}</dt>
                  <dd className="font-mono text-right">{formatValue(live.values[f.key].value, f.unit)}{live.values[f.key].from === "series" && <span className="text-muted"> ˢ</span>}</dd>
                </div>
              ))}
            </dl>
            <p className="text-[11px] text-muted">ˢ = from the series</p>
          </section>

          <section className="rounded-md border border-rule bg-panel p-3 grid gap-2 text-sm">
            <h3 className="font-display text-base font-semibold">Files</h3>
            <p className="text-xs text-muted">Datasheets, drawings and 3D models for this product. Upload them under <Link href="/library/sources" className="underline">Sources & files</Link>.</p>
            {attachable.length === 0 && <p className="text-xs text-muted">No files uploaded yet.</p>}
            {attachable.map((s) => (
              <label key={s.id} className="flex items-start gap-2 text-xs">
                <input type="checkbox" checked={files.includes(s.id)} onChange={(e) => setFiles(e.target.checked ? [...files, s.id] : files.filter((x) => x !== s.id))} />
                <span>{s.title} <span className="text-muted">({s.kind})</span>
                  {s.file && <a href={`/api/library/files/${s.file}`} target="_blank" className="ml-1 underline">open</a>}
                </span>
              </label>
            ))}
          </section>

          <section className="rounded-md border border-rule bg-panel p-3 grid gap-1 text-xs">
            <h3 className="font-display text-base font-semibold">History</h3>
            {history.map((h, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr] gap-2"><span className="font-mono text-muted">{h.at.slice(0, 16)}</span><span>{h.action}{(() => { try { const d = JSON.parse(h.detail); return d.changed?.length ? `: ${d.changed.join(", ")}` : d.reason ? `: ${d.reason}` : ""; } catch { return ""; } })()}</span></div>
            ))}
          </section>
        </aside>
      </div>
    </main>
  );
}
