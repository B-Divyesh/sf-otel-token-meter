# Review 3: Count tokens from OpenTelemetry traces

- **Verdict:** FAIL
- **Findings:** 1
- **Untested public claims:** 0
- **Reviewed:** 6 September 2026
- **Live URL:** https://otel-token-meter.sociobot.in/
- **Implementation candidate:** `3bde59e0ae9225a7f7c2fc8602cbd170587494cc`
- **Documentation commit:** `e290205ac6f56669704b6a749fb07d46c1af0f27`

## Decision

**FAIL.** The live product and installed CLI complete the intended job, and all 21 public claim commands pass. One documented local quality gate fails in a clean checkout. The README says Rust 1.85 or newer is supported and declares `cargo fmt --all -- --check` as a verification command. With Rust 1.98.0 and rustfmt 1.9.0, the command exits non-zero because it would reformat `src/output.rs`. The product cannot receive PASS while a declared quality gate fails.

The candidate is `3bde59e`. `d5ec335` and `e290205` are documentation/report commits only. The live root references `assets/main-CNAY5Crz.js` and `assets/style-B6iR52It.css`, exactly matching a clean build of the candidate.

## First screen before scrolling

Fresh desktop (1440 × 900) and phone (390 × 844) contexts opened the live root at scroll position zero.

- **Job:** Count tokens from OpenTelemetry traces.
- **Audience:** Teams running coding agents that need local token, cost, cache, latency, and error totals.
- **First action:** **Try it with sample data**. It is visible before scrolling and opens `/demo/` in one click.

The first screen says the product is free and MIT licensed, stores aggregate totals only, and runs on the user's machine. The phone viewport and document width were both 390 px; desktop widths were both 1440 px.

## Finding

### F-1 — Low: documented formatting gate fails

**Evidence:** In a new clone checked out at `3bde59e`, after `npm ci` and the pinned Playwright Chromium installation, this declared command failed:

```sh
cargo fmt --all -- --check
```

Rust 1.98.0 / rustfmt 1.9.0 report a required reformat in `src/output.rs` around the CSV test assertions. The README's requirement is “Rust 1.85 or newer,” so this is within the documented supported toolchain range. `cargo clippy --all-targets -- -D warnings`, `npm test`, `npm run build`, `npm run test:browser`, and `cargo package --allow-dirty` passed.

**Impact:** This does not change runtime output, but it breaks the documented clean-checkout quality command and product contract.

**Repair:** Format and commit the affected source with the current supported rustfmt, then rerun the complete documented command list in a clean checkout.

## Claims and installed artifact

Each exact `test` command in `.factory/claims.json` was run separately from the fresh candidate checkout. All passed: `accounting-groups`, `otlp-http-formats`, `aggregate-only-storage`, `no-account-or-telemetry`, `no-outbound-cli-requests`, `health-identity`, `default-loopback`, `report-outputs`, `csv-export`, `cli-demo-isolation`, `file-protobuf-ingest`, `single-binary-distribution`, `exit-codes`, `local-price-book`, `semantic-mapping`, `web-demo-matches-cli`, `web-csv-export`, `offline-reload`, `demo-sandbox`, `site-privacy`, and `free-mit`. The combined command then confirmed **21 passed**.

`cargo package --allow-dirty` passed and verified 34 files (167.8 KiB uncompressed, 47.2 KiB compressed). The dedicated clean-consumer claim installed the packaged crate into a new Cargo root, found exactly one `otel-token-meter` executable, and received `otel-token-meter 0.1.0` from `--version`. Direct release-binary checks confirmed useful command help and the same version.

The release collector returned aggregate-only health with version `0.1.0` and build `3bde59e0ae92`. Valid OTLP JSON returned 200; malformed JSON returned 400; unsupported `br` encoding returned 415; the next valid request recovered with 200. After stop and restart, the ledger contained two accepted requests. The unit gate includes the 64 MiB decompressed-gzip boundary. Tenant isolation and 429/`Retry-After` do not apply: this is a local, single-user CLI collector rather than a hosted multi-tenant backend.

## Live demo, accessibility, privacy, and routes

The one-click demo showed the realistic five-request sample: 1.61M tokens, 827 ms average latency, two errors, and four populated project rows (`checkout-agent`, `docs-indexer`, `release-bot`, and `unknown`). The persistent banner read **Demo — sample data, nothing is saved**. Keyboard ArrowRight moved the grouping to Tool; CSV export produced `otel-token-meter-tool.csv`; reset returned Project grouping and preserved a non-demo local-storage sentinel. Leaving via **Start for real** removed only `demo:otel-token-meter:` keys and left the sentinel unchanged.

- Root, demo, privacy, and terms returned 200. Each had its route-specific title, `lang=en`, exactly one h1, main landmark, skip link, and footer.
- The unknown path returned the styled product 404 with a recovery link and expected HTTP 404. Its browser network error is the expected failed 404 resource, not a page defect.
- Playwright axe WCAG 2 A/AA returned zero violations on root, demo, privacy, terms, and 404. The standalone `@axe-core/cli` could not start because the container exposes Playwright Chromium but no Chrome binary; the permitted Playwright axe integration was used instead.
- All interactive normal routes loaded without console/page errors. Reduced motion set animation and transition duration to `0s`. A service-worker-controlled fresh demo context reloaded offline with its title, banner, and four rows intact.
- Full-browser requests stayed on `https://otel-token-meter.sociobot.in` and cookies were empty. Response headers supplied HSTS, self-only CSP, `nosniff`, strict referrer policy, and restricted device permissions. All root internal links returned 200; the external repository destination was available.

The worker `verify-url.sh` was not present in this clean checkout or the provided workspace. Its required checks were performed directly through fresh Playwright contexts: title, lang, main, h1, accessible markup, console, and route structure all passed.

## Earlier findings disposition

| Earlier finding | Current disposition | Evidence |
| --- | --- | --- |
| High: no isolated CLI/web demo sandbox | Resolved | CLI `demo` uses a fresh temporary directory; live `/demo/` is populated, labelled, resettable, and clears only `demo:` keys. |
| High: no claims manifest or tagged claim tests | Resolved | All 21 manifest commands passed separately and together. |
| Medium: generic host 404 | Resolved | Unknown live URL has product title, h1, main, shared navigation, recovery, and expected 404 status. |
| Low: incomplete metadata/navigation | Resolved | All public routes have route-specific titles and common accessible skeletons. |
| High: 390 px overflow | Resolved | Fresh root and demo measurements are exactly 390 px client and scroll width. |
| Low: health omitted version/build | Resolved | Installed collector health returned privacy mode, `0.1.0`, and `3bde59e0ae92`. |
| High: CLI demo/protobuf/no-outbound/single-binary promises untested | Resolved | Dedicated outcome tests passed as individual claim commands. |
| Low: claimed RFC 4180 CSV used LF records | Resolved | The dedicated export claim passed with CRLF records. |

## Evidence summary

Fresh checkout at `3bde59e`:

```sh
npm ci
npx playwright install chromium
npm test                                      # pass
cargo fmt --all -- --check                    # fail: F-1
cargo clippy --all-targets -- -D warnings     # pass
npm run build                                 # pass
npm run test:browser                          # pass, 4 tests
npm run test:claims                           # pass, 21 tests
cargo package --allow-dirty                   # pass
```

No product code was changed in this review.
