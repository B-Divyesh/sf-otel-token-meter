# OTel Token Meter — token and latency accounting review

**Verdict: FAIL**

**Reviewed:** 2026-09-05
**Live URL:** https://otel-token-meter.sociobot.in/
**Implementation candidate:** `38af6e88f0052c437d1a696f2a2d58548b398a55`
**Documentation candidate:** `f0aa7d65adfc3b971498480e310247ea6b23a9ea`
**Finding count:** 4
**Untested public claims:** 13

## First screen assessment

Job: give teams local, vendor-neutral token, cost, cache, latency, and error
accounting from their OpenTelemetry traces.

Audience: teams running coding agents and LLM applications.

First action before scrolling: the live page offers **Install the collector**.
It does not offer the required **Try it with sample data** action. The `Demo`
navigation link only scrolls to a static sample further down the same page.

## Findings

### F-1 — High: no contract-compliant demo sandbox

The CLI has neither `otel-token-meter --demo` nor an `otel-token-meter demo`
command; both exit 2. There is no `.factory/demo.md`. On the live site,
`/demo` is a generic host 404. `?demo=1` returns the normal landing page with
no demo storage namespace or persistent demo state. The sample is always
embedded in the landing page and has no first-screen entry action, no persistent
“Demo — sample data, nothing is saved” banner, no **Reset demo**, and no
**Start for real** control.

Fresh desktop and phone contexts did show realistic sample totals and a CSV
download (`otel-token-meter-project.csv`), but that does not create the required
isolated, resettable try-out. Browser storage was empty during the `?demo=1`
visit, so no real browser data was changed; it also proves that no separate demo
namespace exists.

### F-2 — High: the required claims manifest and claim tests are absent

`.factory/claims.json` does not exist. Therefore there are no declared claim
commands to run and no `@claim:<id>` sandbox tests. The ordinary unit and
browser tests do not satisfy the per-claim manifest requirement.

The following 13 public claims are untested in the required claim sandbox:

1. Local vendor-neutral accounting groups token, cost, cache, latency, and error data.
2. OTLP/HTTP accepts protobuf and JSON with identity or gzip encoding.
3. Trace bodies are dropped and only aggregates are stored.
4. The CLI has no account, model proxy, or telemetry of its own.
5. `/health` identifies aggregate-only mode, version, and build.
6. `report` produces human-readable and stable JSON output.
7. `export` produces CSV.
8. The documented command exit codes are 0, 1, and 2 as described.
9. Price books stay local and are not fetched from a vendor.
10. The documented semantic-convention mapping and `unknown` fallback work.
11. The landing sample mirrors the local dashboard.
12. The landing sample exports CSV locally.
13. The static site works offline after the first visit (asserted in the prior handoff).

This is a single high-severity contract finding, with 13 untested claims.

### F-3 — Medium: the required 404 page is not deployed

`https://otel-token-meter.sociobot.in/does-not-exist` and `/demo` correctly
return HTTP 404, but their document is the generic **“Azure Static Web Apps -
404: Not found”** page. It has no product title, `<h1>`, `<main>`, product
styling, or route back. HTTP 404 itself is expected; the missing required
product 404 structure is the defect. `staticwebapp.config.json` has no 404
response override and the site has no `404.html`.

### F-4 — Low: required route metadata and consistent navigation are incomplete

The live root and legal pages have titles, descriptions, language, and favicon,
but omit canonical URLs, Open Graph metadata, Twitter card metadata, and the
180 px Apple touch icon. The header also varies by route and does not expose the
required consistent Demo/main/Privacy navigation. These are mandatory parts of
the site-structure contract, not runtime console errors.

## What passed

- Fresh local quality gates passed after installing documented prerequisites:
  `npm ci`, `npm test`, `cargo fmt --all -- --check`,
  `cargo clippy --all-targets -- -D warnings`, `npm run build`,
  `npx playwright install chromium`, `npm run test:browser`, and
  `cargo package --allow-dirty`.
- The package built a release binary and `dist/site/`; package verification
  passed (28 files, 126.0 KiB uncompressed / 36.9 KiB compressed).
- A clean consumer installation from the packaged crate worked. The installed
  artifact ingested `examples/sample-traces.json`, reported 100 input, 25
  output, 40 cache-read tokens, 100 ms, and `$0.000410`, and exported valid CSV.
  An unknown command exited 2; a missing ingest file exited 1.
- A local installed collector returned health with aggregate-only mode, version,
  and build; malformed JSON returned 400; a subsequent valid OTLP request
  returned 200; restarting the collector retained two aggregate requests.
  Tenant isolation and 429/`Retry-After` are not applicable: this is a local
  single-user CLI collector, not a hosted multi-tenant backend.
- Fresh live desktop and phone contexts loaded with no console or page errors.
  At a real 390 px phone viewport, `clientWidth` and `scrollWidth` were both
  390. Keyboard ArrowRight moved sample grouping from Project to Model.
  Reduced motion set the tested animation and transition durations to none/0 s.
- Playwright axe-core WCAG 2 A/AA found zero violations on the root in fresh
  desktop and phone contexts. `/opt/fleet/lib/verify-url.sh` also passed the
  live root: title, `lang`, one `<h1>`, `<main>`, image alt text, labelled
  buttons, and no console errors. `npx @axe-core/cli` could not launch because
  this container has no system Chrome binary; the repository's pinned
  Playwright axe integration was used successfully instead.
- The root, privacy, terms, CSS, JS, favicon, robots, sitemap, service worker,
  and both WebP images matched the fresh `dist/site` output byte-for-byte by
  SHA-256. The implementation source is unchanged between `38af6e8` and the
  documentation-only `f0aa7d6`; the live runtime therefore matches the last
  implementation candidate.
- The active live service worker controlled the page and a fresh offline reload
  after the first visit rendered the landing `<h1>`. Privacy checks found
  same-origin runtime requests only, no third-party scripts/fonts, and a
  self-only CSP with HSTS, nosniff, strict referrer policy, and permissions
  policy headers.

## Earlier findings disposition

| Earlier finding | Current disposition | Evidence |
| --- | --- | --- |
| High: 390 px horizontal overflow | Resolved | Fresh live phone: 390 px client width and 390 px scroll width; local browser suite passed. |
| Low: health lacked version/build identity | Resolved | Installed collector `/health` returned `privacy`, `status`, `version: 0.1.0`, and build `f0aa7d65adfc`. |
| Verification-2 reported no defects | Superseded by this audit | This audit added the required demo-sandbox, claim-manifest, live 404, and route-metadata checks. |

## Evidence locations

- `/work/.evidence/verify-live/verify.json` and screenshots from the required URL verifier.
- `/work/.evidence/otel-live-desktop.png`, `/work/.evidence/otel-live-phone-no-preference.png`, and `/work/.evidence/otel-phone-reduce.png` from fresh browser contexts.
- The packaged consumer exercise used an isolated temporary directory and the
  published package contents only; no user or production data was accessed.

## Required repair and re-review

Implement the demo and claims requirements in F-1 and F-2 first. Add a styled
404 and complete the metadata/navigation in F-3 and F-4. Then run every
declared claim command from a clean checkout, recheck the live `/demo` flow in
fresh desktop and phone contexts, and repeat the installed-artifact exercise.
