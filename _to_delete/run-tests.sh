#!/usr/bin/env bash
# Run every suite and print one line each.
#
#   ./run-tests.sh              all of them
#   ./run-tests.sh v37 v38      just those
#
# The suites test the BUILD, not the template, so build first:
#   python3 build_flounder.py
#
# Playwright is expected at /tmp/node_modules (that is where the suites look).
# To set it up once:  mkdir -p /tmp && cd /tmp && npm i playwright-core jsdom
#
# Three suites (v23, v26, v28) need card images from cards.lorcast.io and will
# hang without internet. They are skipped by SKIP_NET=1.
set -uo pipefail
cd "$(dirname "$0")"

if [ ! -f flounder-search.html ]; then
  echo "No flounder-search.html — run: python3 build_flounder.py" >&2
  exit 1
fi

# tests live either beside this script or in tests/
DIR="."; [ -d tests ] && [ -n "$(ls tests/_test_*.js 2>/dev/null)" ] && DIR="tests"

if [ $# -gt 0 ]; then
  FILES=""; for a in "$@"; do FILES="$FILES $DIR/_test_${a#_test_}.js"; done
  FILES=$(echo $FILES | sed 's/\.js\.js/.js/g')
else
  FILES=$(ls $DIR/_test_*.js)
fi

pass=0; fail=0; bad=""
for f in $FILES; do
  name=$(basename "$f" .js)
  case "${SKIP_NET:-1}:$name" in
    1:_test_v23|1:_test_v26|1:_test_v28)
      printf "  %-18s skipped (needs cards.lorcast.io)\n" "$name"; continue;;
  esac
  out=$(timeout "${T:-240}" node "$f" 2>&1)
  line=$(echo "$out" | grep -o '[0-9]* passed, [0-9]* failed' | tail -1)
  if [ -z "$line" ]; then
    printf "  %-18s NO RESULT (timeout or crash)\n" "$name"; bad="$bad $name"; continue
  fi
  p=${line%% passed*}; q=${line##*passed, }; q=${q%% failed*}
  pass=$((pass+p)); fail=$((fail+q))
  if [ "$q" != "0" ]; then
    printf "  %-18s ✗ %s\n" "$name" "$line"; bad="$bad $name"
    echo "$out" | grep '✗' | sed 's/^/      /'
  else
    printf "  %-18s ✓ %s\n" "$name" "$line"
  fi
done

echo
echo "TOTAL: $pass passed, $fail failed"
[ -n "$bad" ] && { echo "Needs attention:$bad"; exit 1; }
exit 0
