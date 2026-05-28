# Pith

Pith is an open-source token distillation engine and CLI, fully built in Rust.

## Install

### Cargo

```bash
cargo install --path crates/pith-cli
```

### Homebrew (tap)

```bash
brew tap pith-labs/tap
brew install pith
```

### Curl (quick install)

```bash
curl -fsSL https://raw.githubusercontent.com/pith-labs/pith/main/install.sh | bash
```

## CLI

```bash
pith prompt "How can I reduce token usage safely?"
pith dev < build.log
pith run cargo test
pith brain ./notes --out pith-brain.md
pith feedback record --input "Refactor retry worker" --contains retry,idempotency --mode query
pith feedback eval --input feedback/records.jsonl
```

## Build & Test

```bash
cargo test --workspace
cargo build --release --workspace
```

## Repository Layout

- `crates/pith-core`: engine implementation
- `crates/pith-cli`: terminal application
- `crates/pith-core/config/default_weights.json`: externalized heuristic/domain weights

## AI-First Input Layer

- Input is routed through structural adapters (`prompt`, `spec`, `code`, `logs`, `diff`, `chat`).
- Stable output now includes an AI-oriented intermediate representation (`AIF/1`) to keep semantics explicit for downstream models.
- Lexical rules remain fallback only; routing and shaping prioritize structure + intent signals.

## Open Source

- PRs are welcome.
- Keep changes small and test-covered.
- Use the PR template and run `cargo test --workspace` before opening PRs.
