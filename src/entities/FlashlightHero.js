// The player: the flashlight stands on its tail and hops.
// Beam is aimed at the floor in front of the hero (the body stays upright, the head points where the beam lands).
import * as THREE from 'three';
import { buildFlashlight } from '../assets/FlashlightModels.js';
import { GRAVITY, AIM, HALO } from '../core/config.js';
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

    this.pivot = new THREE.Group();
    this.pivot.add(this.model);
    scene.add(this.pivot);

    this.position = new THREE.Vector3(0, 0, 0.6); // feet on the floor
    this.velocity = new THREE.Vector3();
    this.onGround = false;
    this.size = { hx: this.radiusM * 1.5, hz: this.radiusM * 1.5, h: this.lengthM };

    this.speed = hopSpeed(this.spec.massG);
    this.jumpV = jumpVelocity(this.spec.massG);

    this.hopPhase = 0;
    this.squash = 0;   // -1..1, negative = squashed on landing
    this.lean = 0;     // radians, toward movement

    // Facing = direction the hero moves toward. Forward vector = (sin h, 0, -cos h).
    this.heading = 0;
    // Beam: a floor point in front of the hero, set by arrow keys.
    this.aimYawOffset = 0;               // rad, left/right of heading
    this.aimReach = AIM.reachDefault;    // m, distance on the floor

    // Halo: faint warm spill that follows the hero.
    this.halo = new THREE.PointLight(HALO.color, HALO.intensity, HALO.distance, 2);
    scene.add(this.halo);

    // Derived each frame.
    this.headWorld = new THREE.Vector3();
    this.beamTarget = new THREE.Vector3();
  }

  /**
   * Advances physics and animation.
   * @param {number} dt seconds
   * @param {{ x: number, z: number }} move input axes (-1..1), camera-relative
   * @param {{ x: number, y: number }} aim arrow axes: x = left/right yaw, y = up/down reach
   * @param {import('../physics/Physics.js').AABB[]} boxes static obstacles
   * @param {boolean} jumpPressed jump edge this frame
   */
  update(dt, move, aim, boxes, jumpPressed) {
    const moving = Math.hypot(move.x, move.z) > 0.01;
    this.velocity.x = moving ? move.x * this.speed : 0;
    this.velocity.z = moving ? move.z * this.speed : 0;

    // Turn toward movement direction.
    if (moving) {
      const targetHeading = Math.atan2(move.x, -move.z);
      this.heading += shortestAngle(this.heading, targetHeading) * Math.min(1, dt * 8);
    }

    if (jumpPressed && this.onGround) {
      this.velocity.y = this.jumpV;
      this.onGround = false;
      this.squash = 0.4;
    }

    this.velocity.y -= GRAVITY * dt;
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.position.y += this.velocity.y * dt;

    const res = resolveBoxes(this.position, this.size, boxes);
    if (res.onGround) {
      if (this.velocity.y < -1) this.squash = -0.5;
      this.velocity.y = 0;
      this.onGround = true;
    }
    if (this.position.y < 0) {
      this.position.y = 0;
      this.velocity.y = 0;
      this.onGround = true;
    }

    // Lean and springy squash/stretch.
    const targetLean = moving ? -move.z * 0.12 : 0;
    this.lean += (targetLean - this.lean) * Math.min(1, dt * 10);
    this.squash += (0 - this.squash) * Math.min(1, dt * 8);

    // Hop bounce while grounded and moving.
    if (moving && this.onGround) this.hopPhase += dt * 9;
    const hop = moving && this.onGround ? Math.abs(Math.sin(this.hopPhase)) * 0.02 : 0;

    // Beam aim from arrow keys.
    this.aimYawOffset = THREE.MathUtils.clamp(
      this.aimYawOffset + aim.x * AIM.yawSpeed * dt, -Math.PI / 2, Math.PI / 2
    );
    this.aimReach = THREE.MathUtils.clamp(
      this.aimReach - aim.y * AIM.reachSpeed * dt, AIM.reachMin, AIM.reachMax
    );

    // Apply to visuals.
    this.pivot.position.copy(this.position);
    this.pivot.position.y += hop;
    this.pivot.rotation.set(this.lean, this.heading, 0, 'YXZ');
    const sy = 1 + this.squash * 0.15;
    const sxz = 1 - this.squash * 0.07;
    this.model.scale.set(sxz, sy, sxz);

    // Head position and beam target (floor point in front of the hero).
    this.headWorld.set(this.position.x, this.position.y + this.lengthM, this.position.z);
    const dir = this.forwardDir();
    this.beamTarget.set(
      this.position.x + dir.x * this.aimReach,
      0.02,
      this.position.z + dir.z * this.aimReach
    );

    this.halo.position.set(this.position.x, this.position.y + this.lengthM * 0.6, this.position.z);
  }

  /** Horizontal beam direction (unit, XZ plane), including the arrow-key yaw offset. */
  forwardDir() {
    const a = this.heading + this.aimYawOffset;
    return new THREE.Vector3(Math.sin(a), 0, -Math.cos(a));
  }
}

/** Shortest signed angle from a to b, in radians. */
function shortestAngle(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
