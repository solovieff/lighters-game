// Invisible (Невидимка): seen only in high-CRI light (≥ 90). Other lights see shimmer and deal ×0.25.
// After 5 s under high-CRI light it is revealed for 6 s and takes full damage from any light.
import { Enemy } from '../Enemy.js';
import { StateMachine } from '../../ai/StateMachine.js';
import { ENEMIES } from '../../data/enemies.js';

const LURK_RANGE = 4;    // m, starts drifting toward the hero
const ATTACK_IN = 0.3;   // m, close enough to touch
const ATTACK_CD = 1.2;   // s between touches

export class Invisible extends Enemy {
  constructor(scene, x, z, particles) {
    super(scene, ENEMIES.invisible, x, z, particles);
    this.highCriTime = 0;
    this.revealTimer = 0;
    this.attackCd = 0;
    this.sm = new StateMachine(this)
      .add('lurk', {
        update(dt) {
          const ctx = this.ctx;
          const d = this.distXZ(ctx.heroFeet);
          if (d < LURK_RANGE && d > ATTACK_IN) this.stepToward(ctx.heroFeet, this.data.speed, dt);
          if (d <= ATTACK_IN) {
            this.faceXZ(ctx.heroFeet);
            this.attackCd -= dt;
            if (this.attackCd <= 0) {
              ctx.hitHero(this.data.contactPct, this.pos, this.name);
              this.attackCd = ATTACK_CD;
            }
          }
        },
      });
    this.sm.set('lurk');
  }

  /** Full damage from high-CRI light or while revealed; ×0.25 from other lights. */
  damageMultFor(cri) {
    if (cri >= this.data.highCriMin || this.revealTimer > 0) return 1;
    return this.data.damageMultOther;
  }

  think(dt, ctx) {
    super.think(dt, ctx);
    const highCriHit = ctx.lightOn && ctx.lightCri >= this.data.highCriMin && this.lastLux > this.threshold;
    if (highCriHit) {
      this.highCriTime += dt;
      if (this.highCriTime >= this.data.revealSec) {
        this.revealTimer = this.data.revealLen;
        this.highCriTime = 0;
      }
    } else {
      this.highCriTime = Math.max(0, this.highCriTime - dt);
    }
    this.revealTimer -= dt;
    // Body is a faint shimmer unless revealed by high-CRI light.
    const visible = this.revealTimer > 0 || highCriHit;
    this.material.opacity = visible ? 0.85 : 0.07;
  }
}
