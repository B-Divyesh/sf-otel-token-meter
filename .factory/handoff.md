# OTel Token Meter v0.1.0 handoff

## What shipped

- A single Rust binary accepting OTLP/HTTP traces at `/v1/traces` as protobuf or JSON, with identity and gzip request encoding.
- Privacy-first mapping of standard and common legacy GenAI semantic attributes. Prompts, completions, trace/span IDs, events, and individual spans are never persisted.
- Aggregate-only JSON storage by project × model × tool for requests, input/output tokens, cache read/write, latency, errors, and USD cost.
- Optional local per-model price books; an emitted cost attribute takes precedence, otherwise uncached/cache token rates are applied without double charging.
- `serve`, `ingest`, `report`, and `export` commands with human tables, stable JSON, and CSV output.
- An embedded, responsive local dashboard with empty/error/offline guidance and project/model/tool grouping.
- A distinctive static landing/docs site with a working recorded ledger demo, CSV export, privacy and terms pages, offline shell caching, and deployment caching/security headers.
- Original “trace press” hero art generated with the factory image deployment and optimized to 1200 px/108 KB and 768 px/42 KB WebP. Prompt and provenance are in `.factory/design.md`; the source and generation metadata are in `.factory/assets/`.
- MIT license, changelog, GitHub Actions CI, example OTLP payload, and example price book.

## Run and verify

```sh
npm ci
npm test
npm run build
cargo package

./dist/bin/otel-token-meter ingest examples/sample-traces.json \
  --data /tmp/token-meter.json --prices examples/prices.json
./dist/bin/otel-token-meter report --data /tmp/token-meter.json --json
./dist/bin/otel-token-meter serve --data /tmp/token-meter.json \
  --prices examples/prices.json
```

- `npm test`: passed (7 Rust unit tests, 2 end-to-end CLI/HTTP tests, and static site structure/budget tests).
- `cargo clippy --all-targets -- -D warnings`: passed.
- `npm run build`: passed; outputs the binary at `dist/bin/otel-token-meter` and deployable site at `dist/site/index.html`.
- `cargo package`: passed; package is ready to publish with factory-owned credentials. Do not publish from this worker.
- `/opt/fleet/lib/verify-url.sh`: passed on the landing page and populated embedded dashboard at desktop and 390 px mobile; zero console/page errors, one h1, title/lang/main and alt text present.
- axe-core 4.13: 0 violations on the landing, privacy, terms, and embedded dashboard pages.
- Lighthouse mobile: performance 96, accessibility 100, best practices 100, SEO 100; LCP 2.46 s, CLS 0, TBT 0 ms. Lab INP was not available; TBT was the responsiveness proxy.
- Static budgets: initial JS 4,138 B, CSS 9,058 B, hero 110,032 B; no runtime CDN, analytics, or external font request.

## Deployment

- Static deploy root: `dist/site/`.
- Exact site-only command: `npm ci && npm run build:site`.
- Full product build: `npm ci && npm run build`.
- The factory should publish the Rust crate/release binary separately; `cargo package` is verified but no registry publication was attempted.

## Known gaps and next steps

- v0.1 accepts OTLP over HTTP only; OTLP/gRPC is intentionally not included. Agents must select their HTTP exporter.
- Pricing is deliberately user-supplied because vendor rates change and negotiated rates differ. Without a cost attribute or matching price-book entry, token accounting remains complete while USD cost is `0`.
- Aggregate-only storage cannot reconstruct individual requests or historical time buckets. This is the explicit privacy tradeoff, not an accidental omission.
- A later release can add retention-window buckets and an optional Unix-socket listener without changing the aggregate file's privacy boundary.
