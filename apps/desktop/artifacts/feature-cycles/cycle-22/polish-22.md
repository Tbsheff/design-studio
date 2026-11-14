# Cycle 22, pick 4: polish-22

Branch `feat/polish-22`. UI only. No action changes, so `scripts/call-action.ts` does not apply. MCP and the agent already play a prototype through `set_start_points_canvas` and the share link.

## Result

| Item | Result |
|---|---|
| Play in one click (friction 12) | Fixed. Present is a split button when the project has a prototype start (a start, a start point, or any link, implicit `<a href>` links included). A click on Present starts Play. The chevron (`.topbar-present-more`) opens the same 4 menu entries. With no start, Present is one menu button with a chevron, as before. `Mod+Alt+Enter` does not change. |
| Menu bounds and the tools bar | Fixed. `use-menu-fit.ts` cuts the menu bounds by the floating tools bar: the bottom for the row bar, the left for the column bar. The bar publishes its element through `tools-bar-store.ts` (the `studio/no-dom-query` rule bans a query). |
| Ctrl+G tip | Done. `KeyBinding` has an optional `tip`. The shortcuts list shows it under the label. `view-layout-grid` says "Skips when a layer is selected". |
| Friction 15 (rail covers the frame at 100%) | Was still open, now fixed. Zoom to 100% and a reload at 100% put the active frame left edge 24 px into the stage when the frame is wider than the stage, so the tool rail does not cover it. Fit already left the inset. |
| Friction 7 (Open folder with an app chip) | Already fixed in the browser path. With a workspace and its app chip selected, one click on the rail "Open folder…" opens the folder path popover. The Electron native picker path was not checked. |

## Checks

- `check:clip --quick`: new state "canvas menu Arrange submenu next to the tools bar 900x700". Before the fix: 3 clipped findings (the new state, and the existing Arrange with the inspector open state, under the bar). After: 0 findings. The probe cuts the stage bounds by the tools bar too.
- The clip states "present menu" and "play", and `scripts/studio-shots.ts`, now open the menu with the chevron.
- Running app (mock agent, own data dir): a linked project plays on one Present click; a project with no links opens the menu; the chevron opens the menu.
- `pnpm run typecheck`, `pnpm run lint:gate` and `pnpm run build:ui` pass.

## Copy

New `presentCopy` block in `canvas/copy.ts` (`more`, `playTip`). The existing `copy.present` string stays, because `canvas-overlays.tsx` uses it.

## Files outside the pick list

The play flag goes through `use-prototype.tsx`, `prototype-model.ts`, `use-chrome-props.ts`, `canvas-chrome-menu.ts`, `chrome-top-bar.tsx`, `top-bar-props.ts` and `canvas-top-bar.tsx`. Styles: `editor-shell.css`, `commands.css`. Clip: `menu-states.ts`, `probe-menu.ts`, `probe-page.ts` (the spec named `states.ts`; the Arrange helpers live in `menu-states.ts`).

## Screenshots

In `cycle-22/polish-22/`: `present-split-tip-*`, `present-split-menu-*`, `present-click-plays-*`, `present-no-start-menu-*`, `shortcuts-ctrl-g-tip-*` (dark and light), `friction-15-before-dark.jpg`, `friction-15-after-dark.jpg`, `friction-7-open-folder-with-chip-dark.jpg`.

## Left out

- Electron check of friction 7 (native folder picker).
- Full `check:clip` (all modes). Only `--quick` ran (1440x900 dark). Rerun `pnpm run check:clip` after the merge, as the merge order says.
