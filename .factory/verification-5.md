# Count tokens from OpenTelemetry traces — verification 5

- **Verdict: PASS**
- **Finding count:** 0
- **Untested public claims:** 0
- **Reviewed:** 6 September 2026
- **Live URL:** https://otel-token-meter.sociobot.in/
- **Implementation candidate:** `2c813bae379dbfa746c24dcef3fa26d54b4746db`
- **Documentation/live build commit:** `6393df98aeec2bee8ee81c52f07b8e563632f8b1`

## Decision

**PASS.** The fresh live desktop and phone checks, clean-checkout quality gates, every individual public-claim command, and clean consumer CLI exercise passed. There are zero findings and zero untested public claims.

`2c813ba` is the last implementation change. The following `9053165` and `6393df9` commits change only `.factory/handoff.md`; `6393df9` is stamped in the live footer. Fresh output at `6393df9` byte-matched live HTML, JavaScript, CSS, public pages, service worker, robots file, and sitemap. The live JS and CSS also match the implementation candidate because no product source changed after it.

## First screen

- **Job:** count tokens from OpenTelemetry traces.
- **Audience:** teams running coding agents that need local token, cost, cache, latency, and error totals.
- **First action:** **Try it with sample data** is visible before scrolling on fresh 1440 × 900 desktop and 390 × 844 phone contexts.

The phone heading right edge is 376 px within a 390 px viewport. Root and demo document widths are both 390 px.

## Clean checkout and claims

A new clone at `6393df9` ran `npm ci`, the pinned Playwright Chromium, and all documented gates successfully:

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
- `npm run test:browser`: 4 tests passed.
- Combined claims: 21 passed.
- Every exact command in `.factory/claims.json` was then run separately: **21/21 passed**. Each claim ID has exactly one matching test tag.
- `npm run build` created `dist/bin/otel-token-meter` and `dist/site/`.
- Package verification passed: 34 files, 168.0 KiB unpacked, 47.2 KiB compressed.

The 21 passing claims cover aggregation, OTLP JSON/protobuf and gzip, aggregate-only storage, no account or outbound telemetry, health identity, loopback default, reports/CRLF CSV, CLI isolation, file protobuf ingest, one-binary packaging, exit codes, local pricing, semantic mapping, web/CLI parity, browser CSV, offline reload, demo isolation, site privacy, and the free MIT license.

## CLI and collector

The clean-built binary ran `demo --json` in a new temporary directory. It accepted five spans and showed four populated project groups with 1,373,730 input tokens, 233,600 output tokens, 711,860 cache-read tokens, 4,134 ms, two errors, and `$4.082066` local cost.

A loopback collector returned 200 for valid OTLP JSON, 400 for malformed JSON, 415 for unsupported `Content-Encoding: br`, and 200 for an immediate valid recovery request. Health returned aggregate-only mode, version `0.1.0`, and build `6393df98aeec`; after restart the persisted report retained 10 accepted requests. The dedicated packaged-install claim also passed from a clean Cargo root.

Tenant isolation and live 429/`Retry-After` do not apply to this documented local, single-user loopback CLI.

## Live product checks

The one-click sample showed five requests, 1.61M tokens, 827 ms average latency, two errors, and four realistic rows. **Demo — sample data, nothing is saved** persisted. Reset restored the sample; a non-demo local-storage sentinel remained unchanged; **Start for real** removed only `demo:otel-token-meter:` keys.

On phone, ArrowRight moved selected focus from Project to Model with a 3 px focus outline. Reduced motion showed `0s` transition and no animation. A fresh service-worker-controlled demo reloaded offline with its title, demo label, and four rows.

Root, demo, privacy, and terms returned 200 with route titles, `lang=en`, one `h1`, `main`, header, navigation, footer, and zero axe WCAG 2 A/AA violations. The deliberate unknown URL returned its expected HTTP 404 plus a complete product-styled recovery page; it is not a defect. The required URL verifier passed with no console errors, missing alt text, or unlabelled buttons.

Demo requests remained same-origin and cookies were empty. Headers include self-only CSP, HSTS, `nosniff`, strict referrer policy, and restricted device permissions. All actionable internal and repository links returned 200. Fresh mobile Lighthouse JSON scored 100 for performance, accessibility, best practices, and SEO (LCP 1,141 ms; CLS 0; TBT 0 ms; 52,464 B transfer).

## Earlier findings disposition

| Earlier finding | Disposition |
| --- | --- |
| Missing isolated CLI/web demo | Resolved: clean CLI temp output and labelled/resettable live demo passed. |
| Missing claim manifest/tests | Resolved: 21 entries, one tag each, all individual commands passed. |
| Generic 404 and incomplete metadata/navigation | Resolved: styled expected 404 and complete route skeleton passed. |
| 390 px overflow and heading clipping | Resolved: root/demo are 390/390 and heading ends at 376 px. |
| Health identity, CLI coverage, and CRLF CSV gaps | Resolved: their dedicated claim commands passed. |
| Rust formatting gate | Resolved: `cargo fmt --all -- --check` passed in the clean clone. |

## Evidence

- `/work/.evidence/otel-token-meter-verify-5/verify-url/verify.json`
- `/work/.evidence/otel-token-meter-verify-5/live-desktop-home.png`
- `/work/.evidence/otel-token-meter-verify-5/live-phone-demo.png`
- `/work/.evidence/otel-token-meter-verify-5/lighthouse.json`
