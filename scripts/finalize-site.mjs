import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = 'dist/site';
const assets = readdirSync(join(root, 'assets')).map(name => `/assets/${name}`);
const shell = [
  '/', '/demo/', '/privacy/', '/terms/', '/404.html', '/favicon.svg',
  '/apple-touch-icon.png', '/trace-press-768.webp', '/og-trace-press.webp', ...assets,
];
const path = join(root, 'sw.js');
const template = readFileSync(path, 'utf8');
const hash = createHash('sha256').update(template);
for (const url of shell) {
  const relative = url === '/' ? 'index.html' : url.endsWith('/') ? `${url.slice(1)}index.html` : url.slice(1);
  hash.update(readFileSync(join(root, relative)));
}
const digest = hash.digest('hex').slice(0, 12);
const source = template
  .replace('__CACHE_VERSION__', `otel-token-meter-site-${digest}`)
  .replace('__BUILD_ASSETS__', JSON.stringify(shell));
writeFileSync(path, source);
