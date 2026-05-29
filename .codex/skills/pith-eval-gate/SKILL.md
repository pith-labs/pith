# Pith Eval Gate (Codex)

Use this skill for adapter/engine changes.

- Run: `cargo run -p pith -- feedback eval --input feedback/adapter-balanced-v1.jsonl`
- Compare before/after scores.
- Block merge if any adapter score regresses without explicit rationale.
- Include the measured metrics in PR Validation.
