# Pith Eval Gate

Use when adapter/engine behavior changes.

- Run `cargo run -p pith -- feedback eval --input feedback/adapter-balanced-v1.jsonl`.
- Block merge on unexplained score regressions.
- If score changes, include before/after in PR.
