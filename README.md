# OTel Token Meter

Count token, cost, cache, latency, and error totals from OpenTelemetry traces. This CLI is for teams running coding agents and LLM apps.

It accepts OTLP/HTTP, drops trace content, and stores grouped totals on your machine. It has no account, model proxy, or product telemetry.

## Try the sample

Open the [separate website demo](https://otel-token-meter.sociobot.in/demo/) or run the bundled sample:

```sh
otel-token-meter demo
```

The command creates a new temporary directory. It writes the sample, aggregate ledger, and CSV there, then prints the path.

The website demo uses only keys prefixed with `demo:otel-token-meter:`. Resetting or leaving the demo removes those keys without changing other browser data.

The demo reloads offline after its first visit. Its sample totals match the CLI demo and local dashboard.

## Install

Build the single executable with Rust 1.85 or newer:

```sh
cargo install --path .
otel-token-meter --help
```

The factory prepares release packages. Registry publication happens outside this repository.

## Collect traces

Start the collector and local dashboard:

```sh
otel-token-meter serve --data ./token-meter.json --prices ./prices.json
```

The default collection address is `http://127.0.0.1:4318/v1/traces`. The dashboard uses `http://127.0.0.1:4318/`.

The endpoint accepts OTLP/HTTP JSON and protobuf. It supports identity and gzip content encoding.

Read or export the ledger:

```sh
otel-token-meter report --data ./token-meter.json --group-by project
otel-token-meter report --data ./token-meter.json --group-by model --json
otel-token-meter export --data ./token-meter.json --group-by tool --output usage.csv
otel-token-meter ingest traces.json --data ./token-meter.json --json
```

Reports use a readable table or stable JSON. Exports use CSV.

Commands do not prompt. Success exits `0`, data or I/O failures exit `1`, and usage errors exit `2`.

`GET /health` reports aggregate-only mode, version, and build ID.

## Add local prices

Supply an optional JSON price book to `serve` or `ingest`:

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

Keys match emitted model names. `"*"` is an optional fallback.

An observed `gen_ai.usage.cost` or `llm.usage.total_cost` value takes priority. Otherwise, the CLI uses the local price book.

The CLI does not fetch vendor prices. Missing prices produce a zero cost while preserving token totals.

## Supported attributes

Attributes are checked in the listed order. Missing project, model, or tool values become `unknown`.

| Total | Attributes |
| --- | --- |
| Input tokens | `gen_ai.usage.input_tokens`, `llm.usage.prompt_tokens`, `ai.prompt_tokens` |
| Output tokens | `gen_ai.usage.output_tokens`, `llm.usage.completion_tokens`, `ai.completion_tokens` |
| Cache read | `gen_ai.usage.cache_read.input_tokens`, `gen_ai.usage.cached_input_tokens` |
| Cache write | `gen_ai.usage.cache_creation.input_tokens`, `gen_ai.usage.cache_write_tokens` |
| Model | `gen_ai.response.model`, `gen_ai.request.model`, `llm.model_name` |
| Tool | span `gen_ai.operation.name`, then resource `service.name` |
| Project | resource `service.namespace`, `project.id`, `deployment.environment.name` |
| Error | OTLP span status `ERROR` or `error.type` |
| Cost | `gen_ai.usage.cost`, `llm.usage.total_cost` in USD |

Duration comes from span start and end times.

## Develop and verify

Use Node 22, Rust 1.85 or newer, and the pinned Playwright browser:

```sh
npm ci
npx playwright install chromium
npm test
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
npm run build
npm run test:browser
npm run test:claims
cargo package --allow-dirty
```

Each public claim and its exact command is listed in [`.factory/claims.json`](.factory/claims.json). Tests use temporary CLI directories and fresh browser state.

`npm run build` writes the release binary to `dist/bin/` and the static site to `dist/site/`.

To deploy, upload `dist/site/` to the product's static host. Keep `staticwebapp.config.json` with the build.

## Data and privacy

The collector stores aggregate counters and timing totals in the `--data` JSON file. It does not store trace bodies or individual spans.

The default address is loopback. Delete the JSON file to reset your local ledger.

The static website uses no cookies, analytics, remote fonts, or remote scripts. Read the [privacy policy](https://otel-token-meter.sociobot.in/privacy/).

## License

MIT © 2026 Sociobot (Param Factory). See [LICENSE](LICENSE).
