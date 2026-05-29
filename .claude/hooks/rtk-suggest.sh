#!/usr/bin/env bash
set -euo pipefail

echo "Suggested checks:"
echo "- cargo test -p pith-core"
echo "- cargo run -p pith -- feedback eval --input feedback/adapter-balanced-v1.jsonl"
