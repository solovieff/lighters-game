// Enemy data: thresholds, HP, speeds and behaviour numbers. Gameplay balance, not flashlight specs.
// Names are Russian UI text. luxThreshold = null means immune to light.

export const ENEMIES = {
  crawler: {
    type: 'crawler', name: 'Ползун', luxThreshold: 1, hp: 4, speed: 0.3,
    detectM: 3.0, contactPct: 8, block: true, fleeRatio: 20,
    size: 0.12, eyeColor: '#ff5a3c',
  },
  spider: {
    type: 'spider', name: 'Паучок', luxThreshold: 0.7, hp: 3, speed: 0.55,
    detectM: 2.5, contactPct: 6, block: true, fleeRatio: 20,
    size: 0.09, eyeColor: '#9be6ff',
  },
  swarm: {
    type: 'swarm', name: 'Рой', luxThreshold: 0.5, hp: 2, speed: 0.6,
    contactPct: 3, block: false,
    size: 0.05, eyeColor: '#ffd24a',
  },
  moth: {
    type: 'moth', name: 'Мотылёк', luxThreshold: null, immune: true, hp: 1, speed: 0.7,
    flyHeight: 0.5,
    size: 0.04, eyeColor: '#ff8ad0',
  },
  watcher: {
    type: 'watcher', name: 'Наблюдатель', luxThreshold: 0.25, hp: 6, speed: 0.5,
    hover: 0.6, orbPct: 10, fireIntervalSec: 3, exposeSec: 2,
    size: 0.14, eyeColor: '#b06bff',
  },
  invisible: {
    type: 'invisible', name: 'Невидимка', luxThreshold: 0.5, hp: 4, speed: 0.35,
    contactPct: 5, highCriMin: 90, revealSec: 5, revealLen: 6, damageMultOther: 0.25,
    size: 0.1, eyeColor: '#9fe9ff',
  },
  inkBlot: {
    type: 'inkBlot', name: 'Чернильная Клякса', luxThreshold: 1, hp: 60, speed: 0.25,
    contactPct: 8, block: false,
    size: 0.22, eyeColor: '#ff4d6d',
  },
};
