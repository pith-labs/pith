# Contributing to Pith

Thanks for contributing.

## Workflow

- Create a feature branch (`feature/...` or `bugfix/...`).
- Keep PRs focused and small.
- Add or update tests for behavior changes.
- Open a PR using the repository template.

## Local Setup

```bash
cargo test --workspace
cargo build --release --workspace
```

## Project Scope

- `crates/pith-core`: core engine
- `crates/pith-cli`: CLI interface

## Quality Bar

- CI must pass.
- No force-push to `main`.
- Keep behavior deterministic where possible.
- For AI-assisted edits, follow `docs/AI_CODING_SKILLS.md`.
