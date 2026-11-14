# Cycle 22 pick 2: stroke-position

Branch `feat/stroke-position`. No new action.

## Changed

- Contracts: `border-side-properties.ts` adds `outline-width`, `outline-style`, `outline-color` and `outline-offset`. `DIRECT_STYLE_PROPERTIES` spreads them, so `edit_element`, `batch_edit`, the agent direct tools, `set_state_style` and the breakpoint tools take the 4 keys.
- Engine: new `tailwind/outline.ts`.
  - Classes: `outline`, `outline-<style>`, `outline-<n>`, `outline-<color>`, `outline-offset-<n>` and `-outline-offset-<n>` are the 4 outline groups. `ring` and `ring-<n>` are `ring-width`, and `ring-<color>` is `ring-color`. `ring-inset` and `ring-offset-*` stay unclassified.
  - Tokens: style solid is `outline`, the other styles are `outline-dashed` and so on. Width and offset use the v3 scale (0, 1, 2, 4, 8) or any whole px in v4, else an arbitrary value.
  - `map.ts` went from 1026 to 982 lines: the box value parsers moved to `border-sides.ts`. `classes.ts` went from 847 to 819: it uses the `map.ts` property table, which was a copy.
- Bridge: `element-info.ts` sends the 4 computed outline values, and `--tw-ring-shadow` and `--tw-ring-color` as the ring flag.
- Inspector:
  - The Border section has a Position choice (Inside, Center, Outside) next to the side choice. The section also opens for an outline or a ring.
  - A switch is one forced patch, so one write and one undo step. Tailwind removes the old form; a CSS project sets the old style to `none`.
  - Center and Outside are disabled with a side or Custom, with the tip "Center and Outside work on all sides". On an outline the side choice shows All and is disabled.
  - Center keeps the offset at minus half the width when the width changes.
  - Ring layers: width and color edits write `ring-<n>` and `ring-[<color>]` through a class edit. A switch removes the ring classes and writes border or outline.
  - All after a side edit clears the 4 side longhands, so a CSS project keeps only `border-width`.

## Checked

- Tailwind v4 page, card with `border-2 border-slate-300`:
  - Outside: `outline outline-2 outline-slate-300`. Center: `-outline-offset-1` is added. Inside: `border-2 border-slate-300` again. Cmd+Z after Inside gave back Center in one step.
  - The card box does not change size. The content moves 2px, because the border no longer takes space inside the box.
- Ring card `ring-1 ring-slate-200`: the section shows Outside, width 1. Width 2 writes `ring-2`, color `#ef4444` writes `ring-[#ef4444]`. Center writes `outline outline-2 outline-[#ef4444] -outline-offset-1` and removes the ring. Cmd+Z gives back the ring.
- CSS project, `.card { border: 2px solid }`: Top, then All, leaves only `border-width: 2px` inline. Outside writes `border-style: none; outline-style: solid; outline-width: 2px; outline-color: ...`. Center adds `outline-offset: -1px`.
- MCP `edit_element` `{"outline-width":"2px","outline-style":"solid"}` wrote `outline-2 outline` (`stroke-position/mcp-edit-element.txt`).
- `call-action.ts direct-edit.apply` with outline color and offset: HTTP wrote `outline-[#3b82f6] -outline-offset-1`. MCP and agent are off for this action (`call-action-direct-edit.txt`).
- `call-action.ts state-style.set`, property `outline-width`: HTTP wrote `hover:outline-4`. MCP and agent decoded the new key and ran the handler; they answered "already has this value" because the action is not idempotent (`call-action-state-style.txt`).
- Bonaparte, read-only, by grep of `className`, `cn()` and `cva()` strings: 142 ring and outline tokens. The engine classifies ring width 269 uses, ring color 278, outline style 261, outline width 18, outline offset 7, outline color 15. `ring-offset-*` and `ring-inset` stay unclassified. `git status` is unchanged.
- Screenshots: `cycle-22/stroke-position/{inside,outside,center,ring}-{dark,light}.png`.
- `pnpm run typecheck`, `pnpm run lint:gate` and `pnpm run build:ui` pass.

## Snapshot diff (decide at merge)

The input of `edit_element` and `batch_edit` (`artifacts/mcp-snapshots/direct-edit-element.json`) gets the 4 outline keys. `set_state_style` and the breakpoint style tools also take them; they are not in a snapshot file. The snapshot files are not changed.

## Left out

- Outside does not write `outline-offset-0` when the offset is already 0, because the edit core drops a value that equals the computed value.
- A layer with both a border and an outline shows the outline position only.
- Ring width and color use plain inputs, with no token snap or eyedropper. The width reads from the computed ring shadow, so a ring set only under a variant (`focus-visible:ring-2`) does not show.
- The Bonaparte inspector was not opened in a running app; the engine was checked on real Bonaparte classes.
- The mock agent edits only a fixed `h1` color; call-action proved the agent surface.
- `simple-sections.tsx` changed one line to pass the selection and classes to the Border section.
- The `.claude/goal` roadmap is not in the worktree, so no Appendix A glob was added.
