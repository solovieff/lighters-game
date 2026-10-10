// Test range (Полигон): a separate level with no walls, props or enemies. Same contract as Level. The hero shines straight ahead and every target
// is placed at a known distance (game metres) in a fan, so no target blocks another.
// Each target shows its game distance, the real distance (ANSI FL1 scale) and the lux the beam delivers.
import * as THREE from 'three';
import { RANGE_SCALE } from '../core/config.js';
import { Level } from './Level.js';

// Distances in game metres. Real range ~ up to 27 m (MS18), so the far end goes to 10 game m (500 real m).
export const RANGE_DISTANCES_M = [0.5, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0];
// Head tip offset from the hero's feet point along the beam (Convoy length 118 mm). Targets are measured from the lens.
const LENS_OFFSET_M = 0.118;
// Beam height above the floor: the head of the flashlight lies on the table (radius of the body).
const BEAM_HEIGHT_M = 0.011;

export class RangeLevel extends Level {
  /**
   * @param {THREE.Scene} scene
   * @param {{x:number,z:number}} heroStart where the hero stands
   */
  /**
   * @param {THREE.Scene} scene
   * @param {{x:number,z:number}} heroStart where the hero stands
   * @param {object} spec the hero's flashlight spec (the range does not decide what the hero carries)
   */
  constructor(scene, heroStart, spec) {
    super(scene, { targets: RANGE_DISTANCES_M }, spec);
    this.root = new THREE.Group();
    scene.add(this.root);
    this.targets = [];
    this.heroStart = heroStart;
    this.lux = () => 0;    // (point) => lux, set by main.js each frame

    // Floor for the range: plain dark board, enough to see the lit spot.
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(heroStart.x + 4, 0, heroStart.z);
    floor.receiveShadow = true;
    this.root.add(floor);

    // Targets stand ON the beam axis, one after another along it, so each one reads the true lux for its distance.
    RANGE_DISTANCES_M.forEach((d, i) => {
      const x = heroStart.x;   // exactly on the axis: every target is inside the beam
      // Distance is measured from the lens (the head tip), not from the feet: the beam starts there.
      const z = heroStart.z - LENS_OFFSET_M - d;
      this.addTarget(x, z, d);
    });
  }

  /** A white card on a post, facing the hero. */
  addTarget(x, z, gameM) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.12, 0.03),
      new THREE.MeshStandardMaterial({ color: '#555', roughness: 0.9 })
    );
    post.position.set(x, 0.06, z);
    post.castShadow = true;
    this.root.add(post);

    const card = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.01),
      new THREE.MeshStandardMaterial({ color: '#e8e4d8', roughness: 0.7 })
    );
    card.position.set(x, 0.14, z);
    card.lookAt(this.heroStart.x, 0.14, this.heroStart.z);
    card.castShadow = true;
    this.root.add(card);

    const label = document.createElement('div');
    Object.assign(label.style, {
      position: 'fixed', transform: 'translate(-50%, -100%)', pointerEvents: 'none',
      color: '#ffe9b8', font: '12px monospace', background: 'rgba(0,0,0,0.6)',
      padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap', display: 'none',
    });
    document.body.appendChild(label);
    // The lux point sits at the beam height (the head), so the beam hits the target's centre.
    this.targets.push({ gameM, pos: new THREE.Vector3(x, BEAM_HEIGHT_M, z), label, lux: 0 });
  }

  /**
   * Updates the labels: game distance, real distance and the lux the beam delivers at each target.
   * @param {THREE.Camera} camera
   * @param {(p: THREE.Vector3) => number} luxAt lux at a point (same formula as enemies)
   * @param {number} width
   * @param {number} height
   */
  update(dt, heroPos, power, camera) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const v = new THREE.Vector3();
    for (const t of this.targets) {
      t.lux = this.lux(t.pos);
      v.copy(t.pos).project(camera);
      const on = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      t.label.style.display = on ? 'block' : 'none';
      if (!on) continue;
      t.label.style.left = `${(v.x * 0.5 + 0.5) * width}px`;
      t.label.style.top = `${(-v.y * 0.5 + 0.5) * height}px`;
      const real = t.gameM / RANGE_SCALE;   // real metres = game metres / RANGE_SCALE
      t.label.textContent = `${t.gameM} м (игра) · ${real.toFixed(0)} м (реально) · ${t.lux.toFixed(2)} лк`;
    }
  }

  /** Same contract as Level: no boss, no exit. */
  bossInfo() { return null; }
  atExit() { return false; }
  dispose() { this.scene.remove(this.root); }
}
