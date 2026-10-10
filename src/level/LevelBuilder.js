// Procedural drawer walls, props and exit. Every prop gets an AABB for collisions and a `metal` flag (magnets come later).
import * as THREE from 'three';
import { AABB } from '../physics/Physics.js';
import { createWoodTexture } from '../assets/Textures.js';

// Prop looks and metal flag. Pencils, erasers, paper, coins, ruler, clip.
const PROP_STYLE = {
  pencil: { color: '#d9b52a', roughness: 0.45, metalness: 0.0, metal: false },
  eraser: { color: '#e58fa0', roughness: 0.9, metalness: 0.0, metal: false },
  coin: { color: '#c9a227', roughness: 0.3, metalness: 0.9, metal: true },
  paper: { color: '#d8d3c0', roughness: 0.95, metalness: 0.0, metal: false },
  ruler: { color: '#9aa0a8', roughness: 0.3, metalness: 0.9, metal: true },
  clip: { color: '#b8bec8', roughness: 0.3, metalness: 0.9, metal: true },
};

const propMats = {};
let woodMat = null;

function propMaterial(kind) {
  if (!propMats[kind]) {
    const s = PROP_STYLE[kind];
    propMats[kind] = new THREE.MeshStandardMaterial({
      color: s.color, roughness: s.roughness, metalness: s.metalness,
    });
  }
  return propMats[kind];
}

function getWoodMaterial() {
  if (!woodMat) {
    const tex = createWoodTexture(256);
    tex.repeat.set(2, 2);
    woodMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
  }
  return woodMat;
}

/** Collider box with the metal flag set. */
function collider(cx, cy, cz, sx, sy, sz, metal) {
  const box = AABB.fromCenterSize(cx, cy, cz, sx, sy, sz);
  box.metal = metal;
  return box;
}

/** Adds a mesh (shadow caster) to the root. */
function addMesh(root, geo, mat, x, y, z, rotX = 0) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.x = rotX;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  root.add(mesh);
  return mesh;
}

/**
 * Walls of the drawer: two long sides and the left end. The right end is the exit (no collider).
 * @returns {AABB[]}
 */
export function buildWalls(root, data) {
  const { minX, maxX, halfZ } = data.bounds;
  const h = data.wallHeight;
  const t = data.wallThickness;
  const mat = getWoodMaterial();
  const len = maxX - minX + 0.2;
  const cx = (minX + maxX) / 2;
  const colliders = [];

  for (const side of [-1, 1]) {
    const z = side * (halfZ + t / 2);
    addMesh(root, new THREE.BoxGeometry(len, h, t), mat, cx, h / 2, z);
    colliders.push(collider(cx, h / 2, z, len, h, t, false));
  }
  // Left end wall stops the hero at the start.
  addMesh(root, new THREE.BoxGeometry(t, h, halfZ * 2), mat, minX - t / 2, h / 2, 0);
  colliders.push(collider(minX - t / 2, h / 2, 0, t, h, halfZ * 2, false));
  return colliders;
}

/**
 * Props from the level data. Pencils lie across the lane (along Z), coins are stacked discs.
 * @returns {AABB[]}
 */
export function buildProps(root, props) {
  const colliders = [];
  for (const p of props) {
    const style = PROP_STYLE[p.kind];
    if (!style) throw new Error(`unknown prop kind: ${p.kind}`);
    const mat = propMaterial(p.kind);

    if (p.kind === 'pencil') {
      const r = 0.07;
      const len = 1.2;
      const body = addMesh(root, new THREE.CylinderGeometry(r, r, len, 16), mat, p.x, r, p.z, Math.PI / 2);
      body.name = 'pencil';   // the mouse quest finds and hides this when it is eaten
      colliders.push(collider(p.x, r, p.z, 2 * r, 2 * r, len, style.metal));
      // Eraser cap on one end of the pencil (the end is at z = p.z ± len/2).
      const endZ = p.z + (p.eraserEnd === 'neg' ? -len / 2 - 0.04 : len / 2 + 0.04);
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.08, 16),
        propMaterial('eraser')
      );
      cap.rotation.z = Math.PI / 2;
      cap.position.set(p.x, r, endZ);
      cap.name = 'pencil-eraser';
      root.add(cap);
    } else if (p.kind === 'coin') {
      const r = 0.12;
      const hgt = 0.05;
      for (let i = 0; i < (p.count || 1); i++) {
        const y = hgt / 2 + i * hgt;
        addMesh(root, new THREE.CylinderGeometry(r, r, hgt, 24), mat, p.x, y, p.z);
        colliders.push(collider(p.x, y, p.z, 2 * r, hgt, 2 * r, style.metal));
      }
    } else if (p.kind === 'eraser') {
      addMesh(root, new THREE.BoxGeometry(0.12, 0.06, 0.1), mat, p.x, 0.03, p.z);
      colliders.push(collider(p.x, 0.03, p.z, 0.12, 0.06, 0.1, style.metal));
    } else if (p.kind === 'paper') {
      addMesh(root, new THREE.BoxGeometry(0.3, 0.12, 0.3), mat, p.x, 0.06, p.z);
      colliders.push(collider(p.x, 0.06, p.z, 0.3, 0.12, 0.3, style.metal));
    } else if (p.kind === 'ruler') {
      addMesh(root, new THREE.BoxGeometry(0.3, 0.02, 0.05), mat, p.x, 0.01, p.z);
      colliders.push(collider(p.x, 0.01, p.z, 0.3, 0.02, 0.05, style.metal));
    } else if (p.kind === 'clip') {
      addMesh(root, new THREE.BoxGeometry(0.02, 0.01, 0.06), mat, p.x, 0.005, p.z);
      colliders.push(collider(p.x, 0.005, p.z, 0.02, 0.01, 0.06, style.metal));
    }
  }
  return colliders;
}

/**
 * Exit door on the far end of the drawer. Dark until opened, then it glows.
 * @returns {{ open(): void }}
 */
export function buildExit(root, x, z, halfZ) {
  const mat = new THREE.MeshStandardMaterial({
    color: '#222222', emissive: '#ffd27a', emissiveIntensity: 0, roughness: 0.5,
  });
  addMesh(root, new THREE.BoxGeometry(0.04, 0.2, halfZ * 2), mat, x, 0.1, z);
  const glow = new THREE.PointLight('#ffd27a', 0, 0.8, 2);
  glow.position.set(x - 0.05, 0.12, z);
  root.add(glow);
  return {
    open() {
      mat.emissiveIntensity = 2.0;
      glow.intensity = 0.4;
    },
  };
}
