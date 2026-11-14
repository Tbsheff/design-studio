# Cycle 24 pick 4: edge-states

Branch `feat/edge-states`. No new action.

## Changed

- Contracts: `state-styles.ts` adds `first`, `last`, `odd` and `even` to the end of `STYLE_STATES`, an `EDGE_STATE_VARIANTS` map (`first-child`, `last-child`, `nth-child(odd)`, `nth-child(even)`), `isEdgeStateName`, `toEdgePseudo`, a `StateEdgeKind` (`list` or `siblings`), `StateListResult.edge` and `ForcedStateChange` (`isStructural`). `ForcedStatePart` takes the edge names.
- Variants (outside the owned list): `shared/variants.ts` reads `first:`, `last:`, `odd:` and `even:` as states. Before, `parseVariant("last:")` read `last` as a breakpoint.
- `variant-css.ts`: the edge states write `.sv-xxxxxx:first-child`, `:last-child`, `:nth-child(odd)` and `:nth-child(even)` rules. The rule reader now parses `:nth-child(...)` and the `> * + *` child rule. Before, a later rewrite of the block dropped any line that it could not parse. New `toChildRuleSplices` and `toChildRuleDeclarations` write and read the child rule in the same block. `direct-edit/engine/child-rule-css.ts` applies them to a source file.
- Server: new `state-styles/edge-siblings.ts`. `list_state_styles` returns `edge`:
  - `list` when a `.map` or `.flatMap` call sits between the JSX element and its parent element.
  - `siblings` when the parent has 2 or more children with the same tag (JSX or parse5), or when the layer already has an edge class.
  - `null` otherwise, and `null` for mode `none`.
- `set_forced_state` with an edge state returns `isStructural: true`, clears the stored forced state of the frame and needs no layer. Other states return `isStructural: false`. The output schema of `set_forced_state` is a new `StateStyleForcedChangeSchema`.
- Divider: `spacing.setDivider` in a plain HTML page writes `.sv-xxxxxx > * + * { border-top: <w>px solid <color>; }` (`border-left` for axis x). It keeps the old color when you change only the width, takes `color` only (a token is refused), and removes the rule for axis null. `spacing.getDivider` reads the rule back (`mode: "css"`). A JSX file without Tailwind still fails, with a narrower message.
- Bridge: `force-edge.ts` (new) outlines, with a dashed outline, the siblings that match the edge state and come from the same source location as the layer (all items of a mapped list, only the layer itself for hand-written siblings). `force-state.ts` accepts edge states and does not treat them as pointer states (453 lines).
- UI: the state picker adds First, Last, Odd and Even when `edge` is not null. The note says "Styles the last item in this list." for a mapped list, and "Styles this layer when it is the last item." for hand-written siblings. `copy.ts` has an `edge` block plus label and tip entries.
- Descriptions: `set_state_style` (594 chars), `list_state_styles` (587), `set_forced_state` (545) and `set_divider_spacing` (490) name the new states, the written forms and the CSS divider. `server/state-styles/input.ts` has the same text.

## Checked

Studio dev run on port 47610 with `STUDIO_AGENT=mock` and `STUDIO_DATA_DIR=ds-wt/edge-states-data`.

- `call-action.ts`:
  - `state-style.inspect` on a hand-written `li`: pass, 3 surfaces, 0 diffs, `edge: "siblings"`.
  - `state-style.set` `last` + `md` border-width 0: HTTP wrote `md:last:border-0`. MCP and the agent answered "already has this value", because the action is not idempotent (as in cycles 21 to 23).
  - `state-style.setForced` `last`: pass, 0 diffs, `isStructural: true`.
  - `state-style.set` `last` in the plain CSS page: wrote `.sv-e0bcde:last-child { border-width: 0px; }`.
  - `spacing.setDivider` in the plain CSS page: HTTP wrote `.sv-afc6bc > * + * { border-top: 1px solid #94a3b8; }`. MCP and the agent answered "already has these lines".
  - `spacing.getDivider` in the plain CSS page: pass, 0 diffs, `axis y`, width 1, color `#94a3b8`.
- Rewrite trap: after the divider, Hover fill on the same layer and on another layer rewrote the block. The `> * + *` and `:last-child` rules are still there. In the preview, children 2 and 3 have a 1px top line and the last `li` has no bottom border (`css-divider-light.png`).
- React project (Vite template, `src/tw.css` with `@import "tailwindcss"`). MCP (`mcp-run.txt`):
  - `set_state_style` `last` border-width 0 on the mapped `li` wrote `last:border-0` on the one source `li`. In the preview only Delta loses its line.
  - The same call on the third hand-written `li` wrote `last:border-0` on that `li` only. No visible change, because it is not last.
  - `list_state_styles` lists the override with `edge: "list"`.
  - `set_forced_state` `last` gives the structural answer.
- UI (playwright-core, dark and light):
  - Mapped `li`: the picker shows First, Last, Odd and Even. Last outlines Delta and shows the list note and a dot.
  - Third hand-written `li`: the picker shows the layer note and outlines nothing, because Three is not last.
  - Hover, then Last: `list_state_styles` gives `forced: []`.
  - A `<p>` alone: no edge chips.
  - A `div` with `last:mb-0` and no siblings: Last shows (`edge: "siblings"`).
  - First, then the Padding top field set to 0, wrote `first:pt-0`, and only the first row changed. One Cmd+Z removed it.
- Bonaparte, read-only `git grep` (`bp-check.txt`): 149 edge uses in 97 files: `last` 98, `first` 42, `even` 5, `odd` 4. `first:start` and `first:end` (4 uses) are not classes, so 145 read as a state. `git status --short` had 14 lines before and after.
- `pnpm run typecheck`, `pnpm run lint:gate` (59609 diagnostics after the fix, baseline 89733) and `pnpm run build:ui` pass.
- Screenshots: `picker-list-last-{dark,light}.png`, `picker-siblings-last-{dark,light}.png` and `css-divider-light.png`.

## Left out

- The inspector Border bottom width field writes nothing for the value 0, in Hover too, and `set_state_style` `border-bottom-width` 0 answers "already has this value". These faults are already on `main`. `last:border-0` works through `border-width` (MCP). In the UI, Last with border width 2 writes `last:border-b-2`.
- In a CSS project the inspector divider row stays off: `use-divider.ts` needs Tailwind classes and belongs to pick 5. The CSS divider works over HTTP, MCP and the agent.
- The md + Last case and the Cmd+Z step for Last were checked over HTTP, not by a click in the UI.
- The commits are not split cleanly: the divider commit also holds the bridge and UI changes.
- `artifacts/mcp-snapshots` is not changed. Approve these diffs at merge:
  - `set_state_style`, `list_state_styles` and `set_forced_state`: the input enum (4 new states) and the descriptions.
  - `list_state_styles` output: `edge`.
  - `set_forced_state` output: `isStructural`.
  - `set_divider_spacing`: the description.
- `.claude/goal/roadmap.md` is not in the worktree, so no Appendix A glob was added.
