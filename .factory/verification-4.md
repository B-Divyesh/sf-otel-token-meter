# Count tokens from OTLP traces — verification 4

- **Verdict:** PASS
- **Verified:** 6 September 2026
- **Live URL:** https://otel-token-meter.sociobot.in/
- **Implementation/deployment SHA:** `3bde59e0ae9225a7f7c2fc8602cbd170587494cc`
- **Documentation verification commit:** `942117a898acaf2b515b479a863afc34860f1362` (documentation only)

## Decision

PASS. This repair resolves the strict review's two findings: the CLI now emits
RFC 4180 CRLF CSV records, and every public CLI outcome has a matching tagged
claim test. The public surface contains 21 declared claims, all of which passed
both together and one at a time from a fresh clone.

## Claims and consumer evidence

The clean clone ran every documented quality command, then each exact command in
`.factory/claims.json`. All passed. The manifest now covers the original
accounting, transport, storage, privacy, health, loopback, report, price,
semantic mapping, web demo, offline, and MIT outcomes plus these repaired items:

| Claim | Outcome observed |
| --- | --- |
| `csv-export` | Project export has five CRLF-delimited records, the expected header, and four group rows. |
| `cli-demo-isolation` | Two default demos made different temporary directories, wrote sample/ledger/CSV files there, printed them, and left a working-directory sentinel untouched. |
| `file-protobuf-ingest` | A real one-span `.pb` OTLP request produced the `protobuf-project` row with 123 input, 45 output, and 100 ms. |
| `no-outbound-cli-requests` | The preload observer loaded, rejected all socket sends, and recorded no connection attempt during the real demo. |
| `single-binary-distribution` | A packaged crate installed exactly one `otel-token-meter` executable in a new Cargo root; `--version` returned `0.1.0`. |

The independent installed-artifact exercise also confirmed normal, invalid,
unsupported-encoding, recovery, and restart persistence paths. It found no
credential, account, or external network dependency.

## Live evidence

The static deployment succeeded for the existing `sf-otel-token-meter` app.
Its live footer build ID is `3bde59e0ae92`, matching the implementation source.
Fresh desktop and phone browser contexts verified the first-screen job, audience,
and **Try it with sample data** action before scrolling. The realistic demo
showed four populated rows and five requests, retained its persistent sample
label, reset to project grouping, and did not change a real-data sentinel.

Live browser checks passed these paths:

- Root, demo, privacy, and terms: HTTP 200 with route-specific title, one h1,
  main landmark, common navigation, and zero axe violations.
- Unknown route: intentional HTTP 404 with the designed product recovery page.
- Phone: 390/390 document width, keyboard-ready controls, and reduced-motion
  transitions removed.
- Privacy/offline: demo requests stayed same-origin, no cookie was created, and
  an offline reload retained the populated demo.
- URL verifier: no console/page error, valid title/lang/main/alt/button labels.
- Mobile Lighthouse: performance 100, accessibility 100, best practices 100,
  SEO 100; LCP 1,131 ms, CLS 0, TBT 51 ms, 52,494 B transfer.

## Earlier findings

All items in `verification.md`, `verification-2.md`, `verification-3.md`,
`review-1.md`, and `review-2.md` are resolved. The former verification-3
statement of zero untested claims was superseded by review 2; this repair adds
the missing coverage and corrects the CSV implementation, so it is now true.

## Evidence

- `/work/.evidence/otel-repair-3/claims/`
- `/work/.evidence/otel-repair-3/consumer-demo.json`
- `/work/.evidence/otel-repair-3/consumer-restart-report.json`
- `/work/.evidence/otel-repair-3/live-browser.json`
- `/work/.evidence/otel-repair-3/verify-url/verify.json`
- `/work/.evidence/otel-repair-3/lighthouse-live.json`
