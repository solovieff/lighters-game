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
  }

  open() {
    this.root.style.display = 'flex';
    this.render();
  }

  close() {
    this.root.style.display = 'none';
  }

  render() {
    const d = SaveSystem.load();
    const spec = FLASHLIGHTS.find((f) => f.id === this.selectedId) || FLASHLIGHTS[0];
    this.root.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'workshop';
    wrap.innerHTML = `
      <div class="ws-head">
        <div class="ws-title">Мастерская</div>
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
      row.className = 'ws-row' + (this.selectedId === f.id ? ' sel' : '') + (owned ? '' : ' locked');
      const title = f.nickname ? `${f.brand} ${f.model} «${f.nickname}»` : `${f.brand} ${f.model}`;
      row.innerHTML = `<div>${title}</div><div class="ws-price">${owned ? (active ? 'в игре' : 'куплен') : `${f.price} Искр`}</div>`;
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
    card.innerHTML = `
      <div class="ws-card-title">${title}</div>
      <div class="ws-role">${f.role}</div>
      <div class="ws-line">Светодиод: ${f.emitter} ${tag(f.criSource)}</div>
      <div class="ws-line">CRI ${f.cri} ${tag(f.criSource)} · ${f.cct} K</div>
      <div class="ws-line">Макс. режим ${top.name}: ${top.lumens} лм · ${top.cd} кд ${tag(top.source)}</div>
      <div class="ws-line">Дальность ${sum.throwReal.toFixed(1)} м (игра ${sum.throwGame.toFixed(2)} м) ${tag('estimate (ANSI FL1 from cd)')}</div>
      <div class="ws-line">Hotspot ${sum.thetaHotDeg.toFixed(1)}° ${tag('estimate (from lumens and cd)')}</div>
      <div class="ws-line">Батарея: ${f.battery.format}, ${f.battery.mAh} мАч ${tag(f.battery.source)}</div>
      <div class="ws-line">Вес ${f.massG} г ${tag(f.massSource)} · ${f.lengthMm} мм · IP ${f.ip} ${tag('official')}</div>
      <div class="ws-line">Интерфейс: ${f.ui} · термолимит ${f.thermalLimitC} °C ${tag(f.thermalSource)}</div>
      <div class="ws-modes">${modeRows}</div>
      <div class="ws-mods"><div class="ws-subtitle">Моды</div>${modRows}</div>
      <div class="ws-actions">${this.actionButtons(f, owned, active)}</div>`;

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
