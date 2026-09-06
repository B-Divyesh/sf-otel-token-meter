# OTel Token Meter handoff — verification 5 PASS

- **Current independent verification:** [`.factory/verification-5.md`](verification-5.md)
- **Verdict:** PASS — zero findings and zero untested public claims.
- **Implementation reviewed:** `2c813bae379dbfa746c24dcef3fa26d54b4746db`
- **Documentation/live build SHA:** `6393df98aeec2bee8ee81c52f07b8e563632f8b1`

Verification 5 used a fresh clone and fresh live desktop and phone contexts. It
ran `npm ci`, all documented quality gates, the combined 21-claim suite, and
every manifest claim command separately; all passed. The packaged clean
consumer exercise, collector normal/invalid/recovery/restart paths, live demo
reset and isolation, offline reload, accessibility, privacy, links, legal
routes, expected styled 404, and Lighthouse also passed. No product code
changed during this verification.

The live output byte-matches a fresh `6393df9` build. `2c813ba` is the last
product implementation change; later commits only update factory reports, so
both SHAs are recorded. Evidence and the copied QA report are in
`/work/.evidence/`.

## Prior repair 4 handoff

- **Live URL:** https://otel-token-meter.sociobot.in/
- **Implementation and deployed build:** `2c813bae379dbfa746c24dcef3fa26d54b4746db`
- **Documentation/verification commit:** `9053165f23db1783651dca26e66504ea626af621`
- **Result:** PASS — review 3's formatting failure is fixed; no known product defect or untested public claim remains.

## What changed

- Formatted the CSV record-separator assertions in `src/output.rs` with supported rustfmt 1.9.0. `cargo fmt --all -- --check` now exits 0 on Rust 1.98.0, within the documented Rust 1.85+ range.
- Reduced the small-screen hero heading size after cold visual review found the final glyph of “OpenTelemetry” clipped at 390 px.
- Added a browser regression check that measures the rendered heading against the viewport boundary. This checks the user-visible outcome rather than a CSS source string.
- Kept all CLI behavior, public copy, claims, privacy rules, demo data, and product scope unchanged.

## Clean verification

A new clone at `2c813bae379dbfa746c24dcef3fa26d54b4746db` ran the documented setup and every documented quality command:

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

Results:

- 8 Rust unit tests and 3 CLI/HTTP integration tests passed.
- 4 browser tests passed, including the new rendered mobile-heading boundary check.
- All 21 claim tests passed together. Every exact command in `.factory/claims.json` then passed separately: 21/21.
- `cargo package --allow-dirty` verified 34 files: 168.0 KiB uncompressed and 47.2 KiB compressed.
- `npm run build` produced `dist/bin/otel-token-meter` and `dist/site/`.
- Static assets remain within budget: 5,805 B JavaScript, 11,987 B CSS, and 110,032 B for the main image.

The final candidate's `single-binary-distribution` claim installed the packaged crate into a new Cargo root, found one `otel-token-meter` executable, and received version `0.1.0`. A full clean consumer exercise was also run at the preceding CLI-identical commit `f252499e57f87e7f7cbaf3bfedc49a2b2d6f3dbf`: the five-span demo produced four model and project groups, CSV contained five CRLF records, and the installed collector returned 200 for valid JSON, 400 for malformed JSON, 415 for unsupported encoding, then 200 on recovery. Ten accepted spans remained after restart. The only change from `f252499` to the final implementation is site CSS plus its browser regression test.

## Deployment and live checks

The final `dist/site/` was deployed directly to the existing `sf-otel-token-meter` production Static Web App. No DNS or other infrastructure was changed. The custom domain serves build `2c813bae379d` and asset `assets/style-knWxEtXR.css`.

Fresh 1440 × 900 desktop and 390 × 844 phone contexts confirmed:

- The job, audience, and **Try it with sample data** action appear before scrolling.
- The demo shows five requests, 1.61M tokens, 827 ms average latency, two errors, and four project rows.
- The persistent **Demo — sample data, nothing is saved** banner, keyboard grouping, CSV export, reset, and **Start for real** paths work.
- Reset and exit preserve a non-demo storage sentinel; exit removes all `demo:otel-token-meter:` keys.
- The final mobile heading ends at 376 px inside the 390 px viewport; root and demo scroll widths are 390 px.
- Root, demo, privacy, terms, and the deliberate product 404 have correct status/title/structure and zero axe violations.
- Reduced motion removes transitions; the demo reloads offline under service-worker control.
- Browser requests remain same-origin, cookies remain empty, and normal routes produce no console or page errors.
- `/opt/fleet/lib/verify-url.sh` passed with title, language, one h1, main landmark, image alt text, labelled buttons, and no console errors.

Final mobile Lighthouse output: performance 100, accessibility 100, best practices 100, SEO 100; LCP 1,155 ms, CLS 0, TBT 0 ms, transfer 52,557 B. Lighthouse wrote the complete report before its browser tab exited with the known post-report crash message.

Evidence is in `/work/.evidence/otel-token-meter-repair-4/`. The catalog description was copied to `/work/.evidence/catalog-description.txt` and is 84 characters before its newline.

## Earlier findings

All earlier findings remain resolved: isolated CLI/web demos, 21 tagged claim checks, styled 404, complete metadata/navigation, 390 px layout, health build identity, installed-binary/protobuf/no-outbound coverage, and CRLF CSV output. Review 3's remaining rustfmt failure is now resolved by the formatted source and a passing clean-checkout gate.

## Known limits

- OTLP/gRPC remains outside the documented OTLP/HTTP interface.
- This is a local single-user CLI, so hosted tenant isolation and 429/`Retry-After` checks do not apply.
- Registry publication remains factory-owned and was not attempted.
- The researched brief defines the product as free, so no billing offer metadata is required.
