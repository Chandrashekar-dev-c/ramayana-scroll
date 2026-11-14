import { defineConfig } from 'vite';
import { swPlugin } from './tools/sw-plugin.mjs';

export default defineConfig({
  base: './',
  build: { target: 'es2020', emptyOutDir: true, assetsInlineLimit: 0, chunkSizeWarningLimit: 900, rollupOptions: { input: { main: 'index.html' } } },
  plugins: [swPlugin()],
});
