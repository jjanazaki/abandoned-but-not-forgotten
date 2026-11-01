import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { getBody, toolsOfBody, yearRange, STATUS_TONE } from '../data';
import { go, nav } from '../router';
import { createRenderer, startLoop, observeSize, disposeObject, destroyRenderer, createStars, createNebula } from '../three/core.js';
import { getWorldTextures } from '../three/textures.js';
import { createRockyWorld, createHeliosphere } from '../three/worlds.js';
import { createMarker, latLonToVector3 } from '../three/markers.js';

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export default function PlanetView({ bodyId }) {
  const body = getBody(bodyId);
  const list = toolsOfBody(bodyId);
  const mountRef = useRef(null);
  const tipRef = useRef(null);
  const apiRef = useRef({ flyTo() {} });
  const hoverRef = useRef(null);
  const [hoverId, setHoverId] = useState(null);
  const [loading, setLoading] = useState(true);
  const hoverTool = list.find((t) => t.id === hoverId);

  useEffect(() => { nav.lastBody = bodyId; }, [bodyId]);
  useEffect(() => { hoverRef.current = hoverId; }, [hoverId]);

  useEffect(() => {
    const container = mountRef.current;
    const isDeep = body.kind === 'deep';
    const R = isDeep ? 3.6 : 2;
    let disposed = false;
    const renderer = createRenderer(container);
    const canvas = renderer.domElement;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 800);
    camera.position.set(0, R * 0.7, R * (isDeep ? 3.3 : 3.7));
    scene.add(camera);
    scene.add(createNebula());
    scene.add(createStars({ count: 1600, radius: 80, size: 0.6 }), createStars({ count: 260, radius: 60, size: 1.4 }));

    // light follows the camera, so whatever side you look at is readable
    scene.add(new THREE.AmbientLight(0x5a6aa0, 0.45));
    const key = new THREE.DirectionalLight(0xfff0dc, 3.1);
    key.position.set(-3, 2.5, 4);
    camera.add(key);
    key.target.position.set(0, 0, 0);
    scene.add(key.target);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.75;
    controls.minDistance = isDeep ? R * 0.4 : R * 1.22;
    controls.maxDistance = R * 7;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.45;
    let autoOn = true;
    let resume = 0;
    controls.addEventListener('start', () => { autoOn = false; clearTimeout(resume); fly = null; });
    controls.addEventListener('end', () => { resume = setTimeout(() => { autoOn = true; }, 5000); });

    const markers = new Map();
    let world = null;
    let occluders = [];
    const hits = [];
    const size = { w: 1, h: 1 };

    const applyOffset = () => {
      // shift the world into the free area beside the info panel
      const panelW = size.w > 900 ? 380 : 0;
      const panelH = size.w > 900 ? 0 : 150;
      camera.setViewOffset(size.w, size.h, panelW / 2, panelH / 2, size.w, size.h);
    };

    (async () => {
      if (isDeep) {
        world = createHeliosphere(R, list, { heads: false });
      } else {
        const tex = await getWorldTextures(body.kind === 'planet' ? 'mars' : 'moon');
        if (disposed) return;
        world = createRockyWorld(body.kind === 'planet' ? 'mars' : 'moon', R, tex);
      }
      scene.add(world.group);
      occluders = isDeep ? [] : [world.pickMesh];
      list.forEach((tool) => {
        let pos = null;
        if (isDeep) pos = world.positions.get(tool.id);
        else if (tool.location.coordinates) pos = latLonToVector3(tool.location.coordinates.latitude, tool.location.coordinates.longitude, R * 1.012);
        if (!pos) return;
        const m = createMarker(tool.id);
        m.position.copy(pos);
        world.group.add(m);
        markers.set(tool.id, m);
        hits.push(m.userData.hit);
      });
      setLoading(false);
    })();

    // ---------- picking ----------
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pick = (e) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const res = ray.intersectObjects([...occluders, ...hits], false);
      return res.length && res[0].object.userData.toolId ? res[0].object.userData.toolId : null;
    };
    let down = null;
    const onDown = (e) => { down = { x: e.clientX, y: e.clientY }; };
    const onMove = (e) => {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      const id = pick(e);
      canvas.style.cursor = id ? 'pointer' : 'grab';
      if (id !== hoverRef.current) { hoverRef.current = id; setHoverId(id); }
    };
    const onUp = (e) => {
      const d = down; down = null;
      if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) return;
      const id = pick(e);
      if (id) go(`/tool/${id}`);
    };
    canvas.style.cursor = 'grab';
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    // ---------- fly camera to a marker ----------
    let fly = null;
    apiRef.current.flyTo = (id) => {
      const m = markers.get(id);
      if (!m) return;
      autoOn = false; clearTimeout(resume);
      resume = setTimeout(() => { autoOn = true; }, 9000);
      const toDir = m.position.clone().normalize();
      fly = {
        t: 0, dur: 1.15,
        from: camera.position.clone().normalize(),
        to: toDir,
        fromDist: camera.position.length(),
        toDist: isDeep ? R * 1.9 : Math.min(camera.position.length(), R * 2.7),
      };
    };

    const stopSize = observeSize(container, (w, h) => {
      size.w = w; size.h = h;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      applyOffset();
      camera.updateProjectionMatrix();
    });
    size.w = container.clientWidth || 1; size.h = container.clientHeight || 1;
    camera.aspect = size.w / size.h; applyOffset(); camera.updateProjectionMatrix();

    const tmp = new THREE.Vector3();
    const tmpN = new THREE.Vector3();
    const stopLoop = startLoop((dt, t) => {
      if (fly) {
        fly.t += dt / fly.dur;
        const e = easeInOut(Math.min(1, fly.t));
        const q = new THREE.Quaternion().setFromUnitVectors(fly.from, fly.to);
        const qi = new THREE.Quaternion().slerp(q, e);
        camera.position.copy(fly.from).applyQuaternion(qi).multiplyScalar(THREE.MathUtils.lerp(fly.fromDist, fly.toDist, e));
        if (fly.t >= 1) fly = null;
      }
      controls.autoRotate = autoOn && !fly && !hoverRef.current;
      controls.update();
      world?.update(dt, t);
      markers.forEach((m, id) => {
        m.userData.hotTarget = id === hoverRef.current ? 1 : 0;
        m.userData.update(t, dt);
      });

      // floating label for the hovered marker
      const tip = tipRef.current;
      const m = hoverRef.current && markers.get(hoverRef.current);
      if (tip) {
        if (m) {
          m.getWorldPosition(tmp);
          const facing = isDeep || tmpN.copy(tmp).normalize().dot(camera.position.clone().sub(tmp).normalize()) > 0.02;
          tmp.project(camera);
          const px = (tmp.x * 0.5 + 0.5) * size.w;
          const py = (-tmp.y * 0.5 + 0.5) * size.h;
          tip.style.transform = `translate(${px}px, ${py}px) translate(-50%, -150%)`;
          tip.style.opacity = facing ? 1 : 0;
        } else tip.style.opacity = 0;
      }
      renderer.render(scene, camera);
    });

    return () => {
      disposed = true;
      stopLoop();
      stopSize();
      clearTimeout(resume);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      controls.dispose();
      disposeObject(scene);
      destroyRenderer(renderer, container);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyId]);

  return (
    <div className="screen planet-view">
      <div ref={mountRef} className="canvas-host" />

      <div className="overlay">
        <button className="btn ghost back" onClick={() => go('/')}><span aria-hidden>←</span> All worlds</button>

        <div className="tip" ref={tipRef} style={{ opacity: 0 }}>
          {hoverTool && (
            <>
              <b>{hoverTool.shortName}</b>
              <span>{hoverTool.dates.launchYear} · {hoverTool.category}</span>
              <i>Click to open</i>
            </>
          )}
        </div>

        <aside className="side-panel">
          <div className="panel-head">
            <span className="eyebrow">{body.kindLabel}</span>
            <h2>{body.name}</h2>
            <p>{body.description}</p>
            <div className="chips">
              <span className="chip"><b>{list.length}</b> {list.length === 1 ? 'machine' : 'machines'}</span>
              <span className="chip">{yearRange(bodyId)}</span>
            </div>
          </div>

          {body.overview && (
            <details className="overview">
              <summary>{body.overview.title}</summary>
              <p>{body.overview.summary}</p>
              <dl>
                {body.overview.facts.map((f) => (
                  <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>
                ))}
              </dl>
            </details>
          )}
          {body.kind === 'deep' && (
            <p className="note">Schematic view — distances use a logarithmic scale, directions are approximate.</p>
          )}

          <h3 className="panel-sub">Tap a <span className="dot-inline" /> blue dot, or pick from the list</h3>
          <ul className="tool-list">
            {list.map((t) => (
              <li
                key={t.id}
                className={hoverId === t.id ? 'on' : ''}
                onMouseEnter={() => setHoverId(t.id)}
                onMouseLeave={() => setHoverId(null)}
              >
                <button className="tool-main" onClick={() => apiRef.current.flyTo(t.id)}>
                  <span className="pulse" />
                  <span className="tool-text">
                    <b>{t.shortName}</b>
                    <small>{t.category} · {t.dates.launchYear}</small>
                  </span>
                  <span className={`badge ${STATUS_TONE[t.status.state]}`}>{t.status.label}</span>
                </button>
                <button className="tool-open" onClick={() => go(`/tool/${t.id}`)} aria-label={`Open ${t.shortName}`}>→</button>
              </li>
            ))}
          </ul>
        </aside>

        <p className="hint">Drag to rotate · Scroll / pinch to zoom</p>
      </div>

      {loading && <div className="loader"><div className="spinner" /><p>Preparing {body.name}…</p></div>}
    </div>
  );
}
