# Cycle 22 pick 3: open-states

Branch `feat/open-states`. No new action.

## Changed

- Contracts: `state-styles.ts` adds `open`, `checked` and `selected` to `STYLE_STATES`, and a `DATA_STATE_VARIANTS` map: open `data-[state=open]`, checked `data-[state=checked]`, selected `data-[state=active]`, and the kept form `selected-item` `data-[state=selected]`.
- Variants: `shared/variants.ts` reads and writes the 4 data-state parts. A bare `open:` is not read as the Radix state. Data-state parts sort before pointer states, so `data-[state=open]:hover:` reads back the same.
- Engine: `state-scope.ts` builds every state prefix through `toStatePart`. CSS mode reads both selected forms. `set.ts` keeps `data-[state=selected]:` when the layer already uses it.
- CSS pages: `direct-edit/engine/variant-css.ts` (not on the owned list, small change) writes `.sv-xxxxxx[data-state="open"]`. `RULE_LINE` reads it, so a later hover edit keeps the open rule.
- Bridge: `force-state.ts` sets `data-state` on the layer, saves the old value and puts it back when the frame goes to Default. It writes the attribute only when the value changes. `contracts.ts` widens the `force-state` message states.
- UI: the state picker lists Open, Checked and Selected only when the layer start tag has `data-state` or a `data-[state=` class, or the layer has data-state styles. New labels and tips in `state-styles/copy.ts`.
- Descriptions: `set_state_style`, `list_state_styles` and `set_forced_state` name the 3 states and the `data-state` forms. The forced-state description gives the limit: a Radix part that renders again can set its own value back.

## Checked

- `call-action.ts state-style.set` (3 surfaces). HTTP wrote the change. MCP and the agent decoded the new states and ran the handler. They answered "already has this value", because the action is not idempotent (same as cycle 21).
  - Open on `data-[state=open]:bg-slate-100` gives `data-[state=open]:bg-slate-200`.
  - Selected on a tab gives `data-[state=active]:`, and with md gives `md:data-[state=active]:`.
  - Selected on a layer with `data-[state=selected]:` keeps that form.
  - CSS page: Open writes `.sv-b775b1[data-state="open"]`. A hover edit after it keeps the open rule. `state-style.inspect` lists both.
- MCP: `set_state_style` open, then `set_forced_state` open on `#trigger`, then `get_screenshot`. The shot shows the open look (`mcp-forced-open.png`). `list_state_styles` lists the override and the forced frame. State null gives the closed look again (`mcp-default.png`).
- UI (playwright-core, port 46610):
  - The trigger and tab show Open, Checked and Selected. A plain `<p>` does not.
  - Open sets `data-state="open"` in the frame. Default puts back `closed`.
  - Text color in Open writes `data-[state=open]:text-[#1d4ed8]`. Selected on a tab writes `data-[state=active]:`. On a `data-[state=selected]` tab it writes that form and forces `data-state="selected"`.
- Screenshots: `open-picker-{dark,light}.png`, `open-forced-{dark,light}.png`, `plain-picker-dark.png`. In the forced shots the Ask chip covers the trigger; `mcp-forced-open.png` shows the open look.
- Bonaparte, read-only, by `git grep`: 235 of 263 `data-[state=...]` class uses read as a state (open 113, selected 97, checked 25) (`bp-check.txt`). `git status` was unchanged (14 lines before and after).
- `pnpm run typecheck`, `pnpm run lint:gate` and `pnpm run build:ui` pass.

## Left out

- Fails: the spec step "choose Open and set fill slate-200". The Fill Apply button in Appearance writes a base `bg-*` class in every state (Hover too), so it changes the default look. `fill.set` has its own class writer (`style-scope/fill`) and takes no variant. Other inspector fields (text color and the rest of direct edit) write the state prefix. MCP `set_state_style` with `background-color` writes `data-[state=open]:bg-*`.
- `group-data-[state=...]` and `has-data-[state=...]` (28 Bonaparte uses, 14 class names) style a child from a parent state. They are not read as states.
- MCP `set_forced_state` with `selected` always sets `data-state="active"`. The picker sets `selected` on a layer that uses the `data-[state=selected]` form.
- The Bonaparte inspector was not opened in a running app: a local clone has no `node_modules` and no database. The engine was checked on real Bonaparte classes.
- `artifacts/mcp-snapshots` is not changed. The input enum and description diffs for `set_state_style`, `list_state_styles` and `set_forced_state` wait for approval at merge.
- `pnpm run check:scripts` fails: check-actions has 558 hits (baseline 410). No hit is in a file that this pick changes. Not checked on main.
- The `.claude/goal` roadmap is not in the worktree, so no Appendix A glob was added.

## State fill fix

Branch `fix/state-fill`. Fixes the Fill Apply bug in "Left out".

- Changed: `fill.set` and `fill.get` take `variant` (default `""`, the base style), as `DirectEditRequest.variant` does. Tool names stay `set_fill` and `get_fill`. The Fill section sends the picked prefix from `useEditVariant`.
- Tailwind: every fill class (solid, gradient head, stops, blend) gets the prefix. Apply removes only fill classes with the same prefix, so the base `bg-*` stays.
- CSS pages: the variant goes to the direct edit style path, which writes a `.sv-xxxxxx:hover` or `[data-state="open"]` rule.
- UI (mock agent, Tailwind page, dark and light): Hover wrote `hover:bg-[#2563eb]`, Cmd+Z removed it, Open wrote `data-[state=open]:bg-[#e2e8f0]`. Base `bg-white` did not change. The Fill field shows the state fill after Apply. Shots in `state-fill/`.
- MCP `set_fill`: Tailwind `hover:` wrote `hover:bg-[#0f172a]`. CSS `hover:` and `data-[state=open]:` wrote state rules, and `.trigger` kept `background: white` (`mcp-css.txt`, `mcp-tw.txt`).
- `call-action.ts fill.set` with `md:data-[state=open]:` and a linear gradient wrote `md:data-[state=open]:bg-linear-90` with prefixed `from` and `to` stops. MCP and the agent answered "already has this fill" because the action is not idempotent.
- `pnpm run typecheck`, `pnpm run lint:gate` and `pnpm run build:ui` pass.
- Left out: `fill.get` on a CSS page reads only the base fill, not the state rule. The Effect section (shadow, blur) writes through stylesheet effect classes and takes no state; it needs its own design. The `set_fill` and `get_fill` input diffs in `artifacts/mcp-snapshots` wait for approval at merge.
