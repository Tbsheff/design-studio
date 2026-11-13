# Cycle 20 pick 1: safe-frame-remove

## What changed

- **Container rule.** `.frame-label` is a named container (`frame-label`, inline size). Under 200 px on screen, × and the page chip hide. Under 120 px, every tool except "…" hides. The old 300 px rule for variation chips now applies only to variation labels.
- **No spill.** The hover rule no longer sets `overflow: visible`. The tools get `max-width: 100%`, so the name truncates first. Only a label with an open menu keeps `overflow: visible`, so the menus do not clip.
- **Hit gap.** × is a 20 px box. The label gap keeps 8 px between the name and the first tool (6 px or more).
- **Remove in the menu.** "Remove frame" (id `remove-frame`) is the last row of "…" > Arrange. It calls the same `onRemove` as ×, so the undo toast shows. On the last frame it is disabled ("The last frame stays.").
- **Same as default.** Each board frame whose state check row has `isSameAsDefault: true` shows a dim "Same as default" in the label note slot. `use-same-as-default.ts` sends the same `inspectStateFramesCanvas` query as `use-state-check.ts` (same key, threshold 0.98). The query layer then shares the in-flight read. `use-state-check.ts` and `state-check-model.ts` did not change.
- **Scale handles on small layers.** When the layer is under 40 px on screen, all 4 scale handles sit outside the box corners, with outward hit areas. This is CSS only, in `canvas.css`: the existing `.resize-frame.compact` class already uses the 40 px test, so `resize-handles.tsx` did not change.

## Verified in the running app

Mock agent, port 4870, an HTML project with 16 frames of 1440 px.

- **At 10% (labels 144 px):** on hover, 6 of 6 labels show only "…". × and the page chip do not show, and the tools stay inside the label. 20 real clicks on the name edge removed 0 frames. 11% was not reachable with the wheel steps.
- **At 50%:** × shows as a 20 x 20 box, apart from the name.
- **Menu:** "…" > Arrange > Remove frame took the count from 16 to 15 and showed "Frame removed. Undo". Undo gave 16 again.
- **Show all states:** on an HTML page, 4 board frames show "Same as default", and the line says "4 of 4 states look like the default".
- **Scale handles:** the button is 63 x 21 px at 50%. After K, the 4 handles sit outside the box (nw 359,789; ne 430,789; sw 359,818; se 430,818). Each one drags (ghost label "123%").
- **MCP:** `call-action.ts canvas.deleteFrame` passes over HTTP and MCP (`remove_frame`). The agent path stops at the approval gate. This change does not touch that gate.
- **Gates:** `pnpm run typecheck`, `pnpm run lint:gate` and `pnpm run build:ui` pass.

Screenshots (dark and light) are in `cycle-20/safe-frame-remove/`: `label-11-*`, `label-50-*`, `menu-remove-*`, `after-remove-*`, `board-note-*`, `board-full-*`, `scale-handles-*`, `scale-drag-*`.

## Left out

- **Layout version on quit.** `LayoutVersionQueue` is a local inside `startLayoutVersions` (`http/app-layout-versions.ts`). `stopAll` in `main/lifecycle.ts` sees only the bus, the preview and the runtime. One import and one call cannot reach the queue, so the spec rule says to leave it out.
- **Note refresh after a version change.** The note re-reads on `action.done` but not on `headVersionId`. Only the state check line re-reads on that change.

## Files outside the pick's list

- `canvas/use-same-as-default.ts`, `canvas/same-as-default-note.tsx` (new). `canvas/frame-label-builder.tsx` sets the note. `canvas/stage-frames.tsx` passes `appCanvas.note ?? label.note`, so the active frame also shows the note.
- `styles/canvas.css`: the compact scale handle rules.
- `canvas/copy.ts`: 2 keys in `copy` (`removeFrameLast`, `sameAsDefault`). No new exported block.
- `canvas/canvas-wiring-inputs.ts` did not change.
