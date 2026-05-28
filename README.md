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
```

## Build & Test

```bash
cargo test --workspace
cargo build --release --workspace
```

## Repository Layout

- `crates/pith-core`: engine implementation
- `crates/pith-cli`: terminal application

## Open Source

- PRs are welcome.
- Keep changes small and test-covered.
- Use the PR template and run `cargo test --workspace` before opening PRs.
