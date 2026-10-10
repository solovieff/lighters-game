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
    this.lastTime = 0;
    this.running = false;
    this.frameId = 0;
    this.tick = this.tick.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frameId);
  }

  tick(now) {
    if (!this.running) return;
    // Clamp dt so that tab switches or hitches don't teleport the game.
    const dt = Math.min((now - this.lastTime) / 1000, MAX_DT);
    this.lastTime = now;
    this.update(dt);
    this.render();
    this.frameId = requestAnimationFrame(this.tick);
  }
}
