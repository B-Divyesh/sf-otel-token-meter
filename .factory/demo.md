# Demo sandbox

## Website

- Entry point: `https://otel-token-meter.sociobot.in/demo/`
- One-click entry: **Try it with sample data** on the landing page.
- Sample: five OTLP spans from checkout, documentation, release, and unlabelled coding-agent work.
- Output: project, model, and tool groups with tokens, cache reads, latency, errors, and local cost estimates.
- Reset: **Reset demo** restores project grouping and the populated sample.
- Exit: **Start for real**, or any non-demo link, removes demo state before leaving.
- Storage: only `localStorage` keys beginning `demo:otel-token-meter:` are used. No non-demo key is read or written.

The persistent banner reads **Demo — sample data, nothing is saved**. It distinguishes the sample from a user's local CLI data.

## CLI

Run:

```sh
otel-token-meter demo
```

The binary loads `examples/demo-traces.json` and `examples/demo-prices.json` from its compiled bundle. It creates a unique directory under the operating system's temporary directory and prints the path.

The directory contains:

- `sample-traces.json`: the exact bundled OTLP input.
- `prices.json`: the exact bundled local prices.
- `aggregate-ledger.json`: aggregate-only persisted output.
- `usage-by-project.csv`: the project report.

Tests may pass `--output <fresh-directory>` and `--json` for deterministic inspection. The command never reads the working directory's real ledger.

## Verification

Every public outcome uses this website or CLI entry point. Commands are declared in `.factory/claims.json` and implemented in `tests/claims/public-claims.spec.ts`.
