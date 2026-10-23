#!/bin/zsh
set -u
cd "$(dirname "$0")/../.."
for port in 4570 4571; do
  for pid in $(lsof -nP -iTCP:$port -sTCP:LISTEN -t 2>/dev/null); do
    kill -TERM -$pid 2>/dev/null || kill -TERM $pid 2>/dev/null
  done
done
sleep 1
mkdir -p verification/ac-safety-evidence/logs
name="${1:-all}"
shift
STUDIO_E2E_GROUP=safety STUDIO_E2E_PORT_OFFSET=300 npx playwright test -c playwright.ac-safety.config.ts "$@" > "verification/ac-safety-evidence/logs/$name.log" 2>&1
code=$?
grep -E "✓|✘|passed|failed|Error:|\[latency\]" "verification/ac-safety-evidence/logs/$name.log" | head -40
for pid in $(lsof -nP -iTCP:4570 -sTCP:LISTEN -t 2>/dev/null); do kill -TERM $pid 2>/dev/null; done
exit $code
