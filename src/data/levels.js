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
    { kind: 'pencil', x: 0.6, z: 0.0 },
    { kind: 'eraser', x: 1.05, z: -0.35 },
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

  // Enemy waves: each one spawns once when the hero passes triggerX.
  waves: [
    { id: 'w1', triggerX: 0.3, enemies: [
      { type: 'crawler', x: 1.2, z: 0.4 },
      { type: 'crawler', x: 1.5, z: -0.45 },
    ] },
    { id: 'w2', triggerX: 1.6, enemies: [
      { type: 'swarm', x: 2.2, z: 0.0 },
      { type: 'swarm', x: 2.3, z: 0.2 },
      { type: 'swarm', x: 2.1, z: -0.2 },
    ] },
    { id: 'w3', triggerX: 2.4, enemies: [
      { type: 'moth', x: 2.7, z: 0.0 },
      { type: 'crawler', x: 2.9, z: -0.35 },
    ] },
  ],

  // Boss: Ink Blot, starts at triggerX and sits at the end of the drawer.
  boss: { type: 'inkBlot', triggerX: 2.5, x: 3.25, z: 0.0 },

  // Exit: opens after the boss is defeated.
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
