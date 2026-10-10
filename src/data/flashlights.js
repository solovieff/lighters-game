// Real flashlight specs. Numbers are copied from the design doc and must NOT be changed here.
// Stage 3 uses only the Convoy S2+ entry; the other seven arrive in stage 7.
// source: official = manufacturer, review = reviewer measurement, estimate/assumption = calculation or gameplay assumption.

export const FLASHLIGHTS = [
  {
    id: 'convoy_s2plus_sst40', brand: 'Convoy', model: 'S2+ SST40',
    role: 'Стартовый. Бюджетная легенда, удобен для модов.',
    price: 0, emitter: 'Luminus SST40', emitterType: 'LED', cct: 6500, cri: 70, criSource: 'assumption',
    battery: { format: '18650', mAh: 3000, rechargeable: true, onboardCharging: false, source: 'assumption' },
    massG: 120, massSource: 'estimate (76 g body + cell)',
    lengthMm: 118, headMm: 24.1, bodyMm: 22,
    ip: 'not rated', canDive: false, diveDepthM: 0,
    thermalLimitC: 55, thermalSource: 'official: 55 °C thermal control',
    ui: 'clicky',
    modes: [
      { name: '0.1%', lumens: 1.5,  cd: 19,    runtimeMin: 43200, source: 'estimate' },
      { name: '3%',   lumens: 44,   cd: 569,   runtimeMin: 1800,  source: 'estimate' },
      { name: '30%',  lumens: 435,  cd: 5689,  runtimeMin: 180,   source: 'estimate' },
      { name: '100%', lumens: 1450, cd: 18963, runtimeMin: 60,    source: 'review (1450 lm / 18963 cd)',
        turbo: true, steps: [ { lumens: 1450, minutes: 1.5 }, { lumens: 600, minutes: 60 } ] },
    ],
    strobe: false, // unlocked by the "12-group firmware" mod
    features: ['tailstand', 'clicky', 'copperDTP'],
    look: { bodyColor: '#6b6e72', finish: 'grey anodized', reflector: 'smooth', switch: 'tail clicky', knurling: 'diamond' }
  },
];
