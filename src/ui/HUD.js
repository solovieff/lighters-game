// Debug HUD (HTML over canvas): charge, temperature, mode, lumens, candela, throw, notices.
// Stage 4 version. The full UI (menus, boss bar, OLED style) comes in stage 9.

export class HUD {
  /** @param {import('../core/EventBus.js').EventBus} bus */
  constructor(bus) {
    this.panel = document.createElement('div');
    Object.assign(this.panel.style, {
      position: 'fixed', left: '12px', top: '10px', color: '#cfd6e0', font: '15px monospace',
      pointerEvents: 'none', whiteSpace: 'pre', lineHeight: '1.45',
      textShadow: '0 0 4px #000',
    });
    document.body.appendChild(this.panel);

    this.notice = document.createElement('div');
    Object.assign(this.notice.style, {
      position: 'fixed', left: '50%', top: '18%', transform: 'translateX(-50%)',
      color: '#ffb36b', font: '26px monospace', pointerEvents: 'none', opacity: '0',
      textShadow: '0 0 8px #000', transition: 'opacity 0.2s',
    });
    document.body.appendChild(this.notice);
    this.noticeTimer = 0;

    this.hint = document.createElement('div');
    Object.assign(this.hint.style, {
      position: 'fixed', left: '12px', bottom: '10px', color: '#7d8694', font: '13px monospace',
      pointerEvents: 'none',
    });
    this.hint.textContent = 'WASD ходьба · Пробел прыжок · стрелки луч · Q/E режим · L свет · C заряд (тест) · Esc пауза';
    document.body.appendChild(this.hint);

    bus.on('stepDown', ({ step }) => this.show(`СТУПЕНЬ ВНИЗ → ${step + 1}`));
    bus.on('overheat', () => this.show('ПЕРЕГРЕВ'));
    bus.on('lvp', () => this.show('LVP'));
    bus.on('batteryLow', () => this.show('Заряд низкий'));
    bus.on('batteryDead', () => this.show('Батарея разряжена'));
    bus.on('turboBlocked', ({ tempC }) => this.show(`Турбо недоступен: ${Math.round(tempC)} °C`));
  }

  /** Shows a short centered notice for about 1.8 s. */
  show(text) {
    this.notice.textContent = text;
    this.notice.style.opacity = '1';
    this.noticeTimer = 1.8;
  }

  /**
   * @param {number} dt seconds (real, for notice fade)
   * @param {import('../light/PowerSystem.js').PowerSystem} p
   */
  update(dt, p) {
    if (this.noticeTimer > 0) {
      this.noticeTimer -= dt;
      if (this.noticeTimer <= 0) this.notice.style.opacity = '0';
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
      `Температура: ${p.tempC.toFixed(0)} °C  (лимит ${p.limitC} °C)\n` +
      `Режим:       ${modeLabel}  ${p.on ? '' : '[выкл]'}\n` +
      `Свет:        ${Math.round(p.lumens)} лм · ${Math.round(p.cd)} кд\n` +
      `Дальность:   ${throwText}\n` +
      `Искры: 0   Жизни: 3`;
  }
}
