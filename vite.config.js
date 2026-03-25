import { defineConfig } from 'vite';

export default defineConfig({
  base: '/cracker-barrel-peg-game/',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
