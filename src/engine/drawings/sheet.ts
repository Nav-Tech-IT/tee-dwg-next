// Paper-space drawing model. A Sheet is a list of primitives in mm on the paper,
// origin bottom-left, y up (like CAD). It renders to SVG (web review) and PDF.
import type { Flat, Pt } from "../flat";

export type Color = "ink" | "muted" | "accent" | "bend" | "fill" | "fill2" | "red";

export type Prim =
  | { k: "line"; a: Pt; b: Pt; w?: number; dash?: number[]; color?: Color }
  | { k: "poly"; pts: Pt[]; closed?: boolean; w?: number; dash?: number[]; color?: Color; fill?: Color }
  | { k: "circle"; c: Pt; r: number; w?: number; color?: Color; fill?: Color }
  | { k: "text"; at: Pt; s: string; size: number; anchor?: "start" | "middle" | "end"; bold?: boolean; rotate?: number; color?: Color };

export interface Sheet {
  id: string;
  title: string;
  size: [number, number];
  prims: Prim[];
}

export const A3: [number, number] = [420, 297];
export const MARGIN = 10;

export class Pen {
  prims: Prim[] = [];
  line(a: Pt, b: Pt, o: Partial<Extract<Prim, { k: "line" }>> = {}) { this.prims.push({ k: "line", a, b, ...o }); return this; }
  rect(x: number, y: number, w: number, h: number, o: Partial<Extract<Prim, { k: "poly" }>> = {}) {
    this.prims.push({ k: "poly", pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], closed: true, ...o });
    return this;
  }
  poly(pts: Pt[], o: Partial<Extract<Prim, { k: "poly" }>> = {}) { this.prims.push({ k: "poly", pts, ...o }); return this; }
  circle(c: Pt, r: number, o: Partial<Extract<Prim, { k: "circle" }>> = {}) { this.prims.push({ k: "circle", c, r, ...o }); return this; }
  text(at: Pt, s: string, size = 2.5, o: Partial<Extract<Prim, { k: "text" }>> = {}) { this.prims.push({ k: "text", at, s, size, ...o }); return this; }

  /** Horizontal dimension between x1 and x2, drawn at height y. */
  dimH(x1: number, x2: number, y: number, label: string, from?: number) {
    const ext = from ?? y;
    this.line([x1, ext], [x1, y + 1.5], { w: 0.13, color: "muted" });
    this.line([x2, ext], [x2, y + 1.5], { w: 0.13, color: "muted" });
    this.line([x1, y], [x2, y], { w: 0.18, color: "muted" });
    this.tick([x1, y]); this.tick([x2, y]);
    this.text([(x1 + x2) / 2, y + 1.2], label, 2.2, { anchor: "middle", color: "muted" });
    return this;
  }
  dimV(y1: number, y2: number, x: number, label: string, from?: number) {
    const ext = from ?? x;
    this.line([ext, y1], [x - 1.5, y1], { w: 0.13, color: "muted" });
    this.line([ext, y2], [x - 1.5, y2], { w: 0.13, color: "muted" });
    this.line([x, y1], [x, y2], { w: 0.18, color: "muted" });
    this.tick([x, y1]); this.tick([x, y2]);
    this.text([x - 1.2, (y1 + y2) / 2], label, 2.2, { anchor: "middle", rotate: 90, color: "muted" });
    return this;
  }
  private tick([x, y]: Pt) {
    this.line([x - 0.9, y - 0.9], [x + 0.9, y + 0.9], { w: 0.25, color: "muted" });
  }

  /** Draw a flat pattern at the given origin and scale (paper mm per model mm). */
  flat(f: Flat, ox: number, oy: number, s: number, opts: { text?: boolean; color?: Color } = {}) {
    const P = ([x, y]: Pt): Pt => [ox + x * s, oy + y * s];
    for (const e of f.entities) {
      const bend = e.layer === "BEND", color: Color = bend ? "bend" : opts.color ?? "ink";
      const w = bend ? 0.15 : 0.25, dash = bend ? [2, 1] : undefined;
      if (e.t === "line") this.line(P(e.a), P(e.b), { w, dash, color });
      else if (e.t === "poly") this.poly(e.pts.map(P), { closed: e.closed, w, dash, color });
      else if (e.t === "circle") this.circle(P(e.c), e.r * s, { w: 0.18, color });
      else if (opts.text) this.text(P(e.at), e.s, Math.max(e.h * s, 1.4), { color: "muted" });
    }
    return this;
  }
}

/** Largest standard scale (1:n) that fits size into the box. */
export function fitScale(w: number, h: number, boxW: number, boxH: number) {
  const steps = [1, 2, 2.5, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200];
  for (const n of steps) if (w / n <= boxW && h / n <= boxH) return n;
  return steps[steps.length - 1];
}

export interface TitleInfo {
  project: string;
  client: string;
  reference: string;
  revision: string;
  date: string;
  drawnBy: string;
  system: string;
}

/** Free drawing area above the title block. */
export function drawArea(size: [number, number]) {
  const [W, H] = size, m = MARGIN, bh = 32;
  return { x: m + 4, y: m + bh + 4, w: W - 2 * m - 8, h: H - 2 * m - bh - 8 };
}

/** Strip left of the title block, for notes. */
export function notesArea(size: [number, number]) {
  return { x: MARGIN + 4, y: MARGIN + 3, w: size[0] - 2 * MARGIN - 180 - 8, h: 26 };
}

/** Border, frame and title block common to every sheet. */
export function frameSheet(p: Pen, size: [number, number], t: TitleInfo, sheetTitle: string, sheetNo: string, scale?: string) {
  const [W, H] = size, m = MARGIN;
  p.rect(m, m, W - 2 * m, H - 2 * m, { w: 0.5 });
  const bw = 180, bh = 32, x = W - m - bw, y = m;
  p.rect(x, y, bw, bh, { w: 0.35, fill: "fill" });
  p.line([x, y + 22], [x + bw, y + 22], { w: 0.2 });
  p.line([x, y + 11], [x + bw, y + 11], { w: 0.2 });
  p.line([x + 110, y], [x + 110, y + 22], { w: 0.2 });
  p.line([x + 145, y], [x + 145, y + 22], { w: 0.2 });
  p.text([x + 3, y + 25.5], t.project || "Untitled project", 4, { bold: true });
  p.text([x + bw - 3, y + 25.5], t.system, 3, { anchor: "end", color: "muted" });
  p.text([x + 3, y + 15], sheetTitle, 3.2, { bold: true });
  p.text([x + 3, y + 4], [t.client, t.reference].filter(Boolean).join("  ·  ") || " ", 2.4, { color: "muted" });
  p.text([x + 112, y + 17.5], "SHEET", 1.8, { color: "muted" });
  p.text([x + 112, y + 13], sheetNo, 2.8, { bold: true });
  p.text([x + 112, y + 6.5], "SCALE", 1.8, { color: "muted" });
  p.text([x + 112, y + 2.5], scale ?? "–", 2.4);
  p.text([x + 147, y + 17.5], "REV · DATE", 1.8, { color: "muted" });
  p.text([x + 147, y + 13], `${t.revision} · ${t.date}`, 2.4, { bold: true });
  p.text([x + 147, y + 6.5], "DRAWN", 1.8, { color: "muted" });
  p.text([x + 147, y + 2.5], t.drawnBy || "–", 2.4);
  return drawArea(size);
}
