# Independent verification — PASS

**Candidate commit:** `c1d40e1fbb26335a422b026f4c9f50bd30c3f677`  
**Verified:** 2026-08-27  
**Live URL:** https://otel-token-meter.sociobot.in/

## Decision

**PASS.** This clean checkout builds, tests, packages, and performs the
privacy-first OTLP accounting job described in the researched brief. Fresh
runtime asset hashes prove that the live static deployment is the product build
from this candidate (the candidate's final change is verification documentation).
The earlier 390 px overflow defect is fixed on both the hosted demo and local
collector dashboard.

## Clean-checkout quality gates

Starting from a clean worktree at the candidate:

```sh
npm ci
npm test
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
npm run build
npx playwright install chromium
npm run test:browser
cargo package --allow-dirty
```

All commands passed. `npm test` ran 7 Rust unit tests and 2 CLI/HTTP integration
tests, built the static site, and passed its structural and budget checks.
`npm run build` emitted `dist/bin/otel-token-meter` and `dist/site/`.
`cargo package --allow-dirty` verified the publishable `0.1.0` crate (28 files,
126.0 KiB / 36.9 KiB compressed). The configured Playwright browser cache was
initially missing Chromium; installing the project's pinned Playwright Chromium
was an environment prerequisite, after which all 3 browser tests passed.

Built static assets meet the product budgets: JavaScript **4,138 B**, CSS
**9,147 B**, primary hero **110,032 B**, and mobile hero **41,920 B**.

## CLI, collector, and privacy evidence

A packaged crate was installed into a separate consumer root and exercised only
through its installed public binary. `--help` and `--version` worked; the binary
reported `otel-token-meter 0.1.0`. Ingesting `examples/sample-traces.json` into
a fresh ledger accepted exactly one span. JSON reporting grouped it under
`checkout` with 100 input, 25 output, 40 cache-read tokens, 100 ms latency, and
`$0.000410`; CSV export was valid. Unknown commands exit **2** and a missing
ingest input exits **1**, matching the README's interface contract.

The persistent ledger had zero matches for `prompt`, `completion`, `traceId`,
`spanId`, or `events`. This verifies aggregate-only persistence for the
representative OTLP payload.

Against a release collector bound to loopback, 20 concurrent OTLP/JSON posts
all returned HTTP 200. An invalid JSON post returned **400**, unsupported
`Content-Encoding: br` returned **415**, a gzip OTLP/JSON post returned **200**,
and a following valid recovery post returned **200**. The report then contained
exactly 22 requests / 2,750 input-plus-output tokens. `GET /health` returned
`{"status":"ok","privacy":"aggregate-only","version":"0.1.0","build":"c1d40e1fbb26"}`,
providing build identity for a running local collector.

The populated local dashboard was also exercised at 390 px: it measured exactly
390 px client and scroll width, keyboard selection changed grouping to `model`,
and an intercepted report failure showed “Collector unavailable” plus a recovery
instruction. Removing that failure and reloading restored one ledger row and
“Collector live”.

## Live deployment, privacy, and browser evidence

Fresh SHA-256 comparisons matched every shipped runtime artifact from the fresh
`dist/site`: root, privacy and terms HTML; JS and CSS; favicon; robots and
sitemap; service worker; and both WebP images. The live host correctly does not
serve `staticwebapp.config.json` (HTTP 404); its configured response policy is
observable on the live responses.

Live headers include HTTPS/HSTS, a self-only CSP, `X-Content-Type-Options:
nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a restrictive
camera/microphone/geolocation Permissions-Policy. The hashed JS is cached
`public, max-age=31536000, immutable`; HTML and `sw.js` revalidate after 30
seconds; the hero caches for one week.

Playwright inspected `/`, `/privacy/`, and `/terms/` with axe-core WCAG 2 A/AA:
**0 violations**, including **0 serious/critical**. It recorded no console errors,
no page errors, and no outbound requests beyond the product origin. This confirms
no runtime analytics, third-party scripts, or CDN fonts. All pages retain title,
`lang`, one h1, and main landmarks.

At desktop width, ArrowRight moved focus and selection from the Project tab to
the Model tab. The focused tab displayed the designed `3px` orange outline with
`3px` offset. At 390 × 844, the hosted document measured exactly **390/390**
client/scroll width; the prior horizontal-overflow release blocker is not
reproducible. With reduced motion emulated, animation was `none` and transition
duration `0s`. Visual inspection of the mobile page confirmed the ledger stacks
as labelled records and remains readable.

The live service worker was active and controlling the page. An offline reload
after initial load rendered the landing h1 successfully. Its checked deployment
code uses a versioned cache plus `skipWaiting`, stale-cache cleanup, and
`clients.claim`, so an updated worker can take control.

Mobile Lighthouse (fresh live run): performance **100**, accessibility **100**,
best practices **100**, SEO **100**; LCP **1,265 ms**, CLS **0**, TBT **33 ms**.

## Defects

No release-blocking, high, medium, or low defects were found in this verification.

## Scope notes

- The collector supports OTLP/HTTP (JSON or protobuf, identity or gzip), not
  OTLP/gRPC; this is documented and not a deviation from the shipped interface.
- Cost books are local/user-supplied and no observed pricing is fetched from a
  third party. Missing costs remain `$0`, retaining token attribution.
- The crate was packaged but not published; registry credentials remain
  factory-owned.
