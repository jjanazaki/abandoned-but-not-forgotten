import * as THREE from 'three';
import { glowTexture, dotTexture, ringTexture } from './core.js';

/** Geographic position -> point on a sphere. Longitude is EAST positive (matches the texture generator). */
export function latLonToVector3(lat, lon, radius, out = new THREE.Vector3()) {
  const p = THREE.MathUtils.degToRad(lat);
  const l = THREE.MathUtils.degToRad(lon);
  return out.set(radius * Math.cos(p) * Math.cos(l), radius * Math.sin(p), -radius * Math.cos(p) * Math.sin(l));
}

/**
 * A glowing, pulsing blue dot. Sprites use sizeAttenuation:false so the dot keeps the same
 * size on screen however far you zoom, and stay easy to click.
 */
export function createMarker(toolId, color = 0x35b7ff) {
  const group = new THREE.Group();
  const make = (tex, color_, opacity, blending = THREE.AdditiveBlending) =>
    new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex, color: color_, transparent: true, opacity, depthWrite: false,
        blending, sizeAttenuation: false, toneMapped: false,
      }),
    );
  const glow = make(glowTexture(), color, 0.95);
  const core = make(dotTexture(), 0xd8f2ff, 1, THREE.NormalBlending);
  const ring1 = make(ringTexture(), color, 0.8);
  const ring2 = make(ringTexture(), color, 0.8);
  glow.userData.toolId = toolId; // the biggest sprite is the click target
  group.add(glow, ring1, ring2, core);

  const u = { toolId, hit: glow, hot: 0, hotTarget: 0, phase: Math.random() * 6 };
  group.userData = u;
  group.userData.update = (t, dt) => {
    u.hot += (u.hotTarget - u.hot) * Math.min(1, dt * 10);
    const k = 1 + u.hot * 0.75;
    glow.scale.setScalar(0.05 * k * (1 + 0.1 * Math.sin(t * 3 + u.phase)));
    core.scale.setScalar(0.013 * k);
    [ring1, ring2].forEach((r, i) => {
      const p = (t * 0.6 + u.phase + i * 0.5) % 1;
      r.scale.setScalar((0.018 + p * 0.055) * k);
      r.material.opacity = (1 - p) * 0.85;
    });
  };
  group.userData.update(0, 0);
  return group;
}
