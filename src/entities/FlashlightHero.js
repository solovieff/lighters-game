// The player: the flashlight stands on its tail and hops.
// Beam is aimed at the floor in front of the hero (the body stays upright, the head points where the beam lands).
import * as THREE from 'three';
import { buildFlashlight } from '../assets/FlashlightModels.js';
import { GRAVITY, AIM, HALO } from '../core/config.js';
import { hopSpeed, jumpVelocity } from '../core/derived.js';
import { FLASHLIGHTS } from '../data/flashlights.js';

// Maximum lean angle toward the movement direction (rad), about 9 degrees.
const MAX_LEAN = 0.16;
const HOP_SEC = 0.35;        // s, duration of one hop
const HOP_HEIGHT = 0.15;     // m, lift during a hop: clears props up to this height (pencil 0.14 m), not walls (0.20 m)
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
    this.size = { hx: this.radiusM * 1.5, hz: this.radiusM * 1.5, h: this.lengthM };

    this.speed = hopSpeed(this.spec.massG);
    this.jumpV = jumpVelocity(this.spec.massG);

    this.hopPhase = 0;
    this.hopT = 0;     // s left in the current hop
    this.lift = 0;     // m, current lift above the table
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

    // Turn toward movement direction (arrows override it while held).
    if (moving && Math.abs(aim.x) === 0) {
      const targetHeading = Math.atan2(move.x, -move.z);
      this.heading += shortestAngle(this.heading, targetHeading) * Math.min(1, dt * 8);
    }

    // Flat movement on the table: the flashlight hangs at one level. Jump = a short hop that lifts it
    // over low obstacles. There is no gravity or floor-stacking; walls and props stop it.
    if (jumpPressed && this.hopT <= 0) this.hopT = HOP_SEC;
    this.hopT = Math.max(0, this.hopT - dt);
    const lifted = this.hopT > 0;
    this.lift = lifted ? HOP_HEIGHT : 0;

    const vx = (moving ? move.x * this.speed : 0) + this.knock.x;
    const vz = (moving ? move.z * this.speed : 0) + this.knock.z;
    this.moveAxis(vx * dt, 0, boxes);
    this.moveAxis(0, vz * dt, boxes);
    this.knock.multiplyScalar(Math.max(0, 1 - dt * 8));

    // Hop bounce and squash for the visual only.
    if (moving) this.hopPhase += dt * 9;
    const hop = this.lift + (moving ? Math.abs(Math.sin(this.hopPhase)) * 0.01 : 0);
    this.squash += (0 - this.squash) * Math.min(1, dt * 8);
    this.updateLean(dt, moving, move);

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
   * Horizontal footprint of the whole body: a segment from the tail (feet point) to the head tip, thickened by
   * the body radius. The head leads the movement, so it is the first part that reaches a wall.
   * @returns {boolean} true if this footprint would overlap any box at the current lift
   */
  bodyHits(px, pz, boxes) {
    const r = this.radiusM * 1.5;
    const d = this.forwardDir();
    const hx = px + d.x * this.lengthM;   // head tip
    const hz = pz + d.z * this.lengthM;
    const bottom = this.lift;
    const top = this.lift + this.size.h;
    for (const b of boxes) {
      if (top <= b.min.y || bottom >= b.max.y) continue;      // height band misses the box
      if (bodyNearBox(px, pz, hx, hz, r, b)) return true;
    }
    return false;
  }

  /**
   * Moves the hero along one horizontal axis. The move is refused if the whole body would overlap a wall or prop,
   * so the head stops at the face of an obstacle. A hop lifts the body over obstacles it fully clears.
   * @param {number} dx displacement on X
   * @param {number} dz displacement on Z
   */
  moveAxis(dx, dz, boxes) {
    const nx = this.position.x + dx;
    const nz = this.position.z + dz;
    if (this.bodyHits(nx, nz, boxes)) {
      this.knock.set(0, 0, 0);
      return;
    }
    this.position.x = nx;
    this.position.z = nz;
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

/**
 * True if the segment (x0,z0)-(x1,z1) comes within radius r of the box's XZ footprint.
 * Implemented as a segment vs expanded rectangle slab test.
 */
function bodyNearBox(x0, z0, x1, z1, r, b) {
  const minX = b.min.x - r, maxX = b.max.x + r;
  const minZ = b.min.z - r, maxZ = b.max.z + r;
  const dx = x1 - x0, dz = z1 - z0;
  let tmin = 0, tmax = 1;
  for (const [p, d, lo, hi] of [[x0, dx, minX, maxX], [z0, dz, minZ, maxZ]]) {
    if (Math.abs(d) < 1e-12) {
      if (p < lo || p > hi) return false;
    } else {
      let t1 = (lo - p) / d;
      let t2 = (hi - p) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }
  }
  return true;
}

/** Shortest signed angle from a to b, in radians. */
function shortestAngle(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
