import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: resolve(here),
  build: {
    outDir: resolve(here, '../dist/site'),
    emptyOutDir: true,
    target: 'es2022',
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        index: resolve(here, 'index.html'),
        privacy: resolve(here, 'privacy/index.html'),
        terms: resolve(here, 'terms/index.html')
      }
    }
  }
});
