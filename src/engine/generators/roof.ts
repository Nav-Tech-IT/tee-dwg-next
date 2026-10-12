// Roof tray, 1.5 CRCA, hemmed 8 in + 4 x 90. Holes are set out from the frame
// corners (25 in from each edge); the top-entry variant adds the cable opening.
import { FlatBuilder, type Flat } from "../flat";
import { referenceFlat } from "../reference";
import { pad4 } from "../system";

const R = { grow: 74.31, notch: 32.65, o: 37.15, hem: 7.36, bend: 31.0 };

export const roofCode = (W: number, D: number, top = false) => `ROOF-${pad4(W)}-${pad4(D)}${top ? "-T" : ""}`;

/** Frame-relative positions along one edge: every 100 from 162.5, mirrored about the middle. */
function edgeRow(len: number) {
  const out: number[] = [];
  for (let v = 162.5; v < len / 2; v += 100) out.push(v, len - v);
  return out.sort((a, b) => a - b);
}

export function roofFlat(W: number, D: number, top = false): Flat {
  const BW = W + R.grow, BD = D + R.grow, n = R.notch, f = new FlatBuilder();
  f.poly([[n, 0], [BW - n, 0], [BW - n, n], [BW, n], [BW, BD - n], [BW - n, BD - n], [BW - n, BD], [n, BD], [n, BD - n], [0, BD - n], [0, n], [n, n]]);
  for (const x of [R.hem, R.bend, BW - R.bend, BW - R.hem]) f.bend([x, n], [x, BD - n]);
  for (const y of [R.hem, R.bend, BD - R.bend, BD - R.hem]) f.bend([n, y], [BW - n, y]);

  const at = (x: number, y: number, d: number) => f.hole(R.o + x, R.o + y, d);
  const [xa, xb, ya, yb] = [25, W - 25, 25, D - 25];
  for (const [x, y] of [[xa, ya], [xb, ya], [xa, yb], [xb, yb]]) at(x, y, 14);
  for (const y of [ya, yb]) for (const x of [xa + 37.5, xa + 62.5, xb - 62.5, xb - 37.5]) at(x, y, 9);
  for (const x of [xa, xb]) for (const y of [ya + 37.5, ya + 62.5, yb - 62.5, yb - 37.5]) at(x, y, 9);
  for (const y of [ya, yb]) for (const x of edgeRow(W)) at(x, y, 6.6);
  for (const x of [xa, xb]) for (const y of edgeRow(D)) at(x, y, 6.6);

  if (top) {
    // Cable opening 114 x 218 over the cable alley, kept at the same distance from the right-hand side.
    // The opening and its 8 gland-plate holes are the difference between the two reference roofs.
    const withTop = referenceFlat("ROOF-0800-0600-T top entry"), plain = referenceFlat("ROOF-0800-0600");
    const dx = W - 800;
    const inPlain = (x: number, y: number) =>
      plain.entities.some((b) => b.t === "circle" && Math.abs(b.c[0] - x) < 0.05 && Math.abs(b.c[1] - y) < 0.05);
    for (const e of withTop.entities) {
      if (e.t === "poly" && e.layer === "CUT" && e.pts.length === 4) f.poly(e.pts.map(([x, y]) => [x + dx, y]));
      if (e.t === "circle" && !inPlain(e.c[0], e.c[1])) f.hole(e.c[0] + dx, e.c[1], e.r * 2);
    }
  }

  const tx = BW / 2, ty = BD / 2;
  for (const x of [R.hem, R.bend, BW - R.bend, BW - R.hem]) f.text(x + 2, ty + 20, 5, x === R.hem || x === BW - R.hem ? "HEM" : "90");
  for (const y of [R.hem, R.bend, BD - R.bend, BD - R.hem]) f.text(tx + 60, y + 2, 5, y === R.hem || y === BD - R.hem ? "HEM" : "90");
  f.text(tx - 140, ty, 6, `${roofCode(W, D)} REV D  1.5 CRCA  HEM 8 IN + 4x90`);
  return f.build();
}
