// Test range (Полигон): its own level. No enemies, no hero movement. The hero stays still and turns the beam.
// Objects stand at REAL distances in metres (ANSI FL1 scale): horse 30 m, wolf 50 m, car 100 m, house 150 m,
// forest edge 200 m. The game distance is internal: gameM = realM * RANGE_SCALE (0.02).
// Objects are drawn larger than life so they read on screen; labels always show the real distance.
import * as THREE from 'three';
import { RANGE_SCALE } from '../core/config.js';
import { Level } from './Level.js';
import { AABB } from '../physics/Physics.js';

const LENS_OFFSET_M = 0.118;   // head tip offset from the feet point along the beam (Convoy 118 mm)
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

/** Helper: adds a box mesh to a group at a local position. */
function box(g, w, h, d, mat, x, y, z, rotX = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.x = rotX;
  m.castShadow = true;
  g.add(m);
  return m;
}

/** Wolf, crouched and stalking, facing the hero (+Z). */
function buildWolf(g) {
  const fur = new THREE.MeshStandardMaterial({ color: '#4a4c52', roughness: 0.95 });
  const eyes = new THREE.MeshBasicMaterial({ color: '#ffd45a', toneMapped: false });
  box(g, 0.11, 0.045, 0.2, fur, 0, 0.025, 0);
  box(g, 0.07, 0.05, 0.08, fur, 0, 0.035, 0.13);
  box(g, 0.04, 0.03, 0.05, fur, 0, 0.03, 0.18);
  box(g, 0.03, 0.02, 0.09, fur, 0, 0.03, -0.14, -0.35);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 6), fur);
    ear.position.set(sx * 0.02, 0.065, 0.12);
    g.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), eyes);
    eye.position.set(sx * 0.025, 0.045, 0.18);
    g.add(eye);
  }
}

/** Horse standing side-on, grey-brown, with mane and tail. Long axis along X. */
function buildHorse(g) {
  const coat = new THREE.MeshStandardMaterial({ color: '#6b4a2e', roughness: 0.9 });
  const mane = new THREE.MeshStandardMaterial({ color: '#2a1d12', roughness: 1 });
  box(g, 0.34, 0.14, 0.12, coat, 0, 0.22, 0);            // barrel
  box(g, 0.1, 0.2, 0.08, coat, 0.2, 0.36, 0, -0.5);      // neck
  box(g, 0.13, 0.08, 0.08, coat, 0.27, 0.46, 0);         // head
  box(g, 0.04, 0.12, 0.03, mane, 0.16, 0.42, 0);         // mane
  box(g, 0.03, 0.14, 0.03, mane, -0.2, 0.25, 0, 0.4);    // tail
  for (const [x, z] of [[-0.12, -0.04], [-0.12, 0.04], [0.12, -0.04], [0.12, 0.04]]) {
    box(g, 0.035, 0.22, 0.035, coat, x, 0.11, z);        // legs
  }
}

/** Car, side view, long axis along X. Body, cabin with windows, four wheels. */
function buildCar(g) {
  const paint = new THREE.MeshStandardMaterial({ color: '#7a1f1f', metalness: 0.4, roughness: 0.45 });
  const glass = new THREE.MeshStandardMaterial({ color: '#1c2630', metalness: 0.2, roughness: 0.1 });
  const tyre = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.9 });
  box(g, 0.44, 0.09, 0.2, paint, 0, 0.07, 0);            // lower body
  box(g, 0.24, 0.08, 0.18, paint, -0.02, 0.15, 0);       // cabin
  box(g, 0.2, 0.06, 0.19, glass, -0.02, 0.155, 0);       // windows band
  for (const x of [-0.14, 0.14]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16), tyre);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.045, 0.11);
    g.add(w);
    const w2 = w.clone();
    w2.position.z = -0.11;
    g.add(w2);
  }
}

/** Two-storey house with a lit window and a pitched roof. Front faces the hero. */
function buildHouse(g) {
  const wall = new THREE.MeshStandardMaterial({ color: '#8a7456', roughness: 0.95 });
  const roof = new THREE.MeshStandardMaterial({ color: '#3a2620', roughness: 0.9 });
  const glass = new THREE.MeshStandardMaterial({ color: '#ffcf7a', emissive: '#ffb84a', emissiveIntensity: 0.6 });
  box(g, 0.6, 0.5, 0.5, wall, 0, 0.25, 0);
  const r = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.22, 4), roof);
  r.rotation.y = Math.PI / 4;
  r.position.set(0, 0.61, 0);
  r.castShadow = true;
  g.add(r);
  box(g, 0.1, 0.12, 0.01, glass, -0.14, 0.3, 0.255);     // lit window
  box(g, 0.1, 0.12, 0.01, glass, 0.14, 0.3, 0.255);
  box(g, 0.12, 0.2, 0.01, wall, 0, 0.1, 0.255);          // door
}

export class RangeLevel extends Level {
  /**
   * @param {THREE.Scene} scene
   * @param {{x:number,z:number}} heroStart where the hero stands (feet point)
   * @param {object} spec the hero's flashlight spec (the range does not decide what the hero carries)
   */
  constructor(scene, heroStart, spec) {
    super(scene, {}, spec);
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
    const at = (realM) => lensZ - realM * RANGE_SCALE;

    // Objects in order of distance, all on the beam axis.
    // Sideways offsets (metres, game scale) keep objects apart on screen while staying inside the beam.
    // Near objects stay close to the axis (a few cm would drop the lux a lot); far ones can sit wider.
    this.placeObject({ name: 'Конь', realM: 30, build: buildHorse, labelH: 0.5, x: x - 0.03, z: at(30) });
    this.placeObject({ name: 'Волк', realM: 50, build: buildWolf, labelH: 0.2, x: x + 0.04, z: at(50) });
    this.placeObject({ name: 'Автомобиль', realM: 100, build: buildCar, labelH: 0.3, x: x - 0.12, z: at(100) });
    this.placeObject({ name: 'Дом', realM: 150, build: buildHouse, labelH: 0.8, x: x + 0.12, z: at(150) });
    this.buildForest(x, at(200) - 0.05, FOREST_DEPTH_M);
    this.placeObject({ name: 'Край леса', realM: 200, build: null, labelH: 0.3, x: x + 0.06, z: at(200) });
  }

  /** Builds one object at (x, z) and adds its target. */
  placeObject({ name, realM, build, labelH, x, z }) {
    if (build) {
      const g = new THREE.Group();
      build(g);
      g.position.set(x, 0, z);
      this.root.add(g);
    }
    this.addTarget({ name, realM }, x, z, labelH);
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
    const parts = {
      name: label.querySelector('.rl-name'),
      dist: label.querySelector('.rl-dist'),
      dot: label.querySelector('.rl-dot'),
      lux: label.querySelector('.rl-lux'),
    };
    parts.name.textContent = obj.name;
    parts.dist.textContent = `${obj.realM} м`;
    this.targets.push({
      name: obj.name,
      realM: obj.realM,
      pos: new THREE.Vector3(x, BEAM_HEIGHT_M, z),          // lux is measured here, on the beam
      anchor: new THREE.Vector3(x, labelHeight, z),          // label sits above the object
      label,
      parts,
      lux: 0,
    });
  }

  /**
   * Camera framing for the bench: high and to the side, looking across the range, so the objects
   * spread left-to-right on screen instead of stacking along one line.
   */
  cameraFrame(camera, heroPos) {
    // Behind the hero and above, pulled off to the side. Looks down the range toward the forest edge.
    // Chosen so the whole run (hero to 200 m) fits the frame and objects spread sideways.
    camera.position.set(heroPos.x + 0.9, 0.9, heroPos.z + 0.6);
    camera.lookAt(heroPos.x - 0.02, 0.02, heroPos.z - 1.2);
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
