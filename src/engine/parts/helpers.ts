// Building blocks for part rules. A part rule looks at one section (plus the
// order) and returns the lines it contributes to the parts list.
import type { Flat } from "../flat";
import type { Lineup, Section } from "../layout";
import { referenceFlat } from "../reference";
import type { Requirements } from "../requirements";
import { MATERIALS, SYSTEM, type Form } from "../system";

/**
 * parametric – geometry is generated from the order (checked against the reference design).
 * fixed      – one geometry per kit / per system, copied from the reference design.
 * review     – generated, but the rule is new or partly guessed: an engineer must check it.
 */
export type Status = "parametric" | "fixed" | "review";

export interface PartLine {
  code: string;
  name: string;
  group: string;
  step: number;
  qty: number;
  unit: "pcs" | "m";
  kind: "made" | "bought";
  material: string;
  t: number | null;
  density?: number;
  process: string;
  note?: string;
  status: Status;
  /** Drawing key: several codes can share one DXF (e.g. the 4 links of a kit). */
  flatKey?: string;
  flat?: () => Flat;
  section: string;
  /** Set when this part has no rule for the section size; it is then left out of the DXF set. */
  unsupported?: string;
}

export interface Ctx {
  req: Requirements;
  lineup: Lineup;
  s: Section;
  form: Form;
  feeder: boolean;
  incomer: boolean;
  /** Layout variant letter: feeder sections with the same feeder stack share drawings (A, B, …). */
  variant: string;
}

export type PartRule = (ctx: Ctx) => PartLine[];

type Mat = keyof typeof MATERIALS;

interface MadeSpec {
  code: string;
  name: string;
  group: string;
  step: number;
  qty: number;
  mat: Mat;
  /** Overrides for parts whose stock differs from the material preset (e.g. 12 mm GPO). */
  t?: number;
  material?: string;
  process: string;
  status: Status;
  flat: () => Flat;
  flatKey?: string;
  note?: string;
  unsupported?: string;
}

export function made(ctx: Ctx, p: MadeSpec): PartLine {
  const m = MATERIALS[p.mat];
  return {
    code: p.code, name: p.name, group: p.group, step: p.step, qty: p.qty, unit: "pcs", kind: "made",
    material: p.material ?? m.material, t: p.t ?? m.t, density: m.density, process: p.process, note: p.note,
    status: p.status, flat: p.flat, flatKey: p.flatKey ?? p.code, section: ctx.s.id, unsupported: p.unsupported,
  };
}

/** Which section dimensions a fixed reference part was drawn for. */
export type DependsOn = ("D" | "H")[];

export function unsupportedFor(ctx: Ctx, dependsOn: DependsOn = []): string | undefined {
  const bad: string[] = [];
  if (dependsOn.includes("D") && ctx.s.D !== SYSTEM.ref.D) bad.push(`depth ${ctx.s.D}`);
  if (dependsOn.includes("H") && ctx.s.H !== SYSTEM.ref.H) bad.push(`height ${ctx.s.H}`);
  return bad.length ? `Only drawn for ${SYSTEM.ref.D} deep x ${SYSTEM.ref.H} high; no rule yet for ${bad.join(" and ")}.` : undefined;
}

/** A part copied from the reference design. */
export function fixed(
  ctx: Ctx,
  refName: string,
  p: Omit<MadeSpec, "flat" | "status" | "flatKey"> & { dependsOn?: DependsOn },
): PartLine {
  return made(ctx, { ...p, status: "fixed", flatKey: refName, flat: () => referenceFlat(refName), unsupported: unsupportedFor(ctx, p.dependsOn) });
}

export function bought(
  ctx: Ctx,
  p: { code: string; name: string; group: string; step: number; qty: number; unit?: "pcs" | "m"; material?: string; process?: string; note?: string; status?: Status },
): PartLine {
  return {
    code: p.code, name: p.name, group: p.group, step: p.step, qty: p.qty, unit: p.unit ?? "pcs", kind: "bought",
    material: p.material ?? "", t: null, process: p.process ?? "Buy", note: p.note, status: p.status ?? "fixed", section: ctx.s.id,
  };
}

export const inForms = (ctx: Ctx, forms: Form[]) => forms.includes(ctx.form);

export const count = <T>(xs: T[], pred: (x: T) => boolean) => xs.filter(pred).length;

/** Layout-specific drawing code, e.g. VB-0800-A: one DXF per distinct feeder stack in the job. */
export const perLayout = (base: string, ctx: Ctx) => `${base}-${ctx.variant}`;
