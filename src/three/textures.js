import * as THREE from 'three';
import { generateWorldPixels } from './texgen.js';

const cache = new Map();

function toTexture({ color, width, height }, srgb) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').putImageData(new ImageData(color, width, height), 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 8;
  return tex;
}

const loadReal = (url, srgb) =>
  new Promise((resolve) => {
    new THREE.TextureLoader().load(
      url,
      (t) => {
        t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        t.anisotropy = 8;
        resolve(t);
      },
      undefined,
      () => resolve(null),
    );
  });

async function build(kind) {
  // 1) If you drop real maps into /public/textures they win automatically:
  //    mars.jpg / moon.jpg   (+ optional mars_normal.jpg / moon_normal.jpg)
  const [realMap, realNormal] = await Promise.all([
    loadReal(`/textures/${kind}.jpg`, true),
    loadReal(`/textures/${kind}_normal.jpg`, false),
  ]);
  if (realMap) return { map: realMap, normalMap: realNormal, procedural: false };

  // 2) Otherwise generate a procedural surface (no files needed)
  const px = await generateWorldPixels(kind, 2048, 1024);
  const map = toTexture({ color: px.color, width: px.width, height: px.height }, true);
  const normalMap = toTexture({ color: px.normal, width: px.width, height: px.height }, false);
  return { map, normalMap, procedural: true };
}

/** Cached promise: textures are shared by the carousel and the planet view. */
export function getWorldTextures(kind) {
  if (!cache.has(kind)) cache.set(kind, build(kind));
  return cache.get(kind);
}
