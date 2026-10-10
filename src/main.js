// Stage 5: enemies. Crawler, Swarm, Moth, Watcher, Invisible; StateMachine, Squad tokens,
// light damage with occlusion, charge damage, invulnerability, knockback, evaporation.
// Keyboard only: WASD move, Space jump, arrows aim, Q/E modes, L light on/off, C refill battery (test), F strobe (later).
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
import { luxOnTarget, dpsFromLux } from './light/LightDamage.js';
import { HUD } from './ui/HUD.js';
import { FLASHLIGHTS } from './data/flashlights.js';
import { START_MODE_INDEX, MOTH_MAX_CLING, MOTH_CLING_DIM, MOTH_DARK_RESET_SEC } from './core/config.js';
import { Particles } from './fx/Particles.js';
import { Squad } from './ai/Squad.js';
import { HeroHealth } from './entities/HeroHealth.js';
import { Projectile } from './entities/Projectile.js';
import { Crawler } from './entities/enemies/Crawler.js';
import { Swarm } from './entities/enemies/Swarm.js';
import { Moth } from './entities/enemies/Moth.js';
import { Watcher } from './entities/enemies/Watcher.js';
import { Invisible } from './entities/enemies/Invisible.js';

const gfx = new Renderer();
const { scene } = gfx;
const input = new Input();
const states = new StateManager(STATES.MENU);

// World: dim blue-grey fill so the floor is never pitch black. The beam is the real light.
scene.add(new THREE.AmbientLight('#8090b8', 2.4));
scene.add(new THREE.HemisphereLight('#5a6a98', '#202020', 2.0));

const woodTex = createWoodTexture(512);
woodTex.repeat.set(4, 4);
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.6, metalness: 0.0 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Obstacles: a low log, a block to climb, a tall block. They also block light (occlusion test).
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
const particles = new Particles(scene);
const squad = new Squad();
const health = new HeroHealth();

// Test dummies (photometry check from stage 4).
const dummies = [
  new Dummy(scene, 'Манекен 1', 0, -1.2),
  new Dummy(scene, 'Манекен 2', 0, -2.5),
  new Dummy(scene, 'Манекен 3', 0, -4.0),
];

// Enemies: one of each type for testing, placed a few metres from the start.
const enemies = [
  new Crawler(scene, 0.0, -0.9, particles),
  new Swarm(scene, 0.25, -0.75, particles, 0, 3),
  new Swarm(scene, -0.2, -0.95, particles, 1, 3),
  new Swarm(scene, 0.05, -1.1, particles, 2, 3),
  new Moth(scene, 0.0, -0.7, particles),
  new Watcher(scene, 0.0, -6.0, particles),
  new Invisible(scene, 0.0, -1.3, particles),
];
const projectiles = [];
const mothsClinging = [];
let darkTimer = 0; // how long the light has been off (moths leave after MOTH_DARK_RESET_SEC)

// Startup check log (stage 4).
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
bus.on('heroHit', ({ pct, source }) => console.log(`[hit] ${source}: −${pct}%`));
bus.on('enemyDied', ({ type }) => console.log(`[enemy] died: ${type}`));

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyC' && states.is(STATES.PLAYING)) power.setCharge(100); // test helper
  startGame();
});
if (location.search.includes('play')) startGame();

/** Hit the hero from an enemy: applies charge loss with invulnerability and knockback. */
function hitHero(pct, fromPos, source) {
  health.hit(pct, power, hero, fromPos, source);
}

/** Moth clings to the hero's head, max MOTH_MAX_CLING. */
function attachMoth(moth) {
  if (mothsClinging.length >= MOTH_MAX_CLING) return false;
  mothsClinging.push(moth);
  return true;
}

/** Watcher fires a dark orb from its body toward the hero's head. */
function spawnProjectile(from, dir, pct) {
  projectiles.push(new Projectile(scene, from, dir, pct));
}

let elapsed = 0;
let logTimer = 0;

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
    health.update(dt);

    // Beam from the head to the floor point in front of the hero.
    const origin = hero.headWorld;
    const target = hero.beamTarget;
    const lit = power.on && !power.dead;
    // Each clinging moth dims the emitted light by MOTH_CLING_DIM (battery drain is unchanged).
    const dim = Math.pow(1 - MOTH_CLING_DIM, mothsClinging.length);
    beamVis.update({
      origin, target, lumens: power.lumens * dim, cd: power.cd * dim, cct: spec.cct, on: lit,
    });

    // Moths leave when the light has been off for MOTH_DARK_RESET_SEC.
    darkTimer = lit ? 0 : darkTimer + dt;
    if (darkTimer >= MOTH_DARK_RESET_SEC && mothsClinging.length) {
      mothsClinging.length = 0;
    }

    // Light axis for hits on enemies and for the dummies.
    const axis = new THREE.Vector3().subVectors(target, origin).normalize();

    // Lux at dummies (occlusion-aware).
    for (const d of dummies) {
      const lux = lit
        ? luxOnTarget({ origin, axis, point: d.position, cd: power.cd, lumens: power.lumens, boxes })
        : 0;
      d.setLux(lux);
      d.updateLabel(gfx.camera, window.innerWidth, window.innerHeight);
    }

    // Enemies: light damage (lux → dps), then AI tick. Moths cling → light is dimmed the same way.
    const beamLumens = power.lumens * dim;
    const beamCd = power.cd * dim;
    const ctx = {
      heroFeet: hero.position,
      heroHead: origin,
      squad,
      hitHero,
      attachMoth,
      spawnProjectile,
      lightOn: lit,
      lightCri: spec.cri,
    };
    for (const e of enemies) {
      if (!e.alive) {
        e.tick(dt, ctx);
        continue;
      }
      const c = e.center;
      const lux = lit
        ? luxOnTarget({
          origin, axis, point: c, cd: beamCd, lumens: beamLumens, boxes,
        })
        : 0;
      e.lastLux = lux;
      if (e.type !== 'moth') {
        const mult = e.damageMultFor(spec.cri);
        e.takeLight(dpsFromLux(lux, e.threshold), dt, mult);
      }
      e.tick(dt, ctx);
    }
    // Projectiles hit the hero's head when they get close.
    for (const p of projectiles) {
      if (!p.alive) continue;
      p.update(dt);
      if (p.alive && p.pos.distanceTo(origin) < 0.08) {
        health.hit(p.pct, power, hero, p.pos, 'Наблюдатель');
        p.kill();
      }
    }
    for (let i = projectiles.length - 1; i >= 0; i--) {
      if (!projectiles[i].alive) projectiles.splice(i, 1);
    }

    logTimer += dt;
    if (logTimer >= 1) {
      logTimer = 0;
      for (const e of enemies) {
        if (e.alive && e.lastLux > 0) console.log(`[dmg] ${e.name}: ${e.lastLux.toFixed(2)} лк, hp ${e.hp.toFixed(1)}`);
      }
    }
    particles.update(dt);
    hud.update(dt, power);
    input.endFrame();
  },
  () => gfx.render()
);
loop.start();
console.log('[LUMEN] stage 5 started');
