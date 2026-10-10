// Light damage on enemies: lux at the target, occlusion by geometry, and the damage formula.
import { DAMAGE_K } from '../core/config.js';
import { illuminance } from './BeamModel.js';

/** Slab test: does the segment a→b pass through an AABB? */
export function segmentHitsBox(a, b, box) {
  let tMin = 0;
  let tMax = 1;
  for (const k of ['x', 'y', 'z']) {
    const d = b[k] - a[k];
    const lo = box.min[k];
    const hi = box.max[k];
    if (Math.abs(d) < 1e-9) {
      if (a[k] < lo || a[k] > hi) return false;
    } else {
      let t1 = (lo - a[k]) / d;
      let t2 = (hi - a[k]) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return false;
    }
  }
  return true;
}

/** True if any box lies between a and b (light does not pass through walls). */
export function isBlocked(a, b, boxes) {
  return boxes.some((box) => segmentHitsBox(a, b, box));
}

/**
 * Lux at a world point from the beam. 0 if the beam is blocked by geometry.
 * @param {{origin, axis, point, cd:number, lumens:number, boxes}} p
 */
export function luxOnTarget({ origin, axis, point, cd, lumens, boxes }) {
  const lux = illuminance({ origin, axis, point, cd, lumens });
  if (lux <= 0) return 0;
  return isBlocked(origin, point, boxes) ? 0 : lux;
}

/** Damage per second: DAMAGE_K * log10(E / threshold) if E > threshold, else 0. */
export function dpsFromLux(lux, threshold) {
  if (threshold == null || !(lux > threshold)) return 0;
  return DAMAGE_K * Math.log10(lux / threshold);
}
