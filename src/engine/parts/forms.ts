// Form 3 / 4 compartment parts.
import { shelfLevels, sideWallFlat } from "../generators/layout-parts";
import { FORM3_UP, KITS, type KitId } from "../system";
import { bought, fixed, inForms, made, perLayout, type PartLine, type PartRule } from "./helpers";

export const form34: PartRule = (ctx) => {
  if (!ctx.feeder || !inForms(ctx, FORM3_UP)) return [];
  const g = "Form 3/4 compartments", mods = ctx.s.modules, n = mods.length;
  const levels = shelfLevels(ctx.s).length, sw = perLayout("SW-1200", ctx);
  const out: PartLine[] = [
    fixed(ctx, "SH-0473 shelf", { code: "SH-0473", name: "Compartment shelf", group: g, step: 27, qty: levels, mat: "galv15", process: "Laser + 4 bends", note: "At every module boundary", dependsOn: ["D"] }),
    made(ctx, { code: sw, name: "Side wall, feeder zone | cable alley", group: g, step: 28, qty: 1, mat: "galv15", process: "Laser + 1 bend", status: ctx.s.D === 600 ? "parametric" : "review", flat: () => sideWallFlat(ctx.s, sw), note: "One cable window 190 x 32 per feeder, just above the module bottom" }),
    bought(ctx, { code: "M6x16-F3", name: "M6 x 16 flange bolt + nut / cage nut", group: "Fasteners", step: 27, qty: 2 * levels + 9, material: "Steel 8.8 zinc", note: "Estimated from the reference job (19 for 5 shelves)", status: "review" }),
  ];
  if (["3a", "3b", "4a"].includes(ctx.form))
    out.push(bought(ctx, { code: "CE-240", name: "Cable-entry membrane EPDM 3 mm, cross-slit", group: g, step: 28, qty: n, material: "EPDM", process: "Cut 240 x 50, slit on site" }));

  const kits = new Map<KitId, number>();
  for (const m of mods) kits.set(m.kit.id, (kits.get(m.kit.id) ?? 0) + 1);

  if (ctx.form === "4a")
    for (const [id, q] of kits)
      out.push(bought(ctx, { code: KITS[id].shield, name: `Schneider terminal shield, NSX ${KITS[id].frame} ${KITS[id].poles} (outgoing side)`, group: g, step: 29, qty: q, material: "Schneider Electric" }));

  if (ctx.form === "4b") {
    for (const [id, q] of kits) {
      const k = KITS[id], tag = `${k.frame}-${k.poles}`;
      for (const ph of k.phases)
        out.push(fixed(ctx, `EB-${tag} terminal bars`, { code: `EB-${tag}-${ph}`, name: `Terminal extension bar ${k.link}, pole ${ph}`, group: g, step: 30, qty: q, mat: k.frame === "630" ? "cu10" : "cu5", process: "Laser/CNC cut (L-shape), 2 bends, tin ends" }));
      out.push(bought(ctx, { code: `TW-${tag}`, name: "Side-wall slot plate GPO-3 3 mm", group: g, step: 30, qty: q, material: "GPO-3", process: "CNC route", note: "No drawing in the reference set yet", status: "review" }));
    }
    const n630 = (kits.get("K630-4P") ?? 0) + (kits.get("K630-3P") ?? 0), n250 = n - n630;
    if (n630) out.push(
      fixed(ctx, "TB-350 terminal box", { code: "TB-350", name: "Terminal box 350 high, cable alley", group: g, step: 31, qty: n630, mat: "galv15", process: "Laser + 3 bends + right wall" }),
      bought(ctx, { code: "TBC-350", name: "Terminal box front cover", group: g, step: 31, qty: n630, material: "CRCA RAL 7035 1.5", process: "Laser (flat)", note: "No drawing in the reference set yet", status: "review" }),
    );
    if (n250) out.push(
      fixed(ctx, "TB-250 terminal box", { code: "TB-250", name: "Terminal box 250 high, cable alley", group: g, step: 31, qty: n250, mat: "galv15", process: "Laser + 3 bends + right wall" }),
      bought(ctx, { code: "TBC-250", name: "Terminal box front cover", group: g, step: 31, qty: n250, material: "CRCA RAL 7035 1.5", process: "Laser (flat)", note: "No drawing in the reference set yet", status: "review" }),
    );
    out.push(bought(ctx, { code: "CE-B", name: "EPDM membrane, box back wall", group: g, step: 31, qty: n, material: "EPDM", process: "Cut 176 x 71, slit on site" }));
  }
  return out;
};
