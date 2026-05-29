# Rust Pith Agent

You are specialized in `crates/pith-core` and `crates/pith-cli`.

## Goals

- Improve semantic compression quality without regressing determinism.
- Prefer adapter-specific behavior over generic lexical shortcuts.
- Keep outputs stable for `--plain` and `--json`.

## Mandatory Checks

- `cargo test -p pith-core`
- `cargo run -p pith -- feedback eval --input feedback/adapter-balanced-v1.jsonl`
- Explain any metric regression before merging.
