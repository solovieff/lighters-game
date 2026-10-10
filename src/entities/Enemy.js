// Base enemy: smoky body built from spheres, HP, light damage, evaporation on death.
// Subclasses set this.sm (a StateMachine) and may override think(dt, ctx).
import * as THREE from 'three';
import { bus } from '../core/EventBus.js';
import { EVAP_SEC, BLOCK_SEC } from '../core/config.js';

/** Several noisy dark spheres plus two glowing eyes. */
function buildSmoke(data) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: '#06060a', roughness: 1, metalness: 0,
    transparent: true, opacity: 0.88, depthWrite: false,
  });
  const r = data.size;
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r * (0.5 + Math.random() * 0.5), 12, 10), mat);
    s.position.set((Math.random() - 0.5) * r, r * (0.4 + Math.random() * 0.8), (Math.random() - 0.5) * r);
    g.add(s);
  }
  const eyeMat = new THREE.MeshBasicMaterial({ color: data.eyeColor, toneMapped: false });
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(r * 0.12, 8, 6), eyeMat);
    e.position.set(sx * r * 0.25, r * 1.0, r * 0.5);
    g.add(e);
  }
  g.userData.mat = mat;
  return g;
}

export class Enemy {
  /**
   * @param {THREE.Scene} scene
   * @param {object} data entry from ENEMIES
   * @param {number} x floor position
   * @param {number} z floor position
   * @param {import('../fx/Particles.js').Particles} particles
   */
  constructor(scene, data, x, z, particles) {
    this.scene = scene;
    this.data = data;
    this.type = data.type;
    this.name = data.name;
    this.particles = particles;
    this.hp = data.hp;
    this.alive = true;
    this.removed = false;
    this.evapTimer = 0;
    this.blockTimer = 0;
    this.blockUsed = false;
    this.trembleT = 0;
    this.lastLux = 0;
    this.time = Math.random() * 10;
    this.ctx = null;
    this.sm = null;

    this.pos = new THREE.Vector3(x, 0, z); // feet position
    this.group = buildSmoke(data);
    this.material = this.group.userData.mat;
    this.group.position.copy(this.pos);
    scene.add(this.group);
  }

  get threshold() {
    return this.data.luxThreshold;
  }

  /** Visual center of the body (used as the light target). */
  get center() {
    return new THREE.Vector3(this.pos.x, this.pos.y + this.data.size * 1.2, this.pos.z);
  }

  /** Horizontal distance to a point. */
  distXZ(p) {
    return Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
  }

  /** Turns the body to face a point. */
  faceXZ(p) {
    this.group.rotation.y = Math.atan2(p.x - this.pos.x, p.z - this.pos.z);
  }

  /**
   * Walks toward (sign=1) or away from (sign=-1) a point on the floor.
   * @param {{x:number,z:number}} target
   */
  stepToward(target, speed, dt, sign = 1) {
    const dx = target.x - this.pos.x;
    const dz = target.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 1e-6) return;
    this.pos.x += (dx / d) * speed * dt * sign;
    this.pos.z += (dz / d) * speed * dt * sign;
    this.group.rotation.y = Math.atan2(dx * sign, dz * sign);
  }

  /**
   * Light damage for this frame. Some shadows (block) take half damage for 1 s after the first hit.
   * @param {number} dps damage per second from the light formula
   * @param {number} dt
   * @param {number} mult extra multiplier (e.g. Invisible vs weak lights)
   */
  takeLight(dps, dt, mult = 1) {
    if (!this.alive || dps <= 0) return;
    if (this.data.block && !this.blockUsed) {
      this.blockUsed = true;
      this.blockTimer = BLOCK_SEC;
    }
    let dmg = dps * dt * mult;
    if (this.blockTimer > 0) dmg *= 0.5;
    this.hp -= dmg;
    this.trembleT = 0.1;
    if (this.hp <= 0) this.die();
  }

  /** Starts evaporation. Particles are spawned; the body shrinks and is removed. */
  die() {
    if (!this.alive) return;
    this.alive = false;
    bus.emit('enemyDied', { type: this.type });
    if (this.particles) {
      this.particles.burst(this.pos.x, this.pos.y + this.data.size, this.pos.z, 30, '#8a93a3', 0.5, 0.7);
    }
  }

  /** Multiplier for damage from a light with this CRI. Only some enemies care. */
  damageMultFor() {
    return 1;
  }

  /** Default AI: run the state machine. */
  think(dt) {
    if (this.sm) this.sm.update(dt);
  }

  /** Positions the body, plays tremble, and runs the evaporation timer after death. */
  tickBase(dt) {
    if (this.blockTimer > 0) this.blockTimer -= dt;
    this.time += dt;
    if (this.alive) {
      if (this.trembleT > 0) this.trembleT -= dt;
      const shake = this.trembleT > 0 ? 0.01 : 0;
      this.group.position.set(
        this.pos.x + (Math.random() - 0.5) * shake,
        this.pos.y + Math.sin(this.time * 3) * 0.01,
        this.pos.z + (Math.random() - 0.5) * shake
      );
    } else {
      this.evapTimer += dt;
      const k = Math.max(0.001, 1 - this.evapTimer / EVAP_SEC);
      this.group.scale.setScalar(k);
      this.group.position.copy(this.pos);
      if (this.evapTimer >= EVAP_SEC && !this.removed) {
        this.scene.remove(this.group);
        this.removed = true;
      }
    }
  }

  /**
   * Called every frame by main.js.
   * @param {number} dt
   * @param {object} ctx world context: heroFeet, heroHead, squad, hitHero, spawnProjectile, ...
   */
  tick(dt, ctx) {
    this.ctx = ctx;
    if (this.alive) this.think(dt, ctx);
    this.tickBase(dt);
  }
}
