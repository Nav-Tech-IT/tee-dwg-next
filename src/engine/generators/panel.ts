// Side and rear panels, 1.5 CRCA, 35 mm hem folded to the back on all four edges.
// Holes straddle each hem line (±25) so they line up once the hem is folded.
import { FlatBuilder } from "../flat";
import { pad4 } from "../system";

const HEM = 34.35;

/** Holes along a vertical edge: every 250 from each end towards the middle, plus one near mid-height. */
function verticalRow(H: number) {
  const out: number[] = [];
  for (let v = 62.5; v < H / 2; v += 250) out.push(v, H - v);
  out.push(Math.floor(H / 2 / 25) * 25 - 12.5);
  return out.sort((a, b) => a - b);
}

function bottomRow(len: number, start: number) {
  const out: number[] = [];
  for (let v = start; v < len / 2; v += 100) out.push(v, len - v);
  return out.sort((a, b) => a - b);
}

function panel(len: number, H: number, start: number, label: string, labelDx: number) {
  const BW = len + 2 * HEM, BH = H + 2 * HEM, n = HEM, f = new FlatBuilder();
  f.poly([[n, 0], [BW - n, 0], [BW - n, n], [BW, n], [BW, BH - n], [BW - n, BH - n], [BW - n, BH], [n, BH], [n, BH - n], [0, BH - n], [0, n], [n, n]]);
  f.bend([n, n], [n, BH - n]);
  f.bend([BW - n, n], [BW - n, BH - n]);
  f.bend([n, n], [BW - n, n]);
  f.bend([n, BH - n], [BW - n, BH - n]);
  const at = (x: number, y: number) => f.hole(n + x, n + y, 6.6);
  for (const x of bottomRow(len, start)) { at(x, -25); at(x, 25); }
  for (const y of verticalRow(H)) for (const x of [-25, 25, len - 25, len + 25]) at(x, y);
  f.text(n + labelDx, BH / 2, 8, `${label}  1.5 CRCA  HEM 35 x4 (fold to back)`);
  return f.build();
}

export const spCode = (D: number, H: number) => `SP-${pad4(D)}-${pad4(H)}`;
export const rpCode = (W: number, H: number) => `RP-${pad4(W)}-${pad4(H)}`;

export const sidePanelFlat = (D: number, H: number) => panel(D, H, 112.5, spCode(D, H), 120);
export const rearPanelFlat = (W: number, H: number) => panel(W, H, 162.5, rpCode(W, H), 220);
