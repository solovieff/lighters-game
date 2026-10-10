// Level 1 "Ящик стола" (tutorial). Layout in metres. The hero walks along +X from the start to the exit.
// Names and hints are Russian UI text.

export const LEVEL_1 = {
  id: 'drawer',
  name: 'Ящик стола',
  subtitle: 'Обучение',
  bounds: { minX: -0.5, maxX: 4.0, halfZ: 0.75 }, // drawer interior
  wallHeight: 0.2,
  wallThickness: 0.04,
  start: { x: 0.0, z: 0.0 },

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

  // Enemy waves: only the weakest crawlers, a couple of them, and only as a light-tested warm-up.
  // The main path is about running through the drawer and collecting, not fighting.
  waves: [
    { id: 'w1', triggerX: 1.2, enemies: [
      { type: 'crawler', x: 1.7, z: 0.45 },
      { type: 'crawler', x: 2.6, z: -0.45 },
    ] },
  ],

  // No boss in the drawer: the exit opens when the hero reaches the end (see TableLevel.atExit).
  boss: null,

  // Mouse quest: shine into the left corner, a mouse runs out and eats the pencil.
  quest: { id: 'mouse', lightTargetX: -0.3, lightTargetZ: -0.6, mouseStart: { x: -0.4, z: -0.6 }, target: 'crate', targetX: 0.6, targetZ: 0.0 },

  // Exit: at the far end of the drawer.
  exit: { x: 3.95 },

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
