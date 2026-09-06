# Count tokens from OpenTelemetry traces — review 4

- **Verdict: PASS**
- **Finding count:** 0
- **Untested public claims:** 0
- **Reviewed:** 6 September 2026
- **Live URL:** https://otel-token-meter.sociobot.in/
- **Implementation candidate:** `2c813bae379dbfa746c24dcef3fa26d54b4746db`
- **Repository documentation baseline:** `599c826ecc64a3e1f63d4f435b9c937c48d7d377`
- **Live documentation/build commit:** `6393df98aeec2bee8ee81c52f07b8e563632f8b1`

## Decision

**PASS.** The installed CLI and live site complete the stated local token accounting job. There are zero findings at every severity and zero untested public claims.

`2c813ba` is the last implementation change. `git diff --name-status 2c813ba..599c826` contains only `.factory/handoff.md` and `.factory/verification-5.md`. The live footer identifies `6393df9`; a fresh build at that commit byte-matched the live root, demo, privacy, terms, styled 404, service worker, JavaScript, CSS, images, robots, and sitemap. The product assets also match the implementation candidate because product source did not change after it.

## First screen before scrolling

- **Job:** count tokens from OpenTelemetry traces.
- **Audience:** teams running coding agents that need local token, cost, cache, latency, and error totals.
- **First action:** **Try it with sample data** is visible at scroll position zero on fresh 1440 × 900 desktop and 390 × 844 phone contexts.

The desktop first screen has the heading, audience sentence, and sample action; the action starts at 698 px in a 900 px viewport. The phone heading ends at 376 px in the 390 px viewport.

## Clean checkout and public claims

A new clone at `599c826` ran `npm ci` and the pinned Playwright Chromium. Every documented gate passed:

```text
npm test
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
npm run build
npm run test:browser
npm run test:claims
cargo package --allow-dirty
```

- `npm test`: 8 Rust unit and 3 integration tests passed.
- `npm run build`: produced `dist/bin/otel-token-meter` and `dist/site/`.
- `npm run test:browser`: 4 tests passed.
- `npm run test:claims`: 21 tests passed.
- `cargo package --allow-dirty`: verified 34 files, 168.0 KiB unpacked and 47.2 KiB compressed.

All 21 exact commands in `.factory/claims.json` passed separately: `accounting-groups`, `otlp-http-formats`, `aggregate-only-storage`, `no-account-or-telemetry`, `no-outbound-cli-requests`, `health-identity`, `default-loopback`, `report-outputs`, `csv-export`, `cli-demo-isolation`, `file-protobuf-ingest`, `single-binary-distribution`, `exit-codes`, `local-price-book`, `semantic-mapping`, `web-demo-matches-cli`, `web-csv-export`, `offline-reload`, `demo-sandbox`, `site-privacy`, and `free-mit`. Each ID has one matching claim tag. The landing pages, legal pages, README, and CLI help were checked against the manifest; no unlisted public claim was found.

## Installed CLI and collector

The packaged crate installed into a new consumer root with exactly one `otel-token-meter` executable. `--version` reported `0.1.0`; its clean `demo --json` accepted five spans, emitted a separate sample/ledger/CSV directory, and reported four populated project rows. Totals were 1,373,730 input tokens, 233,600 output tokens, 711,860 cache-read tokens, 4,134 ms, two errors, and `$4.082066` local cost.

The passing claimed tests exercise normal OTLP JSON/protobuf and gzip paths, malformed JSON, unsupported `br` encoding, valid recovery after an error, gzip expansion boundary handling, health identity, restart persistence, aggregate-only ledger storage, local-only pricing, exit codes, and CRLF CSV. Tenant isolation and 429/`Retry-After` do not apply: this is a documented single-user loopback CLI, not a hosted multi-tenant backend.

## Live desktop and phone checks

Fresh contexts entered `/demo/` in one click. The realistic sample showed five requests, 1.61M tokens, 827 ms average latency, two errors, and four project rows: `checkout-agent`, `docs-indexer`, `release-bot`, and `unknown`.

- **Demo — sample data, nothing is saved** remained visible after scrolling.
- A non-demo local-storage sentinel stayed unchanged through entry, empty state, reset, and **Start for real**. Reset restored Project grouping; exit removed only `demo:otel-token-meter:` data.
- Phone root and demo widths were 390 px client / 390 px scroll. ArrowRight moved focused selection from Project to Model. Reduced motion had `0s` animation and transition duration.
- A fresh service-worker-controlled demo reloaded offline with its demo title, label, and populated table.
- Full-demo network requests stayed on the product origin; cookies were empty.

Root, demo, privacy, and terms returned 200 with their own titles, `lang=en`, one `<h1>`, main landmark, header, navigation, footer, and skip link. The unknown route returned the required HTTP 404 and a complete product-styled recovery page; its 404 status is deliberate and not a defect. All actionable links returned 200, except the 404 page's own skip-link URL which deliberately retains that page's 404 status.

`/opt/fleet/lib/verify-url.sh` passed on the live root with no console errors, missing image alt text, or unlabelled buttons. The standalone `@axe-core/cli` could not launch because this environment has no system Chrome binary. Equivalent pinned Playwright axe checks ran on live root, demo, privacy, terms, and 404 and found zero WCAG 2 A/AA violations. Live response headers include a self-only CSP, HSTS, `nosniff`, strict referrer policy, and restricted device permissions.

Fresh mobile Lighthouse JSON was written despite its known post-report browser tab crash message: performance 100, accessibility 100, best practices 100, SEO 100; LCP 1,129 ms, CLS 0, TBT 0 ms, and 52,494 B transfer.

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| Missing isolated CLI/web demo | Resolved: installed CLI demo creates its own output; live sample is labelled, resettable, and separate from real browser data. |
| Missing claim manifest/tests | Resolved: 21 manifest entries and 21 individually passing tagged commands. |
| Generic 404 and incomplete route structure | Resolved: product-styled expected 404 and complete route metadata/skeleton. |
| 390 px overflow | Resolved: fresh root and demo measurements are 390/390. |
| Health identity, installed-binary, protobuf, and no-outbound coverage gaps | Resolved by their dedicated passing claim commands. |
| RFC 4180 LF-only CSV | Resolved: the dedicated claim asserts CRLF records. |
| Rust formatting gate failure | Resolved: `cargo fmt --all -- --check` passes in the clean checkout. |

## Evidence

- `/work/.evidence/otel-token-meter-review-4/claims-individual.tsv`
- `/work/.evidence/otel-token-meter-review-4/live-browser.json`
- `/work/.evidence/otel-token-meter-review-4/live-axe.json`
- `/work/.evidence/otel-token-meter-review-4/live-privacy.json`
- `/work/.evidence/otel-token-meter-review-4/verify-url-rerun/verify.json`
- `/work/.evidence/otel-token-meter-review-4/lighthouse-mobile.json`
