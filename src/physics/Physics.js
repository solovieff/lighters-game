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
 * Pushes a hero box out of static AABB obstacles.
 * The hero is an axis-aligned box: half sizes hx, hz (horizontal) and height h. The test runs several passes,
 * so a hero that ends up overlapping a second box in the same frame is pushed out of that too.
 * @param {THREE.Vector3} pos feet position (mutated)
 * @param {{hx:number, hz:number, h:number}} size
 * @param {AABB[]} boxes
 * @returns {{ onGround: boolean, hitWall: boolean }}
 */
export function resolveBoxes(pos, size, boxes) {
  const res = { onGround: false, hitWall: false };
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (const b of boxes) {
      if (!overlaps(pos, size, b)) continue;
      moved = true;
      const p = pushOut(pos, size, b);
      if (p.axis === 'y' && p.dir > 0) res.onGround = true;
      if (p.axis !== 'y') res.hitWall = true;
    }
    if (!moved) break;
  }
  return res;
}

/** True if the hero box overlaps the AABB (strict, so touching faces do not count). */
function overlaps(pos, size, b) {
  return pos.x + size.hx > b.min.x && pos.x - size.hx < b.max.x &&
    pos.z + size.hz > b.min.z && pos.z - size.hz < b.max.z &&
    pos.y + size.h > b.min.y && pos.y < b.max.y;
}

/**
 * Moves the hero out of one box along the axis of smallest penetration, toward the side it came from.
 * The side is chosen by comparing the hero's centre with the box centre, not by the raw overlap.
 */
function pushOut(pos, size, b) {
  const cx = (b.min.x + b.max.x) / 2;
  const cz = (b.min.z + b.max.z) / 2;
  const cy = (b.min.y + b.max.y) / 2;
  // Penetration depth on each axis (positive = overlapping by this much).
  const penX = Math.min(pos.x + size.hx - b.min.x, b.max.x - (pos.x - size.hx));
  const penY = Math.min(pos.y + size.h - b.min.y, b.max.y - pos.y);
  const penZ = Math.min(pos.z + size.hz - b.min.z, b.max.z - (pos.z - size.hz));

  if (penY <= penX && penY <= penZ) {
    // Land on top or hit the ceiling: push along Y toward the side the hero is on.
    const dir = pos.y + size.h / 2 > cy ? 1 : -1;
    pos.y = dir > 0 ? b.max.y : b.min.y - size.h;
    return { axis: 'y', dir };
  }
  if (penX <= penZ) {
    const dir = pos.x > cx ? 1 : -1;
    pos.x = dir > 0 ? b.max.x + size.hx : b.min.x - size.hx;
    return { axis: 'x', dir };
  }
  const dir = pos.z > cz ? 1 : -1;
  pos.z = dir > 0 ? b.max.z + size.hz : b.min.z - size.hz;
  return { axis: 'z', dir };
}
