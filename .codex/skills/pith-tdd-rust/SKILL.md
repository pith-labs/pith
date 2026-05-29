# Pith TDD Rust (Codex)

Use this skill when changing `crates/pith-core` or `crates/pith-cli` behavior.

1. Add/adjust a failing test first.
2. Implement the smallest fix.
3. Run `cargo test -p pith-core`.
4. Validate with a real CLI sample (`--plain` and `--json`).
5. Commit only after green validation.
