// HUD over the canvas: charge, temperature, mode, lumens and throw, Sparks, lives, boss bar,
// tutorial hints, notices and centred overlays (death, victory). Full menus and styling come in stage 9.
import { HEAT } from '../core/config.js';

/** Creates a fixed-position HUD block and appends it to the page. */
function makeBlock(css) {
  const d = document.createElement('div');
  Object.assign(d.style, { position: 'fixed', pointerEvents: 'none', ...css });
  document.body.appendChild(d);
  return d;
}

export class HUD {
  /** @param {import('../core/EventBus.js').EventBus} bus */
  constructor(bus) {
    this.lives = 0;
    this.sparks = 0;
    this.noticeTimer = 0;
    this.hintTimer = 0;

    this.panel = makeBlock({
      left: '12px', top: '10px', color: '#cfd6e0', font: '15px monospace',
      whiteSpace: 'pre', lineHeight: '1.45', textShadow: '0 0 4px #000',
    });

    this.notice = makeBlock({
      left: '50%', top: '18%', transform: 'translateX(-50%)', color: '#ffb36b',
      font: '26px monospace', opacity: '0', textShadow: '0 0 8px #000', transition: 'opacity 0.2s',
    });

    this.hint = makeBlock({
      left: '50%', bottom: '44px', transform: 'translateX(-50%)', color: '#f2e6c9',
      font: '18px sans-serif', opacity: '0', textShadow: '0 0 6px #000', transition: 'opacity 0.3s',
      background: 'rgba(0,0,0,0.45)', padding: '6px 14px', borderRadius: '6px',
    });

    this.controls = makeBlock({
      right: '12px', top: '10px', color: '#7d8694', font: '13px monospace', textAlign: 'right',
    });
    this.controls.textContent =
      'WASD ходьба · Пробел прыжок · стрелки луч · Q/E режим · L свет · C заряд (тест) · Esc пауза';

    this.bossBox = makeBlock({
      left: '50%', top: '10px', transform: 'translateX(-50%)', width: '420px', display: 'none',
      color: '#ffb0c0', font: '15px sans-serif', textAlign: 'center', textShadow: '0 0 6px #000',
    });
    this.bossName = document.createElement('div');
    this.bossBox.appendChild(this.bossName);
    this.bossBar = document.createElement('div');
    Object.assign(this.bossBar.style, {
      height: '10px', marginTop: '4px', background: '#ff4d6d', borderRadius: '3px', width: '100%',
    });
    this.bossBox.appendChild(this.bossBar);

    this.overlay = makeBlock({
      inset: '0', display: 'none', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', background: 'rgba(0,0,0,0.6)', textAlign: 'center',
    });

    bus.on('stepDown', ({ step }) => this.showNotice(`СТУПЕНЬ ВНИЗ → ${step + 1}`));
    bus.on('overheat', () => this.showNotice('ПЕРЕГРЕВ'));
    bus.on('lvp', () => this.showNotice('LVP'));
    bus.on('batteryLow', () => this.showNotice('Заряд низкий'));
    bus.on('turboBlocked', ({ tempC }) => this.showNotice(`Турбо недоступен: ${Math.round(tempC)} °C`));
    bus.on('hint', ({ text }) => this.showHint(text));
  }

  /** Shows a short centred notice for about 1.8 s. */
  showNotice(text) {
    this.notice.textContent = text;
    this.notice.style.opacity = '1';
    this.noticeTimer = 1.8;
  }

  /** Shows a tutorial hint for about 5 s. */
  showHint(text) {
    this.hint.textContent = text;
    this.hint.style.opacity = '1';
    this.hintTimer = 5;
  }

  /** Hides or shows every HUD block (used while the main menu is open). */
  setHidden(hidden) {
    const d = hidden ? 'none' : '';
    for (const el of [this.panel, this.controls, this.hint, this.notice, this.bossBox]) el.style.display = d;
  }

  setLives(n) {
    this.lives = n;
  }

  setSparks(n) {
    this.sparks = n;
  }

  /** @param {{name:string, frac:number}|null} info boss to show, or null to hide the bar */
  setBoss(info) {
    if (!info) {
      this.bossBox.style.display = 'none';
      return;
    }
    this.bossBox.style.display = 'block';
    this.bossName.textContent = info.name;
    this.bossBar.style.width = `${Math.round(info.frac * 100)}%`;
  }

  /**
   * Shows a centred overlay, or hides it when content is null.
   * @param {{title:string, lines?:string[], footer?:string}|null} content
   */
  setOverlay(content) {
    if (!content) {
      this.overlay.style.display = 'none';
      return;
    }
    this.overlay.replaceChildren();
    const add = (text, css) => {
      const d = document.createElement('div');
      d.textContent = text;
      Object.assign(d.style, css);
      this.overlay.appendChild(d);
    };
    add(content.title, { font: '36px sans-serif', color: '#ffd9a0', marginBottom: '12px' });
    for (const line of content.lines || []) add(line, { font: '20px sans-serif', color: '#c9c4b8' });
    if (content.footer) add(content.footer, { font: '16px sans-serif', color: '#7d8694', marginTop: '18px' });
    this.overlay.style.display = 'flex';
  }

  /**
   * @param {number} dt seconds (real, for notice and hint fade)
   * @param {import('../light/PowerSystem.js').PowerSystem} p
   */
  update(dt, p) {
    if (this.noticeTimer > 0) {
      this.noticeTimer -= dt;
      if (this.noticeTimer <= 0) this.notice.style.opacity = '0';
    }
    if (this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) this.hint.style.opacity = '0';
    }

    const filled = Math.round(p.charge / 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
    const modeLabel = p.isTurbo
      ? `${p.mode.name} (ступень ${p.stepIndex + 1}/${p.mode.steps.length})`
      : p.mode.name;
    const throwReal = p.cd > 0 ? 2 * Math.sqrt(p.cd) : 0;
    const throwGame = throwReal * 0.02;
    const throwText = p.cd > 0 ? `${Math.round(throwReal)} м (${throwGame.toFixed(1)} м)` : '—';

    this.panel.textContent =
      `Заряд:       ${p.charge.toFixed(0).padStart(3)} %  ${bar}${p.sagActive ? '  SAG' : ''}${p.lvpActive ? '  LVP' : ''}\n` +
      `Температура: ${p.tempC.toFixed(0)} °C  (лимит ${p.limitC} °C, Турбо до ${p.limitC - HEAT.turboRecoverMarginC} °C)\n` +
      `Режим:       ${modeLabel}  ${p.on ? '' : '[выкл]'}\n` +
      `Свет:        ${Math.round(p.lumens)} лм · ${Math.round(p.cd)} кд\n` +
      `Дальность:   ${throwText}\n` +
      `Искры: ${this.sparks}   Жизни: ${this.lives}`;
  }
}
