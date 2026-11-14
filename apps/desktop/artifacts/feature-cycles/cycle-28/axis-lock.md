# Cycle 28 pick 4: axis-lock

Branch `feat/axis-lock`, cut from `f8274310e`.

## What works

- Layer move (absolute and flow, `bridge/free-move.ts`): Shift held during a drag keeps only the larger of `dx` and `dy` from the start point. The lock is in the new `bridge/move-axis.ts` (`toLockedDrag`). `free-move.ts` stays at 523 lines (net 0).
- A Shift press or release mid-drag switches at once, with no pointer move. The parent has the key focus (the bridge blocks `mousedown`), so the free-move controller posts a new `move-shift` message to the bridge, and the bridge repeats the last pointer sample (`createShiftRepeat`).
- Shift at pointer down still adds to the selection.
- Snapping runs on the locked axis only: `FreeMoveDrag` has a new `lock` field, and `place()` passes `null` for the other axis.
- Canvas frame drag (`frame-drag.ts`) and section move (`section-drag.ts`): the same lock. The snap kinds and the guide marks use the locked axis only. A Shift press mid-drag switches at once there too. A section resize takes no lock.
- Flow reorder: the insert line comes from the pointer, as before. The lock changes only the ghost shift.
- One write, one undo step, and Escape cancels with 0 writes, as before.
- Bundled: group resize on a layer anchored by `right` (or `bottom`) writes `right` (or `bottom`), not `left` (or `top`). The new file `group-resize-anchor-model.ts` holds the place logic. `group-resize-model.ts` went from 484 to 423 lines.

## Checked (STUDIO_AGENT=mock, port 4691, HTML projects with the Tailwind 4 CDN and with plain CSS)

| Check | Tailwind 4 | CSS |
|---|---|---|
| Absolute badge, drag right about 200 px and down 15 px with Shift: only `left` written | passes (`left-[319px]`, `top-20` kept) | passes (`left: 320px`) |
| Shift press mid-drag, no move: preview snaps to the row; release: follows the pointer | passes | passes |
| Escape mid-drag | 0 writes | 0 writes |
| One Cmd+Z | restores | restores |
| Shift-click 2 badges | 2 selected | not run |
| Group resize, `w` handle, 3 badges, one `right-8` | `right-9` written, no `left` on that badge | not run |
| Two canvas frames, Shift drag "Phone" right and down | `x` 1520 to 1761, `y` stays 0 | n/a |

- `pnpm run typecheck`, `pnpm run lint:gate` (pass, 59614 diagnostics, baseline 89733), `pnpm run build:ui`: pass.
- No new action, so `scripts/call-action.ts` does not apply. MCP and the agent write one axis with `edit_element`, as before; no description change.
- Screenshots in `cycle-28/axis-lock/`: `Badges-tw4-locked-drag-{dark,light}.png`, `Badges-css-locked-drag-{dark,light}.png`, `frame-locked-drag-dark.png`, `Badges-tw4-group-w-dark.png`, `Badges-tw4-shift-select-dark.png`.

## Files outside the owned list

- `packages/common/contracts/src/contracts.ts`: `lock` on `FreeMoveDrag`, and the `move-shift` parent message (2 lines).
- `bridge/{pointer-drag,bridge-types,message-handlers}.ts`: wire `repeatShift`.
- `ui/features/canvas/{free-move-model,use-free-move,use-section-handlers}.ts`: snap axis, keyup listener, the section `canLock` flag.
- `shared/keymap.ts`: not changed. The shortcut list shows no drag modifiers.
- `.claude/goal/roadmap.md` and `.claude/goal/active-slice` are not in the worktree, so Appendix A was not changed.

## Left out

- A multi-selection layer drag does not exist today (`toSingleTarget` cancels a move with 2 or more layers), so there is nothing to lock. The nudge `others` path is keyboard only.
- The badges have auto width (text layers), so the group resize check moved `right` but did not change the width. The width path uses the same formula (`right - shift - grow`); a fixed-width right-anchored layer was not run.
- No distance label showed in the locked-drag shots, because no sibling was near enough for a spacing badge. Spacing badges come only from the axis with a snap kind, so a locked drag shows only its axis.
- Frame snap lines on the locked axis were not seen in a shot (no frame edge was in range).
- No real-model run (the spec needs none).
