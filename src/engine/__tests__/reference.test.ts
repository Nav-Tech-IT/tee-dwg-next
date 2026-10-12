// The parametric generators must reproduce the original Python output exactly
// for the reference section (800 x 600 x 2000, 4 feeders, Form 4b).
import { describe, expect, it } from "vitest";
import { build } from "../build";
import type { Entity, Flat } from "../flat";
import { p50Flat } from "../generators/p50";
import { rearPanelFlat, sidePanelFlat } from "../generators/panel";
import { plfFlat, plsFlat } from "../generators/plinth";
import { roofFlat } from "../generators/roof";
import { ductBarrierFlat, feederCoverFlat, sideWallFlat } from "../generators/layout-parts";
import { solveLayout } from "../layout";
import { referenceFlat } from "../reference";
import { exampleRequirements } from "../requirements";

const TOL = 0.06;

function key(e: Entity): number[] {
  if (e.t === "circle") return [...e.c, e.r];
  if (e.t === "line") return [...e.a, ...e.b].map(Number);
  if (e.t === "poly") return e.pts.flat();
  return [];
}

function same(a: number[], b: number[]) {
  return a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= TOL);
}

function sameEntity(a: Entity, b: Entity) {
  if (a.t !== b.t || a.layer !== b.layer) return false;
  if (a.t === "line" && b.t === "line") return same(key(a), key(b)) || same([...a.b, ...a.a], [...b.a, ...b.b]);
  return same(key(a), key(b));
}

/** Geometry diff (text ignored): what is missing from `got`, and what is extra. */
function diff(got: Flat, want: Flat) {
  const g = got.entities.filter((e) => e.t !== "text"), w = want.entities.filter((e) => e.t !== "text");
  const used = new Set<number>(), missing: Entity[] = [];
  for (const e of w) {
    const i = g.findIndex((x, k) => !used.has(k) && sameEntity(x, e));
    if (i < 0) missing.push(e);
    else used.add(i);
  }
  return { missing, extra: g.filter((_, k) => !used.has(k)) };
}

function expectSame(got: Flat, refName: string) {
  const d = diff(got, referenceFlat(refName));
  expect({ missing: d.missing.slice(0, 5), extra: d.extra.slice(0, 5), counts: [d.missing.length, d.extra.length] }).toEqual({ missing: [], extra: [], counts: [0, 0] });
}

describe("parametric parts reproduce the reference DXFs", () => {
  it.each([500, 700, 1900, 2000])("P50-%i", (L) => expectSame(p50Flat(L), `P50-${String(L).padStart(4, "0")}`));
  it("PLF-0800", () => expectSame(plfFlat(800), "PLF-0800"));
  it("PLS-0596", () => expectSame(plsFlat(600), "PLS-0596"));
  it("ROOF-0800-0600", () => expectSame(roofFlat(800, 600), "ROOF-0800-0600"));
  it("ROOF-0800-0600-T", () => expectSame(roofFlat(800, 600, true), "ROOF-0800-0600-T top entry"));
  it("SP-0600-2000", () => expectSame(sidePanelFlat(600, 2000), "SP-0600-2000 side panel"));
  it("RP-0800-2000", () => expectSame(rearPanelFlat(800, 2000), "RP-0800-2000 rear panel"));

  const lineup = solveLayout({ ...exampleRequirements(), incomer: { enabled: false, type: "MTZ2-16-4P-D" } });
  const s = lineup.sections[0];
  it("reference layout is solved like the original", () => {
    expect(s.modules.map((m) => [m.kit.id, m.z])).toEqual([["K630-4P", 400], ["K630-3P", 750], ["K250-4P", 1100], ["K250-3P", 1350]]);
  });
  it("VB-0800 duct barrier", () => expectSame(ductBarrierFlat(s, "VB"), "VB-0800 duct barrier"));
  it("SW-1200 side wall", () => expectSame(sideWallFlat(s, "SW"), "SW-1200 side wall"));
  it.each([0, 1, 2, 3])("feeder cover F%i", (i) => {
    const m = s.modules[i];
    expectSame(feederCoverFlat(m, "FC"), `FC-${m.kit.frame}-${m.kit.poles}-T F${i + 1}`);
  });
});

describe("parts list", () => {
  it("matches the reference catalog quantities for one Form 4b feeder section", () => {
    const b = build({ ...exampleRequirements(), incomer: { enabled: false, type: "MTZ2-16-4P-D" } });
    const q = (code: string) => b.bom.find((l) => l.code === code)?.qty;
    expect(q("K1")).toBe(4 + 24 + 8 + 2);
    expect(q("P50-0700")).toBe(4 + 4);
    expect(q("M6-S")).toBe(68);
    expect(q("M6-R")).toBe(20);
    expect(q("M6-COV")).toBe(29);
    expect(q("M6x16-CA")).toBe(27);
    expect(q("M10x40")).toBe(14);
    expect(q("M6x16-FU")).toBe(20);
    expect(q("SH-0473")).toBe(5);
    expect(q("CR-0225")).toBe(5);
    expect(q("G10x3")).toBe(15);
    expect(q("G12x4")).toBe(2.8);
    expect(b.issues.filter((i) => i.level === "error")).toEqual([]);
  });
});

describe("layout", () => {
  it("packs into the fewest sections", () => {
    const req = exampleRequirements();
    req.incomer.enabled = false;
    req.feeders = [
      { id: "a", tag: "P", description: "", frame: "630", rating: 400, poles: "3P", qty: 5 },
      { id: "b", tag: "L", description: "", frame: "250", rating: 100, poles: "4P", qty: 6 },
      { id: "c", tag: "S", description: "", frame: "250", rating: 160, poles: "3P", qty: 5 },
    ];
    const l = solveLayout(req);
    expect(l.sections.length).toBe(4);
    for (const s of l.sections) expect(s.modules.reduce((a, m) => a + m.h, 0)).toBeLessThanOrEqual(1200);
    expect(l.sections.flatMap((s) => s.modules).length).toBe(16);
  });
});
