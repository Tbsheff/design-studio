# Cycle 21 pick 5: state-queue

Branch `feat/state-queue`.

## Built

- New action `run.startStates` (`POST /api/projects/:projectId/runs/states`, MCP `start_states_run`, agent `{ off: "run-control" }`). Input: `projectId`, `section`. It finds the state board in the section, runs the state check once, and starts a server sequence of the states that look like the default. Output: `{ sequenceId, section, items: [{ state, stateName, frameId, runId, status }] }`. `sequenceId` is `states-<section id>`, so a reload or a second window finds it. A second start while it runs: `Conflict`.
- New action `run.getStates` (`GET /api/projects/:projectId/runs/states/:sequenceId`, MCP `get_states_run`).
- Server: `run-log/state-run-queue.ts` (`StateRunQueue`, write, forks the loop with `Effect.forkDetach`), `state-run-store.ts` (`StateRunStore`, read), `state-run-map.ts` (the in-memory map), `state-run-steps.ts` (the loop), `engine/to-next-state.ts` (pure). After a run ends with `completed`, the loop checks only the next frame (2 captures) and skips it when it no longer looks like the default. A failed or canceled run ends the sequence and sets the rest to `stopped`. Each change announces `run.getStates` on the action-done stream, so every window refetches (no polling in the UI).
- `run.stop` also drops the waiting states of the sequence that holds the run (also between runs, when the run is no longer active). Descriptions of `run.stop` and `canvas.inspectStateFrames` changed.
- UI: `use-state-check.ts` calls `run.startStates`, reads `run.getStates`, Stop calls `run.stop`. `use-state-runs.ts` is gone. `ask-chat.ts` lost the run-end store and the stop signal (nothing else read them), and `use-selection-prompt-run.ts` lost the code that fed them.

## Checked

- Fake Next app attached by url, board `s1` with 2 states. HTTP start: run 1 frame f3 "frame state Loading (loading)", run 2 frame f4 "frame state Empty data (empty)" in the canvas context. Gap between runs: 494 ms.
- Stop on run 1 (`POST .../runs/:runId/cancel`): run 1 `stopped`, run 2 never started.
- MCP: `start_states_run`, then a second call: `Conflict`; `get_states_run`: both `done`.
- `call-action.ts run.getStates`: pass (http, mcp; agent off). `call-action.ts run.startStates`: http starts, mcp gets `Conflict` (the duplicate check), so the script reports a diff by design.
- UI (playwright, mock agent, states named with `[slow]`): line "Designing Slow [slow] (1 of 2)…" with Stop 834 ms after the click. Reload: the line still shows 1 of 2. Then 2 of 2, then the check line comes back.
- Sequences started with no UI open (MCP) run to the end, so a closed project does not stop them.
- `pnpm run typecheck`, `pnpm run lint:gate` (pass, 59663, baseline 89733), `pnpm run build:ui`: pass.
- Screenshots: `cycle-21/state-queue/sequence-{dark,light}.png` (light is after a reload).

## Left out and notes

- The skip rule is not proven live: the mock agent changes nothing that the static page shows.
- A server restart drops every sequence (in-memory; the descriptions say so).
- `check:actions` warns O12 on `run.getStates` (array output with no `limit`). The list has at most 8 states (the board max), as `canvas.listFrameStates`. Other `check:actions` failures (E16) are on `main` already.
- `artifacts/mcp-snapshots/*.json` not changed: new `start_states_run`, `get_states_run` and the `stop_run`, `inspect_state_frames_canvas` description diffs wait for approval at merge.
- The run waits by polling `runner.isRunning` for the direction every 250 ms on the server, then reads the run summary; the runner keeps run handles after a run ends, so `runner.get` cannot tell.
- The chat agent has no path (spec: `run-control`).
