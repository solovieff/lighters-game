// Enemy waves: each wave spawns once when the hero passes its trigger X.
export class Spawner {
  /** @param {{id:string, triggerX:number, enemies:object[]}[]} waves */
  constructor(waves) {
    this.waves = waves.map((w) => ({ ...w, done: false }));
  }

  /**
   * Returns the waves that trigger this frame.
   * @param {number} heroX
   */
  update(heroX) {
    const out = [];
    for (const w of this.waves) {
      if (!w.done && heroX >= w.triggerX) {
        w.done = true;
        out.push(w);
      }
    }
    return out;
  }
}
