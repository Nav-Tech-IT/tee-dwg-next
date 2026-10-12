"use client";

import { useMemo, useState } from "react";
import type { Build, Drawing } from "@/engine/build";
import type { Sheet } from "@/engine/drawings/sheet";
import { toDxf } from "@/engine/export/dxf";
import { bomCsv } from "@/engine/export/csv";
import { flatToSvg, sheetToSvg } from "@/engine/export/svg";

export function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const STATUS_LABEL = { parametric: "Generated", fixed: "Standard", review: "Check" } as const;

export function StatusBadge({ status, unsupported }: { status: keyof typeof STATUS_LABEL; unsupported?: string }) {
  if (unsupported) return <span title={unsupported} className="rounded-full bg-bad-soft text-bad px-2 py-0.5 text-[11px] font-medium whitespace-nowrap">No rule</span>;
  const cls = status === "parametric" ? "bg-ok-soft text-ok" : status === "review" ? "bg-warn-soft text-warn" : "bg-panel2 text-muted";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${cls}`}>{STATUS_LABEL[status]}</span>;
}

/* ---------- Drawings ---------- */

export function DrawingsView({ sheets }: { sheets: Sheet[] }) {
  const [i, setI] = useState(0);
  const cur = sheets[Math.min(i, sheets.length - 1)];
  const svg = useMemo(() => (cur ? sheetToSvg(cur) : ""), [cur]);
  if (!cur) return null;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0} className="rounded-md border border-rule bg-panel px-3 py-1.5 text-sm disabled:opacity-40">← Prev</button>
        <select value={i} onChange={(e) => setI(Number(e.target.value))} className="rounded-md border border-rule bg-panel px-2 py-1.5 text-sm" aria-label="Sheet">
          {sheets.map((s, k) => <option key={s.id} value={k}>{k + 1}. {s.title}{s.id.match(/-\d+$/) ? ` (${s.id.split("-").at(-1)})` : ""}</option>)}
        </select>
        <button onClick={() => setI((v) => Math.min(sheets.length - 1, v + 1))} disabled={i === sheets.length - 1} className="rounded-md border border-rule bg-panel px-3 py-1.5 text-sm disabled:opacity-40">Next →</button>
        <span className="font-mono text-xs text-muted ml-auto">Sheet {i + 1} of {sheets.length} · A3 · same as the PDF</span>
      </div>
      <div className="sheet rounded-md border border-rule bg-paper p-2 overflow-auto" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}

/* ---------- Parts list ---------- */

export function PartsView({ build }: { build: Build }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "made" | "bought">("all");
  const ids = build.lineup.sections.map((s) => s.id);
  const rows = build.bom.filter((l) => (kind === "all" || l.kind === kind) && (`${l.code} ${l.name} ${l.group}`.toLowerCase().includes(q.toLowerCase())));
  const groups = [...new Set(rows.map((r) => r.group))];
  const steel = build.bom.reduce((s, l) => s + (l.weight ?? 0) * l.qty, 0);
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code or name" className="rounded-md border border-rule bg-panel px-3 py-1.5 text-sm w-64 max-w-full" />
        <div className="flex rounded-md border border-rule overflow-hidden text-sm">
          {(["all", "made", "bought"] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k} className={`px-3 py-1.5 ${kind === k ? "bg-fg text-bg" : "bg-panel"}`}>{k === "all" ? "All" : k === "made" ? "Made" : "Bought"}</button>
          ))}
        </div>
        <span className="font-mono text-xs text-muted">{build.bom.length} codes · made parts ≈ {Math.round(steel)} kg</span>
        <button onClick={() => download(`${build.req.project.reference || "parts"}-parts-list.csv`, bomCsv(build), "text/csv")} className="ml-auto rounded-md border border-rule bg-panel px-3 py-1.5 text-sm hover:bg-panel2">Download CSV</button>
      </div>
      <div className="overflow-x-auto rounded-md border border-rule bg-panel">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-muted font-mono">
            <tr className="border-b border-rule">
              <th className="px-3 py-2">Code</th><th className="px-3 py-2">Name</th><th className="px-3 py-2 text-right">Qty</th>
              {ids.map((id) => <th key={id} className="px-2 py-2 text-right">{id}</th>)}
              <th className="px-3 py-2">Material</th><th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g}>
              <tr><td colSpan={5 + ids.length} className="px-3 pt-3 pb-1 font-display text-base font-semibold tracking-wide">{g}</td></tr>
              {rows.filter((r) => r.group === g).map((r) => (
                <tr key={r.code} className="border-t border-rule/60 hover:bg-panel2 align-top">
                  <td className="px-3 py-1.5 font-mono text-xs whitespace-nowrap">{r.code}</td>
                  <td className="px-3 py-1.5">{r.name}{r.note && <div className="text-xs text-muted">{r.note}</div>}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums whitespace-nowrap">{r.qty}{r.unit === "m" ? " m" : ""}</td>
                  {ids.map((id) => <td key={id} className="px-2 py-1.5 text-right font-mono text-xs text-muted tabular-nums">{r.perSection[id] ?? ""}</td>)}
                  <td className="px-3 py-1.5 text-xs text-muted">{r.material}{r.t ? ` ${r.t} mm` : ""}</td>
                  <td className="px-3 py-1.5">{r.kind === "made" ? <StatusBadge status={r.status} unsupported={r.unsupported} /> : r.status === "review" ? <StatusBadge status="review" /> : <span className="text-xs text-muted">Buy</span>}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}

/* ---------- Flat patterns ---------- */

function FlatCard({ d, onOpen }: { d: Drawing; onOpen: () => void }) {
  const svg = useMemo(() => flatToSvg(d.flat), [d.flat]);
  return (
    <button onClick={onOpen} className="text-left rounded-md border border-rule bg-panel hover:border-fg grid grid-rows-[9rem_auto] overflow-hidden">
      <div className="thumb bg-paper p-2" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="p-2.5 grid gap-1 border-t border-rule">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-medium truncate">{d.key}</span>
          <StatusBadge status={d.status} />
        </div>
        <div className="text-xs text-muted truncate">{d.material} {d.t} mm</div>
        <div className="flex justify-between text-xs font-mono"><span>×{d.qty}</span><span className="text-muted">{(d.size.x1 - d.size.x0).toFixed(0)} × {(d.size.y1 - d.size.y0).toFixed(0)}</span></div>
        {d.checks.length > 0 && <div className="text-[11px] text-warn">{d.checks.length} check{d.checks.length > 1 ? "s" : ""}</div>}
      </div>
    </button>
  );
}

export function FlatsView({ build }: { build: Build }) {
  const [open, setOpen] = useState<Drawing | null>(null);
  const [mat, setMat] = useState("all");
  const mats = [...new Set(build.drawings.map((d) => `${d.material} ${d.t} mm`))];
  const list = build.drawings.filter((d) => mat === "all" || `${d.material} ${d.t} mm` === mat);
  const big = useMemo(() => (open ? flatToSvg(open.flat, { text: true }) : ""), [open]);
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={mat} onChange={(e) => setMat(e.target.value)} className="rounded-md border border-rule bg-panel px-2 py-1.5 text-sm" aria-label="Material">
          <option value="all">All materials ({build.drawings.length})</option>
          {mats.map((m) => <option key={m} value={m}>{m} ({build.drawings.filter((d) => `${d.material} ${d.t} mm` === m).length})</option>)}
        </select>
        <span className="text-xs text-muted">Red dashed lines are bends. Click a part to open it and download its DXF.</span>
      </div>
      <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(13rem,1fr))]">
        {list.map((d) => <FlatCard key={d.key} d={d} onOpen={() => setOpen(d)} />)}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={() => setOpen(null)}>
          <div className="w-full max-w-5xl max-h-[92vh] overflow-auto rounded-md bg-panel border border-rule grid gap-3 p-4" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={open.key}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-mono font-medium">{open.key}</div>
                <div className="text-sm text-muted">{open.name} · {open.material} {open.t} mm · {open.process}</div>
                <div className="text-sm">Qty {open.qty}{open.codes.length > 1 || open.codes[0] !== open.key ? ` · codes ${open.codes.join(", ")}` : ""}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => download(`${open.key}.dxf`, toDxf(open.flat), "application/dxf")} className="rounded-md bg-accent text-white px-3 py-1.5 text-sm font-medium">Download DXF</button>
                <button onClick={() => setOpen(null)} className="rounded-md border border-rule px-3 py-1.5 text-sm">Close</button>
              </div>
            </div>
            {open.checks.length > 0 && <ul className="text-sm text-warn list-disc pl-5">{open.checks.map((c) => <li key={c}>{c}</li>)}</ul>}
            <div className="thumb bg-paper rounded-md border border-rule p-3 h-[65vh]" dangerouslySetInnerHTML={{ __html: big }} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Checks ---------- */

export function ChecksView({ build }: { build: Build }) {
  const by = (l: "error" | "warning" | "info") => build.issues.filter((i) => i.level === l);
  const blocks = [
    { l: "error" as const, title: "Blocking: no rule for this size", cls: "border-bad bg-bad-soft text-bad" },
    { l: "warning" as const, title: "Geometry warnings", cls: "border-warn bg-warn-soft text-warn" },
    { l: "info" as const, title: "To confirm before release", cls: "border-rule bg-panel text-fg" },
  ];
  const counts = { parametric: 0, fixed: 0, review: 0 };
  for (const d of build.drawings) counts[d.status]++;
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat n={counts.parametric} label="Generated drawings" note="from this order's sizes and layout" tone="ok" />
        <Stat n={counts.fixed} label="Standard drawings" note="same for every order" />
        <Stat n={counts.review} label="Drawings to check" note="new rule, engineer to confirm" tone="warn" />
      </div>
      {blocks.map(({ l, title, cls }) => by(l).length > 0 && (
        <section key={l} className={`rounded-md border px-4 py-3 ${cls}`}>
          <h3 className="font-medium mb-1">{title} ({by(l).length})</h3>
          <ul className="list-disc pl-5 text-sm grid gap-0.5">{by(l).map((i, k) => <li key={k}>{i.message}</li>)}</ul>
        </section>
      ))}
      {build.issues.length === 0 && <p className="text-ok">No issues.</p>}
    </div>
  );
}

function Stat({ n, label, note, tone }: { n: number; label: string; note: string; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-md border border-rule bg-panel px-4 py-3">
      <div className={`font-display text-3xl font-bold ${tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : ""}`}>{n}</div>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs text-muted">{note}</div>
    </div>
  );
}
