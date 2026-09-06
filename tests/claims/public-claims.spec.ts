import { expect, test } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { gzipSync } from 'node:zlib';

const site = 'http://127.0.0.1:4173';
const binary = join(process.cwd(), 'dist/bin/otel-token-meter');
const temporaryDirectories: string[] = [];

function temporaryDirectory() {
  const directory = mkdtempSync(join(tmpdir(), 'otel-token-meter-claim-'));
  temporaryDirectories.push(directory);
  return directory;
}

function run(args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  return spawnSync(binary, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    encoding: 'utf8',
    timeout: 20_000,
  });
}

function runDemo() {
  const directory = temporaryDirectory();
  const output = join(directory, 'demo');
  const result = run(['demo', '--output', output, '--json']);
  expect(result.status, result.stderr).toBe(0);
  return { directory, output, receipt: JSON.parse(result.stdout) };
}

function protobufVarint(value: number | bigint) {
  let remaining = BigInt(value);
  const bytes: number[] = [];
  do {
    let byte = Number(remaining & 0x7fn);
    remaining >>= 7n;
    if (remaining > 0n) byte |= 0x80;
    bytes.push(byte);
  } while (remaining > 0n);
  return Buffer.from(bytes);
}

function protobufMessage(field: number, body: Buffer) {
  return Buffer.concat([protobufVarint((field << 3) | 2), protobufVarint(body.length), body]);
}

function protobufString(field: number, value: string) {
  return protobufMessage(field, Buffer.from(value));
}

function protobufInt(field: number, value: number) {
  return Buffer.concat([protobufVarint(field << 3), protobufVarint(value)]);
}

function protobufFixed64(field: number, value: bigint) {
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64LE(value);
  return Buffer.concat([protobufVarint((field << 3) | 1), bytes]);
}

function protobufKeyValue(key: string, value: Buffer) {
  return Buffer.concat([protobufString(1, key), protobufMessage(2, value)]);
}

function oneSpanOtlpProtobuf() {
  const stringValue = (value: string) => protobufString(1, value);
  const integerValue = (value: number) => protobufInt(3, value);
  const resource = Buffer.concat([
    protobufMessage(1, protobufKeyValue('service.namespace', stringValue('protobuf-project'))),
    protobufMessage(1, protobufKeyValue('service.name', stringValue('protobuf-tool'))),
  ]);
  const span = Buffer.concat([
    protobufString(5, 'protobuf-token-count'),
    protobufFixed64(7, 1_000_000n),
    protobufFixed64(8, 101_000_000n),
    protobufMessage(9, protobufKeyValue('gen_ai.request.model', stringValue('protobuf-model'))),
    protobufMessage(9, protobufKeyValue('gen_ai.usage.input_tokens', integerValue(123))),
    protobufMessage(9, protobufKeyValue('gen_ai.usage.output_tokens', integerValue(45))),
  ]);
  const scopeSpans = protobufMessage(2, span);
  const resourceSpans = Buffer.concat([protobufMessage(1, resource), protobufMessage(2, scopeSpans)]);
  return protobufMessage(1, resourceSpans);
}

function compileNetworkObserver(directory: string) {
  const library = join(directory, 'network-observer.so');
  const result = spawnSync('cc', ['-Wall', '-Wextra', '-Werror', '-shared', '-fPIC', '-o', library, 'tests/claims/network-observer.c'], {
    encoding: 'utf8',
    timeout: 20_000,
  });
  expect(result.status, result.stderr).toBe(0);
  return library;
}

async function freePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('could not reserve a test port');
  const port = address.port;
  server.close();
  await once(server, 'close');
  return port;
}

async function withCollector<T>(callback: (baseUrl: string) => Promise<T>, existingData?: string) {
  const directory = temporaryDirectory();
  const data = existingData ?? join(directory, 'ledger.json');
  const port = await freePort();
  const child = spawn(binary, ['serve', '--listen', `127.0.0.1:${port}`, '--data', data], {
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let errors = '';
  child.stderr.on('data', chunk => { errors += String(chunk); });
  const baseUrl = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) break;
    } catch { /* Collector is still starting. */ }
    await new Promise(resolve => setTimeout(resolve, 20));
    if (child.exitCode !== null) throw new Error(`collector stopped early: ${errors}`);
  }
  try {
    return await callback(baseUrl);
  } finally {
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      await Promise.race([once(child, 'exit'), new Promise(resolve => setTimeout(resolve, 2_000))]);
    }
  }
}

test.afterAll(() => {
  for (const directory of temporaryDirectories) rmSync(directory, { recursive: true, force: true });
});

test('@claim:accounting-groups groups every measured total across all dimensions', () => {
  const demo = runDemo();
  const reports = ['project', 'model', 'tool'].map(group => {
    const result = run(['report', '--data', join(demo.output, 'aggregate-ledger.json'), '--group-by', group, '--json']);
    expect(result.status, result.stderr).toBe(0);
    return JSON.parse(result.stdout);
  });
  for (const report of reports) {
    expect(report.totals).toMatchObject({ requests: 5, input_tokens: 1373730, output_tokens: 233600, cache_read_tokens: 711860, errors: 2 });
    expect(report.totals.duration_ms).toBe(4134);
    expect(report.totals.cost_usd).toBeCloseTo(4.082066, 6);
    expect(report.rows.length).toBeGreaterThanOrEqual(3);
  }
  expect(reports.map(report => report.group_by)).toEqual(['project', 'model', 'tool']);
});

test('@claim:otlp-http-formats accepts JSON and protobuf with identity and gzip', async () => {
  await withCollector(async baseUrl => {
    const json = readFileSync('examples/demo-traces.json');
    const cases = [
      { type: 'application/json', encoding: 'identity', body: json },
      { type: 'application/json', encoding: 'gzip', body: gzipSync(json) },
      { type: 'application/x-protobuf', encoding: 'identity', body: Buffer.alloc(0) },
      { type: 'application/x-protobuf', encoding: 'gzip', body: gzipSync(Buffer.alloc(0)) },
    ];
    for (const item of cases) {
      const response = await fetch(`${baseUrl}/v1/traces`, { method: 'POST', headers: { 'content-type': item.type, 'content-encoding': item.encoding }, body: item.body });
      expect(response.status, `${item.type} ${item.encoding}`).toBe(200);
    }
  });
});

test('@claim:aggregate-only-storage persists counters without trace content', () => {
  const demo = runDemo();
  const ledgerText = readFileSync(join(demo.output, 'aggregate-ledger.json'), 'utf8');
  const ledger = JSON.parse(ledgerText);
  expect(ledger).toEqual(expect.objectContaining({ schema_version: 1, aggregates: expect.any(Object), updated_at_ms: expect.any(Number) }));
  for (const privateValue of ['PRIVATE CHECKOUT PROMPT', 'PRIVATE CHECKOUT RESPONSE', 'traceId', 'spanId', 'events', 'status']) {
    expect(ledgerText).not.toContain(privateValue);
  }
  expect(Object.values(ledger.aggregates)).toHaveLength(5);
});

test('@claim:no-account-or-telemetry runs the complete demo without credentials or a reachable model proxy', () => {
  const directory = temporaryDirectory();
  const result = run(['demo', '--output', join(directory, 'demo'), '--json'], {
    cwd: directory,
    env: { PATH: process.env.PATH ?? '', HTTP_PROXY: 'http://127.0.0.1:9', HTTPS_PROXY: 'http://127.0.0.1:9', NO_PROXY: '' },
  });
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({ accepted_spans: 5, privacy: 'aggregate-only' });
  expect(result.stderr).toBe('');
});

test('@claim:no-outbound-cli-requests completes the demo while a network observer records and rejects outbound attempts', () => {
  const directory = temporaryDirectory();
  const log = join(directory, 'network-attempts.log');
  const observer = compileNetworkObserver(directory);
  const result = run(['demo', '--output', join(directory, 'demo'), '--json'], {
    cwd: directory,
    env: {
      ...process.env,
      HTTP_PROXY: 'http://127.0.0.1:9',
      HTTPS_PROXY: 'http://127.0.0.1:9',
      NO_PROXY: '',
      LD_PRELOAD: observer,
      OTEL_TOKEN_METER_NETWORK_LOG: log,
    },
  });
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({ accepted_spans: 5, privacy: 'aggregate-only' });
  expect(readFileSync(log, 'utf8')).toBe('observer-ready\n');
});

test('@claim:health-identity reports mode, semantic version, and build identity', async () => {
  await withCollector(async baseUrl => {
    const response = await fetch(`${baseUrl}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', privacy: 'aggregate-only', version: '0.1.0', build: expect.stringMatching(/^(source|[a-f0-9]{7,40})$/) });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});

test('@claim:default-loopback starts on the documented loopback address without a listen option', async () => {
  const directory = temporaryDirectory();
  const child = spawn(binary, ['serve', '--data', join(directory, 'ledger.json')], { stdio: ['ignore', 'ignore', 'pipe'] });
  let errors = '';
  child.stderr.on('data', chunk => { errors += String(chunk); });
  try {
    await expect.poll(async () => {
      try { return (await fetch('http://127.0.0.1:4318/health')).status; }
      catch { return 0; }
    }, { timeout: 5_000 }).toBe(200);
    expect(errors).toContain('http://127.0.0.1:4318/v1/traces');
  } finally {
    if (child.exitCode === null) child.kill('SIGTERM');
  }
});

test('@claim:report-outputs emits a readable table and stable parseable JSON', () => {
  const demo = runDemo();
  const data = join(demo.output, 'aggregate-ledger.json');
  const table = run(['report', '--data', data, '--group-by', 'project']);
  expect(table.status, table.stderr).toBe(0);
  expect(table.stdout).toContain('checkout-agent');
  expect(table.stdout).toContain('requests');
  const first = run(['report', '--data', data, '--group-by', 'project', '--json']);
  const second = run(['report', '--data', data, '--group-by', 'project', '--json']);
  expect(first.status).toBe(0);
  expect(second.stdout).toBe(first.stdout);
  expect(JSON.parse(first.stdout)).toMatchObject({ group_by: 'project', totals: { requests: 5 }, rows: expect.any(Array) });
});

test('@claim:csv-export writes RFC 4180 records with CRLF separators and one row for each project group', () => {
  const demo = runDemo();
  const output = join(demo.directory, 'project.csv');
  const result = run(['export', '--data', join(demo.output, 'aggregate-ledger.json'), '--group-by', 'project', '--output', output]);
  expect(result.status, result.stderr).toBe(0);
  const csv = readFileSync(output, 'utf8');
  expect(csv.endsWith('\r\n')).toBe(true);
  expect([...csv.matchAll(/(?<!\r)\n/g)]).toHaveLength(0);
  const lines = csv.trim().split('\r\n');
  expect(lines[0]).toBe('project,requests,input_tokens,output_tokens,total_tokens,cache_read_tokens,cache_write_tokens,avg_latency_ms,errors,cost_usd');
  expect(lines).toHaveLength(5);
  expect(lines.find(line => line.startsWith('"checkout-agent",'))).toContain(',2,797320,142530,939850,423320,0,1024.000,1,');
});

test('@claim:cli-demo-isolation creates separate temporary sample directories without changing the working directory', () => {
  const directory = temporaryDirectory();
  const sentinel = join(directory, 'real-ledger.json');
  writeFileSync(sentinel, 'real data stays unchanged');
  const runDefaultDemo = () => {
    const result = run(['demo'], { cwd: directory });
    expect(result.status, result.stderr).toBe(0);
    const outputDirectory = result.stdout.match(/^Sample files: (.+)$/m)?.[1];
    expect(outputDirectory).toBeTruthy();
    expect(outputDirectory).not.toBe(directory);
    expect(relative(tmpdir(), outputDirectory!).startsWith('..')).toBe(false);
    temporaryDirectories.push(outputDirectory!);
    return outputDirectory!;
  };
  const first = runDefaultDemo();
  const second = runDefaultDemo();
  expect(second).not.toBe(first);
  for (const output of [first, second]) {
    expect(readFileSync(join(output, 'sample-traces.json'), 'utf8')).toBe(readFileSync('examples/demo-traces.json', 'utf8'));
    expect(readFileSync(join(output, 'prices.json'), 'utf8')).toBe(readFileSync('examples/demo-prices.json', 'utf8'));
    const ledger = JSON.parse(readFileSync(join(output, 'aggregate-ledger.json'), 'utf8'));
    expect(Object.values(ledger.aggregates).reduce((sum: number, row: any) => sum + row.requests, 0)).toBe(5);
    expect(readFileSync(join(output, 'usage-by-project.csv'), 'utf8')).toContain('checkout-agent');
  }
  expect(readFileSync(sentinel, 'utf8')).toBe('real data stays unchanged');
  expect(readdirSync(directory).sort()).toEqual(['real-ledger.json']);
});

test('@claim:file-protobuf-ingest imports a one-span OTLP protobuf file into the aggregate ledger', () => {
  const directory = temporaryDirectory();
  const input = join(directory, 'captured-trace.pb');
  const data = join(directory, 'ledger.json');
  writeFileSync(input, oneSpanOtlpProtobuf());
  const ingest = run(['ingest', input, '--data', data, '--json']);
  expect(ingest.status, ingest.stderr).toBe(0);
  expect(JSON.parse(ingest.stdout)).toMatchObject({ accepted_spans: 1, privacy: 'aggregate-only' });
  const report = JSON.parse(run(['report', '--data', data, '--group-by', 'project', '--json']).stdout);
  expect(report.rows).toEqual([expect.objectContaining({
    name: 'protobuf-project',
    total_tokens: 168,
    input_tokens: 123,
    output_tokens: 45,
    duration_ms: 100,
  })]);
});

test('@claim:single-binary-distribution installs one executable from the packaged crate in a clean consumer root', () => {
  const directory = temporaryDirectory();
  const packaged = spawnSync('cargo', ['package', '--allow-dirty'], { encoding: 'utf8', timeout: 120_000 });
  expect(packaged.status, packaged.stderr).toBe(0);
  const packageDirectory = join(process.cwd(), 'target/package/otel-token-meter-0.1.0');
  const installRoot = join(directory, 'consumer');
  const installed = spawnSync('cargo', [
    'install', '--debug', '--path', packageDirectory, '--root', installRoot, '--target-dir', join(process.cwd(), 'target'),
  ], { encoding: 'utf8', timeout: 120_000 });
  expect(installed.status, installed.stderr).toBe(0);
  const bin = join(installRoot, 'bin');
  const programs = readdirSync(bin).filter(name => statSync(join(bin, name)).isFile());
  expect(programs).toEqual(['otel-token-meter']);
  const version = spawnSync(join(bin, 'otel-token-meter'), ['--version'], { encoding: 'utf8', timeout: 20_000 });
  expect(version.status, version.stderr).toBe(0);
  expect(version.stdout.trim()).toBe('otel-token-meter 0.1.0');
});

test('@claim:exit-codes distinguishes success, data failure, and usage errors', () => {
  const directory = temporaryDirectory();
  expect(run(['demo', '--output', join(directory, 'demo')]).status).toBe(0);
  expect(run(['ingest', join(directory, 'missing.json')]).status).toBe(1);
  expect(run(['not-a-command']).status).toBe(2);
});

test('@claim:local-price-book calculates only from the supplied local file', () => {
  const directory = temporaryDirectory();
  const priced = join(directory, 'priced.json');
  const unpriced = join(directory, 'unpriced.json');
  const env = { ...process.env, HTTP_PROXY: 'http://127.0.0.1:9', HTTPS_PROXY: 'http://127.0.0.1:9', NO_PROXY: '' };
  expect(run(['ingest', 'examples/sample-traces.json', '--data', priced, '--prices', 'examples/prices.json'], { env }).status).toBe(0);
  expect(run(['ingest', 'examples/sample-traces.json', '--data', unpriced], { env }).status).toBe(0);
  const pricedReport = JSON.parse(run(['report', '--data', priced, '--json']).stdout);
  const unpricedReport = JSON.parse(run(['report', '--data', unpriced, '--json']).stdout);
  expect(pricedReport.totals.cost_usd).toBeCloseTo(0.00041, 8);
  expect(unpricedReport.totals.cost_usd).toBe(0);
});

test('@claim:semantic-mapping handles current, legacy, and missing dimension attributes', () => {
  const demo = runDemo();
  const data = join(demo.output, 'aggregate-ledger.json');
  const report = (group: string) => JSON.parse(run(['report', '--data', data, '--group-by', group, '--json']).stdout);
  expect(report('project').rows.map((row: { name: string }) => row.name)).toEqual(expect.arrayContaining(['checkout-agent', 'docs-indexer', 'release-bot', 'unknown']));
  expect(report('model').rows.map((row: { name: string }) => row.name)).toEqual(expect.arrayContaining(['claude-sonnet-4', 'gemini-2.5-pro', 'gpt-5-mini', 'unknown']));
  expect(report('tool').rows.map((row: { name: string }) => row.name)).toEqual(expect.arrayContaining(['kiro', 'gemini-cli', 'codex', 'unknown']));
  expect(report('project').rows.find((row: { name: string }) => row.name === 'unknown').total_tokens).toBe(100);
});

test('@claim:web-demo-matches-cli shows the CLI demo totals on the site and local dashboard', async ({ page }) => {
  const demo = runDemo();
  await page.goto(`${site}/demo/`);
  await expect(page.locator('[data-total="requests"]')).toHaveText(String(demo.receipt.report.totals.requests));
  await expect(page.locator('[data-total="errors"]')).toHaveText(String(demo.receipt.report.totals.errors));
  await expect(page.locator('#demo-table tbody tr').filter({ hasText: 'checkout-agent' })).toContainText('797,320');
  await withCollector(async baseUrl => {
    await page.goto(baseUrl);
    await expect(page.locator('#requests')).toHaveText('5');
    await expect(page.locator('#tokens')).toHaveText('1,607,330');
    await expect(page.locator('#ledger tbody tr')).toHaveCount(4);
  }, join(demo.output, 'aggregate-ledger.json'));
});

test('@claim:web-csv-export downloads the visible project rows as parseable CSV', async ({ page }) => {
  await page.goto(`${site}/demo/`);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  const lines = readFileSync(path!, 'utf8').trim().split('\n');
  expect(download.suggestedFilename()).toBe('otel-token-meter-project.csv');
  expect(lines[0]).toBe('project,requests,input_tokens,output_tokens,total_tokens,cache_read_tokens,cache_write_tokens,avg_latency_ms,errors,cost_usd');
  expect(lines).toHaveLength(5);
  expect(lines.find(line => line.startsWith('"checkout-agent",'))).toContain(',2,797320,142530,939850,423320,0,1024.000,1,');
});

test('@claim:offline-reload reloads the populated demo in its own offline browser context', async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  const page = await context.newPage();
  try {
    await page.goto(`${site}/demo/`);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Review a sample token ledger' })).toBeVisible();
    await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
    await expect(page.locator('#demo-table tbody tr')).toHaveCount(4);
  } finally {
    await context.close();
  }
});

test('@claim:demo-sandbox enters in one click, resets, and leaves non-demo data unchanged', async ({ page }) => {
  await page.goto(`${site}/`);
  await page.evaluate(() => localStorage.setItem('otel-token-meter:real-sentinel', 'unchanged'));
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.locator('#demo-table tbody tr')).toHaveCount(4);
  await page.getByRole('tab', { name: 'Model' }).click();
  await page.getByRole('button', { name: 'Show empty state' }).click();
  await expect(page.getByText('No sample rows are shown')).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByText('Demo reset to the bundled sample.')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Project' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#demo-table tbody tr')).toHaveCount(4);
  expect(await page.evaluate(() => localStorage.getItem('otel-token-meter:real-sentinel'))).toBe('unchanged');
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => !key.startsWith('demo:') && key !== 'otel-token-meter:real-sentinel'))).toEqual([]);
  await page.getByRole('link', { name: 'Start for real' }).click();
  await expect(page).toHaveURL(`${site}/#install`);
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('demo:')))).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('otel-token-meter:real-sentinel'))).toBe('unchanged');
});

test('@claim:site-privacy keeps the demo flow same-origin and cookie-free', async ({ page, context }) => {
  const origins = new Set<string>();
  page.on('request', request => origins.add(new URL(request.url()).origin));
  await page.goto(`${site}/`);
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await page.getByRole('tab', { name: 'Tool' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  await download;
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await page.goto(`${site}/privacy/`);
  expect([...origins]).toEqual([site]);
  expect(await context.cookies()).toEqual([]);
  expect(await page.locator('script[src^="http"], link[href^="http"][rel="stylesheet"]').count()).toBe(0);
});

test('@claim:free-mit runs without license input and ships the MIT grant', () => {
  const demo = runDemo();
  expect(demo.receipt.accepted_spans).toBe(5);
  const version = run(['--version']);
  expect(version.status).toBe(0);
  expect(version.stdout.trim()).toBe('otel-token-meter 0.1.0');
  const license = readFileSync('LICENSE', 'utf8');
  expect(license).toContain('MIT License');
  expect(license).toContain('Permission is hereby granted, free of charge');
});
