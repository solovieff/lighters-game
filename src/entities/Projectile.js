// Dark orb fired by the Watcher. Flies straight. main.js checks for a hit on the hero's head.
import * as THREE from 'three';

export class Projectile {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Vector3} from start point
   * @param {THREE.Vector3} dir direction (normalized inside)
   * @param {number} pct charge damage on hit (%)
   */
  constructor(scene, from, dir, pct, speed = 2.5, life = 5) {
    this.scene = scene;
    this.pct = pct;
    this.pos = from.clone();
    this.vel = dir.clone().normalize().multiplyScalar(speed);
    this.life = life;
    this.alive = true;
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 12, 10),
      new THREE.MeshStandardMaterial({
        color: '#12061f', emissive: '#4a1f8a', emissiveIntensity: 1.2, roughness: 1,
      })
    );
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh);
  }

  update(dt) {
    if (!this.alive) return;
    this.pos.addScaledVector(this.vel, dt);
    this.mesh.position.copy(this.pos);
    this.life -= dt;
    if (this.life <= 0) this.kill();
  }

  kill() {
    if (!this.alive) return;
    this.alive = false;
    this.scene.remove(this.mesh);
  }
}
