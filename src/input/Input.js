// Keyboard-only input (plus optional gamepad). The mouse is not used anywhere in the game.
import { bus } from '../core/EventBus.js';

export class Input {
  constructor() {
    this.keys = new Set();      // currently held key codes
    this.pressedThisFrame = new Set(); // keys that went down since last consumeFrame()
    this.gamepadPrev = {};      // previous button states for edge detection
    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  onKeyDown(e) {
    // Stop arrows and Space from scrolling the page.
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    this.keys.add(e.code);
    this.pressedThisFrame.add(e.code);
    bus.emit('keyDown', { code: e.code });
    if (e.code === 'Escape') bus.emit('pause');
  }

  /** Returns true while the key is held. */
  isDown(code) {
    return this.keys.has(code);
  }

  /** Returns true if the key was pressed (edge) since the previous call. */
  wasPressed(code) {
    return this.pressedThisFrame.has(code);
  }

  /** Clears edge-triggered presses. Call once per frame after reading them. */
  endFrame() {
    this.pressedThisFrame.clear();
  }

  /** Movement axes from WASD: x = right, z = back (camera looks toward -z). */
  moveAxes() {
    const x = (this.isDown('KeyD') ? 1 : 0) - (this.isDown('KeyA') ? 1 : 0);
    const z = (this.isDown('KeyS') ? 1 : 0) - (this.isDown('KeyW') ? 1 : 0);
    const len = Math.hypot(x, z) || 1;
    return { x: x / len, z: z / len };
  }

  /** Head aim axes from arrow keys: x = sideways tilt, y = forward/back tilt. */
  aimAxes() {
    const x = (this.isDown('ArrowRight') ? 1 : 0) - (this.isDown('ArrowLeft') ? 1 : 0);
    const y = (this.isDown('ArrowDown') ? 1 : 0) - (this.isDown('ArrowUp') ? 1 : 0);
    return { x, y };
  }

  /**
   * Polls the first connected gamepad and emits edge events for pressed buttons.
   * Standard mapping: 0=A, 2=X, 4=LB, 5=RB, 7=RT.
   */
  pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads && pads[0];
    if (!pad) return null;
    const pressed = (i) => !!(pad.buttons[i] && pad.buttons[i].pressed);
    const edges = { A: 0, X: 2, LB: 4, RB: 5, RT: 7 };
    for (const [name, index] of Object.entries(edges)) {
      const now = pressed(index);
      if (now && !this.gamepadPrev[name]) bus.emit('padButton', { name });
      this.gamepadPrev[name] = now;
    }
    const ax = (i) => (Math.abs(pad.axes[i] || 0) < 0.15 ? 0 : pad.axes[i]);
    return {
      move: { x: ax(0), z: ax(1) },   // left stick
      aim: { x: ax(2), y: ax(3) },    // right stick
    };
  }
}
