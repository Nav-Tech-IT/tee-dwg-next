// The component library. To add a part: write a rule (see helpers.ts) and list it here.
import { chamber, mainBusbars, pe, risers } from "./busbars";
import { frame, panels, plinth, roof } from "./enclosure";
import { cableAlley, covers, doors, units } from "./feeders";
import { form34 } from "./forms";
import type { PartRule } from "./helpers";
import { incomer } from "./incomer";

export const RULES: { name: string; rule: PartRule }[] = [
  { name: "Plinth", rule: plinth },
  { name: "Frame", rule: frame },
  { name: "Roof & lifting", rule: roof },
  { name: "Panels", rule: panels },
  { name: "Busbar chamber", rule: chamber },
  { name: "Main busbars", rule: mainBusbars },
  { name: "Vertical busbars", rule: risers },
  { name: "Feeder units", rule: units },
  { name: "Cable alley", rule: cableAlley },
  { name: "PE bar", rule: pe },
  { name: "Covers", rule: covers },
  { name: "Doors", rule: doors },
  { name: "Form 3/4", rule: form34 },
  { name: "Incomer", rule: incomer },
];

export * from "./helpers";
