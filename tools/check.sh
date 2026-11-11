#!/usr/bin/env bash
# Repo checks: run locally or in CI (.github/workflows/checks.yml). Exits non-zero on any failure.
set -euo pipefail
cd "$(dirname "$0")/.."
fail() { echo "FAIL: $*" >&2; exit 1; }

echo "== Headless sim runs =="
for page in projects/*/index.html; do
  if grep -q "function step(" "$page"; then
    echo "-- $page"
    out=$(node tools/headless.js "$page" 20000 5000) || fail "$page crashed in headless run"
    echo "$out"
    last=$(echo "$out" | grep -E "^ *[0-9]+ pop " | tail -1)
    pop=$(echo "$last" | awk '{for(i=1;i<NF;i++) if($i=="pop") print $(i+1)}')
    [ -n "$pop" ] && [ "$pop" -gt 0 ] || fail "$page: population is empty after 20000 ticks"
  fi
done

echo "== Harness rejects bad input =="
if node tools/headless.js README.md >/dev/null 2>&1; then fail "headless.js accepted a page without step()"; fi
echo "ok"

echo "== Pages only load allowed CDNs =="
bad=$(grep -rhoE '<script[^>]+src="https?://[^"]+"' --include=*.html . | grep -vE 'cdnjs.cloudflare.com|cdn.jsdelivr.net|unpkg.com' || true)
[ -z "$bad" ] || fail "unexpected external scripts: $bad"
echo "ok"

echo "== Repo size under 50 GB =="
kb=$(du -sk --exclude=.git . | cut -f1)
echo "${kb} KB"
[ "$kb" -lt $((50 * 1024 * 1024)) ] || fail "repo working tree is over 50 GB"

echo "All checks passed."
