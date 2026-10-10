// Mods for the Workshop. Prices are in Sparks. Mod names are Russian UI text.
// Each mod has a target: 'flashlight' (applies to one light) or 'all' (any Fireflies etc.).
// Effects are applied by the game when the hero is built (stage 7 wiring in main.js).

export const MODS = [
  { id: 'convoy_battery_3500', target: 'convoy_s2plus_sst40', name: 'Аккумулятор 18650 3500 мАч',
    price: 150, effect: { capacityMult: 3500 / 3000 }, source: 'assumption (+17 % capacity)' },
  { id: 'convoy_12group', target: 'convoy_s2plus_sst40', name: 'Прошивка 12 групп',
    price: 250, effect: { unlockStrobe: true }, source: 'official driver feature' },
  { id: 'convoy_copper_dtp', target: 'convoy_s2plus_sst40', name: 'Медная DTP-плата + термопаста',
    price: 300, effect: { turboStepMult: 1.3 }, source: 'assumption (Turbo step ×1.3)' },
  { id: 'convoy_reflector_smo', target: 'convoy_s2plus_sst40', name: 'Отражатель OP ↔ SMO',
    price: 200, effect: { reflectorToggle: { op: { cdMult: 0.8, hotspotWider: true }, smo: { cdMult: 1.0 } } },
    source: 'OP cd ×0.8 (assumption), SMO as spec (assumption)' },

  { id: 'maglite_d_cells', target: 'maglite_ml300l_3d', name: 'Набор батареек D',
    price: 200, effect: { startSpareDCells: 3 }, source: 'official (3 × D)' },

  { id: 'l19_osram_green', target: 'acebeam_l19_2', name: 'Эмиттер OSRAM Green',
    price: 700, effect: { emitterSwap: { beamColor: '#4dff6a', turboLumens: 2200, turboCd: 577600, throwM: 1520 } },
    source: 'official variant' },

  { id: 'fireflies_thermal_70', target: 'fireflies', name: 'Термопотолок Anduril 70 °C',
    price: 0, unlockAfterLevel: 1, effect: { thermalLimitC: 70, turboFirstStepMult: 2, turboSecondStepLumensMult: 1.5, turboDrainMult: 1.5 },
    source: 'official firmware setting (step ×2 and ×1.5 are measured/assumption)' },

  { id: 'comet_swap_optic', target: 'fireflies_x4q_comet', name: 'Сменная линза',
    price: 0, effect: { optics: 'toggle' }, source: 'official (second optic ships in box)' },
  { id: 'stellar_swap_optic', target: 'fireflies_x4_stellar', name: 'Сменная линза',
    price: 0, effect: { optics: 'toggle' }, source: 'official (second optic ships in box)' },
  { id: 'stellar_ffl351a', target: 'fireflies_x4_stellar', name: 'Эмиттер FFL351A 4000K CRI95',
    price: 500, effect: { emitterSwap: { cct: 4000, cri: 95, cdMult: 0.65, fogDamageMult: 1.5 } },
    source: 'official variant (cd ×0.65 assumption)' },

  { id: 'helios_sft70', target: 'fireflies_l70_helios', name: 'Эмиттер SFT70',
    price: 600, effect: { emitterSwap: { lumensTo: 3000, cdMult: 1.4 } },
    source: 'official variant (cd ×1.4 assumption)' },
];

/** Mods available for a given flashlight id (includes 'fireflies' group mods). */
export function modsFor(flashlightId, brand) {
  return MODS.filter((m) => m.target === flashlightId || (m.target === 'fireflies' && brand === 'Fireflies'));
}
