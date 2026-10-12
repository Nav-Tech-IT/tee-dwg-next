// Sheet / flat -> SVG string. Colours are CSS variables with print fallbacks,
// so the same SVG follows the app theme on screen.
import { bbox, type Flat } from "../flat";
import { Pen, type Color, type Sheet } from "../drawings/sheet";

export const PAPER: Record<Color, string> = {
  ink: "#17222d", muted: "#5a6875", accent: "#c77a12", bend: "#d0492f", fill: "#f1f4f6", fill2: "#dfe5ea", red: "#c62828",
};
const css = (c: Color) => `var(--dw-${c}, ${PAPER[c]})`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const f = (v: number) => (Math.round(v * 100) / 100).toString();

export function sheetToSvg(sheet: Pick<Sheet, "size" | "prims">, opts: { paper?: boolean } = {}): string {
  const [W, H] = sheet.size, Y = (y: number) => H - y, out: string[] = [];
  for (const p of sheet.prims) {
    const stroke = (c?: Color) => css(c ?? "ink");
    if (p.k === "line") {
      out.push(`<line x1="${f(p.a[0])}" y1="${f(Y(p.a[1]))}" x2="${f(p.b[0])}" y2="${f(Y(p.b[1]))}" stroke="${stroke(p.color)}" stroke-width="${p.w ?? 0.25}"${p.dash ? ` stroke-dasharray="${p.dash.join(" ")}"` : ""}/>`);
    } else if (p.k === "poly") {
      const pts = p.pts.map(([x, y]) => `${f(x)},${f(Y(y))}`).join(" ");
      out.push(`<${p.closed ? "polygon" : "polyline"} points="${pts}" fill="${p.fill ? css(p.fill) : "none"}" stroke="${stroke(p.color)}" stroke-width="${p.w ?? 0.25}"${p.dash ? ` stroke-dasharray="${p.dash.join(" ")}"` : ""} stroke-linejoin="round"/>`);
    } else if (p.k === "circle") {
      out.push(`<circle cx="${f(p.c[0])}" cy="${f(Y(p.c[1]))}" r="${f(p.r)}" fill="${p.fill ? css(p.fill) : "none"}" stroke="${stroke(p.color)}" stroke-width="${p.w ?? 0.2}"/>`);
    } else {
      const [x, y] = [f(p.at[0]), f(Y(p.at[1]))];
      out.push(`<text x="${x}" y="${y}" font-size="${p.size}" fill="${stroke(p.color)}"${p.anchor ? ` text-anchor="${p.anchor}"` : ""}${p.bold ? ` font-weight="600"` : ""}${p.rotate ? ` transform="rotate(${-p.rotate} ${x} ${y})"` : ""}>${esc(p.s)}</text>`);
    }
  }
  const bg = opts.paper ? `<rect width="${W}" height="${H}" fill="${css("fill")}" opacity="0"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="IBM Plex Sans, Helvetica, Arial, sans-serif">${bg}${out.join("")}</svg>`;
}

/** A single flat pattern at 1:1 model units, padded, for thumbnails and the part viewer. */
export function flatToSvg(flat: Flat, opts: { text?: boolean } = {}): string {
  const b = bbox(flat), pad = Math.max(b.x1 - b.x0, b.y1 - b.y0) * 0.04 + 4;
  const w = b.x1 - b.x0 + 2 * pad, h = b.y1 - b.y0 + 2 * pad, s = 1;
  const p = new Pen().flat(flat, pad - b.x0, pad - b.y0, s, { text: opts.text });
  // Scale strokes up so they stay visible on big parts.
  const k = Math.max(w, h) / 300;
  for (const pr of p.prims) if (pr.k !== "text") pr.w = (pr.w ?? 0.25) * k * 2.2;
  for (const pr of p.prims) if (pr.k === "line" && pr.dash) pr.dash = pr.dash.map((v) => v * k * 3);
  for (const pr of p.prims) if (pr.k === "poly" && pr.dash) pr.dash = pr.dash.map((v) => v * k * 3);
  return sheetToSvg({ size: [w, h], prims: p.prims });
}
