# Diagnose

Run this when quality regresses:

1. `cargo test -p pith-core`
2. `cargo run -p pith -- feedback eval --input feedback/adapter-balanced-v1.jsonl`
3. Reproduce failing case with `pith q|c|v --json`
4. Compare `input_kind`, `ir`, `ai_language`, and opcode fields.
