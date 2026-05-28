# Pith

Pith is an open-source token distillation engine and CLI, now fully Rust-first.

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
pith run npm test
pith brain ./notes --out pith-brain.md
```

## Build & Test

```bash
cargo test
cargo build --release
```

## Repository Layout

- `crates/pith-core`: engine implementation
- `crates/pith-cli`: terminal application
- `packages/*`: legacy TypeScript implementation (deprecation path)

## Open Source

- PRs are welcome.
- Keep changes small and test-covered.
- Use the PR template and run `cargo test` before opening PRs.
