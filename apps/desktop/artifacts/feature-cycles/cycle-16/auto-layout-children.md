# Cycle 16 pick 3: auto-layout-children

Branch `feat/auto-layout-children`.

## What works

- New action `layer-style.set` (POST `/api/projects/:projectId/layer-style/set`, MCP and agent `set_layer_style`, agent set `tweak`). Input: `projectId`, `directionId`, `layerId`, `layout` (`auto`, `row`, `column`), `gap` (px, a number or a token, or null). Output: `{ direction, gap, movedChildren, skipped, versionId }`.
- A probe reads the boxes of the element children. The engine `engine/to-auto-layout.ts` picks the direction (row when the centers spread more on x), sorts the children on that axis, and sets the gap to the median space between neighbours (snapped to 4 px on a Tailwind page).
- The writer moves the child nodes into the sorted order in the source, removes `position`, `top`, `right`, `bottom` and `left` from each absolute child, and sets `display: flex`, the direction, `align-items: flex-start` and the gap on the parent. All of it is one version and one undo step.
- Shift+A and the "Auto layout" button in the inspector call the action with `layout: "auto"`. A parent that has only in-flow children gets `display: flex`, as before.

## Checked

- `call-action layer-style.set` on 3 surfaces: HTTP made the row (gap 110px, 3 moved). MCP and agent ran without errors and saw the row that was already there. A second run on an in-flow frame wrote only `display: flex`.
- MCP `set_layer_style`: 3 stacked text boxes became a column with a 67px gap, sorted top to bottom.
- Tailwind page: `flex items-start flex-row gap-14`. The `absolute left-[..] top-[..]` classes are gone.
- UI: Shift+A on the frame lined up the 3 boxes in their old order. Cmd+Z restored the old source in one step. Screenshots: `cycle-16/auto-layout-children/{before,after}-{dark,light}.png`, `undo-dark.png`.
- `pnpm run typecheck`, `pnpm run lint:gate` and `pnpm run build:ui` pass.

## Left out

- `inset` is not in `DIRECT_STYLE_PROPERTIES`, so the writer does not remove it.
- The parent gets no padding from the old child offsets, so the stack moves to the top left of the frame.
- Mixed children (some absolute, some in flow) keep their source order and get no gap.
- The writer reorders only children that are plain siblings in one file, with only white space between them. Children from `.map()` or from a shared component keep their place, with a reason in `skipped`.
- The inspector shows no note for skipped children.
- `artifacts/mcp-snapshots/*.json` is not updated for `set_layer_style` (a merge decision).
- `inspector/copy.ts` is not changed. The hook needs no new text.
- Changed beyond the spec file list: `style-scope/layer-style/{deps.ts,engine/index.ts}` (exports), `style-scope/index.ts` (one export block) and `inspector/{auto-layout-row,auto-layout-section,layout-section}.tsx` (these pass `selection` and `onAdd` down).
