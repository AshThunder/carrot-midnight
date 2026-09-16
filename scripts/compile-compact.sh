#!/usr/bin/env bash
set -euo pipefail
source "${HOME}/.local/bin/env" 2>/dev/null || true
# Prefer versioned toolchain so compactc.bin resolves correctly
COMPACT_VER_DIR="${COMPACT_DIRECTORY:-$HOME/.compact}/versions/0.31.1"
if [[ -d "$COMPACT_VER_DIR" ]]; then
  ARCH_DIR=$(ls -d "$COMPACT_VER_DIR"/*-linux* 2>/dev/null | head -1)
  if [[ -n "${ARCH_DIR:-}" ]]; then
    export PATH="$ARCH_DIR:$PATH"
  fi
fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/contracts/carrot-game.compact"
OUT="$ROOT/contracts/managed/carrot-game"
mkdir -p "$OUT"
echo "Compiling $SRC -> $OUT"
exec compactc "$@" "$SRC" "$OUT"
