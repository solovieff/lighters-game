// Minimal persistence: total Sparks in localStorage. The full save (flashlights, mods) comes in stage 7.
const KEY = 'lumen.save';

export const SaveSystem = {
  load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || { sparks: 0 };
    } catch {
      return { sparks: 0 };
    }
  },

  /** Adds Sparks to the saved total and returns the new total. */
  addSparks(n) {
    const data = this.load();
    data.sparks = (data.sparks || 0) + n;
    localStorage.setItem(KEY, JSON.stringify(data));
    return data.sparks;
  },

  totalSparks() {
    return this.load().sparks || 0;
  },
};
