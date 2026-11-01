import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { bodies, toolsOfBody, yearRange } from '../data';
import { go, nav } from '../router';
import { createRenderer, startLoop, observeSize, disposeObject, destroyRenderer, createStars, createNebula } from '../three/core.js';
import { getWorldTextures } from '../three/textures.js';
import { createRockyWorld, createHeliosphere } from '../three/worlds.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const BASE_RADIUS = 1.5;

export default function PlanetCarousel() {
  const mountRef = useRef(null);
  const apiRef = useRef({ goTo() {}, enter() {} });
  const startIndex = Math.max(0, bodies.findIndex((b) => b.id === nav.lastBody));
  const [index, setIndex] = useState(startIndex);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const container = mountRef.current;
    const n = bodies.length;
    let disposed = false;
    const renderer = createRenderer(container);
    const canvas = renderer.domElement;
    canvas.style.touchAction = 'pan-y';
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 600);
    camera.position.set(0, 0, 10);

    // backdrop (3 star layers that drift at different speeds = parallax)
    scene.add(createNebula());
    const layers = [
      { obj: createStars({ count: 1400, radius: 70, size: 0.55 }), k: 0.07 },
      { obj: createStars({ count: 700, radius: 55, size: 0.9, opacity: 0.8 }), k: 0.13 },
      { obj: createStars({ count: 220, radius: 42, size: 1.5, opacity: 0.9 }), k: 0.22 },
    ];
    layers.forEach((l) => scene.add(l.obj));

    // lights
    const sun = new THREE.DirectionalLight(0xfff2e0, 3.0);
    sun.position.set(-4, 3, 6);
    scene.add(sun, new THREE.AmbientLight(0x4a5a90, 0.35));
    const back = new THREE.DirectionalLight(0x6a8cff, 0.9);
    back.position.set(5, 1, -6);
    scene.add(back);

    const state = { target: startIndex, progress: startIndex, current: startIndex, hover: -1 };
    const items = []; // {pivot, world, reveal}
    const size = { w: 1, h: 1 };

    (async () => {
      for (const body of bodies) {
        let world;
        if (body.kind === 'deep') {
          world = createHeliosphere(BASE_RADIUS * 1.1, toolsOfBody(body.id), { heads: true });
        } else {
          const tex = await getWorldTextures(body.kind === 'planet' ? 'mars' : 'moon');
          if (disposed) return;
          world = createRockyWorld(body.kind === 'planet' ? 'mars' : 'moon', BASE_RADIUS * (body.id === 'moon' ? 0.92 : 1), tex);
        }
        const pivot = new THREE.Group();
        const spin = new THREE.Group();
        spin.add(world.group);
        pivot.add(spin);
        pivot.rotation.z = body.kind === 'deep' ? 0 : world.tilt;
        if (body.kind === 'deep') pivot.rotation.x = 0.45;
        pivot.scale.setScalar(0.001);
        scene.add(pivot);
        items.push({ pivot, spin, world, reveal: 0, body });
      }
      if (!disposed) setLoading(false);
    })();

    // ---------- layout ----------
    const layout = (dt, t) => {
      const fov = THREE.MathUtils.degToRad(camera.fov);
      const visH = 2 * Math.tan(fov / 2) * camera.position.z;
      const visW = visH * (size.w / size.h);
      const spacing = clamp(visW * 0.36, 3.6, 7.6);
      const base = Math.min(1.05, (visW * 0.6) / 3.2);
      items.forEach((it, i) => {
        const d = i - state.progress;
        const ad = Math.abs(d);
        const k = Math.min(ad, 1.6);
        it.reveal = Math.min(1, it.reveal + dt * 1.1);
        const ease = 1 - Math.pow(1 - it.reveal, 3);
        const hov = state.hover === i ? 1.035 : 1;
        it.pivot.position.set(d * spacing * (1 - 0.08 * Math.min(ad, 1)), 0.62 - 0.15 * k, -k * 2.4);
        it.pivot.scale.setScalar(Math.max(0.001, base * (1 - 0.3 * Math.min(ad, 1.6)) * ease * hov));
        it.world.setDim(1 - 0.62 * Math.min(ad, 1));
        it.spin.rotation.y += dt * (0.07 + (ad < 0.5 ? 0.02 : 0));
        it.world.update(dt, t);
      });
      layers.forEach((l, i) => { l.obj.rotation.y = state.progress * l.k + t * 0.002 * (i + 1); });
    };

    // ---------- navigation ----------
    const goTo = (i) => { state.target = clamp(Math.round(i), 0, n - 1); };
    const enter = (i = Math.round(state.target)) => {
      nav.lastBody = bodies[i].id;
      go(`/body/${bodies[i].id}`);
    };
    apiRef.current = { goTo, enter };

    // wheel: one notch of intent = one world (with a lock so trackpad inertia doesn't skip)
    let acc = 0, lock = false, accTimer = 0;
    const onWheel = (e) => {
      e.preventDefault();
      if (lock) return;
      acc += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      clearTimeout(accTimer);
      accTimer = setTimeout(() => { acc = 0; }, 180);
      if (Math.abs(acc) > 40) {
        goTo(state.target + Math.sign(acc));
        acc = 0; lock = true;
        setTimeout(() => { lock = false; }, 520);
      }
    };

    // drag / swipe
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pick = (e) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(items.map((it) => it.world.pickMesh), false);
      if (!hits.length) return -1;
      return items.findIndex((it) => it.world.pickMesh === hits[0].object);
    };
    let down = null;
    const onDown = (e) => {
      down = { x: e.clientX, y: e.clientY, start: state.target, moved: false, lastX: e.clientX, lastT: performance.now(), v: 0 };
      canvas.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e) => {
      if (down) {
        const dx = e.clientX - down.x;
        if (Math.abs(dx) > 7 || Math.abs(e.clientY - down.y) > 7) down.moved = true;
        if (down.moved) {
          const unit = Math.max(260, size.w * 0.28);
          state.target = clamp(down.start - dx / unit, -0.25, n - 0.75);
          const now = performance.now();
          down.v = 0.8 * down.v + 0.2 * ((e.clientX - down.lastX) / Math.max(1, now - down.lastT));
          down.lastX = e.clientX; down.lastT = now;
        }
        return;
      }
      state.hover = pick(e);
      canvas.style.cursor = state.hover >= 0 ? 'pointer' : 'default';
    };
    const onUp = (e) => {
      if (!down) return;
      const d = down; down = null;
      if (!d.moved) {
        const i = pick(e);
        if (i >= 0) (i === Math.round(state.target) ? enter(i) : goTo(i));
      } else {
        const unit = Math.max(260, size.w * 0.28);
        goTo(state.target - (d.v * 250) / unit);
      }
    };
    const onLeave = () => { state.hover = -1; };
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(state.target + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goTo(state.target - 1);
      else if (e.key === 'Enter') enter();
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointerleave', onLeave);
    window.addEventListener('keydown', onKey);

    const stopSize = observeSize(container, (w, h) => {
      size.w = w; size.h = h;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    size.w = container.clientWidth || 1; size.h = container.clientHeight || 1;
    camera.aspect = size.w / size.h; camera.updateProjectionMatrix();

    const stopLoop = startLoop((dt, t) => {
      state.progress += (state.target - state.progress) * (1 - Math.exp(-dt * 5.5));
      const cur = clamp(Math.round(state.target), 0, n - 1);
      if (cur !== state.current) { state.current = cur; setIndex(cur); }
      layout(dt, t);
      renderer.render(scene, camera);
    });

    return () => {
      disposed = true;
      stopLoop();
      stopSize();
      clearTimeout(accTimer);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('keydown', onKey);
      disposeObject(scene);
      destroyRenderer(renderer, container);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const body = bodies[index];
  const count = toolsOfBody(body.id).length;

  return (
    <div className="screen carousel">
      <div ref={mountRef} className="canvas-host" />

      <div className="overlay">
        <header className="brand">
          <span className="eyebrow">NASA Space Apps Challenge 2026</span>
          <h1>Abandoned <em>but not</em> Forgotten</h1>
        </header>

        <button className="nav-arrow left" onClick={() => apiRef.current.goTo(index - 1)} disabled={index === 0} aria-label="Previous world">‹</button>
        <button className="nav-arrow right" onClick={() => apiRef.current.goTo(index + 1)} disabled={index === bodies.length - 1} aria-label="Next world">›</button>

        <section className="world-info" key={body.id}>
          <span className="eyebrow">World {String(index + 1).padStart(2, '0')} / {String(bodies.length).padStart(2, '0')} · {body.kindLabel}</span>
          <h2>{body.name}</h2>
          <p className="tagline">{body.tagline}</p>
          <div className="chips">
            <span className="chip"><b>{count}</b> {count === 1 ? 'machine' : 'machines'} left behind</span>
            <span className="chip">{yearRange(body.id)}</span>
          </div>
          <button className="btn primary" onClick={() => apiRef.current.enter(index)}>Explore {body.name} <span aria-hidden>→</span></button>
        </section>

        <nav className="pager" aria-label="Worlds">
          {bodies.map((b, i) => (
            <button key={b.id} className={i === index ? 'on' : ''} onClick={() => apiRef.current.goTo(i)} aria-label={b.name}>
              <span>{b.name}</span>
            </button>
          ))}
        </nav>
        <p className="hint">Scroll · Drag · ← → &nbsp;|&nbsp; Click the world to explore</p>
      </div>

      {loading && (
        <div className="loader"><div className="spinner" /><p>Generating worlds…</p></div>
      )}
    </div>
  );
}
