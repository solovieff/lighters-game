// On-screen controls for phones in landscape: a move stick (left), an aim stick (right) and three buttons.
// They only feed Input (setTouchAxes / touchPress), so the game logic is the same as with the keyboard.
const STICK = 110;   // px, the size of a stick's base
const KNOB = 46;     // px, the knob

export class TouchControls {
  /** @param {import('../input/Input.js').Input} input */
  constructor(input) {
    this.input = input;
    this.touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    this.move = { x: 0, z: 0 };
    this.aim = { x: 0 };
    this.root = document.createElement('div');
    this.root.id = 'touch-controls';
    Object.assign(this.root.style, {
      position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '11', display: 'none',
      fontFamily: 'Red Hat Display, system-ui, sans-serif', userSelect: 'none', touchAction: 'none',
    });
    this.root.innerHTML = `
      <div class="tc-stick tc-move" style="${this.stickCss('left:24px;bottom:24px')}"><div class="tc-knob"></div></div>
      <div class="tc-stick tc-aim" style="${this.stickCss('right:24px;bottom:24px')}"><div class="tc-knob"></div></div>
      <div class="tc-buttons" style="position:absolute;right:170px;bottom:30px;display:flex;gap:12px;pointer-events:auto">
        <button class="tc-btn" data-act="light" style="${this.btnCss()}">Свет</button>
        <button class="tc-btn" data-act="mode" style="${this.btnCss()}">Режим</button>
        <button class="tc-btn" data-act="jump" style="${this.btnCss()}">Прыжок</button>
      </div>`;
    document.body.appendChild(this.root);
    this.bindStick('.tc-move', (x, y) => { this.move = { x: x, z: y }; this.input.setTouchAxes(this.move, this.aim); });
    this.bindStick('.tc-aim', (x) => { this.aim = { x: x }; this.input.setTouchAxes(this.move, this.aim); });
    this.root.querySelectorAll('.tc-btn').forEach((b) => {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const act = b.dataset.act;
        const code = act === 'light' ? 'KeyL' : act === 'mode' ? 'KeyQ' : 'Space';
        this.input.touchPress(code);
      });
    });
    window.addEventListener('resize', () => this.refresh());
    window.addEventListener('orientationchange', () => this.refresh());
  }

  stickCss(pos) {
    return `position:absolute;${pos};width:${STICK}px;height:${STICK}px;border-radius:50%;` +
      'background:rgba(255,190,110,0.12);border:1px solid rgba(255,190,110,0.35);pointer-events:auto;touch-action:none';
  }

  btnCss() {
    return 'min-width:72px;height:52px;padding:0 12px;border-radius:12px;border:1px solid rgba(255,190,110,0.5);' +
      'background:rgba(12,10,8,0.7);color:#ffe9c8;font-size:15px';
  }

  /** Drags the knob and reports a normalised axis pair in [-1, 1]. The stick returns to centre on release. */
  bindStick(sel, onAxis) {
    const base = this.root.querySelector(sel);
    const knob = base.querySelector('.tc-knob');
    Object.assign(knob.style, {
      position: 'absolute', width: KNOB + 'px', height: KNOB + 'px', borderRadius: '50%',
      background: 'rgba(255,190,110,0.45)', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
    });
    const max = STICK / 2;
    let id = null;
    const set = (cx, cy) => {
      const r = base.getBoundingClientRect();
      let dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      onAxis(dx / max, -dy / max);   // screen up is +z forward for move (z is back) and + for aim (handled in Input)
    };
    const release = () => { id = null; knob.style.transform = 'translate(-50%,-50%)'; onAxis(0, 0); };
    base.addEventListener('pointerdown', (e) => { e.preventDefault(); id = e.pointerId; base.setPointerCapture(id); set(e.clientX, e.clientY); });
    base.addEventListener('pointermove', (e) => { if (id === e.pointerId) set(e.clientX, e.clientY); });
    base.addEventListener('pointerup', (e) => { if (id === e.pointerId) release(); });
    base.addEventListener('pointercancel', release);
  }

  /** Shows the controls only on touch devices in landscape (portrait gets the rotate notice instead). */
  refresh() {
    const landscape = window.innerWidth > window.innerHeight;
    this.root.style.display = this.touch && landscape ? 'block' : 'none';
  }
}
