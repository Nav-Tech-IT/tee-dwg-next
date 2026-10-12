// Sheets -> one PDF (A3 landscape pages), drawn with vector primitives.
import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont } from "pdf-lib";
import type { Color, Sheet } from "../drawings/sheet";
import { PAPER } from "./svg";

const MM = 72 / 25.4;
const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const C = (c?: Color) => hex(PAPER[c ?? "ink"]);

// Standard PDF fonts only cover WinAnsi; swap the few other symbols we use.
const WINANSI_EXTRA = "–—…‘’“”•€™";
function clean(s: string) {
  return s.replace(/□/g, "sq ").replace(/′/g, "'").replace(/[^\x00-\xff]/g, (c) => (WINANSI_EXTRA.includes(c) ? c : "?"));
}

export async function sheetsToPdf(sheets: Sheet[], meta: { title: string; author?: string }): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(meta.title);
  if (meta.author) doc.setAuthor(meta.author);
  doc.setCreator("TSG-F builder");
  const fonts: Record<"r" | "b", PDFFont> = {
    r: await doc.embedFont(StandardFonts.Helvetica),
    b: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  for (const sh of sheets) {
    const page = doc.addPage([sh.size[0] * MM, sh.size[1] * MM]);
    const P = (x: number, y: number) => ({ x: x * MM, y: y * MM });
    for (const p of sh.prims) {
      if (p.k === "line") {
        page.drawLine({ start: P(...p.a), end: P(...p.b), thickness: (p.w ?? 0.25) * MM, color: C(p.color), dashArray: p.dash?.map((d) => d * MM) });
      } else if (p.k === "poly") {
        if (p.fill && p.closed) {
          const d = p.pts.map(([x, y], i) => `${i ? "L" : "M"}${x * MM} ${-y * MM}`).join(" ") + " Z";
          page.drawSvgPath(d, { x: 0, y: 0, color: C(p.fill), borderWidth: 0 });
        }
        const pts = p.closed ? [...p.pts, p.pts[0]] : p.pts;
        for (let i = 1; i < pts.length; i++)
          page.drawLine({ start: P(...pts[i - 1]), end: P(...pts[i]), thickness: (p.w ?? 0.25) * MM, color: C(p.color), dashArray: p.dash?.map((d) => d * MM) });
      } else if (p.k === "circle") {
        page.drawCircle({ ...P(...p.c), size: p.r * MM, borderWidth: (p.w ?? 0.2) * MM, borderColor: C(p.color), color: p.fill ? C(p.fill) : undefined });
      } else {
        const font = p.bold ? fonts.b : fonts.r, s = clean(p.s), size = p.size * MM * 1.05;
        const w = font.widthOfTextAtSize(s, size);
        const shift = p.anchor === "middle" ? w / 2 : p.anchor === "end" ? w : 0;
        const rad = ((p.rotate ?? 0) * Math.PI) / 180;
        page.drawText(s, {
          x: p.at[0] * MM - shift * Math.cos(rad), y: p.at[1] * MM - shift * Math.sin(rad),
          size, font, color: C(p.color), rotate: p.rotate ? degrees(p.rotate) : undefined,
        });
      }
    }
  }
  return doc.save();
}
