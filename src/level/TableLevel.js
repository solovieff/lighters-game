import { createWoodTexture } from '../assets/Textures.js';
// Table level "Ящик стола": builds the drawer from data, spawns waves and the boss,
// tracks Sparks, checkpoints, hints and the exit. Extends the base Level; the flashlight spec comes from outside.
import * as THREE from 'three';
import { bus } from '../core/EventBus.js';
import { BOSS } from '../core/config.js';
import { buildWalls, buildProps, buildExit } from './LevelBuilder.js';
import { Pickup } from '../entities/Pickup.js';
import { Level } from './Level.js';
import { Checkpoint } from './Checkpoints.js';
import { Spawner } from './Spawner.js';
import { Crawler } from '../entities/enemies/Crawler.js';
import { Swarm } from '../entities/enemies/Swarm.js';
import { Moth } from '../entities/enemies/Moth.js';
import { InkBlot } from '../entities/enemies/InkBlot.js';
import { MouseQuest } from './MouseQuest.js';

export class TableLevel extends Level {
  /**
   * @param {THREE.Scene} scene
   * @param {object} data level data (LEVEL_1)
   * @param {object} spec the hero's flashlight spec (copy with mods applied)
   * @param {import('../fx/Particles.js').Particles} particles
   */
  constructor(scene, data, spec, particles) {
    super(scene, data, spec);
    this.particles = particles;
    this.cri = spec.cri;
    this.root = new THREE.Group();
    this.addWoodFloor();
    scene.add(this.root);

    this.colliders = [];
    this.enemies = [];
    this.pickups = [];
    this.checkpoints = [];
    this.hints = data.hints.map((h) => ({ ...h, shown: false }));
    this.spawner = new Spawner(data.waves);
    this.boss = null;
    // Mouse quest: only if the level data asks for it. The pencil it eats is the one with the eraser.
    const pencil = data.props.find((p) => p.kind === 'pencil');
    this.pencilAt = pencil ? { x: pencil.x, z: pencil.z } : null;
    this.mouse = data.quest && this.pencilAt ? new MouseQuest(this.root, data.quest, this.pencilAt) : null;
    if (this.mouse) {
      // When the mouse is done, the pencil and its eraser disappear from the drawer.
      this.mouse.onEaten = () => {
        // Hide the pencil and its eraser AND remove their colliders: the hero must not need to jump over them any more.
        const gone = this.root.children.filter((c) => c.name === 'pencil' || c.name === 'pencil-eraser');
        const dead = new Set();
        for (const c of gone) {
          c.visible = false;
          if (c.userData.collider) dead.add(c.userData.collider);
        }
        this.colliders = this.colliders.filter((col) => !dead.has(col));
        this.pencilGone = true;
      };
    }
    this.bossDefeated = false;
    this.sparks = 0;
    this.respawnPoint = { x: data.start.x, z: data.start.z };

    this.colliders.push(...buildWalls(this.root, data));
    this.colliders.push(...buildProps(this.root, data.props));
    this.exit = buildExit(this.root, data.exit.x, 0, data.bounds.halfZ);
    for (const s of data.shards) this.pickups.push(new Pickup(this.root, s, this.cri));
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
    if (this.mouse) this.mouse.update(dt, this.lux || (() => 0), this.pencilAt);
    if (this.data.boss && !this.boss && heroPos.x >= this.data.boss.triggerX) this.spawnBoss();

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

    if (!this.data.boss && !this.bossDefeated) {
      this.bossDefeated = true;   // no boss in this level: the exit opens from the start
      this.exit.open();
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
  /** Wood floor of the drawer (lives in this level's group, so it is removed with the level). */
  addWoodFloor() {
    const woodTex = createWoodTexture(512);
    woodTex.repeat.set(8, 4);
    const b = this.data.bounds;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(b.maxX - b.minX + 2, b.halfZ * 2 + 1),
      new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.6, metalness: 0.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((b.minX + b.maxX) / 2, 0, 0);
    floor.receiveShadow = true;
    this.root.add(floor);
  }

  dispose() {
    for (const e of this.enemies) this.scene.remove(e.group);
    this.scene.remove(this.root);
    this.enemies = [];
  }
}
