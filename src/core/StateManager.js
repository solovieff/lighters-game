// Holds the current game state and handles transitions between them.
import { bus } from './EventBus.js';

export const STATES = Object.freeze({
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
  VICTORY: 'victory',
  WORKSHOP: 'workshop',
});

// Which transitions are allowed. Anything else is rejected with a console warning.
const TRANSITIONS = {
  [STATES.MENU]: [STATES.PLAYING, STATES.WORKSHOP],
  [STATES.PLAYING]: [STATES.PAUSED, STATES.GAMEOVER, STATES.VICTORY],
  [STATES.PAUSED]: [STATES.PLAYING, STATES.MENU],
  [STATES.GAMEOVER]: [STATES.PLAYING, STATES.MENU],
  [STATES.VICTORY]: [STATES.MENU, STATES.PLAYING],
  [STATES.WORKSHOP]: [STATES.MENU],
};

export class StateManager {
  constructor(initial = STATES.MENU) {
    this.state = initial;
  }

  /**
   * Moves to a new state if the transition is allowed.
   * @param {string} next one of STATES
   * @returns {boolean} true if the transition happened
   */
  go(next) {
    const allowed = TRANSITIONS[this.state] || [];
    if (!allowed.includes(next)) {
      console.warn(`[StateManager] illegal transition ${this.state} -> ${next}`);
      return false;
    }
    const prev = this.state;
    this.state = next;
    bus.emit('stateChanged', { from: prev, to: next });
    return true;
  }

  is(state) {
    return this.state === state;
  }
}
