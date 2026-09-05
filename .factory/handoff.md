# OTel Token Meter review handoff — FAIL

**Review date:** 2026-09-05
**Implementation reviewed:** `38af6e88f0052c437d1a696f2a2d58548b398a55`
**Documentation reviewed:** `f0aa7d65adfc3b971498480e310247ea6b23a9ea`
**Live URL:** https://otel-token-meter.sociobot.in/

## Result

**FAIL — 4 findings, including 2 high-severity findings and 13 untested public claims.**

The local CLI and the live static site otherwise work: clean quality gates,
consumer-artifact exercise, live desktop/phone accessibility checks, offline
reload, and live asset matching all passed. The product is not ready to pass
because it has no contract-compliant demo sandbox or claims manifest, and the
host returns an undesigned generic 404 page.

## How to verify

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

Also run the clean consumer workflow documented in `.factory/review-1.md`,
then inspect the live root, `/privacy/`, `/terms/`, `/demo`, and a missing URL.

## Required follow-up

1. Add a real CLI and web demo: `otel-token-meter --demo` (or `demo`), a
   shipped sample, `/demo` or `?demo=1`, a persistent “Demo — sample data,
   nothing is saved” banner, Reset demo, Start for real, and `.factory/demo.md`.
2. Add `.factory/claims.json` and one tagged sandbox test per public claim.
3. Ship a styled `404.html` and response override, then add the required
   canonical, Open Graph, Twitter, Apple touch metadata and consistent header
   navigation.

See `.factory/review-1.md` for full evidence, prior-finding disposition, and
the exact claim inventory.
