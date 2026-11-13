# Cycle 20 pick 5: ruler guides

Branch `feat/ruler-guides`, cut from `a08e64d00`.

## Works

- Rulers on (Shift+R): a drag from the top ruler adds a horizontal guide, a drag from the left ruler adds a vertical guide. A label shows `y 240` or `x 1560` while you drag.
- A drag on a guide moves it. A drag back onto its ruler removes it. Rulers off: guides hide and frames do not snap.
- A frame drag and a frame resize snap to guides within 6 screen px. A guide snap wins on its axis; frame-to-frame snap still runs on the other axis.
- Each add, move or remove is one layout history step: "Add guide", "Move guide", "Remove guide". Cmd+Z after a remove showed "Undid remove guide" and the guide came back.
- New action `canvas.setGuides` (POST `/api/projects/:projectId/canvas/guides`, MCP and agent `set_guides_canvas`, agent set `core`). The whole list is sent; `[]` removes all. MCP calls update the open UI live.
- `canvas.inspect` (`canvas_list`) returns `guides`.

## Checked

- `call-action canvas.setGuides` with 2 guides: pass on http, mcp and agent, 0 diffs. Again with a second list: pass. `call-action canvas.inspect`: `guides` on 3 surfaces.
- In the app: guide made from the top ruler was saved to `.studio/canvas.json`; Tablet dragged near it landed at `y = -393` (the guide); guide dragged to the ruler was removed; Cmd+Z restored it; frame writes keep the guides.
- Screenshots: `cycle-20/ruler-guides/guides-snapped-dark.jpg`, `guides-snapped-light.jpg` (y = 0 and x = 1560 guides, 3 frames snapped to y = 0).
- `pnpm run typecheck`: pass. `pnpm run lint:gate`: pass. `pnpm run build:ui`: pass. `check:scripts` fails on `check-actions --ops` with the same 10 warnings as main.

## Files outside the pick list

- `ui/features/canvas/canvas-frames-model.ts`: the UI writes the whole canvas file, so it must carry `guides`, or every frame move would drop them.
- `server/canvas/layout-history.ts`: undo of guides and the history labels.
- `server/canvas/{guide-ops.ts,guide-listing.ts,canvas-writer.ts,canvas-store.ts,frame-ops.ts}`: `tools.ts` is over 500 lines, so the inspect listing with `guides` moved to `guide-listing.ts`, and the unused `inspectCanvasFrames` left `frame-ops.ts`.
- `ui/features/canvas/{frame-drag.ts,frame-resize-model.ts,frame-resize-drag.ts,stage-rulers.tsx,canvas-stage.tsx}` and `ui/styles/canvas.css`.
- `canvas-rulers.tsx` is not changed: the guide layer puts its own pointer strips over the rulers.

## Merge notes

- Shared with pick 4: `contracts/canvas-file.ts` (add-only `guides` field, clean step), `actions/canvas/frame/schema.ts` (`CanvasListedSchema.guides`), generated files. Run `pnpm exec tsx scripts/gen-routes.ts` after the rebase.
- MCP snapshots not updated: new `set_guides_canvas`, `canvas_list` output gets `guides`. Approve at merge.

## Left out

- Layers inside the preview do not snap to guides (frames only).
- A guide drag does not snap to frame edges.
- A guide on a frame label covers the label hit area along its 7 px strip, so drag the frame by another part of the label.
