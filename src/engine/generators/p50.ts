// P50 profile: every upright and frame member is this one blank cut to length.
// 2.0 galv, 5 bends same direction (12/25/50/50/25/12), □9.5 cage-nut holes on a 25 pitch.
import { FlatBuilder } from "../flat";
import { pad4 } from "../system";

export const P50 = {
  blank: 155.99,
  bends: [10.2, 31.6, 78.0, 124.39, 145.79],
  rows: [20.9, 54.8, 101.19, 135.09],
  pitch: 25,
  hole: 9.5,
};

export const p50Code = (L: number) => `P50-${pad4(L)}`;

export function p50Flat(L: number) {
  const f = new FlatBuilder();
  f.rect(0, 0, L, P50.blank);
  for (const y of P50.bends) f.bend([0, y], [L, y]);
  for (let x = P50.pitch / 2; x < L; x += P50.pitch)
    for (const y of P50.rows) f.rectC(x, y, P50.hole, P50.hole);
  f.text(30, 62.8, 3, `${p50Code(L)}  2.0 GALV  5x90 SAME DIR`);
  return f.build();
}
