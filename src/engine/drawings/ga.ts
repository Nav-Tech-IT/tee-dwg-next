// General arrangement: front elevation (doors removed), side elevation and plan.
import type { Build } from "../build";
import { blankCoverFlat, feederCoverFlat } from "../generators/layout-parts";
import { FORM_TEXT, SYSTEM } from "../system";
import type { Pt } from "../flat";
import { A3, Pen, drawArea, fitScale, frameSheet, notesArea, type Prim, type Sheet, type TitleInfo } from "./sheet";

export function titleOf(b: Build): TitleInfo {
  const p = b.req.project;
  return { project: p.name, client: p.client, reference: p.reference, revision: p.revision, date: p.date, drawnBy: p.drawnBy, system: `${SYSTEM.name} · Form ${b.req.form}` };
}

function centre(prims: Prim[], area: { x: number; y: number; w: number; h: number }) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const pts = (pr: Prim): Pt[] => (pr.k === "line" ? [pr.a, pr.b] : pr.k === "poly" ? pr.pts : pr.k === "circle" ? [pr.c] : [pr.at]);
  for (const pr of prims) for (const [x, y] of pts(pr)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const dx = area.x + (area.w - (x1 - x0)) / 2 - x0, dy = area.y + (area.h - (y1 - y0)) / 2 - y0;
  const mv = ([x, y]: Pt): Pt => [x + dx, y + dy];
  for (const pr of prims) {
    if (pr.k === "line") { pr.a = mv(pr.a); pr.b = mv(pr.b); }
    else if (pr.k === "poly") pr.pts = pr.pts.map(mv);
    else if (pr.k === "circle") pr.c = mv(pr.c);
    else pr.at = mv(pr.at);
  }
}

export function gaSheet(b: Build, sheetNo: string): Sheet {
  const p = new Pen(), { lineup, req } = b, PL = SYSTEM.plinth;
  const area = drawArea(A3);
  const Wt = Math.max(lineup.width, 800), D = lineup.depth, Ht = lineup.height;
  const n = fitScale(Wt + D + 900, Ht + D + 900, area.w, area.h);
  const s = 1 / n;
  frameSheet(p, A3, titleOf(b), "General arrangement", sheetNo, `1:${n}`);
  const contentStart = p.prims.length;

  const ox = area.x + 18, planY = area.y + 14, oy = planY + D * s + 26;
  const X = (x: number) => ox + x * s, Y = (z: number) => oy + z * s;

  /* Front elevation */
  p.text([ox, Y(Ht) + 7], "FRONT ELEVATION · doors removed", 3, { bold: true });
  for (const sec of lineup.sections) {
    const x0 = sec.x0;
    p.rect(X(x0), Y(0), sec.W * s, PL * s, { fill: "fill2", w: 0.3 });
    p.rect(X(x0), Y(PL), sec.W * s, sec.H * s, { w: 0.45 });
    if (sec.type === "feeder") {
      p.rect(X(x0 + SYSTEM.deviceWidth), Y(PL), 50 * s, sec.H * s, { fill: "fill2", w: 0.2 });
      p.rect(X(x0 + 25), Y(PL + 151), 493 * s, 248 * s, { w: 0.2, color: "muted" });
      p.rect(X(x0 + 25), Y(PL + SYSTEM.zone.z1 + 1), 493 * s, (sec.H - SYSTEM.zone.z1 - 1) * s, { w: 0.2, color: "muted" });
      for (const m of sec.modules) {
        p.flat(feederCoverFlat(m, ""), X(x0 + 25), Y(PL + m.z + 1), s);
        // Tag top-left of the cover, breaker under the cutout.
        p.text([X(x0 + 35), Y(PL + m.z + m.h) - 3.4], m.tag, 2.6, { bold: true });
        p.text([X(x0 + 25 + 255), Y(PL + m.z) + 1.6], `${m.kit.breaker.code.replace(/-.*/, "")} ${m.kit.poles} ${m.rating}A`, 1.7, { anchor: "middle", color: "muted" });
      }
      if (sec.spare > 0) {
        const z = SYSTEM.zone.z1 - sec.spare;
        p.flat(blankCoverFlat(z, sec.spare, ""), X(x0 + 25), Y(PL + z + 1), s, { color: "muted" });
        p.text([X(x0 + 40), Y(PL + z + sec.spare / 2) - 1], "SPARE", 2, { color: "muted" });
      }
      p.text([X(x0 + 650), Y(PL + sec.H / 2)], "CABLE ALLEY", 2, { anchor: "middle", rotate: 90, color: "muted" });
      for (const [a, w] of [[4, 512], [520, 276]]) p.rect(X(x0 + a), Y(PL + 20), w * s, (sec.H - 40) * s, { w: 0.15, dash: [1.5, 1], color: "muted" });
    } else {
      p.rect(X(x0 + 180), Y(PL + 850), 440 * s, 395 * s, { w: 0.3, fill: "fill" });
      p.text([X(x0 + 400), Y(PL + 1060)], "MTZ2 16 4P", 2.6, { anchor: "middle", bold: true });
      p.text([X(x0 + 400), Y(PL + 980)], "drawout", 2, { anchor: "middle", color: "muted" });
      p.text([X(x0 + 400), Y(PL + 600)], "INCOMER", 2.4, { anchor: "middle", color: "muted" });
    }
    p.text([X(x0 + sec.W / 2), Y(0) - 13], `${sec.id} · ${sec.type === "incomer" ? "Incomer" : "Feeders"}`, 2.4, { anchor: "middle", bold: true });
    p.dimH(X(x0), X(x0 + sec.W), Y(0) - 7, String(sec.W), Y(0));
  }
  p.dimH(X(0), X(lineup.width), Y(Ht) + 3, `${lineup.width} overall`, Y(Ht));
  p.dimV(Y(0), Y(PL), X(0) - 5, String(PL), X(0));
  p.dimV(Y(PL), Y(Ht), X(0) - 5, String(Ht - PL), X(0));
  p.dimV(Y(0), Y(Ht), X(0) - 11, `${Ht} overall`, X(0));

  /* Side elevation (right-hand end) */
  const sx = X(lineup.width) + 28, SX = (y: number) => sx + y * s;
  p.text([sx, Y(Ht) + 7], "SIDE ELEVATION · from right", 3, { bold: true });
  p.rect(SX(0), Y(0), D * s, PL * s, { fill: "fill2", w: 0.3 });
  p.rect(SX(0), Y(PL), D * s, (Ht - PL) * s, { w: 0.45 });
  p.rect(SX(D - 250), Y(PL + SYSTEM.zone.z1), 250 * s, 400 * s, { w: 0.2, dash: [1.5, 1], color: "accent" });
  p.text([SX(D - 125), Y(PL + SYSTEM.zone.z1 + 200)], "BUSBARS", 1.8, { anchor: "middle", color: "accent" });
  p.rect(SX(D - 200), Y(PL + SYSTEM.zone.z0), 200 * s, (SYSTEM.zone.z1 - SYSTEM.zone.z0) * s, { w: 0.2, dash: [1.5, 1], color: "accent" });
  p.text([SX(D - 100), Y(PL + 1000)], "RISERS", 1.8, { anchor: "middle", rotate: 90, color: "accent" });
  p.text([SX(30), Y(PL + 1000)], "FRONT", 1.8, { rotate: 90, anchor: "middle", color: "muted" });
  p.dimH(SX(0), SX(D), Y(0) - 7, String(D), Y(0));

  /* Plan */
  p.text([ox, planY + D * s + 6], "PLAN · floor fixing and cable entry", 3, { bold: true });
  const PY = (y: number) => planY + (D - y) * s; // front of the board at the bottom
  for (const sec of lineup.sections) {
    const x0 = sec.x0;
    p.rect(X(x0), PY(D), sec.W * s, D * s, { w: 0.4 });
    for (const x of [100, sec.W - 100]) for (const y of [18, D - 18]) p.circle([X(x0 + x), PY(y)], Math.max(7 * s, 0.6), { w: 0.25, color: "red" });
    if (sec.type === "feeder") {
      if (req.entry === "bottom") {
        p.rect(X(x0 + 525), PY(550), 225 * s, 500 * s, { fill: "fill2", w: 0.2 });
        p.text([X(x0 + 637), PY(300)], "GLAND", 1.6, { anchor: "middle", rotate: 90, color: "muted" });
      } else {
        p.rect(X(x0 + 624), PY(330), 114 * s, 218 * s, { fill: "fill2", w: 0.2 });
      }
    }
  }
  p.dimV(PY(D), PY(0), X(0) - 5, String(D), X(0));
  const s0 = lineup.sections[0];
  if (s0) p.dimH(X(100), X(s0.W - 100), PY(0) - 6, `${s0.W - 200} fixing`, PY(18));

  // Centre the views in the free area (the frame and title block were drawn first).
  const frameCount = p.prims.length - contentStart;
  if (frameCount > 0) centre(p.prims.slice(contentStart), area);

  /* Notes */
  const na = notesArea(A3), nx = na.x, ny = na.y + na.h - 7;
  const notes = [
    `Form ${req.form}: ${FORM_TEXT[req.form]}`,
    `Cable entry: ${req.entry}.  Section ${D} deep x ${req.height} high + ${PL} plinth.`,
    `${lineup.sections.length} section(s), ${b.lineup.sections.reduce((a, x) => a + x.modules.length, 0)} feeder(s).`,
    "Floor fixing: 4 x Ø14 anchor holes per section (red).",
  ];
  notes.forEach((t, i) => p.text([nx, ny - i * 4], t, 2.1, { color: "muted" }));
  p.text([nx, ny + 4.5], "NOTES", 2.4, { bold: true });

  return { id: "ga", title: "General arrangement", size: A3, prims: p.prims };
}
