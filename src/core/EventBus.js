// Minimal publish/subscribe bus. Modules talk through events instead of direct calls.
export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.listeners = new Map();
  }

  /**
   * Subscribes a handler to an event.
   * @param {string} name event name
   * @param {Function} handler callback receiving the payload
   * @returns {Function} unsubscribe function
   */
  on(name, handler) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(handler);
    return () => this.off(name, handler);
  }

  /** Removes a handler from an event. */
  off(name, handler) {
    const set = this.listeners.get(name);
    if (set) set.delete(handler);
  }

  /** Emits an event with an optional payload. */
  emit(name, payload) {
    const set = this.listeners.get(name);
    if (!set) return;
    for (const handler of set) handler(payload);
  }
}

/** Shared bus for the whole game. */
export const bus = new EventBus();
