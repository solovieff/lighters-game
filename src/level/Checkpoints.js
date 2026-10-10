// Charging station = checkpoint. Stepping on it charges the battery to 100 % and sets the respawn point.
import * as THREE from 'three';
import { LEVEL } from '../core/config.js';

export class Checkpoint {
  /**
   * @param {THREE.Object3D} parent level root
   * @param {{id:string,x:number,z:number}} data
   */
  constructor(parent, data) {
    this.id = data.id;
    this.pos = new THREE.Vector3(data.x, 0, data.z);
    this.touching = false;

    const group = new THREE.Group();
    group.position.copy(this.pos);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.02, 0.07),
      new THREE.MeshStandardMaterial({ color: '#2b2d30', metalness: 0.8, roughness: 0.4 })
    );
    base.position.y = 0.01;
    group.add(base);

    // USB-C style socket with a glowing cable.
    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.1, 8),
      new THREE.MeshBasicMaterial({ color: '#7cff9a', toneMapped: false })
    );
    cable.position.set(0.06, 0.05, 0);
    cable.rotation.z = Math.PI / 2;
    group.add(cable);

    // Taller pad with a clearly visible green light: this is a station to stand on, not an item.
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.03, 0.1),
      new THREE.MeshStandardMaterial({ color: '#1a1c20', metalness: 0.6, roughness: 0.4 })
    );
    pad.position.y = 0.015;
    group.add(pad);

    const glow = new THREE.PointLight('#7cff9a', 0.35, 0.8, 2);
    glow.position.set(0, 0.08, 0);
    group.add(glow);

    parent.add(group);
  }

  /**
   * Edge detection: returns true on the frame the hero steps onto the station.
   * @param {{x:number,z:number}} heroPos
   */
  update(heroPos) {
    const d = Math.hypot(heroPos.x - this.pos.x, heroPos.z - this.pos.z);
    const inside = d < LEVEL.checkpointRadius;
    const entered = inside && !this.touching;
    this.touching = inside;
    return entered;
  }
}
