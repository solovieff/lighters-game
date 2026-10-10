// Workshop screen (Мастерская): list of all flashlights (owned/locked, price), buy, select active body,
// mods, and a spec card with source tags on every number. Pure DOM, Russian UI text.
import { FLASHLIGHTS } from '../data/flashlights.js';
import { MODS, modsFor } from '../data/upgrades.js';
import { SaveSystem } from './SaveSystem.js';
import { summarizeSpec } from '../light/BeamModel.js';

/** Small source tag shown next to a number: official / review / estimate / assumption. */
function tag(source) {
  const s = (source || '').toLowerCase();
  let kind = 'est';
  if (s.startsWith('official')) kind = 'off';
  else if (s.startsWith('review')) kind = 'rev';
  else if (s.startsWith('assumption')) kind = 'ass';
  const label = { off: 'official', rev: 'review', est: 'estimate', ass: 'assumption' }[kind];
  const color = { off: '#7fd9a0', rev: '#8fc7ff', est: '#c9b99a', ass: '#ffb36b' }[kind];
  return `<span class="src" style="color:${color}">[${label}]</span>`;
}

const STYLE = `
  .ws-root { position: fixed; inset: 0; display: none; align-items: center; justify-content: center;
    background: radial-gradient(ellipse at center, rgba(40,28,16,1) 0%, rgba(4,4,6,1) 75%);   // opaque: the game must not show through
    z-index: 15; font-family: 'Red Hat Display', system-ui, sans-serif; color: #e6dfcf; }
  .workshop { width: min(1100px, 94vw); height: min(680px, 90vh); display: flex; flex-direction: column;
    background: rgba(12,10,8,0.6); border: 1px solid rgba(255,190,110,0.18); border-radius: 14px;
    box-shadow: 0 0 60px rgba(255,160,80,0.08); overflow: hidden; }
  .ws-head { display: flex; justify-content: space-between; align-items: baseline; padding: 18px 26px;
    border-bottom: 1px solid rgba(255,255,255,0.06); }
  .ws-title { font-size: 30px; color: #ffd9a0; letter-spacing: 4px; }
  .ws-sparks { font-size: 15px; color: #c9a27a; }
  .ws-body { flex: 1; display: flex; min-height: 0; }
  .ws-list { width: 360px; overflow-y: auto; padding: 14px; border-right: 1px solid rgba(255,255,255,0.06); }
  .ws-row { padding: 12px 14px; margin-bottom: 8px; border-radius: 10px; cursor: pointer;
    border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.02); transition: all .15s ease; }
  .ws-row:hover { background: rgba(255,255,255,0.05); }
  .ws-row.sel { border-color: #ffb36b; background: linear-gradient(90deg, rgba(255,160,80,0.18), rgba(255,160,80,0.02));
    box-shadow: 0 0 18px rgba(255,160,80,0.2); }
  .ws-row .ws-name { font-size: 16px; color: #e6dfcf; }
  .ws-row .ws-sub { font-size: 12px; color: #7d8694; margin-top: 3px; }
  .ws-row .ws-price { font-size: 12px; color: #c9a27a; margin-top: 4px; }
  .ws-card { flex: 1; overflow-y: auto; padding: 22px 28px; }
  .ws-card-title { font-size: 26px; color: #ffe9c8; }
  .ws-role { font-size: 14px; color: #c9a27a; margin-top: 4px; margin-bottom: 16px; }
  .ws-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 22px; margin-bottom: 18px; }
  .ws-stat { border-left: 2px solid rgba(255,190,110,0.35); padding-left: 10px; }
  .ws-stat .k { font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: #7d8694; }
  .ws-stat .v { font-size: 16px; color: #e6dfcf; margin-top: 2px; }
  .ws-subtitle { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #7d8694; margin: 14px 0 6px; }
  .ws-mode { font-size: 13px; color: #c9c4b8; padding: 3px 0; }
  .ws-mod { font-size: 13px; color: #c9c4b8; padding: 4px 0; }
  .ws-btn { margin-top: 8px; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 15px;
    border: 1px solid #ffb36b; background: rgba(255,160,80,0.14); color: #ffe9c8; }
  .ws-btn:hover { background: rgba(255,160,80,0.26); }
  .ws-note { font-size: 13px; color: #c9a27a; }
  .ws-foot { display: flex; justify-content: space-between; align-items: center; padding: 14px 26px;
    border-top: 1px solid rgba(255,255,255,0.06); }
  .ws-msg { font-size: 14px; color: #c9a27a; }
  .src { font-size: 11px; margin-left: 4px; opacity: 0.85; }
`;

export class Workshop {
  /**
   * @param {HTMLElement} root container element
   * @param {(id: string) => void} onSelect called when the player selects a body to play with
   * @param {() => void} onBack called when the player leaves the workshop
   */
  constructor(root, onSelect, onBack) {
    this.root = root;
    this.onSelect = onSelect;
    this.onBack = onBack;
    this.selectedId = SaveSystem.load().active;
    this.message = '';
    if (!document.getElementById('ws-style')) {
      const st = document.createElement('style');
      st.id = 'ws-style';
      st.textContent = STYLE;
      document.head.appendChild(st);
    }
    this.root.classList.add('ws-root');
  }

  open() {
    this.root.style.display = 'flex';
    this.render();
  }

  close() {
    this.root.style.display = 'none';
  }

  /** Left: the list of bodies. Right: the card of the selected one. Selecting a row updates the card at once. */
  render() {
    const d = SaveSystem.load();
    const spec = FLASHLIGHTS.find((f) => f.id === this.selectedId) || FLASHLIGHTS[0];
    this.root.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'workshop';
    wrap.innerHTML = `
      <div class="ws-head">
        <div class="ws-title">МАСТЕРСКАЯ</div>
        <div class="ws-sparks">Искры: ${d.sparks}</div>
      </div>
      <div class="ws-body">
        <div class="ws-list"></div>
        <div class="ws-card"></div>
      </div>
      <div class="ws-foot">
        <div class="ws-msg">${this.message}</div>
        <button class="ws-btn" data-act="back">Назад</button>
      </div>`;
    this.root.appendChild(wrap);

    this.renderList(wrap.querySelector('.ws-list'), d);
    this.renderCard(wrap.querySelector('.ws-card'), spec, d);
    wrap.querySelector('[data-act="back"]').onclick = () => this.onBack();
  }

  renderList(list, d) {
    for (const f of FLASHLIGHTS) {
      const owned = d.owned.includes(f.id);
      const active = d.active === f.id;
      const row = document.createElement('div');
      row.className = 'ws-row' + (this.selectedId === f.id ? ' sel' : '');
      const title = f.nickname ? `${f.brand} ${f.model} «${f.nickname}»` : `${f.brand} ${f.model}`;
      const state = active ? 'в игре' : (owned ? 'куплен' : `${f.price} Искр`);
      row.innerHTML = `<div class="ws-name">${title}</div><div class="ws-sub">${f.role}</div><div class="ws-price">${state}</div>`;
      row.onclick = () => { this.selectedId = f.id; this.message = ''; this.render(); };
      list.appendChild(row);
    }
  }

  renderCard(card, f, d) {
    const owned = d.owned.includes(f.id);
    const active = d.active === f.id;
    const top = f.modes.reduce((a, b) => (b.lumens > a.lumens ? b : a));
    const sum = summarizeSpec(f);
    const modeRows = f.modes.map((m) =>
      `<div class="ws-mode">${m.name}: ${m.lumens} лм · ${m.cd} кд · ${(m.runtimeMin / 60).toFixed(1)} ч ${tag(m.source)}</div>`
    ).join('');

    const mods = modsFor(f.id, f.brand);
    const modRows = mods.length
      ? mods.map((m) => {
        const has = SaveSystem.hasMod(m.id);
        const free = m.price === 0;
        const label = has ? 'куплено' : (free ? 'бесплатно' : `${m.price} Искр`);
        return `<div class="ws-mod">${m.name} — ${label} ${tag(m.source)}
          ${owned && !has ? `<button class="ws-btn" data-mod="${m.id}" data-price="${m.price}">Купить</button>` : ''}</div>`;
      }).join('')
      : '<div class="ws-mod">Модов нет</div>';

    const title = f.nickname ? `${f.brand} ${f.model} «${f.nickname}»` : `${f.brand} ${f.model}`;
    const stat = (k, v, src) => `<div class="ws-stat"><div class="k">${k}</div><div class="v">${v} ${src ? tag(src) : ''}</div></div>`;
    card.innerHTML = `
      <div class="ws-card-title">${title}</div>
      <div class="ws-role">${f.role}</div>
      <div class="ws-stats">
        ${stat('Светодиод', f.emitter, f.criSource)}
        ${stat('CRI / CCT', `${f.cri} · ${f.cct} K`, f.criSource)}
        ${stat(`Макс. ${top.name}`, `${top.lumens} лм · ${top.cd} кд`, top.source)}
        ${stat('Дальность', `${sum.throwReal.toFixed(1)} м · игра ${sum.throwGame.toFixed(2)} м`, 'estimate (ANSI FL1 from cd)')}
        ${stat('Hotspot', `${sum.thetaHotDeg.toFixed(1)}°`, 'estimate (from lumens and cd)')}
        ${stat('Батарея', `${f.battery.format}, ${f.battery.mAh} мАч`, f.battery.source)}
        ${stat('Вес / длина', `${f.massG} г · ${f.lengthMm} мм`, f.massSource)}
        ${stat('Защита / UI', `IP ${f.ip} · ${f.ui}`, 'official')}
        ${stat('Термолимит', `${f.thermalLimitC} °C`, f.thermalSource)}
      </div>
      <div class="ws-subtitle">Режимы</div>
      ${modeRows}
      <div class="ws-subtitle">Моды</div>
      ${modRows}
      <div style="margin-top:18px">${this.actionButtons(f, owned, active)}</div>`;

    card.querySelectorAll('[data-mod]').forEach((btn) => {
      btn.onclick = () => this.buyMod(btn.dataset.mod, Number(btn.dataset.price));
    });
    card.querySelector('[data-act="buy"]')?.addEventListener('click', () => this.buy(f));
    card.querySelector('[data-act="select"]')?.addEventListener('click', () => this.select(f));
  }

  actionButtons(f, owned, active) {
    if (!owned) {
      return `<button class="ws-btn" data-act="buy">Купить за ${f.price} Искр</button>`;
    }
    if (active) return '<span class="ws-note">Сейчас в игре</span>';
    return '<button class="ws-btn" data-act="select">Играть этим</button>';
  }

  buy(f) {
    if (SaveSystem.buyFlashlight(f.id, f.price)) {
      this.message = `Куплен: ${f.model}`;
    } else {
      this.message = 'Не хватает Искр';
    }
    this.render();
  }

  select(f) {
    SaveSystem.setActive(f.id);
    this.message = `Теперь играешь: ${f.model}`;
    this.onSelect(f.id);
    this.render();
  }

  buyMod(modId, price) {
    if (SaveSystem.buyMod(modId, price)) {
      this.message = 'Мод установлен';
    } else {
      this.message = 'Не хватает Искр';
    }
    this.render();
  }
}

export { MODS };
