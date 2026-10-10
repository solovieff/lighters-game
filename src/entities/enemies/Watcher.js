// Watcher (Наблюдатель): holds 6–15 m, fires a dark orb every 3 s, then closes to 3 m for 2 s (weak spot), then retreats.
import * as THREE from 'three';
import { Enemy } from '../Enemy.js';
import { StateMachine } from '../../ai/StateMachine.js';
import { ENEMIES } from '../../data/enemies.js';

const HOLD_DIST = 8;    // m, preferred standoff
const CLOSE_DIST = 3;   // m, distance during the exposed phase
const RETREAT_MULT = 1.5;

export class Watcher extends Enemy {
  constructor(scene, x, z, particles) {
    super(scene, ENEMIES.watcher, x, z, particles);
    this.pos.y = this.data.hover;
    this.fireTimer = this.data.fireIntervalSec;
    this.exposeTimer = 0;
    this.sm = new StateMachine(this)
      .add('watch', {
        update(dt) {
          const ctx = this.ctx;
          const d = this.distXZ(ctx.heroFeet);
          if (d > HOLD_DIST + 0.5) this.stepToward(ctx.heroFeet, this.data.speed, dt);
          else if (d < HOLD_DIST - 0.5) this.stepToward(ctx.heroFeet, this.data.speed, dt, -1);
          else this.faceXZ(ctx.heroFeet);

          this.fireTimer -= dt;
          if (this.fireTimer <= 0) {
            this.fire(ctx);
            this.fireTimer = this.data.fireIntervalSec;
            this.sm.set('expose');
          }
        },
      })
      .add('expose', {
        enter() {
          this.exposeTimer = this.data.exposeSec;
        },
        update(dt) {
          const ctx = this.ctx;
          this.faceXZ(ctx.heroFeet);
          if (this.distXZ(ctx.heroFeet) > CLOSE_DIST) {
            this.stepToward(ctx.heroFeet, this.data.speed * 2, dt);
          }
          this.exposeTimer -= dt;
          if (this.exposeTimer <= 0) this.sm.set('retreat');
        },
      })
      .add('retreat', {
        update(dt) {
          if (this.distXZ(this.ctx.heroFeet) >= HOLD_DIST) {
            this.sm.set('watch');
            return;
          }
          this.stepToward(this.ctx.heroFeet, this.data.speed * RETREAT_MULT, dt, -1);
        },
      });
    this.sm.set('watch');
  }

  /** Fires a dark orb from the body toward the hero's head. */
  fire(ctx) {
    const from = new THREE.Vector3(this.pos.x, this.pos.y + 0.1, this.pos.z);
    const dir = new THREE.Vector3(
      ctx.heroHead.x - from.x,
      ctx.heroHead.y - from.y,
      ctx.heroHead.z - from.z
    );
    ctx.spawnProjectile(from, dir, this.data.orbPct);
  }
}
