// Mouse quest on the drawer: shine the beam into the left corner, a mouse runs out and eats the pencil.
// Not a combat enemy: no HP, no damage, no AI states. A small state machine: wait -> run -> eat -> gone.
import * as THREE from 'three';
import { bus } from '../core/EventBus.js';

const RUN_SPEED = 0.6;     // m/s, the mouse runs toward the pencil
const EAT_SEC = 1.5;       // s, eating the pencil
const NOTICE_LUX = 1;      // lux on the corner that the mouse notices (a faint spill does not count)

export class MouseQuest {
  /**
   * @param {THREE.Scene|THREE.Group} parent where the mouse mesh lives (the level root)
   * @param {object} quest data from levels.js (quest block)
   * @param {{x:number,z:number}} pencilAt the point the mouse eats (the crate's spot)
   */
  constructor(parent, quest, pencilAt) {
    this.quest = quest;
    this.pencilAt = pencilAt;
    this.state = 'wait';        // wait | run | eat | done
    this.timer = 0;
    this.onEaten = null;      // set by the level: called once when the pencil is gone
    this.group = new THREE.Group();
    this.group.position.set(quest.mouseStart.x, 0, quest.mouseStart.z);
    this.group.visible = false;
    this.buildMouse(this.group);
    parent.add(this.group);
  }

  /** A small grey mouse: round body, ears, tail. Built from primitives. */
  buildMouse(g) {
    const fur = new THREE.MeshStandardMaterial({ color: '#8a8580', roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), fur);
    body.scale.set(1.6, 0.9, 1);
    body.position.y = 0.03;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), fur);
    head.position.set(0.05, 0.035, 0);
    g.add(head);
    for (const sz of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.CircleGeometry(0.012, 8), new THREE.MeshStandardMaterial({ color: '#c7a6a6', side: THREE.DoubleSide }));
      ear.position.set(0.05, 0.055, sz * 0.015);
      g.add(ear);
    }
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.08, 4), fur);
    tail.rotation.z = Math.PI / 2 + 0.6;
    tail.position.set(-0.07, 0.02, 0);
    g.add(tail);
  }

  /**
   * @param {number} dt
   * @param {(p:{x:number,y:number,z:number})=>number} lux lux at a point (the beam readout), 0 when nothing shines there
   * @param {{x:number,z:number}} pencil
   */
  update(dt, lux, pencil) {
    if (this.state === 'done') return;
    const cx = this.quest.lightTargetX;
    const cz = this.quest.lightTargetZ;

    if (this.state === 'wait') {
      // Start only when the beam actually reaches the corner at real lux. A sweep passes it in a few frames,
      // so there is no waiting time: the first lit frame sends the mouse out.
      if (lux({ x: cx, y: 0.011, z: cz }) >= NOTICE_LUX) {
        this.state = 'run';
        this.group.visible = true;
        bus.emit('hint', { text: 'Мышка! Она хочет карандаш' });
      }
    } else if (this.state === 'run') {
      const dx = pencil.x - this.group.position.x;
      const dz = pencil.z - this.group.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.05) {
        this.state = 'eat';
        this.timer = 0;
      } else {
        const step = Math.min(d, RUN_SPEED * dt);
        this.group.position.x += (dx / d) * step;
        this.group.position.z += (dz / d) * step;
        this.group.rotation.y = Math.atan2(-dz, dx);
      }
    } else if (this.state === 'eat') {
      this.timer += dt;
      if (this.timer >= EAT_SEC) {
        this.state = 'done';
        this.group.visible = false;
        this.onEaten?.();   // the level hides the pencil and its eraser
        bus.emit('questDone', { id: this.quest.id });
      }
    }
  }

  /** True once the mouse has eaten the pencil. */
  isDone() {
    return this.state === 'done';
  }

  dispose() {
    this.group.parent?.remove(this.group);
  }
}
