import * as THREE from 'three';

/* ------------------------------------------------------------------ renderer */
export function createRenderer(container, { alpha = false, shadows = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  if (shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  renderer.setSize(container.clientWidth || 1, container.clientHeight || 1);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  if (alpha) renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);
  return renderer;
}

export function startLoop(tick) {
  let raf = 0;
  let running = true;
  let last = performance.now();
  const frame = (now) => {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    tick(dt, now / 1000);
  };
  raf = requestAnimationFrame(frame);
  return () => {
    running = false;
    cancelAnimationFrame(raf);
  };
}

export function observeSize(container, cb) {
  const ro = new ResizeObserver(() => cb(container.clientWidth || 1, container.clientHeight || 1));
  ro.observe(container);
  return () => ro.disconnect();
}

/** Dispose geometries + materials (NOT textures: those are shared/cached). */
export function disposeObject(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
  });
}

export function destroyRenderer(renderer, container) {
  renderer.dispose();
  renderer.forceContextLoss?.();
  if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
}

/* ------------------------------------------------------------------ shared sprite textures */
const cache = {};
function canvasTex(key, size, draw) {
  if (cache[key]) return cache[key];
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  cache[key] = t;
  return t;
}

export const glowTexture = () =>
  canvasTex('glow', 128, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.2, 'rgba(255,255,255,0.55)');
    r.addColorStop(0.5, 'rgba(255,255,255,0.14)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
  });

export const dotTexture = () =>
  canvasTex('dot', 64, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.62, 'rgba(255,255,255,1)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
  });

export const ringTexture = () =>
  canvasTex('ring', 128, (g, s) => {
    g.strokeStyle = 'rgba(255,255,255,1)';
    g.lineWidth = s * 0.05;
    g.shadowColor = 'white';
    g.shadowBlur = s * 0.05;
    g.beginPath();
    g.arc(s / 2, s / 2, s * 0.4, 0, Math.PI * 2);
    g.stroke();
  });

/* ------------------------------------------------------------------ backdrop */
export function createStars({ count = 1500, radius = 60, size = 0.6, opacity = 0.9 } = {}) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1;
    const th = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = radius * (1 + Math.random() * 0.5);
    pos.set([r * s * Math.cos(th), r * u, r * s * Math.sin(th)], i * 3);
    const k = Math.random();
    if (k < 0.2) tmp.setRGB(0.7, 0.82, 1);
    else if (k < 0.32) tmp.setRGB(1, 0.86, 0.7);
    else tmp.setRGB(1, 1, 1);
    tmp.multiplyScalar(0.45 + Math.random() * 0.55);
    col.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size, map: dotTexture(), vertexColors: true, transparent: true, opacity,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  return new THREE.Points(geo, mat);
}

export function createNebula() {
  const W = 1024, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#02030a';
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter';
  const blobs = [
    ['rgba(40,70,170,0.22)', 220], ['rgba(90,40,150,0.18)', 200], ['rgba(20,110,150,0.14)', 170],
    ['rgba(150,50,90,0.07)', 160], ['rgba(30,50,120,0.2)', 260],
  ];
  for (let i = 0; i < 16; i++) {
    const [color, r] = blobs[i % blobs.length];
    const x = Math.random() * W;
    const y = H * (0.2 + Math.random() * 0.6);
    for (const dx of [-W, 0, W]) {
      const gr = g.createRadialGradient(x + dx, y, 0, x + dx, y, r);
      gr.addColorStop(0, color);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(x + dx - r, y - r, r * 2, r * 2);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(200, 32, 16),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false, toneMapped: false }),
  );
  mesh.renderOrder = -10;
  return mesh;
}

/* ------------------------------------------------------------------ fresnel glow */
export function fresnelMaterial(color, intensity = 1, power = 3) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uPower: { value: power },
    },
    vertexShader: `
      varying vec3 vN; varying vec3 vV;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uIntensity; uniform float uPower;
      varying vec3 vN; varying vec3 vV;
      void main(){
        float f = pow(1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0), uPower);
        gl_FragColor = vec4(uColor * f * uIntensity, 1.0);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}
