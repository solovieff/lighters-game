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
  crate: { color: '#7a5a34', roughness: 0.9, metalness: 0.0, metal: false },   // a wooden box: taller than one hop
  // Basement finds: a nail, a battery, a button, a key.
  nail: { color: '#7d7f86', roughness: 0.4, metalness: 0.8, metal: true },
  battery: { color: '#2c5fa8', roughness: 0.5, metalness: 0.2, metal: false },
  button: { color: '#b0303a', roughness: 0.6, metalness: 0.0, metal: false },
  key: { color: '#b89a4e', roughness: 0.35, metalness: 0.9, metal: true },
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

/**
 * Internal partitions (walls inside the drawer): the paperclip maze and the rooms before the exit.
 * Each is an axis-aligned box {x0,x1,z0,z1} in metres, height `h` (default: the wall height).
 */
export function buildPartitions(root, partitions, defaultH, wallMat) {
  const mat = wallMat || getWoodMaterial();
  const colliders = [];
  for (const p of partitions || []) {
    const h = p.h ?? defaultH;
    const sx = p.x1 - p.x0;
    const sz = p.z1 - p.z0;
    const cx = (p.x0 + p.x1) / 2;
    const cz = (p.z0 + p.z1) / 2;
    const mesh = addMesh(root, new THREE.BoxGeometry(sx, h, sz), mat, cx, h / 2, cz);
    const col = collider(cx, h / 2, cz, sx, h, sz, false);
    colliders.push(col);
    if (p.gate) {
      // A gate panel: it stays a wall until opened, then both its mesh and its collider go away.
      mesh.name = 'gate';
      mesh.userData.collider = col;
    }
  }
  return colliders;
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
export function buildWalls(root, data, wallMat) {
  const { minX, maxX, halfZ } = data.bounds;
  const h = data.wallHeight;
  const t = data.wallThickness;
  const mat = wallMat || getWoodMaterial();
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
      const pencilCollider = collider(p.x, r, p.z, 2 * r, 2 * r, len, style.metal);
      colliders.push(pencilCollider);
      body.userData.collider = pencilCollider;   // removed from the colliders together with the mesh
      // Eraser on the END of the pencil, on top (+Y). The pencil lies along Z: its end is at p.z ± len/2.
      const endZ = p.z + (p.eraserEnd === 'neg' ? -len / 2 + 0.04 : len / 2 - 0.04);
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.08, 0.08),
        propMaterial('eraser')
      );
      cap.position.set(p.x, r * 2 + 0.04, endZ);
      cap.name = 'pencil-eraser';
      cap.userData.collider = pencilCollider;
      root.add(cap);
    } else if (p.kind === 'crate') {
      // A box higher than the hop (0.18 m), so the hero cannot fly over it: only the mouse can clear the way.
      const w = p.w ?? 0.16, h = p.h ?? 0.25, d = p.d ?? 0.16;
      const crate = addMesh(root, new THREE.BoxGeometry(w, h, d), mat, p.x, h / 2, p.z);
      crate.name = 'crate';
      const crateCollider = collider(p.x, h / 2, p.z, w, h, d, style.metal);
      colliders.push(crateCollider);
      crate.userData.collider = crateCollider;
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
    } else if (p.kind === 'nail') {
      // A long thin nail lying flat: a thin strip along X.
      addMesh(root, new THREE.CylinderGeometry(0.008, 0.008, 0.18, 8), mat, p.x, 0.008, p.z, Math.PI / 2);
      colliders.push(collider(p.x, 0.008, p.z, 0.18, 0.016, 0.016, style.metal));
    } else if (p.kind === 'battery') {
      // A AA battery lying on its side: a short cylinder along X.
      addMesh(root, new THREE.CylinderGeometry(0.025, 0.025, 0.05, 16), mat, p.x, 0.025, p.z, Math.PI / 2);
      colliders.push(collider(p.x, 0.025, p.z, 0.05, 0.05, 0.05, style.metal));
    } else if (p.kind === 'button') {
      // A small round button, flat on the floor.
      addMesh(root, new THREE.CylinderGeometry(0.025, 0.025, 0.012, 16), mat, p.x, 0.006, p.z);
      colliders.push(collider(p.x, 0.006, p.z, 0.05, 0.012, 0.05, style.metal));
    } else if (p.kind === 'key') {
      // A key: a flat bar with a round head at one end.
      addMesh(root, new THREE.BoxGeometry(0.1, 0.008, 0.02), mat, p.x, 0.004, p.z);
      addMesh(root, new THREE.CylinderGeometry(0.018, 0.018, 0.008, 12), mat, p.x - 0.06, 0.004, p.z);
      colliders.push(collider(p.x, 0.004, p.z, 0.12, 0.008, 0.04, style.metal));
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
export function buildExit(root, x, z, halfZ, hole = null) {
  const mat = new THREE.MeshStandardMaterial({
    color: '#222222', emissive: '#ffd27a', emissiveIntensity: 0, roughness: 0.5,
  });
  // Far-end door (no hole): a thin glowing panel along the end wall.
  if (!hole) addMesh(root, new THREE.BoxGeometry(0.04, 0.2, halfZ * 2), mat, x, 0.1, z);
  // Hole in the wall: a dark gap at the given z; it glows once open.
  else addMesh(root, new THREE.BoxGeometry(0.04, 0.2, 0.3), mat, x, 0.1, hole.z);
  const glow = new THREE.PointLight('#ffd27a', 0, 0.8, 2);
  glow.position.set(x - 0.05, 0.12, hole ? hole.z : z);
  root.add(glow);
  return {
    open() {
      mat.emissiveIntensity = 2.0;
      glow.intensity = 0.4;
    },
  };
}
