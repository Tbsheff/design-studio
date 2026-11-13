# Cycle 19 pick 1: quiet-canvas

Branch `feat/quiet-canvas`.

## Shipped

- **Grouped frame menu.** The "…" menu has 5 top-level rows on an HTML frame (before: 9). On a route frame it should have 6 (before: 10). This count comes from the group map; no route frame ran. Order: Redesign as prototype (route frames only), Move to app, States ▸, Copy ▸, Arrange ▸, Use as style reference.
  - States ▸: Show all states, Make states with AI (renamed from "Make states").
  - Copy ▸: Duplicate screen, Copy as PNG.
  - Arrange ▸: Tidy up frames, Add section around frame, Hide frame.
  - `frame-menu-groups-model.ts` maps each item id to a group. An unknown id goes to the top level. A group with no items is not shown.
  - The submenus reuse `PreviewSubmenuRow` and `SubmenuContext` from the preview menu. The new body is `frame-submenu.tsx`.
- **Selection menu.** With 2 or more frames selected, the group shows one control, the count button "3 frames ▾" (before: the 8-button align bar plus the count). Its menu: Align ▸ (6), Spread ▸ (2), Tidy up, Remove 3 frames. With fewer than 3 frames, Spread is disabled. Its reason, "Select 3 frames or more.", shows as an inline hint, the same as other disabled frame items (for example the "Hide frame" reason).
  - Deleted: `frame-align-bar.tsx`, `frame-align-button.tsx` (the bar was its only user), the bar CSS, and the unused `toFrameAlignTip`.
  - The Alt align keys and Ctrl+Alt+T still work. They are bound in `use-tidy-frames.ts`, not in the bar.
- **State chip.** No change. `FrameStateMenu` already shows nothing when the project has no frame states: the store is set only for app projects. An HTML frame shows 0 state chips on hover, before and after.

## Checked (running app, port 4611, mock agent, HTML project with 4 pages)

- **Frame menu:** 5 top rows. The keyboard works: ArrowDown moves to States, ArrowRight moves to "Show all states", ArrowLeft goes back, Esc closes the menu and focuses "…".
- **Frame menu items:** Add section (1 section), Hide frame (hidden, then Cmd+Z shows it again), Duplicate screen (the dialog opens), Show all states (4 board frames), Make states with AI (a mock run starts).
- **Selection menu:**
  - Align left moves 3 frames to x=1520, and one Cmd+Z puts them back.
  - Spread is disabled with 2 frames selected.
  - Tidy up on 12 selected frames moves the 2 frames that overlap (Menu and About, both at x=3040) apart. One Cmd+Z puts every frame back.
  - Alt+A still aligns 2 frames.
  - Remove 3 frames removes them, and Undo brings them back.
- **MCP:** `call-action canvas.moveFrames {layout:"left"}` passes on HTTP, MCP and agent with 0 diffs (`cycle-19/quiet-canvas/call-action-move-frames-left.txt`).
- **Screenshots:** `cycle-19/quiet-canvas/{before,after}-*-{dark,light}.png` (frame menu, submenu, 3-frame selection, selection menu) and `after-spread-disabled-light.png`.
- **Gates:** `pnpm run typecheck`, `pnpm run lint:gate` (59653 diagnostics, baseline 89733) and `pnpm run build:ui` pass.

## Files outside the pick's list

- `canvas/use-canvas-wiring.tsx` and `canvas/stage-frames.tsx`: these pass `removeFramesAt` to `FrameSelectionLayer` for "Remove N frames". The change is 3 lines plus 1 type line in `canvas-wiring-inputs.ts`.
- New: `canvas/frame-submenu.tsx`, `canvas/frame-menu-group-item.tsx`, `canvas/frame-menu-rows.tsx` and `canvas/use-frame-menu-rows.ts`. The last one exists to keep `FrameMoreMenu` under 80 lines.

## Left out

- **Route-frame state chip:** not checked in an app project. No app project ran this cycle, and the chip code did not change.
- **Copy as PNG:** not checked. The item sends the same event as before.
- **Tidy up from the frame menu:** it ran, but the frames were already tidy, so nothing moved.
- **Seen in testing:** at about 11% zoom, the tools of a hovered narrow label (× and the page chip) cover the frame name. A click meant for the name once hit ×, and the frame was removed. This pick did not change it.
- **Pin and Hide frame:** they still have no palette command (as the spec says).
