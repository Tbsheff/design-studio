# Cycle 17 pick 1: frame-select

Branch `feat/frame-select`. Commits: `e2665a7b1` (action), `abc39b1ae` (UI), and this report.

## Built

- Added `canvas.deleteFrames` (`delete_frames_canvas`, agent set `core`). It removes 1 to 50 frames (ids or `@labels`) in one `canvas.update`, so one undo step brings all of them back. The page files stay. It refuses to remove every frame. The approval card lists each frame label.
- Added frame selection to the canvas:
  - Shift-click a label: adds or removes the frame.
  - Drag on empty canvas: draws a box and selects each frame it touches. Shift+drag adds to the selection.
  - Cmd+A selects all frames. Esc clears them. A plain click on a frame clears them.
  - Selected frames get an accent outline and an accent label. The group shows "N frames".
  - Drag a selected label: the group moves as one write, which is one undo step. Snap uses the group bounds.
  - Arrow keys nudge the group. Delete or Backspace removes it, with one "N frames removed. Undo" toast.
  - Ctrl+Alt+T tidies only the selected frames when 2 or more are selected.
  - A frame selection and a layer selection clear each other.
- Fixed the undo toast timer. It reset on every render, so the toast never closed.

## Changed from the spec

- **HTTP route.** The route is `POST /api/projects/:projectId/canvas/frames/delete`, not `DELETE .../frames/many`. A DELETE input is read from the query string, and the runner cannot decode an array from it (`Expected array at ["frames"]`).
- **Write path.** UI moves and deletes use the same path as the single-frame UI today: `canvasStore.set`, then a doc write. They do not call `canvas.updateFrame` or `canvas.deleteFrames`. Each write records one layout undo step.
- **Nudge steps.** They are 10 px, or 100 px with Shift. These are the steps that `toNudgeStep` uses for one frame today, not the 1 px and 10 px in the spec.

## Checked

- HTTP: 2 frames removed, and history undo brings both back.
- `call-action.ts canvas.deleteFrames` (`call-action-1.txt`): HTTP passes. MCP and the agent then get `NotFound`, because HTTP already removed the frames. This is the same limit as other write actions in cycle 16.
- MCP alone, on fresh frames (`call-mcp.txt`): passes. The approval card was answered, and the chat shows "Remove 2 frames: f2 (A), f3 (B)".
- Agent path (`call-agent.txt`): reaches the gate. It answers "needs the user to allow it", because a script caller has no approval prompt.
- UI, in Chrome (6-frame project):
  - Shift-click 3 labels: 3 outlines and "3 frames" show.
  - Drag the group: only those 3 move. Cmd+Z: "Undid move 3 frames".
  - Box over 4 frames, then Delete: the toast shows "4 frames removed", and Cmd+Z brings all 4 back.
  - Ctrl+Alt+T: only the 3 selected frames move.
  - Cmd+A selects 6 frames. Esc clears them. Arrow keys nudge only the selected frames.
- Screenshots: `frame-select/select-3-{dark,light}.png` and `frame-select/marquee-{dark,light}.png`.
- `pnpm run typecheck`: pass. `pnpm run lint:gate`: pass. `pnpm run build:ui`: pass.
- `pnpm run check:scripts`: fails, and it fails on `main` at `35b6f633c` too (old O12 and E16 rows in check-actions). No row names a file from this pick.

## Left out

- The undo label for a multi-frame removal is "Change canvas frames", not "Remove N frames". The removal changes `order` on the frames that are left, so the label code counts 2 kinds of change. This also happens with a single-frame removal.
- The removal toast stays up after a Cmd+Z undo. This also happens with a single-frame removal.
- No chat-agent prompt run. The mock agent does not choose tools. The agent surface is proven through the agent tool route.
