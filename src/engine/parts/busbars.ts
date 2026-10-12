// Busbar chamber, main busbars, risers (vertical busbars) and the PE bar.
import { p50Code, p50Flat } from "../generators/p50";
import { ductBarrierFlat } from "../generators/layout-parts";
import { FORM2_UP, pad4 } from "../system";
import { bought, fixed, inForms, made, perLayout, type PartRule } from "./helpers";

export const chamber: PartRule = (ctx) => {
  const g = "Busbar chamber";
  const out = [
    fixed(ctx, "BR-500 rail", { code: "BR-500", name: "Busbar support rail", group: g, step: 11, qty: 2, mat: "galv25", process: "Laser + 3 bends (V20)", note: "Same part both positions; the second is turned 180 degrees." }),
    fixed(ctx, "BS-4P80 support plate", { code: "BS-4P80", name: "Busbar support plate, 4 packs", group: g, step: 11, qty: 2, mat: "gpo", t: 12, process: "CNC route", note: "Slots hold 2 x 80 x 10 per pack, 10 mm gap, pack pitch 100 mm." }),
    bought(ctx, { code: "M10x35", name: "Bolt M10 x 35, 8.8 + nut + 2 washers", group: "Fasteners", step: 11, qty: 4, material: "Steel 8.8 zinc", note: "Support plate to rail, 40 Nm" }),
    bought(ctx, { code: "M6x16-CN", name: "M6 cage nut + flange bolt", group: "Fasteners", step: 11, qty: 4, material: "Steel zinc", note: "Rail tabs to top members" }),
  ];
  if (ctx.feeder && inForms(ctx, FORM2_UP)) {
    out.push(
      fixed(ctx, "CF-0800 front barrier", { code: "CF-0800", name: "Chamber front barrier", group: g, step: 13, qty: 1, mat: "galv15", process: "Laser + 1 bend (V12)", note: "Separates the busbars from the functional units (Form 2 and up)." }),
      fixed(ctx, "CB-0800 floor barrier", { code: "CB-0800", name: "Chamber floor barrier", group: g, step: 13, qty: 1, mat: "galv15", process: "Laser + 3 bends (V12)", note: "Rev B: 4 riser openings 84 x 34 and 4 holes for the insulating plate." }),
      fixed(ctx, "CC-25 clip", { code: "CC-25", name: "Barrier clip", group: g, step: 13, qty: 2, mat: "galv15", process: "Laser + 1 bend" }),
      bought(ctx, { code: "M6x16", name: "Flange bolt M6 x 16 + serrated nut", group: "Fasteners", step: 13, qty: 10, material: "Steel 8.8 zinc", note: "Barriers, clips, floor tabs, 8 Nm" }),
    );
  }
  return out;
};

export const mainBusbars: PartRule = (ctx) => [
  ctx.incomer
    ? fixed(ctx, "BB-80-730-I incomer bars", { code: "BB-80-730-I", name: "Incomer main busbar Cu 80 x 10 x 730", group: "Busbars", step: 12, qty: 8, mat: "cu10", process: "Saw + drill", note: "Link holes of its own phase; 2 per phase" })
    : fixed(ctx, "BB-80-730 busbar", { code: "BB-80-730", name: "Busbar Cu 80 x 10 x 730", group: "Busbars", step: 12, qty: 8, mat: "cu10", process: "Saw, drill 12 x 13, deburr, tin joint areas", note: "2 per phase R, Y, B and 2 for N (full neutral)" }),
];

const RISERS = [
  ["R", 1650], ["Y", 1550], ["B", 1450], ["N", 1350],
] as const;

export const risers: PartRule = (ctx) => {
  if (!ctx.feeder) return [];
  const { W } = ctx.s, g = "Vertical busbars";
  const out = [
    made(ctx, { code: p50Code(W - 100), name: "Rear middle member (riser support)", group: g, step: 14, qty: 4, mat: "galv20", process: "Same as frame P50", status: "parametric", flat: () => p50Flat(W - 100), note: "Bottom face at z 400 / 750 / 1100 / 1450" }),
    fixed(ctx, "K1-BRACKET-3mm", { code: "K1", name: "Corner bracket (middle members)", group: g, step: 14, qty: 8, mat: "galv30", process: "Same as frame K1" }),
    fixed(ctx, "VSR-4P60 rear comb", { code: "VSR-4P60", name: "Riser support, rear comb", group: g, step: 14, qty: 4, mat: "gpo", t: 25, process: "CNC route 435 x 25 x 40, 4 notches 5 deep, 5 holes" }),
    fixed(ctx, "VSF-4P60 front comb", { code: "VSF-4P60", name: "Riser support, front comb", group: g, step: 15, qty: 4, mat: "gpo", t: 20, process: "CNC route 435 x 20 x 40, 4 notches 5 deep, 5 holes" }),
    ...RISERS.map(([ph, L]) =>
      fixed(ctx, `BV-60-${L} riser ${ph}`, { code: `BV-60-${L}`, name: `Riser busbar Cu 60 x 10, phase ${ph}`, group: g, step: 15, qty: 1, mat: "cu10", process: "Saw, drill 2 x 13 + 23 x 11, tin", dependsOn: ["H"] }),
    ),
    fixed(ctx, "BJ spacer 10", { code: "BJ-S10", name: "Joint spacer Cu 60 x 80 x 10 (inside the pack)", group: g, step: 15, qty: 4, mat: "cu10", process: "Saw from 60x10 bar, drill 2 x 13, tin" }),
    fixed(ctx, "BJ spacer 20", { code: "BJ-S20", name: "Joint spacer Cu 60 x 80 x 20 (pack to riser)", group: g, step: 15, qty: 4, mat: "cu10", t: 20, process: "Saw from 60x20 bar, drill 2 x 13, tin" }),
    bought(ctx, { code: "M6x55", name: "M6 x 55 flange bolt + cage nut", group: "Fasteners", step: 15, qty: 20, material: "Steel 8.8 zinc", note: "Combs to middle members, 6 Nm (GPO)" }),
    bought(ctx, { code: "M12x90", name: "M12 x 90 bolt 8.8 + nut + 2 conical washers", group: "Fasteners", step: 15, qty: 8, material: "Steel 8.8 zinc", note: "Riser joints, 70 Nm" }),
  ];
  if (inForms(ctx, FORM2_UP)) {
    const vb = perLayout(`VB-${pad4(W)}`, ctx);
    out.push(
      fixed(ctx, "CI-4P60 floor insulating plate", { code: "CI-4P60", name: "Insulating plate on the chamber floor", group: g, step: 16, qty: 1, mat: "gpo", process: "CNC route" }),
      made(ctx, { code: vb, name: "Busbar duct barrier (windows per feeder layout)", group: g, step: 16, qty: 1, mat: "galv15", process: "Laser + 2 bends (V12)", status: "parametric", flat: () => ductBarrierFlat(ctx.s, vb) }),
      fixed(ctx, "VD-0800 duct bottom", { code: "VD-0800", name: "Busbar duct bottom", group: g, step: 16, qty: 1, mat: "galv15", process: "Laser + 3 bends (V12)", note: "Same blank as CB-0800 without the 4 openings; fitted upside down." }),
      bought(ctx, { code: "M6x20", name: "M6 x 20 flange bolt + serrated nut", group: "Fasteners", step: 16, qty: 10, material: "Steel 8.8 zinc" }),
    );
  }
  return out;
};

export const pe: PartRule = (ctx) => [
  fixed(ctx, "PE-40-730 PE bar", { code: "PE-40-730", name: "Main PE bar Cu 40 x 10", group: "Cable alley", step: 22, qty: 1, mat: "cu10", material: "Cu-ETP", process: "Saw, drill 15 x 11, green/yellow marking", note: "400 mm²: meets 50 kA 1 s. Continues to the next section with a link." }),
  fixed(ctx, "PB-20 PE bracket", { code: "PB-20", name: "PE bar bracket", group: "Cable alley", step: 22, qty: 2, mat: "galv25", process: "Laser + 1 bend" }),
  bought(ctx, { code: "M10x30-PE", name: "M10 x 30 bolt + nut + serrated washer", group: "Fasteners", step: 22, qty: 2, material: "Steel 8.8 zinc" }),
];
