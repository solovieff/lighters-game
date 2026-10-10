// Real flashlight specs. Numbers are copied from the design doc and must NOT be changed here.
// source: official = manufacturer, review = reviewer measurement, estimate/assumption = calculation or gameplay assumption.
// role and nickname are Russian UI text.

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
  {
    id: 'maglite_ml300l_3d', brand: 'Maglite', model: 'ML300L 3D',
    role: 'Танк. Тяжёлый, не заряжается, зато фокусировка, огромное время работы и ломает всё.',
    price: 550, emitter: 'LED', emitterType: 'LED', cct: 5000, cri: 70, criSource: 'assumption',
    battery: { format: '3 × D (alkaline)', mAh: 15000, rechargeable: false, onboardCharging: false,
               source: 'official (count and type), mAh — estimate' },
    massG: 748, massSource: 'official',
    lengthMm: 298.45, headMm: 57.15, bodyMm: 38.1,
    ip: 'IPX4', canDive: false, diveDepthM: 0,
    thermalLimitC: 60, thermalSource: 'assumption',
    ui: 'maglite',
    focusable: true, // official: Quick Focus spot-to-flood. Flood: cd ×0.15, thetaHot ×4 (assumption)
    modes: [
      { name: 'Eco',  lumens: 23,  cd: 1252,  runtimeMin: 17880, source: 'official (cd — estimate)' },
      { name: 'Low',  lumens: 102, cd: 5551,  runtimeMin: 6720,  source: 'official (cd — estimate)' },
      { name: 'High', lumens: 746, cd: 40596, runtimeMin: 1920,  source: 'official' },
    ],
    strobe: true,
    features: ['heavy', 'breaksCrates', 'breaksGlass', 'focusable', 'nonRechargeable'],
    look: { bodyColor: '#141414', altColors: ['#8b1a1a', '#b8b8b8', '#1d3f8a', '#5a5a5a'], finish: 'anodized aluminum', reflector: 'smooth', knurling: 'diamond, full length', switch: 'body button near head' }
  },
  {
    id: 'fireflies_x1q_core', brand: 'Fireflies', model: 'X1Q Core', nickname: 'Ядро',
    role: 'Ядро. Компактный 21700 на Anduril 2: ровный свет до самого разряда, CRI 95 — видит Невидимок и цветные метки.',
    price: 900, emitter: 'FFL707A 5000K CRI95', emitterType: 'LED', cct: 5000, cri: 95, criSource: 'official',
    battery: { format: '21700 (unprotected, flat-top)', mAh: 5000, rechargeable: true, onboardCharging: false,
               source: 'official (format), mAh — assumption' },
    massG: 158, massSource: 'review 1Lumen (89 g without cell — official)',
    lengthMm: 113, headMm: 30, bodyMm: 25.5,
    ip: 'IPX8', canDive: true, diveDepthM: 2, // depth — assumption
    thermalLimitC: 50, thermalSource: 'assumption (typical Anduril default, configurable)',
    ui: 'anduril2', driver: 'Lume X1 40W boost', regulatedBoost: true,
    modes: [
      { name: 'L1',    lumens: 1,    cd: 4,     runtimeMin: 6000, source: 'estimate' },
      { name: 'L3',    lumens: 83,   cd: 330,   runtimeMin: 2109, source: 'review 1Lumen' },
      { name: 'L4',    lumens: 338,  cd: 1630,  runtimeMin: 506,  source: 'review 1Lumen' },
      { name: 'L5',    lumens: 886,  cd: 4050,  runtimeMin: 272,  source: 'review 1Lumen' },
      { name: 'L6',    lumens: 1835, cd: 8250,  runtimeMin: 287,  source: 'review 1Lumen', turbo: true,
        steps: [ { lumens: 1835, minutes: 1.5 }, { lumens: 643, minutes: 285 } ] }, // 1st step duration — estimate
      { name: 'Turbo', lumens: 2800, cd: 11000, runtimeMin: 266,  source: 'official (lm, cd), runtime — review', turbo: true,
        steps: [ { lumens: 2800, minutes: 0.5 }, { lumens: 669, minutes: 265 } ] }, // measured: 2125 lm @30 s, 669 lm @10 min
    ],
    strobe: true,
    features: ['magneticTail', 'auxRGB', 'rgbSideSwitch', 'anduril2', 'regulatedBoost', 'highCRI'],
    look: { bodyColor: '#2b2d30', finish: 'anodized 6063', reflector: 'OP', bezel: 'stainless steel', switch: 'side RGB e-switch' }
  },
  {
    id: 'fireflies_l70_helios', brand: 'Fireflies', model: 'L70 Helios', nickname: 'Гелиос',
    role: 'Гелиос. Г-образный: светит вбок, магниты на хвосте и сбоку, настраиваемый термопотолок.',
    price: 1000, emitter: 'FFL707A 6500K', emitterType: 'LED', cct: 6500, cri: 70, criSource: 'assumption',
    battery: { format: '21700 (unprotected, flat-top)', mAh: 5000, rechargeable: true, onboardCharging: false,
               source: 'official (format), mAh — assumption' },
    massG: 162, massSource: 'estimate (92 g without cell — official, + ~70 g cell)',
    lengthMm: 112, headMm: 31.5, bodyMm: 25,
    ip: 'IPX8', canDive: true, diveDepthM: 2,
    thermalLimitC: 50, thermalSource: 'review 1Lumen (default 50 °C, configurable up to 70 °C)',
    ui: 'anduril2', driver: 'Lume X1 40W boost', regulatedBoost: true,
    rightAngle: true, // beam perpendicular to body
    modes: [
      { name: 'L3',    lumens: 105,  cd: 350,   runtimeMin: 1800, source: 'review 1Lumen (runtime — estimate)' },
      { name: 'L4',    lumens: 390,  cd: 1475,  runtimeMin: 500,  source: 'review 1Lumen (runtime — estimate)' },
      { name: 'L5',    lumens: 1022, cd: 4025,  runtimeMin: 191,  source: 'review 1Lumen' },
      { name: 'L6',    lumens: 2052, cd: 7775,  runtimeMin: 211,  source: 'review 1Lumen', turbo: true,
        steps: [ { lumens: 2052, minutes: 1.5 }, { lumens: 738, minutes: 209 } ] },
      { name: 'Turbo', lumens: 3600, cd: 10375, runtimeMin: 205,  source: 'official (lm); cd and runtime — review', turbo: true,
        steps: [ { lumens: 3600, minutes: 0.5 }, { lumens: 1000, minutes: 3.5 }, { lumens: 700, minutes: 201 } ] }, // review: >1000 lm ~4 min, ~700 lm for over an hour
    ],
    strobe: true,
    features: ['rightAngle', 'magneticTail', 'magneticSide', 'auxRGB', 'rgbTopSwitch', 'anduril2', 'regulatedBoost', 'adjustableThermal'],
    look: { bodyColor: '#b49a6a', altColors: ['#1e2a44', '#2b2d30'], finish: 'anodized 6063 (Desert Tan / Navy)', reflector: 'OP', bezel: 'stainless steel', switch: 'top RGB e-switch', tailArmor: 'steel tail plate' }
  },
  {
    id: 'fireflies_x4q_comet', brand: 'Fireflies', model: 'X4Q Comet', nickname: 'Комета',
    role: 'Комета. Четыре светодиода, мощная заливка в крошечном корпусе, сменная оптика.',
    price: 1100, emitter: '4 × Luminus SST25 6500K', emitterType: 'LED', cct: 6500, cri: 70, criSource: 'official (≈70)',
    battery: { format: '21700 (unprotected, flat-top)', mAh: 5000, rechargeable: true, onboardCharging: false,
               source: 'official (format), mAh — assumption' },
    massG: 160, massSource: 'review 1Lumen (85 g without cell — official)',
    lengthMm: 108, headMm: 30, bodyMm: 25.5,
    ip: 'IPX8', canDive: true, diveDepthM: 2,
    thermalLimitC: 50, thermalSource: 'assumption',
    ui: 'anduril2', driver: 'Lume X1 40W boost', regulatedBoost: true,
    optics: { default: 'TIR 15°', alt: 'TIR 30° frosted', altCdMult: 0.6 }, // 2nd optic in box — official; multiplier — assumption
    modes: [
      { name: 'L3',    lumens: 111,  cd: 520,   runtimeMin: 2400, source: 'review 1Lumen (runtime — estimate)' },
      { name: 'L4',    lumens: 450,  cd: 2050,  runtimeMin: 600,  source: 'review 1Lumen (runtime — estimate)' },
      { name: 'L5',    lumens: 1150, cd: 5290,  runtimeMin: 260,  source: 'review 1Lumen (runtime — estimate)' },
      { name: 'L6',    lumens: 2247, cd: 9480,  runtimeMin: 250,  source: 'review 1Lumen (runtime — estimate)', turbo: true,
        steps: [ { lumens: 2247, minutes: 1.5 }, { lumens: 989, minutes: 248 } ] },
      { name: 'Turbo', lumens: 4000, cd: 15200, runtimeMin: 240,  source: 'official (4000 lm, 15200 cd, 276 m); runtime — estimate', turbo: true,
        steps: [ { lumens: 4000, minutes: 0.5 }, { lumens: 880, minutes: 239 } ] }, // 880 lm @10 min — review
    ],
    strobe: true,
    features: ['magneticTail', 'auxRGB', 'rgbSideSwitch', 'anduril2', 'regulatedBoost', 'swappableOptic'],
    look: { bodyColor: '#1e3a6e', altColors: ['#2b2d30'], finish: 'anodized 6063, sculpted body', reflector: 'TIR, 4 cells', bezel: 'stainless steel', switch: 'side RGB e-switch', frontAux: true }
  },
  {
    id: 'fireflies_x4_stellar', brand: 'Fireflies', model: 'X4 Stellar', nickname: 'Звёздный',
    role: 'Звёздный. Четыре светодиода, встроенная магнитная зарядка USB-C, работает как пауэрбанк.',
    price: 1300, emitter: '4 × Luminus SFT25R 6500K', emitterType: 'LED', cct: 6500, cri: 70, criSource: 'official (≈70)',
    battery: { format: '21700 (unprotected, flat-top)', mAh: 5000, rechargeable: true, onboardCharging: true, powerbank: true,
               source: 'official (format, 10 W magnetic USB-C), mAh — assumption' },
    massG: 166, massSource: 'review 1Lumen (95 g without cell — official)',
    lengthMm: 107, headMm: 32, bodyMm: 25.5,
    ip: 'IPX8', canDive: true, diveDepthM: 2,
    thermalLimitC: 50, thermalSource: 'assumption',
    ui: 'anduril2', driver: 'Lume X1 40W boost', regulatedBoost: true,
    optics: { default: 'TIR 30° textured', alt: 'TIR 15° textured', altCdMult: 1.2 }, // 1.2 — measured on FFL351A version (6100 → 7225 cd)
    modes: [
      { name: 'L3',    lumens: 88,   cd: 350,   runtimeMin: 2400, source: 'review 1Lumen (runtime — estimate)' },
      { name: 'L4',    lumens: 394,  cd: 1750,  runtimeMin: 600,  source: 'review 1Lumen (runtime — estimate)' },
      { name: 'L5',    lumens: 1073, cd: 4975,  runtimeMin: 260,  source: 'review 1Lumen (runtime — estimate)' },
      { name: 'L6',    lumens: 2273, cd: 10425, runtimeMin: 250,  source: 'review 1Lumen (runtime — estimate)', turbo: true,
        steps: [ { lumens: 2273, minutes: 1.5 }, { lumens: 1425, minutes: 248 } ] },
      { name: 'Turbo', lumens: 4000, cd: 10850, runtimeMin: 240,  source: 'official (lm); cd — review; runtime — estimate', turbo: true,
        steps: [ { lumens: 4000, minutes: 0.5 }, { lumens: 900, minutes: 239 } ] },
    ],
    strobe: true,
    features: ['magneticTail', 'auxRGB', 'anduril2', 'regulatedBoost', 'swappableOptic', 'onboardCharging', 'powerbank'],
    look: { bodyColor: '#2b2d30', finish: 'anodized 6063', reflector: 'TIR, 4 cells', bezel: 'stainless steel', switch: 'side e-switch with charge indicator', frontAux: true, magneticPort: true }
  },
  {
    id: 'acebeam_l19_2', brand: 'Acebeam', model: 'L19 2.0',
    role: 'Дальнобой. Бьёт за километр, ударный бойник ломает стекло.',
    price: 1200, emitter: 'Luminus SFT40 HI', emitterType: 'LED', cct: 6500, cri: 70, criSource: 'assumption',
    battery: { format: '21700', mAh: 5100, rechargeable: true, onboardCharging: true, source: 'official (recommended cell)' },
    massG: 284, massSource: 'official',
    lengthMm: 163.8, headMm: 60, bodyMm: 25.4,
    ip: 'IP68', canDive: true, diveDepthM: 5,
    thermalLimitC: 55, thermalSource: 'official: has thermal regulation, threshold — assumption',
    ui: 'tactical',
    modes: [
      { name: 'Moon',  lumens: 1,    cd: 5,      runtimeMin: 89280, source: 'official (cd — estimate)' },
      { name: 'Low',   lumens: 100,  cd: 12432,  runtimeMin: 1805,  source: 'official' },
      { name: 'Mid1',  lumens: 300,  cd: 36100,  runtimeMin: 585,   source: 'official' },
      { name: 'Mid2',  lumens: 630,  cd: 76729,  runtimeMin: 248,   source: 'official' },
      { name: 'High',  lumens: 1200, cd: 147840, runtimeMin: 98,    source: 'official' },
      { name: 'Turbo', lumens: 2200, cd: 293222, runtimeMin: 97.8,  source: 'official', turbo: true,
        steps: [ { lumens: 2200, minutes: 1.83 }, { lumens: 1600, minutes: 10 }, { lumens: 1200, minutes: 86 } ] },
    ],
    strobe: true, strobeLumens: 1100,
    features: ['strikeBezel', 'thrower'],
    // official variant (mod): green OSRAM — Turbo 2200 lm, 577600 cd, 1520 m
    look: { bodyColor: '#1a1a1a', finish: 'black HAIII', reflector: 'smooth, deep', bezel: 'crenellated strike bezel', knurling: 'tactical', switch: 'two tail buttons' }
  },
  {
    id: 'imalent_ms18', brand: 'Imalent', model: 'MS18',
    role: 'Монстр. 100 000 люменов, вентилятор, OLED-экран. Тяжёлый и боится воды.',
    price: 6500, emitter: '18 × CREE XHP70.2', emitterType: 'LED', cct: 6500, cri: 70, criSource: 'assumption',
    battery: { format: '8 × 21700 pack', mAh: 32000, rechargeable: true, onboardCharging: true, source: 'official (8 × 4000 mAh)' },
    massG: 1900, massSource: 'official',
    lengthMm: 265, headMm: 129, bodyMm: 59,
    ip: 'IP56', canDive: false, diveDepthM: 0,
    thermalLimitC: 60, thermalSource: 'assumption', activeCooling: true,
    ui: 'imalent',
    modes: [ // cd for all modes except Turbo — estimate: lumens × 4.58
      { name: 'Low',      lumens: 700,    cd: 3206,   runtimeMin: 892,  source: 'official' },
      { name: 'Mid Low',  lumens: 2000,   cd: 9160,   runtimeMin: 555,  source: 'official' },
      { name: 'Mid I',    lumens: 5000,   cd: 22900,  runtimeMin: 410,  source: 'official' },
      { name: 'Mid II',   lumens: 10000,  cd: 45800,  runtimeMin: 220,  source: 'official' },
      { name: 'High I',   lumens: 22000,  cd: 100760, runtimeMin: 67,   source: 'official' },
      { name: 'High II',  lumens: 30000,  cd: 137400, runtimeMin: 63.8, source: 'official', turbo: true,
        steps: [ { lumens: 30000, minutes: 3.8 }, { lumens: 25000, minutes: 60 } ] },
      { name: 'High III', lumens: 60000,  cd: 274800, runtimeMin: 56.2, source: 'official', turbo: true,
        steps: [ { lumens: 60000, minutes: 1.17 }, { lumens: 25000, minutes: 55 } ] },
      { name: 'Turbo',    lumens: 100000, cd: 458000, runtimeMin: 53,   source: 'official', turbo: true,
        steps: [ { lumens: 100000, minutes: 1 }, { lumens: 25000, minutes: 52 } ] },
    ],
    strobe: true,
    features: ['activeCooling', 'oledDisplay', 'heavy', 'breaksCrates', 'breaksGlass', 'shoulderStrap'],
    look: { bodyColor: '#1c1c1c', finish: 'black HAIII', reflector: 'OP, 18 cells', switch: 'button + OLED display on body', fanGrill: true }
  },
];
