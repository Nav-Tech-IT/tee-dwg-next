// TSG-F system constants. Everything an engineer would look up in the design
// rules lives here, so a change of standard is a one-line edit.

export const SYSTEM = {
  name: "TSG-F",
  rev: "Stage 3-9 Rev A",
  /** Reference section the original design (and the fixed reference parts) was made for. */
  ref: { W: 800, D: 600, H: 2000 },
  plinth: 100,
  /** Feeder zone on the device side, measured from the top of the plinth. */
  zone: { z0: 400, z1: 1600 },
  grid: 50,
  /** Device side / cable alley split of an 800 feeder section (mid upright feeder face). */
  deviceWidth: 475,
} as const;

export const FORMS = ["1", "2a", "2b", "3a", "3b", "4a", "4b"] as const;
export type Form = (typeof FORMS)[number];

export const FORM_TEXT: Record<Form, string> = {
  "1": "No internal separation",
  "2a": "Busbars separated from functional units; terminals not separated from busbars",
  "2b": "Busbars separated from functional units; terminals separated from busbars",
  "3a": "Form 2 + each functional unit separated from the others; terminals not separated",
  "3b": "3a + terminals separated from busbars",
  "4a": "Units and their terminals separated from each other; terminals in the same compartment as the unit",
  "4b": "Units and their terminals separated from each other; terminals in their own compartment",
};

export const FORM2_UP: Form[] = ["2a", "2b", "3a", "3b", "4a", "4b"];
export const FORM3_UP: Form[] = ["3a", "3b", "4a", "4b"];

export type Frame = "250" | "630";
export type Poles = "3P" | "4P";
export type KitId = `K${Frame}-${Poles}`;

export interface Kit {
  id: KitId;
  frame: Frame;
  poles: Poles;
  /** Height of the module in the feeder zone. */
  module: number;
  breaker: { code: string; name: string; ratings: number[]; w: number; h: number; d: number };
  link: string;
  phases: string[];
  /** Duct-barrier window for this kit: x range, height and offset of its bottom edge from the module bottom. */
  window: { x0: number; x1: number; h: number; dz: number; holes: [number, number] };
  shield: string;
}

const P3 = ["R", "Y", "B"], P4 = ["N", "R", "Y", "B"];

export const KITS: Record<KitId, Kit> = {
  "K630-4P": {
    id: "K630-4P", frame: "630", poles: "4P", module: 350, link: "32x10", phases: P4,
    breaker: { code: "NSX630-4P", name: "ComPacT NSX400/630 4P, fixed, front connection", ratings: [400, 500, 630], w: 185, h: 255, d: 110 },
    window: { x0: 108.5, x1: 470.5, h: 34, dz: -1.2, holes: [96.5, 482.5] },
    shield: "LV432592",
  },
  "K630-3P": {
    id: "K630-3P", frame: "630", poles: "3P", module: 350, link: "32x10", phases: P3,
    breaker: { code: "NSX630-3P", name: "ComPacT NSX400/630 3P, fixed, front connection", ratings: [400, 500, 630], w: 140, h: 255, d: 110 },
    window: { x0: 208.5, x1: 470.5, h: 34, dz: -1.2, holes: [196.5, 482.5] },
    shield: "LV432591",
  },
  "K250-4P": {
    id: "K250-4P", frame: "250", poles: "4P", module: 250, link: "25x5", phases: P4,
    breaker: { code: "NSX250-4P", name: "ComPacT NSX100/160/250 4P, fixed, front connection", ratings: [100, 160, 250], w: 140, h: 161, d: 86 },
    window: { x0: 112, x1: 467, h: 29, dz: -101.2, holes: [100, 479] },
    shield: "LV429516",
  },
  "K250-3P": {
    id: "K250-3P", frame: "250", poles: "3P", module: 250, link: "25x5", phases: P3,
    breaker: { code: "NSX250-3P", name: "ComPacT NSX100/160/250 3P, fixed, front connection", ratings: [100, 160, 250], w: 105, h: 161, d: 86 },
    window: { x0: 212, x1: 467, h: 29, dz: -101.2, holes: [200, 479] },
    shield: "LV429515",
  },
};

export const kitFor = (frame: Frame, poles: Poles): Kit => KITS[`K${frame}-${poles}`];

export const RATINGS: Record<Frame, number[]> = { "250": [100, 160, 250], "630": [400, 500, 630] };

export const INCOMERS = {
  "MTZ2-16-4P-D": { name: "Schneider MasterPact MTZ2 16 4P drawout + chassis", rating: 1600 },
} as const;
export type IncomerType = keyof typeof INCOMERS;

/** Section depths and heights the user can pick. Not every part has a rule for every size yet; the build reports which. */
export const DEPTHS = [600, 800] as const;
export const HEIGHTS = [2000, 2200] as const;

export const MATERIALS = {
  galv20: { material: "Pre-galvanised steel", t: 2.0, density: 7.85 },
  galv25: { material: "Pre-galvanised steel", t: 2.5, density: 7.85 },
  galv30: { material: "Pre-galvanised steel", t: 3.0, density: 7.85 },
  galv15: { material: "Pre-galvanised steel", t: 1.5, density: 7.85 },
  crca15: { material: "CRCA, powder coated RAL 7035", t: 1.5, density: 7.85 },
  crca20: { material: "CRCA, powder coated RAL 7035", t: 2.0, density: 7.85 },
  cu10: { material: "Cu-ETP, hard", t: 10, density: 8.94 },
  cu5: { material: "Cu-ETP, half-hard", t: 5, density: 8.94 },
  gpo: { material: "GPO-3 glass-polyester", t: 3, density: 1.9 },
} as const;

export const pad4 = (n: number) => String(Math.round(n)).padStart(4, "0");
