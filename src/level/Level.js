// Base contract for every playable level. main.js only talks to this interface, never to a concrete level type.
// A level receives the hero's flashlight spec from outside: the level does not decide what the hero carries.
export class Level {
  /**
   * @param {THREE.Scene} scene
   * @param {object} data level data (layout, waves, targets...)
   * @param {object} spec flashlight spec the hero carries (copy with mods applied)
   */
  constructor(scene, data, spec) {
    this.scene = scene;
    this.data = data;
    this.spec = spec;
    this.colliders = [];   // AABB walls and props, used by the hero and the beam
    this.enemies = [];
    this.sparks = 0;
    this.bossDefeated = false;
  }

  /**
   * Called every frame by main.js. Same signature for every level.
   * @param {number} dt seconds
   * @param {{x:number,z:number}} heroPos hero feet position
   * @param {object} power PowerSystem of the hero
   * @param {THREE.Camera} camera for screen-space labels
   */
  update(dt, heroPos, power, camera) {}

  /** Whether the hero's soft halo (ambient glow around the lamp) is drawn here. The range turns it off to measure honestly. */
  get usesHalo() { return true; }

  /** Whether the hero can walk and jump on this level (the range is a shooting bench: no). */
  get allowsMovement() { return true; }
  /** Whether the battery drains here (the range is a shooting bench: no drain, no death). */
  get drainsBattery() { return true; }

  /** Boss name and HP for the boss bar, or null. */
  bossInfo() { return null; }

  /** True once the hero can leave the level. */
  atExit() { return false; }

  /** Removes everything this level added to the scene. */
  dispose() {}
}
