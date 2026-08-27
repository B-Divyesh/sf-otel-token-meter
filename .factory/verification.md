# Verification report — FAIL

**Candidate:** `c4c3da55da697d72e33de27caa0dc573ade2b239`
**Verified:** 2026-08-27
**Live URL:** https://otel-token-meter.sociobot.in

## Decision

**FAIL.** The core local OTLP accounting workflow works, the static deployment is the
candidate build, and privacy/security checks are clean. However, a required 390 px
mobile experience has horizontal document overflow on both the hosted landing-page
demo and the binary's local dashboard. This violates the product contract's mobile
acceptance criterion.

## Reproducible evidence

### Clean checkout and package quality gates

Starting at the candidate with a clean worktree:

```sh
npm ci
npm test
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
npm run build
cargo package --allow-dirty
```

All commands passed. `npm test` ran 7 Rust unit tests and 2 CLI/HTTP integration
tests. The production build emitted `dist/bin/otel-token-meter` and `dist/site/`.
`cargo package` verified the crate (24 files, 118.2 KiB / 34.2 KiB compressed).

The packaged crate was independently installed into a clean consumer root:

```sh
cargo install --debug --path target/package/otel-token-meter-0.1.0 \
  --root /tmp/otel-consumer/install --target-dir /work/repo/target
/tmp/otel-consumer/install/bin/otel-token-meter ingest \
  /work/repo/examples/sample-traces.json --data /tmp/otel-consumer/ledger.json \
  --prices /work/repo/examples/prices.json --json
/tmp/otel-consumer/install/bin/otel-token-meter report \
  --data /tmp/otel-consumer/ledger.json --group-by project --json
```

It installed as `otel-token-meter 0.1.0`, accepted one span, and reported the
expected `checkout` row: 100 input, 25 output, 40 cache-read tokens and `$0.000410`.

### Collector end-to-end and recovery

Using the release binary and the supplied OTLP fixture:

- `ingest` accepted 1 span; model JSON report contained 125 total tokens, 100 ms,
  and `$0.00041`; tool CSV was valid and quoted correctly.
- The persisted ledger contained none of `prompt`, `completion`, `traceId`,
  `spanId`, or `events` (zero matches). This confirms aggregate-only storage for
  the representative payload.
- A loopback server accepted 20 concurrent JSON OTLP posts (all HTTP 200), then a
  valid recovery post and a gzip post (both HTTP 200). Its aggregate report showed
  exactly 22 requests / 2,750 total tokens.
- Unsupported `Content-Encoding: br` returned HTTP 415; malformed JSON returned
  HTTP 400; the immediately following valid request succeeded (HTTP 200).
- `--help` exposes `serve`, `report`, `export`, and `ingest`; an unknown subcommand
  exits 2. A missing data file intentionally produces an empty ledger (exit 0).
- The local dashboard loaded the populated ledger, changed grouping by keyboard,
  showed its unavailable-state after an induced API failure, and recovered to
  “Collector live”. Local axe WCAG 2 A/AA reported 0 violations.

### Live deployment, privacy, and response policy

The deployed HTML and every shipped runtime asset matched the fresh `dist/site`
byte-for-byte by SHA-256: `index.html`, privacy and terms pages, JS, CSS, both
WebP assets, favicon, service worker, robots, and sitemap. The deployment is thus
the candidate site build.

`/opt/fleet/lib/verify-url.sh https://otel-token-meter.sociobot.in …` passed:
HTTP 200, 1,162 ms load, no console/page errors, title/lang/one h1/main present,
no missing image alt text, and no unlabeled buttons.

Playwright recorded no outbound requests beyond the site's own origin and no
console/page errors on `/`, `/privacy/`, or `/terms/`. This confirms no analytics,
CDN fonts, or third-party scripts at runtime. Playwright axe-core 4.11 WCAG 2 A/AA
found **0 serious or critical findings** (0 total violations) on all three pages.

The live response has HTTPS/HSTS, CSP restricting sources to `self`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
and a restrictive Permissions-Policy. Hashed JS has
`Cache-Control: public, max-age=31536000, immutable`; HTML and `sw.js` revalidate
after 30 seconds; the hero is cached one week. The registered service worker had an
active controller and `otel-token-meter-site-v1` cache; an offline reload rendered
the landing h1 successfully. Its update path uses `skipWaiting`, cache cleanup, and
`clients.claim`.

### Accessibility, performance, and interaction checks

- Desktop and 390 px screenshots were reviewed. Landing-page tab arrows switch
  group selection and panel labelling; Enter toggles the empty state. Focus is a
  visible 3 px orange outline. Reduced-motion mode yields `animation: none` and
  `transition: 0s`.
- Mobile Lighthouse JSON: performance **99**, accessibility **100**, best practices
  **100**, SEO **100**; LCP 1,491 ms, CLS 0, TBT 111.5 ms. (Chrome emitted a
  transient “Browser tab has unexpectedly crashed” message after producing the
  complete report.)
- Built static budgets passed: JS 4,138 B, CSS 9,058 B, largest hero 110,032 B
  (plus a 41,920 B mobile derivative); all are within the stated budgets.

## Defects

### High — 390 px horizontal document overflow (release blocker)

At a 390 px viewport, the hosted landing page reports `documentElement.scrollWidth`
**739** while `clientWidth` is **390**. The embedded demo's visually clipped,
absolutely positioned `<thead>` retains its approximately 722 px intrinsic width;
the `overflow: visible` mobile table wrapper lets it expand the document. The binary
dashboard has the same defect: **732** px `scrollWidth` at 390 px.

This is reproducible by opening the live site or a local `serve` dashboard at
390 px and evaluating `document.documentElement.scrollWidth`. It permits sideways
page scrolling/blank area even though table rows are visually stacked. The original
contract explicitly requires mobile support, so this blocks PASS.

### Low — no build identity on collector health endpoint

`GET /health` returns only `{"privacy":"aggregate-only","status":"ok"}`.
The collector has no version or commit/build identifier in a health or diagnostic
response, so a running binary cannot be independently tied to a candidate commit.
The static deployment was tied to this candidate by exact asset hashes; there is no
remote collector deployment in scope. This does not affect accounting correctness
or privacy, but limits operational verification.

## Recommended next verification

After correcting the mobile table layout, rerun the commands above and verify both
document widths equal 390 at a 390 px viewport, for the hosted demo and local
dashboard. Add a commit/version value to the collector health response if build
identity is needed operationally.
