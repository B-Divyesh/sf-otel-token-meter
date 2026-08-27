# OTel Token Meter

Local, vendor-neutral token, cost, cache, latency, and error accounting from OpenTelemetry traces. It accepts OTLP/HTTP from coding agents and LLM apps, drops trace bodies, stores aggregates on disk, and serves a private dashboard. No account, model proxy, or telemetry of its own.

## Install

Download a release binary, or build the single executable with Rust 1.85+:

```sh
cargo install --path .
otel-token-meter --help
```

## Usage

Start the OTLP collector and dashboard:

```sh
otel-token-meter serve --listen 127.0.0.1:4318 --data ./token-meter.json \
  --prices ./prices.json
```

Point any OTLP/HTTP exporter to `http://127.0.0.1:4318`. Traces go to `/v1/traces`; the dashboard opens at `http://127.0.0.1:4318`. Both `application/x-protobuf` and OTLP JSON are accepted, with identity or gzip content encoding.

`GET /health` returns the aggregate-only privacy mode plus the binary version and build ID, so local operators can identify the collector they are checking.

```sh
# Human-readable ledger
otel-token-meter report --data ./token-meter.json --group-by project

# Stable scripting output
otel-token-meter report --data ./token-meter.json --group-by model --json

# CSV for finance or capacity work
otel-token-meter export --data ./token-meter.json --group-by tool --output usage.csv

# Import a captured OTLP JSON payload without running a server
otel-token-meter ingest traces.json --data ./token-meter.json --json
```

Try the repository fixture end to end with `otel-token-meter ingest examples/sample-traces.json --data /tmp/token-meter.json --prices examples/prices.json`, then run `report` against the same data file.

The commands are non-interactive. Success exits `0`, command-line usage errors exit `2`, and invalid data, configuration, or I/O failures exit `1`.

### Optional cost estimates

If a span supplies `gen_ai.usage.cost` or `llm.usage.total_cost`, that observed USD value wins. Otherwise, pass a local price book to `serve` or `ingest`:

```json
{
  "your-model-id": {
    "input_per_million": 2.5,
    "output_per_million": 10.0,
    "cache_read_per_million": 0.25,
    "cache_write_per_million": 3.0
  }
}
```

Keys match emitted model names exactly; `"*"` is an optional fallback. Cached input is subtracted from ordinary input before its cache rate is applied, avoiding double charges. Prices are read locally and are never fetched from a vendor.

### Supported semantic conventions

| Metric | Attributes, in precedence order |
| --- | --- |
| Input tokens | `gen_ai.usage.input_tokens`, `llm.usage.prompt_tokens`, `ai.prompt_tokens` |
| Output tokens | `gen_ai.usage.output_tokens`, `llm.usage.completion_tokens`, `ai.completion_tokens` |
| Cache read | `gen_ai.usage.cache_read.input_tokens`, `gen_ai.usage.cached_input_tokens` |
| Cache write | `gen_ai.usage.cache_creation.input_tokens`, `gen_ai.usage.cache_write_tokens` |
| Model | `gen_ai.response.model`, `gen_ai.request.model`, `llm.model_name` |
| Tool | span `gen_ai.operation.name`, then resource `service.name` |
| Project | resource `service.namespace`, `project.id`, `deployment.environment.name` |
| Error | OTLP span status `ERROR` or `error.type` |
| Cost | `gen_ai.usage.cost`, `llm.usage.total_cost` (USD) |

Missing dimensions become `unknown`; they are never silently discarded. Duration comes from span start/end timestamps. Configure exporters not to send prompt bodies when possible; even if supplied, this collector neither maps nor persists them.

## Develop and verify

```sh
npm install
npm test
npm run build        # release binary + site at dist/site/
npm run dev          # static site on localhost
npx playwright install chromium
npm run test:browser # desktop keyboard/a11y + exact 390 px layout checks
cargo package --allow-dirty
```

Rust tests cover protobuf/JSON ingestion, privacy exclusions, grouping, reports, and the documented workflow. Site tests check structural accessibility and asset budgets. The browser suite verifies the recorded landing ledger and populated local dashboard have no horizontal document overflow at a 390 px viewport, preserves keyboard tab switching, and reports no axe violations.

## Data and privacy

Only aggregate counters and timing totals are written to the `--data` JSON file. Span IDs, prompt/completion bodies, events, and individual trace records are not stored. The collector binds to loopback by default. Delete the JSON file to reset it. See the hosted [privacy policy](https://otel-token-meter.sociobot.in/privacy/) and [terms](https://otel-token-meter.sociobot.in/terms/).

## License

MIT © 2026 Sociobot (Param Factory). See [LICENSE](LICENSE).
