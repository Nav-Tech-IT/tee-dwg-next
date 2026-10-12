// Plinth C-channel 40/100/40, 2.0 galv, blank 172.8. Front/rear (PLF) run the
// full width; sides (PLS) fit between them and get deep end notches.
import { FlatBuilder } from "../flat";
import { pad4 } from "../system";

const C = { blank: 172.8, flange: 40.4, bends: [38.2, 134.6], web: 86.4, top: 157.8 };

interface ChannelSpec {
  L: number;
  notch: number;
  web: [number, number]; // web holes from each end
  top0: number; // first top-flange hole, then every 100
  anchors: boolean;
  label: string;
}

function channel(s: ChannelSpec) {
  const { L, notch: n } = s, f = new FlatBuilder();
  const a = C.flange, b = C.blank - C.flange;
  f.poly([[n, 0], [L - n, 0], [L - n, a], [L, a], [L, b], [L - n, b], [L - n, C.blank], [n, C.blank], [n, b], [0, b], [0, a], [n, a]]);
  for (const y of C.bends) f.bend([n, y], [L - n, y]);
  for (const x of s.web) { f.hole(x, C.web, 6.6); f.hole(L - x, C.web, 6.6); }
  for (let x = s.top0; x < L - s.top0; x += 100) f.hole(x, C.top, 6.6);
  if (s.anchors) { f.hole(100, 18, 14); f.hole(L - 100, 18, 14); }
  f.text(L / 2 - 40, 96.4, 3, `${s.label}  2.0 GALV  2x90`);
  return f.build();
}

export const plfCode = (W: number) => `PLF-${pad4(W)}`;
export const plsCode = (D: number) => `PLS-${pad4(D - 4)}`;

export const plfFlat = (W: number) =>
  channel({ L: W, notch: 3, web: [39.5, 64.5], top0: 62.5, anchors: true, label: plfCode(W) });

export const plsFlat = (D: number) =>
  channel({ L: D - 4, notch: 42, web: [37.5, 62.5], top0: 60.5, anchors: false, label: plsCode(D) });
