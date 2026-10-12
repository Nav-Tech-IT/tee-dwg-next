// 2D flat-pattern model. One Flat = one laser/CNC part; it renders to DXF, SVG and PDF.
// Units: mm. Layers follow the factory convention of the original DXFs.

export type Pt = [number, number];
export type Layer = "CUT" | "BEND" | "MARK";

export type Entity =
  | { t: "poly"; layer: Layer; pts: Pt[]; closed: boolean }
  | { t: "line"; layer: Layer; a: Pt; b: Pt }
  | { t: "circle"; layer: Layer; c: Pt; r: number }
  | { t: "text"; layer: Layer; at: Pt; h: number; s: string };

export interface Flat {
  entities: Entity[];
}

export interface BBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

export class FlatBuilder {
  entities: Entity[] = [];

  poly(pts: Pt[], closed = true, layer: Layer = "CUT") {
    this.entities.push({ t: "poly", layer, closed, pts: pts.map(([x, y]) => [r2(x), r2(y)]) });
    return this;
  }
  rect(x0: number, y0: number, x1: number, y1: number, layer: Layer = "CUT") {
    return this.poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], true, layer);
  }
  /** Rectangle given by its centre and size (square holes, slots). */
  rectC(cx: number, cy: number, w: number, h: number, layer: Layer = "CUT") {
    return this.rect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, layer);
  }
  line(a: Pt, b: Pt, layer: Layer = "CUT") {
    this.entities.push({ t: "line", layer, a: [r2(a[0]), r2(a[1])], b: [r2(b[0]), r2(b[1])] });
    return this;
  }
  bend(a: Pt, b: Pt) {
    return this.line(a, b, "BEND");
  }
  hole(x: number, y: number, d: number) {
    this.entities.push({ t: "circle", layer: "CUT", c: [r2(x), r2(y)], r: d / 2 });
    return this;
  }
  text(x: number, y: number, h: number, s: string) {
    this.entities.push({ t: "text", layer: "MARK", at: [r2(x), r2(y)], h, s });
    return this;
  }
  add(...e: Entity[]) {
    this.entities.push(...e);
    return this;
  }
  build(): Flat {
    return { entities: this.entities };
  }
}

export function bbox(flat: Flat, opts: { cutOnly?: boolean } = {}): BBox {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const p = (x: number, y: number) => {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  };
  for (const e of flat.entities) {
    if (opts.cutOnly && e.layer !== "CUT") continue;
    if (e.t === "poly") e.pts.forEach(([x, y]) => p(x, y));
    else if (e.t === "line") { p(...e.a); p(...e.b); }
    else if (e.t === "circle") { p(e.c[0] - e.r, e.c[1] - e.r); p(e.c[0] + e.r, e.c[1] + e.r); }
  }
  if (x0 === Infinity) return { x0: 0, y0: 0, x1: 0, y1: 0 };
  return { x0, y0, x1, y1 };
}

/** The largest closed CUT polygon is taken as the blank outline. */
export function outline(flat: Flat): Pt[] | null {
  let best: Pt[] | null = null, area = 0;
  for (const e of flat.entities) {
    if (e.t !== "poly" || e.layer !== "CUT" || !e.closed) continue;
    const a = Math.abs(polyArea(e.pts));
    if (a > area) { area = a; best = e.pts; }
  }
  return best;
}

export function polyArea(pts: Pt[]) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

export function pointInPoly([x, y]: Pt, pts: Pt[]) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function transform(flat: Flat, fn: (p: Pt) => Pt): Flat {
  return {
    entities: flat.entities.map((e): Entity => {
      if (e.t === "poly") return { ...e, pts: e.pts.map(fn) };
      if (e.t === "line") return { ...e, a: fn(e.a), b: fn(e.b) };
      if (e.t === "circle") return { ...e, c: fn(e.c) };
      return { ...e, at: fn(e.at) };
    }),
  };
}

/** Steel area of the blank (outline minus holes), used for weights. */
export function netArea(flat: Flat) {
  const out = outline(flat);
  if (!out) return 0;
  let a = Math.abs(polyArea(out));
  for (const e of flat.entities) {
    if (e.layer !== "CUT") continue;
    if (e.t === "circle") a -= Math.PI * e.r * e.r;
    else if (e.t === "poly" && e.closed && e.pts !== out) a -= Math.abs(polyArea(e.pts));
  }
  return Math.max(a, 0);
}
