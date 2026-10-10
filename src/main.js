// Stage 3 fix: the beam lights the floor in front of the hero, with a faint halo so the world is never pitch black.
// Keyboard only: WASD move, Space jump, arrows aim (left/right yaw, up/down reach), L light on/off, Esc pause.
import * as THREE from 'three';
import { Renderer } from './render/Renderer.js';
import { CameraRig } from './render/CameraRig.js';
import { createWoodTexture } from './assets/Textures.js';
import { Loop } from './core/Loop.js';
import { StateManager, STATES } from './core/StateManager.js';
import { bus } from './core/EventBus.js';
import { Input } from './input/Input.js';
import { AABB } from './physics/Physics.js';
import { FlashlightHero } from './entities/FlashlightHero.js';

const gfx = new Renderer();
const { scene } = gfx;
const input = new Input();
const states = new StateManager(STATES.MENU);

// World: almost no light. Dark desk floor and a few wooden blocks to test collisions.
// Dim blue-grey ambient so the floor is never pitch black (not a real light source; the beam is).
scene.add(new THREE.AmbientLight('#8090b8', 1.2));
scene.add(new THREE.HemisphereLight('#4a5a88', '#101010', 1.0));

const woodTex = createWoodTexture(512);
woodTex.repeat.set(4, 4);
const floorMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.6, metalness: 0.0 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Obstacles: a low log, a block to climb, a tall block.
const obstacles = [
  { cx: 0, cy: 0.05, cz: -1.5, sx: 0.6, sy: 0.1, sz: 0.1 },
  { cx: 0.8, cy: 0.15, cz: -2.5, sx: 0.4, sy: 0.3, sz: 0.4 },
  { cx: -0.9, cy: 0.35, cz: -3.5, sx: 0.5, sy: 0.7, sz: 0.5 },
];
const boxes = [];
const blockMat = new THREE.MeshStandardMaterial({ color: '#6b4a2f', roughness: 0.8 });
for (const o of obstacles) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(o.sx, o.sy, o.sz), blockMat);
  mesh.position.set(o.cx, o.cy, o.cz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  boxes.push(AABB.fromCenterSize(o.cx, o.cy, o.cz, o.sx, o.sy, o.sz));
}

// Hero: Convoy S2+ standing on the floor.
const hero = new FlashlightHero(scene, 'convoy_s2plus_sst40');
const rig = new CameraRig(gfx.camera);

// Beam: SpotLight from the head onto the floor in front of the hero. On by default, L toggles.
const beam = new THREE.SpotLight('#fff4e0', 60, 12, THREE.MathUtils.degToRad(18), 0.6, 1.5);
beam.castShadow = true;
beam.shadow.mapSize.set(1024, 1024);
scene.add(beam, beam.target);
let lightOn = true;
beam.visible = lightOn;

// Temporary start overlay: any key starts the game (no mouse).
// Add ?play to the URL to skip the overlay (for testing).
const overlay = document.createElement('div');
overlay.id = 'menu-temp';
overlay.textContent = 'Нажмите любую клавишу, чтобы начать';
Object.assign(overlay.style, {
  position: 'fixed', inset: '0', display: 'flex', alignItems: 'center',
  justifyContent: 'center', color: '#c9b99a', font: '28px sans-serif',
  background: 'rgba(0,0,0,0.6)', userSelect: 'none',
});
document.body.appendChild(overlay);

const hud = document.createElement('div');
hud.id = 'debug-hud';
Object.assign(hud.style, {
  position: 'fixed', left: '12px', top: '10px', color: '#9aa', font: '14px monospace',
  pointerEvents: 'none', whiteSpace: 'pre',
});
document.body.appendChild(hud);

function startGame() {
  if (!states.is(STATES.MENU)) return;
  states.go(STATES.PLAYING);
  overlay.remove();
}

bus.on('stateChanged', ({ from, to }) => console.log(`[state] ${from} -> ${to}`));
bus.on('pause', () => {
  if (states.is(STATES.PLAYING)) states.go(STATES.PAUSED);
  else if (states.is(STATES.PAUSED)) states.go(STATES.PLAYING);
});

window.addEventListener('keydown', () => startGame());
if (location.search.includes('play')) startGame();

let elapsed = 0;

const loop = new Loop(
  (dt) => {
    if (input.wasPressed('KeyL')) {
      lightOn = !lightOn;
      beam.visible = lightOn;
    }
    if (states.is(STATES.PLAYING)) {
      elapsed += dt;
      hero.update(dt, input.moveAxes(), input.aimAxes(), boxes, input.wasPressed('Space'));
      rig.update(hero.position, dt, 0);

      beam.position.copy(hero.headWorld);
      beam.target.position.copy(hero.beamTarget);
    }
    input.endFrame();

    hud.textContent =
      `state: ${states.state}\n` +
      `time:  ${elapsed.toFixed(1)} s\n` +
      `pos:   ${hero.position.x.toFixed(2)}, ${hero.position.y.toFixed(2)}, ${hero.position.z.toFixed(2)}\n` +
      `ground:${hero.onGround ? ' yes' : ' no'}  reach: ${hero.aimReach.toFixed(2)} m\n` +
      `light: ${lightOn ? 'on' : 'off'} (L)\n` +
      `keys:  WASD move, Space jump, arrows aim, L light, Esc pause`;
  },
  () => gfx.render()
);
loop.start();
console.log('[LUMEN] stage 3 started');
