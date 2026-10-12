// Component library model, shared by the server, the UI and (later) the engine and MCP.
//
//   Brand ─┐
//          ├─ Series (a frame / product family of one brand and one type, e.g. LS Metasol ABS250c)
//   Type  ─┘     └─ Product (one orderable item: part number, poles, rating …)
//
// Field definitions live on the Type, so a new kind of component is data, not code.
// Values can sit on the series (shared by every product of the frame) or on the
// product (overrides). Fields marked byPoles store one value per pole count.

export type FieldKind = "number" | "text" | "enum" | "bool" | "points";

export const FIELD_GROUPS = ["Electrical", "Body", "Mounting", "Front", "Terminals", "Clearances", "Other"] as const;
export type FieldGroup = (typeof FIELD_GROUPS)[number];

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  group: FieldGroup;
  unit?: string;
  options?: string[];
  /** One value per pole count (e.g. a 4P body is wider than a 3P one). */
  byPoles?: boolean;
  /** Needed by the design engine: a product cannot be verified without it. */
  required?: boolean;
  help?: string;
}

export interface ComponentType {
  id: string;
  category: string;
  name: string;
  fields: FieldDef[];
  sort: number;
}

/** points: [x, y] in mm from the device centre, x to the right, y up, seen from the front. */
export type Points = [number, number][];
export type Scalar = number | string | boolean | Points;
export type RawValue = Scalar | Record<string, Scalar>;

/** A stored value with where it came from. */
export interface SpecValue {
  v: RawValue;
  /** Source id (datasheet, catalogue, drawing). */
  src?: string;
  page?: string;
  note?: string;
}

export type Specs = Record<string, SpecValue>;

export type ProductStatus = "draft" | "extracted" | "verified";

export interface Brand { id: string; name: string; website: string; notes: string; active: boolean }
export interface Series { id: string; brandId: string; typeId: string; name: string; notes: string; specs: Specs; files: string[]; active: boolean; updatedAt: string }
export interface Product { id: string; seriesId: string; partNumber: string; name: string; specs: Specs; files: string[]; status: ProductStatus; active: boolean; updatedAt: string }
export interface Source { id: string; brandId: string | null; title: string; kind: "catalogue" | "datasheet" | "drawing" | "3d" | "other"; url: string; file: string | null; notes: string; retrievedAt: string }

/* ---------------- Seed types ---------------- */

const f = (key: string, label: string, kind: FieldKind, group: FieldGroup, extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, kind, group, ...extra });

const POLES = f("poles", "Poles", "enum", "Electrical", { options: ["1", "2", "3", "4"], required: true });
const BODY = (byPoles = true) => [
  f("width", "Width", "number", "Body", { unit: "mm", byPoles, required: true }),
  f("height", "Height", "number", "Body", { unit: "mm", byPoles, required: true }),
  f("depth", "Depth from mounting surface", "number", "Body", { unit: "mm", byPoles, required: true }),
  f("weight", "Weight", "number", "Body", { unit: "kg", byPoles }),
];
const MOUNTING = (opts: string[]) => f("mounting", "Mounting", "enum", "Mounting", { options: opts, required: true });
const CLEAR = [
  f("clear_top", "Clearance above (line side)", "number", "Clearances", { unit: "mm", required: true, help: "Safety / arc clearance from the catalogue" }),
  f("clear_bottom", "Clearance below", "number", "Clearances", { unit: "mm", required: true }),
  f("clear_side", "Clearance at the sides", "number", "Clearances", { unit: "mm" }),
];
const BREAKER_FRONT = [
  f("cutout_w", "Door / cover cutout width", "number", "Front", { unit: "mm", byPoles: true, required: true }),
  f("cutout_h", "Door / cover cutout height", "number", "Front", { unit: "mm", byPoles: true, required: true }),
  f("cutout_dx", "Cutout centre offset, x", "number", "Front", { unit: "mm", byPoles: true, help: "From the device centre, + to the right" }),
  f("cutout_dy", "Cutout centre offset, y", "number", "Front", { unit: "mm", byPoles: true, help: "From the device centre, + up" }),
  f("front_depth", "Mounting surface to front face (c1)", "number", "Front", { unit: "mm", byPoles: true }),
];
const TERMINALS = [
  f("pole_pitch", "Pole pitch", "number", "Terminals", { unit: "mm", required: true }),
  f("terminal_y", "Terminal centre from device centre (vertical)", "number", "Terminals", { unit: "mm", required: true, help: "Line and load terminals assumed symmetric" }),
  f("terminal_depth", "Terminal centre from mounting surface", "number", "Terminals", { unit: "mm" }),
  f("terminal_bolt", "Terminal bolt", "text", "Terminals", { help: "e.g. M8 x 20" }),
  f("terminal_bar_max", "Max. bar width", "number", "Terminals", { unit: "mm" }),
  f("neutral_side", "Neutral pole (4P)", "enum", "Terminals", { options: ["left", "right"] }),
];

export const SEED_TYPES: ComponentType[] = [
  {
    id: "mccb", category: "Breaker", name: "MCCB", sort: 10,
    fields: [
      f("rating", "Rated current In", "number", "Electrical", { unit: "A", required: true }), POLES,
      f("frame", "Frame size", "number", "Electrical", { unit: "A" }),
      f("icu", "Breaking capacity Icu (415 V)", "number", "Electrical", { unit: "kA", required: true }),
      f("trip_unit", "Trip unit", "text", "Electrical"),
      ...BODY(), MOUNTING(["plate (screw)", "DIN 35", "plate or DIN", "plug-in", "drawout"]),
      f("fixing_holes", "Fixing holes", "points", "Mounting", { byPoles: true, required: true, help: "Hole centres from the device centre" }),
      f("fixing_screw", "Fixing screw", "text", "Mounting"),
      ...BREAKER_FRONT, ...TERMINALS, ...CLEAR,
    ],
  },
  {
    id: "acb", category: "Breaker", name: "ACB", sort: 20,
    fields: [
      f("rating", "Rated current In", "number", "Electrical", { unit: "A", required: true }), POLES,
      f("icu", "Breaking capacity Icu (415 V)", "number", "Electrical", { unit: "kA", required: true }),
      f("version", "Version", "enum", "Electrical", { options: ["fixed", "drawout"], required: true }),
      f("trip_unit", "Trip unit", "text", "Electrical"),
      ...BODY(), MOUNTING(["floor / base plate", "drawout chassis"]),
      f("fixing_holes", "Fixing holes", "points", "Mounting", { byPoles: true, required: true }),
      ...BREAKER_FRONT,
      f("connection", "Terminal connection", "enum", "Terminals", { options: ["rear horizontal", "rear vertical", "front"], required: true }),
      f("pole_pitch", "Pole pitch", "number", "Terminals", { unit: "mm", required: true }),
      f("terminal_y", "Terminal centre from device centre (vertical)", "number", "Terminals", { unit: "mm", required: true }),
      f("terminal_depth", "Terminal centre from mounting surface", "number", "Terminals", { unit: "mm", required: true }),
      ...CLEAR,
    ],
  },
  {
    id: "mcb", category: "Breaker", name: "MCB", sort: 30,
    fields: [
      f("rating", "Rated current In", "number", "Electrical", { unit: "A", required: true }), POLES,
      f("function", "AC / DC", "text", "Electrical"),
      f("curve", "Trip curve", "enum", "Electrical", { options: ["B", "C", "D", "K", "Z"] }),
      f("icu", "Breaking capacity", "number", "Electrical", { unit: "kA", required: true }),
      ...BODY(), MOUNTING(["DIN 35"]),
    ],
  },
  {
    id: "rcd", category: "Breaker", name: "RCCB / RCBO", sort: 40,
    fields: [
      f("rating", "Rated current In", "number", "Electrical", { unit: "A", required: true }), POLES,
      f("sensitivity", "Sensitivity IΔn", "number", "Electrical", { unit: "mA", required: true }),
      f("icu", "Breaking capacity (RCBO)", "number", "Electrical", { unit: "kA" }),
      ...BODY(), MOUNTING(["DIN 35"]),
    ],
  },
  {
    id: "isolator", category: "Switching", name: "Switch-disconnector", sort: 50,
    fields: [
      f("rating", "Rated current", "number", "Electrical", { unit: "A", required: true }), POLES,
      f("function", "Function", "text", "Electrical", { help: "e.g. load break, changeover I-0-II, cam switch" }),
      ...BODY(), MOUNTING(["plate (screw)", "DIN 35", "plate or DIN", "door"]),
      f("fixing_holes", "Fixing holes", "points", "Mounting", { byPoles: true }),
      f("cutout_w", "Door cutout width", "number", "Front", { unit: "mm" }),
      f("cutout_h", "Door cutout height", "number", "Front", { unit: "mm" }),
      f("pole_pitch", "Pole pitch", "number", "Terminals", { unit: "mm" }),
    ],
  },
  {
    id: "contactor", category: "Switching", name: "Contactor", sort: 60,
    fields: [
      f("rating_ac3", "Rated current AC-3", "number", "Electrical", { unit: "A", required: true }),
      f("kw_ac3", "Motor power AC-3 400 V", "number", "Electrical", { unit: "kW" }),
      POLES, f("coil", "Coil voltage", "text", "Electrical"),
      f("aux", "Auxiliary contacts", "text", "Electrical"),
      ...BODY(false), MOUNTING(["DIN 35", "plate (screw)", "DIN or screw"]),
    ],
  },
  {
    id: "overload", category: "Switching", name: "Overload relay", sort: 65,
    fields: [
      f("range", "Setting range", "text", "Electrical", { required: true }),
      ...BODY(false), MOUNTING(["on contactor", "DIN 35", "plate (screw)"]),
    ],
  },
  {
    id: "relay", category: "Control", name: "Relay / timer", sort: 70,
    fields: [
      f("function", "Function", "text", "Electrical", { required: true }),
      f("supply", "Supply voltage", "text", "Electrical"),
      ...BODY(false), MOUNTING(["DIN 35", "DIN socket", "plate (screw)", "door"]),
      f("socket", "Socket / base", "text", "Mounting"),
    ],
  },
  {
    id: "pilot", category: "Control", name: "Pushbutton / pilot light / selector", sort: 80,
    fields: [
      f("function", "Function", "text", "Electrical", { required: true }),
      f("colour", "Colour", "text", "Electrical"),
      f("hole_d", "Mounting hole diameter", "number", "Front", { unit: "mm", required: true }),
      f("bezel", "Bezel size", "number", "Front", { unit: "mm" }),
      f("depth", "Depth behind the door", "number", "Body", { unit: "mm", required: true }),
      MOUNTING(["door"]),
    ],
  },
  {
    id: "meter", category: "Measuring", name: "Meter", sort: 90,
    fields: [
      f("function", "Function", "text", "Electrical", { required: true }),
      f("width", "Front width", "number", "Body", { unit: "mm", required: true }),
      f("height", "Front height", "number", "Body", { unit: "mm", required: true }),
      f("depth", "Depth behind the door", "number", "Body", { unit: "mm", required: true }),
      f("cutout_w", "Cutout width", "number", "Front", { unit: "mm", required: true }),
      f("cutout_h", "Cutout height", "number", "Front", { unit: "mm", required: true }),
      MOUNTING(["door", "DIN 35"]),
    ],
  },
  {
    id: "ct", category: "Measuring", name: "Current transformer", sort: 100,
    fields: [
      f("ratio", "Ratio", "text", "Electrical", { required: true }),
      f("window", "Primary window", "text", "Body", { help: "e.g. Ø32 or 40 x 10 bar" }),
      ...BODY(false), MOUNTING(["on cable / bar", "plate (screw)", "DIN 35"]),
    ],
  },
  {
    id: "spd", category: "Protection", name: "Surge protective device", sort: 45,
    fields: [POLES, f("function", "Type / rating", "text", "Electrical", { required: true }), ...BODY(false), MOUNTING(["DIN 35"])],
  },
  {
    id: "mpcb", category: "Switching", name: "Motor starter (MPCB)", sort: 62,
    fields: [
      f("range", "Setting range", "text", "Electrical", { required: true }),
      f("icu", "Breaking capacity", "number", "Electrical", { unit: "kA" }),
      f("function", "Function", "text", "Electrical"),
      ...BODY(false), MOUNTING(["DIN 35", "plate (screw)", "enclosure"]),
    ],
  },
  {
    id: "ats", category: "Switching", name: "Transfer switch (ATS)", sort: 55,
    fields: [
      f("rating", "Rated current", "number", "Electrical", { unit: "A", required: true }), POLES,
      ...BODY(false), MOUNTING(["plate (screw)"]),
      f("fixing_holes", "Fixing holes", "points", "Mounting"),
    ],
  },
  {
    id: "fuse", category: "Protection", name: "Fuse / fuse base", sort: 48,
    fields: [
      f("rating", "Rated current", "number", "Electrical", { unit: "A", required: true }),
      f("function", "Part", "text", "Electrical", { help: "fuse link, fuse base, fuse holder" }),
      f("size", "Fuse size", "text", "Electrical", { help: "e.g. NH00, NH1" }),
      ...BODY(false), MOUNTING(["plate (screw)", "DIN 35"]),
    ],
  },
  {
    id: "capacitor", category: "Power quality", name: "Capacitor", sort: 110,
    fields: [
      f("function", "Rating", "text", "Electrical", { required: true }),
      f("diameter", "Diameter (round can)", "number", "Body", { unit: "mm" }),
      ...BODY(false), MOUNTING(["stud (M12)", "bracket"]),
    ],
  },
  {
    id: "vfd", category: "Drives", name: "Drive (VFD)", sort: 120,
    fields: [
      f("function", "Rating / input", "text", "Electrical", { required: true }),
      ...BODY(false), MOUNTING(["plate (screw)", "DIN 35", "through-panel"]),
      f("clear_top", "Clearance above", "number", "Clearances", { unit: "mm", required: true }),
      f("clear_bottom", "Clearance below", "number", "Clearances", { unit: "mm", required: true }),
      f("heat_loss", "Heat loss", "number", "Other", { unit: "W" }),
    ],
  },
  {
    id: "other", category: "Other", name: "Other component", sort: 200,
    fields: [
      f("function", "Function", "text", "Electrical"),
      f("width", "Width", "number", "Body", { unit: "mm" }),
      f("height", "Height", "number", "Body", { unit: "mm" }),
      f("depth", "Depth", "number", "Body", { unit: "mm" }),
      f("mounting", "Mounting", "text", "Mounting"),
    ],
  },
];
