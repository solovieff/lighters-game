// Test dummy: a dark sphere on the floor with a floating lux label. Used to check photometry in stage 4.
import * as THREE from 'three';

/** Formats illuminance in Russian lux (лк). */
export function formatLux(v) {
  if (v < 0.005) return '0 лк';
  if (v < 10) return `${v.toFixed(2)} лк`;
  return `${Math.round(v)} лк`;
}

export class Dummy {
  /**
   * @param {THREE.Scene} scene
   * @param {string} name display name (Russian)
   * @param {number} x
   * @param {number} z
   */
  constructor(scene, name, x, z) {
    this.name = name;
    this.position = new THREE.Vector3(x, 0.05, z);
    this.lux = 0;

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 16, 12),
      new THREE.MeshStandardMaterial({ color: '#202428', roughness: 0.9 })
    );
    mesh.position.copy(this.position);
    mesh.castShadow = true;
    scene.add(mesh);

    this.anchor = new THREE.Vector3(x, 0.2, z);
    this.projected = new THREE.Vector3();

    this.label = document.createElement('div');
    Object.assign(this.label.style, {
      position: 'fixed', transform: 'translate(-50%, -100%)', pointerEvents: 'none',
      color: '#ffe9b8', font: '13px monospace', background: 'rgba(0,0,0,0.5)',
      padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap', display: 'none',
    });
    document.body.appendChild(this.label);
  }

  /** @param {number} lux illuminance this frame */
  setLux(lux) {
    this.lux = lux;
  }

  /** Moves the DOM label to the projected anchor point. */
  updateLabel(camera, width, height) {
    this.projected.copy(this.anchor).project(camera);
    const onScreen = this.projected.z < 1 && Math.abs(this.projected.x) < 1.1 && Math.abs(this.projected.y) < 1.1;
    this.label.style.display = onScreen ? 'block' : 'none';
    if (!onScreen) return;
    this.label.style.left = `${(this.projected.x * 0.5 + 0.5) * width}px`;
    this.label.style.top = `${(-this.projected.y * 0.5 + 0.5) * height}px`;
    this.label.textContent = `${this.name}: ${formatLux(this.lux)}`;
  }
}
