# Cycle 19 pick: state-check

Branch `feat/state-check`.

## Built

- Added action `canvas.inspectStateFrames` (GET `/api/projects/:projectId/canvas/state-frames`, MCP and agent tool `inspect_state_frames_canvas`, agent set `app`). Input: `projectId`, `frame` (any frame of the board or its page, id or `@label`), `threshold` (decoding default 0.98). Output: `{ items: [{ frameId, label, state, stateName, similarity, isSameAsDefault }], page }`. The first item is the default frame. Errors: `BadRequest`, `Conflict`, `NotFound` (the full union of the two read services).
- Added `server/canvas/state-frames/state-check-store.ts` (`StateCheckStore`, `access: "read"`), `state-check-ops.ts` (board read, full-size pixel diff with pixelmatch threshold 0.02) and the pure engine `engine/to-state-likeness.ts` (board pick and threshold rule).
- The handler yields `StateCheckStore` and `McpReadStore` (both read). Each frame is captured through `McpReadStore.screenshot` (the `get_screenshot` path, which applies the frame state), one at a time. No file writes.
- UI: `canvas/{state-check-model.ts,use-state-check.ts,state-check-line.tsx}`. The `/<page> states` section label shows "1 of 4 states looks like the default: Signed in" and a "Design missing states" button. The button makes the first matching frame active, then sends the prompt through `sendSelectionPrompt` (the platform path that `ui/app/studio` already serves), so the run's canvas frame is that state frame. A re-check runs when `headVersionId` changes; no timer.

## Checked

- Fake app (`ds-wt/state-check-app`, client fetch of `/api/visits`, skeleton, list, error text, no empty text) attached by url. Result: Signed in 1.0 (same as default), Empty 0.751, Loading 0.745, Error 0.739. Line: "1 of 4 states looks like the default: Signed in". Screenshots: `cycle-19/state-check/board-look-{dark,light}.png`.
- "Design missing states" with the mock agent: run request has `canvas.frameId f3` ("Signed in /visits"), and the canvas context says "frame state Signed in (session)", "page file: app/visits/page.tsx".
- `call-action.ts canvas.inspectStateFrames` with `@Loading /visits`: pass, 3 surfaces, 0 diffs. 5 captures: HTTP 3.9 s cold (about 0.8 s per capture), MCP 0.63 s and agent 0.62 s warm.
- HTML project board: all 4 states "Same as default" (similarity 1), as expected.
- Unknown frame and a page with no board give `NotFound`. A failed read hides the line: a hand-made `/x states` section around a frame with no board got a 404 and showed no line.
- Re-check: the mock design run saved the first version (head went from null to `1709a7e`), and the UI sent one more `GET .../canvas/state-frames` after `POST .../runs`.
- `pnpm run typecheck`, `typecheck:tsrs`, `lint:gate` (pass, 59653 diagnostics, baseline 89733), `build:ui`, `gen-routes --check`: pass.

## Left out and notes

- The spec expected "Empty shows Same as default" on the fake app. It does not: the empty mock removes the list, so the pixels change (0.751). The rule flags only states whose mock changes nothing on the page; here that is Signed in, because the fake app has no auth. So "Design missing states" asks for the Signed in state. This is how the threshold rule works, not a bug.
- An attached app in url mode with no head version (cycle-18 note) gets no version re-check until its first version is saved.
- The per-frame "Same as default" note: the `note` prop of passive frame labels comes from `frame-label-state.ts` and `canvas-wiring-inputs.ts` (pick 1 files). The section line names the matching states instead.
- `consoleErrors` per item: the screenshot path does not collect console errors, and a second page load per state doubles the time. Not added.
- `focusPaths`: the selection-prompt run sends none. For app routes the frame-focus model maps no files anyway (HTML pages only); the run's canvas frame and its state carry the target.
- The diff from `preview/picture-diff` (`diffPictures`, 480 px, threshold 0.15) rated a skeleton and an error box at 0.997 to 0.999 against the list, so the ops file runs pixelmatch at full size with threshold 0.02.
- Files touched outside the pick list: `server/canvas/index.ts` (one export line), `ui/features/canvas/{canvas-section.tsx,canvas-sections-layer.tsx,stage-frames.tsx}` (pass `headVersionId` and `projectId` down), `section-label.tsx` (a `children` slot), `ui/styles/canvas-sections.css` (line and button styles). `handlers/canvas/live.ts` also provides `McpReadStore.layer`.
- Bonaparte: no live dashboard run (it needs a database). Used the fake app.
- `artifacts/mcp-snapshots/*.json` is not changed; approve `inspect_state_frames_canvas` at merge.
