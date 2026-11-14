# Cycle 24 pick 5: polish-24

Branch `feat/polish-24`. No new action.

## Built

- Space stacks, both axes: `tailwind/space-stack.ts` reads one `space-y-*` and one `space-x-*` per variant. Shift+A removes both and writes `flex`, `flex-col` (the larger axis sets the direction) and one gap edit with each axis value. `space-y-4 space-x-2` gives `flex flex-col gap-x-2 gap-y-4`; equal values give `gap-4`. One undo step.
- Space stacks at a breakpoint: the inspector reads the `space-*` class of the picked breakpoint from `variants.set`. With `space-y-2 md:space-y-6`, base shows Gap 8px and md shows 24px. When a layer has a responsive stack class, the gap comes from the class, not from the measured margin. A gap edit at md writes `md:space-y-8`. With no `md:space-*` class, a gap edit at md adds `md:space-y-<n>` and keeps the base class.
- Selection: `SelectionContext` gains `parentLoc` (the source of the parent element). The bridge fills it for each selection. The chat agent gets a `parent source: file:line:col` line under `source:` (`server/agent/selection-parent.ts`).
- List row on an `li`: when the parent `ul` or `ol` is in the same file, the row edits the parent list (`list-disc` on the `ul`). When the parent is in another file, or the project uses CSS (no Tailwind), the row stays read-only with "Edit the list layer". Marker types other than none, disc and decimal show a fourth "Other" choice, current, with the value in its tip (`Other: square`).
- Divider: after a lines write, the class line shows `divide-y` (same `absorb` and `reselect` path that the other writes use).

## Checked in the running app (HTML project with Tailwind 4, mock agent, port 47810)

- `#both` (`space-y-4 space-x-2`, 3 children): Shift+A gives `flex flex-col gap-x-2 gap-y-4`. Cmd+Z gives back the old classes in one step.
- `#resp` (`space-y-2 md:space-y-6`): All widths shows Gap 8px. md shows 24px. Gap 32 at md writes `md:space-y-8`.
- `ul#list > li#first`: List row is editable. Bullets writes `list-disc` on the `ul`. Cmd+Z removes it.
- `ul.list-[square] > li`: the row shows Other as the current choice. After MCP wrote `list-[lower-alpha]`, the `li` shows Other too.
- `#lines`: Lines between. The class line shows `divide-y` 800 ms after the write (it showed nothing new before the fix).
- `scripts/call-action.ts direct-edit.apply` on the `ul` (`call-action-list.txt`): pass. Only HTTP ran: the action has `mcp: legacy-mcp` and `agent: legacy-agent`. The legacy MCP tool `edit_element` with `selector: "#list"` wrote `list-[lower-alpha]` on the `ul`.
- Agent text: a selection with `parentLoc` gives `parent source: index.html:20:1`.
- Screenshots in `cycle-24/polish-24/`: `list-row-li-{dark,light}.png` (after Bullets), `list-row-li-before-{dark,light}.png`, `list-row-other-{dark,light}.png`.
- `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run lint:gate` (59609, baseline 89733) and `pnpm run build:ui` pass.

## Differences from the spec

- md gap edit writes `md:space-y-8`, not `md:gap-8`. The layer is a block, so `md:gap-8` has no effect; the space class is what spaces the children at md.
- `parentLoc` is `SourceLoc | null` (same shape as `source`), and optional in the contract like `usedAt`. A required field breaks the comment and variation schemas and the server page probe, which build `SelectionContext` from other inputs. The bridge always sets it.
- `contracts.ts` grows by 1 line (no offset). `studio/no-file-growth` does not cover `packages/`.
- The parent selector is the `li` selector without its last step, or `ul:has(> #id)` when the `li` has an id. The server uses the selector only in messages.
- `inspector-edit.css`: List row buttons size to their text so the fourth choice fits.

## Left out

- The page probe (`server/page-probe/element.ts`, used by MCP tools that describe elements) does not fill `parentLoc`. No MCP snapshot changes.
- Shift+A at a breakpoint on a stack that has only base `space-*` classes does not convert it (as before).
