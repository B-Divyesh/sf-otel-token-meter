# OTel Token Meter repair handoff — PASS

**Repair base:** `32d377be3be0d87fa0429d7a4d6ee848150a59e3`

**Original candidate:** `c4c3da55da697d72e33de27caa0dc573ade2b239`
**Work order:** `otel-token-meter-repair-1`

## What changed

- Fixed the release-blocking 390 px horizontal document overflow in both the static recorded-ledger demo and the binary’s local dashboard. Their visually clipped table headers now use a 1 px, overflow-hidden accessible box, so desktop column-header intrinsic width cannot enlarge the mobile document. Long cell values can wrap rather than create a new overflow path.
- Added Playwright regression coverage that loads the production static build and a populated release-binary dashboard at 390 px and asserts `documentElement.scrollWidth === clientWidth === 390` for both. The same suite checks desktop Arrow-key tab selection and runs axe against both surfaces.
- Added the verifier’s low-severity operational improvement: `/health` now exposes `status`, `privacy`, semantic `version`, and a compile-time Git build ID (or an explicit `OTEL_TOKEN_METER_BUILD` value for controlled builds). The HTTP integration test verifies the version/build fields.
- Kept the product’s aggregate-only data boundary, static deployment class, visual system, and existing collector/CLI behavior unchanged.

## Run and verify

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

Evidence from this repair:

- Clean `npm ci` completed with 22 audited packages and no vulnerabilities.
- `cargo test`: 7 unit tests + 2 CLI/HTTP integration tests passed. `npm test` also built the site and passed structural/accessibility/budget checks.
- `cargo fmt --all -- --check` and `cargo clippy --all-targets -- -D warnings` passed.
- `npm run build` emitted `dist/bin/otel-token-meter` and `dist/site/`. Built static budgets: JavaScript **4,138 B**, CSS **9,147 B**, hero **110,032 B**.
- `npm run test:browser`: 3/3 passed. Both populated tables measured exactly **390 px client / 390 px scroll width**; desktop ArrowRight changed the ledger tab; axe reported zero violations on the landing and local dashboard.
- `cargo package --allow-dirty` passed (27 files; **126.0 KiB**, **36.8 KiB** compressed). A clean consumer install from `target/package/otel-token-meter-0.1.0` succeeded. It ingested the supplied fixture and reported `checkout`: 1 request, 100 input + 25 output tokens, 40 cache-read tokens, and `$0.000410`.
- Local production-site verification found HTTP 200, no browser console/page errors, a title/lang/one h1/main, and no missing image alt text or unlabeled buttons. Lighthouse mobile: performance **99**, accessibility **100**, best practices **100**, SEO **100**; LCP **1,553 ms**, CLS **0**, TBT **0 ms**. Chrome logged a transient tab-crash message after emitting the complete report.
- The browser suite is installed as a dev-only test dependency and runs in CI after Chromium installation; it does not ship to the static site or collector.

## Deployment

- Artifact/deployment class remains **static**.
- Deploy root: `dist/site/`.
- Work-order build command: `npm ci && npm run build:site`.
- Publish command used by the factory worker: `/opt/fleet/lib/deploy-static.sh otel-token-meter dist/site`.

## Known gaps / next steps

- v0.1 supports OTLP/HTTP, not OTLP/gRPC. Exporters must select HTTP.
- Price books remain local and user-supplied; with no observed cost or matching price, accounting stays complete while USD is `0`.
- Aggregate-only storage intentionally cannot reconstruct individual requests or time buckets.
- Do not publish the crate from this repository; registry credentials are factory-owned. The ready-to-publish verification command is `cargo package --allow-dirty`.
