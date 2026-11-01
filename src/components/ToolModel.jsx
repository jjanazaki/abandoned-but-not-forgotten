import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createRenderer, startLoop, observeSize, disposeObject, destroyRenderer, glowTexture } from '../three/core.js';
import { buildToolModel } from '../three/models.js';

const TARGET_HALF = 1.7; // every model is scaled so its "fit" size becomes this

/** Rotatable / zoomable 3D model of a tool. Drop /public/models/<tool-id>.glb to override the procedural one. */
export default function ToolModel({ tool }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    let disposed = false;
    const renderer = createRenderer(container, { alpha: true, shadows: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(5.6, 3.3, 6.6);

    // lighting + reflections
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.75;
    scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x2a1d14, 0.5));
    const key = new THREE.DirectionalLight(0xfff1dd, 2.6);
    key.position.set(4, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 20 });
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x6fa8ff, 1.2);
    rim.position.set(-5, 3, -5);
    scene.add(rim);

    // pedestal: glow + rings (+ shadow catcher for ground vehicles)
    const base = new THREE.Group();
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(3.6, 64),
      new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0x2d6cff, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    );
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.002;
    const ringMat = (o) => new THREE.MeshBasicMaterial({ color: 0x56b6ff, transparent: true, opacity: o, side: THREE.DoubleSide, toneMapped: false });
    const ring1 = new THREE.Mesh(new THREE.RingGeometry(2.7, 2.73, 128), ringMat(0.7));
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(3.25, 3.262, 128), ringMat(0.3));
    [ring1, ring2].forEach((r) => { r.rotation.x = -Math.PI / 2; r.position.y = 0.004; });
    base.add(glow, ring1, ring2);
    const catcher = new THREE.Mesh(new THREE.CircleGeometry(7, 48), new THREE.ShadowMaterial({ opacity: 0.38 }));
    catcher.rotation.x = -Math.PI / 2; catcher.receiveShadow = true;
    base.add(catcher);
    scene.add(base);

    // model
    const root = new THREE.Group();
    scene.add(root);
    let updater = null;
    let grounded = true;
    const procedural = buildToolModel(tool);
    grounded = procedural.grounded;
    updater = procedural.update || null;
    const place = (obj, fit, isGrounded) => {
      obj.scale.setScalar(TARGET_HALF / fit);
      root.add(obj);
      root.position.y = isGrounded ? 0 : 1.5;
      catcher.visible = isGrounded;
    };
    place(procedural.group, procedural.fit, grounded);

    // optional real model
    new GLTFLoader().load(
      `/models/${tool.id}.glb`,
      (gltf) => {
        if (disposed) return;
        const obj = gltf.scene;
        obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        const bb = new THREE.Box3().setFromObject(obj);
        const size = bb.getSize(new THREE.Vector3());
        const s = (TARGET_HALF * 2) / Math.max(size.x, size.y, size.z);
        obj.scale.setScalar(s);
        const bb2 = new THREE.Box3().setFromObject(obj);
        const c = bb2.getCenter(new THREE.Vector3());
        obj.position.set(-c.x, grounded ? -bb2.min.y : -c.y, -c.z);
        root.remove(procedural.group);
        disposeObject(procedural.group);
        root.scale.setScalar(1);
        root.add(obj);
        root.position.y = 0;
        updater = null;
      },
      undefined,
      () => {}, // no .glb supplied: keep the procedural model
    );

    // controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, grounded ? 0.95 : 1.5, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.minDistance = 3.2;
    controls.maxDistance = 15;
    controls.maxPolarAngle = grounded ? Math.PI * 0.495 : Math.PI * 0.9;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.1;
    let resume = 0;
    controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(resume); });
    controls.addEventListener('end', () => { resume = setTimeout(() => { controls.autoRotate = true; }, 4500); });
    controls.update();

    const stopSize = observeSize(container, (w, h) => {
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    camera.aspect = (container.clientWidth || 1) / (container.clientHeight || 1);
    camera.updateProjectionMatrix();

    const stopLoop = startLoop((dt, t) => {
      updater?.(dt);
      ring2.rotation.z = t * 0.05;
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      disposed = true;
      clearTimeout(resume);
      stopLoop();
      stopSize();
      controls.dispose();
      disposeObject(scene);
      envTex.dispose();
      pmrem.dispose();
      destroyRenderer(renderer, container);
    };
  }, [tool]);

  return <div ref={mountRef} className="model-canvas" />;
}
