"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { build as runBuild, type Build } from "@/engine/build";
import { drawingSet } from "@/engine/drawings/sheets";
import type { Lineup } from "@/engine/layout";
import { model3d } from "@/engine/model3d";
import { parseRequirements, type Requirements } from "@/engine/requirements";
import { SYSTEM } from "@/engine/system";
import { RequirementsEditor } from "./requirements-editor";
import { ChecksView, DrawingsView, FlatsView, PartsView, download } from "./views";

const Viewer3D = dynamic(() => import("./viewer3d"), { ssr: false, loading: () => <div className="h-[420px] grid place-items-center text-muted font-mono text-sm">Loading 3D…</div> });

const TABS = ["3D", "Drawings", "Parts list", "Flat patterns", "Checks"] as const;
type Tab = (typeof TABS)[number];

function LineupStrip({ lineup }: { lineup: Lineup }) {
  const zone = SYSTEM.zone.z1 - SYSTEM.zone.z0;
  return (
    <div className="flex gap-1 overflow-x-auto pb-1" aria-label="Line-up">
      {lineup.sections.map((s) => (
        <div key={s.id} className="shrink-0 w-24 rounded border border-rule bg-panel p-1.5 grid gap-1">
          <div className="flex justify-between font-mono text-[10px] text-muted"><span>{s.id}</span><span>{s.type === "incomer" ? "INC" : `${s.modules.length} fdr`}</span></div>
          <div className="h-20 rounded-sm bg-panel2 flex flex-col-reverse overflow-hidden">
            {s.type === "incomer" ? (
              <div className="m-auto text-[10px] font-mono text-muted">MTZ2</div>
            ) : (
              <>
                {s.modules.map((m) => (
                  <div key={m.tag} title={`${m.tag} ${m.kit.breaker.code} ${m.rating} A`} style={{ height: `${(m.h / zone) * 100}%` }}
                    className={`border-t border-bg flex items-center justify-center text-[9px] font-mono ${m.kit.frame === "630" ? "bg-accent text-white" : "bg-fg/70 text-bg"}`}>
                    {m.tag}
                  </div>
                ))}
                {s.spare > 0 && <div style={{ height: `${(s.spare / zone) * 100}%` }} className="border-t border-dashed border-rule text-[9px] text-muted grid place-items-center">spare</div>}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Workspace({ id, initial }: { id: string; initial: Requirements }) {
  const [req, setReq] = useState<Requirements>(initial);
  // Last requirements that passed validation: the build keeps showing while the user fixes a field.
  const [valid, setValid] = useState<Requirements>(initial);
  const [tab, setTab] = useState<Tab>("3D");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [exporting, setExporting] = useState<"" | "zip" | "pdf">("");
  const first = useRef(true);

  const parsed = useMemo(() => parseRequirements(req), [req]);
  const errors = parsed.success ? [] : [...new Set(parsed.error.issues.map((i) => `${i.path.join(" › ") || "Requirements"}: ${i.message}`))];
  const b: Build = useMemo(() => runBuild(valid), [valid]);
  const sheets = useMemo(() => (tab === "Drawings" ? drawingSet(b) : []), [b, tab]);
  const solids = useMemo(() => model3d(b), [b]);

  function update(next: Requirements) {
    setReq(next);
    const p = parseRequirements(next);
    if (p.success) { setValid(p.data); setSaveState("saving"); }
    else setSaveState("dirty");
  }

  // Autosave the last valid requirements.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/projects/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(valid) }).catch(() => null);
      setSaveState(res?.ok ? "saved" : "error");
    }, 600);
    return () => clearTimeout(t);
  }, [id, valid]);

  async function exportPackage(format: "zip" | "pdf") {
    if (!parsed.success) return;
    setExporting(format);
    const res = await fetch(`/api/export?format=${format}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
    setExporting("");
    if (!res.ok) return;
    const cd = res.headers.get("Content-Disposition") ?? "";
    const name = decodeURIComponent(cd.match(/filename\*=UTF-8''([^;]+)/)?.[1] ?? `package.${format}`);
    download(name, await res.blob(), format === "zip" ? "application/zip" : "application/pdf");
  }

  const errorsCount = b.issues.filter((i) => i.level === "error").length;
  const warnCount = b.issues.filter((i) => i.level === "warning").length;
  const feeders = b.lineup.sections.reduce((s, x) => s + x.modules.length, 0);

  return (
    <div className="flex-1 grid grid-rows-[auto_1fr]">
      <header className="border-b border-rule bg-panel">
        <div className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/" className="font-display text-xl font-bold tracking-wide">TSG-F</Link>
          <Link href="/library" className="text-sm text-muted hover:text-fg">Library</Link>
          <div className="min-w-0">
            <div className="font-medium truncate">{req.project.name || "Untitled"}</div>
            <div className="text-xs text-muted font-mono">{[req.project.client, req.project.reference, `rev ${req.project.revision}`].filter(Boolean).join(" · ")}</div>
          </div>
          <span className="text-xs font-mono text-muted" aria-live="polite">
            {saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving…" : saveState === "dirty" ? "Not saved: fix the errors" : "Save failed"}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button onClick={() => download(`${req.project.reference || id}-requirements.json`, JSON.stringify(req, null, 2), "application/json")} className="rounded-md border border-rule px-3 py-1.5 text-sm hover:bg-panel2">Requirements JSON</button>
            <button onClick={() => exportPackage("pdf")} disabled={!parsed.success || !!exporting} className="rounded-md border border-rule px-3 py-1.5 text-sm hover:bg-panel2 disabled:opacity-50">{exporting === "pdf" ? "Building PDF…" : "PDF drawings"}</button>
            <button onClick={() => exportPackage("zip")} disabled={!parsed.success || !!exporting}
              title={errorsCount ? "Some parts have no rule at this size and will be missing from the package" : undefined}
              className="rounded-md bg-accent text-white px-4 py-1.5 text-sm font-medium disabled:opacity-50">
              {exporting === "zip" ? "Packaging…" : "Download factory ZIP"}
            </button>
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-[400px_minmax(0,1fr)] min-h-0">
        <aside className="border-r border-rule bg-bg px-4 py-4 lg:overflow-y-auto lg:h-[calc(100vh-61px)]">
          <RequirementsEditor req={req} onChange={update} errors={errors} />
        </aside>

        <main className="px-4 py-4 grid gap-4 content-start min-w-0 lg:overflow-y-auto lg:h-[calc(100vh-61px)]">
          {(
            <>
              <section className="grid gap-2">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                  <span><b className="font-display text-2xl">{b.lineup.sections.length}</b> sections</span>
                  <span><b className="font-display text-2xl">{feeders}</b> feeders</span>
                  <span className="font-mono text-xs text-muted">{b.lineup.width} × {b.lineup.depth} × {b.lineup.height} mm · Form {b.req.form} · {b.req.entry} entry</span>
                  <span className="font-mono text-xs text-muted">{b.drawings.length} DXFs · {b.bom.length} part codes</span>
                  {errorsCount > 0 && <button onClick={() => setTab("Checks")} className="rounded-full bg-bad-soft text-bad px-2.5 py-0.5 text-xs font-medium">{errorsCount} blocking</button>}
                  {warnCount > 0 && <button onClick={() => setTab("Checks")} className="rounded-full bg-warn-soft text-warn px-2.5 py-0.5 text-xs font-medium">{warnCount} warnings</button>}
                </div>
                <LineupStrip lineup={b.lineup} />
              </section>

              <nav className="flex gap-1 border-b border-rule" role="tablist">
                {TABS.map((t) => (
                  <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                    className={`px-3 py-2 text-sm -mb-px border-b-2 ${tab === t ? "border-accent font-medium" : "border-transparent text-muted hover:text-fg"}`}>
                    {t}
                  </button>
                ))}
              </nav>

              {tab === "3D" && <Viewer3D solids={solids} width={b.lineup.width} depth={b.lineup.depth} height={b.lineup.height} />}
              {tab === "Drawings" && <DrawingsView sheets={sheets} />}
              {tab === "Parts list" && <PartsView build={b} />}
              {tab === "Flat patterns" && <FlatsView build={b} />}
              {tab === "Checks" && <ChecksView build={b} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
