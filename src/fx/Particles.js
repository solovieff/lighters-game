// Pooled particles (evaporation, sparks). Additive points. A particle fades by darkening its color.
import * as THREE from 'three';

const MAX = 400;
const HIDDEN_Y = -1000;

export class Particles {
  /** @param {THREE.Scene} scene */
  constructor(scene) {
    this.pos = new Float32Array(MAX * 3);
    this.col = new Float32Array(MAX * 3);
    this.base = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);
    this.maxLife = new Float32Array(MAX);
    this.next = 0;
    for (let i = 0; i < MAX; i++) this.pos[i * 3 + 1] = HIDDEN_Y;

    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.02, vertexColors: true, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  /**
   * Spawns particles at a point. Reuses pool slots in a ring.
   * @param {number} x @param {number} y @param {number} z
   * @param {number} count
   * @param {string} hex color
   */
  burst(x, y, z, count, hex, speed = 0.4, life = 0.6) {
    const c = new THREE.Color(hex);
    for (let k = 0; k < count; k++) {
      const i = this.next;
      this.next = (this.next + 1) % MAX;
      const i3 = i * 3;
      this.pos[i3] = x;
      this.pos[i3 + 1] = y;
      this.pos[i3 + 2] = z;
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.vel[i3] = Math.cos(a) * s;
      this.vel[i3 + 1] = (0.3 + Math.random() * 0.7) * s;
      this.vel[i3 + 2] = Math.sin(a) * s;
      this.base[i3] = c.r;
      this.base[i3 + 1] = c.g;
      this.base[i3 + 2] = c.b;
      this.life[i] = life * (0.6 + Math.random() * 0.4);
      this.maxLife[i] = this.life[i];
    }
  }

  /** Moves particles, fades them and hides dead ones. */
  update(dt) {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      const i3 = i * 3;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.pos[i3 + 1] = HIDDEN_Y;
        this.col[i3] = this.col[i3 + 1] = this.col[i3 + 2] = 0;
        continue;
      }
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      this.vel[i3 + 1] -= 0.8 * dt;
      const k = this.life[i] / this.maxLife[i];
      this.col[i3] = this.base[i3] * k;
      this.col[i3 + 1] = this.base[i3 + 1] * k;
      this.col[i3 + 2] = this.base[i3 + 2] * k;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
}
