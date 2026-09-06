# OTel Token Meter repair 3 handoff — PASS

- **Work order:** `otel-token-meter-repair-3`
- **Completed:** 6 September 2026
- **Live URL:** https://otel-token-meter.sociobot.in/
- **Implementation and deployed static build:** `3bde59e0ae9225a7f7c2fc8602cbd170587494cc`
- **Later commits:** this handoff and `verification-4.md` are documentation only; they do not alter the deployed product implementation.

## Result

PASS. The local CLI accepts OTLP data, keeps aggregate-only ledgers, groups and
exports token accounting, and the static site offers a separate one-click sample.
The two strict-review findings are fixed. There are now 21 declared, individually
exercised public claims and no uncovered CLI promise found in the public-copy audit.

## What changed

- CLI CSV output now uses CRLF record separators, so its advertised RFC 4180
  compatibility is true. The regression test checks raw bytes rather than source
  strings.
- Added outcome tests and manifest entries for the default isolated CLI demo,
  file-based OTLP protobuf ingest, no outbound CLI requests, and single-binary
  package installation.
- The no-outbound test runs the real demo under a local preload observer. It
  records and rejects `connect`, `sendto`, and `sendmsg`; the observer loaded and
  recorded no attempted socket operation.
- README now names the RFC 4180 CSV contract and the documented C-compiler
  prerequisite for that Linux network-observer test.

## Verification

From a fresh clone of `3bde59e`, after `npm ci` and the pinned Chromium install:

```sh
npm test
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
npm run build
npm run test:browser
npm run test:claims
cargo package --allow-dirty
```

All commands passed. The suite ran 8 Rust unit tests, 3 CLI/HTTP integration
tests, 4 browser tests, and all 21 claims together. Then each of the 21 exact
commands in `.factory/claims.json` passed separately from that clean clone.
The package contains 34 files (167.8 KiB uncompressed, 47.2 KiB compressed).

An installed executable from the packaged crate completed the real consumer
paths in a new Cargo root: demo accepted five spans and made a CRLF CSV;
health returned aggregate-only mode, version, and build; valid input returned
200; malformed JSON returned 400; unsupported `br` returned 415; a following
valid request returned 200; and a restarted collector retained 10 accepted
spans. The existing unit gate also covers the 64 MiB decompression boundary.

The deployed build was uploaded through the durable `sf-otel-token-meter`
static-host configuration. Its live footer build ID is `3bde59e0ae92`.
Fresh desktop (1440 × 900) and phone (390 × 844) contexts found the first action
before scrolling, entered the sample in one click, showed four populated project
rows, kept **Demo — sample data, nothing is saved** visible after scrolling,
reset the sample, and preserved a non-demo browser-data sentinel. Phone width
was 390/390 with no overflow. Fresh offline reload of `/demo/` retained the title,
banner, and four rows. Root, demo, privacy, and terms returned 200; the designed
unknown route returned the expected 404.

Live axe WCAG 2 A/AA reported zero violations on root, demo, privacy, terms,
and 404. `/opt/fleet/lib/verify-url.sh` passed with no console or page errors.
Reduced motion reports a `0s` button transition. The live mobile Lighthouse run
scored 100 performance, 100 accessibility, 100 best practices, and 100 SEO;
LCP was 1,131 ms, CLS 0, TBT 51 ms, and transfer 52,494 B.

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| High: CLI and web demo sandbox absent | Resolved and retained. The web and installed CLI samples are isolated, populated, labelled, resettable, and disposable. |
| High: required claim manifest absent | Resolved. The manifest has 21 exact, separately passing outcome checks. |
| Medium: generic host 404 | Resolved. The product 404 has title, h1, main landmark, styling, and recovery links. |
| Low: route metadata/navigation incomplete | Resolved. Every public route has its own title, metadata, touch icon, and common navigation. |
| High: 390 px overflow | Resolved. Fresh live phone width measured 390/390. |
| Low: health lacks version/build | Resolved. The installed collector health response identifies both. |
| High: undeclared CLI demo/protobuf/no-outbound/single-binary claims | Resolved by four new declared, outcome-based checks. |
| Low: RFC 4180 claim used LF records | Resolved. CLI records use CRLF and raw-byte regression coverage proves it. |

## Evidence

- `/work/.evidence/otel-repair-3/claims/` — 21 separately passing manifest commands.
- `/work/.evidence/otel-repair-3/consumer-demo.json` and `consumer-restart-report.json` — packaged consumer exercise.
- `/work/.evidence/otel-repair-3/live-browser.json` and screenshots — fresh live desktop and phone checks.
- `/work/.evidence/otel-repair-3/verify-url/verify.json` — required URL verifier.
- `/work/.evidence/otel-repair-3/lighthouse-live.json` — live mobile Lighthouse.

## Known limits and next steps

- Registry publication remains factory-owned; `cargo package` is ready, but no
  registry publish was attempted.
- OTLP/gRPC is not supported; the documented product scope is OTLP/HTTP JSON or
  protobuf.
- This is a local single-user collector and static site. It has no tenants,
  hosted persistence, or live rate-limit path, so tenant-isolation and 429 checks
  do not apply.
