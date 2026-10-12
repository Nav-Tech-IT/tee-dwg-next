// Line-up -> simplified 3D review model. Pure data (no three.js), so it can be
// rendered in the browser or exported later. Model axes: x along the line-up,
// y front (0) to back (D), z up from the floor.
import type { Build } from "./build";
import { outline, type Flat, type Pt } from "./flat";
import { blankCoverFlat, feederCoverFlat, shelfLevels } from "./generators/layout-parts";
import type { Section } from "./layout";
import { FORM2_UP, FORM3_UP, SYSTEM } from "./system";

export const GROUPS3D = [
  "Plinth", "Frame", "Roof", "Panels", "Busbars", "Barriers", "Feeder units", "Breakers", "Cable alley", "Form 3/4", "Covers", "Doors", "Incomer",
] as const;
export type Group3D = (typeof GROUPS3D)[number];

export type Shape =
  | { k: "box"; size: [number, number, number] }
  | { k: "cyl"; r: number; h: number }
  /** Flat plate in a vertical plane facing the front (x right, z up), extruded along y. */
  | { k: "plate"; outline: Pt[]; holes: Pt[][]; t: number }
  /** Constant profile in the y-z plane extruded along x. */
  | { k: "profileX"; profile: Pt[]; length: number };

export interface Solid {
  id: string;
  section: string;
  group: Group3D;
  label: string;
  shape: Shape;
  /** Box/plate/profile: min corner. Cylinder: centre of the base. */
  pos: [number, number, number];
  /** Rotation about z, degrees (used for side plinth channels). */
  rotZ?: number;
  color: string;
  opacity?: number;
  explode: [number, number, number];
}

const COL = {
  galv: "#b9c2c9", powder: "#d9dbd6", dark: "#4b5762", copper: "#c8794a", gpo: "#b65a3f", breaker: "#33393f", pe: "#9cba2f", panel: "#cfd3cf", door: "#e2e3de",
};

function flatPlate(f: Flat): { outline: Pt[]; holes: Pt[][] } {
  const out = outline(f) ?? [];
  const holes: Pt[][] = [];
  for (const e of f.entities) {
    if (e.layer !== "CUT") continue;
    if (e.t === "poly" && e.closed && e.pts !== out) {
      // Features that cross the edge (notches) are cut from the outline instead of being holes.
      const inside = e.pts.every(([x, y]) => x >= 0 && y >= 0);
      if (inside) holes.push(e.pts);
    } else if (e.t === "circle" && e.r > 2) {
      const n = 12;
      holes.push(Array.from({ length: n }, (_, i) => [e.c[0] + e.r * Math.cos((i / n) * 2 * Math.PI), e.c[1] + e.r * Math.sin((i / n) * 2 * Math.PI)] as Pt));
    }
  }
  return { outline: out, holes };
}

function sectionSolids(b: Build, s: Section): Solid[] {
  const out: Solid[] = [], { W, D, H, x0 } = s, PL = SYSTEM.plinth, top = PL + H;
  const feeder = s.type === "feeder", form = b.req.form;
  let k = 0;
  const add = (group: Group3D, label: string, shape: Shape, pos: [number, number, number], color: string, explode: [number, number, number], extra: Partial<Solid> = {}) =>
    out.push({ id: `${s.id}-${k++}`, section: s.id, group, label, shape, pos: [pos[0] + x0, pos[1], pos[2]], color, explode, ...extra });
  const box = (sx: number, sy: number, sz: number): Shape => ({ k: "box", size: [sx, sy, sz] });

  /* Plinth: C-channels 40/100/40 */
  const C: Pt[] = [[0, 0], [40, 0], [40, 2], [2, 2], [2, 98], [40, 98], [40, 100], [0, 100]];
  add("Plinth", "PLF plinth front", { k: "profileX", profile: C, length: W }, [0, 0, 0], COL.dark, [0, -120, -250]);
  add("Plinth", "PLF plinth rear", { k: "profileX", profile: C.map(([y, z]) => [D - y, z] as Pt), length: W }, [0, 0, 0], COL.dark, [0, 120, -250]);
  add("Plinth", "PLS plinth left", box(40, D - 80, 100), [0, 40, 0], COL.dark, [-120, 0, -250]);
  add("Plinth", "PLS plinth right", box(40, D - 80, 100), [W - 40, 40, 0], COL.dark, [120, 0, -250]);

  /* Frame: P50 uprights and members */
  for (const [x, y] of [[0, 0], [W - 50, 0], [0, D - 50], [W - 50, D - 50]])
    add("Frame", `P50-${H} upright`, box(50, 50, H), [x, y, PL], COL.galv, [x ? 110 : -110, y ? 110 : -110, 0]);
  for (const z of [PL, top - 50]) {
    for (const y of [0, D - 50]) add("Frame", `P50-${W - 100} width member`, box(W - 100, 50, 50), [50, y, z], COL.galv, [0, y ? 170 : -170, z > PL ? 180 : 0]);
    for (const x of [0, W - 50]) add("Frame", `P50-${D - 100} depth member`, box(50, D - 100, 50), [x, 50, z], COL.galv, [x ? 170 : -170, 0, z > PL ? 180 : 0]);
  }

  /* Roof and lifting */
  add("Roof", "Roof tray", box(W, D, 30), [0, 0, top], COL.powder, [0, 0, 300]);
  for (const [x, y] of [[0, 0], [W - 100, 0], [0, D - 100], [W - 100, D - 100]]) {
    add("Roof", "LP-12 lifting plate", box(100, 100, 12), [x, y, top + 30], COL.galv, [0, 0, 420]);
    add("Roof", "Eyebolt M12", { k: "cyl", r: 16, h: 70 }, [x + 25, y + 25, top + 42], COL.dark, [0, 0, 520]);
  }

  /* Panels */
  if (s.ends.left) add("Panels", "Side panel L", box(1.5, D, H), [-1.5, 0, PL], COL.panel, [-260, 0, 0]);
  if (s.ends.right) add("Panels", "Side panel R", box(1.5, D, H), [W, 0, PL], COL.panel, [260, 0, 0]);
  add("Panels", "Rear panel", box(W, 1.5, H), [0, D, PL], COL.panel, [0, 260, 0]);

  /* Busbar chamber: 4 packs of 2 x 80x10, stacked N, B, Y, R from the bottom */
  const packZ = (i: number) => PL + SYSTEM.zone.z1 + 20 + i * 100;
  ["N", "B", "Y", "R"].forEach((ph, i) => {
    for (const y of [D - 90, D - 70]) add("Busbars", `Main busbar ${ph}`, box(730, 10, 80), [35, y, packZ(i)], COL.copper, [0, 0, 0]);
  });
  for (const x of [60, W - 72]) add("Busbars", "BS-4P80 support", box(12, 125, top - packZ(0) + 10), [x, D - 130, packZ(0) - 10], COL.gpo, [x < W / 2 ? -140 : 140, 0, 0]);
  if (feeder) {
    // Risers N, R, Y, B at the link positions; each reaches its own pack.
    const pack = { N: 0, B: 1, Y: 2, R: 3 } as const;
    (["N", "R", "Y", "B"] as const).forEach((ph, i) => {
      const t = packZ(pack[ph]) + 80, L = { N: 1350, B: 1450, Y: 1550, R: 1650 }[ph];
      add("Busbars", `BV riser ${ph}`, box(60, 10, L), [110 + i * 100, D - 170, t - L], COL.copper, [0, -100, 0]);
    });
    for (const z of [400, 750, 1100, 1450]) add("Busbars", "Riser support member P50", box(W - 100, 50, 50), [50, D - 50, PL + z], COL.galv, [0, 200, 0]);
    if (FORM2_UP.includes(form)) {
      add("Barriers", "VB duct barrier", box(W, 1.5, 1300), [0, D - 230, PL + 300], COL.galv, [0, -420, 0], { opacity: 0.55 });
      add("Barriers", "CF chamber front barrier", box(W, 1.5, H - SYSTEM.zone.z1), [0, D - 250, PL + SYSTEM.zone.z1], COL.galv, [0, -560, 0], { opacity: 0.55 });
      add("Barriers", "CB chamber floor", box(W, 250, 1.5), [0, D - 250, PL + SYSTEM.zone.z1], COL.galv, [0, 0, -260], { opacity: 0.7 });
    }
  }

  if (feeder) {
    /* Functional units */
    add("Feeder units", `P50-${H - 100} middle upright`, box(50, 50, H - 100), [SYSTEM.deviceWidth, 0, PL + 50], COL.galv, [0, -200, 0]);
    for (const m of s.modules) {
      const ph = m.kit.frame === "630" ? 273 : 173, br = m.kit.breaker;
      add("Feeder units", `MP-${m.kit.frame} plate (${m.tag})`, box(420, 2.5, ph), [50, 300, PL + m.z + (m.h - ph) / 2], COL.galv, [0, 60, 0]);
      add("Breakers", `${br.code} ${m.rating}A (${m.tag})`, box(br.w, br.d, br.h), [260 - br.w / 2, 300 - br.d, PL + m.z + (m.h - br.h) / 2], COL.breaker, [0, -320, 0]);
      add("Cable alley", `CR-0225 cable rail (${m.tag})`, box(225, 40, 20), [530, 300, PL + m.z + 12.5], COL.galv, [0, -180, 0]);
    }
    add("Cable alley", "CR-0225 cable rail", box(225, 40, 20), [530, 300, PL + 262.5], COL.galv, [0, -180, 0]);
    add("Cable alley", "BP-0475 bottom plate", box(SYSTEM.deviceWidth - 50, D - 100, 2), [50, 50, PL], COL.galv, [0, 0, -160]);
    add("Cable alley", b.req.entry === "bottom" ? "GP-0225 gland plate" : "Bottom plate", box(W - 50 - SYSTEM.deviceWidth - 50, D - 100, 2), [SYSTEM.deviceWidth + 50, 50, PL], COL.galv, [120, 0, -160]);
    add("Cable alley", "PE-40-730 PE bar", box(730, 10, 40), [35, 70, PL + 150], COL.pe, [0, -220, 0]);

    /* Form 3/4 */
    if (FORM3_UP.includes(form)) {
      for (const z of shelfLevels(s)) add("Form 3/4", `SH-0473 shelf at ${z}`, box(SYSTEM.deviceWidth - 50, 382, 1.5), [50, 50, PL + z], COL.galv, [0, -300, 0], { opacity: 0.8 });
      add("Form 3/4", "SW side wall", box(1.5, 344, SYSTEM.zone.z1 - SYSTEM.zone.z0), [SYSTEM.deviceWidth + 48, 50, PL + SYSTEM.zone.z0], COL.galv, [200, 0, 0], { opacity: 0.7 });
      if (form === "4b")
        for (const m of s.modules) add("Form 3/4", `TB-${m.kit.module} terminal box (${m.tag})`, box(242, 240, m.h - 10), [530, 60, PL + m.z + 5], COL.galv, [160, 0, 0], { opacity: 0.6 });
    }

    /* Covers: real flat patterns, so cutouts and door notches show */
    for (const m of s.modules) {
      const p = flatPlate(feederCoverFlat(m, ""));
      add("Covers", `Front cover ${m.tag}`, { k: "plate", ...p, t: 2 }, [25, -4, PL + m.z + 1], COL.powder, [0, -260, 0]);
    }
    if (s.spare > 0) {
      const z = SYSTEM.zone.z1 - s.spare, p = flatPlate(blankCoverFlat(z, s.spare, ""));
      add("Covers", "Blank cover (spare)", { k: "plate", ...p, t: 2 }, [25, -4, PL + z + 1], COL.powder, [0, -260, 0]);
    }
    add("Covers", "BC-0510 bottom cover", box(493, 2, 248), [25, -4, PL + 151], COL.powder, [0, -260, 0]);
    add("Covers", "TC-0493 top cover", box(493, 2, H - SYSTEM.zone.z1 - 1), [25, -4, PL + SYSTEM.zone.z1 + 1], COL.powder, [0, -260, 0]);

    /* Doors */
    add("Doors", "DR-0512 device door", box(512, 25, H - 40), [4, -32, PL + 20], COL.door, [0, -420, 0]);
    add("Doors", "DR-0280 cable-alley door", box(276, 25, H - 40), [520, -32, PL + 20], COL.door, [0, -420, 0]);
    add("Doors", "Swing handle", box(30, 25, 140), [470, -57, PL + 912], COL.dark, [0, -420, 0]);
  } else {
    /* Incomer */
    for (const z of [375, 850, 1475]) add("Incomer", "P50 cross member", box(W - 100, 50, 50), [50, z === 850 ? 50 : D - 100, PL + z - 50], COL.galv, [0, 0, -120]);
    add("Incomer", "BP-0696 ACB base plate", box(W - 100, D - 4, 3), [50, 2, PL + 850], COL.galv, [0, 0, -120]);
    add("Incomer", "MTZ2 chassis", box(440, 400, 395), [180, 100, PL + 853], COL.breaker, [0, -450, 0]);
    add("Incomer", "MTZ2 breaker front", box(300, 30, 300), [250, 70, PL + 900], "#4f565d", [0, -450, 0]);
    ["N", "R", "Y", "B"].forEach((ph, i) => {
      const t = packZ(i) + 80;
      add("Incomer", `IL top link ${ph}`, box(80, 10, t - (PL + 1248)), [215 + i * 115, D - 150 - i * 4, PL + 1248], COL.copper, [0, -150, 120]);
    });
    add("Incomer", "PE-40-730 PE bar", box(730, 10, 40), [35, 70, PL + 150], COL.pe, [0, -220, 0]);
  }
  return out;
}

export function model3d(b: Build): Solid[] {
  return b.lineup.sections.flatMap((s) => sectionSolids(b, s));
}
