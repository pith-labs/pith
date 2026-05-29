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
brew install pith-labs/tap/pith
```

### Curl (quick install)

```bash
curl -fsSL https://raw.githubusercontent.com/pith-labs/pith/main/install.sh | bash
```

## CLI

```bash
# Query/Prompt
pith q "How can I reduce token usage safely?"

# Compress / Conversational
pith c "long structural text..."
pith v "User: ...\nAssistant: ..."

# Log/output mode (RTK-like)
pith run cargo test
pith log < build.log

# Output controls
pith q "Explain and output JSON" --plain
pith q "Explain and output JSON" --json
pith c "diff --git ..." --stats

# Knowledge export
pith brain ./notes --out pith-brain.md

# Benchmark loop
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

## Adapter Benchmark

Run balanced evaluation by input kind:

```bash
cargo run -p pith -- feedback eval --input feedback/adapter-balanced-v1.jsonl
```

The report prints global metrics plus per-kind quality:

- `contains_score` (global)
- `kind=<...> contains_score` (adapter-level)

## Open Source

- PRs are welcome.
- Keep changes small and test-covered.
- Use the PR template and run `cargo test --workspace` before opening PRs.
