// The full drawing set: GA, feeder schedule, parts list, then one cell per flat pattern.
import type { Build, Drawing } from "../build";
import { coverCode } from "../parts/feeders";
import { gaSheet, titleOf } from "./ga";
import { A3, Pen, drawArea, fitScale, frameSheet, type Sheet } from "./sheet";

interface Col { head: string; w: number; get: (i: number) => string; align?: "end" }

function tableSheets(b: Build, id: string, title: string, rows: number, cols: Col[], first: number): Sheet[] {
  const area = drawArea(A3), rowH = 4.6, perSheet = Math.floor((area.h - 12) / rowH);
  const out: Sheet[] = [];
  for (let start = 0, k = 0; start < Math.max(rows, 1); start += perSheet, k++) {
    const p = new Pen(), no = first + out.length;
    frameSheet(p, A3, titleOf(b), title, `${no} / ${TOTAL}`);
    let y = area.y + area.h - 4;
    p.text([area.x, y], title.toUpperCase(), 3, { bold: true });
    y -= 7;
    let x = area.x;
    for (const c of cols) { p.text([c.align ? x + c.w - 2 : x, y], c.head, 2, { bold: true, color: "muted", anchor: c.align ? "end" : "start" }); x += c.w; }
    p.line([area.x, y - 1.6], [area.x + cols.reduce((s, c) => s + c.w, 0), y - 1.6], { w: 0.3 });
    for (let i = start; i < Math.min(rows, start + perSheet); i++) {
      y -= rowH;
      x = area.x;
      for (const c of cols) {
        const v = c.get(i), max = Math.floor(c.w / 1.15);
        p.text([c.align ? x + c.w - 2 : x, y], v.length > max ? v.slice(0, max - 1) + "…" : v, 2.1, { anchor: c.align ? "end" : "start" });
        x += c.w;
      }
      if ((i - start) % 2 === 1) p.line([area.x, y - 1.5], [x, y - 1.5], { w: 0.08, color: "muted" });
    }
    out.push({ id: `${id}-${k + 1}`, title, size: A3, prims: p.prims });
  }
  return out;
}

const TOTAL = "{{TOTAL}}";

const STATUS: Record<string, string> = { parametric: "Generated", fixed: "Standard", review: "CHECK" };

function flatSheets(b: Build, drawings: Drawing[], first: number): Sheet[] {
  const area = drawArea(A3), cw = area.w / 2, ch = area.h / 2, out: Sheet[] = [];
  for (let i = 0; i < drawings.length; i += 4) {
    const p = new Pen();
    frameSheet(p, A3, titleOf(b), "Flat patterns", `${first + out.length} / ${TOTAL}`);
    drawings.slice(i, i + 4).forEach((d, j) => {
      const cx = area.x + (j % 2) * cw, cy = area.y + (j < 2 ? ch : 0);
      p.rect(cx + 1, cy + 1, cw - 2, ch - 2, { w: 0.15, color: "muted" });
      const w = d.size.x1 - d.size.x0, h = d.size.y1 - d.size.y0;
      const n = fitScale(w, h, cw - 30, ch - 34), s = 1 / n;
      const ox = cx + 15 + (cw - 30 - w * s) / 2 - d.size.x0 * s, oy = cy + 12 + (ch - 34 - h * s) / 2 - d.size.y0 * s;
      p.flat(d.flat, ox, oy, s);
      const bx0 = ox + d.size.x0 * s, by0 = oy + d.size.y0 * s;
      p.dimH(bx0, bx0 + w * s, by0 - 5, w.toFixed(1), by0);
      p.dimV(by0, by0 + h * s, bx0 - 5, h.toFixed(1), bx0);
      p.text([cx + 4, cy + ch - 6], d.key, 3, { bold: true });
      p.text([cx + cw - 4, cy + ch - 6], `QTY ${d.qty}  ·  1:${n}`, 2.6, { anchor: "end", bold: true });
      p.text([cx + 4, cy + ch - 10.5], `${d.material} ${d.t ?? ""} mm  ·  ${d.process}`, 2, { color: "muted" });
      p.text([cx + cw - 4, cy + ch - 10.5], STATUS[d.status], 2, { anchor: "end", color: d.status === "review" ? "red" : "muted", bold: d.status === "review" });
      if (d.codes.length > 1 || d.codes[0] !== d.key) p.text([cx + 4, cy + 4], `Codes: ${d.codes.join(", ")}`, 1.9, { color: "muted" });
    });
    out.push({ id: `flats-${out.length + 1}`, title: "Flat patterns", size: A3, prims: p.prims });
  }
  return out;
}

export function drawingSet(b: Build): Sheet[] {
  const sheets: Sheet[] = [gaSheet(b, `1 / ${TOTAL}`)];

  const mods = b.lineup.sections.flatMap((s) => s.modules.map((m) => ({ s, m })));
  sheets.push(...tableSheets(b, "schedule", "Feeder schedule", mods.length, [
    { head: "Section", w: 22, get: (i) => mods[i].s.id },
    { head: "Pos", w: 14, get: (i) => mods[i].m.pos },
    { head: "Tag", w: 26, get: (i) => mods[i].m.tag },
    { head: "Description", w: 92, get: (i) => mods[i].m.description },
    { head: "Breaker", w: 42, get: (i) => mods[i].m.kit.breaker.code },
    { head: "Rating", w: 20, get: (i) => `${mods[i].m.rating} A`, align: "end" },
    { head: "Module z", w: 24, get: (i) => String(mods[i].m.z), align: "end" },
    { head: "Height", w: 20, get: (i) => String(mods[i].m.h), align: "end" },
    { head: "Front cover", w: 50, get: (i) => coverCode(mods[i].m) },
  ], sheets.length + 1));

  const bom = b.bom;
  sheets.push(...tableSheets(b, "bom", "Parts list", bom.length, [
    { head: "Step", w: 12, get: (i) => String(bom[i].step), align: "end" },
    { head: "Code", w: 44, get: (i) => bom[i].code },
    { head: "Name", w: 104, get: (i) => bom[i].name },
    { head: "Qty", w: 16, get: (i) => String(bom[i].qty), align: "end" },
    { head: "", w: 8, get: (i) => (bom[i].unit === "m" ? "m" : "") },
    { head: "Material", w: 64, get: (i) => `${bom[i].material}${bom[i].t ? ` ${bom[i].t}` : ""}` },
    { head: "Process", w: 70, get: (i) => bom[i].process },
    { head: "Status", w: 22, get: (i) => (bom[i].unsupported ? "NO RULE" : STATUS[bom[i].status]) },
  ], sheets.length + 1));

  sheets.push(...flatSheets(b, b.drawings, sheets.length + 1));
  // Sheet numbers are drawn before the count is known; fill it in now.
  for (const sh of sheets) for (const pr of sh.prims) if (pr.k === "text") pr.s = pr.s.replace(TOTAL, String(sheets.length));
  return sheets;
}
