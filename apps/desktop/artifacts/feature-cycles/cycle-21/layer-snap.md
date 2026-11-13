# Cycle 21 pick 4: layer-snap

Branch `feat/layer-snap`.

## Built

- A layer move or resize in the preview snaps its edges and center to the column edges and margins of its frame's layout grid, to the row step lines, and to the ruler guides that cross the frame. The threshold is `SNAP_PX` (6 screen px). The red snap guide shows the line.
- Grid lines snap only while the grid shows (Ctrl+G) and while the overlay draws them at the current zoom (`isGridVisible`, `isRowsVisible`). Guides snap only while the rulers show (`snapLineStore` is empty when the rulers hide).
- `isSnapSkipped` skips only when there are no sibling candidates and no lines, so a lone absolute card now snaps. Resize `snapSize` has the same change.
- Lines snap first, then siblings snap on the axis that is left (the cycle-20 frame-resize order).
- New: `canvas/layer-snap-lines-model.ts` (pure: frame grid and canvas guides to frame-local lines; `snapLayerRect` reuses `snapToGuides` and `toGuideMarks` from `ruler-guide-model.ts`), `canvas/use-layer-snap-lines.ts` (reads `useLayoutGridShown` and `snapLineStore`).
- Changed: `free-move-model.ts`, `free-move-controller.ts` (captures the lines once at drag start), `resize-handles-model.ts`, `resize-handles-session.ts`, `use-canvas-edits.ts` (passes the getter to both option sets).
- `snap-model.ts` is not changed. It stays at 492 lines.

## Checked

- Setup: an HTML frame at 1440 px placed at canvas (100, 60). `call-action canvas.setLayoutGrid` with 12 columns, margin 80, gutter 24 passes on 3 surfaces with 0 diffs. `canvas.setGuides` sets y = 260 (frame-local 200).
- Move of a lone absolute card, left 150 to 79: it snaps to 80 and the red line shows at x 80. With the grid off (Ctrl+G) it stays at 79. With Cmd held (the snap-off key) it stays at 79.
- Resize with the rulers on, bottom 300 to 202: it snaps to 200 and the line shows at y 200. With the rulers off it stays at 202.
- Row step 8: a resize from bottom 300 to 297 snaps to 296.
- Zoom: the same move lands on 80 at 26%, 80% and 100%. At 195%, a move to left 188 snaps to the column edge 188.67 and is written as 189.
- Screenshots: `cycle-21/layer-snap/snap-grid-guide-{dark,light}.png` show the card snapped to x 80 and y 200, with the grid and the guide.
- `pnpm run typecheck` passes. `pnpm run lint:gate` passes (59663 diagnostics, baseline 89733). `pnpm run build:ui` passes.

## Left out

- No action changes, so `call-action` has no new action to prove. Agents and MCP clients place layers with numbers.
- Alt does not turn snapping off on a layer move. In free move, Alt duplicates the layer, and the snap-off key is still Cmd or Ctrl ("as today"). On resize, Shift and Cmd or Ctrl turn snapping off, as before.
- Flow children in auto layout still reorder and do not snap. `isSnapSkipped` skips every mode except `absolute`. I did not change that path, so I did not test it in the app.
- Column lines can be fractional (188.67). The written value rounds to whole px, as other moves do.
- `free-move-controller.ts`, `resize-handles-model.ts` and `use-canvas-edits.ts` are outside the pick's file list. No other pick owns them.
