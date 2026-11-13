# Cycle 20 pick 1: safe-frame-remove

## What changed

- **Container rule.** `.frame-label` is a named container (`frame-label`, inline size). Under 200 px on screen, × and the page chip hide. Under 120 px, every tool except "…" hides. The old 300 px rule for variation chips now applies only to variation labels.
- **No spill, and no × under the name.** On hover the tools no longer get `flex-shrink: 0` or `overflow: visible`. They keep `flex-shrink: 1000`, `max-width: 100%` and `justify-content: flex-end`. So the name keeps the box it had before the hover, and when the tools have no room, they clip from the left and "…" stays. Under 360 px the size text ("1440 × 900") does not show on hover, so it does not push the tools out. This is a change from the spec: the tools give way before the name, not the other way. Without it, a long name in a label of 200 to 250 px had × under its tail after the hover (81 and 42 probe hits). With a menu open, the tools get `overflow: visible` (the menus do not clip) and × hides.
- **Hit gap.** × is a 20 px box. The label gap keeps 8 px between the name and the first tool (6 px or more).
- **Remove in the menu.** "Remove frame" (id `remove-frame`) is the last row of "…" > Arrange. It calls the same `onRemove` as ×, so the undo toast shows. On the last frame it is disabled ("The last frame stays.").
- **Same as default.** Each board frame whose state check row has `isSameAsDefault: true` shows a dim "Same as default" in the label note slot. `use-same-as-default.ts` sends the same `inspectStateFramesCanvas` query as `use-state-check.ts` (same key, threshold 0.98), and reads it again when `headVersionId` changes, as the line does. The query layer shares the in-flight read. Measured: 1 GET on load for the line and 4 notes, 0 more on 15 s idle, pan out and back, and zoom, and 1 GET after a run made a new version. `use-state-check.ts` and `state-check-model.ts` did not change. If pick 3 changes the threshold or the query shape, the note sends a second read.
- **Scale handles on small layers.** When the layer is under 40 px on screen, all 4 scale handles sit outside the box corners, with outward hit areas. This is CSS only, in `canvas.css`: the existing `.resize-frame.compact` class already uses the 40 px test, so `resize-handles.tsx` did not change.

## Verified in the running app

Mock agent, port 4870, an HTML project with 16 frames of 1440 px.

- **At 10% (labels 144 px):** on hover, 6 of 6 labels show only "…". × and the page chip do not show, and the tools stay inside the label. 20 real clicks on the name edge removed 0 frames. × is hidden at this width, so these clicks cannot reach it. 11% was not reachable with the wheel steps.
- **Labels 212 to 343 px** ("Pricing page mobile layout", zoom 15 to 24%): `elementFromPoint` on the name's box before the hover gives 0 hits on × or any tool after the hover. This holds both for a hover on the name and for a hover that enters from the frame body. A 390 px frame (93 px label) shows only "…". Screenshot: `label-band-*`.
- **At 50%:** × shows as a 20 x 20 box, apart from the name.
- **Menu (zoom 31%):** "…" > Arrange > Remove frame took the count from 24 to 23 and showed "Frame removed. Undo". Undo gave 24 again.
- **Show all states:** on an HTML page, 4 board frames show "Same as default", and the line says "4 of 4 states look like the default".
- **Scale handles:** the button is 63 x 21 px at 50%. After K, the 4 handles sit outside the box (nw 359,789; ne 430,789; sw 359,818; se 430,818). Each one drags (ghost label "123%").
- **MCP:** `call-action.ts canvas.deleteFrame` passes over HTTP and MCP (`remove_frame`). The agent path stops at the approval gate. This change does not touch that gate.
- **Gates:** `pnpm run typecheck`, `pnpm run lint:gate` and `pnpm run build:ui` pass.

Screenshots (dark and light) are in `cycle-20/safe-frame-remove/`: `label-11-*`, `label-50-*`, `menu-remove-*`, `after-remove-*`, `board-note-*`, `board-full-*`, `scale-handles-*`, `scale-drag-*`, `label-band-*`.

## Left out

- **Layout version on quit.** `LayoutVersionQueue` is a local inside `startLayoutVersions` (`http/app-layout-versions.ts`). `stopAll` in `main/lifecycle.ts` sees only the bus, the preview and the runtime. One import and one call cannot reach the queue, so the spec rule says to leave it out.

## Files outside the pick's list

- `canvas/use-same-as-default.ts`, `canvas/same-as-default-note.tsx` (new). `canvas/frame-label-builder.tsx` sets the note. `canvas/stage-frames.tsx` passes `appCanvas.note ?? label.note`, so the active frame also shows the note. `canvas/canvas-wiring-inputs.ts` and `frame-label-state.ts` pass `headVersionId` to the labels, and it is part of the label signature.
- `styles/canvas.css`: the compact scale handle rules.
- `canvas/copy.ts`: 2 keys in `copy` (`removeFrameLast`, `sameAsDefault`). No new exported block.
