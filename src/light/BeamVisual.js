// Beam visuals: SpotLight for real light on the floor, a fake volumetric cone and dust motes.
// Cosmetic only. Gameplay numbers come from BeamModel and PowerSystem.
import * as THREE from 'three';
import { BEAM_VIS, RENDER } from '../core/config.js';
import { thetaHot, rangeGame, SPILL_ANGLE } from './BeamModel.js';
import { segmentHitsBox } from './LightDamage.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Kelvin to linear-ish sRGB, Tanner Helland approximation.
 * @param {number} kelvin
 * @returns {[number, number, number]} each channel in 0..1
 */
export function kelvinToRgb(kelvin) {
  const t = clamp(kelvin, 1000, 40000) / 100;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g = t <= 66
    ? 99.4708025861 * Math.log(t) - 161.1195681661
    : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  let b = 255;
  if (t < 66) b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return [r, g, b].map((v) => clamp(v, 0, 255) / 255);
}

/** Vertical gradient: bright at the apex (head), transparent at the far end. */
function makeGradientTexture() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  return new THREE.CanvasTexture(c);
}

/** Dust motes inside a unit cone (apex at origin, pointing along -Y). */
function makeMotes() {
  const n = BEAM_VIS.moteCount;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = 0.05 + Math.random() * 0.95;          // depth along the cone
    const r = Math.sqrt(Math.random()) * t * 0.9;   // radius inside the cone at that depth
    const a = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = -t;
    pos[i * 3 + 2] = Math.sin(a) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: '#fff2d8', size: BEAM_VIS.moteSize, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, mat);
}

export class BeamVisual {
  /** @param {THREE.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    this.castsLight = true;   // set false on the range
    this.spot = new THREE.SpotLight(0xffffff, 0, 10, 0.2, 0.6, BEAM_VIS.decay);
    this.spot.castShadow = true; // only the player's light casts shadows
    this.spot.shadow.mapSize.set(RENDER.shadowMapSize, RENDER.shadowMapSize);
    scene.add(this.spot, this.spot.target);

    // Unit cone: apex at origin, base at -Y, so it can be aimed with a quaternion.
    const geo = new THREE.ConeGeometry(1, 1, 24, 1, true);
    geo.translate(0, -0.5, 0);
    this.coneMat = new THREE.MeshBasicMaterial({
      map: makeGradientTexture(), color: 0xffffff, transparent: true,
      opacity: BEAM_VIS.coneOpacity, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide,
    });
    this.cone = new THREE.Mesh(geo, this.coneMat);
    this.cone.frustumCulled = false;
    this.motes = makeMotes();
    this.cone.add(this.motes);
    this.cone.visible = false;
    scene.add(this.cone);

    this.up = new THREE.Vector3(0, -1, 0);
    this.dir = new THREE.Vector3();
    this.target = new THREE.Vector3();
  }

  /**
   * Distance along a ray to the first wall box, or Infinity. Used to stop the cone at walls.
   * @returns {number} metres (game units) from origin to the hit point
   */
  distanceToWall(origin, dir, boxes, maxLen) {
    let best = maxLen;
    const end = new THREE.Vector3();
    for (const box of boxes) {
      // Binary search along the ray for the first blocked distance (cheap, good enough for visuals).
      end.copy(origin).addScaledVector(dir, maxLen);
      if (!segmentHitsBox(origin, end, box)) continue;
      let lo = 0;
      let hi = maxLen;
      for (let i = 0; i < 16; i++) {
        const mid = (lo + hi) / 2;
        end.copy(origin).addScaledVector(dir, mid);
        if (segmentHitsBox(origin, end, box)) hi = mid;
        else lo = mid;
      }
      best = Math.min(best, hi);
    }
    return best;
  }

  /**
   * Updates light and cone from the current beam state.
   * @param {{origin:{x,y,z}, target:{x,y,z}, lumens:number, cd:number, cct:number, on:boolean, boxes?:AABB[]}} s
   */
  update(s) {
    if (!s.on || s.lumens <= 0 || s.cd <= 0) {
      this.spot.intensity = 0;
      this.cone.visible = false;
      return;
    }
    this.dir.set(s.target.x - s.origin.x, s.target.y - s.origin.y, s.target.z - s.origin.z).normalize();
    // The cone stops at the first wall: light does not pass through walls.
    const maxLen = clamp(rangeGame(s.cd), 0.3, 12);
    const len = s.boxes && s.boxes.length
      ? Math.max(0.05, this.distanceToWall(new THREE.Vector3(s.origin.x, s.origin.y, s.origin.z), this.dir, s.boxes, maxLen))
      : maxLen;
    // Visual half-angle: a few times the hotspot, never wider than the spill cone.
    const half = clamp(thetaHot(s.lumens, s.cd) * 3, BEAM_VIS.minAngle, SPILL_ANGLE);

    const [r, g, b] = kelvinToRgb(s.cct);
    this.spot.color.setRGB(r, g, b);
    // On levels that measure (the range) the SpotLight stays off: the cone is only a direction marker.
    this.spot.intensity = this.castsLight ? BEAM_VIS.intensityK * Math.log10(s.lumens + 1) : 0;
    this.spot.angle = half;
    this.spot.distance = len * 1.3;
    this.spot.position.set(s.origin.x, s.origin.y, s.origin.z);
    this.target.copy(this.spot.position).addScaledVector(this.dir, len);
    this.spot.target.position.copy(this.target);

    this.cone.visible = true;
    this.cone.position.copy(this.spot.position);
    this.cone.quaternion.setFromUnitVectors(this.up, this.dir);
    const rad = Math.tan(half) * len;
    this.cone.scale.set(rad, len, rad);
    this.coneMat.color.setRGB(r, g, b);
  }

  /** Removes the beam visuals from the scene (a new flashlight brings its own). */
  dispose() {
    this.scene?.remove(this.spot, this.spot.target, this.cone);
  }
}
