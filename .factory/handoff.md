# OTel Token Meter repair handoff — PASS

**Work order:** `otel-token-meter-repair-2`  
**Completed:** 6 September 2026  
**Live URL:** https://otel-token-meter.sociobot.in/  
**Implementation SHA:** `4be2c857fce902657f07757fdd1802e892bd6963`  
**Documentation evidence SHA:** recorded by the follow-up documentation commit after this handoff was created  
**Final deployment ID:** `aa6761be-ec8c-40db-a44a-36321e28c3bc`

## Result

PASS. The CLI and static site now satisfy every current and earlier review finding. The deployed assets match the build from the implementation SHA.

## What changed

- Added `otel-token-meter demo`. It runs five bundled OTLP spans in a new temporary directory and writes an aggregate ledger plus CSV.
- Added `/demo/` with populated output, a persistent demo label, Reset demo, Start for real, isolated `demo:otel-token-meter:` storage, and offline reload.
- Added `.factory/demo.md` with the CLI and website sandbox contract.
- Added `.factory/claims.json` with 17 public claims. Each claim has one tagged, outcome-based Playwright test.
- Added a product-styled `404.html` and the Static Web Apps 404 response override.
- Added route-specific titles, descriptions, canonicals, Open Graph and Twitter metadata, a 1200×630 social image, and a 180 px Apple touch icon.
- Made the header and footer consistent on every route. All visible interactive targets measure at least 44×44 px.
- Rewrote the first screen and supporting copy in plain words. The copy audit is in `.factory/copy-audit.md`.
- Extended collector coverage for malformed input recovery, restart persistence, invalid gzip, and the 64 MiB decompressed boundary.
- Pinned Playwright 1.58.2 to the browser version supplied by the worker environment.

## Verification

### Clean setup and claims

A fresh clone of the final implementation ran `npm ci`, then every `test` command in `.factory/claims.json` separately. All 17 passed.

Evidence: `/work/.evidence/declared-claims-final-clean.log`.

The full local gates also passed:

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

- Rust: 8 unit tests and 3 CLI/HTTP integration tests passed.
- Browser: 4 route, responsive, keyboard, reduced-motion, dark/light contrast, touch-target, and axe tests passed.
- Claims: 17 of 17 passed.
- Package: 33 packaged files, 159.0 KiB uncompressed and 44.9 KiB compressed in the clean consumer run.
- Static budgets: 5,805 B JavaScript, 11,944 B CSS, and 110,032 B hero image.

### Installed consumer artifact

The packaged crate was installed into a separate consumer root. Only the installed binary was used afterward.

The installed `demo` command accepted five spans. Its model report contained 1,373,730 input tokens, 233,600 output tokens, and four groups. Its CSV export parsed successfully.

Evidence: `/work/.evidence/consumer-demo.json`, `/work/.evidence/consumer-report.json`, and `/work/.evidence/consumer-export.csv`.

### Collector paths

- OTLP/HTTP JSON and protobuf passed with identity and gzip encoding.
- A malformed request returned 400. An unsupported encoding returned 415. A following valid request succeeded.
- A gzip payload above the 64 MiB decompressed limit returned 413.
- Restarting the collector retained the two accepted requests in its aggregate file.
- `/health` returned aggregate-only mode, version `0.1.0`, and the build ID.
- Exit codes 0, 1, and 2 matched the documented success, data failure, and usage failure cases.

Tenant isolation and 429/`Retry-After` are not applicable. This product is a local, single-user CLI plus a static site, not a hosted backend.

### Final live checks

- Fresh desktop and 390×844 phone contexts opened the root and entered `/demo/` in one click.
- Root and demo measured exactly 390 px client and scroll widths on the phone.
- The first screen named the job, audience, and sample action before scrolling.
- The demo showed five requests across four project groups, kept its label visible, reset to the sample, and left a non-demo storage sentinel unchanged.
- Start for real removed every demo-prefixed key.
- A fresh offline context reloaded `/demo/` with its heading and four populated groups.
- Root, demo, privacy, terms, and the styled 404 had zero axe violations in the tested desktop, phone, dark, and reduced-motion states.
- Root and demo produced no console or page errors. The deliberate missing route returned HTTP 404 and the browser logged the expected failed-navigation resource notice.
- Every public link returned 200. In-page skip links resolved to their targets.
- Runtime requests stayed on the product origin. No cookies, analytics, remote fonts, or remote scripts were observed.
- Live HTML, JavaScript, CSS, service worker, and route documents matched the final local build by SHA-256.
- Live headers include HSTS, self-only CSP, nosniff, strict referrer policy, and restricted camera, microphone, and geolocation permissions.
- Final mobile Lighthouse: performance 100, accessibility 100, best practices 100, SEO 100; LCP 1,133 ms, CLS 0, TBT 22 ms.

Evidence: `/work/.evidence/final-live-browser.json`, `/work/.evidence/verify-live-final/`, `/work/.evidence/lighthouse-live-final.json`, and the final live screenshots in `/work/.evidence/`.

## Earlier finding disposition

| Finding | Disposition |
| --- | --- |
| High: CLI/web demo sandbox absent | Resolved by the bundled CLI demo, `/demo/`, isolated storage, label, reset, exit, and demo documentation. |
| High: claims manifest and tagged tests absent | Resolved with 17 declared claims; every command passed separately from a clean clone. |
| Medium: `/demo` and unknown routes showed Azure 404 | Resolved. `/demo` returns the sample; unknown routes return the product 404 with HTTP 404. |
| Low: metadata and navigation incomplete | Resolved across root, demo, privacy, terms, and 404. |
| Earlier high: 390 px horizontal overflow | Remains resolved on both the live website and local dashboard. |
| Earlier low: health lacked version/build identity | Remains resolved and covered by a declared claim. |

## Known gaps and next steps

- The crate is packaged but not published. Registry publication remains factory-owned.
- The collector supports OTLP/HTTP, not OTLP/gRPC. This is documented scope.
- The researched brief is free, so no billing offer or billing registration is required.
- No external integration or credential is needed for the shipped job.

No product defect remains from the supplied review history.
