# Count tokens from OTLP traces — verification 3

- **Verdict:** PASS
- **Findings:** 0
- **Untested public claims:** 0
- **Verified:** 6 September 2026
- **Live URL:** https://otel-token-meter.sociobot.in/
- **Implementation candidate:** `4be2c857fce902657f07757fdd1802e892bd6963`
- **Documentation candidate:** `fcaef872eb250d5ffda2fa95f81714a7a1a624de`

## Decision

PASS. The installed CLI completes the local OTLP token-accounting job, and the
deployed site provides a separate one-click sample. No defect of any severity
and no untested public claim remains.

The two commits after the implementation candidate change only
`.factory/handoff.md`. A diff from the implementation candidate to the
documentation candidate contains no product file change. Fresh hashes also
match the deployed documents and assets to the build from this source.

## First screen before scrolling

- Job: count tokens from OpenTelemetry traces.
- Audience: teams running coding agents that need local token, cost, cache,
  latency, and error totals.
- First action: **Try it with sample data**. It is visible before scrolling on
  both the 1440×900 desktop and 390×844 phone.
- The same first screen states that the product is free and MIT licensed,
  stores aggregate totals only, and runs on the user's machine.

## Declared claims

A fresh clone at `fcaef872eb250d5ffda2fa95f81714a7a1a624de` ran `npm ci`.
Every exact `test` command in `.factory/claims.json` then ran separately.

| Claim | Result | Observed outcome |
| --- | --- | --- |
| `accounting-groups` | Pass | Project, model, and tool reports contain all token, cache, latency, error, and cost totals. |
| `otlp-http-formats` | Pass | JSON and protobuf accept identity and gzip encoding. |
| `aggregate-only-storage` | Pass | The ledger contains aggregates and excludes prompt, response, trace, span, event, and status content. |
| `no-account-or-telemetry` | Pass | The credential-free demo completes with unreachable proxies and no error output. |
| `health-identity` | Pass | Health reports aggregate-only mode, version `0.1.0`, and a build ID with `no-store`. |
| `default-loopback` | Pass | The default collector is reachable at `127.0.0.1:4318`. |
| `report-outputs` | Pass | The table is readable and repeated JSON output is stable and parseable. |
| `csv-export` | Pass | CSV has the documented header and one row per project group. |
| `exit-codes` | Pass | Success, missing input, and usage error exit `0`, `1`, and `2`. |
| `local-price-book` | Pass | A supplied local price produces cost; no price produces zero without a vendor request. |
| `semantic-mapping` | Pass | Current, legacy, and missing dimensions map to the documented names and `unknown`. |
| `web-demo-matches-cli` | Pass | Website, CLI demo, and local dashboard totals agree. |
| `web-csv-export` | Pass | The browser downloads the four visible project rows as valid CSV. |
| `offline-reload` | Pass | A separate offline context reloads the populated demo under service-worker control. |
| `demo-sandbox` | Pass | One-click entry, label, reset, exit, and non-demo sentinel isolation all work. |
| `site-privacy` | Pass | The full demo flow stays on the product origin and creates no cookie. |
| `free-mit` | Pass | The demo needs no license input, and the distributed license is MIT. |

Result: **17 of 17 passed; 0 untested**. A cross-check of the live landing,
demo, privacy, and terms pages plus the README found no public outcome outside
these declared claims.

## Clean checkout and package

The following documented gates passed from the fresh clone:

```sh
npm test
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
npm run build
npm run test:browser
npm run test:claims
cargo package --allow-dirty
```

- Rust: 8 unit and 3 CLI/HTTP integration tests passed.
- Browser: 4 responsive, keyboard, motion, route, touch-target, and axe tests passed.
- Claims: the combined run also passed all 17 tests.
- Build: `dist/bin/otel-token-meter` and `dist/site/` were produced.
- Package: 33 files, 159.4 KiB uncompressed and 45.0 KiB compressed.
- Static budgets: 5,805 B JavaScript, 11,944 B CSS, and 110,032 B main hero image.

## Installed CLI and collector

The packaged crate was installed into a separate consumer root. Only that
installed binary was used for the following checks.

- `--help` lists `demo`, `serve`, `report`, `export`, and `ingest` with useful descriptions.
- `--version` reports `otel-token-meter 0.1.0`.
- `demo --json` accepted five spans and wrote its sample, aggregate ledger,
  local price book, and project CSV to the requested isolated directory.
- The model report contained four groups, 1,373,730 input tokens, 233,600
  output tokens, 711,860 cache-read tokens, 4,134 ms, two errors, and
  $4.082066 local cost.
- The exported project CSV parsed with four data rows.
- Installed-artifact exits were `0` for demo, `1` for missing ingest input,
  and `2` for an unknown command.

An installed collector then passed normal, invalid, and recovery requests:

- `/health` returned 200 with aggregate-only mode, version, and build.
- A five-span JSON request returned 200.
- Malformed JSON returned 400 with a next action.
- Unsupported `Content-Encoding: br` returned 415.
- A valid request immediately after both errors returned 200.
- The report contained exactly ten requests after the two valid five-span posts.
- After stopping and restarting the installed collector, the same ten requests remained.
- The 64 MiB decompressed gzip boundary returned 413 in the clean unit gate.

Tenant isolation and 429/`Retry-After` are not applicable. This is a local,
single-user CLI and static documentation site, not a hosted multi-tenant backend.

## Live desktop, phone, and demo

Fresh desktop and Android-sized Chromium contexts opened the live root and
entered `/demo/` in one click.

- Desktop width was 1440/1440 client/scroll pixels. Phone width was 390/390.
- The demo showed five requests, 1.61M tokens, 827 ms average latency, two
  errors, and four realistic project groups.
- The **Demo — sample data, nothing is saved** label remained visible after
  scrolling to the end.
- Keyboard ArrowRight moved focus and selection from Project to Model. The
  focused tab had a 3 px orange outline.
- The empty state named how to restore the sample. **Reset demo** restored
  Project and all four rows, with an announced status message.
- Browser CSV export downloaded `otel-token-meter-project.csv`.
- A non-demo storage sentinel remained unchanged through entry, changes,
  reset, and exit. **Start for real** removed every `demo:` key and no other key.
- Browser back and forward restored the root and demo URLs. Enter activated
  the sample link; Space activated reset; the skip link targets `#main`.
- At the 390 CSS-pixel reflow used by a 780 px layout at 200% zoom, text and
  controls remained present with no document overflow.

## Accessibility, privacy, routes, and offline use

- Playwright axe reported zero violations on root, demo, privacy, terms, and
  the product 404 in fresh light, dark, desktop, phone, and reduced-motion states.
- Every route has `lang=en`, one h1, one main landmark, navigation, footer,
  skip link, and its own title. Every visible link and button measured at least
  44×44 px on desktop and phone.
- Reduced motion removed all animations and transitions. No page flashes.
- The required URL verifier found no console or page error, missing image alt,
  or unlabelled button on the live root.
- Root, demo, privacy, and terms return 200. The unknown route deliberately
  returns HTTP 404 with the product title, h1, main landmark, styling, and ways
  back. Chromium's expected failed-resource notice for that 404 is not a defect.
- All internal destinations and the public repository link return 200.
- Runtime requests during the full demo flow stayed on
  `https://otel-token-meter.sociobot.in`. No cookies, analytics, remote fonts,
  or remote scripts were observed.
- The live CSP is self-only and is accompanied by HSTS, `nosniff`, strict
  referrer policy, and restricted camera, microphone, and geolocation permissions.
- A fresh service-worker context reloaded `/demo/` offline with its title,
  label, and four rows. The deployed worker matches the candidate build and
  uses a versioned cache, `skipWaiting`, old-cache removal, and `clients.claim`.
- Fresh mobile Lighthouse scores are performance 100, accessibility 100,
  best practices 100, and SEO 100. LCP was 1,134 ms, CLS 0, TBT 30 ms, and
  total transfer 52,510 B.

The deterministic aggregation job does not need a model-assisted step. Import,
export, and offline sample paths already cover the useful adjacent actions in
the brief.

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| High: CLI/web demo sandbox absent | Resolved. Installed CLI demo and live `/demo/` are isolated, populated, labelled, resettable, and disposable. |
| High: claims manifest and tagged tests absent | Resolved. All 17 declared commands passed separately from a clean clone. |
| Medium: `/demo` and unknown routes showed a generic host 404 | Resolved. `/demo/` is the sandbox; unknown routes return the styled product 404 with status 404. |
| Low: metadata and navigation incomplete | Resolved. Titles, canonical and social metadata, touch icon, and common navigation are deployed. |
| High: 390 px horizontal overflow | Remains resolved at exactly 390/390 on root, demo, legal pages, and 404. |
| Low: health lacked version/build identity | Remains resolved in the installed collector health response. |

## Findings and expected gaps

No finding of any severity was found.

- Registry publication remains factory-owned and was not attempted.
- OTLP/gRPC is outside the documented OTLP/HTTP scope.
- There is no hosted backend, tenant model, payment, or live rate-limit path to test.

## Evidence

- `/work/.evidence/otel-verify3/live-desktop-home.png`
- `/work/.evidence/otel-verify3/live-desktop-demo.png`
- `/work/.evidence/otel-verify3/live-phone-home.png`
- `/work/.evidence/otel-verify3/live-phone-demo.png`
- `/work/.evidence/otel-verify3/verify-url/verify.json`
- `/work/.evidence/otel-verify3/lighthouse-live.json`
