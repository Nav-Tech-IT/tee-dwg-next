// Requirements -> complete build: line-up, parts list, drawings and issues.
import { bbox, netArea, outline, pointInPoly, polyArea, type BBox, type Flat } from "./flat";
import { solveLayout, type Lineup } from "./layout";
import { RULES, type Ctx, type PartLine, type Status } from "./parts";
import { parseRequirements, type Requirements } from "./requirements";

export interface Issue {
  level: "error" | "warning" | "info";
  message: string;
  section?: string;
  part?: string;
}

export interface BomLine {
  code: string;
  name: string;
  group: string;
  step: number;
  unit: "pcs" | "m";
  kind: "made" | "bought";
  material: string;
  t: number | null;
  process: string;
  note?: string;
  status: Status;
  qty: number;
  perSection: Record<string, number>;
  flatKey?: string;
  /** kg per piece, when the part has its own drawing. */
  weight?: number;
  unsupported?: string;
}

export interface Drawing {
  key: string;
  codes: string[];
  name: string;
  material: string;
  t: number | null;
  process: string;
  status: Status;
  qty: number;
  flat: Flat;
  size: BBox;
  checks: string[];
}

export interface Build {
  req: Requirements;
  lineup: Lineup;
  lines: PartLine[];
  bom: BomLine[];
  drawings: Drawing[];
  issues: Issue[];
}

function variants(lineup: Lineup) {
  const sig = new Map<string, string>(), out: Record<string, string> = {};
  for (const s of lineup.sections) {
    if (s.type === "incomer") { out[s.id] = "I"; continue; }
    const k = s.modules.map((m) => `${m.kit.id}@${m.z}`).join("|");
    if (!sig.has(k)) sig.set(k, String.fromCharCode(65 + sig.size));
    out[s.id] = sig.get(k)!;
  }
  return out;
}

const baseName = (names: string[]) => (new Set(names).size === 1 ? names[0] : names[0].replace(/\s*\(.*\)$/, ""));

/** Sanity checks a drafter would do by eye. */
function checkFlat(flat: Flat, t: number | null): string[] {
  const out: string[] = [], o = outline(flat);
  if (!o) return ["No closed outline on the CUT layer."];
  // Several pieces can share one DXF (e.g. the 8 incomer links): a hole must sit inside one of them.
  const pieces = flat.entities.filter((e) => e.t === "poly" && e.layer === "CUT" && e.closed && Math.abs(polyArea(e.pts)) > 200) as Extract<Flat["entities"][number], { t: "poly" }>[];
  const bends = flat.entities.filter((e) => e.t === "line" && e.layer === "BEND") as Extract<Flat["entities"][number], { t: "line" }>[];
  for (const e of flat.entities) {
    if (e.t !== "circle" || e.layer !== "CUT") continue;
    const [x, y] = e.c;
    if (!pieces.some((pc) => pointInPoly(e.c, pc.pts))) out.push(`Hole Ø${(e.r * 2).toFixed(1)} at (${x}, ${y}) is outside the blank.`);
    for (const b of bends) {
      const [x1, y1] = b.a, [x2, y2] = b.b, L = Math.hypot(x2 - x1, y2 - y1);
      if (!L) continue;
      const u = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / (L * L);
      if (u < 0 || u > 1) continue;
      const d = Math.abs((x2 - x1) * (y1 - y) - (x1 - x) * (y2 - y1)) / L;
      if (d < e.r + (t ?? 1)) out.push(`Hole Ø${(e.r * 2).toFixed(1)} at (${x}, ${y}) is ${d.toFixed(1)} mm from a bend line.`);
    }
  }
  return out;
}

export function build(req: Requirements): Build {
  const lineup = solveLayout(req);
  const vmap = variants(lineup);
  const lines: PartLine[] = [];
  const issues: Issue[] = [];

  for (const s of lineup.sections) {
    const ctx: Ctx = { req, lineup, s, form: req.form, feeder: s.type === "feeder", incomer: s.type === "incomer", variant: vmap[s.id] };
    for (const { rule } of RULES) lines.push(...rule(ctx).filter((l) => l.qty > 0));
  }

  // Parts list: one line per code, summed over the line-up.
  const bomMap = new Map<string, { lines: PartLine[] }>();
  for (const l of lines) {
    const e = bomMap.get(l.code) ?? { lines: [] };
    e.lines.push(l);
    bomMap.set(l.code, e);
  }
  const drawCache = new Map<string, Flat>();
  const flatOf = (l: PartLine) => {
    if (!l.flat || !l.flatKey) return undefined;
    if (!drawCache.has(l.flatKey)) drawCache.set(l.flatKey, l.flat());
    return drawCache.get(l.flatKey)!;
  };

  const bom: BomLine[] = [...bomMap.entries()].map(([code, { lines: ls }]) => {
    const f = ls[0], perSection: Record<string, number> = {};
    for (const l of ls) perSection[l.section] = (perSection[l.section] ?? 0) + l.qty;
    const flat = flatOf(f);
    const own = flat && f.flatKey === code && f.t && f.density;
    return {
      code, name: baseName(ls.map((l) => l.name)), group: f.group, step: Math.min(...ls.map((l) => l.step)), unit: f.unit, kind: f.kind,
      material: f.material, t: f.t, process: f.process, note: f.note, status: f.status,
      qty: Math.round(ls.reduce((s, l) => s + l.qty, 0) * 100) / 100, perSection, flatKey: f.flatKey,
      weight: own ? Math.round((netArea(flat!) * f.t! * f.density!) / 1e4) / 100 : undefined,
      unsupported: ls.find((l) => l.unsupported)?.unsupported,
    };
  }).sort((a, b) => a.step - b.step || a.code.localeCompare(b.code));

  // Drawings: one per geometry, with the total quantity of every code cut from it.
  const drawMap = new Map<string, Drawing>();
  for (const b of bom) {
    if (!b.flatKey || b.kind !== "made") continue;
    if (b.unsupported) {
      issues.push({ level: "error", part: b.code, message: `${b.code} (${b.name}): ${b.unsupported} Left out of the DXF set.` });
      continue;
    }
    const flat = drawCache.get(b.flatKey);
    if (!flat) continue;
    const d = drawMap.get(b.flatKey);
    if (d) { d.codes.push(b.code); d.qty += b.qty; continue; }
    drawMap.set(b.flatKey, {
      key: b.flatKey, codes: [b.code], name: b.name, material: b.material, t: b.t, process: b.process, status: b.status,
      qty: b.qty, flat, size: bbox(flat, { cutOnly: true }), checks: checkFlat(flat, b.t),
    });
  }
  const drawings = [...drawMap.values()];

  for (const d of drawings) for (const c of d.checks) issues.push({ level: "warning", part: d.key, message: `${d.key}: ${c}` });
  for (const b of bom) if (b.status === "review") issues.push({ level: "info", part: b.code, message: `${b.code} needs an engineer's check: ${b.note ?? "rule not confirmed"}` });

  if (!req.feeders.length) issues.unshift({ level: "warning", message: "No feeders entered yet." });
  if (lineup.sections.length > 1)
    issues.push({ level: "info", message: "Section coupling (bolts between sections, busbar and PE joints) is not in the reference design yet: add it before release." });
  if (req.incomer.enabled)
    issues.push({ level: "info", message: "Incomer doors and front covers are not in the reference design yet." });

  return { req, lineup, lines, bom, drawings, issues };
}

/** Validate unknown input (e.g. a saved project file) and build it. */
export function buildFrom(input: unknown) {
  const parsed = parseRequirements(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error };
  return { ok: true as const, build: build(parsed.data) };
}
