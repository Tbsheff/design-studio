# Cycle 23 pick 2: divide-lines

Branch `feat/divide-lines`. Two new actions: `spacing.getDivider` (`get_divider_spacing`) and `spacing.setDivider` (`set_divider_spacing`).

## Changed

- Actions: `spacing/get-divider.ts` and `spacing/set-divider.ts`, stamped with `new:action`. Gen-routes wrote the routes, the domain index, the handler list and the `exports` map. `spacing/divider/schema.ts` holds a local `DividerVariantSchema`. Point it at `_core/style-variant.ts` after pick 4 merges.
  - Get: GET, `access: "read"`, input `projectId`, `directionId`, `file`, `line`, `col`, `variant`, `limit`. Output `{ axis, width, color, token, isReverse, classes, mode }`.
  - Set: POST, `access: "edit"`, `needs: "project.update"`, input `target`, `variant`, `divider: { axis: "x" | "y" | null, width: 1 | 2 | 4 | 8, color | token }`. `invalidates: ["spacing.getDivider"]`.
- Server: new `style-scope/divider/`. It has `DividerStore` (read) and `DividerWriter` (write), each in its own file. The class plan is in `divider-classes.ts` and the edit in `divider-edit.ts`. One export block in `style-scope/index.ts`. `handlers/spacing/live.ts` provides both layers.
  - Set writes `divide-y` or `divide-x` (`divide-y-2` for 2 px) and `divide-<token>` or `divide-[<color>]`. It removes the old axis and width classes. Off (`axis: null`) removes every `divide-*` class at that variant. The edit saves one version, so one Cmd+Z undoes it.
- Inspector:
  - The Spacing (gap mode) menu has a third entry, "Lines between". It shows when the layer has lines. Fixed or Auto turns the lines off.
  - A Width (1, 2, 4, 8 px) and Color row shows under Gap while lines are on. Color takes a token name or a raw color.
  - A layer with `divide-y` opens with the row shown, also when it is not flex.
  - With `divide-y-reverse`, the row is read-only: "Lines between: Edit in code".
  - The direction switch on a stack with lines makes one direct edit. That edit sets `flex-direction` and swaps `divide-y-N` and `divide-x-N`, so one Cmd+Z undoes both.
  - The menu and the row read the state through a context from `auto-layout-body.tsx`. `flex-controls.tsx` does not change.

## Checked

- Tailwind v4 HTML project (`@tailwindcss/browser`) with `<ul class="flex flex-col">` and 4 `<li>`:
  - Lines between: `divide-y`.
  - Color `slate-400`: `divide-slate-400`.
  - Width 2: `divide-y-2`.
  - Horizontal: `flex-row ... divide-x-2` in one direct-edit write. Cmd+Z: `flex-col ... divide-y-2` in one step.
  - Fixed: no `divide-*`. Cmd+Z brings them back.
- A `<div class="divide-y divide-border">` (block) opens with the row, width 1 and color `border`.
- A `divide-y divide-y-reverse` stack shows the read-only note.
- HTTP checks:
  - Axis x, width 2: `divide-x-2`.
  - `color: #ef4444`: `divide-[#ef4444]`.
  - Unknown token: 400 "The token nope-x is not a color in this project".
  - Off: classes removed.
- MCP `set_divider_spacing` `{ axis: "y", width: 1, token: "border" }`, then `get_divider_spacing`: same values (`divide-lines/mcp-divider.txt`).
- `call-action.ts spacing.getDivider`: pass, 3 surfaces, 0 diffs.
- `call-action.ts spacing.setDivider`:
  - HTTP wrote `divide-y-2`.
  - MCP and the agent ran the handler and answered "The element already has these lines." The set is not idempotent; cycle 22 saw the same (`call-action-set-divider.txt`).
- Bonaparte, read-only grep of `*.tsx`: 103 files use `divide-x` or `divide-y` (`bonaparte-divide-classes.txt`). The most common forms are `divide-y` (119), `divide-stone-200`, `divide-border` and `divide-border/60`. The parser handles each form. The `md:` read was not run on a real `md:divide-x` layer. Bonaparte `git status` is unchanged.
- Screenshots: `cycle-23/divide-lines/{before,gap-menu,row,horizontal,divide-border,reverse}-{dark,light}.png`.
- `pnpm run typecheck`, `pnpm run lint:gate` and `pnpm run build:ui` pass. `gen-routes --check` passes. `check-actions` reports nothing for the 2 new actions; the E16 failures on other actions are already on main.

## Snapshot diff (decide at merge)

New tools `get_divider_spacing` and `set_divider_spacing`. The snapshot files are not changed.

## Left out

- CSS projects: set answers 400 "Lines between items need a Tailwind project". The state-style rule block in `direct-edit/engine/variant-css.ts` only accepts `.sv-xxxxxx` selectors with a state, not `> * + *`. That file is not in this pick, and a rule added to the shared block would be lost on its next rewrite.
- Space-stack bundle: Shift+A with both `space-y-*` and `space-x-*`, and the `md:space-y-*` read.
- The color field is a plain token or color input with no token snap list or eyedropper. The swatch is empty for tokens, because the studio page does not define project color vars.
- The closed Spacing menu shows "Line..." because the field is narrow. The open menu shows the full label.
- The inspector row edits the base style only. The actions take `variant`.
- The class line at the top of the inspector updates on the next selection, not after a divider write. The row and the menu update at once from the write result.
- The `.claude/goal` roadmap is not in the worktree, so no Appendix A glob was added.
