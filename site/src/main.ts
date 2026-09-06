type Group = 'project' | 'model' | 'tool';
type Sample = {
  project: string;
  model: string;
  tool: string;
  requests: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  latency: number;
  errors: number;
  cost: number;
};

const samples: Sample[] = [
  { project: 'checkout-agent', model: 'claude-sonnet-4', tool: 'kiro', requests: 1, input: 581230, output: 94210, cacheRead: 312840, cacheWrite: 0, latency: 1284, errors: 1, cost: 2.312172 },
  { project: 'docs-indexer', model: 'gemini-2.5-pro', tool: 'gemini-cli', requests: 1, input: 402450, output: 62880, cacheRead: 198340, cacheWrite: 0, latency: 932, errors: 0, cost: 0.9434395 },
  { project: 'checkout-agent', model: 'gpt-5-mini', tool: 'codex', requests: 1, input: 216090, output: 48320, cacheRead: 110480, cacheWrite: 0, latency: 764, errors: 0, cost: 0.1258045 },
  { project: 'release-bot', model: 'claude-sonnet-4', tool: 'kiro', requests: 1, input: 173880, output: 28170, cacheRead: 90200, cacheWrite: 0, latency: 1104, errors: 1, cost: 0.70065 },
  { project: 'unknown', model: 'unknown', tool: 'unknown', requests: 1, input: 80, output: 20, cacheRead: 0, cacheWrite: 0, latency: 50, errors: 0, cost: 0 },
];

const labels = ['Name', 'Requests', 'Input', 'Output', 'Cache read', 'Avg latency', 'Errors', 'Cost USD'];
const formatNumber = new Intl.NumberFormat('en-US');
const demoPrefix = 'demo:otel-token-meter:';
const demoStateKey = `${demoPrefix}state`;
const isDemo = document.body.dataset.page === 'demo';
let currentGroup: Group = 'project';
let empty = false;

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

function clearDemoStorage() {
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(demoPrefix)) localStorage.removeItem(key);
  }
}

function loadDemoState() {
  if (!isDemo) {
    clearDemoStorage();
    return;
  }
  try {
    const saved = JSON.parse(localStorage.getItem(demoStateKey) ?? '{}') as { group?: Group; empty?: boolean };
    if (saved.group && ['project', 'model', 'tool'].includes(saved.group)) currentGroup = saved.group;
    empty = saved.empty === true;
  } catch {
    clearDemoStorage();
  }
}

function saveDemoState() {
  if (isDemo) localStorage.setItem(demoStateKey, JSON.stringify({ group: currentGroup, empty }));
}

function grouped(group: Group) {
  const groups = new Map<string, Sample>();
  for (const row of samples) {
    const key = row[group];
    const found = groups.get(key) ?? { project: key, model: key, tool: key, requests: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, latency: 0, errors: 0, cost: 0 };
    const oldRequests = found.requests;
    found.latency = (found.latency * oldRequests + row.latency * row.requests) / (oldRequests + row.requests);
    found.requests += row.requests;
    found.input += row.input;
    found.output += row.output;
    found.cacheRead += row.cacheRead;
    found.cacheWrite += row.cacheWrite;
    found.errors += row.errors;
    found.cost += row.cost;
    groups.set(key, found);
  }
  return [...groups.entries()].sort((a, b) => (b[1].input + b[1].output) - (a[1].input + a[1].output));
}

function escapeHtml(value: string) {
  const node = document.createElement('span');
  node.textContent = value;
  return node.innerHTML;
}

function render() {
  const table = byId<HTMLDivElement>('demo-table');
  if (!table) return;
  const rows = empty ? [] : grouped(currentGroup);
  if (!rows.length) {
    table.innerHTML = '<div class="empty-state"><strong>No sample rows are shown</strong><p>Select Show sample data to restore the bundled spans.</p></div>';
    return;
  }
  const body = rows.map(([name, row]) => {
    const values = [escapeHtml(name), formatNumber.format(row.requests), formatNumber.format(row.input), formatNumber.format(row.output), formatNumber.format(row.cacheRead), `${Math.round(row.latency)} ms`, formatNumber.format(row.errors), `$${row.cost.toFixed(3)}`];
    return `<tr>${values.map((value, index) => `<td data-label="${labels[index]}">${value}</td>`).join('')}</tr>`;
  }).join('');
  table.innerHTML = `<table><thead><tr>${labels.map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
}

function exportCsv() {
  const rows = grouped(currentGroup);
  const header = `${currentGroup},requests,input_tokens,output_tokens,total_tokens,cache_read_tokens,cache_write_tokens,avg_latency_ms,errors,cost_usd`;
  const csv = [header, ...rows.map(([name, row]) => `"${name.replaceAll('"', '""')}",${row.requests},${row.input},${row.output},${row.input + row.output},${row.cacheRead},${row.cacheWrite},${row.latency.toFixed(3)},${row.errors},${row.cost.toFixed(6)}`)].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `otel-token-meter-${currentGroup}.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  const note = byId('export-note');
  if (note) note.textContent = 'CSV exported from the sample in this browser.';
}

loadDemoState();
const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')];

function selectTab(tab: HTMLButtonElement, moveFocus = false) {
  tabs.forEach(item => { item.setAttribute('aria-selected', 'false'); item.tabIndex = -1; });
  tab.setAttribute('aria-selected', 'true');
  tab.tabIndex = 0;
  currentGroup = tab.dataset.group as Group;
  empty = false;
  byId('demo-table')?.setAttribute('aria-labelledby', tab.id);
  const emptyButton = byId<HTMLButtonElement>('empty-toggle');
  if (emptyButton) emptyButton.textContent = 'Show empty state';
  render();
  saveDemoState();
  if (moveFocus) tab.focus();
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    let nextIndex: number | undefined;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    selectTab(tabs[nextIndex], true);
  });
});

if (tabs.length) {
  const initial = tabs.find(tab => tab.dataset.group === currentGroup) ?? tabs[0];
  selectTab(initial);
}

byId<HTMLButtonElement>('export')?.addEventListener('click', exportCsv);
byId<HTMLButtonElement>('empty-toggle')?.addEventListener('click', event => {
  empty = !empty;
  (event.currentTarget as HTMLButtonElement).textContent = empty ? 'Show sample data' : 'Show empty state';
  render();
  saveDemoState();
});

byId<HTMLButtonElement>('reset-demo')?.addEventListener('click', () => {
  clearDemoStorage();
  currentGroup = 'project';
  empty = false;
  selectTab(tabs.find(tab => tab.dataset.group === 'project') ?? tabs[0]);
  const note = byId('export-note');
  if (note) note.textContent = '';
  const status = byId('demo-status');
  if (status) status.textContent = 'Demo reset to the bundled sample.';
});

byId<HTMLAnchorElement>('start-real')?.addEventListener('click', () => clearDemoStorage());

if (isDemo) {
  document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(link => {
    const destination = new URL(link.href, location.href);
    if (!destination.pathname.startsWith('/demo')) link.addEventListener('click', clearDemoStorage);
  });
  window.addEventListener('pagehide', clearDemoStorage);
}

byId<HTMLButtonElement>('copy-command')?.addEventListener('click', async () => {
  const result = byId('copy-result');
  try {
    await navigator.clipboard.writeText('cargo install --git https://github.com/B-Divyesh/sf-otel-token-meter');
    if (result) result.textContent = 'Install command copied.';
  } catch {
    if (result) result.textContent = 'Select and copy the command above.';
  }
});

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === '127.0.0.1')) {
  navigator.serviceWorker.register('/sw.js').catch(() => { /* Online use still works. */ });
}
