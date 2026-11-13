# Cycle 18 pick 4: start points

Branch `feat/start-points`.

## Built

- **Contracts:** new `packages/common/contracts/src/start-points.ts`. `LinksFile` gets `starts: { frame, name }[]` (12 max, names unique, case-insensitive). `start` stays in the file and always equals the first point, so share, publish, flow export and versions read it with no change. An old file with only `start` reads as one point named "Start". `startFrameOf` moved to the new file; `links.ts` re-exports it and did not grow (it is over 500 lines).
- **Action:** `canvas.setStartPoints`, `PUT /api/projects/:projectId/links/starts`, MCP and agent `set_start_points_canvas` (agent set `core`). Input is the whole list. Frame refs take ids or `@label`. A duplicate name, an empty name or a missing frame fails with `BadRequest`.
- **`set_start_frame`:** unchanged input. It now sets the frame of the first point and keeps its name.
- **Server:** `src/server/canvas/links/start-points.ts` (`setStartList`, `setFirstStart`), `LinkWriter.setStartPoints`, handler `handlers/canvas/set-start-points.ts`. `LinksFileSchema` output now carries `starts`.
- **Play bar:** a start point menu (shows the current name). A click restarts Play on that frame. R and Restart go back to the chosen point.
- **Prototype bar:** a "Start points" button with a count opens a panel: one row per point (rename in place, remove), and "Add start point here" with a name field for the selected frame. The suggested name is the frame label.

## Checked

- `call-action canvas.setStartPoints` (3 points, one by `@Schedule visit`): pass, 3 surfaces, 0 diffs. Output in `cycle-18/start-points/call-set-start-points.txt`.
- `call-action canvas.setStartLink`: pass, 3 surfaces; the first point moves, the names stay. `call-set-start-link.txt`.
- Duplicate names fail on all 3 surfaces with "Two start points are named a." `call-duplicate-name.txt`.
- Old file with only `"start": "f2"`: `list_links` returns `starts: [{ f2, "Start" }]`.
- In the app (7 linked frames): added "Checkout" from the prototype bar, renamed "Start" to "Sign in", removed a point. Play menu lists all; picking Checkout starts Play there; after one click to Home, R returns to Checkout.
- `pnpm run typecheck`, `pnpm run lint:gate` (pass), `pnpm run build:ui` pass.
- `pnpm run check:scripts`: `gen-routes --check` passes; `check-actions --ops` fails on the same pre-existing items (O12, S11, E1, E16, W7 in other actions), none in this pick.
- Screenshots: `cycle-18/start-points/{prototype-start-points,play-start-menu}-{dark,light}.jpg`. The Play bar is dark in both themes.

## Left out

- **Cmd+Z for start points.** `src/server/canvas/layout-history.ts` (pick 5 owns it) does not see `starts`: `linksLabel` gives no label when only `starts` changes, so no history step is recorded, and `revertLinks` reverts only `start`. Fix at merge, in that file:
  - `linksLabel`: treat `!same(before.starts, after.starts)` like `startChanged`, label "Change start points".
  - `revertLinks`: revert `start` and `starts` together (compare and restore both, as it does for `start`).
  A change to the first point frame (`set_start_frame`) is still recorded and undone as before.
- `artifacts/mcp-snapshots/canvas.json`: not edited. The new tool `set_start_points_canvas` waits for approval at merge. The `set_start_frame` input is unchanged.

## Files outside the pick list

- `packages/common/actions/src/canvas/schema.ts`: one import and one `starts` line in `LinksFileSchema`, so link outputs keep the field.
- `src/ui/features/canvas/use-prototype.tsx`: one `activeId` prop line.
- `src/ui/features/canvas/play-mode.tsx`: 4 lines to use the chosen start.
- `src/ui/styles/prototype.css`: one block at the end.
- `src/server/canvas/links/link-ops.ts`: `writeStart` moved to `start-points.ts`; `toWritableContext` exported.
