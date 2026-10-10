// Touch layer for phones: a «Меню» button and a «переверни экран» notice in portrait.
// Only shows on touch devices. It does not change the game: the button calls the same back-to-menu as Esc.
export class TouchLayer {
  /**
   * @param {() => void} onMenu called when the player taps «Меню»
   */
  constructor(onMenu) {
    this.onMenu = onMenu;
    this.touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    this.root = document.createElement('div');
    this.root.id = 'touch-layer';
    Object.assign(this.root.style, {
      position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '12', display: 'none',
      fontFamily: 'Red Hat Display, system-ui, sans-serif',
    });
    this.root.innerHTML = `
      <button class="tl-menu" style="position:absolute;top:10px;right:10px;pointer-events:auto;
        padding:8px 14px;border-radius:8px;border:1px solid rgba(255,190,110,0.5);
        background:rgba(12,10,8,0.7);color:#ffe9c8;font-size:14px">Меню</button>
      <div class="tl-rotate" style="display:none;position:absolute;inset:0;pointer-events:auto;
        background:rgba(4,4,6,0.96);color:#ffd9a0;align-items:center;justify-content:center;
        flex-direction:column;text-align:center;font-size:22px;padding:24px">
        <div style="font-size:48px;margin-bottom:14px">⟲</div>
        <div>Переверни экран</div>
        <div style="font-size:14px;color:#7d8694;margin-top:10px">Игра работает в горизонтали</div>
      </div>`;
    document.body.appendChild(this.root);
    this.root.querySelector('.tl-menu').addEventListener('click', () => this.onMenu());
    this.rotateNotice = this.root.querySelector('.tl-rotate');
    this.menuBtn = this.root.querySelector('.tl-menu');
    window.addEventListener('resize', () => this.refresh());
    window.addEventListener('orientationchange', () => this.refresh());
  }

  /** Shows the layer on touch devices only; the rotate notice when the screen is portrait. */
  refresh() {
    if (!this.touch) { this.root.style.display = 'none'; return; }
    this.root.style.display = 'block';
    const portrait = window.innerHeight > window.innerWidth;
    this.rotateNotice.style.display = portrait ? 'flex' : 'none';
    this.menuBtn.style.display = portrait ? 'none' : 'block';
  }

  /** True while the screen is portrait on a phone: the game must pause, not run. */
  isBlockedByPortrait() {
    return this.touch && window.innerHeight > window.innerWidth;
  }

  setVisible(v) {
    this.root.style.display = v && this.touch ? 'block' : 'none';
  }
}
