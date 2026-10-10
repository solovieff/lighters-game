// Test range (Полигон): its own level. No walls of its own, no enemies. The hero stays still and turns the beam.
// Objects stand at REAL distances (metres, ANSI FL1 scale): a wolf at 50 m, the edge of a forest at 200 m.
// The game distance is internal: gameM = realM * RANGE_SCALE (0.02). Labels always show real metres.
// Scene objects are drawn larger than life so they are readable; the distance labels are what matter.
import * as THREE from 'three';
import { RANGE_SCALE } from '../core/config.js';
import { Level } from './Level.js';
import { AABB } from '../physics/Physics.js';

export const RANGE_OBJECTS = [
  { kind: 'wolf', name: 'Волк', realM: 50 },
  { kind: 'forest', name: 'Край леса', realM: 200 },
];

const LENS_OFFSET_M = 0.118;   // head tip offset from the hero's feet point along the beam (Convoy 118 mm)
const BEAM_HEIGHT_M = 0.011;   // beam height above the floor (the head lies on the table)
const TREE_COUNT = 46;
const FOREST_DEPTH_M = 0.45;   // game metres deep (about 22 real m)

/** Seeded random generator so the forest looks the same every time the range starts. */
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** Brightness indicator colour: dark grey when nothing reaches the target, warm white when it is bright. */
function brightnessColor(lux) {
  const k = Math.max(0, Math.min(1, Math.log10(lux + 1e-3) / 2 + 0.5));
  const v = Math.round(40 + k * 215);
  return `rgb(${v}, ${Math.round(v * 0.9)}, ${Math.round(v * 0.7)})`;
}

/** Crouched wolf, stalking, facing the hero (+Z). Built from a few boxes so it reads from far away. */
function buildWolf(root, z) {
  const fur = new THREE.MeshStandardMaterial({ color: '#4a4c52', roughness: 0.95 });
  const eyes = new THREE.MeshBasicMaterial({ color: '#ffd45a', toneMapped: false });
  const g = new THREE.Group();
  const part = (geo, mat, x, y, zz) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, zz);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  part(new THREE.BoxGeometry(0.11, 0.045, 0.2), fur, 0, 0.025, 0);        // body, low and crouched
  part(new THREE.BoxGeometry(0.07, 0.05, 0.08), fur, 0, 0.035, 0.13);     // head, forward
  part(new THREE.BoxGeometry(0.04, 0.03, 0.05), fur, 0, 0.03, 0.18);      // snout
  part(new THREE.BoxGeometry(0.03, 0.02, 0.09), fur, 0, 0.03, -0.14).rotation.x = -0.35; // tail
  for (const sx of [-1, 1]) {
    part(new THREE.ConeGeometry(0.012, 0.03, 6), fur, sx * 0.02, 0.065, 0.12);          // ears
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), eyes);
    eye.position.set(sx * 0.025, 0.045, 0.18);
    g.add(eye);
  }
  g.position.set(0, 0, z);
  root.add(g);
  return g;
}

export class RangeLevel extends Level {
  /**
   * @param {THREE.Scene} scene
   * @param {{x:number,z:number}} heroStart where the hero stands (feet point)
   * @param {object} spec the hero's flashlight spec (the range does not decide what the hero carries)
   */
  constructor(scene, heroStart, spec) {
    super(scene, { objects: RANGE_OBJECTS }, spec);
    this.root = new THREE.Group();
    scene.add(this.root);
    this.targets = [];
    this.lux = () => 0;   // (point) => lux, set by main.js each frame

    // Floor: plain dark board.
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(heroStart.x + 4, 0, heroStart.z);
    floor.receiveShadow = true;
    this.root.add(floor);

    // Distances are measured from the lens, not from the feet: the beam starts there.
    const lensZ = heroStart.z - LENS_OFFSET_M;
    const x = heroStart.x;

    // Wolf at 50 m: a stalking wolf on the beam axis.
    const wolfGame = RANGE_OBJECTS[0].realM * RANGE_SCALE;
    buildWolf(this.root, lensZ - wolfGame);
    this.addTarget(RANGE_OBJECTS[0], x, lensZ - wolfGame, 0.12);

    // Forest from 200 m: the edge is the labelled point, trunks start just behind it and block the beam.
    const forestEdgeGame = RANGE_OBJECTS[1].realM * RANGE_SCALE;
    this.buildForest(x, lensZ - forestEdgeGame - 0.05, FOREST_DEPTH_M);
    this.addTarget(RANGE_OBJECTS[1], x, lensZ - forestEdgeGame, 0.14);
  }

  /** A forest belt: dark trunks with crowns. Trunks are colliders, so they block the beam. */
  buildForest(x0, zStart, depth) {
    const rand = seeded(7);
    const bark = new THREE.MeshStandardMaterial({ color: '#2a1f16', roughness: 1 });
    const leaves = new THREE.MeshStandardMaterial({ color: '#1a2a1d', roughness: 0.9 });
    for (let i = 0; i < TREE_COUNT; i++) {
      const x = x0 + (rand() - 0.5) * 3.0;
      const z = zStart - rand() * depth;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.1, 6), bark);
      trunk.position.set(x, 0.05, z);
      trunk.castShadow = true;
      this.root.add(trunk);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 7), leaves);
      crown.position.set(x, 0.18, z);
      crown.castShadow = true;
      this.root.add(crown);
      this.colliders.push(AABB.fromCenterSize(x, 0.05, z, 0.02, 0.1, 0.02));
    }
  }

  /** A target: a point at beam height on the object, plus a DOM label in real metres. */
  addTarget(obj, x, z, labelHeight) {
    const label = document.createElement('div');
    Object.assign(label.style, {
      position: 'fixed', transform: 'translate(-50%, -100%)', pointerEvents: 'none', display: 'none',
      textAlign: 'center', whiteSpace: 'nowrap', fontFamily: 'Red Hat Display, system-ui, sans-serif',
    });
    label.innerHTML = `
      <div class="rl-name" style="font-size:15px;color:#a9a396;letter-spacing:2px;text-transform:uppercase"></div>
      <div class="rl-dist" style="font-size:30px;color:#ffe9c8;text-shadow:0 0 10px rgba(0,0,0,0.9)"></div>
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:4px">
        <span class="rl-dot" style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#000;box-shadow:0 0 0 1px #555"></span>
        <span class="rl-lux" style="font-size:13px;color:#a9a396"></span>
      </div>`;
    document.body.appendChild(label);
    this.targets.push({
      name: obj.name,
      realM: obj.realM,
      pos: new THREE.Vector3(x, BEAM_HEIGHT_M, z),          // lux is measured here, on the beam
      anchor: new THREE.Vector3(x, labelHeight, z),          // label sits above the object
      label,
      parts: {
        name: label.querySelector('.rl-name'),
        dist: label.querySelector('.rl-dist'),
        dot: label.querySelector('.rl-dot'),
        lux: label.querySelector('.rl-lux'),
      },
      lux: 0,
    });
    this.targets[this.targets.length - 1].parts.name.textContent = obj.name;
    this.targets[this.targets.length - 1].parts.dist.textContent = `${obj.realM} м`;
  }

  /** Same contract as Level. The range is a shooting bench: the hero only turns the beam. */
  get allowsMovement() {
    return false;
  }

  update(dt, heroPos, power, camera) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const v = new THREE.Vector3();
    for (const t of this.targets) {
      t.lux = this.lux(t.pos);
      v.copy(t.anchor).project(camera);
      const on = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      t.label.style.display = on ? 'block' : 'none';
      if (!on) continue;
      t.label.style.left = `${(v.x * 0.5 + 0.5) * width}px`;
      t.label.style.top = `${(-v.y * 0.5 + 0.5) * height}px`;
      t.parts.dot.style.background = brightnessColor(t.lux);
      t.parts.dot.style.boxShadow = `0 0 ${Math.min(18, 2 + t.lux * 4)}px ${brightnessColor(t.lux)}`;
      t.parts.lux.textContent = `${t.lux.toFixed(2)} лк`;
    }
  }

  bossInfo() {
    return null;
  }

  atExit() {
    return false;
  }

  dispose() {
    this.scene.remove(this.root);
    for (const t of this.targets) t.label.remove();
  }
}
