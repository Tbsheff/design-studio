# Cycle 18 pick 3: align-frames

Branch `feat/align-frames`.

## Shipped

- **Server.** `canvas.moveFrames` (`move_frames_canvas`) takes 8 new `layout` values: `left`, `center`, `right`, `top`, `middle`, `bottom`, `spread-x`, `spread-y`.
  - The pure engine `server/canvas/frame-tidy/engine/to-aligned-frames.ts` computes the new places.
  - `frame-tidy-ops.ts` sends align layouts to that engine. Other layouts go to `toTidyFrames`, as before.
  - Align needs 2 frames and spread needs 3. Fewer frames fail with `BadRequest`.
  - Spread ignores `gap`. It keeps the outer frames in place and makes the gaps equal.
- **UI.** With 2 or more frames selected, a bar shows above the selection, on the left (`frame-align-bar.tsx`, `frame-align-button.tsx`). It has 6 align buttons and 2 spread buttons, each with a `data-tip` and its shortcut. Spread is disabled below 3 frames.
- **Keys.** `use-frame-align.ts`:
  - Alt+A, Alt+D, Alt+W, Alt+S, Alt+H and Alt+V align.
  - Ctrl+Alt+H and Ctrl+Alt+V spread.
- **Palette.** 8 commands, `view.align-frames-<layout>`.
- **One path.** The bar, the keys and the palette all send `TIDY_FRAMES_EVENT` with a layout. `use-tidy-frames.ts` makes one `moveFramesCanvas` call, so each action is one undo step.

## Keys

- **Shared:** all 6 Alt keys. The inspector arrange tools (`shared/arrange.ts`) also use them for element alignment.
- **Rule:** the frame keys fire only when no element is selected and enough frames are selected. This is the same rule as Ctrl+Alt+T tidy.
- **Spread keys:** Ctrl+Alt+H and Ctrl+Alt+V, from the spec. The inspector uses Alt+Shift+H and Alt+Shift+V for distribute.
- **Dropped:** no key.

## Checked

- **call-action, align top:** `canvas.moveFrames {frames:[@A,@B], layout:"top"}` passes on HTTP, MCP and agent with 0 diffs (`cycle-18/align-frames/call-action-top.txt`).
- **call-action, spread-x:** 4 frames get equal 110 px gaps and the outer frames stay (`call-action-spread-x.txt`).
- **Too few frames:** HTTP `spread-y` with 2 frames returns `BadRequest`.
- **Running app:**
  - 3 of 4 scattered frames, align left: their left edges match and D does not move. Cmd+Z undoes it in one step ("Undid move 3 frames").
  - Alt+H centers the frames.
  - Spread horizontally on 4 frames gives equal gaps.
  - The palette command "Align frames top" works.
- **Screenshots:** `cycle-18/align-frames/align-bar-{light,dark}.jpg`.
- **Gates:** `pnpm run typecheck`, `pnpm run lint:gate` and `pnpm run build:ui` pass.

## Files outside the pick's list

- `ui/domain/tidy-frames-events.ts`: `TidyFramesDetail` gets a `layout` field, because the palette can reach canvas only through this event.
- `ui/styles/frames.css`: one appended block for the bar.

## Left out

- **Action description:** the `move-frames.ts` description and `short` text still name only tidy, row and grid. The file is not owned. The `layout` field description lists the new values.
- **MCP snapshot:** the `move_frames_canvas` snapshot diff waits for approval at merge.
- **Disabled state:** the palette commands do not show a disabled state with fewer than 2 frames. They do nothing then.
- **Small groups:** the bar is wider than a narrow selection group, so it can cover nearby frame labels.
