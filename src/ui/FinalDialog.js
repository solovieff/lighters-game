// Final dialog: shown after the last campaign level. Two choices: start over (progress reset) or back to the menu.
// Pure DOM, Russian text. Emits the choice through onChoose; main.js decides what each choice does.
export class FinalDialog {
  /**
   * @param {HTMLElement} root container element
   * @param {(choice: 'restart' | 'menu') => void} onChoose
   */
  constructor(root, onChoose) {
    this.root = root;
    this.onChoose = onChoose;
    this.items = [
      { id: 'restart', title: 'Начать заново', sub: 'Сбросить прогресс и пройти всё сначала' },
      { id: 'menu', title: 'В меню', sub: 'Прогресс сохранится' },
    ];
    this.index = 0;
    this.visible = false;
    this.onKey = (e) => this.handleKey(e);
    this.build();
  }

  build() {
    Object.assign(this.root.style, {
      position: 'fixed', inset: '0', display: 'none', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, rgba(40,28,16,0.96) 0%, rgba(4,4,6,1) 75%)',   // opaque: the HUD must not show through
      zIndex: '30', userSelect: 'none', fontFamily: 'Red Hat Display, system-ui, sans-serif',
    });
    this.root.innerHTML = `
      <div style="text-align:center;min-width:360px;max-width:520px">
        <div style="font-size:14px;letter-spacing:4px;color:#7d8694;margin-bottom:14px">КОНЕЦ</div>
        <div style="font-size:44px;color:#ffd9a0;text-shadow:0 0 24px rgba(255,190,110,0.35)">Вы всё прошли</div>
        <div style="font-size:18px;color:#c9c4b8;margin-top:18px;line-height:1.5">
          Поздравляем. Свет вернулся туда, где он нужен.
        </div>
        <div class="fd-items" style="margin-top:34px"></div>
      </div>`;
    this.list = this.root.querySelector('.fd-items');
    this.renderItems();
  }

  styleRow(row, sel) {
    Object.assign(row.style, {
      border: `1px solid ${sel ? '#ffb36b' : 'rgba(255,255,255,0.08)'}`,
      background: sel ? 'linear-gradient(90deg, rgba(255,160,80,0.18), rgba(255,160,80,0.02))' : 'rgba(255,255,255,0.02)',
      boxShadow: sel ? '0 0 22px rgba(255,160,80,0.25)' : 'none',
    });
    row.querySelector('.fd-title').style.color = sel ? '#ffe9c8' : '#a9a396';
  }

  renderItems() {
    this.list.innerHTML = '';
    this.items.forEach((it, i) => {
      const row = document.createElement('div');
      row.dataset.id = it.id;
      Object.assign(row.style, { margin: '10px 0', padding: '14px 28px', cursor: 'pointer', borderRadius: '10px', transition: 'all 0.15s ease' });
      row.innerHTML = `
        <div class="fd-title" style="font-size:24px"></div>
        <div style="font-size:13px;color:#7d8694;margin-top:4px">${it.sub}</div>`;
      row.querySelector('.fd-title').textContent = it.title;
      this.styleRow(row, i === this.index);
      row.onmouseenter = () => this.setIndex(i);
      row.onclick = () => { this.index = i; this.choose(); };
      this.list.appendChild(row);
    });
  }

  setIndex(i) {
    if (i === this.index) return;
    this.index = i;
    [...this.list.children].forEach((row, k) => this.styleRow(row, k === i));
  }

  choose() {
    const id = this.items[this.index].id;
    this.hide();
    this.onChoose(id);
  }

  handleKey(e) {
    if (!this.visible) return;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') this.move(1);
    else if (e.code === 'ArrowUp' || e.code === 'KeyW') this.move(-1);
    else if (e.code === 'Enter' || e.code === 'Space') this.choose();
    else return;
    e.preventDefault();
  }

  move(d) {
    this.index = (this.index + d + this.items.length) % this.items.length;
    this.renderItems();
  }

  show() {
    this.visible = true;
    this.index = 0;
    this.renderItems();
    this.root.style.display = 'flex';
    window.addEventListener('keydown', this.onKey);
  }

  hide() {
    this.visible = false;
    this.root.style.display = 'none';
    window.removeEventListener('keydown', this.onKey);
  }
}
