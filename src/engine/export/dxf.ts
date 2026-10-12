// Flat -> DXF (AutoCAD R12 ASCII, mm). R12 is the most widely accepted format for
// laser/punch CAM. Layers and colours match the original files: CUT red, BEND yellow, MARK green.
import type { Flat } from "../flat";

const LAYERS: [string, number][] = [["CUT", 1], ["BEND", 2], ["MARK", 3]];
const n = (v: number) => (Math.round(v * 10000) / 10000).toString();

export function toDxf(flat: Flat): string {
  const o: (string | number)[] = [];
  const g = (code: number, value: string | number) => o.push(code, value);

  g(0, "SECTION"); g(2, "HEADER");
  g(9, "$ACADVER"); g(1, "AC1009");
  g(9, "$INSUNITS"); g(70, 4);
  g(0, "ENDSEC");

  g(0, "SECTION"); g(2, "TABLES");
  g(0, "TABLE"); g(2, "LTYPE"); g(70, 1);
  g(0, "LTYPE"); g(2, "CONTINUOUS"); g(70, 0); g(3, "Solid line"); g(72, 65); g(73, 0); g(40, "0.0");
  g(0, "ENDTAB");
  g(0, "TABLE"); g(2, "LAYER"); g(70, LAYERS.length + 1);
  for (const [name, color] of [["0", 7] as [string, number], ...LAYERS]) {
    g(0, "LAYER"); g(2, name); g(70, 0); g(62, color); g(6, "CONTINUOUS");
  }
  g(0, "ENDTAB");
  g(0, "ENDSEC");

  g(0, "SECTION"); g(2, "ENTITIES");
  for (const e of flat.entities) {
    if (e.t === "line") {
      g(0, "LINE"); g(8, e.layer);
      g(10, n(e.a[0])); g(20, n(e.a[1])); g(30, "0.0");
      g(11, n(e.b[0])); g(21, n(e.b[1])); g(31, "0.0");
    } else if (e.t === "circle") {
      g(0, "CIRCLE"); g(8, e.layer);
      g(10, n(e.c[0])); g(20, n(e.c[1])); g(30, "0.0"); g(40, n(e.r));
    } else if (e.t === "poly") {
      g(0, "POLYLINE"); g(8, e.layer); g(66, 1); g(10, "0.0"); g(20, "0.0"); g(30, "0.0"); g(70, e.closed ? 1 : 0);
      for (const [x, y] of e.pts) { g(0, "VERTEX"); g(8, e.layer); g(10, n(x)); g(20, n(y)); g(30, "0.0"); }
      g(0, "SEQEND"); g(8, e.layer);
    } else {
      g(0, "TEXT"); g(8, e.layer);
      g(10, n(e.at[0])); g(20, n(e.at[1])); g(30, "0.0"); g(40, n(e.h)); g(1, e.s.replace(/Ø/g, "%%c"));
    }
  }
  g(0, "ENDSEC");
  g(0, "EOF");

  const lines: string[] = [];
  for (let i = 0; i < o.length; i += 2) lines.push(String(o[i]).padStart(3, " "), String(o[i + 1]));
  return lines.join("\r\n") + "\r\n";
}
