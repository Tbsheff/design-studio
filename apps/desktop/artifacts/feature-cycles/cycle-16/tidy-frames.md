# Cycle 16 pick 5: tidy-frames

Branch `feat/tidy-frames`. Commits: `201242e56` (server), `85d39fff7` (UI), and this report.

## What works

- **Action `canvas.moveFrames`:** `POST /api/projects/:projectId/canvas/frames/tidy`, edit, `studio.write`, scope project, MCP and agent `move_frames_canvas`. Input: `frames` (ids or `@labels`, or null), `section` (id or null), `layout` (`tidy`, `row`, `grid`, default `tidy`), `gap` (default 80, 0 to 2000), `directionId`. Output: `{ layout, movedFrames: [{ id, x, y }], note, section }`. `invalidates`: `canvas.getDoc`, `canvas.inspect`.
- **Engine** `canvas/frame-tidy/engine/to-tidy-frames.ts` (pure): finds rows by vertical overlap and sorts each row by x. `tidy` keeps the rows. `row` makes one line. `grid` tries every column count and picks the box nearest to a square. The group keeps its top-left. A section tidy places the frames at the section pad (48, 64) and fits the section to them.
- **Writer** `FrameTidyWriter` (`canvas/frame-tidy/`, write), wired in `handlers/canvas/live.ts`. It makes one `canvas.update` with source `agent`. This gives one `canvas.json` write and one layout undo step ("Undid move 8 frames"). `layout-history.ts` did not change.
- **UI:**
  - "Tidy up frames" in the command palette.
  - "Tidy up frames" in the frame "..." menu.
  - `Ctrl+Alt+T` when no layer is selected. With a layer selected, the key stays the inspector layer tidy.
  - The target is the section that holds the frame (the clicked frame or the active frame). If no section holds it, the target is all frames.

## Checked

- **8 uneven frames** (UI palette): 2 rows, 80 px gaps, order kept. `links.json` is byte-identical before and after. Cmd+Z restored every old place in one step.
- **`Ctrl+Alt+T`:** gave the same result.
- **Frame menu on a frame outside the section:** tidied all frames.
- **Section `s1` with 4 frames** (call-action): only those 4 moved, and the section fits them (1896 x 812). The 4 frames outside stayed.
- **`grid`, 7 frames, gap 40:** 4 x 2 (1680 x 1440). The 8th frame stayed.
- **Errors:** frames together with section gives `BadRequest`. An unknown `@label` gives `NotFound`.
- **`call-action canvas.moveFrames`:** pass on HTTP, MCP and agent, 0 diffs (section and grid runs).
- **Gates:** `pnpm run typecheck` passes, `pnpm run lint:gate` passes (59683 under baseline 89733), `pnpm run build:ui` passes, and `gen-routes --check` is clean.
- **Screenshots** in `cycle-16/tidy-frames/`: `before-dark.jpg`, `after-dark.jpg`, `section-dark.jpg`, `grid-mcp-light.jpg`, `after-light.jpg`.

## Changes from the spec

- **Agent set `core`, not `app`.** `app` loads only for app projects, so in an HTML project the chat agent would not see the tool.
- **2 files outside the owned list:**
  - `canvas/frame-more-menu.tsx`: 3 lines that mount the menu entry.
  - `canvas/canvas-body.tsx`: 4 lines that mount `useTidyFrames`.
- **New event file** `ui/domain/tidy-frames-events.ts`. The palette fires the event, as copy-png does, so `commands/` does not import `canvas/`.
- **No new key.** The shortcut reuses the `tidy-up` key (`Ctrl+Alt+T`).
- **Test server.** Vite has a fixed port of 5173 and proxies to 4170, so the test server ran from a launcher outside the repo. The launcher used `createServer({ uiDir: dist/ui })` on port 4370 with MCP on 4791.

## Left out

- Shift-click to pick frames for a tidy. The spec puts it out of scope.
- A notice for a failed tidy from the UI. The error goes to `reportError`.
- The MCP snapshot for `move_frames_canvas`. Its approval belongs to the merge step.
- `check-actions` fails on old E16 legacy-list entries. None of them is in this pick.
