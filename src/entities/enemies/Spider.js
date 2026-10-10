// Spider (Паучок): fast, fragile, reacts to light sooner than the crawler. Chase → attack → flee when lit.
import { Enemy } from '../Enemy.js';
import { StateMachine } from '../../ai/StateMachine.js';
import { ENEMIES } from '../../data/enemies.js';

const ATTACK_RANGE = 0.3;   // m, contact distance to start a bite
const RELEASE_RANGE = 0.45; // m, stop biting beyond this
const BITE_CD = 0.8;        // s between bites
const FLEE_SEC = 1.0;       // s scuttling away after strong light

export class Spider extends Enemy {
  constructor(scene, x, z, particles) {
    super(scene, ENEMIES.spider, x, z, particles);
    this.biteCd = 0;
    this.fleeTimer = 0;
    this.sm = new StateMachine(this)
      .add('idle', {
        update() {
          if (this.distXZ(this.ctx.heroFeet) < this.data.detectM) this.sm.set('chase');
        },
      })
      .add('chase', {
        update(dt) {
          const ctx = this.ctx;
          if (this.lastLux > this.threshold * this.data.fleeRatio) {
            this.sm.set('flee');
            return;
          }
          const d = this.distXZ(ctx.heroFeet);
          if (d < ATTACK_RANGE && ctx.squad.acquire(this)) {
            this.sm.set('attack');
            return;
          }
          if (d >= ATTACK_RANGE) this.stepToward(ctx.heroFeet, this.data.speed, dt);
        },
      })
      .add('attack', {
        enter() {
          this.biteCd = 0;
        },
        update(dt) {
          const ctx = this.ctx;
          this.faceXZ(ctx.heroFeet);
          if (this.distXZ(ctx.heroFeet) > RELEASE_RANGE) {
            this.sm.set('chase');
            return;
          }
          this.biteCd -= dt;
          if (this.biteCd <= 0) {
            ctx.hitHero(this.data.contactPct, this.pos, this.name);
            this.biteCd = BITE_CD;
          }
        },
        exit() {
          this.ctx.squad.release(this);
        },
      })
      .add('flee', {
        enter() {
          this.fleeTimer = FLEE_SEC;
        },
        update(dt) {
          this.stepToward(this.ctx.heroFeet, this.data.speed * 1.5, dt, -1);
          this.fleeTimer -= dt;
          if (this.fleeTimer <= 0) this.sm.set('idle');
        },
      });
    this.sm.set('idle');
  }
}
