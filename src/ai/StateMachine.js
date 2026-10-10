// Minimal state machine: named states with enter/update/exit hooks. Hooks run with `this` = owner.
export class StateMachine {
  /** @param {object} owner the enemy whose hooks run with this = owner */
  constructor(owner) {
    this.owner = owner;
    this.states = new Map();
    this.current = null;
    this.name = '';
    this.timer = 0;
  }

  /** Registers a state with optional enter/update/exit hooks. */
  add(name, hooks) {
    this.states.set(name, hooks);
    return this;
  }

  /** Switches state, running exit of the old and enter of the new one. */
  set(name) {
    const next = this.states.get(name);
    if (!next) throw new Error(`unknown state: ${name}`);
    if (this.current && this.current.exit) this.current.exit.call(this.owner);
    this.current = next;
    this.name = name;
    this.timer = 0;
    if (next.enter) next.enter.call(this.owner);
  }

  /** Runs the current state's update hook. */
  update(dt) {
    this.timer += dt;
    if (this.current && this.current.update) this.current.update.call(this.owner, dt);
  }
}
