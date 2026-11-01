// Procedural Mars / Moon surface generator.
// Pure JavaScript (no DOM, no three) so it is easy to test. Returns raw RGBA pixels
// for a colour map and a tangent-space normal map in an equirectangular layout.
//
// Convention (matches three.js SphereGeometry): u = 0.5 is longitude 0 and faces +X,
// longitude increases EAST toward -Z.  dir(lat, lon) = (cos lat cos lon, sin lat, -cos lat sin lon)

import { createNoise3D, fbm } from './noise.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const DEG = Math.PI / 180;
const tick = () => new Promise((r) => setTimeout(r, 0));

function mulberry32(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Features stamped on top of the base terrain: craters, volcanoes, canyon pieces. */
function buildFeatures(kind, rand) {
  const list = [];
  const randomPoint = () => ({ lat: Math.asin(rand() * 2 - 1), lon: (rand() * 2 - 1) * Math.PI });
  // crater depth (in height-pixels): shallower for big craters, like real life
  const craterDepth = (radDeg, k) => ((radDeg * W_PX_PER_DEG) * k) / (1 + radDeg / 2.5);

  if (kind === 'moon') {
    for (let i = 0; i < 2600; i++) {
      const rd = clamp(0.42 * Math.pow(1 - rand(), -1 / 1.85), 0.42, 6.5);
      const p = randomPoint();
      list.push({ type: 'crater', ...p, rad: rd * DEG, depth: craterDepth(rd, 0.26), bright: 0.1 + rand() * 0.14, dark: 0.06 });
    }
    // Famous bright-ray craters (Tycho, Copernicus, Aristarchus-ish)
    [[-43.3, -11.4, 3.6], [9.6, -20.1, 2.9], [23.7, -47.4, 1.8]].forEach(([la, lo, rd]) => {
      list.push({ type: 'crater', lat: la * DEG, lon: lo * DEG, rad: rd * DEG, depth: craterDepth(rd, 0.26), bright: 0.32, dark: 0.04, rays: true });
    });
  } else {
    for (let i = 0; i < 170; i++) {
      const rd = clamp(0.8 * Math.pow(1 - rand(), -1 / 1.7), 0.8, 5.5);
      const p = randomPoint();
      list.push({ type: 'crater', ...p, rad: rd * DEG, depth: craterDepth(rd, 0.1), bright: 0.05, dark: 0.05 });
    }
    // Big impact basins (Hellas / Argyre-like)
    [[-42, 70, 8], [-50, -43, 5]].forEach(([la, lo, rd]) => {
      list.push({ type: 'crater', lat: la * DEG, lon: lo * DEG, rad: rd * DEG, depth: craterDepth(rd, 0.07), bright: 0.1, dark: 0.08 });
    });
    // Tharsis volcanoes (Olympus Mons, Arsia, Pavonis, Ascraeus)
    [[18.65, -133.8, 5.2, 1], [-8.35, -120.1, 3.4, 0.8], [0.8, -112.8, 3.2, 0.75], [11.8, -104.5, 3.4, 0.8]].forEach(([la, lo, rd, k]) => {
      list.push({ type: 'volcano', lat: la * DEG, lon: lo * DEG, rad: rd * DEG, depth: 11 * k, ext: rd * DEG * 2.2 });
    });
    // Valles Marineris: many tiny overlapping soft depressions along a path -> one smooth scar
    const N = 170;
    for (let i = 0; i < N; i++) {
      const s = i / (N - 1);
      const lon = lerp(-101, -46, s);
      const lat = -8.0 - 4.2 * Math.sin(s * 3.1) - 2.2 * s + 1.1 * Math.sin(s * 17);
      const rad = (1.9 + 1.1 * Math.sin(s * Math.PI * 0.9 + 0.2)) * DEG;
      list.push({ type: 'canyon', lat: lat * DEG, lon: lon * DEG, rad, depth: 0.55, ext: rad * 1.9 });
      // side branch (Ius / Coprates style)
      if (i % 3 === 0 && s > 0.12 && s < 0.7) {
        list.push({ type: 'canyon', lat: (lat - 3.2 - 2.5 * Math.sin(s * 9)) * DEG, lon: (lon + 3) * DEG, rad: 1.1 * DEG, depth: 0.4, ext: 2.0 * DEG });
      }
    }
  }
  return list;
}

let W_PX_PER_DEG = 2048 / 360; // set per run

export async function generateWorldPixels(kind, W = 2048, H = 1024) {
  const isMars = kind === 'mars';
  W_PX_PER_DEG = W / 360;
  const rand = mulberry32(isMars ? 1337 : 4242);
  const nA = createNoise3D(isMars ? 11 : 31);
  const nB = createNoise3D(isMars ? 73 : 57);

  const color = new Uint8ClampedArray(W * H * 4);
  const height = new Float32Array(W * H);

  // ---------- pass 1: base terrain + albedo ----------
  for (let y = 0; y < H; y++) {
    const lat = Math.PI / 2 - ((y + 0.5) / H) * Math.PI;
    const sy = Math.sin(lat);
    const cy = Math.cos(lat);
    const absLatDeg = Math.abs(lat) / DEG;
    for (let x = 0; x < W; x++) {
      const lon = ((x + 0.5) / W - 0.5) * Math.PI * 2;
      const px = cy * Math.cos(lon);
      const py = sy;
      const pz = -cy * Math.sin(lon);
      const idx = y * W + x;

      const a = fbm(nA, px * 1.3, py * 1.3, pz * 1.3, 5);
      const b = fbm(nB, px * 2.4 + 5, py * 2.4, pz * 2.4, 3);
      const c = fbm(nA, px * 13 + 9, py * 13, pz * 13, 2);

      let r, g, bl, h;
      if (isMars) {
        const dust = smoothstep(-0.28, 0.4, a);
        r = lerp(162, 226, dust);
        g = lerp(86, 156, dust);
        bl = lerp(52, 104, dust);
        const dark = smoothstep(-0.08, 0.34, -b);
        r = lerp(r, 92, dark * 0.56);
        g = lerp(g, 58, dark * 0.56);
        bl = lerp(bl, 48, dark * 0.56);
        const grain = 1 + c * 0.14;
        r *= grain; g *= grain; bl *= grain;
        // polar caps
        const edge = (py > 0 ? 80 : 77) + b * 6 + c * 3;
        const ice = smoothstep(edge, edge + 3.5, absLatDeg);
        r = lerp(r, 238, ice * 0.96);
        g = lerp(g, 228, ice * 0.96);
        bl = lerp(bl, 222, ice * 0.96);
        h = a * 3.5 + b * 1.5 + c * 0.35 + ice * 1.2;
      } else {
        const near = smoothstep(-0.35, 0.55, px); // +X faces Earth (lon 0)
        const mv = b + 0.4 * (near - 0.45);
        const mare = smoothstep(0.2, 0.32, mv);
        let hl = lerp(152, 186, smoothstep(-0.3, 0.4, a)) * (1 + c * 0.24);
        const mg = (80 + a * 12) * (1 + c * 0.18);
        const gray = lerp(hl, mg, mare);
        r = gray * 1.0;
        g = gray * 0.985;
        bl = gray * (0.95 + mare * 0.02);
        h = a * 5 + c * 0.6 - mare * 2.6;
      }
      const i4 = idx * 4;
      color[i4] = r;
      color[i4 + 1] = g;
      color[i4 + 2] = bl;
      color[i4 + 3] = 255;
      height[idx] = h;
    }
    if (y % 48 === 47) await tick();
  }

  // ---------- pass 2: stamp features ----------
  const features = buildFeatures(kind, rand);
  let counter = 0;
  for (const f of features) {
    stamp(f, W, H, height, color);
    if (++counter % 150 === 0) await tick();
  }

  // ---------- pass 3: normal map from the height field ----------
  const normal = new Uint8ClampedArray(W * H * 4);
  const strength = isMars ? 0.55 : 0.8;
  for (let y = 0; y < H; y++) {
    const yu = y > 0 ? y - 1 : 0;
    const yd = y < H - 1 ? y + 1 : H - 1;
    for (let x = 0; x < W; x++) {
      const xl = x > 0 ? x - 1 : W - 1;
      const xr = x < W - 1 ? x + 1 : 0;
      const nx = (height[y * W + xl] - height[y * W + xr]) * strength;
      const ny = (height[yd * W + x] - height[yu * W + x]) * strength;
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      const i4 = (y * W + x) * 4;
      normal[i4] = (nx * inv * 0.5 + 0.5) * 255;
      normal[i4 + 1] = (ny * inv * 0.5 + 0.5) * 255;
      normal[i4 + 2] = (inv * 0.5 + 0.5) * 255;
      normal[i4 + 3] = 255;
    }
    if (y % 128 === 127) await tick();
  }

  return { color, normal, width: W, height: H };
}

function stamp(f, W, H, height, color) {
  const ext = f.ext || (f.rays ? f.rad * 9 : f.rad * 2.4);
  const cyPx = (0.5 - f.lat / Math.PI) * H;
  const cxPx = (f.lon / (2 * Math.PI) + 0.5) * W;
  const dy = (ext / Math.PI) * H;
  const cosLat0 = Math.cos(f.lat);
  const dx = Math.min(W / 2, ((ext / (2 * Math.PI)) * W) / Math.max(cosLat0, 0.08));
  const y0 = Math.max(0, Math.floor(cyPx - dy));
  const y1 = Math.min(H - 1, Math.ceil(cyPx + dy));
  const sinLat0 = Math.sin(f.lat);
  const big = f.rad > 0.04;

  for (let y = y0; y <= y1; y++) {
    const lat = Math.PI / 2 - ((y + 0.5) / H) * Math.PI;
    const sl = Math.sin(lat);
    const cl = Math.cos(lat);
    for (let xx = Math.floor(cxPx - dx); xx <= Math.ceil(cxPx + dx); xx++) {
      const x = ((xx % W) + W) % W;
      const lon = ((x + 0.5) / W - 0.5) * Math.PI * 2;
      const cosd = sl * sinLat0 + cl * cosLat0 * Math.cos(lon - f.lon);
      const d = Math.acos(cosd > 1 ? 1 : cosd < -1 ? -1 : cosd);
      if (d > ext) continue;
      const q = d / f.rad;
      let dh = 0;
      let dt = 0;

      if (f.type === 'crater') {
        if (q < 1) {
          const bowl = 1 - q * q;
          dh -= f.depth * bowl;
          dt -= f.dark * bowl;
          if (big) dh += f.depth * 0.45 * Math.exp(-(q * q) / 0.02);
        }
        const rim = Math.exp(-(((q - 1.0) / 0.17) ** 2));
        dh += f.depth * 0.32 * rim;
        dt += f.bright * 0.8 * rim;
        if (q > 1) {
          const e = Math.pow(1 / q, 2.8);
          dh += f.depth * 0.1 * e;
          dt += f.bright * 0.5 * e;
        }
        if (f.rays && q > 1) {
          const bearing = Math.atan2((lon - f.lon) * cl, lat - f.lat);
          const ray = smoothstep(0.55, 0.95, Math.abs(Math.sin(bearing * 5.5 + 1.3 * Math.sin(bearing * 13))));
          dt += 0.7 * ray * Math.pow(Math.max(0, 1 - q / 9), 1.7);
        }
      } else if (f.type === 'volcano') {
        const g = Math.exp(-q * q * 2.2);
        dh += f.depth * g;
        if (q < 0.18) dh -= f.depth * 0.25 * (1 - q / 0.18);
        dt -= 0.05 * g;
      } else if (f.type === 'canyon') {
        const g = Math.exp(-q * q * 2.4);
        dh -= f.depth * g;
        dt -= 0.034 * g;
      }

      const idx = y * W + x;
      height[idx] += dh;
      if (dt !== 0) {
        const i4 = idx * 4;
        if (dt > 0) {
          const add = dt * 110;
          color[i4] += add; color[i4 + 1] += add; color[i4 + 2] += add;
        } else {
          const m = 1 + dt;
          color[i4] *= m; color[i4 + 1] *= m; color[i4 + 2] *= m;
        }
      }
    }
  }
}
