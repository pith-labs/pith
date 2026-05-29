# Release Guide (Rust)

Pith release flow is Rust-first.

## GitFlow Rule

- Development path: `feature|bugfix -> develop -> main`
- Release workflows must be run from `main` only.

## Components

- `pith-core` crate
- `pith` CLI crate

## Core Release

1. Ensure current branch is `main` (workflow is blocked outside `main`).
2. Run **Release Core** workflow.
3. Set `version` input (e.g. `2.1.0`).
4. Workflow updates `crates/pith-core/Cargo.toml`, tags `core-vX.Y.Z`, and creates a GitHub release.

## CLI Release

1. Ensure current branch is `main` (workflow is blocked outside `main`).
2. Run **Release CLI** workflow.
3. Set `version` input (e.g. `2.1.0`).
4. Workflow updates `crates/pith-cli/Cargo.toml`, tags `cli-vX.Y.Z`, builds binary, and creates a GitHub release artifact.

## Pre-Release Checklist

```bash
cargo test --workspace
cargo build --release --workspace
```
