# Cycle 32 pick 1: port-proof

Branch `feat/port-proof`, cut from main `c851715be`.

## What changed

- **Fresh session per Move to app** (`agent/lean-run.ts` `toDriverContext`, `agent/lifecycle.ts`). A port run (`task: "port"`) gets a driver context with `sessionId: null`, so the SDK and the mock start a new session. The new id is stored on the app direction as usual. Normal chat runs on the app direction still resume. `lifecycle.ts` shrank from 1074 to 1058 lines (`priorSessionFor` and `leanDriverContext` removed; the prior session is read from the driver context).
- **Studio check on any write** (`agent/port-review{,-snapshot}.ts`, `agent/port-start.ts`, one line in `agent/sdk-driver.ts`).
  - `port.start` takes a git tree snapshot of the app with the existing helper, before the run starts. It adds `<port-start tree="..." />` to the run prompt.
  - `toPortGaps` (async, replaces `toPortReviewGaps`) returns the gaps when an edit tool ran, or when a plan route file differs from the start tree (`git diff-tree --relative`). So a Bash heredoc write gets the first check, the values pass and keep-best.
  - `sdk-driver.ts` stays at 1622 lines; only the call changed to `await toPortGaps(...)`.
- **`apply_port` in the run** (new `agent/tool-groups/port-apply-call.ts`, used by `agent/tool-groups/agent-only.ts`).
  - `toPortRunCaller` wraps `runActionCaller`. For `port.apply` in a port run, it takes `projectId`, `directionId` and `path` from the run's `<port-check>` tag, sets `targetProjectId` to the run project, and calls `runConfirmedAgentTool` in the app run scope. This is the same path as the studio values pass. Other actions call `runActionCaller` as before.
  - `toPortRunTool` narrows the `apply_port` tool input to `routePath` in a port run, so the SDK accepts a call with only `routePath`.
  - The `apply_port` `short` text now ends "In a Move to app run, pass only routePath." (149 chars). `gen-routes` ran; it changed no file.
- **Base version hold for port runs** (`http/app-runs-routes.ts`, `http/app-routes.ts`). This was not in the spec; I found it in the first real run. A freshly attached app has no saved version, so during the first Move to app `DirectEditWriter` refused every write with `no_base_version`. This blocked the studio values pass and the agent `apply_port`. The port run now goes through the same first-version hold as the edit routes (`holdEditsForFirstVersion`, now exported), then starts with the saved direction.
- Mock tags in `agent/mock-port.ts`: `[port-bash]` writes the route with a Bash tool event only. `[port-apply]` makes the mock agent call `apply_port` with only `routePath`, through `toPortRunCaller`.

## Cause of the refusal (reproduced, `cycle-32/port-proof/repro-head-apply.txt`)

On HEAD the in-run `apply_port` does not reach the right pair. `runActionCaller` (`toScopedArgs`) overwrites `projectId` and `directionId` with the app run scope. So the action compares the app project against itself, at the prototype path:

- With the run's ask gate allowed: `{"applied":[],"scoreAfter":13,"scoreBefore":13}`. Nothing is written.
- With no ask answer: "This action needs the user to allow it". The user is asked a second time.

The cycle-31 `run_in_progress` did not reproduce. On a fresh app the write also meets `no_base_version` (see above).

## Checked

Fixture: `ds-wt/pp-next-tw`, built from scratch.
- Next 16.4.1 and Tailwind 4.2.2. `node_modules` is a dereferenced copy of the closure from the Bonaparte pnpm store, read only. `ds-wt/rf-new-tw` no longer exists.
- The route copy was taken before the app change. The cycle-29 prototype page was put in the copy, then the cycle-30 run-2 files were put in the app.
- `port.inspect` with no model gave a start score of **65** (top center 26, top left 75), on each copy.

No model (mock driver, `cycle-32/port-proof/mock-runs.txt`):
- **Bash-only write:** `[port-bash]` on a fresh app gets the studio check and the values pass: **65 -> 95**, 8 values written, keep-best kept 95. Tools: `Bash` only.
- **Before the hold:** the same run on a fresh app got no values pass. The debug line was `This direction has no saved version yet`.
- **Fresh session** (`session-proof.txt`): two Move to app runs on one app log `resume: null` and 2 new session ids. The stored id changes each time. A chat run after them resumes the stored id.
- **Agent `apply_port`:** `[port-apply]` with only `routePath` returns `applied` with 8 items, and no `run_in_progress` or approval refusal. The studio check after it starts at 95.
- **`call-action.ts port.apply`** (`call-action-apply.txt`): HTTP 65 -> 95 with 8 writes. MCP ran second, so it had nothing left to write (95 -> 95). The agent route stops at the confirm gate, because a script has no approval prompt. All three are as in cycle 31.

Real model (local sign-in, Sonnet 5.5, 2 runs, `real-runs.txt`). The task cap was 2 runs, so there was no main run. The main baseline is the cycle-31 main run: 69 first, 1 loop, 99 final, $0.150.

| Run | Code | Session | First studio score | Values pass | Loops | Final | Kept text edited | Data reads | Sample rows | Time | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | branch before the hold | new (`resume: null`) | 69 | refused (`no_base_version`, found later) | 1 | **96** | no | 2 kept | 0 | 26 s | $0.135 |
| 2 | branch | new: the stored run-1 session was **not** resumed | none | none | 0 | 65 (agent `inspect_port`) | no | 2 kept | 0 | 18 s | $0.103 |

- Run 1 wrote with `Edit`. Its 2 Bash `sed -i` writes failed, because macOS `sed -i` needs a suffix argument. Final score 96 passes the 80 gate, but through the fix loop, not the values pass.
- Run 2 had the note "call apply_port, then inspect_port" only inside the prototype source. The agent did not load `apply_port` (it is behind `ToolSearch`). Its one Bash write (`sed -i`) failed again, so no route file changed. So, correctly, no studio check ran (`finalCheck` null). The agent stopped at 65.
- UI: `cycle-32/port-proof/run-note-{dark,light}.png` show the run note of the fresh-app Bash-only mock run, "Matches the prototype: 95%".
- `pnpm run typecheck` passes. `pnpm run lint:gate` passes (59618, baseline 89733). `pnpm run build:ui` passes. `gen-routes --check` passes.

## Files outside the owned list

- `agent/lean-run.ts`: `toDriverContext`. `lifecycle.ts` was at the 20 import limit, so it could not import `PORT_TASK`.
- `agent/sdk-driver.ts`: one call line. No other pick owns it, and the line count did not change.
- `http/app-runs-routes.ts` and `http/app-routes.ts`: the base version hold.
- New: `agent/tool-groups/port-apply-call.ts`.
- `.claude/goal/roadmap.md` is not in the worktree, so no Appendix A globs were added.

## Left out

- **The real-model gate is not proven:** "studio score 80 or more after the values pass, and the agent's `apply_port` returns `applied`".
  - Run 1 found the base version bug. The fix has only the no-model proof.
  - In run 2 the agent wrote nothing and did not call `apply_port`.
  - The next real run needs a fresh app copy and the merged code. To test `apply_port`, the prompt must ask for it, for example as a queued user message.
- `port-start.ts` is at 499 lines (limit 500).
- The snapshot still writes loose git objects into the app repo (runner-up 5).
- The Bash `sed -i` failure on macOS is a model habit, not a studio fault. The studio could tell the agent to use `Edit`; not done.
