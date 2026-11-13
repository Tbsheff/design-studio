# Cycle 20 pick 3: state-runs

Branch `feat/state-runs`.

## Built

- "Design missing states" now starts one run per state, one after the other. Each run makes its state frame the active frame first, so the run's canvas frame is that frame. Prompt: "Design the Loading state of /visits. Change only the code for this state."
- While a sequence runs, the section line shows "Designing Loading (1 of 4)…" and a Stop button in place of the Design button.
- When a run ends with `completed`, the hook reads `canvas.inspectStateFrames` again and starts the next state that still looks like the default (a state that now differs is skipped). Then it refetches the line.
- A run that fails or is canceled ends the sequence. The line adds "<state> did not finish". Stop cancels the current run (also a run that has not shown up yet) and drops the rest.
- The sequence lives in the UI session only (the button tip says so).
- `canvas.inspectStateFrames` description: names the headless loop (`start_run` per item with `isSameAsDefault` true, `canvas` set to its frame, `get_run` to wait). No new action.

Files: `canvas/{state-run-model.ts (new), use-state-runs.ts (new), use-state-check.ts, state-check-model.ts, state-check-line.tsx, copy.ts}`, `ui/app/studio/use-selection-prompt-run.ts`, `ui/platform/ask-chat.ts`, `actions/canvas/inspect-state-frames.ts`.

## Checked

- Fake Next app attached by url (static `/visits` page, no fetch, no auth): all 4 states look like the default. Mock agent: "Design missing states" ran 4 runs in turn with canvas frames f3, f4, f5, f6. Each run log says "frame state Signed in (session)", "Empty data (empty)", "Loading (loading)", "Error (error)". The line counted 1 of 4 to 4 of 4, then the check ran again.
- Stop during run 1: cancel sent, run status `canceled`, run 2 did not start, line says "Signed in did not finish". Stop during run 2 (earlier try): the same.
- MCP: `inspect_state_frames_canvas`, then `start_run` with `canvas: { frameId: "f5", ... }`: the run log has "frame: f5 \"Loading /visits\" ... frame state Loading (loading)". The `start_run` `canvas` field carries the frame id that `run-target.ts` reads, so no input change.
- `call-action.ts canvas.inspectStateFrames`: pass, 3 surfaces, 0 diffs.
- `pnpm run typecheck`, `pnpm run lint:gate` (pass, 59646 diagnostics, baseline 89733), `pnpm run build:ui`: pass.
- Screenshots: `cycle-20/state-runs/sequence-{dark,light}.png` (line during a sequence), `stopped-light.png` (after Stop).

## Left out and notes

- The skip rule (a state that no longer looks like the default) is not proven live: the mock agent changes nothing that the static page shows. It is in `toNextStepIndex` in `state-run-model.ts`.
- `ui/platform/ask-chat.ts` was changed (not in the pick list): canvas cannot import chat or `ui/app` (U7), so it holds the run-end store and the stop signal.
- The chat agent has no path to this: `start_run` is `agent: { off: "run-control" }`.
- `artifacts/mcp-snapshots/*.json` is not changed. The `inspect_state_frames_canvas` description diff waits for approval at merge.
- In the screenshots the active frame's label bar sits under the section line at 15% zoom. That is old layout, not from this pick.
- Pick 1 (`feat/safe-frame-remove`) imports only `isStateBoardSection` and `toBoardFrameId` from `state-check-model.ts`. Both stay. `StateCheckView` lost `prompt` and `targetId` (now `plan`); pick 1 reads neither.
- Each step reads the state check about 3 times (the next-step read, the line refetch, the head-version recheck). Each read captures 5 frames, so there is a gap of some seconds between runs.
- The sequence lives in the `StateCheckLine` hook. The sections layer does not cull off-screen sections, so a pan does not stop it.
