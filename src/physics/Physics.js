// Axis-aligned bounding box collision for the hero. Boxes are static world obstacles.
import * as THREE from 'three';

/** An AABB obstacle in world space. */
export class AABB {
  constructor(min, max) {
    this.min = new THREE.Vector3().copy(min);
    this.max = new THREE.Vector3().copy(max);
  }

  static fromCenterSize(cx, cy, cz, sx, sy, sz) {
    return new AABB(
      new THREE.Vector3(cx - sx / 2, cy - sy / 2, cz - sz / 2),
      new THREE.Vector3(cx + sx / 2, cy + sy / 2, cz + sz / 2)
    );
  }
}

/**
 * Pushes a hero capsule-like box out of static AABB obstacles.
 * Hero is an axis-aligned box: half sizes hx, hz (horizontal) and height h.
 * @param {THREE.Vector3} pos feet position (mutated)
 * @param {{hx:number, hz:number, h:number}} size
 * @param {AABB[]} boxes
 * @returns {{ onGround: boolean, hitWall: boolean }}
 */
export function resolveBoxes(pos, size, boxes) {
  const res = { onGround: false, hitWall: false };
  for (const b of boxes) {
    const pMin = { x: pos.x - size.hx, y: pos.y, z: pos.z - size.hx };
    const pMax = { x: pos.x + size.hx, y: pos.y + size.h, z: pos.z + size.hx };
    if (pMax.x <= b.min.x || pMin.x >= b.max.x) continue;
    if (pMax.y <= b.min.y || pMin.y >= b.max.y) continue;
    if (pMax.z <= b.min.z || pMin.z >= b.max.z) continue;

    // Smallest penetration axis decides the push direction.
    const penX1 = pMax.x - b.min.x, penX2 = b.max.x - pMin.x;
    const penY1 = pMax.y - b.min.y, penY2 = b.max.y - pMin.y;
    const penZ1 = pMax.z - b.min.z, penZ2 = b.max.z - pMin.z;
    const px = penX1 < penX2 ? -penX1 : penX2;
    const py = penY1 < penY2 ? -penY1 : penY2;
    const pz = penZ1 < penZ2 ? -penZ1 : penZ2;
    const ax = Math.abs(px), ay = Math.abs(py), az = Math.abs(pz);

    if (ay <= ax && ay <= az) {
      pos.y += py;
      if (py > 0) res.onGround = true;
    } else if (ax <= az) {
      pos.x += px;
      res.hitWall = true;
    } else {
      pos.z += pz;
      res.hitWall = true;
    }
  }
  return res;
}
