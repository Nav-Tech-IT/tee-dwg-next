"use client";

import Link from "next/link";
import { useState } from "react";
import type { PreviewRow } from "@/library/importer";
import type { ComponentType } from "@/library/schema";
import { btn, btnPrimary } from "./ui";

export function Importer({ types }: { types: ComponentType[] }) {
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ created: number; updated: number } | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr(""); setDone(null); setBusy(true);
    const fd = new FormData();
    fd.append("file", f);
    const r = await fetch("/api/library/import?step=preview", { method: "POST", body: fd });
    setBusy(false);
    const j = await r.json();
    if (!r.ok) { setErr(j.error); return; }
    setRows(j.rows); setUnknown(j.unknownColumns);
  }
  async function commit() {
    if (!rows) return;
    setBusy(true);
    const r = await fetch("/api/library/import?step=commit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
    setBusy(false);
    const j = await r.json();
    if (!r.ok) { setErr(j.error); return; }
    setDone(j); setRows(null);
  }
  const ok = rows?.filter((r) => !r.errors.length).length ?? 0;

  return (
    <div className="grid gap-4">
      <section className="rounded-md border border-rule bg-panel p-4 grid gap-3 text-sm">
        <p>One row per product. Columns: <code className="font-mono text-xs">brand, type, series, part_number, name</code>, then any field keys of the type (e.g. <code className="font-mono text-xs">rating, poles, width, height, depth</code>), then <code className="font-mono text-xs">source_title, source_url, source_page</code>.</p>
        <p className="text-muted">Points (fixing holes) are written as <code className="font-mono">x, y; x, y</code>. New brands and series are created; existing products are updated. Imported products are never verified automatically.</p>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-muted">Download a template:</span>
          {types.map((t) => <a key={t.id} href={`/api/library/template?type=${t.id}`} className="underline text-xs">{t.name}</a>)}
        </div>
        <label className="flex items-center gap-3"><span className={btnPrimary}>Choose .xlsx or .csv</span><input type="file" accept=".csv,.xlsx" onChange={upload} className="sr-only" /></label>
        {busy && <p className="text-muted">Working…</p>}
        {err && <p className="text-bad">{err}</p>}
        {done && <p className="text-ok">Imported: {done.created} new, {done.updated} updated. <Link className="underline" href="/library?status=extracted">Review them</Link>.</p>}
      </section>

      {rows && (
        <section className="grid gap-2">
          <div className="flex items-center gap-3">
            <button className={btnPrimary} disabled={!ok || busy} onClick={commit}>Import {ok} row{ok === 1 ? "" : "s"}</button>
            <button className={btn} onClick={() => setRows(null)}>Cancel</button>
            {rows.length - ok > 0 && <span className="text-bad text-sm">{rows.length - ok} row(s) have errors and will be skipped</span>}
          </div>
          {unknown.length > 0 && <p className="text-warn text-sm">Ignored columns (not a field of any type): {unknown.join(", ")}</p>}
          <div className="overflow-x-auto rounded-md border border-rule bg-panel">
            <table className="w-full text-xs">
              <thead className="text-left uppercase tracking-wider text-muted font-mono text-[10px]"><tr className="border-b border-rule">{["Line", "Action", "Brand", "Type", "Series", "Part number", "Values", "Source", "Problems"].map((h) => <th key={h} className="px-2 py-1.5">{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.line} className={`border-t border-rule/60 align-top ${r.errors.length ? "bg-bad-soft" : ""}`}>
                    <td className="px-2 py-1 font-mono">{r.line}</td>
                    <td className="px-2 py-1">{r.action}{r.newBrand && <div className="text-warn">new brand</div>}{r.newSeries && <div className="text-warn">new series</div>}</td>
                    <td className="px-2 py-1">{r.brand}</td><td className="px-2 py-1">{r.type}</td><td className="px-2 py-1">{r.series}</td>
                    <td className="px-2 py-1 font-mono">{r.partNumber}</td>
                    <td className="px-2 py-1">{Object.keys(r.specs).join(", ")}</td>
                    <td className="px-2 py-1">{r.source ? `${r.source.title}${r.source.page ? ` p.${r.source.page}` : ""}` : "—"}</td>
                    <td className="px-2 py-1">{[...r.errors.map((e) => <div key={e} className="text-bad">{e}</div>), ...r.warnings.map((w) => <div key={w} className="text-warn">{w}</div>)]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
