// Stage 4: light physics. BeamModel photometry, PowerSystem (modes, battery, Turbo, heat, sag),
// BeamVisual (SpotLight + cone + motes), test dummies showing lux, and a debug HUD.
// Keyboard only: WASD move, Space jump, arrows aim, Q/E modes, L light on/off, C refill battery (test).
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
import { Dummy } from './entities/Dummy.js';
import { PowerSystem } from './light/PowerSystem.js';
import { BeamVisual } from './light/BeamVisual.js';
import { illuminance, summarizeSpec } from './light/BeamModel.js';
import { HUD } from './ui/HUD.js';
import { FLASHLIGHTS } from './data/flashlights.js';
import { START_MODE_INDEX } from './core/config.js';

const gfx = new Renderer();
const { scene } = gfx;
const input = new Input();
const states = new StateManager(STATES.MENU);

// World: dim blue-grey fill so the floor is never pitch black. The beam is the real light.
scene.add(new THREE.AmbientLight('#8090b8', 1.2));
scene.add(new THREE.HemisphereLight('#4a5a88', '#101010', 1.0));

const woodTex = createWoodTexture(512);
woodTex.repeat.set(4, 4);
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.6, metalness: 0.0 })
);
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

// Hero and light systems.
const spec = FLASHLIGHTS.find((f) => f.id === 'convoy_s2plus_sst40');
const hero = new FlashlightHero(scene, spec.id);
const rig = new CameraRig(gfx.camera);
const power = new PowerSystem(spec, START_MODE_INDEX);
const beamVis = new BeamVisual(scene);
const hud = new HUD(bus);

// Test dummies on the floor at known distances (for checking lux numbers).
const dummies = [
  new Dummy(scene, 'Манекен 1', 0, -1.2),
  new Dummy(scene, 'Манекен 2', 0, -2.5),
  new Dummy(scene, 'Манекен 3', 0, -4.0),
  new Dummy(scene, 'Манекен 4', 1.2, -2.0),
];

// Startup check log: expected values from the design doc (Convoy at its max mode).
const check = summarizeSpec(spec);
console.log(`[check] ${spec.brand} ${spec.model}: режим ${check.mode}, ` +
  `hotspot ${check.thetaHotDeg.toFixed(1)}°, throw ${check.throwReal.toFixed(1)} м real / ${check.throwGame.toFixed(2)} м game`);

// Temporary start overlay: any key starts the game (no mouse).
const overlay = document.createElement('div');
overlay.id = 'menu-temp';
overlay.textContent = 'Нажмите любую клавишу, чтобы начать';
Object.assign(overlay.style, {
  position: 'fixed', inset: '0', display: 'flex', alignItems: 'center',
  justifyContent: 'center', color: '#c9b99a', font: '28px sans-serif',
  background: 'rgba(0,0,0,0.6)', userSelect: 'none',
});
document.body.appendChild(overlay);

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
bus.on('modeChanged', ({ mode }) => console.log(`[light] режим ${mode.name}: ${mode.lumens} лм, ${mode.cd} кд`));
bus.on('lvp', () => console.log('[light] LVP'));

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyC' && states.is(STATES.PLAYING)) power.setCharge(100); // test helper
  startGame();
});
if (location.search.includes('play')) startGame();

let elapsed = 0;

const loop = new Loop(
  (dt) => {
    if (input.wasPressed('KeyL')) power.toggle();
    if (input.wasPressed('KeyQ')) power.nextMode();
    if (input.wasPressed('KeyE')) power.prevMode();

    if (states.is(STATES.PLAYING)) {
      elapsed += dt;
      hero.update(dt, input.moveAxes(), input.aimAxes(), boxes, input.wasPressed('Space'));
      rig.update(hero.position, dt, 0);
    }
    power.update(dt);

    // Beam from the head to the floor point in front of the hero.
    const origin = hero.headWorld;
    const target = hero.beamTarget;
    beamVis.update({
      origin, target, lumens: power.lumens, cd: power.cd, cct: spec.cct, on: power.on && !power.dead,
    });

    // Lux at each dummy: photometry from BeamModel, with a line-of-sight check to the head.
    const axis = new THREE.Vector3().subVectors(target, origin).normalize();
    for (const d of dummies) {
      const lux = power.on && !power.dead
        ? illuminance({
          origin, axis, point: d.position, cd: power.cd, lumens: power.lumens,
        })
        : 0;
      d.setLux(lux);
      d.updateLabel(gfx.camera, window.innerWidth, window.innerHeight);
    }

    hud.update(dt, power);
    input.endFrame();
  },
  () => gfx.render()
);
loop.start();
console.log('[LUMEN] stage 4 started');
