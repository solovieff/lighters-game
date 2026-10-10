// Save data in localStorage: Sparks, owned flashlights, active body, installed mods, level progress.
const KEY = 'lumen.save';
const DEFAULT = { sparks: 0, owned: ['convoy_s2plus_sst40'], active: 'convoy_s2plus_sst40', mods: [], levelsDone: [] };

export const SaveSystem = {
  load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      return { ...DEFAULT, ...(raw || {}) };
    } catch {
      return { ...DEFAULT };
    }
  },

  save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
    return data;
  },

  /** Adds Sparks and returns the new total. Negative values are allowed for purchases. */
  addSparks(n) {
    const d = this.load();
    d.sparks = Math.max(0, d.sparks + n);
    this.save(d);
    return d.sparks;
  },

  totalSparks() {
    return this.load().sparks;
  },

  /** Buys a flashlight if not owned and affordable. Returns true on success. */
  buyFlashlight(id, price) {
    const d = this.load();
    if (d.owned.includes(id) || d.sparks < price) return false;
    d.sparks -= price;
    d.owned.push(id);
    this.save(d);
    return true;
  },

  setActive(id) {
    const d = this.load();
    if (!d.owned.includes(id)) return false;
    d.active = id;
    this.save(d);
    return true;
  },

  /** Buys a mod for a flashlight. Returns true on success. */
  buyMod(modId, price) {
    const d = this.load();
    if (d.mods.includes(modId) || d.sparks < price) return false;
    d.sparks -= price;
    d.mods.push(modId);
    this.save(d);
    return true;
  },

  hasMod(modId) {
    return this.load().mods.includes(modId);
  },

  /** Clears level progress only: sparks, flashlights and mods stay. */
  resetLevelProgress() {
    const d = this.load();
    d.levelsDone = [];
    this.save(d);
  },

  completeLevel(levelId) {
    const d = this.load();
    if (!d.levelsDone.includes(levelId)) d.levelsDone.push(levelId);
    this.save(d);
  },
};
