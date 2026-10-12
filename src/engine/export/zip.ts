// The factory package: DXFs sorted by material and thickness, the PDF drawing
// set, the parts list and the exact requirements the package was generated from.
import JSZip from "jszip";
import type { Build } from "../build";
import { drawingSet } from "../drawings/sheets";
import { bomCsv, feederScheduleCsv } from "./csv";
import { toDxf } from "./dxf";
import { sheetsToPdf } from "./pdf";

const safe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim() || "project";

export function packageName(b: Build) {
  const p = b.req.project;
  return safe([p.reference, p.name, `rev ${p.revision}`].filter(Boolean).join(" "));
}

export async function factoryZip(b: Build): Promise<Uint8Array> {
  const zip = new JSZip(), root = zip.folder(packageName(b))!;
  const errors = b.issues.filter((i) => i.level === "error");

  root.file("requirements.json", JSON.stringify(b.req, null, 2));
  root.file("parts-list.csv", bomCsv(b));
  root.file("feeder-schedule.csv", feederScheduleCsv(b));
  root.file("drawings.pdf", await sheetsToPdf(drawingSet(b), { title: `${b.req.project.name} – drawings`, author: b.req.project.drawnBy }));

  const index = [["File", "Codes", "Qty", "Material", "Thickness", "Process", "Status", "Blank X", "Blank Y"].join(",")];
  for (const d of b.drawings) {
    const dir = safe(`${d.material} ${d.t ?? ""}mm`);
    root.file(`dxf/${dir}/${d.key}.dxf`, toDxf(d.flat));
    index.push([`${dir}/${d.key}.dxf`, d.codes.join(" "), d.qty, d.material, d.t ?? "", d.process, d.status, (d.size.x1 - d.size.x0).toFixed(1), (d.size.y1 - d.size.y0).toFixed(1)].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  }
  root.file("dxf/index.csv", index.join("\r\n") + "\r\n");

  const lines = [
    `${b.req.project.name}`,
    `Client: ${b.req.project.client}   Reference: ${b.req.project.reference}   Revision: ${b.req.project.revision}   Date: ${b.req.project.date}`,
    `System TSG-F, Form ${b.req.form}, ${b.req.entry} entry, ${b.lineup.sections.length} section(s), ${b.lineup.width} x ${b.lineup.depth} x ${b.lineup.height} mm`,
    "",
    errors.length ? `NOT READY FOR PRODUCTION: ${errors.length} part(s) have no rule for this size and are missing from dxf/.` : "All made parts have a drawing in dxf/.",
    "",
    "Status of each drawing (see dxf/index.csv):",
    "  parametric = generated from this order's sizes and layout",
    "  fixed      = standard part, same for every order",
    "  review     = generated, but the rule is new: check before cutting",
    "",
    "Issues:",
    ...(b.issues.length ? b.issues.map((i) => `  [${i.level.toUpperCase()}] ${i.message}`) : ["  none"]),
    "",
  ];
  root.file("README.txt", lines.join("\r\n"));
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
