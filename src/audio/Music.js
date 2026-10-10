// Primitive background music, synthesised with Web Audio (no files).
// A short looped melody over a bass line. Starts on the first key press (browsers need a user gesture).
// M toggles it on and off.

const NOTE = { C2: 65.41, E2: 82.41, G2: 98.0, A2: 110.0, F2: 87.31, D2: 73.42,
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, B4: 493.88, C5: 523.25 };

// One bar = 4 beats at 90 BPM. Melody and bass are note names, null is a rest.
const BEAT = 60 / 90;
const MELODY = ['E4', 'G4', 'A4', null, 'G4', 'E4', 'D4', null, 'C4', 'E4', 'G4', null, 'A4', 'G4', 'E4', null];
const BASS = ['C2', null, 'C2', null, 'A2', null, 'A2', null, 'F2', null, 'F2', null, 'G2', null, 'G2', null];

export class Music {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.on = false;
    this.nextTime = 0;
    this.step = 0;
    this.timer = null;
  }

  /** Creates the audio context on the first user gesture. */
  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;   // no Web Audio: the game just runs silent
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.08;   // quiet: background, not the focus
    this.master.connect(this.ctx.destination);
  }

  /** Toggles the music. Returns the new state. */
  toggle() {
    this.ensure();
    if (!this.ctx) return false;
    this.on ? this.stop() : this.start();
    return this.on;
  }

  start() {
    this.ensure();
    if (!this.ctx || this.on) return;
    this.on = true;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.nextTime = this.ctx.currentTime + 0.1;
    this.step = 0;
    this.timer = setInterval(() => this.schedule(), 100);
  }

  stop() {
    this.on = false;
    clearInterval(this.timer);
    this.timer = null;
  }

  /** Schedules the notes that fall into the next 0.3 s, so the loop stays in time. */
  schedule() {
    while (this.nextTime < this.ctx.currentTime + 0.3) {
      const n = MELODY[this.step % MELODY.length];
      const b = BASS[this.step % BASS.length];
      if (n) this.tone(NOTE[n], this.nextTime, BEAT * 0.9, 'triangle', 0.5);
      if (b) this.tone(NOTE[b], this.nextTime, BEAT * 1.8, 'sine', 0.7);
      this.nextTime += BEAT / 2;   // eighth notes
      this.step += 1;
    }
  }

  tone(freq, when, dur, type, vol) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }
}
