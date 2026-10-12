// Feeder side of a feeder section: functional units, cable alley, covers and doors.
import { p50Code, p50Flat } from "../generators/p50";
import { blankCoverFlat, feederCoverFlat } from "../generators/layout-parts";
import type { Module } from "../layout";
import { FORM2_UP, KITS, SYSTEM, pad4, type KitId } from "../system";
import { bought, fixed, inForms, made, type Ctx, type PartLine, type PartRule } from "./helpers";

const byKit = (ctx: Ctx) => {
  const m = new Map<KitId, Module[]>();
  for (const mod of ctx.s.modules) m.set(mod.kit.id, [...(m.get(mod.kit.id) ?? []), mod]);
  return m;
};

export const coverCode = (m: Module) => `FC-${m.kit.frame}-${m.kit.poles}-T-Z${pad4(m.z)}`;

export const units: PartRule = (ctx) => {
  if (!ctx.feeder) return [];
  const { H } = ctx.s, g = "Feeder units", mods = ctx.s.modules, n = mods.length;
  const out: PartLine[] = [
    made(ctx, { code: p50Code(H - 100), name: "Middle upright (feeder zone | cable alley)", group: g, step: 17, qty: 1, mat: "galv20", process: "Same P50 profile", status: "parametric", flat: () => p50Flat(H - 100), note: "Feeder side face at x 475" }),
    fixed(ctx, "K1-BRACKET-3mm", { code: "K1", name: "Corner bracket (middle upright)", group: g, step: 17, qty: 2, mat: "galv30", process: "Same as frame K1" }),
  ];
  for (const [id, list] of byKit(ctx)) {
    const kit = KITS[id], q = list.length, mp = `MP-${kit.frame}`;
    out.push(fixed(ctx, `${mp} mounting plate`, { code: mp, name: `Mounting plate NSX ${kit.frame === "630" ? "400/630" : "100/160/250"}`, group: g, step: 17, qty: q, mat: "galv25", process: "Laser + 2 bends (V20)", note: `Module ${kit.module} mm` }));
    // One line per rating, so the breaker order is right.
    const ratings = new Map<number, string[]>();
    for (const m of list) ratings.set(m.rating, [...(ratings.get(m.rating) ?? []), m.tag]);
    for (const [r, tags] of ratings)
      out.push(bought(ctx, { code: `${kit.breaker.code}-${r}A`, name: `${kit.breaker.name}, ${r} A`, group: g, step: 18, qty: tags.length, material: "Schneider Electric", note: `Feeders ${tags.join(", ")}` }));
    for (const ph of kit.phases)
      out.push(fixed(ctx, `L-${kit.frame}-${kit.poles} links`, { code: `L-${kit.frame}-${kit.poles}-${ph}`, name: `Link ${kit.link}, pole ${ph} to riser ${ph}`, group: g, step: 19, qty: q, mat: kit.frame === "630" ? "cu10" : "cu5", process: "Laser/CNC cut, 2 bends, tin ends" }));
    if (inForms(ctx, FORM2_UP))
      out.push(fixed(ctx, `VW-${kit.frame}-${kit.poles} window cover`, { code: `VW-${kit.frame}-${kit.poles}`, name: `Duct window cover, kit ${id}`, group: g, step: 20, qty: q, mat: "gpo", process: "CNC route", note: "Slots 1 mm round each link" }));
  }
  out.push(
    bought(ctx, { code: "M6x16-FU", name: "M6 x 16 flange bolt + cage nut", group: "Fasteners", step: 17, qty: 4 * n + 4, material: "Steel 8.8 zinc", note: "Plates (4 each) + middle upright K1s" }),
    bought(ctx, { code: "M10x40", name: "M10 x 40 bolt 8.8 + nut + conical washers", group: "Fasteners", step: 19, qty: mods.reduce((s, m) => s + m.kit.phases.length, 0), material: "Steel 8.8 zinc", note: "Link to riser, 40 Nm" }),
  );
  if (inForms(ctx, FORM2_UP)) out.push(bought(ctx, { code: "M6x16-VW", name: "M6 x 16 bolt + nut (window covers)", group: "Fasteners", step: 20, qty: 2 * n, material: "Steel zinc" }));
  return out;
};

export const cableAlley: PartRule = (ctx) => {
  if (!ctx.feeder) return [];
  const g = "Cable alley", n = ctx.s.modules.length;
  const out: PartLine[] = [
    fixed(ctx, "BP-0475 bottom plate", { code: "BP-0475", name: "Bottom plate, feeder side", group: g, step: 21, qty: 1, mat: "galv20", process: "Laser + 4 bends (V16)", dependsOn: ["D"] }),
    fixed(ctx, "GP-0225 gland plate", { code: "GP-0225", name: "Gland plate, cable alley", group: g, step: 21, qty: 1, mat: "galv20", process: "Laser + 4 bends (V16)", note: "Drilled on site for glands", dependsOn: ["D"] }),
    fixed(ctx, "CR-0225 cable rail", { code: "CR-0225", name: "Cable support rail C 40 x 20", group: g, step: 23, qty: n + 1 + (ctx.req.entry === "top" ? 1 : 0), mat: "galv20", process: "Laser + 4 bends", note: "One per feeder (12.5 above the module bottom) + one at 262.5" + (ctx.req.entry === "top" ? " + one under the top opening at 1812.5" : "") }),
    bought(ctx, { code: "M6x16-CA", name: "M6 x 16 flange bolt + cage nut / nut", group: "Fasteners", step: 21, qty: 12 + 3 + 2 + 2 * (n + 1), material: "Steel 8.8 zinc", note: "Bottom plates, PE brackets, rails" }),
  ];
  if (ctx.form !== "4b") out.push(bought(ctx, { code: "CL-3x240", name: "Cable cleat (trefoil / multi-core), IEC 61914", group: g, step: 32, qty: n + 1, material: "Aluminium / stainless", note: "One per rail; pick the size per cable" }));
  if (ctx.req.entry === "top")
    out.push(fixed(ctx, "GT-0160 top gland plate", { code: "GT-0160", name: "Top gland plate + EPDM gasket (top entry)", group: "Cable entry", step: 33, qty: 1, mat: "galv20", process: "Laser (flat)", note: "8 x M6 into riv-nuts in the roof" }));
  return out;
};

export const covers: PartRule = (ctx) => {
  if (!ctx.feeder) return [];
  const g = "Covers", out: PartLine[] = [];
  const reviewH = ctx.s.H !== SYSTEM.ref.H ? `Door hardware heights are only known for the ${SYSTEM.ref.H} section.` : undefined;
  for (const m of ctx.s.modules) {
    const code = coverCode(m);
    out.push(made(ctx, {
      code, name: `Feeder cover ${m.kit.frame}-${m.kit.poles}, module at z ${m.z} (${m.tag})`, group: g, step: 24, qty: 1, mat: "crca20",
      process: "Laser only (flat)", status: "parametric", flat: () => feederCoverFlat(m, code), unsupported: reviewH,
      note: m.kit.frame === "630" ? "Cutout 127 x 127 (Schneider)" : "Cutout 95 x 77 (Schneider)",
    }));
  }
  let screws = 4 * ctx.s.modules.length + 6 + 3 + 4;
  if (ctx.s.spare > 0) {
    const z = SYSTEM.zone.z1 - ctx.s.spare, code = `FB-${pad4(ctx.s.spare)}-Z${pad4(z)}`;
    out.push(made(ctx, {
      code, name: `Blank cover, ${ctx.s.spare} mm spare space`, group: g, step: 24, qty: 1, mat: "crca20", process: "Laser only (flat)", status: "review",
      flat: () => blankCoverFlat(z, ctx.s.spare, code), unsupported: reviewH,
      note: "New part (not in the reference design): same fixing pattern as the feeder covers.",
    }));
    screws += 4;
  }
  out.push(
    fixed(ctx, "TC-0493 top cover left", { code: "TC-0493", name: "Top cover, device side", group: g, step: 24, qty: 1, mat: "crca20", process: "Laser only (flat)", note: "6 screws", dependsOn: ["H"] }),
    fixed(ctx, "TC-0261 top cover right", { code: "TC-0261", name: "Top cover, cable-alley side", group: g, step: 24, qty: 1, mat: "crca20", process: "Laser + 1 bend", note: "3 screws + 2 through its return into the middle upright", dependsOn: ["H"] }),
    fixed(ctx, "BC-0510 bottom cover", { code: "BC-0510", name: "Bottom cover (under the feeders)", group: g, step: 24, qty: 1, mat: "crca20", process: "Laser only (flat)", note: "4 screws" }),
    bought(ctx, { code: "M6-COV", name: "M6 x 16 pan screw + cage nut + plastic cup washer", group: "Fasteners", step: 24, qty: screws, material: "Steel zinc", note: "One per cover with a serrated washer for earthing" }),
  );
  return out;
};

export const doors: PartRule = (ctx) => {
  if (!ctx.feeder) return [];
  const g = "Doors";
  return [
    fixed(ctx, "DR-0512-1967 door", { code: "DR-0512-1967", name: "Door, device area (hinged left)", group: g, step: 25, qty: 1, mat: "crca15", process: "Laser + 8 bends, vertical stiffener", note: "Handle cutout 40 x 140 (check with the handle sample)", dependsOn: ["H"] }),
    fixed(ctx, "DR-0280-1967 door", { code: "DR-0280-1967", name: "Door, cable alley (hinged right)", group: g, step: 26, qty: 1, mat: "crca15", process: "Laser + 8 bends", note: "2 x Ø22 for cam locks", dependsOn: ["H"] }),
    bought(ctx, { code: "HG-180", name: "Concealed panel hinge 180°, zinc alloy", group: g, step: 25, qty: 6, material: "Zinc alloy", note: "3 per door" }),
    bought(ctx, { code: "SH-3P", name: "Swing handle with key + padlock, 3-point rod latch kit", group: g, step: 25, qty: 1, material: "Zinc alloy / steel" }),
    bought(ctx, { code: "ST-01", name: "Latch strike (L bracket)", group: g, step: 25, qty: 5, material: "Pre-galvanised steel 2.5", process: "Laser + 2 bends", note: "No drawing in the reference set yet", status: "review" }),
    bought(ctx, { code: "GK-8x9", name: "Door gasket EPDM 8 x 9, self-adhesive", group: g, step: 25, qty: 10.5, unit: "m", material: "EPDM" }),
    bought(ctx, { code: "EB-16", name: "Earth braid 16 mm², 300 mm, M6 lugs", group: g, step: 25, qty: 2, material: "Tinned Cu" }),
    bought(ctx, { code: "CL-22", name: "Quarter-turn cam lock Ø22, same key as the handle", group: g, step: 26, qty: 2, material: "Zinc alloy" }),
  ];
};
