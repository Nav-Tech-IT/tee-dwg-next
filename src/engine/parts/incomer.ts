// Incomer section internals (MasterPact MTZ2 16 4P drawout).
import { p50Code, p50Flat } from "../generators/p50";
import { INCOMERS } from "../system";
import { bought, fixed, made, type PartRule } from "./helpers";

export const incomer: PartRule = (ctx) => {
  if (!ctx.incomer) return [];
  const g = "Incomer", { W } = ctx.s, type = ctx.req.incomer.type;
  return [
    bought(ctx, { code: type, name: INCOMERS[type].name, group: g, step: 34, qty: 1, material: "Schneider Electric", note: "Chassis CAD MCADPD0005089. Breaker + chassis ordered separately." }),
    bought(ctx, { code: "LV848168 / LV848173", name: "Rear horizontal connectors, top + bottom", group: g, step: 34, qty: 8, material: "Schneider Electric", note: "4 x M8 each into the chassis terminal" }),
    made(ctx, { code: p50Code(W - 100), name: "Cross members: ACB front + rear, comb, cable-arm", group: g, step: 34, qty: 4, mat: "galv20", process: "Same as frame", status: "parametric", flat: () => p50Flat(W - 100), note: "Tops at 850 (ACB), 1475 (comb), 375 (arms)" }),
    fixed(ctx, "K1-BRACKET-3mm", { code: "K1", name: "Corner bracket (cross members)", group: g, step: 34, qty: 8, mat: "galv30", process: "Same as frame" }),
    fixed(ctx, "BP-0696 ACB base plate", { code: "BP-0696", name: "ACB base plate", group: g, step: 34, qty: 1, mat: "galv30", process: "Laser + 2 bends", note: "4 x M6 clinch nuts under the chassis feet", dependsOn: ["D"] }),
    fixed(ctx, "IL-1600 top links", { code: "IL-1600", name: "Top links Cu 80 x 10, bent (2 per phase)", group: g, step: 34, qty: 8, mat: "cu10", process: "Saw/punch + 1 bend", note: "M10 to the connector 40 Nm; M12 to the main bars 70 Nm", dependsOn: ["D", "H"] }),
    fixed(ctx, "SP-80 spacer", { code: "SP-80", name: "Link spacer Cu 80 x 80 x 10", group: g, step: 34, qty: 4, mat: "cu10", process: "Saw + drill" }),
    fixed(ctx, "CMB-IN-1600 comb", { code: "CMB-IN-1600", name: "Link comb (mid-span support)", group: g, step: 34, qty: 1, mat: "gpo", t: 20, process: "CNC" }),
    bought(ctx, { code: "IN-KIT", name: "Incoming connection kit (cable bars / busway adapter, gland plate)", group: g, step: 34, qty: 1, material: "Per order", process: "Generated per order", note: "Cable type, size and number, or busway: not defined yet", status: "review" }),
  ];
};
