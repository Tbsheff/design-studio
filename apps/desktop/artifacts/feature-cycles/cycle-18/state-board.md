# Cycle 18 pick: state-board

Branch `feat/state-board`.

## Built

- Added action `canvas.createStateFrames` (POST `/api/projects/:projectId/canvas/state-frames`, MCP and agent tool `create_state_frames_canvas`, agent set `app`). Input: `projectId`, `frame`, `states` (null for every state except default, at most 8). Output: `{ frames: [{ id, label, state }], reusedFrames }`.
- Added `server/canvas/state-frames/` (ops, pure engine `to-state-board.ts`, index) and one `createStateFrames` method in `canvas-writer.ts`.
- Places one frame per state in a row below the frame, sized as the frame, labelled `<state name> /<page>`, inside a section `/<page> states`. Pins each new frame to its state with `applyFrameState` (the `canvas.setFrameState` path).
- Reuses earlier board frames of the same page (by state pin or label) and adds only the missing states. The section grows to cover the board.
- Added "Show all states" to the frame menu (`use-state-board.ts`, one item in `frame-label-extras.tsx`, one key in `copy.ts`).

## Checked

- Fake app (`ds-wt/state-board-app`, client fetch of `/api/visits`) attached by url: the board shows the list (signed in), the empty text, the skeleton (loading) and the error text. Screenshots: `cycle-18/state-board/state-board-{dark,light}.png`.
- Custom mock state added, then run again: 4 frames reused, 1 new frame.
- HTML route prototype: menu click places 4 frames and a section with no pins; Cmd+Z removes all of them in one step (`after-undo-dark.png`).
- MCP `create_state_frames_canvas` with `states: ["loading","empty"]` on a fresh page: 2 frames.
- `call-action.ts canvas.createStateFrames`: pass, 3 surfaces, 0 diffs.
- Unknown state gives BadRequest; unknown frame gives NotFound.
- `pnpm run typecheck`, `pnpm run lint:gate`, `pnpm run build:ui`: pass. `check:scripts` fails on old items in other files, none in this pick.

## Left out and notes

- Bonaparte: no live dashboard run (it needs a database). Used the fake app.
- Undo on an attached app in url mode records nothing, because the direction has no head version (`toRecordVersionId` returns null). This is old behaviour for every layout change there, not new to the board.
- State pins live in the data dir, so undo leaves the pins of removed frames. Redo brings the frames back with the same ids and pins.
- The menu item uses `frame-label-extras.tsx` (next to the pin item) instead of `frame-menu-model.ts`, so it has the project id with no event bus.
- `artifacts/mcp-snapshots/*.json` is not changed; approve the new tool at merge.
