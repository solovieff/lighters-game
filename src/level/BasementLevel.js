import { createWoodTexture } from '../assets/Textures.js';
// Level 2 "Подвал". Its own class (a copy of the table mechanics), extends the base Level.
// Builds the basement from data, spawns waves, tracks Sparks, checkpoints, hints and the exit.
import * as THREE from 'three';
import { bus } from '../core/EventBus.js';
import { BOSS } from '../core/config.js';
import { buildWalls, buildProps, buildExit, buildPartitions } from './LevelBuilder.js';
import { createStoneTexture } from '../assets/Textures.js';
import { Pickup } from '../entities/Pickup.js';
import { Level } from './Level.js';
import { Checkpoint } from './Checkpoints.js';
import { Spawner } from './Spawner.js';
import { Crawler } from '../entities/enemies/Crawler.js';
import { Spider } from '../entities/enemies/Spider.js';
import { Swarm } from '../entities/enemies/Swarm.js';
import { Moth } from '../entities/enemies/Moth.js';
import { InkBlot } from '../entities/enemies/InkBlot.js';
import { MouseQuest } from './MouseQuest.js';
import { LEVEL_2 } from '../data/levels.js';

export class BasementLevel extends Level {
  /**
   * @param {THREE.Scene} scene
   * @param {object} data level data (LEVEL_2)
   * @param {object} spec the hero's flashlight spec (copy with mods applied)
   * @param {import('../fx/Particles.js').Particles} particles
   */
  constructor(scene, spec, particles) {
    super(scene, LEVEL_2, spec);
    const data = LEVEL_2;
    this.particles = particles;
    this.cri = spec.cri;
    this.root = new THREE.Group();
    this.addStoneFloor();
    scene.add(this.root);

    this.colliders = [];
    this.enemies = [];
    this.pickups = [];
    this.checkpoints = [];
    this.hints = data.hints.map((h) => ({ ...h, shown: false }));
    this.spawner = new Spawner(data.waves);
    this.boss = null;
    // Mouse quest: only if the level data asks for it. The pencil it eats is the one with the eraser.
    // The thing the mouse eats is named in the quest data (a crate now, not a pencil).
    const target = data.quest ? data.props.find((p) => p.kind === data.quest.target) : null;
    this.pencilAt = target ? { x: target.x, z: target.z } : null;   // (name kept: the quest's goal point)
    this.mouse = data.quest && this.pencilAt ? new MouseQuest(this.root, data.quest, this.pencilAt) : null;
    if (this.mouse) {
      // When the mouse is done, the pencil and its eraser disappear from the drawer.
      this.mouse.onEaten = () => {
        // Hide the crate AND remove its collider: once eaten, the way is clear.
        const gone = this.root.children.filter((c) => c.name === 'crate');
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
    this.gateOpen = false;   // the gate in the wall before the empty room
    this.sparks = 0;
    this.respawnPoint = { x: data.start.x, z: data.start.z };

    this.stoneMat = this.makeStoneMaterial();
    this.colliders.push(...buildWalls(this.root, data, this.stoneMat));
    this.colliders.push(...buildProps(this.root, data.props));
    this.colliders.push(...buildPartitions(this.root, data.partitions, data.wallHeight, this.stoneMat));
    this.exit = buildExit(this.root, data.exit.x, 0, data.bounds.halfZ, null);   // the far door of the empty room
    // Lamps in the empty room: a small glowing shade and a weak warm light. Picture only (not in the lux readout).
    for (const L of data.lamps || []) {
      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.05, 0.08, 10),
        new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ffb84a', emissiveIntensity: 1.5 })
      );
      shade.position.set(L.x, 0.08, L.z);
      this.root.add(shade);
      const light = new THREE.PointLight('#ffd9a0', 0.35, 1.6, 2);
      light.position.set(L.x, 0.12, L.z);
      this.root.add(light);
    }
    for (const s of data.shards) this.pickups.push(new Pickup(this.root, s, this.cri));
    for (const c of data.checkpoints) this.checkpoints.push(new Checkpoint(this.root, c));
  }

  /**
   * After the battery dies every enemy comes back on its spawn point, the same as at the start of the level.
   * Drops the old bodies (and their attack tokens), then re-arms every wave.
   */
  resetEnemies() {
    for (const e of this.enemies) this.scene.remove(e.group);
    this.enemies = [];
    this.boss = null;
    this.squad && this.squad.tokens && this.squad.tokens.clear();
    // Put every wave back on the field right away: enemies stand on their spawn points, as at the start.
    for (const w of this.spawner.waves) {
      w.done = false;
      this.spawnWave(w);
      w.done = true;   // spawned now, so the trigger does not spawn it a second time
    }
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
      else if (d.type === 'spider') this.enemies.push(new Spider(this.scene, d.x, d.z, this.particles));
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
        bus.emit('hint', { text: h.text, touch: h.touch });
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

    // The gate opens when the beam lights its corner (the same trigger as the mouse). Then the way is free.
    if (!this.gateOpen && this.data.gate && this.lux) {
      const g = this.data.gate;
      if (this.lux({ x: g.openLightX, y: 0.011, z: g.openLightZ }) >= 1) {
        this.gateOpen = true;
        this.root.children.filter((c) => c.name === 'gate').forEach((c) => {
          c.visible = false;
          if (c.userData.collider) this.colliders = this.colliders.filter((col) => col !== c.userData.collider);
        });
        bus.emit('hint', { text: 'Ворота открыты — дальше пустая комната' });
      }
    }
    // Level exit: the far door opens with the gate (no boss in this level).
    // A level without a gate has nothing to open first: its exit opens at once.
    if (!this.data.boss && !this.bossDefeated && (this.gateOpen || !this.data.gate)) {
      this.bossDefeated = true;
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
  atExit(heroX, heroZ = 0) {
    if (!this.bossDefeated) return false;   // the exit is closed until its condition is met
    return heroX >= this.data.exit.x - 0.05;
  }

  /** Boss name and HP fraction for the boss bar, or null when there is no live boss. */
  bossInfo() {
    if (!this.boss || !this.boss.alive) return null;
    return { name: this.boss.name, frac: this.boss.hpFraction };
  }

  /** Removes everything this level added to the scene. */
  /** Stone material for the walls and partitions of the basement. */
  makeStoneMaterial() {
    const tex = createStoneTexture(512);
    tex.repeat.set(4, 2);
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0.0 });
  }

  /** Stone floor of the basement (its own, not the drawer's wood). */
  addStoneFloor() {
    const tex = createStoneTexture(512);
    tex.repeat.set(9, 3);
    const b = this.data.bounds;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(b.maxX - b.minX + 2, b.halfZ * 2 + 1),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((b.minX + b.maxX) / 2, 0, 0);
    floor.receiveShadow = true;
    this.root.add(floor);
  }

  /** Wood floor of the drawer (not used by the basement). */
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
