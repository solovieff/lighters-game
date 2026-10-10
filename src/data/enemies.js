// Enemy data: thresholds, HP, speeds and behaviour numbers. Gameplay balance, not flashlight specs.
// Names are Russian UI text. luxThreshold = null means immune to light.

export const ENEMIES = {
  crawler: {
    type: 'crawler', name: 'Ползун', luxThreshold: 1, hp: 30, speed: 0.6,
    detectM: 3.0, contactPct: 8, block: true, fleeRatio: 20,
    size: 0.12, eyeColor: '#ff5a3c',
  },
  swarm: {
    type: 'swarm', name: 'Рой', luxThreshold: 0.5, hp: 12, speed: 1.1,
    contactPct: 3, block: false,
    size: 0.05, eyeColor: '#ffd24a',
  },
  moth: {
    type: 'moth', name: 'Мотылёк', luxThreshold: null, immune: true, hp: 1, speed: 1.4,
    flyHeight: 0.5,
    size: 0.04, eyeColor: '#ff8ad0',
  },
  watcher: {
    type: 'watcher', name: 'Наблюдатель', luxThreshold: 0.25, hp: 40, speed: 1.0,
    hover: 0.6, orbPct: 10, fireIntervalSec: 3, exposeSec: 2,
    size: 0.14, eyeColor: '#b06bff',
  },
  invisible: {
    type: 'invisible', name: 'Невидимка', luxThreshold: 0.5, hp: 25, speed: 0.7,
    contactPct: 5, highCriMin: 90, revealSec: 5, revealLen: 6, damageMultOther: 0.25,
    size: 0.1, eyeColor: '#9fe9ff',
  },
};
