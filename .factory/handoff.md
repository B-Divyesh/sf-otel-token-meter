# OTel Token Meter handoff — review 3 FAIL

- **Live URL:** https://otel-token-meter.sociobot.in/
- **Implementation/deployed product candidate:** `3bde59e0ae9225a7f7c2fc8602cbd170587494cc`
- **Documentation/report commit before this handoff:** `e290205ac6f56669704b6a749fb07d46c1af0f27`
- **Result:** FAIL — 1 low-severity finding and 0 untested public claims.

## What was checked

The local CLI accepts OTLP/HTTP JSON and protobuf on loopback, retains only aggregate token/cost/cache/latency/error totals, groups reports, and exports CRLF CSV. Its isolated bundled demo and the site's labelled `/demo/` sample both passed. Fresh desktop and phone live checks also passed for reset and demo isolation, keyboard operation, focus structure, reduced motion, offline reload, accessible routes and legal pages, privacy requests/cookies, headers, and the styled 404.

All 21 exact commands in `.factory/claims.json` were independently run from a clean checkout and passed. `npm test`, clippy, build, browser tests, and cargo package passed. The packaged artifact's dedicated clean-consumer claim passed.

## Blocking finding

`cargo fmt --all -- --check` fails under Rust 1.98.0 / rustfmt 1.9.0, despite the README documenting Rust 1.85 or newer and listing this command as a quality gate. It reports a required formatting change in `src/output.rs`. Format and commit the source with the supported toolchain, then repeat the clean-checkout quality list before declaring PASS.

## Run and verify

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

`npm run build` writes `dist/bin/otel-token-meter` and `dist/site/`.

## Known limits

- OTLP/gRPC is outside the documented OTLP/HTTP interface.
- This is a local, single-user collector, so hosted tenant isolation and 429/`Retry-After` checks do not apply.
- No product code, deployment configuration, billing, or infrastructure was changed during the review.

Detailed evidence and the finding are in `.factory/review-3.md`.
