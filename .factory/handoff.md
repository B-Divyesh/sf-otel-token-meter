# OTel Token Meter verification handoff — PASS

**Verified candidate:** `c1d40e1fbb26335a422b026f4c9f50bd30c3f677`
**Live deployment:** https://otel-token-meter.sociobot.in/
**Verification report:** `.factory/verification-2.md`

## Result

**PASS.** The candidate is buildable and ready for factory deployment/use. Fresh
local and live evidence confirms the intended local, aggregate-only OTLP token,
cache, latency, error, and cost accounting workflow. No release-blocking defects
were found. The earlier 390 px document-overflow failure is fixed and no longer
reproduces on the hosted demo or local dashboard.

## How verified

```sh
npm ci
npm test
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
npm run build
npx playwright install chromium
npm run test:browser
cargo package --allow-dirty
```

All passed on the clean candidate. Tests: 7 Rust unit tests and 2 CLI/HTTP
integration tests; Playwright: 3/3 (390 px static/local layout, keyboard tabs,
axe). The browser-install command was needed only because the disposable
environment lacked the pinned Playwright Chromium cache.

The production build outputs `dist/bin/otel-token-meter` and `dist/site/`.
Static budgets passed: JS 4,138 B, CSS 9,147 B, primary hero 110,032 B. Fresh
Lighthouse mobile on the live site: performance 100, accessibility 100, best
practices 100, SEO 100; LCP 1,265 ms, CLS 0, TBT 33 ms.

The publishable crate passed `cargo package --allow-dirty` (28 files, 126.0 KiB
uncompressed / 36.9 KiB compressed). A clean consumer install exercised the
documented `ingest`, JSON `report`, and CSV `export` API. Do not publish it from
this workspace; the factory owns registry credentials.

## Runtime evidence

- One supplied OTLP trace produced the expected `checkout` aggregate: 100 input,
  25 output, 40 cache-read, 100 ms, and `$0.000410`.
- 20 concurrent posts, a gzip post, and recovery after malformed JSON/unsupported
  encoding produced exactly 22 successful aggregates. Invalid JSON returns 400;
  `br` returns 415; subsequent valid posts succeed.
- Ledger persistence contained no prompt/completion bodies, trace IDs, span IDs,
  or events. Health reports aggregate-only mode, version 0.1.0, and build
  `c1d40e1fbb26`.
- Live root, privacy, terms, JS/CSS, worker, images, favicon, robots, and sitemap
  SHA-256 hashes all match the fresh candidate `dist/site` build. Live requests
  have self-only CSP, HSTS, nosniff, strict referrer policy, restrictive
  permissions policy, and appropriate immutable/revalidation caching.
- Browser checks found zero axe violations (including serious/critical), no
  console/page errors, and no off-origin runtime requests. At 390 px both
  client and document width are 390 px; focus is visibly styled; reduced motion
  disables movement; keyboard grouping works. The active service worker served
  an offline reload.

## Known limitations / next steps

- v0.1 accepts OTLP/HTTP (JSON/protobuf, identity/gzip), not OTLP/gRPC.
- Price books are local and optional; no observed/matched price remains `$0`
  while token accounting still remains complete.
- Aggregate-only design deliberately cannot reconstruct individual prompts,
  trace records, or time buckets.
