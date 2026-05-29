# Pith — Claude Instructions

## Project

Rust monorepo focused on input distillation:
- `crates/pith-core` (engine)
- `crates/pith-cli` (CLI)

## Output Rules

- Be concise and factual.
- Prefer diffs and concrete commands.
- Avoid filler text.

## Engineering Rules

- Validate claims by running tests/commands.
- No placeholder/mocked production behavior.
- Keep changes small and commit by intent.

## Mandatory Checks (core behavior changes)

- `cargo test -p pith-core`
- `cargo run -p pith -- feedback eval --input feedback/adapter-balanced-v1.jsonl`
- One real CLI sample in both `--plain` and `--json`.

## Local Guidance

- Shared guide: `AGENTS.md`
- Claude workflow structure: `.claude/`
- Codex workflow structure: `.codex/skills/`
