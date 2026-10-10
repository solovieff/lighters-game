// Light Shard: a glowing crystal worth Sparks. Collected when the hero walks over it.
// Secret shards get a floor mark: vivid with CRI >= 90, grey and faint otherwise.
import * as THREE from 'three';
import { LEVEL } from '../core/config.js';

export class Pickup {
  /**
   * @param {THREE.Object3D} parent group the crystal belongs to (the level root)
   * @param {{x:number,z:number,value:number,secret?:boolean}} data
   * @param {number} cri colour rendering index of the hero's light
   */
  constructor(parent, data, cri) {
    this.value = data.value;
    this.secret = !!data.secret;
    this.collected = false;
    this.pos = new THREE.Vector3(data.x, 0.06, data.z);
    this.time = Math.random() * 6;

    this.group = new THREE.Group();
    this.group.position.copy(this.pos);

    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.045, 0),
      new THREE.MeshStandardMaterial({ color: '#8fe8ff', emissive: '#8fe8ff', emissiveIntensity: 1.5, roughness: 0.2 })
    );
    this.group.add(crystal);
    this.crystal = crystal;

    const glow = new THREE.PointLight('#8fe8ff', 0.15, 0.6, 2);
    glow.position.set(0, 0.04, 0);
    this.group.add(glow);

    if (this.secret) {
      const vivid = cri >= 90;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.06, 0.08, 24),
        new THREE.MeshBasicMaterial({
          color: vivid ? '#ff4fd8' : '#4a4d55',
          transparent: true,
          opacity: vivid ? 0.9 : 0.35,
          side: THREE.DoubleSide,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -0.055;
      this.group.add(ring);
    }
    parent.add(this.group);
  }

  /**
   * Spins the crystal and checks pickup.
   * @param {number} dt
   * @param {{x:number,z:number}} heroPos feet position of the hero
   * @returns {boolean} true on the frame it is collected
   */
  update(dt, heroPos) {
    if (this.collected) return false;
    this.time += dt;
    this.crystal.rotation.y += dt * 1.5;
    this.crystal.position.y = Math.sin(this.time * 2.5) * 0.01;
    const d = Math.hypot(heroPos.x - this.pos.x, heroPos.z - this.pos.z);
    if (d < LEVEL.pickupRadius) {
      this.collected = true;
      this.group.visible = false;
      return true;
    }
    return false;
  }
}
