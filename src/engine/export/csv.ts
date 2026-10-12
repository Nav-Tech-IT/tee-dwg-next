import type { Build } from "../build";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function bomCsv(b: Build): string {
  const ids = b.lineup.sections.map((s) => s.id);
  const head = ["Step", "Group", "Code", "Name", "Qty", "Unit", ...ids, "Kind", "Material", "Thickness", "Process", "Weight kg/pc", "Drawing", "Status", "Note"];
  const rows = b.bom.map((l) => [
    l.step, l.group, l.code, l.name, l.qty, l.unit, ...ids.map((id) => l.perSection[id] ?? ""), l.kind, l.material, l.t ?? "",
    l.process, l.weight ?? "", l.kind === "made" && !l.unsupported ? `${l.flatKey}.dxf` : "", l.unsupported ? "NO RULE" : l.status, l.note ?? "",
  ]);
  return [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

export function feederScheduleCsv(b: Build): string {
  const head = ["Section", "Position", "Tag", "Description", "Breaker", "Rating A", "Poles", "Module bottom z", "Module height"];
  const rows = b.lineup.sections.flatMap((s) =>
    s.modules.map((m) => [s.id, m.pos, m.tag, m.description, m.kit.breaker.code, m.rating, m.kit.poles, m.z, m.h]),
  );
  return [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
