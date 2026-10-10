// Stage 1: bootstrap. Dark wooden floor with one test SpotLight.
import * as THREE from 'three';
import { Renderer } from './render/Renderer.js';
import { createWoodTexture } from './assets/Textures.js';

const gfx = new Renderer();
const { scene } = gfx;

// World light is almost zero: faint dark-blue hemisphere and ambient.
scene.add(new THREE.AmbientLight('#ffffff', 0.02));
scene.add(new THREE.HemisphereLight('#1a2440', '#000000', 0.05));

// Desk floor with procedural wood.
const woodTex = createWoodTexture(512);
woodTex.repeat.set(4, 4);
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.6, metalness: 0.0 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Test flashlight beam: a single SpotLight pointing at the floor.
const testLight = new THREE.SpotLight('#fff4e0', 60, 12, THREE.MathUtils.degToRad(18), 0.6, 1.5);
testLight.position.set(0, 2.2, 1.0);
testLight.target.position.set(0, 0, -0.5);
testLight.castShadow = true;
testLight.shadow.mapSize.set(1024, 1024);
scene.add(testLight, testLight.target);

// Stage 1 loop: just render. Real loop comes in stage 2.
function frame() {
  gfx.render();
  requestAnimationFrame(frame);
}
frame();
console.log('[LUMEN] stage 1 started');
