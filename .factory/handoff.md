# OTel Token Meter verification 3 handoff — PASS

- **Work order:** `otel-token-meter-verify-3`
- **Completed:** 6 September 2026
- **Live URL:** https://otel-token-meter.sociobot.in/
- **Implementation SHA:** `4be2c857fce902657f07757fdd1802e892bd6963`
- **Documentation candidate SHA:** `fcaef872eb250d5ffda2fa95f81714a7a1a624de`

## Result

PASS with zero findings and zero untested public claims. The live runtime is
the implementation candidate; the later candidate commits change only this
factory handoff documentation.

The full independent report is in `.factory/verification-3.md`.

## What was verified

- Every one of the 17 commands in `.factory/claims.json` passed separately
  from a fresh clone after `npm ci`.
- `npm test`, formatting, clippy, build, browser tests, the combined claims
  suite, and `cargo package --allow-dirty` passed.
- The packaged crate was installed into a separate consumer root. Its demo,
  reports, CSV export, exit codes, collector health, invalid-input recovery,
  and restart persistence worked through the installed binary.
- Fresh live desktop and phone contexts showed the job, audience, and first
  sample action before scrolling.
- The live demo was populated, persistently labelled, resettable, exportable,
  and isolated from a non-demo storage sentinel.
- Root, demo, privacy, terms, and the deliberate product 404 passed route,
  keyboard, focus, touch-target, reduced-motion, axe, privacy, link, and
  mobile-overflow checks.
- The demo reloaded offline under service-worker control.
- All deployed documents and runtime assets matched the clean build by SHA-256.
- Mobile Lighthouse scored 100 for performance, accessibility, best practices,
  and SEO. LCP was 1,134 ms, CLS 0, and TBT 30 ms.

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

Run every individual command recorded in `.factory/claims.json`. Install the
created package into a new Cargo root, then run `otel-token-meter demo` and the
installed collector. Open the live root and `/demo/` in fresh desktop and phone
contexts.

## Known gaps and next steps

- The crate is ready to publish, but registry publication is factory-owned.
- OTLP/gRPC is outside the documented OTLP/HTTP scope.
- No product repair, deployment, billing action, or infrastructure change is needed.
