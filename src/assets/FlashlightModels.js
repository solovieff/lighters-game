// Procedural flashlight model built at real size from data.
// Stage 3: only the Convoy S2+ silhouette (classic cylinder, tail clicky, diamond knurling).
import * as THREE from 'three';
import { FLASHLIGHTS } from '../data/flashlights.js';

/** Makes a diamond-pattern CanvasTexture used as bump map for knurling. */
function knurlTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#808080';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#303030';
  g.lineWidth = 4;
  for (let i = -128; i < 256; i += 16) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 128, 128); g.stroke();
    g.beginPath(); g.moveTo(i, 128); g.lineTo(i + 128, 0); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 6);
  return t;
}

/**
 * Builds a flashlight Group. Origin = tail end on the ground, +Y = up toward the head.
 * @param {string} id entry id in FLASHLIGHTS
 * @returns {{ group: THREE.Group, headY: number, lengthM: number, radiusM: number }}
 */
export function buildFlashlight(id = 'convoy_s2plus_sst40') {
  const spec = FLASHLIGHTS.find((f) => f.id === id);
  if (!spec) throw new Error(`unknown flashlight: ${id}`);

  const group = new THREE.Group();
  group.name = spec.id;

  const lengthM = spec.lengthMm / 1000;
  const bodyR = spec.bodyMm / 2000;
  const headR = spec.headMm / 2000;
  const headLen = 0.02;                  // head block length, real Convoy is short
  const bodyLen = lengthM - headLen;

  const knurl = knurlTexture();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: spec.look.bodyColor, metalness: 0.8, roughness: 0.45,
    bumpMap: knurl, bumpScale: 0.6,
  });
  const headMat = new THREE.MeshStandardMaterial({
    color: '#8a8d92', metalness: 0.9, roughness: 0.35,
  });

  // Tail clicky: rubber boot at the very back.
  const tail = new THREE.Mesh(
    new THREE.CylinderGeometry(bodyR * 0.9, bodyR * 0.9, 0.008, 24),
    new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.9 })
  );
  tail.position.y = 0.004;

  // Main body cylinder.
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(bodyR, bodyR, bodyLen, 32),
    bodyMat
  );
  body.position.y = 0.008 + bodyLen / 2;

  // Head: slightly wider ring at the front, with a smooth reflector disc.
  const head = new THREE.Mesh(
    new THREE.CylinderGeometry(headR, bodyR, headLen, 32),
    headMat
  );
  head.position.y = lengthM - headLen / 2;

  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(headR * 0.85, 32),
    new THREE.MeshStandardMaterial({ color: '#dfe6ee', emissive: '#222', roughness: 0.1, metalness: 0.2 })
  );
  lens.position.y = lengthM + 0.0005;
  lens.rotation.x = -Math.PI / 2;

  // Single LED square inside the reflector, yellow.
  const led = new THREE.Mesh(
    new THREE.PlaneGeometry(0.004, 0.004),
    new THREE.MeshBasicMaterial({ color: '#ffe27a' })
  );
  led.position.y = lengthM + 0.001;
  led.rotation.x = -Math.PI / 2;

  group.add(tail, body, head, lens, led);
  return { group, headY: lengthM, lengthM, radiusM: bodyR };
}
