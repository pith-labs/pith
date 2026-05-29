#!/usr/bin/env bash
set -euo pipefail

input="${1:-}"
if [[ -z "$input" ]]; then
  exit 0
fi

echo "[pith-guard] focus on deterministic rust changes + validation: $input"
