// Stage 2: core systems. Loop, state machine, event bus, input, temporary "click to start" menu.
import * as THREE from 'three';
import { Renderer } from './render/Renderer.js';
import { createWoodTexture } from './assets/Textures.js';
import { Loop } from './core/Loop.js';
import { StateManager, STATES } from './core/StateManager.js';
import { bus } from './core/EventBus.js';
import { Input } from './input/Input.js';

const gfx = new Renderer();
const { scene } = gfx;
const input = new Input(gfx.renderer.domElement);
const states = new StateManager(STATES.MENU);

// World: almost no light, desk floor and test SpotLight from stage 1.
scene.add(new THREE.AmbientLight('#ffffff', 0.02));
scene.add(new THREE.HemisphereLight('#1a2440', '#000000', 0.05));

const woodTex = createWoodTexture(512);
woodTex.repeat.set(4, 4);
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.6, metalness: 0.0 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const testLight = new THREE.SpotLight('#fff4e0', 60, 12, THREE.MathUtils.degToRad(18), 0.6, 1.5);
testLight.position.set(0, 2.2, 1.0);
testLight.target.position.set(0, 0, -0.5);
testLight.castShadow = true;
scene.add(testLight, testLight.target);

// Temporary "click to start" overlay (replaced by real menus in stage 9).
const overlay = document.createElement('div');
overlay.id = 'menu-temp';
overlay.textContent = 'Нажмите, чтобы начать';
Object.assign(overlay.style, {
  position: 'fixed', inset: '0', display: 'flex', alignItems: 'center',
  justifyContent: 'center', color: '#c9b99a', font: '28px sans-serif',
  background: 'rgba(0,0,0,0.6)', cursor: 'pointer', userSelect: 'none',
});
document.body.appendChild(overlay);

const hud = document.createElement('div');
hud.id = 'debug-hud';
Object.assign(hud.style, {
  position: 'fixed', left: '12px', top: '10px', color: '#9aa', font: '14px monospace',
  pointerEvents: 'none', whiteSpace: 'pre',
});
document.body.appendChild(hud);

overlay.addEventListener('click', () => {
  if (states.is(STATES.MENU)) states.go(STATES.PLAYING);
  overlay.remove();
  input.requestLock();
});

bus.on('stateChanged', ({ from, to }) => console.log(`[state] ${from} -> ${to}`));
bus.on('pause', () => {
  if (states.is(STATES.PLAYING)) states.go(STATES.PAUSED);
  else if (states.is(STATES.PAUSED)) states.go(STATES.PLAYING);
});
bus.on('lmbClick', ({ count }) => console.log(`[input] LMB clicks in window: ${count}`));
bus.on('manualStrobe', () => console.log('[input] manual strobe triggered'));
bus.on('wheel', ({ dir }) => console.log(`[input] wheel ${dir}`));

let elapsed = 0;

const loop = new Loop(
  (dt) => {
    const pad = input.pollGamepad();
    if (states.is(STATES.PLAYING)) elapsed += dt;
    const mouse = input.consumeMouse();
    hud.textContent =
      `state: ${states.state}\n` +
      `time:  ${elapsed.toFixed(1)} s\n` +
      `dt:    ${(dt * 1000).toFixed(1)} ms\n` +
      `keys:  ${[...input.keys].join(' ') || '-'}\n` +
      `mouse: ${mouse.dx.toFixed(0)}, ${mouse.dy.toFixed(0)}\n` +
      `pad:   ${pad ? 'connected' : 'none'}`;
  },
  () => gfx.render()
);
loop.start();
console.log('[LUMEN] stage 2 started');
