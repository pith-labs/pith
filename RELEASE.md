# Release Guide (Rust)

Pith uses **semantic versioning** (`MAJOR.MINOR.PATCH`) with a single project release tag:

- `v2.1.0`
- `v2.1.1`

## Source of Truth

- Workspace version: `Cargo.toml` -> `[workspace.package].version`
- Release tag: `vX.Y.Z`
- GitHub release title: `pith vX.Y.Z`

## Release Workflow

1. Open GitHub Actions and run **Release**.
2. Set `version` (example: `2.1.0`).
3. Workflow validates:
   - `cargo test --workspace`
   - `cargo run -p pith -- feedback eval --input feedback/adapter-balanced-v1.jsonl`
   - `cargo build --release --workspace`
4. Workflow updates workspace version, commits, creates tag `vX.Y.Z`, and publishes GitHub release with binary artifact.

## Local Pre-Release Checklist

```bash
cargo test --workspace
cargo run -p pith -- feedback eval --input feedback/adapter-balanced-v1.jsonl
cargo build --release --workspace
```
