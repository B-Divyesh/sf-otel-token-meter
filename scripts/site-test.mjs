import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const fail = (message) => { throw new Error(message); };
for (const page of ['index.html', 'privacy/index.html', 'terms/index.html']) {
  const html = readFileSync(join('dist/site', page), 'utf8');
  if (!/<html lang="en">/.test(html)) fail(`${page}: missing lang`);
  if (!/<title>[^<]+<\/title>/.test(html)) fail(`${page}: missing title`);
  if ((html.match(/<h1[ >]/g) ?? []).length !== 1) fail(`${page}: expected one h1`);
  if (!/<main[ >]/.test(html)) fail(`${page}: missing main`);
  for (const image of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt=/.test(image[0])) fail(`${page}: image missing alt`);
}
const assets = readdirSync('dist/site/assets');
const jsBytes = assets.filter(name => name.endsWith('.js')).reduce((n, name) => n + statSync(join('dist/site/assets', name)).size, 0);
const cssBytes = assets.filter(name => name.endsWith('.css')).reduce((n, name) => n + statSync(join('dist/site/assets', name)).size, 0);
if (jsBytes > 200_000) fail(`initial JS ${jsBytes} exceeds 200 KB`);
if (cssBytes > 50_000) fail(`CSS ${cssBytes} exceeds 50 KB`);
if (statSync('dist/site/trace-press.webp').size > 300_000) fail('hero image exceeds 300 KB');
console.log(`site checks passed: JS ${jsBytes} B, CSS ${cssBytes} B, hero ${statSync('dist/site/trace-press.webp').size} B`);
