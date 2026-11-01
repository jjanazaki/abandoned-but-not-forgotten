import * as THREE from 'three';

/* ------------------------------------------------------------------ helpers */
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const std = (color, metalness = 0.3, roughness = 0.6, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });

const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (rt, rb, h, m, seg = 32) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
const sph = (r, m, seg = 24) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg >> 1)), m);
const put = (parent, obj, x = 0, y = 0, z = 0) => {
  obj.position.set(x, y, z);
  parent.add(obj);
  return obj;
};

/** Cylinder between two points. */
function strut(a, b, r, m, seg = 8) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mesh = cyl(r, r, len, m, seg);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(V(0, 1, 0), dir.normalize());
  return mesh;
}

/** Parabolic dish opening toward +Y (rotate it to aim). */
function dish(R, depth, m) {
  const f = (R * R) / (4 * depth);
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const r = (R * i) / 24;
    pts.push(new THREE.Vector2(r, (r * r) / (4 * f)));
  }
  const mat = m.clone();
  mat.side = THREE.DoubleSide;
  return new THREE.Mesh(new THREE.LatheGeometry(pts, 64), mat);
}

let solarTex = null;
function solarTexture() {
  if (solarTex || typeof document === 'undefined') return solarTex;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#10204f';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(150,185,255,0.55)';
  g.lineWidth = 2;
  for (let i = 0; i <= 8; i++) {
    g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, 256); g.stroke();
    g.beginPath(); g.moveTo(0, i * 32); g.lineTo(256, i * 32); g.stroke();
  }
  solarTex = new THREE.CanvasTexture(c);
  solarTex.colorSpace = THREE.SRGBColorSpace;
  solarTex.anisotropy = 8;
  return solarTex;
}

function kit() {
  return {
    foil: std(0xd8a43c, 1, 0.3),
    foil2: std(0xa87a22, 1, 0.45),
    alu: std(0xc9ced6, 0.9, 0.36),
    steel: std(0x8b939e, 0.9, 0.45),
    dark: std(0x1d2027, 0.5, 0.55),
    black: std(0x0d0e12, 0.3, 0.7),
    white: std(0xeceff3, 0.25, 0.5),
    cream: std(0xd8d1c0, 0.2, 0.6),
    wheel: std(0xa3a8b0, 0.9, 0.42),
    solar: std(0xffffff, 0.55, 0.3, { map: solarTexture(), emissive: 0x0a1233, emissiveIntensity: 0.35 }),
    lens: std(0x070b16, 1, 0.1),
    carbon: std(0x14161b, 0.6, 0.4),
  };
}

function wheel(r, w, k, cleats = 0) {
  const g = new THREE.Group();
  const tire = cyl(r, r, w, k.wheel, 40); tire.rotation.z = Math.PI / 2; g.add(tire);
  const hub = cyl(r * 0.55, r * 0.55, w * 1.04, k.steel, 24); hub.rotation.z = Math.PI / 2; g.add(hub);
  const cap = cyl(r * 0.18, r * 0.18, w * 1.12, k.dark, 12); cap.rotation.z = Math.PI / 2; g.add(cap);
  for (let i = 0; i < cleats; i++) {
    const a = (i / cleats) * Math.PI * 2;
    const c = box(w * 0.96, r * 0.12, r * 0.18, k.wheel);
    c.position.set(0, Math.cos(a) * r * 1.03, Math.sin(a) * r * 1.03);
    c.rotation.x = a;
    g.add(c);
  }
  return g;
}

/** 6 wheels with rocker-bogie style rails. Wheel centres sit at y = r (ground = 0). */
function suspension(g, k, { track, zs, r, w, railY, cleats = 0 }) {
  for (const side of [-1, 1]) {
    const x = (side * track) / 2;
    zs.forEach((z) => {
      put(g, wheel(r, w, k, cleats), x, r, z);
      g.add(strut(V(x * 0.97, r, z), V(x * 0.97, railY, z), r * 0.09, k.alu));
    });
    g.add(strut(V(x * 0.97, railY, zs[0]), V(x * 0.97, railY, zs[zs.length - 1]), r * 0.1, k.alu));
    g.add(strut(V(x * 0.97, railY, 0), V(x * 0.6, railY + r * 0.9, 0), r * 0.08, k.alu));
  }
  g.add(strut(V(-track * 0.6 / 2, railY + r * 0.9, 0), V(track * 0.6 / 2, railY + r * 0.9, 0), r * 0.08, k.alu));
}

/* ------------------------------------------------------------------ rovers */
function buildSojourner() {
  const k = kit(); const g = new THREE.Group();
  suspension(g, k, { track: 0.42, zs: [-0.22, 0, 0.22], r: 0.065, w: 0.05, railY: 0.13, cleats: 12 });
  put(g, box(0.34, 0.13, 0.5, k.cream), 0, 0.2, 0);
  put(g, box(0.36, 0.014, 0.52, k.solar), 0, 0.276, 0);
  put(g, box(0.36, 0.02, 0.02, k.alu), 0, 0.262, 0.26);
  g.add(strut(V(0.1, 0.28, -0.2), V(0.1, 0.5, -0.22), 0.004, k.alu));
  put(g, sph(0.012, k.alu), 0.1, 0.5, -0.22);
  put(g, box(0.07, 0.04, 0.03, k.lens), -0.08, 0.22, 0.26);
  put(g, box(0.07, 0.04, 0.03, k.lens), 0.08, 0.22, 0.26);
  put(g, box(0.08, 0.06, 0.06, k.dark), 0, 0.12, 0.27);
  put(g, box(0.1, 0.05, 0.05, k.alu), 0, 0.12, -0.27);
  return { group: g, grounded: true, fit: 0.42 };
}

function buildMER() {
  const k = kit(); const g = new THREE.Group();
  suspension(g, k, { track: 1.5, zs: [-0.55, 0, 0.55], r: 0.13, w: 0.16, railY: 0.42, cleats: 14 });
  put(g, box(1.5, 0.05, 1.3, k.solar), 0, 0.64, 0);
  put(g, box(0.82, 0.4, 0.9, k.foil), 0, 0.8, 0.02);
  put(g, box(0.86, 0.05, 0.94, k.dark), 0, 1.02, 0.02);
  g.add(strut(V(-0.2, 1.0, 0.3), V(-0.2, 1.7, 0.3), 0.028, k.alu));
  put(g, box(0.34, 0.1, 0.12, k.dark), -0.2, 1.74, 0.3);
  put(g, cyl(0.025, 0.025, 0.03, k.lens, 12), -0.31, 1.74, 0.37).rotation.x = Math.PI / 2;
  put(g, cyl(0.025, 0.025, 0.03, k.lens, 12), -0.09, 1.74, 0.37).rotation.x = Math.PI / 2;
  // high-gain dish + low-gain
  g.add(strut(V(-0.5, 0.66, -0.45), V(-0.5, 1.0, -0.45), 0.02, k.alu));
  const hga = put(g, cyl(0.2, 0.2, 0.02, k.alu, 32), -0.5, 1.05, -0.45); hga.rotation.x = -0.45;
  g.add(strut(V(0.5, 0.66, -0.5), V(0.5, 1.0, -0.5), 0.012, k.alu));
  // arm
  g.add(strut(V(0.2, 0.55, 0.62), V(0.3, 0.45, 0.95), 0.03, k.alu));
  g.add(strut(V(0.3, 0.45, 0.95), V(0.1, 0.4, 1.1), 0.028, k.alu));
  put(g, cyl(0.1, 0.1, 0.16, k.dark, 20), 0.1, 0.4, 1.14).rotation.x = Math.PI / 2;
  return { group: g, grounded: true, fit: 1.25 };
}

function buildCuriosity() {
  const k = kit(); const g = new THREE.Group();
  suspension(g, k, { track: 2.0, zs: [-1.15, 0.05, 1.2], r: 0.25, w: 0.3, railY: 0.72, cleats: 18 });
  put(g, box(1.55, 0.7, 2.0, k.alu), 0, 1.2, 0);
  put(g, box(1.7, 0.06, 2.15, k.cream), 0, 1.58, 0);
  // RTG
  const rtg = new THREE.Group();
  const body = cyl(0.17, 0.17, 0.8, k.dark, 20); body.rotation.x = Math.PI / 2; rtg.add(body);
  for (let i = 0; i < 7; i++) {
    const fin = cyl(0.26, 0.26, 0.025, k.black, 24); fin.rotation.x = Math.PI / 2; fin.position.z = -0.32 + i * 0.1; rtg.add(fin);
  }
  put(g, rtg, 0, 1.38, -1.28).rotation.x = 0.2;
  // mast
  g.add(strut(V(-0.5, 1.6, 0.6), V(-0.5, 2.25, 0.6), 0.04, k.alu));
  put(g, box(0.5, 0.17, 0.17, k.dark), -0.5, 2.3, 0.6);
  put(g, cyl(0.045, 0.045, 0.04, k.lens, 12), -0.62, 2.3, 0.7).rotation.x = Math.PI / 2;
  put(g, cyl(0.045, 0.045, 0.04, k.lens, 12), -0.38, 2.3, 0.7).rotation.x = Math.PI / 2;
  put(g, box(0.17, 0.2, 0.2, k.alu), -0.5, 2.46, 0.6);
  // HGA (hex) + UHF
  g.add(strut(V(0.5, 1.6, -0.5), V(0.5, 1.85, -0.5), 0.03, k.alu));
  const hga = put(g, cyl(0.3, 0.3, 0.035, k.white, 6), 0.5, 1.9, -0.5); hga.rotation.x = -0.5;
  g.add(strut(V(-0.55, 1.6, -0.7), V(-0.55, 2.0, -0.7), 0.014, k.alu));
  // arm + turret
  g.add(strut(V(0.35, 1.1, 1.0), V(0.62, 0.95, 1.6), 0.05, k.alu));
  g.add(strut(V(0.62, 0.95, 1.6), V(0.3, 0.8, 1.95), 0.045, k.alu));
  const tur = put(g, cyl(0.22, 0.22, 0.32, k.dark, 24), 0.3, 0.8, 2.0); tur.rotation.x = Math.PI / 2;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    put(g, cyl(0.06, 0.06, 0.22, k.steel, 12), 0.3 + Math.cos(a) * 0.15, 0.8 + Math.sin(a) * 0.15, 2.2).rotation.x = Math.PI / 2;
  }
  return { group: g, grounded: true, fit: 2.2 };
}

/* ------------------------------------------------------------------ helicopter */
function buildIngenuity() {
  const k = kit(); const g = new THREE.Group();
  const bodyY = 0.34;
  put(g, box(0.14, 0.2, 0.17, k.foil), 0, bodyY, 0);
  put(g, box(0.15, 0.02, 0.18, k.dark), 0, bodyY + 0.11, 0);
  put(g, cyl(0.012, 0.012, 0.02, k.lens, 12), 0, bodyY + 0.02, 0.09).rotation.x = Math.PI / 2;
  g.add(strut(V(0, bodyY + 0.1, 0), V(0, 0.62, 0), 0.012, k.carbon));
  // solar panel
  put(g, box(0.4, 0.01, 0.27, k.solar), 0, 0.64, 0);
  // legs
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    g.add(strut(V(sx * 0.055, bodyY - 0.09, sz * 0.07), V(sx * 0.21, 0.01, sz * 0.23), 0.006, k.carbon));
    put(g, cyl(0.025, 0.025, 0.006, k.dark, 12), sx * 0.21, 0.003, sz * 0.23);
  });
  put(g, sph(0.012, k.dark), 0, 0.14, 0);
  // rotors
  const lower = new THREE.Group(); const upper = new THREE.Group();
  const blade = (parent) => {
    put(parent, box(1.2, 0.004, 0.07, k.carbon), 0, 0, 0);
    put(parent, cyl(0.03, 0.03, 0.03, k.steel, 16), 0, 0, 0);
  };
  blade(lower); blade(upper);
  lower.position.y = 0.5; upper.position.y = 0.56; upper.rotation.y = Math.PI / 2;
  g.add(lower, upper);
  return {
    group: g, grounded: true, fit: 0.66,
    update: (dt) => { lower.rotation.y += dt * 4; upper.rotation.y -= dt * 4; },
  };
}

/* ------------------------------------------------------------------ landers */
function legs3(g, k, { bodyR, bodyY, footR, pad }) {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const top = V(Math.cos(a) * bodyR, bodyY, Math.sin(a) * bodyR);
    const foot = V(Math.cos(a) * footR, pad, Math.sin(a) * footR);
    g.add(strut(top, foot, 0.035, k.steel));
    g.add(strut(top, top.clone().lerp(foot, 0.45), 0.055, k.alu));
    put(g, cyl(0.24, 0.26, 0.05, k.alu, 24), foot.x, pad, foot.z);
  }
}

function buildViking() {
  const k = kit(); const g = new THREE.Group();
  legs3(g, k, { bodyR: 0.8, bodyY: 0.95, footR: 1.75, pad: 0.03 });
  const body = put(g, cyl(1.05, 1.05, 0.5, k.alu, 6), 0, 1.05, 0); body.rotation.y = Math.PI / 6;
  const band = put(g, cyl(1.07, 1.07, 0.06, k.foil, 6), 0, 1.0, 0); band.rotation.y = Math.PI / 6;
  put(g, cyl(0.98, 0.98, 0.04, k.dark, 6), 0, 1.31, 0).rotation.y = Math.PI / 6;
  // RTG units with wind covers
  [-1, 1].forEach((s) => {
    put(g, cyl(0.3, 0.3, 0.55, k.steel, 20), s * 0.85, 1.62, -0.1);
    for (let i = 0; i < 4; i++) put(g, cyl(0.34, 0.34, 0.025, k.dark, 20), s * 0.85, 1.42 + i * 0.12, -0.1);
  });
  // camera towers
  [[0.45, 0.35], [-0.3, 0.4]].forEach(([x, z]) => {
    put(g, box(0.14, 0.4, 0.14, k.dark), x, 1.55, z);
    put(g, cyl(0.04, 0.04, 0.05, k.lens, 12), x, 1.78, z + 0.08).rotation.x = Math.PI / 2;
  });
  // HGA on a boom
  g.add(strut(V(-0.4, 1.3, -0.5), V(-0.4, 2.0, -0.5), 0.03, k.alu));
  const hga = dish(0.5, 0.12, k.white); hga.position.set(-0.4, 2.05, -0.5); hga.rotation.set(-0.7, 0, 0.25); g.add(hga);
  // met boom + sampler arm
  g.add(strut(V(0.25, 1.3, 0.0), V(0.9, 2.5, 0.5), 0.018, k.alu));
  put(g, sph(0.05, k.dark), 0.9, 2.5, 0.5);
  g.add(strut(V(0, 1.15, 0.9), V(0.25, 1.1, 2.0), 0.025, k.steel));
  put(g, box(0.14, 0.08, 0.14, k.dark), 0.25, 1.08, 2.05);
  return { group: g, grounded: true, fit: 2.1 };
}

function buildInSight() {
  const k = kit(); const g = new THREE.Group();
  legs3(g, k, { bodyR: 0.7, bodyY: 0.95, footR: 1.35, pad: 0.03 });
  put(g, cyl(0.85, 0.85, 0.14, k.cream, 8), 0, 1.0, 0);
  put(g, box(0.8, 0.3, 0.8, k.foil), 0.1, 1.2, -0.05);
  put(g, box(0.5, 0.2, 0.5, k.white), -0.2, 1.17, 0.35);
  // solar arrays
  [-1, 1].forEach((s) => {
    const panel = put(g, cyl(1.12, 1.12, 0.035, k.solar, 64), s * 2.0, 1.2, 0);
    panel.rotation.z = s * 0.06;
    put(g, cyl(0.2, 0.2, 0.08, k.alu, 24), s * 2.0, 1.2, 0);
    g.add(strut(V(s * 0.85, 1.05, 0), V(s * 1.85, 1.18, 0), 0.04, k.alu));
  });
  // antennas
  put(g, cyl(0.08, 0.14, 0.2, k.alu, 16), 0.45, 1.4, 0.3);
  put(g, cyl(0.08, 0.14, 0.2, k.alu, 16), 0.2, 1.4, 0.45);
  g.add(strut(V(-0.5, 1.07, -0.4), V(-0.5, 1.7, -0.4), 0.014, k.alu));
  // arm
  g.add(strut(V(0.3, 1.1, 0.5), V(0.7, 1.45, 1.0), 0.04, k.alu));
  g.add(strut(V(0.7, 1.45, 1.0), V(1.05, 0.55, 1.4), 0.035, k.alu));
  // instruments placed on the ground
  put(g, new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), k.foil2), 1.25, 0, 1.4);
  put(g, box(0.22, 0.12, 0.22, k.dark), -1.0, 0.06, 1.4);
  return { group: g, grounded: true, fit: 3.0 };
}

function buildApolloLM() {
  const k = kit(); const g = new THREE.Group();
  const body = put(g, cyl(1.95, 1.95, 1.5, k.foil, 8), 0, 1.85, 0); body.rotation.y = Math.PI / 8;
  put(g, cyl(1.99, 1.99, 0.12, k.black, 8), 0, 2.58, 0).rotation.y = Math.PI / 8;
  put(g, cyl(1.99, 1.99, 0.12, k.black, 8), 0, 1.12, 0).rotation.y = Math.PI / 8;
  put(g, cyl(1.7, 1.7, 0.06, k.steel, 8), 0, 2.67, 0).rotation.y = Math.PI / 8;
  put(g, cyl(0.38, 0.8, 0.85, k.steel, 32), 0, 0.82, 0);
  put(g, cyl(0.3, 0.7, 0.8, k.black, 32), 0, 0.8, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const c = Math.cos(a), s = Math.sin(a);
    const top = V(c * 1.65, 2.4, s * 1.65);
    const foot = V(c * 4.1, 0.1, s * 4.1);
    g.add(strut(top, foot, 0.07, k.alu));
    const mid = top.clone().lerp(foot, 0.62);
    [-1, 1].forEach((side) => {
      const a2 = a + side * (Math.PI / 8);
      g.add(strut(V(Math.cos(a2) * 1.95, 1.25, Math.sin(a2) * 1.95), mid, 0.045, k.steel));
    });
    put(g, cyl(0.46, 0.5, 0.08, k.steel, 32), foot.x, 0.06, foot.z);
    g.add(strut(V(foot.x, 0.12, foot.z), V(foot.x + c * 0.9, 0.0, foot.z + s * 0.9), 0.012, k.steel));
  }
  // ladder + porch on the +Z leg side
  [-0.22, 0.22].forEach((x) => g.add(strut(V(x, 2.2, 1.95), V(x, 0.15, 3.3), 0.03, k.alu)));
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    put(g, box(0.5, 0.025, 0.05, k.alu), 0, 2.2 - t * 2.05, 1.95 + t * 1.35);
  }
  put(g, box(0.95, 0.05, 0.9, k.alu), 0, 2.28, 2.0);
  return { group: g, grounded: true, fit: 4.4 };
}

/* ------------------------------------------------------------------ deep-space probes */
function buildPioneer() {
  const k = kit(); const g = new THREE.Group();
  const D = 1.37, depth = 0.45;
  const d = dish(D, depth, k.foil2); d.rotation.x = Math.PI / 2; g.add(d); // opens toward +Z
  const bus = put(g, cyl(0.55, 0.55, 0.38, k.alu, 6), 0, 0, -0.28); bus.rotation.x = Math.PI / 2;
  put(g, cyl(0.2, 0.2, 0.2, k.dark, 16), 0, 0, -0.55).rotation.x = Math.PI / 2;
  // feed on 3 struts
  const f = V(0, 0, 1.25);
  [90, 210, 330].forEach((deg) => {
    const a = (deg * Math.PI) / 180;
    g.add(strut(V(Math.cos(a) * D, Math.sin(a) * D, depth), f, 0.014, k.alu));
  });
  put(g, cyl(0.05, 0.12, 0.2, k.alu, 16), 0, 0, 1.3).rotation.x = Math.PI / 2;
  // plaque
  put(g, box(0.23, 0.15, 0.006, k.foil), 0.62, -0.5, 0.72).rotation.set(0.5, 0.2, 0.5);
  // RTG booms
  [15, 165].forEach((deg) => {
    const a = (deg * Math.PI) / 180;
    const dir = V(Math.cos(a), Math.sin(a), 0);
    g.add(strut(dir.clone().multiplyScalar(0.5).setZ(-0.3), dir.clone().multiplyScalar(3.4).setZ(-0.3), 0.022, k.alu));
    [2.55, 3.3].forEach((r) => {
      const rtg = put(g, cyl(0.14, 0.14, 0.62, k.dark, 16), dir.x * r, dir.y * r, -0.3);
      rtg.rotation.z = a + Math.PI / 2;
      for (let i = 0; i < 4; i++) {
        const fin = put(g, cyl(0.2, 0.2, 0.02, k.black, 18), dir.x * (r - 0.2 + i * 0.13), dir.y * (r - 0.2 + i * 0.13), -0.3);
        fin.rotation.z = a + Math.PI / 2;
      }
    });
  });
  // magnetometer boom
  g.add(strut(V(0, -0.5, -0.3), V(0.2, -3.7, -0.5), 0.012, k.alu));
  put(g, box(0.1, 0.1, 0.1, k.dark), 0.2, -3.75, -0.5);
  return { group: g, grounded: false, fit: 3.5 };
}

function buildVoyager() {
  const k = kit(); const g = new THREE.Group();
  const R = 1.83;
  const d = dish(R, 0.62, k.white); d.rotation.x = Math.PI / 2; g.add(d);
  const bus = put(g, cyl(0.9, 0.9, 0.5, k.foil2, 10), 0, 0, -0.38); bus.rotation.x = Math.PI / 2;
  put(g, cyl(0.7, 0.7, 0.06, k.dark, 10), 0, 0, -0.65).rotation.x = Math.PI / 2;
  // feed
  [90, 210, 330].forEach((deg) => {
    const a = (deg * Math.PI) / 180;
    g.add(strut(V(Math.cos(a) * R, Math.sin(a) * R, 0.62), V(0, 0, 1.2), 0.016, k.alu));
  });
  put(g, cyl(0.06, 0.15, 0.22, k.alu, 16), 0, 0, 1.25).rotation.x = Math.PI / 2;
  // golden record
  put(g, cyl(0.17, 0.17, 0.012, k.foil, 32), 0.95, 0.1, -0.35).rotation.z = Math.PI / 2;
  // RTG boom
  g.add(strut(V(-0.8, -0.2, -0.45), V(-3.1, -0.9, -0.6), 0.03, k.alu));
  [0, 1, 2].forEach((i) => {
    const t = 0.45 + i * 0.18;
    const p = V(-0.8, -0.2, -0.45).lerp(V(-3.1, -0.9, -0.6), t);
    const rtg = put(g, cyl(0.1, 0.1, 0.55, k.dark, 16), p.x, p.y, p.z);
    rtg.rotation.z = Math.PI / 2 + 0.3;
  });
  // science boom + scan platform
  g.add(strut(V(0.5, -0.4, -0.5), V(1.6, -2.4, -0.7), 0.03, k.alu));
  put(g, box(0.45, 0.35, 0.4, k.dark), 1.65, -2.5, -0.7);
  put(g, cyl(0.07, 0.07, 0.22, k.lens, 12), 1.65, -2.5, -0.45).rotation.x = Math.PI / 2;
  put(g, cyl(0.04, 0.04, 0.2, k.lens, 12), 1.85, -2.45, -0.45).rotation.x = Math.PI / 2;
  // magnetometer boom
  g.add(strut(V(-0.3, 0.5, -0.5), V(-2.2, 3.4, -0.9), 0.012, k.alu));
  put(g, box(0.1, 0.1, 0.1, k.dark), -2.2, 3.45, -0.9);
  // plasma-wave antennas (V)
  g.add(strut(V(0.2, 0.2, -0.7), V(3.4, 1.6, -1.4), 0.008, k.alu));
  g.add(strut(V(0.2, 0.2, -0.7), V(2.8, -1.9, -1.6), 0.008, k.alu));
  return { group: g, grounded: false, fit: 3.7 };
}

/* ------------------------------------------------------------------ registry */
const BUILDERS = {
  sojourner: buildSojourner, mer: buildMER, curiosity: buildCuriosity, ingenuity: buildIngenuity,
  viking: buildViking, insight: buildInSight, 'apollo-lm': buildApolloLM, pioneer: buildPioneer, voyager: buildVoyager,
};

/**
 * Build a procedural model for a tool.
 * Returns { group, grounded, fit, update? }. `fit` ~ half-size in model units; used to normalise scale.
 */
export function buildToolModel(tool) {
  const build = BUILDERS[tool.model] || buildCuriosity;
  const out = build(tool);
  out.group.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  return out;
}
