// Moth (Мотылёк): immune to light. Flies to the hero's head and clings (−20 % brightness each, max 3).
// Removed by strobe, or by the light being off for 2 s (handled in main.js).
import { Enemy } from '../Enemy.js';
import { ENEMIES } from '../../data/enemies.js';

const CLING_DIST = 0.12; // m, distance at which the moth tries to cling

export class Moth extends Enemy {
  constructor(scene, x, z, particles) {
    super(scene, ENEMIES.moth, x, z, particles);
    this.immune = true;
    this.attached = false;
    this.orbit = Math.random() * Math.PI * 2;
    this.pos.y = ENEMIES.moth.flyHeight;
  }

  /** Moths ignore light completely. */
  takeLight() {}

  think(dt, ctx) {
    const head = ctx.heroHead;
    if (this.attached) {
      this.pos.set(head.x, head.y, head.z);
      return;
    }
    this.orbit += dt * 4;
    const dx = head.x - this.pos.x;
    const dy = head.y - this.pos.y;
    const dz = head.z - this.pos.z;
    const d = Math.hypot(dx, dy, dz);

    if (d < CLING_DIST) {
      if (ctx.attachMoth(this)) {
        this.attached = true;
        return;
      }
      // Cannot cling (limit reached): circle the head.
      this.pos.set(head.x + Math.cos(this.orbit) * 0.2, head.y, head.z + Math.sin(this.orbit) * 0.2);
      return;
    }
    const step = Math.min(d, this.data.speed * dt);
    this.pos.x += (dx / d) * step;
    this.pos.y += (dy / d) * step;
    this.pos.z += (dz / d) * step;
  }
}
