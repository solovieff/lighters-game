// The player: the flashlight stands on its tail and hops.
// Stage 3 covers: gravity, hop movement, jump, AABB collisions, squash/stretch, lean, head tilt by arrow keys.
import * as THREE from 'three';
import { buildFlashlight } from '../assets/FlashlightModels.js';
import { GRAVITY } from '../core/config.js';
import { hopSpeed, jumpVelocity } from '../core/derived.js';
import { FLASHLIGHTS } from '../data/flashlights.js';
import { resolveBoxes } from '../physics/Physics.js';

export class FlashlightHero {
  /**
   * @param {THREE.Scene} scene
   * @param {string} flashlightId spec id from FLASHLIGHTS
   */
  constructor(scene, flashlightId = 'convoy_s2plus_sst40') {
    this.spec = FLASHLIGHTS.find((f) => f.id === flashlightId);
    const built = buildFlashlight(flashlightId);
    this.model = built.group;
    this.lengthM = built.lengthM;
    this.radiusM = built.radiusM;

    // Pivot: the model's own origin is at the tail; we tilt a parent pivot.
    this.pivot = new THREE.Group();
    this.pivot.add(this.model);
    scene.add(this.pivot);

    this.position = new THREE.Vector3(0, 0, 0.6); // feet on the floor
    this.velocity = new THREE.Vector3();
    this.onGround = false;
    this.size = { hx: this.radiusM * 1.5, hz: this.radiusM * 1.5, h: this.lengthM };

    this.speed = hopSpeed(this.spec.massG);
    this.jumpV = jumpVelocity(this.spec.massG);

    // Hop cycle: short bounces while moving.
    this.hopPhase = 0;
    this.squash = 0;        // -1..1, negative = squashed on landing
    this.lean = 0;          // radians, toward movement
    this.tilt = { x: 0, z: 0 }; // head tilt from arrow keys (rad)
    this.beamDir = new THREE.Vector3(0, 1, 0); // where the head points
  }

  /**
   * Advances physics and animation.
   * @param {number} dt seconds
   * @param {{ x: number, z: number }} move input axes (-1..1), camera-relative
   * @param {{ x: number, y: number }} aim input axes for head tilt (-1..1)
   * @param {import('../physics/Physics.js').AABB[]} boxes static obstacles
   * @param {boolean} jumpPressed jump edge this frame
   */
  update(dt, move, aim, boxes, jumpPressed) {
    // Horizontal velocity from input. Hops: movement is applied only while airborne or on hop peaks.
    const moving = Math.hypot(move.x, move.z) > 0.01;
    const vx = moving ? move.x * this.speed : 0;
    const vz = moving ? move.z * this.speed : 0;
    this.velocity.x = vx;
    this.velocity.z = vz;

    if (jumpPressed && this.onGround) {
      this.velocity.y = this.jumpV;
      this.onGround = false;
      this.squash = 0.4; // stretch on takeoff
    }

    this.velocity.y -= GRAVITY * dt;

    // Integrate and collide per axis.
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.position.y += this.velocity.y * dt;

    const res = resolveBoxes(this.position, this.size, boxes);
    if (res.onGround) {
      if (this.velocity.y < -1) this.squash = -0.5; // squash on landing
      this.velocity.y = 0;
      this.onGround = true;
    }
    if (this.position.y < 0) {
      this.position.y = 0;
      this.velocity.y = 0;
      this.onGround = true;
    }

    // Lean toward movement and springy squash/stretch recovery.
    const targetLean = moving ? -move.z * 0.12 + move.x * 0.0 : 0;
    this.lean += (targetLean - this.lean) * Math.min(1, dt * 10);
    this.squash += (0 - this.squash) * Math.min(1, dt * 8);

    // Hop bounce only while grounded and moving (visual).
    if (moving && this.onGround) this.hopPhase += dt * 9;
    const hop = moving && this.onGround ? Math.abs(Math.sin(this.hopPhase)) * 0.02 : 0;

    // Head tilt from arrow keys: body leans up to 70 deg from vertical.
    const maxTilt = THREE.MathUtils.degToRad(70);
    this.tilt.x += (aim.y * 1.6 - this.tilt.x) * Math.min(1, dt * 6);
    this.tilt.z += (aim.x * 1.6 - this.tilt.z) * Math.min(1, dt * 6);
    this.tilt.x = THREE.MathUtils.clamp(this.tilt.x, -maxTilt, maxTilt);
    this.tilt.z = THREE.MathUtils.clamp(this.tilt.z, -maxTilt, maxTilt);

    // Apply to visuals.
    this.pivot.position.copy(this.position);
    this.pivot.position.y += hop;
    this.pivot.rotation.set(this.tilt.x + this.lean, 0, this.tilt.z, 'YXZ');
    const sy = 1 + this.squash * 0.15;
    const sxz = 1 - this.squash * 0.07;
    this.model.scale.set(sxz, sy, sxz);

    // Head direction in world space, used later by the beam.
    this.beamDir.set(0, 1, 0).applyEuler(this.pivot.rotation).normalize();
    this.headWorld = this.pivot.position.clone().add(new THREE.Vector3(0, this.lengthM, 0).applyEuler(this.pivot.rotation));
  }
}
