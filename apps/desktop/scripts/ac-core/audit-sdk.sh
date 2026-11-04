#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/../.."
status=0
section() { printf '\n== %s\n' "$1"; }
expect_none() {
  local label="$1" pattern="$2"
  local hits
  hits=$(grep -rnE "$pattern" src --include='*.ts' --include='*.tsx' | grep -v '/templates/' || true)
  if [ -n "$hits" ]; then
    printf 'FAIL %s\n%s\n' "$label" "$hits"
    status=1
  else
    printf 'ok   %s: no matches\n' "$label"
  fi
}
section "imports of any model client other than the Agent SDK"
expect_none "@anthropic-ai/sdk import" "from ['\"]@anthropic-ai/sdk"
expect_none "openai / langchain / google genai / mistral / cohere / ollama" "openai|langchain|generativeai|@google/genai|mistralai|cohere|ollama"
expect_none "direct HTTP to the API" "api\\.anthropic\\.com|/v1/messages|messages\\.create\\("
expect_none "spawn of the claude CLI outside the SDK" "spawn\\(['\"]claude|execFile\\(['\"]claude"
section "package.json model dependencies"
node -e "const p=require('./package.json');const all={...p.dependencies,...p.devDependencies};const hits=Object.keys(all).filter(n=>/anthropic|openai|genai|langchain|mistral|cohere|ollama/i.test(n));console.log(hits.join(', '));if(hits.length!==1||hits[0]!=='@anthropic-ai/claude-agent-sdk'){process.exitCode=1}" || status=1
section "files that import the Agent SDK"
grep -rlnE "@anthropic-ai/claude-agent-sdk" src --include='*.ts' | sort
section "runtime imports (not type-only)"
grep -rnE "import\\(['\"]@anthropic-ai/claude-agent-sdk|^import \\{[^}]*\\} from ['\"]@anthropic-ai/claude-agent-sdk" src --include='*.ts' | grep -v "import type" || true
section "agent driver selection"
grep -nE "agentMode|createSdkDriver|createMockDriver" src/server/agent/index.ts src/server/config.ts
section "installed SDK version"
node -e "console.log(require('./node_modules/@anthropic-ai/claude-agent-sdk/package.json').version)"
printf '\nresult: %s\n' "$([ $status -eq 0 ] && echo PASS || echo FAIL)"
exit $status
