// Charge hits on the hero: invulnerability window and knockback. Battery is the hero's health.
import { bus } from '../core/EventBus.js';
import { INVULN_SEC, KNOCKBACK_M } from '../core/config.js';

export class HeroHealth {
  constructor() {
    this.invuln = 0;
  }

  update(dt) {
    if (this.invuln > 0) this.invuln -= dt;
  }

  /**
   * Applies a charge hit unless the hero is invulnerable or dead.
   * @param {number} pct charge removed (%)
   * @param {PowerSystem} power
   * @param {FlashlightHero} hero
   * @param {{x:number,z:number}} fromPos attacker position
   * @param {string} source display name of the attacker
   * @returns {boolean} true if the hit landed
   */
  hit(pct, power, hero, fromPos, source) {
    if (this.invuln > 0 || power.dead) return false;
    this.invuln = INVULN_SEC;
    power.applyHit(pct);
    const dx = hero.position.x - fromPos.x;
    const dz = hero.position.z - fromPos.z;
    const d = Math.hypot(dx, dz) || 1;
    hero.knockback({ x: dx / d, z: dz / d }, KNOCKBACK_M);
    bus.emit('heroHit', { pct, source });
    return true;
  }
}
