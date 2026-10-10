// Level runtime for "Ящик стола": builds the drawer from data, spawns waves and the boss,
// tracks Sparks, checkpoints, hints and the exit. Rendering helpers live in LevelBuilder.
import * as THREE from 'three';
import { bus } from '../core/EventBus.js';
import { BOSS } from '../core/config.js';
import { buildWalls, buildProps, buildExit } from './LevelBuilder.js';
import { Pickup } from '../entities/Pickup.js';
import { Checkpoint } from './Checkpoints.js';
import { Spawner } from './Spawner.js';
import { Crawler } from '../entities/enemies/Crawler.js';
import { Swarm } from '../entities/enemies/Swarm.js';
import { Moth } from '../entities/enemies/Moth.js';
import { InkBlot } from '../entities/enemies/InkBlot.js';

export class Level {
  /**
   * @param {THREE.Scene} scene
   * @param {object} data level data (LEVEL_1)
   * @param {import('../fx/Particles.js').Particles} particles
   * @param {number} cri colour rendering index of the hero's light
   */
  constructor(scene, data, particles, cri) {
    this.scene = scene;
    this.data = data;
    this.particles = particles;
    this.cri = cri;
    this.root = new THREE.Group();
    scene.add(this.root);

    this.colliders = [];
    this.enemies = [];
    this.pickups = [];
    this.checkpoints = [];
    this.hints = data.hints.map((h) => ({ ...h, shown: false }));
    this.spawner = new Spawner(data.waves);
    this.boss = null;
    this.bossDefeated = false;
    this.sparks = 0;
    this.respawnPoint = { x: data.start.x, z: data.start.z };

    this.colliders.push(...buildWalls(this.root, data));
    this.colliders.push(...buildProps(this.root, data.props));
    this.exit = buildExit(this.root, data.exit.x, 0, data.bounds.halfZ);
    for (const s of data.shards) this.pickups.push(new Pickup(this.root, s, cri));
    for (const c of data.checkpoints) this.checkpoints.push(new Checkpoint(this.root, c));
  }

  /** Spawns one wave: swarms as a group, the rest one by one. */
  spawnWave(wave) {
    const swarms = wave.enemies.filter((d) => d.type === 'swarm');
    swarms.forEach((d, i) => {
      this.enemies.push(new Swarm(this.scene, d.x, d.z, this.particles, i, swarms.length));
    });
    for (const d of wave.enemies) {
      if (d.type === 'crawler') this.enemies.push(new Crawler(this.scene, d.x, d.z, this.particles));
      else if (d.type === 'moth') this.enemies.push(new Moth(this.scene, d.x, d.z, this.particles));
    }
  }

  spawnBoss() {
    const d = this.data.boss;
    this.boss = new InkBlot(this.scene, d.x, d.z, this.particles, (b) => this.splitBoss(b));
    this.enemies.push(this.boss);
    bus.emit('bossPhase', { name: this.boss.name, hp: 1 });
  }

  /** Splits the boss into small blots around it. */
  splitBoss(boss) {
    const n = BOSS.splitCount;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random();
      const x = boss.pos.x + Math.cos(a) * 0.15;
      const z = boss.pos.z + Math.sin(a) * 0.15;
      this.enemies.push(new Swarm(this.scene, x, z, this.particles, i, n));
    }
    bus.emit('bossPhase', { name: boss.name, hp: boss.hpFraction });
  }

  /**
   * Runs triggers, pickups, checkpoints and the boss/exit state. Call once per frame before enemy AI.
   * @param {number} dt
   * @param {{x:number,z:number}} heroPos
   * @param {import('../light/PowerSystem.js').PowerSystem} power
   */
  update(dt, heroPos, power) {
    for (const w of this.spawner.update(heroPos.x)) this.spawnWave(w);
    if (!this.boss && heroPos.x >= this.data.boss.triggerX) this.spawnBoss();

    for (const h of this.hints) {
      if (!h.shown && heroPos.x >= h.x) {
        h.shown = true;
        bus.emit('hint', { text: h.text });
      }
    }

    for (const p of this.pickups) {
      if (p.update(dt, heroPos)) {
        this.sparks += p.value;
        bus.emit('pickup', { value: p.value, secret: p.secret });
      }
    }

    for (const c of this.checkpoints) {
      if (c.update(heroPos)) {
        power.setCharge(100);
        this.respawnPoint = { x: c.pos.x, z: c.pos.z };
        bus.emit('checkpoint', { id: c.id });
      }
    }

    if (this.boss && !this.boss.alive && !this.bossDefeated) {
      this.bossDefeated = true;
      this.exit.open();
      bus.emit('bossDefeated', {});
    }

    this.enemies = this.enemies.filter((e) => !e.removed);
  }

  /** True once the boss is down and the hero reaches the exit. */
  atExit(heroX) {
    return this.bossDefeated && heroX >= this.data.exit.x - 0.05;
  }

  /** Boss name and HP fraction for the boss bar, or null when there is no live boss. */
  bossInfo() {
    if (!this.boss || !this.boss.alive) return null;
    return { name: this.boss.name, frac: this.boss.hpFraction };
  }

  /** Removes everything this level added to the scene. */
  dispose() {
    for (const e of this.enemies) this.scene.remove(e.group);
    this.scene.remove(this.root);
    this.enemies = [];
  }
}
