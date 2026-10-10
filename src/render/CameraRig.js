// Third-person camera that follows the hero from behind and above.
import * as THREE from 'three';
import { CAMERA } from '../core/config.js';

export class CameraRig {
  /** @param {THREE.PerspectiveCamera} camera */
  constructor(camera) {
    this.camera = camera;
    // CAMERA.phone is set from the screen in main.js: touch devices in landscape get the lower camera.
    this.yaw = 0;                  // horizontal orbit, controlled by keys
    this.target = new THREE.Vector3();
  }

  /**
   * Places the camera behind and above the target, then looks at it.
   * @param {THREE.Vector3} targetPos hero feet position
   * @param {number} dt seconds
   * @param {number} yawInput -1..1 from keys
   */
  update(targetPos, dt, yawInput = 0) {
    this.yaw += yawInput * dt * 2.2;
    // Phone in landscape: a lower, closer camera, so the table fills the short screen instead of a strip.
    const phone = CAMERA.phone;
    const dist = phone ? CAMERA.distance + 0.2 : CAMERA.distance + 0.8;
    const high = phone ? CAMERA.height - 0.25 : CAMERA.height + 0.6;
    const offset = new THREE.Vector3(
      Math.sin(this.yaw) * dist,
      high,
      Math.cos(this.yaw) * dist
    );
    this.target.lerp(targetPos.clone().add(new THREE.Vector3(0, 0.35, 0)), Math.min(1, dt * 10));
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }
}
