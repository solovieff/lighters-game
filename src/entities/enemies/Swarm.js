// Swarm (Рой): small shadows circle the hero and attack in turns. Attackers are limited by Squad tokens.
import { Enemy } from '../Enemy.js';
import { StateMachine } from '../../ai/StateMachine.js';
import { ENEMIES } from '../../data/enemies.js';

const ATTACK_IN = 0.6;   // m, close enough to want to attack
const RELEASE_OUT = 0.8; // m, stop attacking beyond this
const ATTACK_CD = 1.0;   // s between hits

export class Swarm extends Enemy {
  /**
   * @param {number} index position in the group
   * @param {number} count group size
   */
  constructor(scene, x, z, particles, index, count) {
    super(scene, ENEMIES.swarm, x, z, particles);
    this.angle = (index / count) * Math.PI * 2;
    this.ring = 0.4 + (index % 2) * 0.15;
    this.attackCd = 0;
    this.sm = new StateMachine(this)
      .add('circle', {
        update(dt) {
          const ctx = this.ctx;
          this.angle += dt * 0.9;
          const target = {
            x: ctx.heroFeet.x + Math.cos(this.angle) * this.ring,
            z: ctx.heroFeet.z + Math.sin(this.angle) * this.ring,
          };
          if (this.distXZ(ctx.heroFeet) < ATTACK_IN && ctx.squad.acquire(this)) {
            this.sm.set('attack');
            return;
          }
          this.stepToward(target, this.data.speed, dt);
        },
      })
      .add('attack', {
        enter() {
          this.attackCd = 0;
        },
        update(dt) {
          const ctx = this.ctx;
          this.faceXZ(ctx.heroFeet);
          if (this.distXZ(ctx.heroFeet) > RELEASE_OUT) {
            this.sm.set('circle');
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
      });
    this.sm.set('circle');
  }
}
