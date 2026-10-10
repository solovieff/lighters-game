// Main menu: three choices (Полигон, Мастерская, Уровень) with keyboard navigation and a styled look.
// Pure DOM. Emits a choice through onChoose; main.js decides what each choice starts.
export class MainMenu {
  /**
   * @param {HTMLElement} root container element
   * @param {(choice: 'range' | 'workshop' | 'level') => void} onChoose
   */
  constructor(root, onChoose) {
    this.root = root;
    this.onChoose = onChoose;
    this.items = [
      { id: 'level', title: 'Уровень', sub: 'Ящик стола · обучение' },
      { id: 'workshop', title: 'Мастерская', sub: 'Фонари, покупки, моды' },
      { id: 'range', title: 'Полигон', sub: 'Проверка дальности и люкса' },
    ];
    this.index = 0;
    this.visible = false;
    this.onKey = (e) => this.handleKey(e);
    this.build();
  }

  build() {
    Object.assign(this.root.style, {
      position: 'fixed', inset: '0', display: 'none', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, rgba(40,28,16,0.85) 0%, rgba(4,4,6,0.97) 70%)',
      zIndex: '20', userSelect: 'none', fontFamily: 'Red Hat Display, system-ui, sans-serif',
    });
    this.root.innerHTML = `
      <div class="mm-wrap" style="text-align:center;min-width:360px">
        <div class="mm-title" style="font-size:64px;letter-spacing:12px;color:#ffd9a0;text-shadow:0 0 24px rgba(255,190,110,0.35)">LUMEN</div>
        <div style="font-size:14px;letter-spacing:4px;color:#7d8694;margin-top:6px;margin-bottom:38px">ФОНАРЬ, КОТОРЫЙ ПРОСНУЛСЯ</div>
        <div class="mm-items"></div>
        <div style="font-size:13px;color:#5d6470;margin-top:34px">↑ ↓ выбрать · Enter / Пробел — открыть</div>
      </div>`;
    this.list = this.root.querySelector('.mm-items');
    this.renderItems();
  }

  renderItems() {
    this.list.innerHTML = '';
    this.items.forEach((it, i) => {
      const sel = i === this.index;
      const row = document.createElement('div');
      row.dataset.id = it.id;
      Object.assign(row.style, {
        margin: '10px 0', padding: '14px 28px', cursor: 'pointer', borderRadius: '10px',
        border: `1px solid ${sel ? '#ffb36b' : 'rgba(255,255,255,0.08)'}`,
        background: sel ? 'linear-gradient(90deg, rgba(255,160,80,0.18), rgba(255,160,80,0.02))' : 'rgba(255,255,255,0.02)',
        boxShadow: sel ? '0 0 22px rgba(255,160,80,0.25)' : 'none',
        transition: 'all 0.15s ease',
      });
      row.innerHTML = `
        <div style="font-size:26px;color:${sel ? '#ffe9c8' : '#a9a396'}">${it.title}</div>
        <div style="font-size:13px;color:#7d8694;margin-top:4px">${it.sub}</div>`;
      row.onmouseenter = () => { this.index = i; this.renderItems(); };
      row.onclick = () => { this.index = i; this.choose(); };   // click picks the row that was clicked
      this.list.appendChild(row);
    });
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
    this.root.style.display = 'flex';
    window.addEventListener('keydown', this.onKey);
  }

  hide() {
    this.visible = false;
    this.root.style.display = 'none';
    window.removeEventListener('keydown', this.onKey);
  }
}
