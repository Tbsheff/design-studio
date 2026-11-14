# Cycle 21, pick 1: menu fit

Branch `feat/menu-fit`. No action changes (UI and server shutdown only), so no `call-action.ts` run applies.

## What works

- **Menus fit.** New `canvas/menu-fit-model.ts` (pure `toMenuFit`, `toVisibleBounds`) and `canvas/use-menu-fit.ts` (a ref callback that measures on mount, on submenu `pointerenter` and `focusin`, and on resize). Bounds are the `.stage` rect cut by the window and by the open inspector.
- **Root menus shift.** A root menu moves left or up to stay 8 px inside the bounds. The shift is a margin, not `translate`, because the `menu-in` animation owns `translate`.
- **Submenus flip.** A submenu opens on the left when the right has no room (`data-side="left"`), and shifts up at the bottom. ArrowRight and ArrowLeft work on both sides.
- **Preview menu submenus show.** When the right-click menu scrolls (short windows), its submenu is now `position: fixed`, so the scroll box no longer cuts it. On `main` the "Select layer" submenu was invisible at 900x700.
- **Covered menus.** `frame-more-menu`, `frame-submenu`, `frame-select-menu`, `layer-pick-items` (preview submenu), `route-source-chip`, `use-in-menu`, `play-start-menu`, the page menu dialog in `frame-controls.tsx` (`frame-page-list`), and the state menu in `frame-state-menu.tsx` (`state-list-panel`).
- **Ctrl+G listed.** The canvas view keys moved to `shared/keymap-view.ts` (keymap.ts went from 504 to 458 lines). "Show layout grids ⌃ G" shows in the shortcuts list.
- **Layout version on quit.** `startLayoutVersions` returns the queue flush. `createAppParts` passes it out (`createApp` still returns the Hono app for the tests). `stopAll` runs it first, with a 3 s limit, before the runtime and preview stop. Checked: add a frame, SIGINT after 1 s. The repo has "Layout: Add frame Quit test" (the queue delay is 10 s).

## Checks

- **Before (`clip-before.md`).** This is the commit with the new states and no fix. It has 36 `clipped` findings. Examples: the "…" menu is 156 px past the stage, Arrange ▸ is 349 px past it, the frame selection menu is 299 px past it, and the preview menu scrolls sideways at 900x700.
- **After (`clip-after.md`).** The canvas menu states give 0 `clipped` and 0 `sideways-scroll` findings. Two findings stay that come from outside the menus (see below).
- **Commands.** `pnpm run typecheck`, `pnpm run lint:gate` and `pnpm run build:ui` pass.
- **Screenshots.**
  - `arrange-flipped-900-dark.png`, `arrange-flipped-900-light.png`: Arrange ▸ flipped at 900 px.
  - `arrange-inspector-900-dark.png`: the inspector is open.
- **Spot checks.** A frame on the left still opens Arrange ▸ on the right. Zoom at 11% and 156% places the menu correctly.

## Left out or open

- **Text overflow.** `check:clip` is not at 0. One finding stays in the existing "inspector" state: the "No wrap" text overflows by 3 px. It is also in the before run, and the menu code does not touch it.
- **Selection count overlap.** The new frame selection state shows that the "2 frames" count overlaps the last frame label by 2 px (`frames.css`). This pick does not fix it.
- **Add-frame menu.** `add-frame-menu.tsx` is not mounted anywhere, so it has no state and no hook.
- **Top bar menu.** `top-bar-menu.tsx` already uses `useFitPopover`.
- **Popover reuse.** `toPopoverPosition` was not reused, because it places popovers from an anchor box and has no flip-to-the-other-side rule.
- **Floating tools bar.** At 900 px the vertical floating tools bar can still cover a flipped submenu, because it is not in the bounds.
- **Layout grid label.** The Ctrl+G entry has no hint that the grid toggle skips when a layer is selected, because `KeyBinding` has no tip field.
- **Clip changes.**
  - The clip server takes its port from `STUDIO_CLIP_PORT`, so parallel runs do not fight over port 47310.
  - The new states pan the canvas instead of seeding a frame at the edge.
  - The 900x700 size is a resize inside each state.
