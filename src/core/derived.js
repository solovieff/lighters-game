// Derived gameplay parameters (balance). Specs stay in data/flashlights.js.
import { GRAVITY } from './config.js';

/** Hop speed in m/s, scaled by mass so heavy lights move slower. */
export function hopSpeed(massG) {
  return 1.2 * (100 / massG) ** 0.15;
}

/** Jump launch velocity in m/s. Fireflies ≈ 0.3 m high, MS18 ≈ 0.1 m. */
export function jumpVelocity(massG) {
  return 2.6 * (100 / massG) ** 0.2;
}

/** Peak jump height in m for a given mass, from v0^2 / (2g). */
export function jumpHeight(massG) {
  const v0 = jumpVelocity(massG);
  return (v0 * v0) / (2 * GRAVITY);
}
