// Requirements -> line-up. Decides how many sections the board needs and where
// every feeder sits. All later steps (parts, drawings, 3D) read this result.
import type { Feeder, Requirements } from "./requirements";
import { KITS, SYSTEM, kitFor, type Kit } from "./system";

export interface Module {
  /** Position label inside the section, bottom to top: F1, F2 … (as on the original drawings). */
  pos: string;
  tag: string;
  description: string;
  rating: number;
  kit: Kit;
  /** Bottom of the module, from the top of the plinth. */
  z: number;
  h: number;
}

export interface Section {
  id: string; // S1, S2 …
  index: number;
  type: "incomer" | "feeder";
  W: number;
  D: number;
  H: number;
  /** Left edge in the line-up. */
  x0: number;
  modules: Module[];
  /** Unused height at the top of the feeder zone, closed by a blank cover. */
  spare: number;
  ends: { left: boolean; right: boolean };
}

export interface Lineup {
  sections: Section[];
  width: number;
  depth: number;
  height: number;
}

interface Unit { tag: string; description: string; rating: number; kit: Kit; order: number }

function expand(feeders: Feeder[]): Unit[] {
  const units: Unit[] = [];
  feeders.forEach((f, i) => {
    for (let k = 0; k < f.qty; k++) {
      units.push({
        tag: f.qty > 1 ? `${f.tag}-${k + 1}` : f.tag,
        description: f.description,
        rating: f.rating,
        kit: kitFor(f.frame, f.poles),
        order: i * 1000 + k,
      });
    }
  });
  return units;
}

/**
 * Fewest sections for the feeder modules (350 and 250 high in a 1200 zone).
 * Exact search over how many of each module height go in a section: first-fit
 * would waste sections (5 x 630 + 11 x 250 needs 4 sections, first-fit gives 5).
 * Returns, per section, how many big and small modules it takes, fullest first.
 */
function packCounts(big: number, small: number, hb: number, hs: number, cap: number): [number, number][] {
  const patterns: [number, number][] = [];
  for (let i = 0; i * hb <= cap; i++) for (let j = 0; i * hb + j * hs <= cap; j++) if (i + j) patterns.push([i, j]);
  const memo = new Map<string, { n: number; fill: number; pick?: [number, number] }>();
  const solve = (a: number, b: number): { n: number; fill: number; pick?: [number, number] } => {
    if (!a && !b) return { n: 0, fill: 0 };
    const key = `${a},${b}`;
    if (memo.has(key)) return memo.get(key)!;
    let best = { n: Infinity, fill: -1 } as { n: number; fill: number; pick?: [number, number] };
    for (const [i, j] of patterns) {
      if (i > a || j > b) continue;
      const r = solve(a - i, b - j), n = r.n + 1, fill = i * hb + j * hs;
      // Same count: prefer the fullest first section, so the spare space ends up at the end of the line-up.
      if (n < best.n || (n === best.n && fill > best.fill)) best = { n, fill, pick: [i, j] };
    }
    memo.set(key, best);
    return best;
  };
  const out: [number, number][] = [];
  for (let a = big, b = small; a || b; ) {
    const p = solve(a, b).pick!;
    out.push(p);
    a -= p[0]; b -= p[1];
  }
  return out;
}

function firstFit(units: Unit[], cap: number) {
  const bins: Unit[][] = [];
  for (const u of units) {
    const bin = bins.find((b) => b.reduce((s, x) => s + x.kit.module, 0) + u.kit.module <= cap);
    if (bin) bin.push(u);
    else bins.push([u]);
  }
  return bins;
}

/**
 * Inside a section the heavier breakers go to the bottom, as in the reference layout
 * (630 4P at 400, 630 3P at 750, 250 4P at 1100, 250 3P at 1350).
 */
export function solveLayout(req: Requirements): Lineup {
  const cap = SYSTEM.zone.z1 - SYSTEM.zone.z0;
  const rank = (u: Unit) => u.kit.module * 10 + (u.kit.poles === "4P" ? 1 : 0);
  const units = expand(req.feeders).sort((a, b) => rank(b) - rank(a) || a.order - b.order);

  const heights = [...new Set(units.map((u) => u.kit.module))].sort((a, b) => b - a);
  let bins: Unit[][];
  if (heights.length <= 2) {
    const [hb, hs = 1] = heights;
    const big = units.filter((u) => u.kit.module === hb), small = units.filter((u) => u.kit.module !== hb);
    bins = packCounts(big.length, small.length, hb, hs, cap).map(([i, j]) => [...big.splice(0, i), ...small.splice(0, j)]);
  } else {
    bins = firstFit(units, cap);
  }

  const W = SYSTEM.ref.W, D = req.depth, H = req.height;
  const sections: Section[] = [];
  let x0 = 0;
  const push = (type: Section["type"], units: Unit[]) => {
    let z = SYSTEM.zone.z0;
    const modules = units.map((u, i) => {
      const m: Module = { pos: `F${i + 1}`, tag: u.tag, description: u.description, rating: u.rating, kit: u.kit, z, h: u.kit.module };
      z += u.kit.module;
      return m;
    });
    const index = sections.length;
    sections.push({
      id: `S${index + 1}`, index, type, W, D, H, x0, modules,
      spare: type === "feeder" ? SYSTEM.zone.z1 - z : 0,
      ends: { left: false, right: false },
    });
    x0 += W;
  };

  if (req.incomer.enabled) push("incomer", []);
  bins.forEach((b) => push("feeder", b));
  if (sections.length) {
    sections[0].ends.left = true;
    sections[sections.length - 1].ends.right = true;
  }
  return { sections, width: x0, depth: D, height: H + SYSTEM.plinth };
}

export const allKits = Object.values(KITS);
