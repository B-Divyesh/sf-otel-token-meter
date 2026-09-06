# OTel Token Meter review 2 handoff — FAIL

- **Work order:** `otel-token-meter-review-2`
- **Completed:** 6 September 2026
- **Live URL:** https://otel-token-meter.sociobot.in/
- **Implementation SHA:** `4be2c857fce902657f07757fdd1802e892bd6963`
- **Deployed documentation build:** `fcaef872eb250d5ffda2fa95f81714a7a1a624de`
- **Documentation reviewed:** `1171856af03b13289b62532e1719ed683f912a3d`

## Result

FAIL with 2 findings and 5 untested public claims. All 17 declared claim
commands pass, but the public CLI surface has five stronger claims that are not
listed in `.factory/claims.json`. The advertised RFC 4180 compatibility is also
false because exports use LF rather than CRLF record separators.

The full report is `.factory/review-2.md`. No product code, deployment,
infrastructure, or billing resource was changed.

## What was verified

- Every declared claim command passed separately from a clean GitHub clone.
- All documented quality gates passed, including package verification.
- The packaged crate was installed into a separate Cargo root and exercised
  through its installed executable.
- Collector health, valid input, malformed JSON, unsupported encoding, the
  64 MiB decompression boundary, recovery, and restart persistence worked.
- Fresh desktop and phone contexts completed the labelled, resettable,
  isolated web demo and CSV export.
- Root, demo, privacy, terms, and the deliberate product 404 passed route,
  link, keyboard, focus, touch-target, reduced-motion, axe, privacy, offline,
  and mobile-overflow checks.
- Mobile Lighthouse scored 100 in all four categories. LCP was 1,145 ms, CLS
  was 0, and TBT was 36 ms.
- Live runtime hashes match the deployed `fcaef872` build. Its product source
  is identical to implementation `4be2c857`; later commits are reports only.

## How to repeat

```sh
npm ci
npm test
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
npm run build
npm run test:browser
npm run test:claims
cargo package --allow-dirty
```

Run each exact command in `.factory/claims.json`. Install the packaged crate
into a separate Cargo root, exercise `demo`, `serve`, `report`, `export`, and
`ingest`, then inspect exported record separators.

## Required next steps

1. Add tagged claim entries and tests for the default temporary CLI demo,
   file-based protobuf ingest, no outbound CLI requests, and the single-binary
   distribution claim.
2. Either emit CRLF in CLI CSV exports and test the RFC 4180 contract, or remove
   the RFC-specific wording and keep the tested generic CSV claim.
3. Repeat every claim command and this review after the repair is deployed.
