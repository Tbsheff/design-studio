# Cycle 27 pick 2: group-resize

Branch `feat/group-resize`, cut from `f8dbc0c6d`.

## What works

- A multi-selection (2 or more sourced layers) shows 8 resize handles on its box, in the frame that draws the group rotate zones. The rotate zones hide during a resize drag.
- A handle drag scales the group box. Each layer gets the same factor on the dragged axis. The opposite edge stays in place.
  - Absolute layer: new size, and `left`/`top` move with the factor from the fixed edge.
  - Flow layer: new size only.
  - Text layer with no authored width or height (`authored-width`/`authored-height` empty): that axis keeps auto size. Its position then scales around its center, so it does not drift.
- Shift keeps the box ratio. Alt scales from the box center. Escape cancels and writes nothing. Release sends one `batch_edit` request (`direct-edit.apply` with `edits`), which is one undo step.
- The size label under the box shows the group W x H while you drag. The stale selection outlines hide during the drag.
- Single layer: Alt on a handle resizes from the center (twice the pointer delta). An absolute layer also moves `left`/`top` by half the change, and the frame follows it. Snapping is off while Alt is held.
- Tailwind: a size or position class on the spacing scale (`w-16`, `left-32`) snaps to 4 px steps. An arbitrary or unset value is written as exact px.
- `batch_edit` description: added "To resize several layers as one, scale each size by the same factor and move each absolute layer from the fixed edge." The text is in `server/mcp/history-tools.ts`, not `edit-tools.ts`. **This is a description diff.** `artifacts/mcp-snapshots/direct-edit-element.json` was not changed (user decision at merge).

## Checked (STUDIO_AGENT=mock, port 48710, HTML projects with the Tailwind 4 CDN and with plain CSS)

| Check | Tailwind 4 | CSS |
|---|---|---|
| 3 absolute badges, right handle +128 px (factor 1.5): widths 64 to 96, `left` 128 to 176 and 224 to 320, left edge stays | passes (`w-24`, `left-44`, `left-80`) | passes (inline `width`, `left`) |
| Escape mid-drag | 0 writes | 0 writes |
| One Cmd+Z | restores all 3 | restores all 3 |
| 3 flow cards in a flex row, bottom handle +40 px | `h-20` to `h-30` on each card, no move | `height: 120px` on each card, no move |
| Alt+Shift on the corner | scales from the center, ratio kept | not run |
| One absolute layer, Alt on the corner +16 px | 64 to 96, `left`/`top` -16 | same |

- `scripts/call-action.ts direct-edit.apply` with 3 size and position edits: http passes. The mcp and agent surfaces are skipped by design (`legacy-mcp`, `legacy-agent`), so 0 diffs.
- MCP `batch_edit` with the same 3 edits: the same classes as http (`w-24`, `left-44`, `left-80`).
- Screenshots of the group handles mid-drag: `cycle-27/group-resize/group-tw4-e-drag-dark.png` and `-light.png`.
- `pnpm run typecheck`, `pnpm run lint:gate` (pass, 59612 diagnostics, baseline 89733), `pnpm run build:ui`, `gen-routes --check`: pass.

## Off-token values

- None in the runs above. A drag with a factor that does not land on a 4 px step still writes a spacing-scale class (Tailwind 4 accepts any integer step, such as `w-22` or `left-41`). On Tailwind 3 such a step is not in the default scale.

## Files outside the owned list

- `ui/features/canvas/use-resize-handles.ts`: wires `useGroupResize` and uses `toDragStyle`/`toBackStyle` in the single-layer commit (few lines).
- `ui/features/canvas/resize-handles.tsx`: the frame follows the live x/y when Alt moves an absolute layer.
- `ui/features/canvas/use-rotate-drag.ts`: exports `toClassesOf` so the group resize reuses it.
- `ui/features/canvas/group-resize-handle.tsx` (new), `ui/features/canvas/copy.ts` (one key `groupResizeCopy.failed`).
- `ui/styles/canvas.css`: rules for the `n`, `w`, `nw`, `ne`, `sw` handle places.
- `.claude/goal/roadmap.md` is not in the worktree, so Appendix A was not changed.

## Left out

- A fake Next app run. The Tailwind check used an HTML project with the Tailwind 4 CDN, as the group-rotate pick did.
- Alt+Shift on the CSS project, and a flow-layer Alt check on a single layer (code path is the same as the absolute case without the move).
- A layer anchored by `right` or `bottom` still gets a `left` move. No real-model run (the spec needs none).
