// Owns the WebGL renderer, the scene and the camera.
import * as THREE from 'three';
import { CAMERA } from '../core/config.js';

export class Renderer {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    document.body.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#010103');
    this.scene.fog = new THREE.FogExp2('#010103', 0.004);

    this.camera = new THREE.PerspectiveCamera(
      this.fovForScreen(), window.innerWidth / window.innerHeight, 0.05, 500
    );
    this.camera.position.set(0, CAMERA.height, CAMERA.distance);
    this.camera.lookAt(0, 0, 0);

    window.addEventListener('resize', () => this.onResize());
  }

  /**
   * On a phone in landscape the screen is short, so the scene is made larger with a narrower lens.
   * Keyboard screens keep the usual field of view.
   */
  fovForScreen() {
    const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const landscape = window.innerWidth > window.innerHeight;
    return touch && landscape ? CAMERA.fovPhone : CAMERA.fov;
  }

  /** Keeps the canvas and camera aspect in sync with the window. */
  onResize() {
    this.camera.fov = this.fovForScreen();
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
