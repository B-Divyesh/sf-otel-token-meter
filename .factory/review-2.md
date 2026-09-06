# Count tokens from OTLP traces — review 2

- **Verdict:** FAIL
- **Reviewed:** 6 September 2026
- **Findings:** 2
- **Untested public claims:** 5
- **Live URL:** https://otel-token-meter.sociobot.in/
- **Implementation candidate:** `4be2c857fce902657f07757fdd1802e892bd6963`
- **Deployed documentation build:** `fcaef872eb250d5ffda2fa95f81714a7a1a624de`
- **Documentation reviewed:** `1171856af03b13289b62532e1719ed683f912a3d`

## Decision

FAIL. All 17 declared claims pass, and the live site and installed CLI complete
the main token-accounting job. The strict public-copy audit found five CLI
claims without matching tagged claim tests. One of those claims is also false:
the CLI describes its export as RFC 4180-compatible, but the file contains LF
record separators instead of the required CRLF separators.

## First screen before scrolling

- Job: count tokens from OpenTelemetry traces.
- Audience: teams running coding agents that need local token, cost, cache,
  latency, and error totals.
- First action: **Try it with sample data**. It is visible without scrolling in
  fresh 1440×900 desktop and 390×844 phone contexts.
- The same screen states that the product is free and MIT licensed, stores
  aggregate totals only, and runs on the user's machine.

## Findings

### F-1 — High: four public CLI claims are missing from the claim manifest

The landing page, privacy page, demo page, and installed `--help` make four
observable claims that do not appear in `.factory/claims.json` and therefore
have no single matching `@claim:<id>` test:

1. The CLI demo defaults to a new isolated temporary directory, writes the
   sample, ledger, and CSV there, and prints the directory.
2. The file-based `ingest` command imports OTLP protobuf requests. The declared
   `otlp-http-formats` test covers the HTTP collector, not this CLI path.
3. The CLI makes no outbound request. The declared telemetry test runs with
   unreachable proxy variables, but it does not record or reject connection
   attempts as the privacy contract requires.
4. The installed artifact is a single Rust binary.

Manual review found the first, second, and fourth behaviors working: default
demo output used a unique `/tmp/otel-token-meter-demo-*` directory without
changing a working-directory sentinel; an empty valid protobuf message ingested
successfully; and the packaged consumer install produced one executable. That
does not replace the required tagged, repeatable claim commands. The absolute
no-outbound-request statement remains unverified by a network-observing test.

### F-2 — Low: the advertised RFC 4180 CSV format is not produced

`otel-token-meter export --help` says **“Export aggregated usage as RFC
4180-compatible CSV.”** The installed artifact's five-record export contains
five LF bytes and zero CR bytes. RFC 4180 defines CRLF as the record delimiter.
The `csv-export` claim only promises generic CSV and its tagged test does not
assert CRLF or the stronger help text.

Either emit CRLF and add an RFC-focused claim test, or change the help text to
the already tested generic CSV claim. This is also the fifth unlisted public
claim counted above.

## Declared claims

A clean GitHub clone at `1171856af03b13289b62532e1719ed683f912a3d` ran
`npm ci`. Every exact command in `.factory/claims.json` then ran separately.
Each ID occurs in exactly one tagged test.

| Claim | Result | Observed outcome |
| --- | --- | --- |
| `accounting-groups` | Pass | Project, model, and tool reports include token, cache, latency, error, and cost totals. |
| `otlp-http-formats` | Pass | HTTP JSON and protobuf accept identity and gzip encoding. |
| `aggregate-only-storage` | Pass | The ledger excludes prompt, response, trace, span, event, and status content. |
| `no-account-or-telemetry` | Pass | The credential-free demo completes with unreachable proxy variables. |
| `health-identity` | Pass | Health reports aggregate-only mode, version `0.1.0`, build ID, and `no-store`. |
| `default-loopback` | Pass | The collector starts on `127.0.0.1:4318`. |
| `report-outputs` | Pass | Table output is readable and repeated JSON output is stable and parseable. |
| `csv-export` | Pass | Generic CSV has the expected header and four project rows. |
| `exit-codes` | Pass | Success, data failure, and usage error exit `0`, `1`, and `2`. |
| `local-price-book` | Pass | Local prices produce cost and missing prices produce zero without vendor access. |
| `semantic-mapping` | Pass | Current, legacy, and missing dimensions map to the documented names and `unknown`. |
| `web-demo-matches-cli` | Pass | Website, CLI demo, and local dashboard totals agree. |
| `web-csv-export` | Pass | The browser downloads the four visible project rows as CSV. |
| `offline-reload` | Pass | A separate controlled context reloads the populated demo offline. |
| `demo-sandbox` | Pass | Web entry, label, reset, exit, and non-demo storage isolation work. |
| `site-privacy` | Pass | The full web demo flow stays same-origin and creates no cookie. |
| `free-mit` | Pass | The demo needs no license input and the distributed license is MIT. |

Declared result: **17 of 17 passed**. Public-copy result: **5 claims are not
declared**, so the final untested-claim count is 5.

## Clean checkout and installed artifact

The documented clean-clone gates passed:

```text
npm test
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
npm run build
npm run test:browser
npm run test:claims
cargo package --allow-dirty
```

- Rust: 8 unit and 3 CLI/HTTP integration tests passed.
- Browser: 4 keyboard, route, responsive, motion, and axe tests passed.
- Combined claims run: 17 passed.
- Build: `dist/bin/otel-token-meter` and `dist/site/` were produced.
- Package: 33 files, 159.4 KiB uncompressed and 45.0 KiB compressed.
- Static assets: 5,805 B JavaScript, 11,944 B CSS, and 110,032 B main image.

The packaged crate was installed into a separate Cargo root and only that
installed binary was used for the consumer checks. Its demo accepted five
spans. Model totals were 1,373,730 input tokens, 233,600 output tokens, 711,860
cache-read tokens, 4,134 ms, two errors, and $4.082066. Project CSV had four
rows. Installed exits were `0`, `1`, and `2` as documented.

The installed collector passed normal, invalid, boundary, and recovery paths:

- Health returned 200 with aggregate-only mode, version, and build.
- Valid five-span JSON returned 200.
- Malformed JSON returned 400 with a next action.
- Unsupported `Content-Encoding: br` returned 415.
- A gzip body expanding beyond 64 MiB returned 413.
- A following valid request returned 200.
- Restart preserved exactly ten accepted requests.
- Its 390 px dashboard showed four rows, no horizontal overflow, no axe
  violations, and no console error.

Tenant isolation and 429/`Retry-After` do not apply. This product is a local,
single-user CLI and static site, not a hosted multi-tenant backend.

## Live site, accessibility, privacy, and offline use

- Fresh desktop and phone contexts entered the demo in one click.
- The sample showed five requests, 1.61M tokens, 827 ms average latency, two
  errors, and four realistic project rows.
- **Demo — sample data, nothing is saved** stayed visible after scrolling.
- ArrowRight selected and focused Model. Focus used a 3 px orange outline.
- The empty state explained how to restore rows. Space on **Reset demo**
  restored Project and four rows with an announced status.
- Browser export downloaded `otel-token-meter-project.csv`.
- A non-demo sentinel survived entry, changes, reset, and exit. Exit removed
  every `demo:` key and no other key.
- Back and forward restored the demo and landing URLs. Enter opened the demo.
- Root, demo, privacy, and terms returned 200. The deliberate unknown URL
  returned 404 with the product title, h1, main landmark, styling, and links
  home and to the demo. Its expected 404 resource message is not a defect.
- Every route had `lang=en`, one h1, one main, header, navigation, footer,
  skip link, route title, canonical URL, social metadata, and touch icon.
- All visible controls measured at least 44×44 px on desktop and phone. All
  routes measured 390/390 CSS pixels at phone width.
- Playwright axe found zero violations in fresh light, dark, desktop, phone,
  and reduced-motion states. Reduced motion removed animations and transitions.
- The required URL verifier found no console/page errors, missing alt text, or
  unlabelled buttons on the live root.
- Runtime requests in the full demo flow stayed on the product origin. No
  cookies, remote fonts, remote scripts, or analytics were observed.
- CSP, HSTS, `nosniff`, strict referrer policy, and restricted device
  permissions are present.
- A fresh service-worker context reloaded the populated demo offline. The live
  worker uses a versioned cache, `skipWaiting`, old-cache cleanup, and
  `clients.claim`.
- Fresh mobile Lighthouse scores were 100 for performance, accessibility, best
  practices, and SEO. LCP was 1,145 ms, CLS 0, TBT 36 ms, and transfer 52,474 B.
- Internal routes, social images, and the public repository link returned 200.

The product's deterministic aggregation does not need a model-assisted step.
Import, export, and offline sample paths cover the useful adjacent work.

## Candidate and earlier finding disposition

All runtime files match a clean build stamped
`fcaef872eb250d5ffda2fa95f81714a7a1a624de` by SHA-256. The three commits from
implementation `4be2c857fce902657f07757fdd1802e892bd6963` through reviewed
documentation `1171856af03b13289b62532e1719ed683f912a3d` change only
`.factory/handoff.md` and `.factory/verification-3.md`. The deployed runtime is
therefore the reviewed implementation; later report-only commits do not require
a new product image.

| Earlier finding | Current disposition |
| --- | --- |
| High: CLI/web demo sandbox absent | Resolved. Both installed CLI and live web demo are populated and isolated. |
| High: claims manifest and tagged tests absent | Partly superseded. All 17 declared tests pass, but F-1 and F-2 identify five uncovered public CLI claims. |
| Medium: generic host 404 | Resolved. The deliberate 404 has product structure and recovery links. |
| Low: metadata and navigation incomplete | Resolved. All route metadata and common navigation are deployed. |
| High: 390 px horizontal overflow | Remains resolved on the site and installed dashboard. |
| Low: health lacked version/build identity | Remains resolved in the installed collector. |

## Evidence

- `/work/.evidence/otel-review2/live-review.json`
- `/work/.evidence/otel-review2/live-desktop-home-first-screen.png`
- `/work/.evidence/otel-review2/live-desktop-demo-populated.png`
- `/work/.evidence/otel-review2/live-phone-home-first-screen.png`
- `/work/.evidence/otel-review2/live-phone-demo-populated.png`
- `/work/.evidence/otel-review2/verify-url/verify.json`
- `/work/.evidence/otel-review2/lighthouse-live.json`
- `/work/.evidence/otel-review2/runtime-hashes.txt`
- `/work/.evidence/otel-review2/claims/`
- `/work/.evidence/otel-review2/consumer-demo.json`
- `/work/.evidence/otel-review2/installed-post-restart-report.json`
- `/work/.evidence/otel-review2/csv-byte-prefix.txt`
