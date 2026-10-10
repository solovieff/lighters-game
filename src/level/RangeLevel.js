// Test range (Полигон): its own level. No enemies, no hero movement. The hero stays in the middle and turns the beam
// through a full circle. Objects stand all around him at REAL distances in metres (ANSI FL1 scale), so any beam
// direction lights something. The game distance is internal: gameM = realM * RANGE_SCALE (0.02).
import * as THREE from 'three';
import { RANGE_SCALE } from '../core/config.js';
import { Level } from './Level.js';
import { AABB } from '../physics/Physics.js';

const LENS_OFFSET_M = 0.118;   // head tip offset from the feet point along the beam (Convoy 118 mm)
const BEAM_HEIGHT_M = 0.011;   // beam height above the floor (the head lies on the table)
const TREE_COUNT_PER_ARC = 14;
const FOREST_ARC_DEG = 60;     // angular width of the forest edge on the circle

// Objects on the circle. angleDeg: 0 = straight ahead (-Z), 90 = right, 180 = behind, -90 = left.
// Each object sits at its real distance, so the lux it receives is the honest value for that distance.
const OBJECTS = [
  { name: 'Конь',       realM: 30,  angleDeg: 0,    labelH: 0.5, build: 'horse' },
  { name: 'Волк',       realM: 50,  angleDeg: 110,  labelH: 0.2, build: 'wolf' },
  { name: 'Автомобиль', realM: 100, angleDeg: -70,  labelH: 0.3, build: 'car' },
  { name: 'Дом',        realM: 150, angleDeg: -35,  labelH: 0.55, build: 'house' },
];
const FOREST = { name: 'Край леса', realM: 200, fromDeg: 150, toDeg: 230 };

/** Seeded random generator so the forest looks the same every time the range starts. */
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** Procedural grass: a green base with noise and short blades, tiled. */
function createGrassTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a2e18';
  ctx.fillRect(0, 0, size, size);
  // Mottled base colour.
  for (let i = 0; i < 2500; i++) {
    const v = 0.7 + Math.random() * 0.6;
    ctx.fillStyle = `rgba(${Math.round(26 * v)}, ${Math.round(46 * v)}, ${Math.round(24 * v)}, 0.45)`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 3 + Math.random() * 5, 3 + Math.random() * 5);
  }
  // Short blades in lighter and darker greens.
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const lean = (Math.random() - 0.5) * 4;
    ctx.strokeStyle = Math.random() < 0.5 ? '#3d6a30' : '#0f200e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + lean, y - 5 - Math.random() * 4);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
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

/** Wolf, crouched and stalking, facing the centre (its local +Z). */
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
  box(g, 0.34, 0.14, 0.12, coat, 0, 0.22, 0);
  box(g, 0.1, 0.2, 0.08, coat, 0.2, 0.36, 0, -0.5);
  box(g, 0.13, 0.08, 0.08, coat, 0.27, 0.46, 0);
  box(g, 0.04, 0.12, 0.03, mane, 0.16, 0.42, 0);
  box(g, 0.03, 0.14, 0.03, mane, -0.2, 0.25, 0, 0.4);
  for (const [x, z] of [[-0.12, -0.04], [-0.12, 0.04], [0.12, -0.04], [0.12, 0.04]]) {
    box(g, 0.035, 0.22, 0.035, coat, x, 0.11, z);
  }
}

/** Car, side view, long axis along X. */
function buildCar(g) {
  const paint = new THREE.MeshStandardMaterial({ color: '#7a1f1f', metalness: 0.4, roughness: 0.45 });
  const glass = new THREE.MeshStandardMaterial({ color: '#1c2630', metalness: 0.2, roughness: 0.1 });
  const tyre = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.9 });
  box(g, 0.44, 0.09, 0.2, paint, 0, 0.07, 0);
  box(g, 0.24, 0.08, 0.18, paint, -0.02, 0.15, 0);
  box(g, 0.2, 0.06, 0.19, glass, -0.02, 0.155, 0);
  for (const x of [-0.14, 0.14]) {
    for (const z of [-0.11, 0.11]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16), tyre);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.045, z);
      g.add(w);
    }
  }
}

/** House with a lit window and a pitched roof. */
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
  box(g, 0.1, 0.12, 0.01, glass, -0.14, 0.3, 0.255);
  box(g, 0.1, 0.12, 0.01, glass, 0.14, 0.3, 0.255);
  box(g, 0.12, 0.2, 0.01, wall, 0, 0.1, 0.255);
}

const BUILDERS = { horse: buildHorse, wolf: buildWolf, car: buildCar, house: buildHouse };

/** Point on the circle at a real distance and an angle (game metres). Angle 0 = -Z, positive = right. */
function polar(centre, realM, angleDeg) {
  const r = realM * RANGE_SCALE;
  const a = THREE.MathUtils.degToRad(angleDeg);
  return { x: centre.x + Math.sin(a) * r, z: centre.z - Math.cos(a) * r };
}

export class RangeLevel extends Level {
  /**
   * @param {THREE.Scene} scene
   * @param {{x:number,z:number}} heroStart where the hero stands (feet point). The circle is centred on the lens.
   * @param {object} spec the hero's flashlight spec (the range does not decide what the hero carries)
   */
  constructor(scene, heroStart, spec) {
    super(scene, {}, spec);
    this.root = new THREE.Group();
    scene.add(this.root);
    this.targets = [];
    this.lux = () => 0;   // (point) => lux, set by main.js each frame

    // Floor: plain dark board, big enough for the whole circle.
    const grassTex = createGrassTexture(512);
    grassTex.repeat.set(16, 16);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),   // wide enough that the edge never shows, even at 200 m
      new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.95, metalness: 0, color: '#8a8f86' })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(heroStart.x, 0, heroStart.z);
    floor.receiveShadow = true;
    this.root.add(floor);

    // Distances are measured from the lens, not from the feet: the circle is centred on the lens.
    const centre = { x: heroStart.x, z: heroStart.z - LENS_OFFSET_M };

    for (const o of OBJECTS) {
      const p = polar(centre, o.realM, o.angleDeg);
      const g = new THREE.Group();
      BUILDERS[o.build](g);
      g.position.set(p.x, 0, p.z);
      g.rotation.y = THREE.MathUtils.degToRad(o.angleDeg);   // face the centre
      this.root.add(g);
      this.addTarget({ name: o.name, realM: o.realM }, p.x, p.z, o.labelH);
    }

    this.buildForestArc(centre, FOREST);
    const edge = polar(centre, FOREST.realM, (FOREST.fromDeg + FOREST.toDeg) / 2);
    this.addTarget({ name: FOREST.name, realM: FOREST.realM }, edge.x, edge.z, 0.3);
  }

  /** Forest on an arc of the circle at 200 m: dark trunks with crowns. Trunks are colliders, so they block the beam. */
  buildForestArc(centre, arc) {
    const rand = seeded(7);
    const bark = new THREE.MeshStandardMaterial({ color: '#2a1f16', roughness: 1 });
    const leaves = new THREE.MeshStandardMaterial({ color: '#1a2a1d', roughness: 0.9 });
    const count = TREE_COUNT_PER_ARC;
    for (let i = 0; i < count; i++) {
      const angle = arc.fromDeg + ((arc.toDeg - arc.fromDeg) * (i + rand() * 0.6)) / count;
      const depth = (rand() - 0.5) * 0.06;   // a few cm of jitter in radius, so the edge is ragged
      const p = polar(centre, arc.realM + depth / RANGE_SCALE, angle);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.1, 6), bark);
      trunk.position.set(p.x, 0.05, p.z);
      trunk.castShadow = true;
      this.root.add(trunk);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 7), leaves);
      crown.position.set(p.x, 0.18, p.z);
      crown.castShadow = true;
      this.root.add(crown);
      this.colliders.push(AABB.fromCenterSize(p.x, 0.05, p.z, 0.02, 0.1, 0.02));
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
      <div class="rl-name" style="font-size:15px;color:#e6dfcf;letter-spacing:2px;text-transform:uppercase;text-shadow:0 0 6px #000,0 1px 2px #000"></div>
      <div class="rl-dist" style="font-size:30px;color:#ffe9c8;text-shadow:0 0 10px rgba(0,0,0,0.9)"></div>
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:4px">
        <span class="rl-dot" style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#000;box-shadow:0 0 0 1px #555"></span>
        <span class="rl-lux" style="font-size:13px;color:#e6dfcf;text-shadow:0 0 6px #000,0 1px 2px #000"></span>
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
