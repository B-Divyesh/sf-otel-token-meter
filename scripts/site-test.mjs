import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const fail = message => { throw new Error(message); };
const pages = ['index.html', 'demo/index.html', 'privacy/index.html', 'terms/index.html', '404.html'];
for (const page of pages) {
  const html = readFileSync(join('dist/site', page), 'utf8');
  if (!/<html lang="en">/.test(html)) fail(`${page}: missing lang`);
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? '';
  if (!title || title.length > 60) fail(`${page}: title must contain 1–60 characters`);
  const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1] ?? '';
  if (!description || description.length > 155) fail(`${page}: description must contain 1–155 characters`);
  if ((html.match(/<h1[ >]/g) ?? []).length !== 1) fail(`${page}: expected one h1`);
  if (!/<main[ >]/.test(html)) fail(`${page}: missing main`);
  if (!/<link rel="canonical"/.test(html)) fail(`${page}: missing canonical URL`);
  if (!/<meta property="og:image"/.test(html) || !/<meta name="twitter:card"/.test(html)) fail(`${page}: missing social metadata`);
  if (!/<link rel="apple-touch-icon"/.test(html)) fail(`${page}: missing Apple touch icon`);
  if (html.includes('__BUILD_ID__')) fail(`${page}: build ID was not replaced`);
  for (const image of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt=/.test(image[0])) fail(`${page}: image missing alt`);
}

const config = JSON.parse(readFileSync('dist/site/staticwebapp.config.json', 'utf8'));
if (config.responseOverrides?.['404']?.rewrite !== '/404.html') fail('static host has no product 404 override');
const sitemap = readFileSync('dist/site/sitemap.xml', 'utf8');
for (const route of ['/', '/demo/', '/privacy/', '/terms/']) {
  if (!sitemap.includes(`https://otel-token-meter.sociobot.in${route}`)) fail(`sitemap missing ${route}`);
}

const claims = JSON.parse(readFileSync('.factory/claims.json', 'utf8'));
const claimTests = readFileSync('tests/claims/public-claims.spec.ts', 'utf8');
const ids = new Set();
for (const entry of claims) {
  if (ids.has(entry.id)) fail(`duplicate claim ID ${entry.id}`);
  ids.add(entry.id);
  const tag = `@claim:${entry.id}`;
  if (claimTests.split(tag).length - 1 !== 1) fail(`${tag} must occur in exactly one outcome test`);
  if (!entry.test.includes(tag)) fail(`${entry.id}: command does not select its claim tag`);
}

const assets = readdirSync('dist/site/assets');
const jsBytes = assets.filter(name => name.endsWith('.js')).reduce((n, name) => n + statSync(join('dist/site/assets', name)).size, 0);
const cssBytes = assets.filter(name => name.endsWith('.css')).reduce((n, name) => n + statSync(join('dist/site/assets', name)).size, 0);
if (jsBytes > 200_000) fail(`initial JS ${jsBytes} exceeds 200 KB`);
if (cssBytes > 50_000) fail(`CSS ${cssBytes} exceeds 50 KB`);
if (statSync('dist/site/trace-press.webp').size > 300_000) fail('hero image exceeds 300 KB');
if (statSync('dist/site/og-trace-press.webp').size > 300_000) fail('social image exceeds 300 KB');
console.log(`site checks passed: JS ${jsBytes} B, CSS ${cssBytes} B, hero ${statSync('dist/site/trace-press.webp').size} B`);
