// Applies installed mods to a COPY of a flashlight spec. The real specs in flashlights.js are never changed.
// Effects that need UI we do not have yet (optic toggle, reflector toggle, unlock after level) are recorded in
// `flags` and documented in the card, not silently dropped.
import { FLASHLIGHTS } from './flashlights.js';
import { modsFor } from './upgrades.js';

/**
 * @param {string} baseId flashlight id (e.g. 'convoy_s2plus_sst40')
 * @param {string[]} installedMods mod ids the player owns
 * @returns {object} spec copy with mods applied, plus `flags`
 */
export function effectiveSpec(baseId, installedMods = []) {
  const base = FLASHLIGHTS.find((f) => f.id === baseId);
  if (!base) throw new Error(`unknown flashlight: ${baseId}`);
  const s = JSON.parse(JSON.stringify(base));
  s.flags = { strobeUnlocked: false, spareDCells: 0, beamColor: null, pendingEffects: [] };

  const owned = modsFor(baseId, base.brand).filter((m) => installedMods.includes(m.id));
  const turbo = s.modes.find((m) => m.turbo);
  const scaleCd = (k) => s.modes.forEach((m) => { m.cd *= k; });

  for (const m of owned) {
    switch (m.id) {
      case 'convoy_battery_3500':
        // +17 % capacity = +17 % runtime in every mode.
        s.modes.forEach((x) => { x.runtimeMin *= 3500 / 3000; });
        break;
      case 'convoy_12group':
        s.strobe = true;
        s.flags.strobeUnlocked = true;
        break;
      case 'convoy_copper_dtp':
        // Turbo step durations ×1.3 (assumption from the design doc).
        s.modes.forEach((x) => { if (x.name === '100%') (x.steps || []).forEach((st) => { st.minutes *= 1.3; }); });
        break;
      case 'convoy_reflector_smo':
        // Default state is OP (cd ×0.8). The OP ↔ SMO toggle has no UI yet.
        scaleCd(0.8);
        s.flags.pendingEffects.push('Переключатель OP ↔ SMO в интерфейсе ещё не сделан');
        break;
      case 'maglite_d_cells':
        s.flags.spareDCells = 3;
        break;
      case 'l19_osram_green':
        s.flags.beamColor = '#4dff6a';
        if (turbo) {
          turbo.lumens = 2200;
          turbo.cd = 577600;
          turbo.steps[0].lumens = 2200;
        }
        break;
      case 'fireflies_thermal_70':
        if (s.brand === 'Fireflies') {
          s.thermalLimitC = 70;
          // The firmware changes only the top "Turbo" mode, not the L6 step-down mode.
          const top = s.modes.find((x) => x.name === 'Turbo');
          if (top && top.steps) {
            top.steps[0].minutes *= 2;                       // first step ×2
            if (top.steps[1]) top.steps[1].lumens *= 1.5;    // second step ×1.5
            top.runtimeMin /= 1.5;                           // Turbo drain ×1.5
          }
        }
        break;
      case 'stellar_ffl351a':
        s.cct = 4000;
        s.cri = 95;
        scaleCd(0.65);
        break;
      case 'helios_sft70':
        if (turbo) {
          turbo.lumens = 3000;
          turbo.steps[0].lumens = 3000;
        }
        scaleCd(1.4);
        break;
      case 'comet_swap_optic':
      case 'stellar_swap_optic':
        s.flags.pendingEffects.push('Сменная линза: переключатель в интерфейсе ещё не сделан');
        break;
      default:
        break;
    }
  }
  return s;
}
