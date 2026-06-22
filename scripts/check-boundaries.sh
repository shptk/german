#!/usr/bin/env bash
#
# Architecture boundary gate (CI + `npm run check:boundaries`).
#
# Two rules from DESIGN.md §3.2 / §4:
#   1. The engine is PURE: no framework, storage, DOM, or wall-clock.
#   2. Storage concretes (IndexedDB, idb, Drive REST, Google auth) live ONLY
#      under src/lib/persistence/.
#
# We scan code lines only — comment lines (starting with * // or /*) are
# filtered out, so documentation may freely mention these tokens. grep exits 1
# on no-match (the success case), so matches are captured and length-checked.

set -uo pipefail
cd "$(dirname "$0")/.."

fail=0

ENGINE_FORBIDDEN='svelte|\bidb\b|indexedDB|localStorage|sessionStorage|Date\.now|\bwindow\b|\bdocument\b|\bfetch\(|google\.accounts|/drive/v3|appDataFolder'
STORAGE_FORBIDDEN='\bidb\b|indexedDB|appDataFolder|google\.accounts|/drive/v3'

# scan <pattern> <dir...> -> prints offending CODE lines only.
# Comments are ignored: pure-comment lines (* // /*) are dropped, trailing
# line-comments are stripped, then the pattern is re-matched on what remains.
scan() {
  local pattern="$1"
  shift
  grep -rEnI "$pattern" "$@" 2>/dev/null \
    | grep -vE ':[0-9]+:[[:space:]]*([*]|//|/[*])' \
    | sed -E 's://.*$::' \
    | grep -E "$pattern" \
    || true
}

m=$(scan "$ENGINE_FORBIDDEN" src/lib/engine)
if [ -n "$m" ]; then
  echo "✗ boundary: src/lib/engine must stay pure (no framework/storage/DOM/clock):"
  echo "$m"
  fail=1
fi

m=$(scan "$STORAGE_FORBIDDEN" src/lib/engine src/lib/content src/lib/components src/lib/stores src/lib/router src/routes)
if [ -n "$m" ]; then
  echo "✗ boundary: storage concretes may only appear under src/lib/persistence/:"
  echo "$m"
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo "✓ boundaries OK (engine pure; storage confined to persistence/)"
fi

exit "$fail"
