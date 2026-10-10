// Crawler (Ползун): idle → chase → attack → flee. Slow, luxThreshold 1, contact −8 % charge, block.
import { Enemy } from '../Enemy.js';
import { StateMachine } from '../../ai/StateMachine.js';
import { ENEMIES } from '../../data/enemies.js';

const ATTACK_RANGE = 0.35;  // m, contact distance to start an attack
const RELEASE_RANGE = 0.5;  // m, stop attacking beyond this
const ATTACK_CD = 1.0;      // s between contact hits
const FLEE_SEC = 1.5;       // s backing off after strong light

export class Crawler extends Enemy {
  constructor(scene, x, z, particles) {
    super(scene, ENEMIES.crawler, x, z, particles);
    this.attackCd = 0;
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
          this.attackCd = 0;
        },
        update(dt) {
          const ctx = this.ctx;
          this.faceXZ(ctx.heroFeet);
          if (this.distXZ(ctx.heroFeet) > RELEASE_RANGE) {
            this.sm.set('chase');
            return;
          }
          this.attackCd -= dt;
          if (this.attackCd <= 0) {
            ctx.hitHero(this.data.contactPct, this.pos, this.name);
            this.attackCd = ATTACK_CD;
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
