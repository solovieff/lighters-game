// Level 1 "Ящик стола" (tutorial). Layout in metres. The hero walks along +X from the start to the exit.
// Names and hints are Russian UI text.

export const LEVEL_1 = {
  id: 'drawer',
  name: 'Ящик стола',
  subtitle: 'Обучение',
  bounds: { minX: -0.5, maxX: 8.0, halfZ: 0.75 }, // drawer interior, extended to the empty room at the end
  wallHeight: 0.2,
  wallThickness: 0.04,
  start: { x: 0.0, z: 0.0 },

  // Internal walls (x0,x1,z0,z1 in metres). The paperclip maze: three baffles that force a zigzag, then two rooms
  // with a door before the exit corner. Nothing here can be skipped: the path runs through every gap.
  partitions: [
    { x0: 1.0, x1: 1.05, z0: -0.75, z1: 0.25 },   // maze baffle 1 (from the top wall), gap at the bottom
    { x0: 1.5, x1: 1.55, z0: -0.25, z1: 0.75 },   // maze baffle 2 (from the bottom wall), gap at the top
    { x0: 2.0, x1: 2.05, z0: -0.75, z1: 0.25 },   // maze baffle 3 (from the top wall), gap at the bottom
    { x0: 2.9, x1: 2.95, z0: -0.75, z1: 0.2 },    // room wall with a door at the top
    { x0: 2.9, x1: 2.95, z0: 0.4, z1: 0.75 },
    // Gate wall between the drawer and the empty room. The panel in the top corner is closed until the beam lights the corner.
    { x0: 3.97, x1: 4.0, z0: -0.75, z1: 0.45 },
    { x0: 3.97, x1: 4.0, z0: 0.45, z1: 0.75, h: 0.2, gate: true },
  ],

  // Props: pencils are logs across the lane, coins are stacked platforms, paper is a stack, ruler and clip are metal.
  props: [
    // A wooden crate across the whole lane (wall to wall): taller than one hop and as wide as the drawer, so it blocks the way.
    { kind: 'crate', x: 0.6, z: 0.0, w: 0.16, h: 0.25, d: 1.5 },
    { kind: 'coin', x: 1.45, z: 0.2, count: 2 },
    { kind: 'paper', x: 1.85, z: -0.3 },
    { kind: 'coin', x: 2.2, z: 0.35, count: 2 },
    { kind: 'ruler', x: 2.35, z: -0.55 },
    { kind: 'clip', x: 2.6, z: 0.45 },
  ],

  // Light Shards (Sparks). The secret one sits in a corner niche and is marked on the floor.
  shards: [
    { x: 0.2, z: -0.6, value: 30, secret: true },
    { x: 0.8, z: 0.45, value: 10 },
    { x: 1.45, z: -0.5, value: 15 },
    { x: 2.0, z: 0.1, value: 20 },
  ],

  // Charging stations: checkpoint + full charge.
  checkpoints: [
    { id: 'start', x: 0.0, z: 0.5 },
    { id: 'mid', x: 1.9, z: 0.5 },
    { id: 'boss', x: 2.95, z: -0.45 },
  ],

  // Enemy waves: only the weakest crawlers. The last one waits in the empty room beyond the gate.
  waves: [
    { id: 'w1', triggerX: 1.2, enemies: [
      { type: 'crawler', x: 1.7, z: 0.45 },
      { type: 'crawler', x: 2.6, z: -0.45 },
    ] },
    { id: 'w2', triggerX: 4.2, enemies: [
      { type: 'crawler', x: 6.0, z: -0.2 },
      { type: 'swarm', x: 6.6, z: 0.3 },
      { type: 'swarm', x: 6.8, z: 0.35 },
    ] },
  ],

  // No boss in the drawer: the exit opens when the hero reaches the end (see TableLevel.atExit).
  boss: null,

  // Mouse quest: shine into the left corner, a mouse runs out and eats the pencil.
  quest: { id: 'mouse', lightTargetX: -0.3, lightTargetZ: -0.6, mouseStart: { x: -0.4, z: -0.6 }, target: 'crate', targetX: 0.6, targetZ: 0.0 },

  // Lamps in the empty room: small glowing lamps that light the room for the eye (not part of the lux readout).
  lamps: [{ x: 4.6, z: -0.45 }, { x: 5.6, z: 0.45 }, { x: 7.0, z: -0.45 }],

  // Gate: the beam on the top-right corner opens the panel in the gate wall (the way into the empty room).
  gate: { openLightX: 3.7, openLightZ: 0.6 },
  // Exit: the far door of the empty room. Reaching it finishes the level.
  exit: { x: 7.9, z: 0 },

  // Tutorial hints, shown once each when the hero passes X.
  hints: [
    { x: 0.0, text: 'WASD — ходьба. Пробел — прыжок' },
    { x: 0.2, text: 'Стрелки — повернуть луч по кругу' },
    { x: 0.5, text: 'Бревно-карандаш. Прыгни через него' },
    { x: 0.7, text: 'Осколки — Искры. В углу тайник' },
    { x: 1.0, text: 'L — свет вкл/выкл. Q/E — ярче и тусклее' },
    { x: 1.9, text: 'Зарядная станция — точка возрождения и полный заряд' },
    { x: 2.45, text: 'Клякса: бей ядро узким лучом. Турбо — Q до 100 %' },
  ],
};

// Level 2 "Подвал". Same layout rules as the drawer: metres, walk along +X from the start to the exit.
// No mouse quest here (its mechanic is not designed yet). Each path is forced through the internal walls.
export const LEVEL_2 = {
  id: 'basement',
  name: 'Подвал',
  subtitle: 'Уровень 2',
  // Wider and longer than the drawer: a room with space to move, not a lane.
  bounds: { minX: -0.5, maxX: 9.0, halfZ: 1.5 },
  wallHeight: 0.4,          // taller walls: this is a room, not a drawer
  wallThickness: 0.06,
  start: { x: 0.0, z: 0.0 },
  // The basement is lit more than the drawer: a bare bulb hangs here, so the default light is brighter.

  // Pillars and walls the hero must go around. Open room with two wall bars and a gap to pass.
  partitions: [
    { x0: 2.0, x1: 2.1, z0: -1.5, z1: -0.4 },   // bar 1 from the top wall, gap at the bottom
    { x0: 3.4, x1: 3.5, z0: 0.4, z1: 1.5 },     // bar 2 from the bottom wall, gap at the top
    { x0: 5.0, x1: 5.1, z0: -1.5, z1: 0.2 },    // bar 3, gap at the bottom
    { x0: 6.5, x1: 6.6, z0: -0.2, z1: 1.5 },    // bar 4, gap at the top
    { x0: 7.8, x1: 7.9, z0: -1.5, z1: -0.4 },   // last bar before the exit corner, gap at the bottom
    { x0: 7.8, x1: 7.9, z0: 0.4, z1: 1.5 },
  ],

  props: [
    { kind: 'nail', x: 0.9, z: 0.6 },
    { kind: 'battery', x: 2.5, z: -0.9 },
    { kind: 'button', x: 4.1, z: 0.3 },
    { kind: 'key', x: 5.6, z: -1.1 },
    { kind: 'paper', x: 1.2, z: -0.2 },
    { kind: 'clip', x: 7.2, z: 0.9 },
    { kind: 'nail', x: 8.2, z: -0.6 },
    { kind: 'battery', x: 6.1, z: 1.1 },
  ],

  shards: [
    { x: 0.6, z: -1.0, value: 20 },
    { x: 2.9, z: 1.0, value: 15 },
    { x: 4.6, z: -0.8, value: 15 },
    { x: 6.1, z: 0.9, value: 20 },
    { x: 8.4, z: 0.0, value: 25 },
  ],

  checkpoints: [
    { id: 'start', x: 0.0, z: 0.9 },
  ],

  // Enemies appear well ahead of the hero (2-3 m), not next to him: the hero walks up to them and uses the beam.
  waves: [
    { id: 'w1', triggerX: 0.5, enemies: [{ type: 'spider', x: 3.2, z: 0.7 }, { type: 'crawler', x: 3.4, z: -0.7 }] },
    { id: 'w2', triggerX: 3.6, enemies: [{ type: 'spider', x: 7.0, z: -0.6 }, { type: 'spider', x: 7.4, z: 0.7 }] },
  ],

  boss: null,
  quest: null,
  lamps: [{ x: 1.5, z: 0.0 }, { x: 4.5, z: 0.0 }, { x: 7.5, z: 0.0 }],
  gate: null,
  exit: { x: 8.9, z: 0 },

  hints: [
    { x: 0.0, text: 'Подвал. Враги-пауки быстрее ползунов' },
    { x: 1.6, text: 'Перегородки: обходи их то снизу, то сверху' },
    { x: 5.0, text: 'Пауки кусают вплотную. Бей светом издалека' },
  ],
};
