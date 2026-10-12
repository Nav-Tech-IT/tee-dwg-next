"use client";

import { DEPTHS, FORMS, FORM_TEXT, HEIGHTS, INCOMERS, RATINGS, SYSTEM, type Frame } from "@/engine/system";
import type { Feeder, Requirements } from "@/engine/requirements";

const input = "w-full rounded-md border border-rule bg-panel px-2.5 py-1.5 text-sm";
const label = "grid gap-1 text-[11px] uppercase tracking-wider text-muted font-mono";

function Seg<T extends string | number>({ value, options, onChange, render }: { value: T; options: readonly T[]; onChange: (v: T) => void; render?: (v: T) => string }) {
  return (
    <div className="flex rounded-md border border-rule overflow-hidden text-sm" role="radiogroup">
      {options.map((o) => (
        <button key={String(o)} type="button" role="radio" aria-checked={o === value} onClick={() => onChange(o)}
          className={`flex-1 px-2.5 py-1.5 ${o === value ? "bg-fg text-bg" : "bg-panel hover:bg-panel2"}`}>
          {render ? render(o) : String(o)}
        </button>
      ))}
    </div>
  );
}

let seq = 0;
const newFeederId = () => `f${Date.now().toString(36)}${(seq++).toString(36)}`;

export function RequirementsEditor({ req, onChange, errors }: { req: Requirements; onChange: (r: Requirements) => void; errors: string[] }) {
  const set = <K extends keyof Requirements>(k: K, v: Requirements[K]) => onChange({ ...req, [k]: v });
  const setProject = (k: keyof Requirements["project"], v: string) => onChange({ ...req, project: { ...req.project, [k]: v } });
  const setFeeder = (i: number, patch: Partial<Feeder>) => {
    const feeders = req.feeders.map((f, j) => {
      if (j !== i) return f;
      const next = { ...f, ...patch };
      if (patch.frame && !RATINGS[patch.frame].includes(next.rating)) next.rating = RATINGS[patch.frame].at(-1)!;
      return next;
    });
    set("feeders", feeders);
  };
  const addFeeder = () => {
    const n = req.feeders.length + 1;
    set("feeders", [...req.feeders, { id: newFeederId(), tag: `F${n}`, description: "", frame: "250", rating: 250, poles: "3P", qty: 1 }]);
  };
  const removeFeeder = (i: number) => set("feeders", req.feeders.filter((_, j) => j !== i));
  const moduleMm = req.feeders.reduce((s, f) => s + (f.frame === "630" ? 350 : 250) * (f.qty || 0), 0);

  return (
    <div className="grid gap-5">
      {errors.length > 0 && (
        <div className="rounded-md border border-bad bg-bad-soft px-3 py-2 text-sm text-bad">
          <p className="font-medium">Fix these to update the build:</p>
          <ul className="list-disc pl-5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      <section className="grid gap-3">
        <h3 className="font-display text-lg font-semibold tracking-wide">Project</h3>
        <label className={label}>Name<input className={input} value={req.project.name} onChange={(e) => setProject("name", e.target.value)} /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className={label}>Client<input className={input} value={req.project.client} onChange={(e) => setProject("client", e.target.value)} /></label>
          <label className={label}>Order ref.<input className={input} value={req.project.reference} onChange={(e) => setProject("reference", e.target.value)} /></label>
          <label className={label}>Revision<input className={input} value={req.project.revision} onChange={(e) => setProject("revision", e.target.value)} /></label>
          <label className={label}>Date<input type="date" className={input} value={req.project.date} onChange={(e) => setProject("date", e.target.value)} /></label>
          <label className={`${label} col-span-2`}>Drawn by<input className={input} value={req.project.drawnBy} onChange={(e) => setProject("drawnBy", e.target.value)} /></label>
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="font-display text-lg font-semibold tracking-wide">Board</h3>
        <label className={label}>
          Form of separation
          <select className={input} value={req.form} onChange={(e) => set("form", e.target.value as Requirements["form"])}>
            {FORMS.map((f) => <option key={f} value={f}>Form {f}</option>)}
          </select>
          <span className="normal-case tracking-normal font-sans text-xs">{FORM_TEXT[req.form]}</span>
        </label>
        <div className={label}>Cable entry<Seg value={req.entry} options={["bottom", "top"] as const} onChange={(v) => set("entry", v)} render={(v) => (v === "bottom" ? "Bottom" : "Top")} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div className={label}>Depth<Seg value={req.depth} options={DEPTHS} onChange={(v) => set("depth", v)} /></div>
          <div className={label}>Height<Seg value={req.height} options={HEIGHTS} onChange={(v) => set("height", v)} /></div>
        </div>
        {(req.depth !== SYSTEM.ref.D || req.height !== SYSTEM.ref.H) && (
          <p className="text-xs text-warn">The reference design is {SYSTEM.ref.D} x {SYSTEM.ref.H}. At this size some standard parts have no rule yet; the Checks tab lists them.</p>
        )}
        <div className="flex items-center justify-between gap-3 rounded-md border border-rule px-3 py-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={req.incomer.enabled} onChange={(e) => set("incomer", { ...req.incomer, enabled: e.target.checked })} className="accent-[var(--accent)] size-4" />
            Incomer section
          </label>
          <select className="rounded-md border border-rule bg-panel px-2 py-1 text-sm disabled:opacity-50" disabled={!req.incomer.enabled}
            value={req.incomer.type} onChange={(e) => set("incomer", { ...req.incomer, type: e.target.value as keyof typeof INCOMERS })}>
            {Object.entries(INCOMERS).map(([k, v]) => <option key={k} value={k}>{k} · {v.rating} A</option>)}
          </select>
        </div>
      </section>

      <section className="grid gap-2">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-lg font-semibold tracking-wide">Outgoing feeders</h3>
          <span className="font-mono text-xs text-muted">{req.feeders.reduce((s, f) => s + (f.qty || 0), 0)} breakers · {moduleMm} mm of {SYSTEM.zone.z1 - SYSTEM.zone.z0} per section</span>
        </div>
        <ul className="grid gap-2">
          {req.feeders.map((f, i) => (
            <li key={f.id} className="rounded-md border border-rule bg-panel p-2 grid gap-2">
              <div className="grid grid-cols-[5.5rem_1fr_auto] gap-2 items-center">
                <input aria-label="Tag" className={`${input} font-mono`} value={f.tag} onChange={(e) => setFeeder(i, { tag: e.target.value })} />
                <input aria-label="Description" className={input} value={f.description} placeholder="Description (e.g. Pump 1)" onChange={(e) => setFeeder(i, { description: e.target.value })} />
                <button type="button" onClick={() => removeFeeder(i)} aria-label={`Remove ${f.tag}`} className="rounded-md px-2 py-1 text-muted hover:text-bad hover:bg-bad-soft">✕</button>
              </div>
              <div className="grid grid-cols-[1fr_1fr_1fr_4.5rem] gap-2">
                <select aria-label="Frame" className={input} value={f.frame} onChange={(e) => setFeeder(i, { frame: e.target.value as Frame })}>
                  <option value="250">NSX 250</option>
                  <option value="630">NSX 630</option>
                </select>
                <select aria-label="Rating" className={input} value={f.rating} onChange={(e) => setFeeder(i, { rating: Number(e.target.value) })}>
                  {RATINGS[f.frame].map((r) => <option key={r} value={r}>{r} A</option>)}
                </select>
                <Seg value={f.poles} options={["3P", "4P"] as const} onChange={(v) => setFeeder(i, { poles: v })} />
                <input aria-label="Quantity" type="number" min={1} max={50} className={`${input} font-mono`} value={f.qty}
                  onChange={(e) => setFeeder(i, { qty: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })} />
              </div>
            </li>
          ))}
        </ul>
        <button type="button" onClick={addFeeder} className="rounded-md border border-dashed border-rule px-3 py-2 text-sm hover:bg-panel2">+ Add feeder</button>
      </section>
    </div>
  );
}
