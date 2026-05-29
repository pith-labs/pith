# Release Guide (Rust)

Pith release flow is Rust-first.

## GitFlow Rule

- Development path: `feature|bugfix -> develop -> main`
- Release workflows must be run from `main` only.

## Components

- `pith-core` crate
- `pith` CLI crate

## Automatic Release

Release is automatic on `push` to `main`:

1. Workflow reads `Cargo.toml` workspace version.
2. If tag `vX.Y.Z` does not exist, it runs test + eval + build.
3. Creates tag `vX.Y.Z`.
4. Publishes GitHub release with the `pith` binary artifact.

If the tag already exists, workflow exits without creating a duplicate release.

## Pre-Release Checklist

```bash
cargo test --workspace
cargo build --release --workspace
```
