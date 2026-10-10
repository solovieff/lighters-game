// Fixed-source frame loop with clamped delta time.
import { MAX_DT } from './config.js';

export class Loop {
  /**
   * @param {(dt: number) => void} update called every frame with delta seconds
   * @param {() => void} render called every frame after update
   */
  constructor(update, render) {
    this.update = update;
    this.render = render;
    this.lastTime = null;   // set on the first rAF tick, so dt is never negative
    this.running = false;
    this.frameId = 0;
    this.tick = this.tick.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = null;
    this.frameId = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frameId);
  }

  tick(now) {
    if (!this.running) return;
    const prev = this.lastTime === null ? now : this.lastTime;
    this.lastTime = now;
    // Clamp dt so tab switches or hitches don't teleport the game.
    const dt = THREE_clamp((now - prev) / 1000, 0, MAX_DT);
    this.update(dt);
    this.render();
    this.frameId = requestAnimationFrame(this.tick);
  }
}

function THREE_clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}
