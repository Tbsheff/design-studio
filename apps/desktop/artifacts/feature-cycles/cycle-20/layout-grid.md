# Cycle 20 pick 4: layout-grid

Branch `feat/layout-grid`.

## Built

- Action `canvas.setLayoutGrid` (`POST /api/projects/:projectId/canvas/layout-grid`, MCP and agent `set_layout_grid_canvas`, agent set `core`). Input: `projectId`, `frame` (id or `@label`), `layoutGrid` (`columns` 1..24, `gutter` 0..200, `margin` 0..400, `rowStep` null or 2..64) or null to remove. Output `{ frameId, layoutGrid, note }`. Invalidates `canvas.inspect`.
- Errors: `BadRequest`, `Conflict`, `NotFound`. `Conflict` is added to the spec list, because `CanvasWriter` fails with it.
- Contract: `packages/common/contracts/src/layout-grid.ts` (new: type, limits, clean step). `canvas-file.ts` adds `layoutGrid?` on `CanvasFileFrame` and one parse step.
- Engine `server/canvas/engine/to-layout-grid.ts`: refuses a grid whose columns do not fit the frame width.
- `canvas_list` and `canvas_place` frame items return `layoutGrid` (optional key). `describeFrame` moved to `server/canvas/frame-view.ts` as `toFrameView`, so `tools.ts` does not grow. `canvas_place` keeps the grid when it moves a frame.
- Agent: `frameLine` adds "layout grid: 12 columns, gutter 24, margin 80; line up the page content with these columns" for the open frame and frames in view (`server/agent/layout-grid-text.ts`).
- UI: "…" > Arrange > "Layout grid…" opens a popover with presets "12 columns", "4 columns", "8 px rows", fields Columns, Gutter, Margin, Row step, and Remove. Fields write on Enter or blur. Default values follow the frame width (12/24/80 at 1024 px or more, else 4/16/16).
- Overlay: faint red columns and rows over each shown frame, `pointer-events: none`. The grid hides when a column or the gutter is under 2 screen px; rows hide under 4 screen px.
- Ctrl+G shows or hides all grids (`isLayoutGridShown` in `platform/storage.ts`). Palette command "Show layout grids".

## Checked

- `call-action canvas.setLayoutGrid` on `@Mobile` with 4/16/16/8: pass, 3 surfaces, 0 diffs.
- HTTP: `canvas_list` returns the grid; `canvas_place` move keeps it; null removes it; too-wide grid gives BadRequest; unknown frame gives NotFound; columns 30 fails decode.
- UI on a 1440 px frame: menu > 12 columns draws 12 columns with margin 80. Ctrl+G hides and shows. Cmd+Z removes the grid in one step, Cmd+Shift+Z brings it back. At 11% the mobile grid hides (studio min zoom is 10%, so 5% can not be set).
- Mock run on the Mobile frame: the run log canvas context has the grid line for the frame and for the frame in view.
- Screenshots: `cycle-20/layout-grid/{grid,popover}-{dark,light}.png`.
- `pnpm run typecheck`, `pnpm run lint:gate` (pass), `pnpm run build:ui` pass.

## Left out

- No `KEYMAP` entry for Ctrl+G: `shared/keymap.ts` is over 500 lines and `studio/no-file-growth` blocks it. The key check is in `use-layout-grid.ts`, so the shortcuts list does not show it.
- On Windows and Linux Ctrl+G is also layer group (`Mod+G`). The grid toggle skips there when a layer is selected.
- MCP snapshot diffs (new `set_layout_grid_canvas`, `canvas_list` frame field) are not approved; approve at merge.
- Layers do not snap to the grid (runner-up 1).
