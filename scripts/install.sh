#!/usr/bin/env bash
set -euo pipefail

PREFIX="${PITH_INSTALL_DIR:-$HOME/.local/bin}"
TMP_DIR="$(mktemp -d)"
REPO_URL="${PITH_REPO_URL:-https://github.com/AngeloCastro9/Pith.git}"
REF="${PITH_REF:-main}"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

if ! command -v git >/dev/null 2>&1; then
  echo "pith installer: git is required" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "pith installer: npm is required" >&2
  exit 1
fi

mkdir -p "$PREFIX"

echo "==> Cloning Pith ($REF)"
git clone --depth 1 --branch "$REF" "$REPO_URL" "$TMP_DIR/repo" >/dev/null 2>&1

cd "$TMP_DIR/repo"
echo "==> Installing dependencies"
npm install --silent

echo "==> Building CLI"
npm run -w @pith/cli build >/dev/null

cp "packages/cli/dist/cli.js" "$PREFIX/pith"
chmod +x "$PREFIX/pith"

echo "==> Installed pith to $PREFIX/pith"
if [[ ":$PATH:" != *":$PREFIX:"* ]]; then
  echo "==> Add this to your shell profile:" >&2
  echo "export PATH=\"$PREFIX:\$PATH\"" >&2
fi

echo "==> Done. Try: pith --help"
