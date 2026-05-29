# Release Guide (Rust)

Pith uses **semantic versioning** (`MAJOR.MINOR.PATCH`) with a single project release tag:

- `v2.1.0`
- `v2.1.1`

## GitFlow Rule

- Development path: `feature|bugfix -> develop -> main`
- Release is allowed from `main` only.

## Source of Truth

- Workspace version: `Cargo.toml` -> `[workspace.package].version`
- Release tag: `vX.Y.Z`
- GitHub release title: `pith vX.Y.Z`

## Automatic Release

Release is automatic on `push` to `main`:

1. Workflow reads workspace version from `Cargo.toml`.
2. If tag `vX.Y.Z` does not exist, it runs:
   - `cargo test --workspace`
   - `cargo run -p pith -- feedback eval --input feedback/adapter-balanced-v1.jsonl`
   - `cargo build --release --workspace`
3. Creates tag `vX.Y.Z`.
4. Publishes GitHub release with `pith` binary artifact.

If the tag already exists, workflow exits without creating a duplicate release.

## Local Pre-Release Checklist

```bash
cargo test --workspace
cargo run -p pith -- feedback eval --input feedback/adapter-balanced-v1.jsonl
cargo build --release --workspace
```
