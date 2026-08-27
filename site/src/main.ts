type Group = 'project' | 'model' | 'tool';
type Sample = { project: string; model: string; tool: string; requests: number; input: number; output: number; cache: number; latency: number; errors: number; cost: number };

const samples: Sample[] = [
  { project: 'checkout-agent', model: 'claude-sonnet-4', tool: 'kiro', requests: 328, input: 581230, output: 94210, cache: 312840, latency: 1284, errors: 4, cost: 2.184 },
  { project: 'docs-indexer', model: 'gemini-2.5-pro', tool: 'gemini-cli', requests: 184, input: 402450, output: 62880, cache: 198340, latency: 932, errors: 1, cost: 1.126 },
  { project: 'checkout-agent', model: 'gpt-5-mini', tool: 'codex', requests: 121, input: 216090, output: 48320, cache: 110480, latency: 764, errors: 3, cost: .584 },
  { project: 'release-bot', model: 'claude-sonnet-4', tool: 'kiro', requests: 96, input: 173880, output: 28170, cache: 90200, latency: 1104, errors: 0, cost: .712 }
];

const labels = ['Name', 'Requests', 'Input', 'Output', 'Cache read', 'Avg latency', 'Errors', 'Cost USD'];
const number = new Intl.NumberFormat('en-US');
let currentGroup: Group = 'project';
let empty = false;

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function grouped(group: Group) {
  const map = new Map<string, Sample>();
  for (const row of samples) {
    const key = row[group];
    const found = map.get(key) ?? { project: key, model: key, tool: key, requests: 0, input: 0, output: 0, cache: 0, latency: 0, errors: 0, cost: 0 };
    const oldRequests = found.requests;
    found.latency = (found.latency * oldRequests + row.latency * row.requests) / (oldRequests + row.requests);
    found.requests += row.requests; found.input += row.input; found.output += row.output; found.cache += row.cache; found.errors += row.errors; found.cost += row.cost;
    map.set(key, found);
  }
  return [...map.entries()].sort((a, b) => (b[1].input + b[1].output) - (a[1].input + a[1].output));
}

function render() {
  const rows = empty ? [] : grouped(currentGroup);
  const table = byId<HTMLDivElement>('demo-table');
  if (!rows.length) {
    table.innerHTML = '<div class="empty-state"><strong>No GenAI spans yet</strong><p>Start the collector, then send OTLP/HTTP traces to <code>127.0.0.1:4318</code>.</p></div>';
    return;
  }
  const body = rows.map(([name, row]) => {
    const values = [name, number.format(row.requests), number.format(row.input), number.format(row.output), number.format(row.cache), `${Math.round(row.latency)} ms`, number.format(row.errors), `$${row.cost.toFixed(3)}`];
    return `<tr>${values.map((value, index) => `<td data-label="${labels[index]}">${value}</td>`).join('')}</tr>`;
  }).join('');
  table.innerHTML = `<table><thead><tr>${labels.map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
}

function exportCsv() {
  const rows = grouped(currentGroup);
  const header = `${currentGroup},requests,input_tokens,output_tokens,cache_read_tokens,avg_latency_ms,errors,cost_usd`;
  const csv = [header, ...rows.map(([name, r]) => `"${name.replaceAll('"', '""')}",${r.requests},${r.input},${r.output},${r.cache},${r.latency.toFixed(2)},${r.errors},${r.cost.toFixed(6)}`)].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a'); link.href = url; link.download = `otel-token-meter-${currentGroup}.csv`; link.click(); URL.revokeObjectURL(url);
  byId('export-note').textContent = 'CSV exported locally.';
}

document.querySelectorAll<HTMLButtonElement>('[role="tab"]').forEach(tab => tab.addEventListener('click', () => {
  document.querySelectorAll('[role="tab"]').forEach(item => item.setAttribute('aria-selected', 'false'));
  tab.setAttribute('aria-selected', 'true'); currentGroup = tab.dataset.group as Group; empty = false; render();
}));
byId<HTMLButtonElement>('export').addEventListener('click', exportCsv);
byId<HTMLButtonElement>('empty-toggle').addEventListener('click', (event) => {
  empty = !empty; (event.currentTarget as HTMLButtonElement).textContent = empty ? 'Show sample data' : 'Show empty state'; render();
});
byId<HTMLButtonElement>('copy-command').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText('cargo install otel-token-meter'); byId('copy-result').textContent = 'Copied.'; }
  catch { byId('copy-result').textContent = 'Select and copy the command above.'; }
});
render();
