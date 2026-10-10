// Ink Blot boss (Чернильная Клякса): slow and heavy. Its core is at beam height, so only a precise beam hurts it.
// Splits into smaller blots at 66 % and 33 % HP (the level spawns them through onSplit).
import * as THREE from 'three';
import { Enemy } from '../Enemy.js';
import { ENEMIES } from '../../data/enemies.js';
import { BOSS } from '../../core/config.js';

export class InkBlot extends Enemy {
  /**
   * @param {THREE.Scene} scene
   * @param {number} x
   * @param {number} z
   * @param {import('../../fx/Particles.js').Particles} particles
   * @param {(boss: InkBlot) => void} onSplit called when a split threshold is crossed
   */
  constructor(scene, x, z, particles, onSplit) {
    super(scene, ENEMIES.inkBlot, x, z, particles);
    this.isBoss = true;
    this.maxHp = this.hp;
    this.onSplit = onSplit;
    this.splitIndex = 0;
    this.attackCd = 0;
  }

  /** The core sits at beam height (head level), not at the body centre. */
  get center() {
    return new THREE.Vector3(this.pos.x, BOSS.coreHeight, this.pos.z);
  }

  get hpFraction() {
    return Math.max(0, this.hp / this.maxHp);
  }

  think(dt, ctx) {
    const d = this.distXZ(ctx.heroFeet);
    if (d > BOSS.contactRange) {
      this.stepToward(ctx.heroFeet, BOSS.approachSpeed, dt);
    } else {
      this.faceXZ(ctx.heroFeet);
      this.attackCd -= dt;
      if (this.attackCd <= 0) {
        ctx.hitHero(BOSS.contactPct, this.pos, this.name);
        this.attackCd = BOSS.contactCdSec;
      }
    }
    while (this.splitIndex < BOSS.splitAt.length && this.hpFraction <= BOSS.splitAt[this.splitIndex]) {
      this.splitIndex += 1;
      this.onSplit(this);
    }
  }
}
