# Pick 5: guide-context

## Changed

- Added `src/server/agent/guide-text.ts`. It filters the canvas guides that cross a frame, converts them to frame-local px, and writes the clause `, guides x 80, y 200 (frame-local)` after the layout grid clause.
- Changed `src/server/agent/run-target.ts`. It reads `canvas.guides` and puts the frame-local guides on the run frame and on each frame in view.
- Changed line 194 of `src/server/agent/user-message.ts` in place, and changed the import on line 27. The file stays at 497 lines.
- Changed `src/shared/run-target.ts`: `TargetFrame` gets `guides`. This file was not in the owned list. It is a one-line type change, and no other pick edits it.
- Changed `src/ui/features/canvas/ruler-guide-model.ts`: `snapGuideToFrames` calls `snapRect` with an "end" edge on each guide axis. It snaps to the left, center and right edges (or top, middle and bottom) of the shown frames within 6 screen px, and rounds the value to a whole canvas px.
- Changed `src/ui/features/canvas/use-ruler-guides.ts`: it snaps on each pointer move unless Cmd or Ctrl is held. It shows the red line through `frameSnapStore` and clears it at the end of the drag.

## Verified (mock agent, port 4850)

- Ran call-action `canvas.setGuides` and `canvas.inspect` (`canvas_list`): pass on HTTP, MCP and agent, with the same guides on each.
- Ran a mock run on f1 with guides x 80 and y 200. The prompt has `frame: f1 ..., guides x 80, y 200 (frame-local)`, and the in-view frames have `guides y 200`. With only x 80, f2 has no guides clause.
- Dragged a vertical guide from the ruler to 1500 at 17% zoom. It saved as 1520 (the left edge of f2) and showed the red line.
- Ran synthetic pointer drags at 1518 with metaKey: the guide stays at 1518. The browser tool does not hold Cmd during the move, so this check used synthetic events.
- Tested zoom at 17%, 21%, 99% and 193%: the guide snaps to 1520 within 6 screen px and not beyond that.
- Took screenshots: `cycle-22/guide-context/guide-snap-dark.jpg` and `guide-snap-light.jpg`.
- Ran `pnpm run typecheck`: pass. Ran `pnpm run lint:gate`: pass. Ran `pnpm run build:ui`: pass.

## Left out

- The mock agent text path in `server/canvas/tools.ts` (out of scope by the spec).
- `.claude/goal/roadmap.md` Appendix A: the file is not in the worktree (it is gitignored), and no active slice is set.
