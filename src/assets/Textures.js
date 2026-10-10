// Procedural textures generated on a canvas (no external images).
import * as THREE from 'three';

/** Deterministic pseudo-random generator so textures look the same each run. */
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Creates a wood-planks texture: dark brown base, grain lines and plank seams.
 * @param {number} size canvas size in pixels
 * @returns {THREE.CanvasTexture}
 */
export function createWoodTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = seededRandom(42);

  ctx.fillStyle = '#4a3322';
  ctx.fillRect(0, 0, size, size);

  // Four planks, each with its own tone and grain.
  const plankH = size / 4;
  for (let p = 0; p < 4; p++) {
    const y0 = p * plankH;
    const tone = 0.85 + rand() * 0.3;
    ctx.fillStyle = `rgb(${Math.round(74 * tone)}, ${Math.round(51 * tone)}, ${Math.round(34 * tone)})`;
    ctx.fillRect(0, y0, size, plankH);

    // Wavy grain lines.
    for (let g = 0; g < 40; g++) {
      const gy = y0 + rand() * plankH;
      const alpha = 0.04 + rand() * 0.08;
      ctx.strokeStyle = `rgba(20, 10, 4, ${alpha})`;
      ctx.lineWidth = 1 + rand() * 2;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      for (let x = 0; x <= size; x += 32) {
        ctx.lineTo(x, gy + Math.sin(x * 0.02 + g) * 3 + (rand() - 0.5) * 2);
      }
      ctx.stroke();
    }

    // Plank seam.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, y0, size, 3);
  }

  // Light speckle noise for roughness variation.
  for (let i = 0; i < 1500; i++) {
    ctx.fillStyle = `rgba(0, 0, 0, ${rand() * 0.15})`;
    ctx.fillRect(rand() * size, rand() * size, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
