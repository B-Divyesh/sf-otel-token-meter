import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const root = resolve('dist/site');
const port = Number(process.env.PORT ?? 4173);
const types = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const pages = new Map([['/', '/index.html'], ['/demo', '/demo/index.html'], ['/demo/', '/demo/index.html'], ['/privacy', '/privacy/index.html'], ['/privacy/', '/privacy/index.html'], ['/terms', '/terms/index.html'], ['/terms/', '/terms/index.html']]);

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
  const wanted = pages.get(pathname) ?? pathname;
  const file = resolve(root, `.${wanted}`);
  let target = file;
  let status = 200;
  try {
    if (!file.startsWith(`${root}${sep}`) || !statSync(file).isFile()) throw new Error('not found');
  } catch {
    target = resolve(root, '404.html');
    status = 404;
  }
  response.writeHead(status, {
    'Content-Type': types[extname(target)] ?? 'application/octet-stream',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
  });
  createReadStream(target).pipe(response);
}).listen(port, '127.0.0.1', () => console.log(`site preview: http://127.0.0.1:${port}`));
