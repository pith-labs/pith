# Release Guide (Rust)

Pith release flow is Rust-first.

## Components

- `pith-core` crate
- `pith` CLI crate

## Core Release

1. Run **Release Core** workflow.
2. Set `version` input (e.g. `2.1.0`).
3. Workflow updates `crates/pith-core/Cargo.toml`, tags `core-vX.Y.Z`, and creates a GitHub release.

## CLI Release

1. Run **Release CLI** workflow.
2. Set `version` input (e.g. `2.1.0`).
3. Workflow updates `crates/pith-cli/Cargo.toml`, tags `cli-vX.Y.Z`, builds binary, and creates a GitHub release artifact.

## Pre-Release Checklist

```bash
cargo test --workspace
cargo build --release --workspace
```
