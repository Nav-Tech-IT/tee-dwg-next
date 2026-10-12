// First-run content: component types, the brands TEE uses, standard sizes, and
// the products whose data can be traced to a document we already have:
//  - reference-scripts/library/devices.json (LS / Autonics items, catalogue pages cited)
//  - the TSG-F reference design (Schneider NSX values written on its drawings and parts list)
// Nothing is filled in without a source; everything starts as "extracted" until an engineer verifies it.
import type Database from "better-sqlite3";
import { SEED_TYPES, type Specs } from "./schema";

const id = (p: string) => `${p}_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;

export const STANDARD_SIZES = {
  "TSG-F": {
    name: "TSG-F modular switchboard (floor standing, rear vertical busbar)",
    widths: [400, 600, 800, 1000], depths: [600, 800], heights: [2000], plinth: 100, grid: 25,
    source: "reference-scripts/tsgf/geom.py (WIDTHS, DEPTHS, H)",
  },
  "TSG-MCC-O": {
    name: "TSG-MCC-O outdoor MCC (mounting plate + DIN rows)",
    widths: [600, 800, 1000, 1200], depths: [400, 600], heights: [1800, 2000, 2200], plinth: 100, grid: 25,
    source: "reference-scripts/standards/TSG-MCC-O_rev_A.md (size family)",
  },
};

const BRANDS: [string, string, string][] = [
  ["schneider", "Schneider Electric", "https://www.se.com"],
  ["chint", "CHINT", "https://www.chintglobal.com"],
  ["ls", "LS Electric", "https://www.ls-electric.com"],
  ["abb", "ABB", "https://new.abb.com/low-voltage"],
  ["terasaki", "Terasaki", "https://www.terasaki.com"],
  ["autonics", "Autonics", "https://www.autonics.com"],
];

export function seed(d: Database.Database) {
  const insType = d.prepare("INSERT INTO types (id, category, name, fields, sort) VALUES (?, ?, ?, ?, ?)");
  for (const t of SEED_TYPES) insType.run(t.id, t.category, t.name, JSON.stringify(t.fields), t.sort);
  const insBrand = d.prepare("INSERT INTO brands (id, name, website) VALUES (?, ?, ?)");
  for (const b of BRANDS) insBrand.run(...b);
  d.prepare("INSERT INTO settings (key, value) VALUES ('standard_sizes', ?)").run(JSON.stringify(STANDARD_SIZES));

  const insSource = d.prepare("INSERT INTO sources (id, brand_id, title, kind, url, notes) VALUES (?, ?, ?, ?, ?, ?)");
  const source = (brand: string | null, title: string, kind: string, notes = "") => {
    const sid = id("src");
    insSource.run(sid, brand, title, kind, "", notes);
    return sid;
  };
  const insSeries = d.prepare("INSERT INTO series (id, brand_id, type_id, name, notes, specs) VALUES (?, ?, ?, ?, ?, ?)");
  const series = (brand: string, type: string, name: string, specs: Specs, notes = "") => {
    const sid = id("ser");
    insSeries.run(sid, brand, type, name, notes, JSON.stringify(specs));
    return sid;
  };
  const insProduct = d.prepare("INSERT INTO products (id, series_id, part_number, name, specs, status) VALUES (?, ?, ?, ?, ?, ?)");
  const log = d.prepare("INSERT INTO history (entity, entity_id, action, detail) VALUES (?, ?, 'seed', ?)");
  const product = (seriesId: string, part: string, name: string, specs: Specs, status = "extracted") => {
    const pid = id("prd");
    insProduct.run(pid, seriesId, part, name, JSON.stringify(specs), status);
    log.run("product", pid, JSON.stringify({ from: "first-run seed" }));
    return pid;
  };

  /* ---- LS Electric (reference-scripts/library/devices.json) ---- */
  const lsMccb = source("ls", "LS Metasol MCCB catalogue E_1112", "catalogue", "Cited in devices.json: p.108 (ABN/ABS/ABH250c)");
  const s = (v: unknown, page?: string, src = lsMccb) => ({ v: v as never, src, page });
  const abs = series("ls", "mccb", "Metasol ABN/ABS/ABH 250c", {
    frame: s(250, "108"),
    width: s({ "3": 105 }, "108"), height: s({ "3": 165 }, "108"), depth: s({ "3": 60 }, "108"),
    mounting: s("plate (screw)", "108"),
    fixing_holes: s({ "3": [[-17.5, -63], [17.5, -63], [-17.5, 63], [17.5, 63]] }, "108"),
    fixing_screw: s("4 x M4 (or Ø5)", "108"),
    cutout_w: s({ "3": 70 }, "108"), cutout_h: s({ "3": 104 }, "108"),
    front_depth: s({ "3": 64 }, "108"),
    pole_pitch: s(35, "108"), terminal_bolt: s("M8 x 20", "108"), terminal_bar_max: s(22, "108"),
  }, "devices.json: verify drilling on the first sample. Cutout is centred on the handle; handle offset from the body centre not recorded yet.");
  product(abs, "ABS203c 250A FMU", "ABS203c 250 A, fixed magnetic unit", { rating: s(250, "108"), poles: s("3", "108"), icu: s(37, "108") });

  const lsMcb = source("ls", "LS BKJ63N MCB catalogue", "catalogue", "Cited in devices.json: 17.8 mm per pole, 81 x 62");
  const m = (v: unknown) => ({ v: v as never, src: lsMcb });
  const bkj = series("ls", "mcb", "BKJ63N", {
    width: m({ "1": 17.8, "2": 35.6, "3": 53.4, "4": 71.2 }), height: m({ "1": 81, "2": 81, "3": 81, "4": 81 }),
    depth: m({ "1": 62, "2": 62, "3": 62, "4": 62 }), mounting: m("DIN 35"),
  });
  for (const [p, r] of [["3", 20], ["3", 40], ["1", 2], ["1", 6], ["1", 16], ["1", 20]] as [string, number][])
    product(bkj, `BKJ63N ${p}P ${r}A`, `BKJ63N ${p}P ${r} A`, { poles: m(p), rating: m(r) });

  const lsMc = source("ls", "LS Metasol MC contactor catalogue", "catalogue", "Cited in devices.json: 45 x 73.5 x 96.6");
  const c = (v: unknown) => ({ v: v as never, src: lsMc });
  const mc = series("ls", "contactor", "Metasol MC 9a-18a", { width: c(45), height: c(73.5), depth: c(96.6), mounting: c("DIN or screw"), poles: c("3") });
  product(mc, "MC-18a AC220V", "MC-18a, coil AC 220 V", { rating_ac3: c(18), coil: c("AC 220 V") });
  product(mc, "MC-9a AC220V", "MC-9a, coil AC 220 V", { rating_ac3: c(9), coil: c("AC 220 V") });

  const aut = source("autonics", "Autonics PS-08 socket datasheet", "datasheet", "devices.json: socket 70 x 50 x 40; timer depth approx");
  const at8 = series("autonics", "relay", "AT8N", { function: { v: "multi-function timer, 8-pin" } }, "Timer depth not confirmed (approx 70 + socket).");
  product(at8, "AT8N + PS-08", "AT8N timer on PS-08 DIN socket", {
    width: { v: 48, src: aut, note: "width along the rail assumed = timer body (to confirm)" },
    height: { v: 50, src: aut }, mounting: { v: "DIN socket", src: aut }, socket: { v: "PS-08", src: aut },
  }, "draft");

  /* ---- Schneider (values written on the TSG-F reference drawings / parts list) ---- */
  const ref = source("schneider", "TSG-F reference design: MP-250 / MP-630 drawings and parts list", "drawing",
    "Body outlines on the mounting-plate MARK layer per Schneider GHD16242AA / GHD16243AA; cutouts and screws from the parts list. Depth, terminals and clearances not in the reference set.");
  const r = (v: unknown, page?: string) => ({ v: v as never, src: ref, page });
  const nsx250 = series("schneider", "mccb", "ComPacT NSX100-250", {
    frame: r(250), width: r({ "3": 105, "4": 140 }, "MP-250"), height: r({ "3": 161, "4": 161 }, "MP-250"),
    mounting: r("plate (screw)"), fixing_screw: r("M5 x 70 (3P: 2, 4P: 4), 3 Nm", "parts list"),
    cutout_w: r({ "3": 95, "4": 95 }, "FC-250"), cutout_h: r({ "3": 77, "4": 77 }, "FC-250"),
    terminal_bolt: r("M8 x 20, 15 Nm", "parts list"), neutral_side: r("left", "L-250-4P"),
  });
  const nsx630 = series("schneider", "mccb", "ComPacT NSX400-630", {
    frame: r(630), width: r({ "3": 140, "4": 185 }, "MP-630"), height: r({ "3": 255, "4": 255 }, "MP-630"),
    mounting: r("plate (screw)"), fixing_screw: r("4 x M5 x 85", "parts list"),
    cutout_w: r({ "3": 127, "4": 127 }, "FC-630"), cutout_h: r({ "3": 127, "4": 127 }, "FC-630"),
    terminal_bolt: r("M10 x 27", "parts list"), neutral_side: r("left", "L-630-4P"),
  });
  for (const p of ["3", "4"]) {
    for (const a of [100, 160, 250]) product(nsx250, `NSX${a} ${p}P`, `ComPacT NSX${a} ${p}P, fixed, front connection`, { rating: r(a), poles: r(p) });
    for (const a of [400, 630]) product(nsx630, `NSX${a} ${p}P`, `ComPacT NSX${a} ${p}P, fixed, front connection`, { rating: r(a), poles: r(p) });
  }
  const acb = series("schneider", "acb", "MasterPact MTZ2", { version: r("drawout") }, "Chassis CAD MCADPD0005089 (not in the project yet).");
  product(acb, "MTZ2 16 4P D", "MasterPact MTZ2 16 4P drawout + chassis", { rating: r(1600), poles: r("4") }, "draft");
}
