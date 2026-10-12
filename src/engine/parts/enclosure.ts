// Plinth, frame, roof, lifting and panels: every section has them.
import type { Flat } from "../flat";
import { p50Code, p50Flat } from "../generators/p50";
import { rearPanelFlat, rpCode, sidePanelFlat, spCode } from "../generators/panel";
import { plfCode, plfFlat, plsCode, plsFlat } from "../generators/plinth";
import { roofCode, roofFlat } from "../generators/roof";
import { bought, fixed, made, type PartRule } from "./helpers";

const holes = (f: Flat, d: number) => f.entities.filter((e) => e.t === "circle" && Math.abs(e.r * 2 - d) < 0.01).length;

export const plinth: PartRule = (ctx) => {
  const { W, D } = ctx.s, g = "Plinth";
  return [
    made(ctx, { code: plfCode(W), name: "Plinth front / rear channel", group: g, step: 1, qty: 2, mat: "galv20", process: "Laser + 2 bends (V16)", status: "parametric", flat: () => plfFlat(W) }),
    made(ctx, { code: plsCode(D), name: "Plinth side channel", group: g, step: 2, qty: 2, mat: "galv20", process: "Laser + 2 bends (V16)", status: "parametric", flat: () => plsFlat(D) }),
    fixed(ctx, "K1-BRACKET-3mm", { code: "K1", name: "Corner bracket 75 x 75 (plinth)", group: g, step: 3, qty: 4, mat: "galv30", process: "Laser + 1 bend (V24)" }),
    bought(ctx, { code: "M6x16-P", name: "M6 x 16 flange bolt + nut (plinth)", group: "Fasteners", step: 3, qty: 16, material: "Steel 8.8 zinc" }),
  ];
};

export const frame: PartRule = (ctx) => {
  const { W, D, H } = ctx.s, g = "Frame", proc = "Laser + 5 bends (V16)";
  return [
    made(ctx, { code: p50Code(H), name: "P50 upright", group: g, step: 4, qty: 4, mat: "galv20", process: proc, status: "parametric", flat: () => p50Flat(H) }),
    made(ctx, { code: p50Code(W - 100), name: "P50 width member", group: g, step: 5, qty: 4, mat: "galv20", process: proc, status: "parametric", flat: () => p50Flat(W - 100) }),
    made(ctx, { code: p50Code(D - 100), name: "P50 depth member", group: g, step: 5, qty: 4, mat: "galv20", process: proc, status: "parametric", flat: () => p50Flat(D - 100) }),
    fixed(ctx, "K1-BRACKET-3mm", { code: "K1", name: "Corner bracket 75 x 75 (frame)", group: g, step: 3, qty: 24, mat: "galv30", process: "Laser + 1 bend (V24)", note: "3 per corner" }),
    bought(ctx, { code: "M6x16-F", name: "M6 x 16 flange bolt + cage nut (frame)", group: "Fasteners", step: 5, qty: 96, material: "Steel 8.8 zinc", note: "8 Nm" }),
  ];
};

export const roof: PartRule = (ctx) => {
  const { W, D } = ctx.s, g = "Roof & lifting";
  const top = ctx.req.entry === "top" && ctx.feeder;
  const flat = () => roofFlat(W, D, top);
  return [
    made(ctx, {
      code: roofCode(W, D, top), name: top ? "Roof with top cable opening (top entry)" : "Roof tray, hemmed", group: g, step: 7, qty: 1,
      mat: "crca15", process: top ? "Laser + 4 hems + 4 bends + opening" : "Laser + 4 hems + 4 bends",
      status: top && D !== 600 ? "review" : "parametric", flat,
      note: top && D !== 600 ? "Opening position kept from the 600-deep design: check it lands over the cable alley." : undefined,
    }),
    bought(ctx, { code: "G12x4", name: "Gasket EPDM 12 x 4, self-adhesive", group: g, step: 7, qty: (2 * (W + D)) / 1000, unit: "m", material: "EPDM" }),
    fixed(ctx, "LP-12 lifting plate", { code: "LP-12", name: "Lifting plate 100 x 100", group: g, step: 8, qty: 4, mat: "galv30", material: "MS plate, zinc plated", t: 12, process: "Laser/plasma, drill, tap M12" }),
    bought(ctx, { code: "EYE-M12", name: "Eyebolt M12 DIN 580", group: g, step: 8, qty: 4, material: "Steel C15" }),
    bought(ctx, { code: "M8x35", name: "M8 x 35 carriage bolt + nut + washer", group: "Fasteners", step: 8, qty: 16, material: "Steel 8.8 zinc", note: "20 Nm" }),
    bought(ctx, { code: "M6-R", name: "M6 screw + cage nut (roof)", group: "Fasteners", step: 7, qty: holes(roofFlat(W, D), 6.6), material: "Steel zinc", note: "3 Nm" }),
  ];
};

export const panels: PartRule = (ctx) => {
  const { W, D, H, ends } = ctx.s, g = "Panels";
  const sides = (ends.left ? 1 : 0) + (ends.right ? 1 : 0);
  const out = [];
  let screws = holes(rearPanelFlat(W, H), 6.6) / 2, perimeter = 2 * (W + H);
  if (sides) {
    out.push(made(ctx, {
      code: spCode(D, H), name: "Side panel, hemmed (end of line-up)", group: g, step: 9, qty: sides, mat: "crca15",
      process: "Laser + 4 hems", status: "parametric", flat: () => sidePanelFlat(D, H),
    }));
    screws += (sides * holes(sidePanelFlat(D, H), 6.6)) / 2;
    perimeter += sides * 2 * (D + H);
  }
  out.push(
    made(ctx, { code: rpCode(W, H), name: "Rear panel, hemmed", group: g, step: 10, qty: 1, mat: "crca15", process: "Laser + 4 hems", status: "parametric", flat: () => rearPanelFlat(W, H) }),
    // The reference job used 15 m for 16 m of panel edge; keep the same ratio.
    bought(ctx, { code: "G10x3", name: "Gasket EPDM 10 x 3, self-adhesive", group: g, step: 9, qty: Math.ceil(((perimeter / 1000) * 15) / 16 * 2) / 2, unit: "m", material: "EPDM" }),
    bought(ctx, { code: "M6-S", name: "M6 screw + cage nut (panels)", group: "Fasteners", step: 9, qty: screws, material: "Steel zinc", note: "3 Nm" }),
  );
  return out;
};
