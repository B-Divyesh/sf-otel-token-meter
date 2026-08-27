# OTel Token Meter verification handoff — FAIL

**Candidate:** `c4c3da55da697d72e33de27caa0dc573ade2b239`
**URL:** https://otel-token-meter.sociobot.in
**Verified:** 2026-08-27

Independent QA is **FAIL**. The collector, package, privacy boundary, live deployment,
accessibility scan, offline shell, response policy, and performance budgets passed.
The failure is a release-blocking 390 px mobile horizontal overflow in both the
hosted demo and the local dashboard: document widths are 739 px and 732 px,
respectively, for a 390 px viewport. See `.factory/verification.md` for exact
reproduction, full command evidence, and severity-ranked defects.

## Verified commands

```sh
npm ci
npm test
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
npm run build
cargo package --allow-dirty
```

All passed. The ready-to-publish package was also installed from
`target/package/otel-token-meter-0.1.0` into a clean consumer root and its public
CLI successfully ingested and reported the supplied example. Do not publish; the
factory owns registry credentials.

## Required next step

Correct the 390 px document overflow in both table implementations, then rerun the
verification report's mobile checks. A low-severity follow-up is adding binary
version/commit identity to `/health` for operational build verification.
