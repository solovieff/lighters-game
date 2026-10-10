// Battery, brightness modes, stepped Turbo, heat, sag and regulated-boost (LVP).
// Pure logic: no three.js. Notable moments are announced on the EventBus.
import { bus } from '../core/EventBus.js';
import { RUNTIME_TIME_SCALE, TURBO_TIME_SCALE, MIN_TURBO_STEP_SEC, HEAT, SAG, LVP } from '../core/config.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export class PowerSystem {
  /**
   * @param {object} spec flashlight data entry (modes, thermalLimitC, regulatedBoost)
   * @param {number} startModeIndex index into spec.modes
   */
  constructor(spec, startModeIndex = 0) {
    this.spec = spec;
    this.modes = spec.modes;
    this.regulated = !!spec.regulatedBoost;
    this.limitC = spec.thermalLimitC;

    this.modeIndex = clamp(startModeIndex, 0, this.modes.length - 1);
    this.on = true;
    this.dead = false;
    this.charge = 100;          // %
    this.tempC = HEAT.startC;

    this.stepIndex = 0;         // current Turbo step
    this.stepTimer = 0;         // game seconds spent in the current step
    this.lvpFactor = 1;         // regulated boost: halves every second below LVP threshold
    this.lowWarned = false;
    this.lvpWarned = false;
  }

  get mode() {
    return this.modes[this.modeIndex];
  }

  /** True when the current mode is a stepped Turbo and the light is on. */
  get isTurbo() {
    return !!this.mode.turbo && this.on && !this.dead;
  }

  /** Current Turbo step object, or null outside Turbo. */
  get currentStep() {
    return this.isTurbo ? this.mode.steps[this.stepIndex] : null;
  }

  /** Turbo can be selected only when the temperature is well below the limit. */
  get turboAvailable() {
    return this.tempC < this.limitC - HEAT.turboRecoverMarginC;
  }

  /** Duration of a Turbo step in game seconds. The last step has no duration limit. */
  stepDuration(index) {
    const step = this.mode.steps[index];
    return Math.max(step.minutes * 60 * TURBO_TIME_SCALE, MIN_TURBO_STEP_SEC);
  }

  /** Brightness multiplier from battery sag (or regulated boost LVP). 1 = full. */
  get brightnessFactor() {
    if (this.regulated) {
      return this.charge >= LVP.thresholdPct ? 1 : this.lvpFactor;
    }
    if (this.charge >= SAG.thresholdPct) return 1;
    return SAG.minFactor + (1 - SAG.minFactor) * (this.charge / SAG.thresholdPct);
  }

  /** Lumens before sag is applied. */
  get rawLumens() {
    if (!this.on || this.dead) return 0;
    const step = this.currentStep;
    return step ? step.lumens : this.mode.lumens;
  }

  /** Lumens actually emitted now. */
  get lumens() {
    return this.rawLumens * this.brightnessFactor;
  }

  /**
   * Candela now. In Turbo steps cd scales with lumens:
   * cd_step = cd_mode * lumens_step / lumens_first_step.
   */
  get cd() {
    if (!this.on || this.dead) return 0;
    const step = this.currentStep;
    const ratio = step ? step.lumens / this.mode.steps[0].lumens : 1;
    return this.mode.cd * ratio * this.brightnessFactor;
  }

  get sagActive() {
    return !this.regulated && this.on && !this.dead && this.charge < SAG.thresholdPct;
  }

  get lvpActive() {
    return this.regulated && this.on && !this.dead && this.charge < LVP.thresholdPct;
  }

  /** Switches to a mode index. Returns false if blocked (Turbo too hot) or unchanged. */
  setMode(index) {
    const target = clamp(index, 0, this.modes.length - 1);
    if (target === this.modeIndex) return false;
    if (this.modes[target].turbo && !this.turboAvailable) {
      bus.emit('turboBlocked', { tempC: this.tempC });
      return false;
    }
    this.modeIndex = target;
    this.resetStep();
    bus.emit('modeChanged', { index: target, mode: this.mode });
    return true;
  }

  nextMode() {
    return this.setMode(this.modeIndex + 1);
  }

  prevMode() {
    return this.setMode(this.modeIndex - 1);
  }

  /** Turns the light on or off. Turbo restarts from its first step after switching on. */
  toggle() {
    if (this.dead) return;
    this.on = !this.on;
    this.resetStep();
    bus.emit('lightOn', { on: this.on });
  }

  /** Debug helper: set the battery level (and revive after a dead battery). */
  setCharge(pct) {
    this.charge = clamp(pct, 0, 100);
    if (this.dead) {
      this.dead = false;
      this.on = true;
    }
    this.lowWarned = false;
    this.lvpWarned = false;
    this.lvpFactor = 1;
  }

  resetStep() {
    this.stepIndex = 0;
    this.stepTimer = 0;
  }

  /**
   * Advances battery, Turbo steps and temperature by dt game seconds.
   * @param {number} dt
   */
  update(dt) {
    if (this.dead) {
      this.cool(dt);
      return;
    }
    if (this.on) {
      this.drain(dt);
      this.advanceTurbo(dt);
      this.updateHeat(dt);
    } else {
      this.cool(dt);
    }
  }

  /**
   * Battery drain. Base rate comes from the mode runtime; power scales with lumens,
   * so a dimmer Turbo step drains more slowly.
   * Assumption: a mode's total runtime is spread across its steps this way.
   */
  drain(dt) {
    const m = this.mode;
    const basePctPerSec = 100 / ((m.runtimeMin * 60) / RUNTIME_TIME_SCALE);
    const ratio = this.rawLumens / m.lumens;
    this.charge = Math.max(0, this.charge - basePctPerSec * ratio * dt);

    if (this.regulated && this.charge < LVP.thresholdPct) {
      this.lvpFactor *= Math.pow(0.5, dt / LVP.halvingSec);
      if (!this.lvpWarned) {
        this.lvpWarned = true;
        bus.emit('lvp', {});
      }
    }
    if (!this.lowWarned && this.charge < SAG.thresholdPct) {
      this.lowWarned = true;
      bus.emit('batteryLow', { charge: this.charge });
    }
    if (this.charge <= 0 || (this.regulated && this.lvpFactor < 0.01)) {
      this.die();
    }
  }

  /** Steps the Turbo down when the current step's duration is over. */
  advanceTurbo(dt) {
    if (!this.isTurbo) return;
    const last = this.mode.steps.length - 1;
    if (this.stepIndex >= last) return;

    this.stepTimer += dt;
    if (this.stepTimer >= this.stepDuration(this.stepIndex)) {
      this.stepIndex += 1;
      this.stepTimer = 0;
      bus.emit('stepDown', { step: this.stepIndex, lumens: this.mode.steps[this.stepIndex].lumens });
    }
  }

  /**
   * Turbo heating: in the first step the temperature rises to thermalLimitC exactly at its end.
   * Later Turbo steps hold the temperature. Outside Turbo the light cools.
   * Reaching the limit early (environment, not implemented yet) forces a step-down.
   */
  updateHeat(dt) {
    if (!this.isTurbo) {
      this.cool(dt);
      return;
    }
    if (this.stepIndex > 0) return; // hold

    const dur = this.stepDuration(0);
    const rate = (this.limitC - HEAT.startC) / dur;
    this.tempC = Math.min(this.limitC, this.tempC + rate * dt);

    const nearEnd = this.stepTimer >= dur - 0.05;
    if (this.tempC >= this.limitC && !nearEnd && this.mode.steps.length > 1) {
      this.stepIndex = 1;
      this.stepTimer = 0;
      bus.emit('overheat', { tempC: this.tempC });
      bus.emit('stepDown', { step: 1, lumens: this.mode.steps[1].lumens });
    }
  }

  cool(dt) {
    this.tempC = Math.max(HEAT.startC, this.tempC - HEAT.coolRateCps * dt);
  }

  /** Charge removed by an enemy hit (contact or projectile). */
  applyHit(pct) {
    this.charge = Math.max(0, this.charge - pct);
    if (this.charge <= 0) this.die();
  }

  die() {
    this.dead = true;
    this.on = false;
    this.charge = 0;
    this.resetStep();
    bus.emit('batteryDead', {});
  }
}
