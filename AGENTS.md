# Pith Agent Operating Guide (Claude + Codex)

This repository is optimized for Rust-first agent workflows.

## Product Goal

- Distill developer input into compact, semantic machine-friendly form.
- Reduce token usage without losing intent/context.
- Keep behavior deterministic and benchmarked.

## Repo Scope

- `crates/pith-core`: distillation engine
- `crates/pith-cli`: CLI interface

## Mandatory Validation

For any engine/adapter behavior change, run:

1. `cargo test -p pith-core`
2. `cargo run -p pith -- feedback eval --input feedback/adapter-balanced-v1.jsonl`
3. At least one real CLI sample with `--plain` and `--json`

## Merge Gate

- No unexplained metric regression in adapter eval.
- No placeholder/mocked production behavior.
- Branch naming must be `feature/...` or `bugfix/...`.
- Default PR target is `develop` (GitFlow).
- `main` receives only release-ready merges from `develop`.
- PR template must be fully filled.

## Agent Configs

- Claude-specific workflow files: `.claude/`
- Codex-specific reusable skills: `.codex/skills/`
- Shared anti-hallucination protocol: `docs/AI_CODING_SKILLS.md`
