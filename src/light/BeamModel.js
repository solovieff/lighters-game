// Photometry of the beam: hotspot + spill model, illuminance and throw.
// Pure math (no three.js, no DOM), so it can be checked in plain Node.
import { HOT_FRACTION, SPILL_ANGLE_DEG, RANGE_SCALE } from '../core/config.js';

export const SPILL_ANGLE = (SPILL_ANGLE_DEG * Math.PI) / 180;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Hotspot half-angle in radians: acos(1 - HOT * lumens / (2π cd)). */
export function thetaHot(lumens, cd) {
  if (lumens <= 0 || cd <= 0) return 0;
  return Math.acos(clamp(1 - (HOT_FRACTION * lumens) / (2 * Math.PI * cd), -1, 1));
}

/** Spill candela, constant across the spill cone. */
export function cdSpill(lumens) {
  return ((1 - HOT_FRACTION) * lumens) / (2 * Math.PI * (1 - Math.cos(SPILL_ANGLE)));
}

/** ANSI FL1 real throw in meters: distance where illuminance = 0.25 lx. */
export function rangeReal(cd) {
  return 2 * Math.sqrt(Math.max(0, cd));
}

/** Throw in game meters. */
export function rangeGame(cd) {
  return rangeReal(cd) * RANGE_SCALE;
}

/** Effective candela seen at angle alpha (rad) from the beam axis. */
export function cdAtAngle(alpha, cd, lumens) {
  if (alpha <= thetaHot(lumens, cd)) return cd;
  if (alpha > SPILL_ANGLE) return 0;
  // Spill with smooth falloff toward the edge of the cone.
  return cdSpill(lumens) * (1 - smoothstep(SPILL_ANGLE * 0.5, SPILL_ANGLE, alpha));
}

/**
 * Illuminance in lux at a point. Coordinates are game meters.
 * @param {{origin:{x,y,z}, axis:{x,y,z}, point:{x,y,z}, cd:number, lumens:number}} p
 *        axis is a unit vector from origin along the beam.
 */
export function illuminance({ origin, axis, point, cd, lumens }) {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const dz = point.z - origin.z;
  const dGame = Math.hypot(dx, dy, dz);
  if (dGame < 1e-6 || cd <= 0 || lumens <= 0) return 0;

  const cosA = clamp((dx * axis.x + dy * axis.y + dz * axis.z) / dGame, -1, 1);
  const cdEff = cdAtAngle(Math.acos(cosA), cd, lumens);
  if (cdEff <= 0) return 0;

  // Game distance maps to real distance by dividing by RANGE_SCALE.
  const dReal = dGame / RANGE_SCALE;
  return cdEff / (dReal * dReal);
}

/**
 * Numbers for the startup check log, taken at the flashlight's max-lumens mode.
 * @param {object} spec entry from FLASHLIGHTS
 */
export function summarizeSpec(spec) {
  const top = spec.modes.reduce((a, b) => (b.lumens > a.lumens ? b : a));
  const real = rangeReal(top.cd);
  return {
    mode: top.name,
    thetaHotDeg: (thetaHot(top.lumens, top.cd) * 180) / Math.PI,
    throwReal: real,
    throwGame: real * RANGE_SCALE,
  };
}
