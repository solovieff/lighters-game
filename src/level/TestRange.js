// Test range: a long lane with targets at known distances. Each target shows its distance in game metres and
// in real metres (ANSI FL1 scale), plus the illuminance the current beam delivers to it.
// Used to check throw and hotspot of every flashlight against the official numbers.
import * as THREE from 'three';
import { RANGE_SCALE } from '../core/config.js';

export const RANGE_DISTANCES_M = [0.5, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0];

export class TestRange {
  /**
   * @param {THREE.Scene} scene
   * @param {number} startX where the lane begins (the hero stands here)
   * @param {number} zLane lane centre on Z
   */
  constructor(scene, startX, zLane) {
    this.root = new THREE.Group();
    scene.add(this.root);
    this.startX = startX;
    this.zLane = zLane;
    this.targets = [];

    // Lane: a long low board so the beam has something to land on.
    const lane = new THREE.Mesh(
      new THREE.BoxGeometry(RANGE_DISTANCES_M[RANGE_DISTANCES_M.length - 1] + 2, 0.02, 0.6),
      new THREE.MeshStandardMaterial({ color: '#3a2a1c', roughness: 0.8 })
    );
    lane.position.set(startX + (RANGE_DISTANCES_M[RANGE_DISTANCES_M.length - 1] + 2) / 2 - 1, 0.01, zLane);
    lane.receiveShadow = true;
    this.root.add(lane);

    for (const d of RANGE_DISTANCES_M) {
      // Target sits d game metres from the hero along the lane.
      this.addTarget(startX + d, d);
    }
  }

  /** A white card on a post, with a distance label handled by the caller (DOM). */
  addTarget(x, gameM) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.12, 0.03),
      new THREE.MeshStandardMaterial({ color: '#555', roughness: 0.9 })
    );
    post.position.set(x, 0.06, this.zLane);
    post.castShadow = true;
    this.root.add(post);

    const card = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.01),
      new THREE.MeshStandardMaterial({ color: '#e8e4d8', roughness: 0.7 })
    );
    card.position.set(x, 0.12, this.zLane);
    card.castShadow = true;
    this.root.add(card);

    const label = document.createElement('div');
    Object.assign(label.style, {
      position: 'fixed', transform: 'translate(-50%, -100%)', pointerEvents: 'none',
      color: '#ffe9b8', font: '12px monospace', background: 'rgba(0,0,0,0.6)',
      padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap', display: 'none',
    });
    document.body.appendChild(label);
    this.targets.push({
      gameM, pos: new THREE.Vector3(x, 0.12, this.zLane), label, lux: 0,
    });
  }

  /**
   * Updates the labels: distance (game and real) and the lux the beam delivers.
   * @param {THREE.Camera} camera
   * @param {(p: THREE.Vector3) => number} luxAt returns lux at a point (occlusion-aware)
   */
  update(camera, luxAt, width, height) {
    const v = new THREE.Vector3();
    for (const t of this.targets) {
      t.lux = luxAt(t.pos);
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
}
