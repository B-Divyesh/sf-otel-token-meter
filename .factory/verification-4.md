# Count tokens from OTLP traces — verification 4

- **Verdict:** PASS
- **Findings:** 0
- **Untested public claims:** 0
- **Verified:** 6 September 2026
- **Live URL:** https://otel-token-meter.sociobot.in/
- **Implementation candidate:** `3bde59e0ae9225a7f7c2fc8602cbd170587494cc`
- **Documentation commit:** `d5ec335fb31415c6e55f82a1a3d7d3eaaf622f85`
- **Earlier repair-verification documentation:** `942117a898acaf2b515b479a863afc34860f1362`

## Decision

**PASS.** The local CLI performs the intended job: it accepts OTLP/HTTP data,
keeps aggregate-only totals, groups usage, and exports it. The live site gives
visitors an isolated one-click sample. There are zero findings at every
severity and zero untested public claims.

The implementation reviewed is `3bde59e`. `942117a` and `d5ec335` change only
verification/handoff documents. The deployed JavaScript hash exactly matches a
clean build of `3bde59e`. The live HTML footer is stamped `d5ec335fb314`, which
is the later documentation-only build identifier and does not indicate a
product-code difference.

## First screen before scrolling

Fresh 1440 × 900 desktop and 390 × 844 phone browser contexts opened the live
root at scroll position zero.

- **Job:** Count tokens from OpenTelemetry traces.
- **Audience:** Teams running coding agents that need local token, cost, cache,
  latency, and error totals.
- **First action:** **Try it with sample data**. It is visible and opens
  `/demo/` in one click.

The first screen also states that the product is free and MIT licensed, stores
aggregate totals only, and runs on the user's machine.

## Clean checkout, claims, and installed artifact

A separate clean checkout at `3bde59e` ran `npm ci`, the pinned Playwright
Chromium installation, and every documented quality command successfully:

```sh
npm test
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
npm run build
npm run test:browser
npm run test:claims
cargo package --allow-dirty
```

Results: 8 Rust unit tests, 3 CLI/HTTP integration tests, 4 browser tests, and
21 combined claim tests passed. `npm run build` produced `dist/bin/` and
`dist/site/`. `cargo package` verified 34 files (167.8 KiB uncompressed,
47.2 KiB compressed). The static build measured 5,805 B JavaScript, 11,944 B
CSS, and a 110,032 B main image.

Each exact command in `.factory/claims.json` was then run separately from that
same clean setup. All 21 passed:

| Claim | Result |
| --- | --- |
| accounting-groups | Pass |
| otlp-http-formats | Pass |
| aggregate-only-storage | Pass |
| no-account-or-telemetry | Pass |
| no-outbound-cli-requests | Pass |
| health-identity | Pass |
| default-loopback | Pass |
| report-outputs | Pass |
| csv-export | Pass |
| cli-demo-isolation | Pass |
| file-protobuf-ingest | Pass |
| single-binary-distribution | Pass |
| exit-codes | Pass |
| local-price-book | Pass |
| semantic-mapping | Pass |
| web-demo-matches-cli | Pass |
| web-csv-export | Pass |
| offline-reload | Pass |
| demo-sandbox | Pass |
| site-privacy | Pass |
| free-mit | Pass |

The packaged crate was installed into a new Cargo root and exercised only
through its installed `otel-token-meter` executable. It installed exactly one
executable, reported version `0.1.0`, and completed `demo --json` with five
spans and four populated project rows. Its generated CSV had five CRLF records
(five `\r\n`, five `\n`, and five `\r`). Missing input exited 1 and an unknown
command exited 2.

The installed loopback collector returned health with aggregate-only mode,
version, and build; then returned 200 for valid OTLP JSON, 400 for malformed
JSON, 415 for `Content-Encoding: br`, and 200 for the immediate valid recovery
request. Its two accepted requests remained after a stop/restart. The clean
unit gate also passed the 64 MiB decompressed-gzip boundary test. Tenant
isolation and 429/`Retry-After` are not applicable: this is a local,
single-user CLI collector, not a hosted multi-tenant backend.

## Live site, demo, accessibility, privacy, and offline use

Fresh desktop and phone contexts entered the demo with one click. The demo
showed five realistic coding-agent requests, 1.61M tokens, 827 ms average
latency, two errors, and four populated project rows. The persistent banner
read **Demo — sample data, nothing is saved**. Reset restored the project view;
the non-demo local-storage sentinel remained unchanged; and **Start for real**
removed demo-prefixed keys while preserving the sentinel.

- Phone root and demo width: exactly 390 px client width and 390 px scroll
  width; no horizontal overflow.
- ArrowRight moved the focused grouping from Model to Tool. Browser CSV export
  downloaded four populated tool rows.
- Reduced motion set transitions to `0s` and animation to `none`.
- A fresh service-worker-controlled demo context reloaded offline with the
  title, persistent label, and four rows intact.
- Root, demo, privacy, and terms returned 200 with route-specific titles,
  `lang=en`, one h1, a main landmark, shared navigation, skip link, and footer.
  The deliberate unknown route returned a styled product 404 with a recovery
  path; that HTTP 404 is expected, not a defect.
- Axe WCAG 2 A/AA reported zero violations on root, demo, privacy, terms, and
  the styled 404. The required `verify-url.sh` check reported no console/page
  error, missing alt text, missing title/lang/main, or unlabelled button.
- Full-demo browser requests stayed on `https://otel-token-meter.sociobot.in`;
  browser cookies were empty. Live headers provide HTTPS/HSTS, a self-only CSP,
  `nosniff`, strict referrer policy, and restricted device permissions.
- Every internal destination and the public repository link returned 200.
- Fresh mobile Lighthouse: performance **100**, accessibility **100**, best
  practices **100**, SEO **100**; LCP **1,163 ms**, CLS **0**, TBT **55 ms**,
  transfer **52,448 B**.

## Earlier finding disposition

| Earlier finding | Current disposition | Current evidence |
| --- | --- | --- |
| High: no isolated CLI/web demo sandbox | Resolved | Installed `demo` creates its own temporary output; live `/demo/` is labelled, resettable, and clears only `demo:` browser keys. |
| High: no claims manifest or tagged claim tests | Resolved | Manifest has 21 entries; all exact commands passed separately. |
| Medium: generic host 404 | Resolved | Unknown live URL returns product title, h1, main, navigation, styling, recovery, and expected 404 status. |
| Low: incomplete metadata/navigation | Resolved | Each public route has its own title and common skeleton; live route checks passed. |
| High: 390 px overflow | Resolved | Fresh root and demo phone contexts measured 390/390. |
| Low: health omitted version/build | Resolved | Installed `/health` returned aggregate-only status, `0.1.0`, and `3bde59e0ae92`. |
| High: CLI demo/protobuf/no-outbound/single-binary promises untested | Resolved | Four dedicated tagged outcome tests passed independently. |
| Low: claimed RFC 4180 CSV used LF records | Resolved | Installed artifact produced CRLF records; the dedicated claim test passed. |

## Evidence

- `/work/.evidence/qa-npm-test.log`
- `/work/.evidence/qa-quality-gates.log`
- `/work/.evidence/qa-browser.log`
- `/work/.evidence/qa-claims-combined.log`
- `/work/.evidence/qa-claims-individual.tsv` and
  `/work/.evidence/qa-claims-individual/`
- `/work/.evidence/qa-consumer-demo.json` and
  `/work/.evidence/qa-restart-http-report.json`
- `/work/.evidence/qa-live-browser.json`,
  `/work/.evidence/qa-live-interaction.json`, and live screenshots
- `/work/.evidence/qa-verify-url/verify.json`
- `/work/.evidence/qa-lighthouse-live.json`
