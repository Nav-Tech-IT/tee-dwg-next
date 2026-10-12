// Parts whose geometry follows the feeder layout of one section: the busbar duct
// barrier (one window per feeder), the Form 3 side wall (one cable window per
// feeder) and the front covers (hinge notches / latch slots where the door hardware is).
import { FlatBuilder, type Flat } from "../flat";
import type { Module, Section } from "../layout";
import { referenceFlat } from "../reference";
import { SYSTEM } from "../system";

/* ---------- VB duct barrier ---------- */

const VB = { W: 799, blank: 1306.6, bends: [18.65, 1287.95], flangeHoles: [99.5, 299.5, 499.5, 699.5], flangeY: [9, 1297.6] };

export function ductBarrierFlat(section: Section, code: string): Flat {
  const f = new FlatBuilder();
  f.rect(0, 0, VB.W, VB.blank);
  for (const y of VB.bends) f.bend([0, y], [VB.W, y]);
  for (const y of VB.flangeY) for (const x of VB.flangeHoles) f.hole(x, y, 6.6);
  for (const m of section.modules) {
    const w = m.kit.window, y0 = m.z + w.dz;
    f.rect(w.x0, y0, w.x1, y0 + w.h);
    for (const x of w.holes) f.hole(x, y0 + w.h / 2, 6.6);
  }
  f.text(40, VB.blank / 2, 8, `${code}  1.5 GALV  2 x 90 SAME SIDE  FORM 2a+  windows per feeder layout`);
  return f.build();
}

/* ---------- SW Form 3 side wall ---------- */

/** Shelf levels: every module boundary, plus the bottom and top of the feeder zone. */
export function shelfLevels(section: Section) {
  const s = new Set<number>([SYSTEM.zone.z0, SYSTEM.zone.z1]);
  for (const m of section.modules) { s.add(m.z); s.add(m.z + m.h); }
  return [...s].sort((a, b) => a - b);
}

export function sideWallFlat(section: Section, code: string): Flat {
  const H = SYSTEM.zone.z1 - SYSTEM.zone.z0, W = 344.3, f = new FlatBuilder();
  const rel = (z: number) => z - SYSTEM.zone.z0;
  f.rect(0, 0, W, H);
  f.bend([23.65, 0], [23.65, H]);
  for (const m of section.modules) {
    f.rect(42.3, rel(m.z) + 2, 232.3, rel(m.z) + 34);
    f.hole(12.5, rel(m.z) + 137.5, 6.6);
  }
  for (const z of shelfLevels(section)) { f.hole(122.3, rel(z) - 10, 6.6); f.hole(252.3, rel(z) - 10, 6.6); }
  f.text(42, H / 2, 8, `${code}  1.5 GALV  FORM 3  1 x 90 (front flange)  cable windows per feeder layout`);
  return f.build();
}

/* ---------- Front covers ---------- */

/** Door hardware heights (from the top of the plinth) for the 2000 section: hinge centres and 3-point latch strikes. */
export const DOOR_HW = { hinges: [312.5, 962.5, 1862.5], strikes: [212.5, 1087.5, 1587.5] };
const NOTCH = { x0: -1, x1: 24, h: 60 }, SLOT = { x: 459.75, w: 5.5, h: 32 };

const KIT_COVER_REF: Record<string, string> = {
  "K630-4P": "FC-630-4P-T F1",
  "K630-3P": "FC-630-3P-T F2",
  "K250-4P": "FC-250-4P-T F3",
  "K250-3P": "FC-250-3P-T F4",
};

/** Hinge notches and latch slots for a cover whose bottom edge sits at frame height zb. */
function doorFeatures(f: FlatBuilder, zb: number, h: number) {
  for (const z of DOOR_HW.hinges) {
    const c = z - zb;
    if (c > 0 && c < h) f.rect(NOTCH.x0, c - NOTCH.h / 2, NOTCH.x1, c + NOTCH.h / 2);
  }
  for (const z of DOOR_HW.strikes) {
    const c = z - zb;
    if (c + SLOT.h / 2 > 0 && c - SLOT.h / 2 < h) f.rectC(SLOT.x, c, SLOT.w, SLOT.h);
  }
}

/** Base cover for a kit (outline, breaker cutout, 4 fixing holes) with the reference door features stripped. */
function kitCoverBase(m: Module) {
  const ref = referenceFlat(KIT_COVER_REF[m.kit.id]);
  return ref.entities.filter((e) => {
    if (e.t === "text") return false;
    if (e.t === "poly" && e.pts.length === 4) {
      const xs = e.pts.map((p) => p[0]), ys = e.pts.map((p) => p[1]);
      const w = Math.max(...xs) - Math.min(...xs), hh = Math.max(...ys) - Math.min(...ys);
      if (Math.abs(w - SLOT.w) < 0.01 && Math.abs(hh - SLOT.h) < 0.01) return false; // latch slot
      if (Math.min(...xs) < 0) return false; // hinge notch
    }
    return true;
  });
}

export function feederCoverFlat(m: Module, code: string): Flat {
  const f = new FlatBuilder().add(...kitCoverBase(m));
  doorFeatures(f, m.z + 1, m.h - 2);
  f.text(10, 8, 5, `${code}  2.0 CRCA  RAL 7035  flat  notches for door hinge / latch at this position`);
  return f.build();
}

/** Blank cover for unused height at the top of the feeder zone. */
export function blankCoverFlat(z: number, h: number, code: string): Flat {
  const H = h - 2, f = new FlatBuilder();
  f.rect(0, 0, 493, H);
  for (const y of [36.5, H - 36.5]) { f.hole(11, y, 6.6); f.hole(486, y, 6.6); }
  doorFeatures(f, z + 1, H);
  f.text(10, 8, 5, `${code}  2.0 CRCA  RAL 7035  flat  blank cover`);
  return f.build();
}
