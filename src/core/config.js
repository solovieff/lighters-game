// Gameplay balance constants. Flashlight specs live in src/data/flashlights.js and must not be changed here.

export const RANGE_SCALE = 0.02;          // game range = real range * RANGE_SCALE
export const HOT_FRACTION = 0.5;          // share of lumens in the hotspot
export const SPILL_ANGLE_DEG = 60;        // spill half-angle
export const RUNTIME_TIME_SCALE = 60;     // 1 real minute = 1 game second
export const TURBO_TIME_SCALE = 0.1;      // compresses Turbo step durations
export const MIN_TURBO_STEP_SEC = 4;      // minimal Turbo step duration
export const GRAVITY = 9.81;              // m/s^2
export const MAX_DT = 0.05;               // clamp for frame delta time (s)

// Heat, in °C and game seconds.
export const HEAT = {
  startC: 25,
  coolRateCps: 0.5,          // °C per game second when not holding Turbo
  turboRecoverMarginC: 15,   // Turbo available again only below thermalLimitC - this
};

// Sag (no regulatedBoost): brightness falls to minFactor at 0% charge.
export const SAG = { thresholdPct: 10, minFactor: 0.5 };
// Regulated boost (Fireflies): flat down to thresholdPct, then halves every halvingSec.
export const LVP = { thresholdPct: 3, halvingSec: 1 };

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

// Beam visuals (purely cosmetic, does not affect gameplay).
export const BEAM_VIS = {
  intensityK: 3,          // SpotLight intensity = K * log10(lumens + 1)
  decay: 1.5,
  coneOpacity: 0.22,
  minAngle: 0.05,         // rad, narrowest visual cone
  moteCount: 70,
  moteSize: 0.012,
};

// Light mode the game starts in (index into flashlight.modes). 2 = "30%" for Convoy.
export const START_MODE_INDEX = 2;

export const CAMERA = {
  fov: 55,
  distance: 1.6,   // behind player (m)
  height: 0.9,     // above player (m)
};

export const RENDER = {
  shadowMapSize: 1024,
};

// Enemy damage and combat timing.
export const DAMAGE_K = 10;        // %/s per decade above threshold: dps = DAMAGE_K * log10(E / threshold)
export const INVULN_SEC = 0.8;     // hero invulnerability after a hit
export const KNOCKBACK_M = 0.25;   // hero push-back distance on a hit (m)
export const EVAP_SEC = 0.8;       // evaporation time of a killed shadow
export const BLOCK_SEC = 1.0;      // "block" window: half damage after the first hit
export const ATTACK_TOKENS = 2;    // max enemies attacking the hero at once (Squad)
export const MOTH_MAX_CLING = 3;   // max moths clinging to the light
export const MOTH_CLING_DIM = 0.2; // each moth cuts brightness by 20 %
export const MOTH_DARK_RESET_SEC = 2; // light off this long removes clinging moths
