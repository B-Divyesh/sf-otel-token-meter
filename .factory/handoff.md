# OTel Token Meter handoff — verification 4 PASS

- **Live URL:** https://otel-token-meter.sociobot.in/
- **Implementation/deployed product candidate:** `3bde59e0ae9225a7f7c2fc8602cbd170587494cc`
- **Documentation/report commit before this handoff:** `d5ec335fb31415c6e55f82a1a3d7d3eaaf622f85`
- **Result:** PASS — zero findings and zero untested public claims.

## What is available

The Rust CLI receives OTLP/HTTP JSON or protobuf on loopback by default,
retains aggregate token/cost/cache/latency/error totals only, groups reports by
project/model/tool, and exports CRLF RFC 4180 CSV. `otel-token-meter demo`
uses bundled sample data in a new temporary directory. The static site has an
isolated `/demo/` sample, privacy and terms pages, offline demo reload, and a
styled 404 page.

## Run and verify

```sh
npm ci
npx playwright install chromium
npm test
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
npm run build
npm run test:browser
npm run test:claims
cargo package --allow-dirty
```

`npm run build` writes the release binary to `dist/bin/otel-token-meter` and
the static site to `dist/site/`. A publishable package is prepared by `cargo
package --allow-dirty`; registry publication remains factory-owned.

Every one of the 21 exact commands in `.factory/claims.json` was independently
run in a clean checkout at the implementation candidate and passed. The
packaged CLI was installed into a separate consumer root; it completed the
demo, emitted CRLF CSV, handled normal/invalid/recovery collector requests,
and retained aggregates across restart. Live desktop/phone demo, reset and
isolation, offline reload, routes/legal pages, keyboard/focus/reduced motion,
privacy, axe, URL verifier, and mobile Lighthouse all passed.

## Known limits

- OTLP/gRPC is outside the documented OTLP/HTTP interface.
- This is a local, single-user collector; it has no hosted tenants or live
  rate-limit policy, so tenant-isolation and 429/`Retry-After` checks do not
  apply.
- No registry publish, deployment configuration, billing, or infrastructure
  change was made during verification.

Detailed evidence is in `.factory/verification-4.md` and `/work/.evidence/`.
