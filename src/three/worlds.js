import * as THREE from 'three';
import { fresnelMaterial, glowTexture, dotTexture } from './core.js';

const STYLE = {
  mars: { tilt: 0.44, atmo: { color: 0xff9560, intensity: 0.9, power: 3.0 }, roughness: 0.95, normalScale: 0.9 },
  moon: { tilt: 0.12, atmo: { color: 0xa9bfff, intensity: 0.2, power: 3.6 }, roughness: 1.0, normalScale: 1.0 },
};

/**
 * Textured Mars / Moon. Returns { group, mesh, pickMesh, radius, tilt, setDim(v), update(dt) }.
 * `group` holds everything; markers should be added to `group` so they stay on the surface.
 */
export function createRockyWorld(kind, radius, textures) {
  const st = STYLE[kind] || STYLE.moon;
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    map: textures.map,
    normalMap: textures.normalMap || null,
    normalScale: new THREE.Vector2(st.normalScale, st.normalScale),
    roughness: st.roughness,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 128, 96), mat);
  group.add(mesh);

  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.045, 96, 64),
    fresnelMaterial(st.atmo.color, st.atmo.intensity, st.atmo.power),
  );
  group.add(atmo);

  return {
    group, mesh, pickMesh: mesh, radius, tilt: st.tilt,
    setDim(v) {
      mat.color.setScalar(v);
      atmo.material.uniforms.uIntensity.value = st.atmo.intensity * v;
    },
    update() {},
  };
}

/* ------------------------------------------------------------------ deep space */
const PLANET_ORBITS = [
  [0.39, 0xb8b4ad], [0.72, 0xe8c27a], [1.0, 0x5aa7ff], [1.52, 0xe0673c],
  [5.2, 0xe3b07b], [9.58, 0xe8d49b], [19.2, 0x8fe4ea], [30.05, 0x5b7dff],
];
const MAX_AU = 180;
const PROBE_COLORS = { 'pioneer-10': 0x7fd4ff, 'pioneer-11': 0xa6b6ff, 'voyager-1': 0x6fffe0 };

const ecliptic = (lonDeg, latDeg) => {
  const l = THREE.MathUtils.degToRad(lonDeg);
  const b = THREE.MathUtils.degToRad(latDeg);
  return new THREE.Vector3(Math.cos(b) * Math.cos(l), Math.sin(b), -Math.cos(b) * Math.sin(l));
};

/**
 * Schematic "heliosphere": Sun, planet orbits and one outbound trail per probe.
 * Distances use a logarithmic scale so everything fits (this is NOT to scale).
 * Returns { group, pickMesh, positions: Map(toolId -> Vector3), setDim(v), update(dt,t) }.
 */
export function createHeliosphere(radius, tools = [], { heads = true } = {}) {
  const group = new THREE.Group();
  const dim = []; // {mat, base} or {uniform, base}
  const addDim = (mat, base) => dim.push({ mat, base });
  const f = (au) => (radius * Math.log10(1 + au)) / Math.log10(1 + MAX_AU);

  // outer shell + soft inner tint
  const shellMat = fresnelMaterial(0x5a8cff, 0.95, 2.3);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 48), shellMat);
  group.add(shell);
  const fill = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.995, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0x0b1a3d, transparent: true, opacity: 0.3, side: THREE.BackSide, depthWrite: false }),
  );
  group.add(fill);
  addDim(fill.material, 0.3);

  // orbits + tiny planets
  const dotPos = [];
  const dotCol = [];
  PLANET_ORBITS.forEach(([au, color], i) => {
    const r = f(au);
    const pts = [];
    for (let k = 0; k <= 160; k++) {
      const a = (k / 160) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    const m = new THREE.LineBasicMaterial({ color: 0x7f97d8, transparent: true, opacity: 0.3, depthWrite: false });
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), m));
    addDim(m, 0.3);
    const a = i * 1.37 + 0.6;
    dotPos.push(Math.cos(a) * r, 0, Math.sin(a) * r);
    const c = new THREE.Color(color);
    dotCol.push(c.r, c.g, c.b);
  });
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.Float32BufferAttribute(dotPos, 3));
  pGeo.setAttribute('color', new THREE.Float32BufferAttribute(dotCol, 3));
  const pMat = new THREE.PointsMaterial({
    size: radius * 0.045, map: dotTexture(), vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  group.add(new THREE.Points(pGeo, pMat));
  addDim(pMat, 1);

  // sun
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color: 0xffc77a, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  sunGlow.scale.setScalar(radius * 0.8);
  const sunCore = new THREE.Sprite(new THREE.SpriteMaterial({
    map: dotTexture(), color: 0xfff3cf, transparent: true, depthWrite: false, toneMapped: false,
  }));
  sunCore.scale.setScalar(radius * 0.15);
  group.add(sunGlow, sunCore);
  addDim(sunGlow.material, 0.95);
  addDim(sunCore.material, 1);

  // dust
  const dustN = 700;
  const dp = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) {
    const u = Math.random() * 2 - 1;
    const th = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = radius * Math.pow(Math.random(), 0.55);
    dp.set([r * s * Math.cos(th), r * u * 0.7, r * s * Math.sin(th)], i * 3);
  }
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dMat = new THREE.PointsMaterial({
    size: radius * 0.012, color: 0x9bb6ff, map: dotTexture(), transparent: true, opacity: 0.55,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const dust = new THREE.Points(dGeo, dMat);
  group.add(dust);
  addDim(dMat, 0.55);

  // probes
  const positions = new Map();
  tools.forEach((tool) => {
    const tr = tool.location?.trajectory;
    const au = tool.location?.distanceAU;
    if (!tr || !au) return;
    const color = new THREE.Color(PROBE_COLORS[tool.id] || 0x7fd4ff);
    const d1 = ecliptic(tr.eclipticLongitudeDeg, tr.eclipticLatitudeDeg);
    const d0 = ecliptic(tr.eclipticLongitudeDeg - 55, 0);
    const N = 72;
    const pts = [];
    const cols = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const k = THREE.MathUtils.smoothstep(t, 0.04, 0.55);
      const dir = d0.clone().lerp(d1, k).normalize();
      pts.push(dir.multiplyScalar(f(au * t)));
      const fade = 0.08 + 0.92 * t;
      cols.push(color.r * fade, color.g * fade, color.b * fade);
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const lm = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    group.add(new THREE.Line(geo, lm));
    addDim(lm, 1);
    const end = pts[pts.length - 1].clone();
    positions.set(tool.id, end);
    if (heads) {
      const h = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      }));
      h.scale.setScalar(radius * 0.2);
      h.position.copy(end);
      group.add(h);
      addDim(h.material, 1);
    }
  });

  return {
    group, mesh: shell, pickMesh: shell, radius, tilt: 0.35, positions,
    setDim(v) {
      dim.forEach((d) => { d.mat.opacity = d.base * v; });
      shellMat.uniforms.uIntensity.value = 0.95 * v;
    },
    update(dt, t) {
      dust.rotation.y += dt * 0.012;
      sunGlow.scale.setScalar(radius * (0.8 + 0.04 * Math.sin(t * 1.6)));
    },
  };
}
