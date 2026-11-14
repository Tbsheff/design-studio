# Cycle 23 pick 3: parent-states

Branch `feat/parent-states`. No new action.

## Changed

- Contracts: `state-styles.ts` adds `group-hover`, `group-open` and `group-checked` to the end of `STYLE_STATES`. A `GROUP_STATE_VARIANTS` map sits next to `DATA_STATE_VARIANTS`: `group-hover`, `group-data-[state=open]`, `group-data-[state=checked]`. Helpers read and write the named form (`group-hover/menu-item`). `contracts.ts`: the `force-state` message states use the new `ForcedStatePart` type (net 10 lines shorter).
- Variants: `shared/variants.ts` reads and writes the group parts, with or without `/name`. `ParsedVariant` has a new `group` field (the group name or null). Data-state parts still sort first (the `8da5cf134` order), then group parts, then pointer states. `md:group-hover/menu-item:` round-trips.
- Engine: `state-scope.ts` writes the group prefix through `toStatePart` and skips group states in CSS listing.
- Server: new `state-styles/group-ancestor.ts` finds the nearest parent with `group` or `group/<name>` in the same file (JSX through the direct-edit parser, Tailwind HTML through parse5). New `state-styles/group-state.ts`: `set_state_style` with a group state uses the name of that parent. With no such parent it uses the group name of the layer's own `group-*` classes. With neither, it fails: "Add the group class to the parent layer in this file, then set the parent state." A page without Tailwind fails with a clear message. `list_state_styles` returns a new `group` field: `{ hasDataState, name }` or null. `hasDataState` is true when the parent has `data-state` or is a component (a Radix trigger sets it at run time).
- Bridge: `force-state.ts` forces a group state on the group parent, not on the layer. Parent hover marks the parent (and its parents) as hovered, so the layer's own `hover:` rules do not fire. Parent open and Parent checked set `data-state` on the parent and put the old value back on Default. A layer with a named group class looks for `.group/<name>`, a layer with unnamed `group-*` classes for `.group`, and a layer with no group classes for the nearest `group` or `group/<name>` parent, as the server does (`bridge/force-group.ts`).
- UI: the state picker lists Parent hover for each Tailwind layer, and Parent open and Parent checked when the group parent has `data-state` or is a component, or the layer has those styles. With no group parent, Parent hover shows dimmed with the tip "Add the group class to the parent" (`aria-disabled`, so the tip shows). CSS projects show no group chips. The data-state check no longer counts `group-data-[state=` classes as the layer's own Open state.
- Descriptions: `set_state_style`, `list_state_styles` and `set_forced_state` name the 3 states, the written forms and the group class rule (all under 600 chars).
- Outside the owned list: one `BASE` literal in `inspector/variant-bar-model.ts` gets `group: null`.

## Checked

- `call-action.ts` (Tailwind HTML page, port 49610):
  - `state-style.inspect` on the chevron: pass, 3 surfaces, 0 diffs. Lists `group-open` and `group: { hasDataState: true, name: null }`.
  - `state-style.setForced` `group-open` on `#chev`: pass, 3 surfaces, 0 diffs.
  - `state-style.set` `group-open` opacity 0.5: HTTP wrote `group-data-[state=open]:opacity-50`. MCP and the agent decoded it and answered "already has this value" (the action is not idempotent, as in cycles 21 and 22).
  - `state-style.set` `group-hover` md color on a child of `group/menu-item`: wrote `md:group-hover/menu-item:text-slate-900`.
  - `state-style.set` `group-hover` on a layer with no group parent: the same error on all 3 surfaces.
- MCP (`mcp-run.txt`): `set_state_style` group-hover wrote `group-hover:bg-[#2563eb]`. `set_forced_state` group-open, then `get_screenshot`: the chevron turns and fades (`mcp-forced-group-open.png`). `list_state_styles` lists the override and the forced frame. group-hover on the row button shows it (`mcp-forced-group-hover.png`). State null gives the default look (`mcp-default.png`).
- UI (playwright-core, mock agent, dark and light):
  - Chevron in `button.group[data-state]`: Parent hover, Parent open, Parent checked. Parent open sets `data-state="open"` on the button, the chevron fades. Default puts back `closed`.
  - Row button in `li.group`: Parent hover only. It marks the `li`, not the button, and the button shows.
  - `<p>` with no group parent: Parent hover is dimmed, the tip shows, a click does nothing.
  - Child of `group/menu-item`: Parent hover forces the named parent. The Opacity field under Parent hover wrote `group-hover/menu-item:opacity-40`, and the field reads the state value back.
- A fresh child of `group/card` with no group classes: `list_state_styles` gives `group: { name: "card" }`. MCP `set_forced_state` group-hover marks the card, and its own `hover:bg-amber-100` shows (`mcp-forced-fresh-named.png`). The Opacity field under Parent hover wrote `group-hover/card:opacity-40` (`mcp-run-fresh.txt`).
- Engine probe (`engine-probe.txt`): JSX `cn("group/menu-item ...")`, a Radix component parent and a `data-state` button parent are found. 8 variant forms round-trip.
- Bonaparte, read-only `git grep` (`bp-check.txt`): 139 of 152 `group-hover` and `group-data-[state=...]` uses read as a parent state (group-hover 114, open 19, checked 6). The other 13 use `active`, `closed` or `indeterminate`. `git status` was the same before and after (14 lines).
- `pnpm run typecheck`, `pnpm run lint:gate` and `pnpm run build:ui` pass.
- Screenshots: `chevron-parent-open-{dark,light}.png`, `row-parent-hover-{dark,light}.png`, `no-group-tip-{dark,light}.png`, `named-parent-hover-edit-dark.png`.

## Left out

- The Rotation check (`group-data-[state=open]:rotate-90`) waits for the rebase over pick 1.
- A real React app was not run. JSX was checked by the engine probe, and the UI on a Tailwind HTML page.
- After an inspector edit in a forced state, the frame shows the default look until the chip is picked again. The plain Hover chip does the same on `main`, so it is not new.
- `group-data-[state=active|closed|indeterminate]` and `has-*` parent forms are not read as states.
- `artifacts/mcp-snapshots` is not changed. The input enum, output (`group`) and description diffs for `set_state_style`, `list_state_styles` and `set_forced_state` wait for approval at merge.
- `.claude/goal/roadmap.md` is not in the worktree, so no Appendix A glob was added.
