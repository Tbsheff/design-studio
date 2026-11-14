# Cycle 28 pick 3: run-wait

Branch `feat/run-wait`. `get_run` now waits for the run to end and returns only new events.

## What changed

- `run.get` input:
  - Added `waitSeconds`: Int, 0 to 120, default 0.
  - Added `afterEvent`: Int (0 or more) or null, default null.
  - Both fields use `withDecodingDefaultKey`.
- `run.get` output: added `eventCount`, which is the count of all events, not of the returned slice.
- Descriptions:
  - Changed `run.get` to the spec sentence.
  - Changed `start_run` and `start_port` to "read it with get_run and waitSeconds".
  - `create_project` does not start a run, so its text did not change.
- Added `RunWaitStore` in `server/run-log/run-wait-store.ts`. It has `access: "read"`, a cap of `WAIT_MAX_SECONDS = 120`, and is provided in `handlers/run/live.ts`.
- Added `readonly done: Promise<unknown>` to `ActiveRun` in `server/run-log/run-log-runtime.ts`. This file is outside the ownership row, and no other pick touches it.
- The handler reads the run first (this gives `NotFound` for a run of another project). Then it waits, then reads once more.
- The UI `getRun` sends no new fields, so it behaves as before.

## Decision: wait on the run handle, not on the bus

The spec asks for a wait on `run.finished` from the events bus. In `agent/lifecycle.ts`, `run.finished` is emitted before two steps:

1. `await writeChain`, which writes the summary and jsonl files.
2. The `.finally` that clears `activeRuns`.

So a read that runs right after the bus event still gets `status: "running"`. The run handle `done` promise settles only after both steps. A finished run has an already-settled `done`, so there is also no race between subscribe and check. This approach has no poll, no sleep loop and no interval.

## Checks (mock agent, raw MCP JSON-RPC client, `[slowlong]` runs of about 46 s)

| Check | Result |
|---|---|
| `waitSeconds: 60` on a running run | Returned `completed` 12 ms after `finishedAt` |
| One-call flow (`start_run`, then `get_run` with `waitSeconds: 120`) | 1 `get_run` call, 46 s, returned 8 ms after the run end |
| 2 s poll with the default fields (same as main) | 24 `get_run` calls for the same kind of run |
| `afterEvent` = mid-run `eventCount` (84) | Returned 606 new events (first seq 89, last `run.finished`), `eventCount` 690 |
| `waitSeconds: 5` on a long run | Returned after 5006 ms with `running` |
| `waitSeconds: 500` | Error: `Expected a value between 0 and 120 at ["waitSeconds"]` (BadRequest) |
| Finished run with `waitSeconds: 60` | Returned in 8 ms |
| `call-action.ts run.get` with both fields | HTTP ok, MCP ok, 0 diffs. The agent surface is skipped (`off: run-control`) |
| `typecheck`, `lint:gate`, `build:ui` | Pass. `lint:gate`: 59615 diagnostics, baseline 89733 |
| `gen-routes --check` | Clean |

Bytes of the last `get_run`:

- Default fields (same as main): 300386 bytes.
- `afterEvent` = `eventCount`: 50404 bytes, 0 events. The summary (parts and tool calls), `sent` and `decisions` stay in every response.
- The main baseline came from the branch with the default fields. With those fields the output is the same as main, plus `eventCount`. No server ran from the main checkout.

Screenshots (`cycle-28/run-wait/`): `run-wait-dark.png` and `run-wait-light.png`. They show the project chat with the MCP-started runs. The UI did not change.

## Left out

- **Closed MCP request does not end the wait.** That needs the abort signal in `mcp/registry.ts`, which is a W12 hand aggregator. `McpApprovalStore` has the same limit. The 120 s cap bounds the wait. A closed HTTP request should end it, because `http/mount.ts` passes `signal` to `runPromiseExit`. This was not checked.
- **No `afterEvent` for `summary`, `sent` and `decisions`.** These stay complete in every response, so a cursor call still sends about 50 KB.
- **In-app agent:** not affected, because `run.get` has `agent: { off: "run-control" }`.
- **Snapshots:** no diff, because `get_run`, `start_run` and `start_port` are in no snapshot file.
- **Roadmap:** not changed. `.claude/goal/roadmap.md` is not in the worktree, so `run-wait-store.ts` is not in Appendix A.
- **Real-model run:** not done (not needed).
