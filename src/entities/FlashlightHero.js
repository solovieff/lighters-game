// The player: the flashlight stands on its tail and hops.
// Beam is aimed at the floor in front of the hero (the body stays upright, the head points where the beam lands).
import * as THREE from 'three';
import { buildFlashlight } from '../assets/FlashlightModels.js';
import { GRAVITY, AIM, HALO } from '../core/config.js';
import { hopSpeed, jumpVelocity } from '../core/derived.js';
import { FLASHLIGHTS } from '../data/flashlights.js';
import { resolveBoxes } from '../physics/Physics.js';

// Maximum lean angle toward the movement direction (rad), about 9 degrees.
const MAX_LEAN = 0.16;
const UP = new THREE.Vector3(0, 1, 0);

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

    // Flashlight lies horizontally: the model's +Y (head) points along the beam direction.
    // Physics still uses an upright box (see this.size); only the visual pivot is laid down.
    // Model head (+Y) lies along +Z of the pivot; pivot yaw then sets the real direction of the head.
    // Head tip points along +Z of the pivot (flipped by PI so lookAt(beamDir) lands the head on the beam).
    this.model.rotation.set(-Math.PI / 2, 0, Math.PI);
    this.model.position.y = this.radiusM;
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

    // Lean: smoothed tilt angle and the world direction it tilts toward.
    this.leanAmount = 0;
    this.leanDir = new THREE.Vector3(0, 0, 1);

    // Facing = direction the hero moves toward. Forward vector = (sin h, 0, -cos h).
    this.heading = 0;
    // Beam: a floor point in front of the hero, set by arrow keys.

    // Halo: faint warm spill that follows the hero.
    this.halo = new THREE.PointLight(HALO.color, HALO.intensity, HALO.distance, 2);
    scene.add(this.halo);

    // Knockback: a short horizontal push that decays each frame.
    this.knock = new THREE.Vector3();

    // Derived each frame.
    this.headWorld = new THREE.Vector3();
    this.beamTarget = new THREE.Vector3();
    this.beamDir = new THREE.Vector3(0, -1, 0);

    this.qHeading = new THREE.Quaternion();
    this.qLean = new THREE.Quaternion();
  }

  /**
   * Advances physics and animation.
   * @param {number} dt seconds
   * @param {{ x: number, z: number }} move input axes (-1..1), camera-relative
   * @param {{ x: number, y: number }} aim turning axis from arrows: x = yaw (all four arrows)
   * @param {import('../physics/Physics.js').AABB[]} boxes static obstacles
   * @param {boolean} jumpPressed jump edge this frame
   */
  update(dt, move, aim, boxes, jumpPressed) {
    const moving = Math.hypot(move.x, move.z) > 0.01;
    this.velocity.x = moving ? move.x * this.speed : 0;
    this.velocity.z = moving ? move.z * this.speed : 0;

    // Turn toward movement direction.
    if (moving && Math.abs(aim.x) === 0) {
      const targetHeading = Math.atan2(move.x, -move.z);
      this.heading += shortestAngle(this.heading, targetHeading) * Math.min(1, dt * 8);
    }

    if (jumpPressed && this.onGround) {
      this.velocity.y = this.jumpV;
      this.onGround = false;
      this.squash = 0.4;
    }

    this.velocity.y -= GRAVITY * dt;
    this.position.x += (this.velocity.x + this.knock.x) * dt;
    this.position.z += (this.velocity.z + this.knock.z) * dt;
    this.position.y += this.velocity.y * dt;
    this.knock.multiplyScalar(Math.max(0, 1 - dt * 8));

    // Body and head together: repeat until neither the feet box nor the head tip overlaps a wall.
    let res = { onGround: false, hitWall: false };
    for (let pass = 0; pass < 4; pass++) {
      const r = resolveBoxes(this.position, this.size, boxes);
      res.onGround = res.onGround || r.onGround;
      res.hitWall = res.hitWall || r.hitWall;
      this.keepHeadOutOfWalls(boxes);
    }
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

    this.updateLean(dt, moving, move);
    this.squash += (0 - this.squash) * Math.min(1, dt * 8);

    // Hop bounce while grounded and moving.
    if (moving && this.onGround) this.hopPhase += dt * 9;
    const hop = moving && this.onGround ? Math.abs(Math.sin(this.hopPhase)) * 0.02 : 0;

    // Arrows turn the whole flashlight: the body itself rotates, so the beam always comes from the head.
    // Free rotation in a full circle; heading is wrapped to [-π, π).
    if (aim.x !== 0) this.heading = wrapAngle(this.heading + aim.x * AIM.yawSpeed * dt);

    // Beam is horizontal at head height: yaw only, full circle.
    this.beamDir.copy(this.forwardDir());
    this.beamDir.y = 0;
    this.beamDir.normalize();

    // Apply to visuals: heading first, then lean in world space (works for any direction).
    this.pivot.position.copy(this.position);
    this.pivot.position.y += hop;
    // Pivot yaw: model head points along beamDir (the pivot's +Z is the head direction).
    this.qHeading.setFromAxisAngle(UP, this.heading);
    this.qLean.setFromUnitVectors(UP, this.leanTiltVector());
    // Body faces the beam: the whole pivot looks along beamDir, so the lying head always points where light goes.
    this.pivot.position.copy(this.position);
    this.pivot.position.y += hop;
    this.pivot.lookAt(
      this.pivot.position.x + this.beamDir.x,
      this.pivot.position.y,
      this.pivot.position.z + this.beamDir.z
    );

    const sy = 1 + this.squash * 0.15;
    const sxz = 1 - this.squash * 0.07;
    this.model.scale.set(sxz, sy, sxz);

    // Head position and beam target (floor point in front of the hero).
    // Head is the lit end, at the horizontal tip of the lying flashlight.
    // Head = the real world tip of the lying model, so the beam always starts at the lens.
    this.pivot.updateMatrixWorld(true);
    this.model.getWorldPosition(this.headWorld);
    this.headWorld.copy(this.headTipLocal()).applyMatrix4(this.model.matrixWorld);
    // Beam target: 2 m along the beam from the head (beamDir computed earlier in update).
    this.beamTarget.copy(this.headWorld).addScaledVector(this.beamDir, 2);

    this.halo.position.set(this.position.x, this.position.y + this.radiusM * 3, this.position.z);
  }

  /**
   * The lying body sticks out in front of the feet. If the head tip ends up inside a wall, the hero is pushed
   * back along the axis of the smallest penetration of the tip (out through the face it came in through).
   */
  keepHeadOutOfWalls(boxes) {
    const L = this.lengthM;
    for (const b of boxes) {
      if (this.position.y >= b.max.y || this.position.y + this.size.h <= b.min.y) continue;
      const tip = { x: this.position.x + this.beamDir.x * L, z: this.position.z + this.beamDir.z * L };
      if (!(tip.x > b.min.x && tip.x < b.max.x && tip.z > b.min.z && tip.z < b.max.z)) continue;
      // Smallest move of the hero that takes the tip out of this box, on either horizontal axis.
      const outX = Math.min(tip.x - b.min.x, b.max.x - tip.x);
      const outZ = Math.min(tip.z - b.min.z, b.max.z - tip.z);
      if (outX <= outZ) {
        const sign = tip.x - b.min.x < b.max.x - tip.x ? -1 : 1;
        this.position.x += sign * (outX + 1e-4);
      } else {
        const sign = tip.z - b.min.z < b.max.z - tip.z ? -1 : 1;
        this.position.z += sign * (outZ + 1e-4);
      }
    }
  }

  /** Local-space position of the model's head tip (end of the body, before the model's matrix). */
  headTipLocal() {
    return new THREE.Vector3(0, this.lengthM, 0);
  }

  /**
   * Smooths the lean amount and direction toward the current movement.
   * Lean goes toward the movement in any direction: sideways, forward, diagonal.
   */
  updateLean(dt, moving, move) {
    const targetAmount = moving ? MAX_LEAN : 0;
    this.leanAmount += (targetAmount - this.leanAmount) * Math.min(1, dt * 10);
    if (moving) {
      const d = new THREE.Vector3(move.x, 0, move.z).normalize();
      this.leanDir.lerp(d, Math.min(1, dt * 10)).normalize();
    }
  }

  /** Tilted "up" vector: the body leans toward leanDir by leanAmount. */
  leanTiltVector() {
    const c = Math.cos(this.leanAmount);
    const s = Math.sin(this.leanAmount);
    return new THREE.Vector3(
      UP.x * c + this.leanDir.x * s,
      c,
      UP.z * c + this.leanDir.z * s
    ).normalize();
  }

  /**
   * Pushes the hero back from an attacker. Heavy lights are not knocked back (assumption: not implemented yet).
   * @param {{x:number,z:number}} dir unit direction away from the attacker
   * @param {number} meters push distance
   */
  knockback(dir, meters) {
    const v = Math.sqrt(2 * 8 * meters); // initial speed for a quick decaying push
    this.knock.x += dir.x * v;
    this.knock.z += dir.z * v;
  }

  /** Horizontal beam direction (unit, XZ plane), including the arrow-key yaw offset. */
  forwardDir() {
    const a = this.heading;
    return new THREE.Vector3(Math.sin(a), 0, -Math.cos(a));
  }
}

/** Wraps an angle into [-π, π). */
export function wrapAngle(a) {
  return a - Math.PI * 2 * Math.floor((a + Math.PI) / (Math.PI * 2));
}

/** Shortest signed angle from a to b, in radians. */
function shortestAngle(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
