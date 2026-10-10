// Stage 6: level 1 "Ящик стола". The hero walks from the start along +X to the exit.
// Light, enemies and HUD from stages 4–5; this stage adds the level runtime, pickups, checkpoints,
// waves, tutorial hints, the Ink Blot boss and the victory screen.
// Keyboard only: WASD move, Space jump, arrows turn the beam, Q/E modes, L outside light level, C refill (test), Esc pause.
import * as THREE from 'three';
import { Renderer } from './render/Renderer.js';
import { CameraRig } from './render/CameraRig.js';
import { Loop } from './core/Loop.js';
import { StateManager, STATES } from './core/StateManager.js';
import { bus } from './core/EventBus.js';
import { Input } from './input/Input.js';
import { FlashlightHero } from './entities/FlashlightHero.js';
import { resolveRoute, navigate } from './core/Router.js';
import { Dummy } from './entities/Dummy.js';
import { PowerSystem } from './light/PowerSystem.js';
import { BeamVisual } from './light/BeamVisual.js';
import { summarizeSpec } from './light/BeamModel.js';
import { luxOnTarget, dpsFromLux } from './light/LightDamage.js';
import { cdAtAngle } from './light/BeamModel.js';
import { HUD } from './ui/HUD.js';
import { effectiveSpec } from './data/effects.js';
import { LEVEL_1, LEVEL_2 } from './data/levels.js';
import { TableLevel } from './level/TableLevel.js';
import { SaveSystem } from './shop/SaveSystem.js';
import { Workshop } from './shop/Workshop.js';
import { RangeLevel } from './level/RangeLevel.js';
import { MainMenu } from './ui/MainMenu.js';
import { START_MODE_INDEX, MOTH_MAX_CLING, MOTH_CLING_DIM, MOTH_DARK_RESET_SEC, LEVEL, WORLD_LIGHT } from './core/config.js';
import { Particles } from './fx/Particles.js';
import { Squad } from './ai/Squad.js';
import { HeroHealth } from './entities/HeroHealth.js';
import { Projectile } from './entities/Projectile.js';

const gfx = new Renderer();
const { scene } = gfx;
const input = new Input();
const states = new StateManager(STATES.MENU);

// World fill from config (almost black by design: the beam is the real light).
const worldAmbient = new THREE.AmbientLight(WORLD_LIGHT.ambientColor, WORLD_LIGHT.ambientBase);
const worldHemi = new THREE.HemisphereLight(WORLD_LIGHT.hemiSky, WORLD_LIGHT.hemiGround, WORLD_LIGHT.hemiBase);
scene.add(worldAmbient, worldHemi);
let worldLevel = WORLD_LIGHT.startLevel;

/** Applies one world-light level to both lamps. */
function setWorldLight(index) {
  worldLevel = (index + WORLD_LIGHT.levels.length) % WORLD_LIGHT.levels.length;
  const lv = WORLD_LIGHT.levels[worldLevel];
  // Render intensity follows the real lux of the level through one fixed factor.
  const render = lv.lux > 0 ? WORLD_LIGHT.luxToRender * Math.pow(lv.lux, WORLD_LIGHT.luxExponent) : 0;   // power curve: dusk and day both read right
  worldAmbient.intensity = render;
  worldHemi.intensity = render;
  bus.emit('worldLight', { name: lv.name, index: worldLevel });
}
setWorldLight(worldLevel);

// The drawer floor (wood) belongs to TableLevel, so it is removed with the level.

// Hero and light systems.
// The flashlight the player chose in the Workshop, with its installed mods applied (copy, specs untouched).
const saved = SaveSystem.load();
const spec = effectiveSpec(saved.active, saved.mods);
console.log(`[loadout] ${spec.brand} ${spec.model}, модов: ${saved.mods.length}`);
spec.flags.pendingEffects.forEach((p) => console.log(`[loadout] не применено: ${p}`));
const hero = new FlashlightHero(scene, spec.id);
hero.position.set(LEVEL_1.start.x, 0, LEVEL_1.start.z);
const rig = new CameraRig(gfx.camera);
const power = new PowerSystem(spec, START_MODE_INDEX);
const beamVis = new BeamVisual(scene);
const hud = new HUD(bus);
const particles = new Particles(scene);
const squad = new Squad();
const health = new HeroHealth();

// The current level is the chosen one: the drawer by default, the test range with T from the menu.
// Both expose the same contract (colliders, enemies, update, bossInfo, atExit), so main.js does not special-case them.
let level = new TableLevel(scene, LEVEL_1, spec, particles);
// Candela the beam sends toward a point: depends on the angle from the beam axis (the same model as the lux).
const cdFor = (origin, axis, beamCd, beamLumens) => (p) => {
  const d = p.clone ? p.clone().sub(origin) : new THREE.Vector3(p.x, p.y, p.z).sub(origin);
  const alpha = Math.acos(Math.max(-1, Math.min(1, d.normalize().dot(axis))));
  return cdAtAngle(alpha, beamCd, beamLumens);
};
const luxFor = (origin, axis, beamCd, beamLumens) => (p) =>
  luxOnTarget({ origin, axis, point: p, cd: beamCd, lumens: beamLumens, boxes: level.colliders });

// Test dummies (photometry check from stage 4). Hidden on the level to keep the drawer clean.
const dummies = [];

const projectiles = [];
const mothsClinging = [];
let darkTimer = 0;
let lives = LEVEL.lives;
hud.setLives(lives);
let deadTimer = 0;
let victoryShown = false;
let logTimer = 0;
let elapsed = 0;

// Startup check log (stage 4).
const check = summarizeSpec(spec);
console.log(`[check] ${spec.brand} ${spec.model}: режим ${check.mode}, ` +
  `hotspot ${check.thetaHotDeg.toFixed(1)}°, throw ${check.throwReal.toFixed(1)} м real / ${check.throwGame.toFixed(2)} м game`);

// Main menu: Уровень, Мастерская, Полигон.
const menuRoot = document.createElement('div');
menuRoot.id = 'main-menu';
document.body.appendChild(menuRoot);
const menu = new MainMenu(menuRoot, (choice) => {
  hud.setHidden(false);
  // Each choice gets its own address, so reload and back/forward keep the mode.
  navigate(choice);
  if (choice === 'level') startGame();
  else if (choice === 'basement') startBasement();
  else if (choice === 'range') startRange();
  else if (choice === 'workshop') openWorkshop();
});


const workshopRoot = document.createElement('div');
workshopRoot.id = 'workshop';
Object.assign(workshopRoot.style, {
  position: 'fixed', inset: '0', display: 'none', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(8,9,12,0.92)', color: '#ddd', font: '15px sans-serif', zIndex: '10',
});
document.body.appendChild(workshopRoot);
const workshop = new Workshop(
  workshopRoot,
  (id) => console.log(`[workshop] в руке: ${id}`),
  () => { workshop.close(); states.go(STATES.MENU); }
);

function openWorkshop() {
  if (!states.is(STATES.MENU)) return;
  states.go(STATES.WORKSHOP);
  menu.hide();
  workshop.open();
}

/** Switches to the test range: its own level, no walls, props or enemies. */
/** Each level starts with its own battery and lives. Nothing carries over between the drawer and the range. */
function resetLevelStatus() {
  power.setCharge(100);
  lives = LEVEL.lives;
  hud.setLives(lives);
  deadTimer = 0;
  victoryShown = false;
  hud.setOverlay(null);
}

function startRange() {
  level.dispose();
  resetLevelStatus();
  // One start point for the hero and the range: the beam must land on the targets built from it.
  const start = { x: 0, z: 0 };
  level = new RangeLevel(scene, start, spec);
  hero.position.set(start.x, 0, start.z);
  hero.heading = 0;             // the beam points straight down the range (toward -Z)
  hero.aimYawOffset = 0;
  states.go(STATES.PLAYING);
  hud.showHint('Полигон: поворачивай луч стрелками, смотри на волка и край леса');
}

/** Game over: the first level again, from its start, with full lives and battery. */
function restartFirstLevel() {
  level.dispose();
  level = new TableLevel(scene, LEVEL_1, spec, particles);
  hero.position.set(LEVEL_1.start.x, 0, LEVEL_1.start.z);
  resetLevelStatus();
  hud.showHint('Жизни закончились. Начинаем с первого уровня');
}

/** Starts a level from its data. Each level has its own battery, lives and start point. */
function startLevelData(data, hint) {
  level.dispose();
  level = new TableLevel(scene, data, spec, particles);
  hero.position.set(data.start.x, 0, data.start.z);
  hero.heading = Math.PI / 2;
  hero.aimYawOffset = 0;
  resetLevelStatus();
  states.go(STATES.PLAYING);
  hud.showHint(hint);
}

function startBasement() {
  if (!states.is(STATES.MENU)) return;
  startLevelData(LEVEL_2, 'Подвал. Пройди направо к выходу');
}

function startGame() {
  if (!states.is(STATES.MENU)) return;
  // The drawer starts with the beam pointing right (+X), the way the hero walks.
  hero.heading = Math.PI / 2;
  hero.aimYawOffset = 0;
  states.go(STATES.PLAYING);
  hud.showHint('Ящик стола. Пройди направо к выходу');
}

bus.on('stateChanged', ({ from, to }) => console.log(`[state] ${from} -> ${to}`));
bus.on('pause', () => {
  if (states.is(STATES.PLAYING)) states.go(STATES.PAUSED);
  else if (states.is(STATES.PAUSED)) states.go(STATES.PLAYING);
});
bus.on('pickup', ({ value }) => {
  hud.setSparks(level.sparks);
  console.log(`[pickup] +${value} Искр, всего ${level.sparks}`);
});
bus.on('checkpoint', ({ id }) => {
  console.log(`[checkpoint] ${id}: заряд 100 %`);
  hud.showHint('Станция: заряд полный. Здесь точка возрождения');
});
bus.on('hint', ({ text }) => console.log(`[hint] ${text}`));
bus.on('bossDefeated', () => console.log('[boss] Чернильная Клякса побеждена, выход открыт'));
bus.on('heroHit', ({ pct, source }) => console.log(`[hit] ${source}: −${pct}%`));
bus.on('enemyDied', ({ type }) => console.log(`[enemy] died: ${type}`));

// Back to the main menu from anywhere: used by Esc in the workshop, and by Esc in the game (via pause).
function backToMenu() {
  level.dispose();
  level = new TableLevel(scene, LEVEL_1, spec, particles);   // the drawer, ready for the next pick
  hero.position.set(LEVEL_1.start.x, 0, LEVEL_1.start.z);
  states.go(STATES.MENU);
  hud.setHidden(true);
  history.pushState({}, '', '/');
  menu.show();
}

// Debug hook for live checks (read-only snapshot + kill the battery). Not a game feature.
window.__lumen = {
  state: () => ({ state: states.state, dead: power.dead, charge: power.charge, lives, deadTimer, hero: hero.position.toArray() }),
  kill: () => { power.die(); },
};

window.addEventListener('keydown', (e) => {
  if (states.is(STATES.WORKSHOP)) {
    if (e.code === 'Escape') { workshop.close(); menu.show(); states.go(STATES.MENU); }
    return;
  }
  if (e.code === 'Escape' && (states.is(STATES.PLAYING) || states.is(STATES.PAUSED))) { backToMenu(); return; }
  if (e.code === 'KeyC' && states.is(STATES.PLAYING)) power.setCharge(100); // test helper
});
// Start on the main menu. Test URLs skip it: ?range or ?play
// Start target from the URL: /range, /level, /workshop, or the menu for /.
const route = resolveRoute();
if (route === 'range') { hud.setHidden(false); startRange(); }
else if (route === 'level') startGame();
else if (route === 'basement') startBasement();
else if (route === 'workshop') openWorkshop();
else menu.show();
// Hide the in-game HUD while the menu is on screen.
if (route === 'menu') hud.setHidden(true);   // HUD stays off on the menu

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

/** Respawn after the battery dies: back to the last charging station with a full charge. */
function respawn() {
  hero.position.set(level.respawnPoint.x, 0, level.respawnPoint.z);
  hero.hopT = 0;        // stop any hop in progress: the hero lands at the station
  hero.hopElapsed = 0;
  hero.lift = 0;
  power.setCharge(100);
  deadTimer = 0;
  hud.setOverlay(null);
}

/** Victory screen: Sparks are saved to localStorage. */
function showVictory() {
  const total = SaveSystem.addSparks(level.sparks);
  hud.setOverlay({
    title: 'Уровень пройден',
    lines: [`Искры за уровень: ${level.sparks}`, `Всего Искр: ${total}`],
    footer: 'R — заново, Esc — пауза',
  });
  states.go(STATES.VICTORY);
  console.log(`[victory] Искры ${level.sparks}, всего ${total}`);
}

const loop = new Loop(
  (dt) => {
    if (input.wasPressed('KeyL')) setWorldLight(worldLevel + 1);   // L cycles the outside light
    if (input.wasPressed('KeyQ')) power.nextMode();
    if (input.wasPressed('KeyE')) power.prevMode();

    if (states.is(STATES.PLAYING)) {
      elapsed += dt;
      // Each level decides whether the hero may walk (the range is a shooting bench: turn only).
      const move = level.allowsMovement ? input.moveAxes() : { x: 0, z: 0 };
      const jump = level.allowsMovement ? input.wasPressed('Space') : false;
      hero.update(dt, move, input.aimAxes(), level.colliders, jump);
      if (level.cameraFrame) level.cameraFrame(gfx.camera, hero.position);   // levels may frame their own view
      else rig.update(hero.position, dt, 0);
      // Lux readers first (the range reads this frame's beam), then the level itself.
      const dimNow = Math.pow(1 - MOTH_CLING_DIM, mothsClinging.length);
      const axisNow = hero.beamTarget.clone().sub(hero.headWorld).normalize();
      level.lux = luxFor(hero.headWorld, axisNow, power.cd * dimNow, power.lumens * dimNow);
      level.cdAt = cdFor(hero.headWorld, axisNow, power.cd * dimNow, power.lumens * dimNow);
      hero.halo.visible = level.usesHalo;   // the range has no halo (honest lux readout)
      beamVis.castsLight = level.usesHalo;   // the range does not light the scene (same rule as the halo)
      level.worldLevel = worldLevel;
      level.update(dt, hero.position, power, gfx.camera);
      if (level.atExit(hero.position.x, hero.position.z) && !victoryShown) {
        victoryShown = true;
        showVictory();
      }
    }
    // The range is a shooting bench: the battery never drains there (the light still works).
    if (level.drainsBattery !== false) {
      power.update(dt);
      health.update(dt);
    }

    // Battery dead: show the overlay, then respawn at the last charging station.
    if (power.dead && states.is(STATES.PLAYING)) {
      deadTimer += dt;
      hud.setOverlay({ title: 'Батарея разряжена', lines: [`Жизни: ${lives - 1} из ${LEVEL.lives}`] });
      if (deadTimer >= LEVEL.respawnDelaySec) {
        lives -= 1;
        hud.setLives(lives);
        if (lives <= 0) {
          // No lives left: back to the first level from the start, with full lives and battery.
          restartFirstLevel();
        } else {
          respawn();
        }
      }
    }

    // Beam from the head to the target in front of the hero.
    const origin = hero.headWorld;
    const target = hero.beamTarget;
    const lit = power.on && !power.dead;
    // Each clinging moth dims the emitted light by MOTH_CLING_DIM (battery drain is unchanged).
    const dim = Math.pow(1 - MOTH_CLING_DIM, mothsClinging.length);
    beamVis.update({
      origin, target, lumens: power.lumens * dim, cd: power.cd * dim, cct: spec.cct, on: lit, boxes: level.colliders,
    });

    // Moths leave when the light has been off for MOTH_DARK_RESET_SEC.
    darkTimer = lit ? 0 : darkTimer + dt;
    if (darkTimer >= MOTH_DARK_RESET_SEC && mothsClinging.length) {
      mothsClinging.length = 0;
    }

    const axis = new THREE.Vector3().subVectors(target, origin).normalize();
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
    for (const e of level.enemies) {
      if (!e.alive) {
        e.tick(dt, ctx);
        continue;
      }
      const c = e.center;
      const lux = lit
        ? luxOnTarget({ origin, axis, point: c, cd: beamCd, lumens: beamLumens, boxes: level.colliders })
        : 0;
      e.lastLux = lux;
      if (e.type !== 'moth') {
        e.takeLight(dpsFromLux(lux, e.threshold), dt, e.damageMultFor(spec.cri));
      }
      e.tick(dt, ctx);
    }
    hud.setBoss(level.bossInfo());

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
      for (const e of level.enemies) {
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
console.log('[LUMEN] stage 6 started');
