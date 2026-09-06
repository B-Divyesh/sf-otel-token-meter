import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = fileURLToPath(new URL('.', import.meta.url));
const buildId = process.env.OTEL_TOKEN_METER_BUILD ?? (() => {
  try { return execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { encoding: 'utf8' }).trim(); }
  catch { return 'source'; }
})();

export default defineConfig({
  root: resolve(here),
  plugins: [{
    name: 'build-id',
    transformIndexHtml(html) { return html.replaceAll('__BUILD_ID__', buildId); },
  }],
  build: {
    outDir: resolve(here, '../dist/site'),
    emptyOutDir: true,
    target: 'es2022',
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        index: resolve(here, 'index.html'),
        demo: resolve(here, 'demo/index.html'),
        privacy: resolve(here, 'privacy/index.html'),
        terms: resolve(here, 'terms/index.html'),
        notFound: resolve(here, '404.html'),
      }
    }
  }
});
