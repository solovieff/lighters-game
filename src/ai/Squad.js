// Attack tokens: limits how many enemies may attack the hero at the same time.
import { ATTACK_TOKENS } from '../core/config.js';

export class Squad {
  constructor() {
    this.tokens = new Set();
  }

  /** Takes an attack token. Returns true if the enemy may attack now. */
  acquire(enemy) {
    if (this.tokens.has(enemy)) return true;
    if (this.tokens.size >= ATTACK_TOKENS) return false;
    this.tokens.add(enemy);
    return true;
  }

  /** Gives the token back so another enemy can attack. */
  release(enemy) {
    this.tokens.delete(enemy);
  }
}
