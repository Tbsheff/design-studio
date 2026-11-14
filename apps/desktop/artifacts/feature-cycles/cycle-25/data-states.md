# Cycle 25 pick 4: data-states

Branch `feat/data-states`. No new action.

## Changed

- Contracts (`state-styles.ts`): `STYLE_STATES` adds `closed`, `on`, `active-item` and `invalid` after `selected`. `DATA_STATE_VARIANTS` adds `closed` (`data-[state=closed]`), `on` (`data-[state=on]`), `active-item` (`data-[active=true]`) and `disabled-item` (`data-[disabled]`). New `ARIA_STATE_VARIANTS` (`invalid`: `aria-invalid`). `toDataStateAttribute` replaces `toDataStateValue` and gives the attribute name and value (`data-active` / `true`). `isOtherStatePart`, `StateListResult.other`, `ForcedStatePart` takes `invalid`.
- `shared/variants.ts` (outside the owned list, as in cycle 24): reads `aria-invalid` as a state.
- `style-scope/engine/state-scope.ts`: `hasItemPart` replaces `hasSelectedItem`. Disabled writes `data-[disabled]:` when the layer has it, else `disabled:`. Reads both. `toOtherStateParts` lists the other `data-*` and `aria-*` prefixes.
- `variant-css.ts`: writes `[data-state="closed"]`, `[data-state="on"]`, `[data-active="true"]`, `[aria-invalid="true"]` and `[data-disabled]` rules. The rule reader parses them.
- `bridge/force-state.ts` (483 lines): holds any attribute, not only `data-state`. It sets `data-state`, `data-active`, `aria-invalid`, and `data-disabled=""` for Disabled, then puts the old value back.
- UI: Closed and On join Open, Checked and Selected (data-state attribute or class). Active item shows for `data-active` or the class. Invalid shows for `input`, `textarea`, `select`, `role=combobox` or the class. The other prefixes show as faint, mono, read-only chips. One `dataStates` block in `copy.ts`.
- Descriptions of `set_state_style` (583 chars), `list_state_styles` (596) and `set_forced_state` (578) name the new states. `server/state-styles/input.ts` has the same text.

## Checked

Dev run on port 47910, `STUDIO_AGENT=mock`, `STUDIO_DATA_DIR=ds-wt/data-states-data`. React project (Vite template plus the Tailwind browser script) and a plain HTML page.

- `call-action.ts`:
  - `state-style.inspect` on `data-[side=top]:mt-1`: pass, 3 surfaces, 0 diffs, `other: ["data-[side=top]"]`.
  - `state-style.setForced` `on` on `#toggle`: pass, 3 surfaces, 0 diffs.
  - `state-style.set` `on` fill on the toggle: HTTP wrote `data-[state=on]:bg-slate-200`. MCP and the agent answered "already has this value" (not idempotent, as in cycles 21 to 24).
  - `state-style.set` `invalid` in the HTML page: wrote `.sv-77c563[aria-invalid="true"] { border-color: #ef4444; }`. A later Hover rule keeps it.
- HTTP (`http-writes.txt`): Closed opacity 50 gives `data-[state=closed]:opacity-50`. The menu item gives `data-[disabled]:opacity-25`. The plain button gives `disabled:opacity-50`. `md` + Invalid gives `md:aria-invalid:border-[#ef4444]`. Active item gives `data-[active=true]:bg-slate-200`. Reads give `closed`, `invalid` and `disabled` for the seeded classes.
- MCP (`mcp-run.txt`): `set_state_style` `on` wrote `data-[state=on]:opacity-75`. `list_state_styles` lists it, with `other` and the forced frame.
- UI (playwright-core):
  - Toggle: On shows. On forces `data-state="on"` and the fill shows. Padding top 8 in On wrote `data-[state=on]:pt-2`. One Cmd+Z removed it.
  - Email input: only Invalid is added. It forces `aria-invalid="true"` and shows the red border.
  - `p` and the plain button: no data chips.
  - Panel: Closed forces opacity 0.5.
  - Nav: Active item. Padding top wrote `data-[active=true]:pt-2`.
  - Menu item: Disabled wrote `data-[disabled]:pt-2`. The plain button wrote `disabled:pt-2`.
  - The Default chip puts back `open`, no `aria-invalid` and no `data-disabled`.
- Bonaparte, read-only `git grep` (`bp-check.txt`): `data-[state=closed]:` 65, `data-[state=on]:` 33, `data-[active=true]:` 40, `data-[disabled]:` 24, `aria-invalid:` 33 now read as a state. `git status --short`: 14 lines before and after.
- `pnpm run typecheck`, `pnpm run lint:gate` (59606, baseline 89733) and `pnpm run build:ui` pass. No real-model run (the spec needs none).
- Screenshots: `picker-toggle-on-{dark,light}.png`, `picker-input-invalid-{dark,light}.png`, `picker-side-other-{dark,light}.png`.

## Left out

- Esc deselects the layer in the canvas and leaves the forced attribute on the frame. This is already on `main`: Checked does the same. The Default chip puts the value back.
- The Fill color field does not write on Enter, also in Default. This is already on `main`. The UI checks use Padding top.
- The fit check runs in the UI model from the start tag, not in `server/state-styles`.
- CSS projects write Disabled as `:disabled`. They write `[data-disabled]` only through a `data-[disabled]:` prefix.
- `artifacts/mcp-snapshots` is not changed. Approve at merge: the input enum of `set_state_style`, `list_state_styles` and `set_forced_state` (4 new states), the descriptions, and the `other` output field of `list_state_styles`.
- `.claude/goal/roadmap.md` is not in the worktree, so no Appendix A glob was added.
