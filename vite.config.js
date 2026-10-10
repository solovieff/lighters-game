import { defineConfig } from 'vite';

// GitHub Pages serves the project at /lighters-game/, so built asset paths need that base.
// Dev server stays at / (the LAN link keeps working).
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/lighters-game/' : '/',
}));
