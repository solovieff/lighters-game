// Gameplay balance constants. Flashlight specs live in src/data/flashlights.js and must not be changed here.

export const RANGE_SCALE = 0.02;          // game range = real range * RANGE_SCALE
export const HOT_FRACTION = 0.5;          // share of lumens in the hotspot
export const SPILL_ANGLE_DEG = 60;        // spill half-angle
export const RUNTIME_TIME_SCALE = 60;     // 1 real minute = 1 game second
export const TURBO_TIME_SCALE = 0.1;      // compresses Turbo step durations
export const MIN_TURBO_STEP_SEC = 4;      // minimal Turbo step duration
export const GRAVITY = 9.81;              // m/s^2
export const MAX_DT = 0.05;               // clamp for frame delta time (s)

// Input timing.
export const CLICK = {
  TRIPLE_WINDOW_S: 0.6,   // three LMB clicks within this window = manual strobe
  DOUBLE_WINDOW_S: 0.35,  // two clicks within this window = double click (Turbo on anduril2)
};

// Beam aim with arrow keys: where the light lands on the floor in front of the hero.
export const AIM = {
  reachDefault: 1.2,   // m, floor point distance at start
  reachMin: 0.4,       // m
  reachMax: 4.0,       // m
  reachSpeed: 1.5,     // m/s when holding Up/Down
  yawSpeed: 2.0,       // rad/s when holding Left/Right
};

// Faint glow around the hero so the world is never pitch black (LED spill, not a world light).
export const HALO = {
  color: '#ffd9a0',
  intensity: 0.25,
  distance: 2.2,
};

export const CAMERA = {
  fov: 55,
  distance: 1.6,   // behind player (m)
  height: 0.9,     // above player (m)
};

export const RENDER = {
  shadowMapSize: 1024,
};
