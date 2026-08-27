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
otel-token-meter serve --listen 127.0.0.1:4318 --data ./token-meter.json
```

Point any OTLP/HTTP exporter to `http://127.0.0.1:4318`. Traces go to `/v1/traces`; the dashboard opens at `http://127.0.0.1:4318`. Both `application/x-protobuf` and OTLP JSON are accepted.

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

The commands are non-interactive. Success exits `0`, invalid input/config exits `2`, and runtime or I/O failure exits `1`.

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
cargo package --allow-dirty
```

Rust tests cover protobuf/JSON ingestion, privacy exclusions, grouping, reports, and the documented workflow. Site tests check structural accessibility and asset budgets.

## Data and privacy

Only aggregate counters and timing totals are written to the `--data` JSON file. Span IDs, prompt/completion bodies, events, and individual trace records are not stored. The collector binds to loopback by default. Delete the JSON file to reset it. See the hosted [privacy policy](https://otel-token-meter.sociobot.in/privacy/) and [terms](https://otel-token-meter.sociobot.in/terms/).

## License

MIT © 2026 Sociobot (Param Factory). See [LICENSE](LICENSE).
