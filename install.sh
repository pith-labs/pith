#!/usr/bin/env bash
set -euo pipefail

REPO="pith-labs/pith"
BIN_DIR="${HOME}/.local/bin"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

mkdir -p "$BIN_DIR"

echo "Installing pith from source with cargo..."
if ! command -v cargo >/dev/null 2>&1; then
  echo "cargo not found. Install Rust first: https://rustup.rs"
  exit 1
fi

git clone "https://github.com/${REPO}.git" "$TMP_DIR/pith"
cargo install --path "$TMP_DIR/pith/crates/pith-cli" --root "$HOME/.local"

echo "Done. Ensure ${BIN_DIR} is in your PATH."
echo "Try: pith --help"
