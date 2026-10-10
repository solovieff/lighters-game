// Unified input: keyboard, Pointer Lock mouse, click patterns, wheel, gamepad.
import { bus } from '../core/EventBus.js';
import { CLICK } from '../core/config.js';

export class Input {
  /** @param {HTMLElement} target element that receives mouse events and gets pointer lock */
  constructor(target) {
    this.target = target;
    this.keys = new Set();          // currently held key codes
    this.mouseDX = 0;               // accumulated mouse movement this frame (pointer lock)
    this.mouseDY = 0;
    this.locked = false;
    this.clickTimes = [];           // timestamps of recent LMB presses
    this.gamepadPrev = {};          // previous button states for edge detection
    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    this.target.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.target.addEventListener('contextmenu', (e) => e.preventDefault());
    this.target.addEventListener('wheel', (e) => {
      bus.emit('wheel', { dir: Math.sign(e.deltaY) });
    }, { passive: true });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.target;
      bus.emit('pointerLockChanged', { locked: this.locked });
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
  }

  /** Requests pointer lock. Must be called from a user gesture. */
  requestLock() {
    this.target.requestPointerLock?.();
  }

  onKeyDown(e) {
    if (e.repeat) return;
    this.keys.add(e.code);
    bus.emit('keyDown', { code: e.code });
    if (e.code === 'Escape') bus.emit('pause');
  }

  onMouseDown(e) {
    if (e.button === 0) {
      this.registerLeftClick();
      bus.emit('lmbDown', {});
    } else if (e.button === 2) {
      bus.emit('rmbDown', {});
    }
    if (!this.locked) this.requestLock();
  }

  /**
   * Detects single, double and triple fast LMB clicks.
   * Emits 'lmbClick' with count. Triple within CLICK.TRIPLE_WINDOW_S = manual strobe.
   */
  registerLeftClick() {
    const now = performance.now() / 1000;
    this.clickTimes.push(now);
    this.clickTimes = this.clickTimes.filter((t) => now - t <= CLICK.TRIPLE_WINDOW_S);
    const count = this.clickTimes.length;
    bus.emit('lmbClick', { count });
    if (count === 3) {
      bus.emit('manualStrobe', {});
      this.clickTimes = [];
    }
  }

  /** Returns true while the key is held. */
  isDown(code) {
    return this.keys.has(code);
  }

  /** Returns and clears accumulated mouse movement. */
  consumeMouse() {
    const out = { dx: this.mouseDX, dy: this.mouseDY };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return out;
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
      move: { x: ax(0), y: ax(1) },   // left stick
      aim: { x: ax(2), y: ax(3) },    // right stick
      trigger: pressed(7),
    };
  }
}
