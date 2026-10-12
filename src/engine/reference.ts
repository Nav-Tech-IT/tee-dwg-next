// Reference flats exported from the original Python (ezdxf) generator for the
// 800 x 600 x 2000 TSG-F section. Used for kit parts that do not change with the
// order, and as the ground truth the parametric generators are tested against.
import raw from "./data/reference-flats.json";
import type { Entity, Flat, Layer, Pt } from "./flat";

type RawEntity =
  | { t: "p"; l: string; c?: boolean; p: Pt[] }
  | { t: "l"; l: string; p: [Pt, Pt] }
  | { t: "c"; l: string; x: number; y: number; r: number }
  | { t: "x"; l: string; x: number; y: number; h: number; s: string };

const data = raw as unknown as Record<string, { bb: number[]; e: RawEntity[] }>;

export const referenceNames = Object.keys(data);

export function referenceFlat(name: string): Flat {
  const ref = data[name];
  if (!ref) throw new Error(`No reference flat named "${name}"`);
  return {
    entities: ref.e.map((e): Entity => {
      const layer = e.l as Layer;
      switch (e.t) {
        case "p": return { t: "poly", layer, closed: !!e.c, pts: e.p.map(([x, y]) => [x, y] as Pt) };
        case "l": return { t: "line", layer, a: e.p[0], b: e.p[1] };
        case "c": return { t: "circle", layer, c: [e.x, e.y], r: e.r };
        case "x": return { t: "text", layer, at: [e.x, e.y], h: e.h, s: e.s };
      }
    }),
  };
}
