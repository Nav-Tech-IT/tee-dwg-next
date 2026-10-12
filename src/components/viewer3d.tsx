"use client";

import { Edges, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { GROUPS3D, type Group3D, type Solid } from "@/engine/model3d";

/** Model axes (x along, y front→back, z up) to three.js (x, y up, z towards the viewer). */
function geometryOf(s: Solid): { geo: THREE.BufferGeometry; pos: THREE.Vector3; rot?: THREE.Euler } {
  const [x, y, z] = s.pos, sh = s.shape;
  if (sh.k === "box") {
    const [sx, sy, sz] = sh.size;
    return { geo: new THREE.BoxGeometry(sx, sz, sy), pos: new THREE.Vector3(x + sx / 2, z + sz / 2, -(y + sy / 2)) };
  }
  if (sh.k === "cyl") return { geo: new THREE.CylinderGeometry(sh.r, sh.r, sh.h, 20), pos: new THREE.Vector3(x, z + sh.h / 2, -y) };
  if (sh.k === "plate") {
    const shape = new THREE.Shape(sh.outline.map(([a, b]) => new THREE.Vector2(a, b)));
    for (const h of sh.holes) shape.holes.push(new THREE.Path(h.map(([a, b]) => new THREE.Vector2(a, b))));
    return { geo: new THREE.ExtrudeGeometry(shape, { depth: sh.t, bevelEnabled: false }), pos: new THREE.Vector3(x, z, -(y + sh.t)) };
  }
  // profileX: profile in (y, z), extruded along x; rotate the extrusion axis onto x.
  const shape = new THREE.Shape(sh.profile.map(([a, b]) => new THREE.Vector2(a, b)));
  return { geo: new THREE.ExtrudeGeometry(shape, { depth: sh.length, bevelEnabled: false }), pos: new THREE.Vector3(x, z, 0), rot: new THREE.Euler(0, Math.PI / 2, 0) };
}

function Part({ s, exploded, selected, onSelect, offset }: { s: Solid; exploded: boolean; selected: boolean; onSelect: (s: Solid) => void; offset: THREE.Vector3 }) {
  const ref = useRef<THREE.Group>(null);
  const { geo, pos, rot } = useMemo(() => geometryOf(s), [s]);
  useEffect(() => () => geo.dispose(), [geo]);
  const home = useMemo(() => pos.clone().add(offset), [pos, offset]);
  const away = useMemo(() => home.clone().add(new THREE.Vector3(s.explode[0], s.explode[2], -s.explode[1])), [home, s.explode]);
  const [hover, setHover] = useState(false);
  useFrame(() => {
    if (ref.current) ref.current.position.lerp(exploded ? away : home, 0.15);
  });
  const transparent = (s.opacity ?? 1) < 1;
  return (
    <group ref={ref} position={home} rotation={rot}>
      <mesh geometry={geo}
        onClick={(e) => { e.stopPropagation(); onSelect(s); }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
        onPointerOut={() => setHover(false)}>
        <meshStandardMaterial color={s.color} metalness={0.15} roughness={0.6} transparent={transparent} opacity={s.opacity ?? 1}
          emissive={selected ? "#7a4a00" : hover ? "#2a2a2a" : "#000000"} side={THREE.DoubleSide} depthWrite={!transparent} />
        <Edges threshold={25} color={selected ? "#c77a12" : "#26313b"} />
      </mesh>
    </group>
  );
}

function Fit({ size, trigger }: { size: THREE.Vector3; trigger: number }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: OrbitControlsImpl | null };
  useEffect(() => {
    // three.js cameras and controls are imperative objects: mutating them is the intended API.
    /* eslint-disable react-hooks/immutability */
    const r = Math.max(size.x, size.y, size.z);
    camera.position.set(size.x * 0.45 + r * 0.55, size.y * 0.75, r * 1.35);
    camera.near = 5; camera.far = r * 20; camera.updateProjectionMatrix();
    if (controls) { controls.target.set(0, size.y * 0.45, 0); controls.update(); }
    /* eslint-enable react-hooks/immutability */
  }, [camera, controls, size, trigger]);
  return null;
}

export default function Viewer3D({ solids, width, depth, height }: { solids: Solid[]; width: number; depth: number; height: number }) {
  const [hidden, setHidden] = useState<Set<Group3D>>(() => new Set<Group3D>(["Doors"]));
  const [exploded, setExploded] = useState(false);
  const [section, setSection] = useState<string>("all");
  const [selected, setSelected] = useState<Solid | null>(null);
  const [fit, setFit] = useState(0);
  const sections = useMemo(() => [...new Set(solids.map((s) => s.section))], [solids]);
  const offset = useMemo(() => new THREE.Vector3(-width / 2, 0, depth / 2), [width, depth]);
  const size = useMemo(() => new THREE.Vector3(width, height + 200, depth), [width, height, depth]);
  const shown = solids.filter((s) => !hidden.has(s.group) && (section === "all" || s.section === section));
  const toggle = (g: Group3D) => setHidden((h) => { const n = new Set(h); if (n.has(g)) n.delete(g); else n.add(g); return n; });
  const present = GROUPS3D.filter((g) => solids.some((s) => s.group === g));

  return (
    <div className="grid gap-3">
      <div className="relative rounded-md border border-rule bg-stage overflow-hidden h-[min(72vh,760px)] min-h-[420px]">
        <Canvas camera={{ fov: 35, position: [3000, 2500, 4000] }} dpr={[1, 2]} onPointerMissed={() => setSelected(null)}>
          <hemisphereLight args={["#ffffff", "#8a939c", 0.95]} />
          <directionalLight position={[900, 2600, 1400]} intensity={0.9} />
          <directionalLight position={[-1200, 900, -800]} intensity={0.35} />
          <gridHelper args={[Math.max(width, depth) * 2 + 2000, 20, "#8a939c", "#c3cad0"]} />
          {shown.map((s) => (
            <Part key={s.id} s={s} exploded={exploded} offset={offset} selected={selected?.id === s.id} onSelect={setSelected} />
          ))}
          <OrbitControls makeDefault enableDamping />
          <Fit size={size} trigger={fit} />
        </Canvas>
        <div className="absolute left-3 top-3 right-3 flex flex-wrap gap-2 pointer-events-none">
          <div className="pointer-events-auto flex gap-1 rounded-md border border-rule bg-panel p-1 text-sm">
            <button onClick={() => setExploded((v) => !v)} aria-pressed={exploded} className={`rounded px-2.5 py-1 ${exploded ? "bg-fg text-bg" : "hover:bg-panel2"}`}>Explode</button>
            <button onClick={() => setFit((v) => v + 1)} className="rounded px-2.5 py-1 hover:bg-panel2">Fit</button>
            <select value={section} onChange={(e) => setSection(e.target.value)} className="rounded bg-panel px-1.5 py-1" aria-label="Section">
              <option value="all">All sections</option>
              {sections.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {selected && (
          <div className="absolute right-3 bottom-3 rounded-md border border-rule bg-panel px-3 py-2 text-sm shadow-sm max-w-xs">
            <div className="font-mono text-xs text-muted">{selected.section} · {selected.group}</div>
            <div className="font-medium">{selected.label}</div>
          </div>
        )}
        <p className="absolute left-3 bottom-2 font-mono text-[11px] text-muted pointer-events-none">Drag to rotate · scroll to zoom · click a part · simplified review model</p>
      </div>
      <div className="flex flex-wrap gap-1.5" aria-label="Show or hide groups">
        {present.map((g) => (
          <button key={g} onClick={() => toggle(g)} aria-pressed={!hidden.has(g)}
            className={`rounded-full border px-3 py-1 text-xs ${hidden.has(g) ? "border-rule text-muted bg-panel" : "border-fg bg-fg text-bg"}`}>
            {g}
          </button>
        ))}
      </div>
    </div>
  );
}
