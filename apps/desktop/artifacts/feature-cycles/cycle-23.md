# Feature cycle 23: next 5 features

Date: 2026-11-13. Main at `f0b702591` (all 5 cycle-22 picks and `fix/state-fill` merged).

## Method

- Read `cycle-22.md` (picks, runners-up, Results), the 5 `cycle-22/*.md` reports ("Left out"), cycles 13 to 21 (picks, runners-up, Results), the tail of `.claude/goal/feature-log.md`, `git log --oneline -120`, `bonaparte-benchmark.md`, `mcp-bonaparte-test-2/report.md` and the `journeys-run/*.md` reports and reruns.
- Checked each candidate with narrow greps in `packages/common/{actions,contracts}/src`, `apps/desktop/src/{ui,server,bridge,shared}` and Bonaparte (`git grep -l` on `*.tsx`, read-only, counts only).
- Proof of each gap:
  - Rotate and flip: the only rotation in the inspector is the free-text Transform row (`simple-model.ts` `EXTRA_ROWS`, placeholder `rotate(4deg)`). `DIRECT_STYLE_PROPERTIES` in `contracts.ts` has `transform` but no `rotate` or `scale`. Tailwind v4 `rotate-45` and `-scale-x-100` set the CSS `rotate` and `scale` properties, so a Bonaparte `rotate-180` chevron reads as `transform: none`. `flipX`, `-scale-x-100`, `scale-x-[-1]`: 0 hits in `ui`, `server` and `bridge`. Shift+H and Shift+V are free (`shared/keymap*.ts` has only `H`, `V`, `Mod+Shift+H`, `Alt+Shift+H`, `Alt+Shift+V`). Bonaparte: `rotate-` in 93 files.
  - Divide lines: `divide-y`, `divide-x`: 0 hits in `ui`, `server` and `bridge`. Bonaparte: `divide-y` in 99 files, `divide-x` in 5.
  - Parent states: `STYLE_STATES` in `contracts/src/state-styles.ts` has no `group-*` state. `group-data-`, `group-hover`: 2 hits in `ui` (none in state styles), 0 in `server`. Bonaparte: `group-hover:` in 63 files, `group-data-[state=` in 22 (often `group-data-[state=open]:rotate-180` on a chevron; the other `group-data-[` uses are sidebar `collapsible` and `side` keys). Named groups (`group/menu-item`, `group-hover/menu-item:`) are in 28 files. The open-states report "Left out" names it.
  - State sections: `useEditVariant` is used by fill, grid, stacking, motion and state styles, not by `features/effect`, `features/layer-style` or the Border position switch. `effect.set` (`set_effect`) and `layer-style.apply` (`apply_layer_style`) have no `variant` input. `FillVariantSchema` lives only in `actions/fill/schema.ts`. Cycle-22 Results: "Effect, saved layer and text styles, and the Border Inside/Outside switch still ignore the picked state" and "Switching stroke away from Inside moves content 2px".
  - Text lists: `list-disc`, `listStyle`: 0 hits in `ui`; the Tailwind engine has no `list-style` group (`keyword-groups.ts` has only `display: list-item`). `DIRECT_STYLE_PROPERTIES` has no `list-style-*`. Bonaparte: `list-disc` or `list-decimal` in 37 files.
- Branch check: `git branch -a` has no `feat/rotate-flip`, `feat/divide-lines`, `feat/parent-states`, `feat/state-sections` or `feat/text-lists`.
- Competitor recheck (2 web searches, 2026-11-13): no item dated November 2026 for Claude Design, Figma or Figma Make, v0, Lovable, Bolt, open design or doop. One Figma release-notes page lists Make connectors and npm import "in November" with no year; Design Studio already has npm-style app components and pasted data. No pick comes from a new competitor feature. Figma shortcut sheets confirm Shift+H and Shift+V flip.
- Skipped as the user's decision: the panel rail until edit mode, the Home cuts (`open-design-polish.md` §2 and §3, Bonaparte friction 8 and 11), the MCP snapshot approvals that wait from cycles 14 to 22, and the MCP names with repeated words (`create_pack_pack`).
- `fix/idle-chrome` (another agent, this session) owns headless Chrome, `get_screenshot`, the MCP client name, the Versions row, the `get_run` status and the tooltip after Escape. No pick touches a headless Chrome path. That is why frame fit to content is runner-up 1, not a pick.

## Skipped as built (checked this cycle)

Everything in the cycle-13 to 22 lists, plus:
- Token rename and delete in prototype projects (journey 15 item 1, High): fixed by `659003abe` (2026-11-12 19:55), after the journey report (18:15).
- Lock and author (journey 17): `af32acf56` and `11039cd26` (typed `Forbidden`, version author in `list_versions` and Versions).
- `edit_element` latency with the UI open (journey 18): rerun shows p50 150 to 180 ms.
- Figma tools found built: Selection colors (`list_style_values` path in `mcp/style-tools.ts`), outline view (`view.outline`), measurements (`canvas/measurements.tsx`), wrap and unwrap (`structure-edits-model.ts`), text case and underline (`text-style-toggles.tsx`), letter spacing, blend modes (`mix-blend-mode` in `DIRECT_STYLE_PROPERTIES`), copy as PNG (frame menu), after-delay link trigger (`link-interaction.ts` `delay`), aspect lock, min and max, constraints.
- Bonaparte frictions 7, 12, 15: done in polish-22.

## Ranking

Score = user value x fit with "simple and fast" / effort (1 to 5 each). Rank by value first; the score breaks ties.

| Rank | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|
| 1 | rotate-flip: Rotation field, Shift+H and Shift+V flip (Figma) | 5 | 5 | 2 | 12.5 |
| 2 | divide-lines: Lines between items in auto layout (Bonaparte `divide-y`) | 5 | 5 | 3 | 8.3 |
| 3 | parent-states: style a child from its parent's hover or open state | 4 | 4 | 3 | 5.3 |
| 4 | state-sections: Effect, layer style and Border position use the picked state | 4 | 5 | 2 | 10 |
| 5 | text-lists: Bullets and Numbers for list text (Figma) | 3 | 5 | 1 | 15 (capped by value) |

Rotate-flip is the Figma manual gap: Figma has a rotation field in the position block and Shift+H and Shift+V flip; Design Studio has only a raw Transform text row, and it misreads every Tailwind v4 `rotate-*` class. Divide lines is the Bonaparte pick: a Bonaparte list card with `divide-y divide-border` shows no lines in the inspector, and the person must write classes by hand. Parent states is the second Bonaparte item and closes the open-states "Left out": the chevron that turns when a menu opens is styled on the child from the parent. State sections bundles the cycle-22 open items in one correctness pick. Text lists is the second Figma gap, small, and shows only on list layers. No pick adds an always-visible control: the Rotation field shows only on a rotated layer or after Rotate… from the menu, flip is a key and a menu item, the lines choice is in the Gap menu, the parent states are in the existing state picker, and the List row shows only on `ul`, `ol` and `li` layers.

---

## 1. rotate-flip: Rotation field, Shift+H and Shift+V flip (Figma)

**Why.** Figma shows rotation in the position block, rotates in 15 degree steps with Shift, and flips with Shift+H and Shift+V. Design Studio has only the free-text Transform row. Tailwind v4 writes `rotate-45` and `-scale-x-100` as the CSS `rotate` and `scale` properties, not `transform`, so the inspector shows a Bonaparte `rotate-180` chevron with no rotation, and an `edit_element` of `transform: rotate(45deg)` writes `[transform:rotate(45deg)]` next to the class instead of `rotate-45`.

**UI behaviour.**
- One Rotation number field (degrees, with the existing scrub and math input) in the Position rows, next to X and Y. It shows only when the layer has a rotation that is not 0, or after "Rotate…" in the layer context menu or Cmd+K, which shows it with focus. No new section. It reads the computed `rotate` value (and a `rotate()` inside `transform` when `rotate` is `none`).
- Rotation 45 writes `rotate-45` (a theme step: 0, 1, 2, 3, 6, 12, 45, 90, 180), 17 writes `rotate-[17deg]`, -12 writes `-rotate-12`, 0 removes the class. CSS projects write `rotate: 17deg`. Shift+Arrow in the field steps 15 degrees.
- Shift+H flips horizontal: toggles `-scale-x-100` (CSS `scale: -1 1`). Shift+V flips vertical: `-scale-y-100`. Both are in the layer context menu (Arrange group) and in Cmd+K, with the keys shown. One undo step each.
- Rotate and flip never remove a `translate-*` or `scale-<n>` class on the same layer. `classes.ts` line 573 puts `translate`, `rotate`, `scale` and `skew` in one `transform` group today; give rotate and flip their own groups.
- Limit: the selection box on a rotated layer is the axis-aligned rect, as today. No rotate handle on the canvas (runner-up 9).

**Headless.** No new action. Add `rotate` and `scale` to the direct style properties through a new spread file, so `edit_element`, `batch_edit`, the agent direct tools and `set_state_style` take them: `{ "rotate": "45deg" }` writes `rotate-45`; `{ "scale": "-1 1" }` writes `-scale-x-100`. Their descriptions name the two keys. Input enum diff for those tools in `artifacts/mcp-snapshots`; user decision at merge.

**Main files.**
- Contracts: new `packages/common/contracts/src/transform-style-properties.ts` (`transform`, `rotate`, `scale`). In `contracts.ts` replace the `"transform",` line with `...TRANSFORM_STYLE_PROPERTIES` in place (net 0 lines; the file may not grow).
- Engine: new `server/direct-edit/engine/tailwind/rotate-scale.ts` (pure: degrees to `rotate-*`, flip to `-scale-x-100` and `-scale-y-100`, read back). Wire it in `tailwind/map.ts` as `outline.ts` is wired, and move the `transform` case (map.ts lines 783 to 787) into the new file, so `map.ts` (982) shrinks. This pick owns `classes.ts` (819, may not grow) and shares `map.ts` with pick 5 (different hunks).
- Bridge: the computed style read sends `rotate` and `scale` (the agent names the file; it is the one stroke-position changed for the outline values).
- UI: `inspector/{position-rows.tsx,position-model.ts}`, new `inspector/rotation-field.tsx`, new `inspector/use-rotation.ts`, new `inspector/flip-model.ts`, one new `rotation` block in `inspector/copy.ts`, `shared/keymap.ts` (2 entries, 459 lines, stays under 500), the layer context menu model and the Cmd+K selection commands file (the agent names them).

**Verify in the running app** (`STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev`).
- Tailwind fake app in `/tmp` with an icon `<svg className="rotate-180 translate-x-1">`. Select it: Rotation shows 180. Select a plain `div`: no Rotation field; Rotate… in the menu shows it with focus. Set 45: classes `rotate-45 translate-x-1`. Set 17: `rotate-[17deg]`. Set 0: no rotate class. Cmd+Z undoes each in one step.
- Shift+H: `-scale-x-100` and the icon mirrors. Shift+H again: the class goes. Shift+V: `-scale-y-100`. The context menu and Cmd+K show both with the keys. With focus in a text field, Shift+H types "H". Shift+H does not switch to the hand tool (H), Shift+V does not switch to the move tool (V), and Alt+Shift+H and Alt+Shift+V still distribute and do not flip.
- HTML project: Rotation 30 writes `rotate: 30deg`; Shift+H writes `scale: -1 1`.
- MCP `edit_element` `{ "rotate": "90deg" }`: `rotate-90`. `pnpm exec tsx scripts/call-action.ts` on the direct-edit style action with the same input: HTTP, MCP and agent outputs match.
- Bonaparte (read-only route copy): a `rotate-180` chevron shows 180. Bonaparte `git status --short` is unchanged.
- Dark and light screenshots of the Position rows with Rotation.

---

## 2. divide-lines: Lines between items in auto layout (Bonaparte `divide-y`)

**Why.** `divide-y` draws a line between each child of a stack. Bonaparte uses it in 99 files (lists, tables, settings cards), most often as `divide-y divide-border`. The inspector shows nothing for it, the engine has no `divide` group, and there is no CSS property for it, so `edit_element` cannot carry it. Figma users draw lines by hand; here one choice in the stack does it.

**UI behaviour.**
- The Gap mode menu of Auto layout (`gap-mode-field.tsx`) gets one entry: "Lines between". No new section. When on, a small row under Gap shows width (1, 2, 4, 8 px) and color (the existing color field with token snap).
- On a vertical stack it writes `divide-y divide-<color>` (`divide-y-2` for 2 px); on a horizontal stack `divide-x`. A direction switch swaps `divide-y` and `divide-x` in the same write and undo step. Off removes the `divide-*` classes. A layer with `divide-y` opens with the row shown.
- CSS projects: writes a `.sv-xxxxxx > * + * { border-top: 1px solid <color> }` rule (`border-left` for horizontal), through the CSS rule writer the state styles use.
- `divide-y-reverse`: shown read-only with the note "Edit in code".
- Bundled from space-stack "Left out": a layer with both `space-y-*` and `space-x-*` converts both axes on Shift+A (keeps the larger as gap and notes it), and the inspector reads `md:space-y-*` when the md breakpoint is picked.

**Headless.** Two new actions in the existing `spacing` domain (a divider is spacing between items). A new domain is not used: `main/live-layer.ts` imports each domain live layer by hand (`FillLive`, line 27), and W12 forbids edits to that file. The new service is provided in `handlers/spacing/live.ts`.
- `spacing.getDivider`: GET, `access: "read"`, tool `get_divider_spacing`, input `projectId`, `directionId`, `target`, `variant` (base by default). Output: `{ axis: "x" | "y" | null, width, color, token, isReverse }`.
- `spacing.setDivider`: POST, `access: "edit"`, `needs: "project.update"`, tool `set_divider_spacing`, input `projectId`, `directionId`, `target`, `variant`, `axis` (`"x"`, `"y"` or `null` to remove), `width`, `color` or `token`. `invalidates: ["spacing.getDivider"]`.
- Agent: `{ lean: false, name: "set_divider_spacing", set: "core", short }` and the same for `get_divider_spacing`. Stamp both with `pnpm run new:action` (check the stamp syntax for a 2-object domain), copy the fill handler shape, take `variant` from the `StyleVariantSchema` that pick 4 moves to `_core` (if pick 4 is not merged yet, use a local schema in `spacing/divider/schema.ts` and repoint after the merge). Check `studio/derived-tool-name` and `studio/read-verb-access` on both.
- New tool names, so new MCP snapshot entries; user decision at merge.

**Main files.**
- Actions: new `packages/common/actions/src/spacing/{get-divider.ts,set-divider.ts}`, new `spacing/divider/schema.ts` (generated `index.ts` and `routes.ts` by gen-routes).
- Server: new `server/style-scope/divider/` (class writer and CSS rule writer, as `style-scope/fill` does; one service per file), one export line in `server/style-scope/index.ts`, new `server/handlers/spacing/{get-divider.ts,set-divider.ts}`, `server/handlers/spacing/live.ts` (provide the new service). No edit to `tailwind/map.ts`, `classes.ts` or `plan.ts`.
- Space-stack bundle: `server/direct-edit/engine/tailwind/space-stack.ts` (both axes), `inspector/{space-stack-model.ts,use-space-stack.ts}`.
- UI: `inspector/gap-mode-field.tsx`, new `inspector/divider-row.tsx`, new `inspector/divider-model.ts`, new `inspector/use-divider.ts`, one mount line in `inspector/auto-layout-body.tsx`, one new `divider` block in `inspector/copy.ts`.

**Verify in the running app.**
- Tailwind fake app with `<ul className="flex flex-col">` and 4 `<li>`. Gap menu > Lines between, color slate-200: classes `divide-y divide-slate-200`, lines show. Width 2: `divide-y-2`. Direction Horizontal: `divide-x`. Off: no `divide-*`. Cmd+Z undoes each in one step.
- A `<div className="divide-y divide-border">` opens with the row on and the token `border`.
- HTML project: Lines between writes the `> * + *` rule; the lines show.
- A `space-y-4 space-x-2` layer: Shift+A gives `flex flex-col gap-4` with no `space-*`.
- MCP `set_divider_spacing` `{ axis: "y", width: 1, token: "border" }`, then `get_divider_spacing`: the same values. `pnpm exec tsx scripts/call-action.ts spacing.setDivider '<json>'`: 3 surfaces match.
- Bonaparte (read-only route copy): a settings card with `divide-y` shows the row. Bonaparte `git status --short` is unchanged.
- Dark and light screenshots of the Gap menu and the row.

---

## 3. parent-states: style a child from its parent's hover or open state

**Why.** In Bonaparte the chevron of a menu or accordion turns when the parent opens (`group-data-[state=open]:rotate-180`, 22 files), and row actions show when the row is hovered (`group-hover:`, 63 files). 28 files use named groups (`group/menu-item`). The state picker covers the layer's own states only, so this look cannot be styled or seen from the UI, the agent or MCP. The open-states report left it out.

**UI behaviour.**
- The state picker lists "Parent hover" and, when the parent has `data-state`, "Parent open" and "Parent checked", only for a layer whose nearest ancestor with the `group` class is in the same file, or for a layer that already has `group-*` classes. Other layers show the list as today. No new control.
- Parent hover writes `group-hover:`, Parent open `group-data-[state=open]:`, Parent checked `group-data-[state=checked]:`. Breakpoints combine as today: `md:group-hover:`. When the ancestor has a named group (`group/menu-item`), it writes the named form (`group-hover/menu-item:`) and reads both forms.
- When no ancestor has `group`, the entries show disabled with the tip "Add the group class to the parent". The pick never writes to a second element (the parent is often in another file).
- Show the state on the canvas: a forced parent state forces `:hover` or sets `data-state` on the `group` ancestor, not on the layer, and puts the old value back on Default.
- CSS projects: the entries do not show (no group ancestor class). Out of scope.

**Headless.** No new action. Add `group-hover`, `group-open` and `group-checked` to `STYLE_STATES`, so `set_state_style`, `list_state_styles` and `set_forced_state` take them. Their descriptions name the 3 states, the written forms and the `group` class rule. Input enum and description diffs for those 3 tools; user decision at merge.

**Main files.**
- Contracts: `packages/common/contracts/src/state-styles.ts` (188 lines: the list and a `GROUP_STATE_VARIANTS` map next to `DATA_STATE_VARIANTS`).
- Engine: `server/style-scope/engine/state-scope.ts` (189 lines: read and write the `group-*` prefixes, and keep the data-state part order fix of `8da5cf134`), the variant parse file behind `style-scope/engine/deps.ts`, the group ancestor check in `server/state-styles/` (the agent names it), `server/state-styles/input.ts` (descriptions).
- Actions: `packages/common/actions/src/state-style/{set.ts,inspect.ts,set-forced.ts}` (descriptions only).
- Bridge: `bridge/force-state.ts` (374 lines; force on the ancestor).
- UI: `ui/features/state-styles/{state-styles-model.ts,copy.ts}`.

**Verify in the running app.**
- Tailwind fake app: `<button className="group" data-state="closed"><svg className="group-data-[state=open]:rotate-180"/></button>`. Select the svg: the picker lists Parent open. Choose it and set opacity 50: the class is `group-data-[state=open]:opacity-50`. Force Parent open: the svg fades. After the rebase over pick 1, set Rotation 90: `group-data-[state=open]:rotate-90`, and forced Parent open turns it. Default: back.
- A row `<li className="group"><button className="opacity-0 group-hover:opacity-100">`: the picker lists Parent hover; forcing it shows the button.
- A layer with no `group` ancestor: the entries are disabled with the tip. A child of `group/menu-item`: Parent hover writes `group-hover/menu-item:`.
- MCP `set_state_style` `state: "group-open"`, then `set_forced_state` `group-open`, then `list_state_styles`: the override and the forced frame are listed. `pnpm exec tsx scripts/call-action.ts state-style.set '<json>'` on the 3 surfaces.
- Bonaparte (read-only, `git grep`): count the `group-data-[state=...]` and `group-hover:` uses that read as a state; report the count. Bonaparte `git status --short` is unchanged.
- Dark and light screenshots of the picker and the forced chevron.

---

## 4. state-sections: Effect, layer style and Border position use the picked state

**Why.** Cycle 22 made fill write the picked state (`fix/state-fill`), but the Effect section, Apply layer style and the Border position switch still write the base style. With Hover picked, a shadow edit changes the default look. Two more Border bugs from cycle 22 sit in the same files: a switch away from Inside moves the content 2 px, and a ring set only under a variant (`focus-visible:ring-2`) does not show.

**UI behaviour.**
- With a state or breakpoint picked in the variant bar, Effect edits (shadow, blur, layer blur) write the prefix: `hover:shadow-lg`, `md:hover:shadow-lg`. Apply layer style writes each class of the style with the prefix and removes only same-prefix classes. The Border position switch (Inside, Center, Outside) writes `focus-visible:ring-2` or `hover:outline` forms. The base classes stay.
- The fields show the state value after the write, as Fill does.
- Switching Inside to Outside or Center keeps the content in place: in the same write and undo step, the switch adds the old border width to the padding of each side (`border-2 p-4` to Outside gives `outline-2 p-[18px]`, or the scale step when it is exact). Back to Inside removes the added width.
- A ring under the picked variant shows in the Border section.
- Cut: Apply text style under a state (Figma has no such thing; runner-up 2).

**Headless.** Add `variant` (default base, `Schema.withDecodingDefaultKey`) to `effect.set` (`set_effect`) and `layer-style.apply` (`apply_layer_style`), as `fill.set` has. Tool names stay. Move `FillVariantSchema` from `actions/fill/schema.ts` to a new `actions/_core/style-variant.ts` as `StyleVariantSchema`, and point fill, effect and layer style at it (no import of `fill/schema.ts` from another domain, W14). Descriptions name `variant` with the same text as `set_fill`. Input diffs for `set_effect` and `apply_layer_style`; user decision at merge.

**Main files.**
- Actions: new `packages/common/actions/src/_core/style-variant.ts`, `fill/schema.ts` (remove the local schema), `fill/{set.ts,get.ts}` (import), `effect/{set.ts,schema.ts}`, `layer-style/{apply.ts,schema.ts}`.
- Server: the effect and layer-style writers in `server/style-scope/{effect,layer-style}/` (copy the prefix logic of `style-scope/fill`), `server/handlers/{effect,layer-style}/` (pass `variant`).
- UI: `ui/features/effect/*` and `ui/features/layer-style/*` (send `useEditVariant`), `inspector/{use-stroke-position.ts,stroke-position-model.ts,use-stroke-position-ring.ts}`. No new copy block unless a tip is needed; then one `stateSections` block in `inspector/copy.ts`.

**Verify in the running app.**
- Tailwind fake app, a button `bg-white shadow-sm`. Pick Hover, set shadow lg: `hover:shadow-lg`, base `shadow-sm` stays. Cmd+Z: gone in one step. md + Hover: `md:hover:shadow-lg`.
- Save a layer style from a card, pick Hover on a second card, Apply: every class of the style has `hover:`, the base classes stay.
- Pick Focus visible, Border position Outside width 2: `focus-visible:outline-2` (or ring form on a ring layer). The section reads it back.
- `border-2 p-4` card, switch to Outside: `p-[18px]` and the content box does not move (screenshot diff). Back to Inside: `p-4`.
- HTML project: Hover shadow writes a `.sv-xxxxxx:hover` rule.
- MCP `set_effect` and `apply_layer_style` with `variant: "hover:"`: hover classes only. `pnpm exec tsx scripts/call-action.ts effect.set '<json>'` and `layer-style.apply`: 3 surfaces.
- Dark and light screenshots of the Effect section with Hover picked.

---

## 5. text-lists: Bullets and Numbers for list text (Figma)

**Why.** Figma text has a list style: none, bulleted, numbered. Tailwind preflight removes list markers, so `ul` and `ol` show no bullets until `list-disc` or `list-decimal` is added. Bonaparte uses them in 37 files. The engine has no `list-style` group and the inspector no control.

**UI behaviour.**
- A "List" row in the Text section, shown only for a `ul`, `ol` or `li` layer, or a layer with a `list-*` class: a choice None, Bullets, Numbers, and an Inside toggle. Other layers do not show the row.
- Bullets writes `list-disc`, Numbers `list-decimal`, None `list-none`; Inside toggles `list-inside` (Outside `list-outside`). On an `li`, the row edits the parent list (the agent checks the parent is in the same file; else the row is read-only with the note "Edit the list layer"). CSS projects write `list-style-type` and `list-style-position`. One undo step per click.

**Headless.** No new action. Add `list-style-type` and `list-style-position` to the direct style properties through a new `packages/common/contracts/src/text-format-properties.ts` that also holds `font-style`, `text-decoration-line` and `text-transform` (replace those 3 lines in `contracts.ts` with one spread line, net shrink). So `edit_element`, `batch_edit`, the agent direct tools and `set_state_style` take them. Input enum diff; user decision at merge.

**Main files.**
- Contracts: new `text-format-properties.ts`, one spread in `contracts.ts` (a different line from pick 1).
- Engine: the 2 groups (`list-style-type`, `list-style-position`) in `keyword-groups.ts` (68 lines) and the 2 `SINGLE_PROPS` lines in `tailwind/map.ts`, as `text-wrap` is wired (map.ts line 89). `map.ts` may not grow on this branch: offset the 2 lines with an equal move out of `map.ts`, in a hunk away from the `transform` case that pick 1 moves (for example the `flex` case into a new `tailwind/flex-token.ts`). Do not edit `classes.ts` or `plan.ts`.
- UI: new `inspector/list-style-row.tsx`, new `inspector/list-style-model.ts`, new `inspector/use-list-style.ts`, one mount line in `inspector/text-section.tsx`, one new `textList` block in `inspector/copy.ts`.

**Verify in the running app.**
- Tailwind fake app with `<ul><li>One</li><li>Two</li></ul>`. Select the `ul`: List row shows None. Bullets: `list-disc`, bullets show. Numbers: `list-decimal`. Inside: `list-inside`. Select an `li`: the row edits the `ul`. Select a `p`: no row. Cmd+Z undoes each click.
- HTML project: Bullets writes `list-style-type: disc`.
- MCP `edit_element` `{ "list-style-type": "decimal" }` on the `ul`: `list-decimal`. `pnpm exec tsx scripts/call-action.ts` on the same edit: 3 surfaces match.
- Bonaparte (read-only route copy): a `list-disc` list shows Bullets. Bonaparte `git status --short` is unchanged.
- Dark and light screenshots of the Text section with the List row.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 rotate-flip | `contracts/src/transform-style-properties.ts`, the `transform` line of `contracts.ts`, `tailwind/{rotate-scale.ts,map.ts,classes.ts}`, the bridge style read, `inspector/{position-rows.tsx,position-model.ts,rotation-field.tsx,use-rotation.ts,flip-model.ts}`, `rotation` block of `inspector/copy.ts`, `shared/keymap.ts`, the layer context menu and Cmd+K selection command files |
| 2 divide-lines | `actions/src/spacing/{get-divider.ts,set-divider.ts,divider/schema.ts}`, `server/style-scope/divider/*`, `server/handlers/spacing/{get-divider.ts,set-divider.ts,live.ts}`, `tailwind/space-stack.ts`, `inspector/{gap-mode-field.tsx,auto-layout-body.tsx,divider-*,use-divider.ts,space-stack-model.ts,use-space-stack.ts}`, `divider` block of `inspector/copy.ts` |
| 3 parent-states | `contracts/src/state-styles.ts`, `style-scope/engine/{state-scope.ts,deps.ts target}`, `server/state-styles/*`, `actions/state-style/*` (descriptions), `bridge/force-state.ts`, `ui/features/state-styles/*` |
| 4 state-sections | `actions/src/_core/style-variant.ts`, `actions/src/{fill,effect,layer-style}/*` (schema and the 3 action files), `server/style-scope/{effect,layer-style}/*`, `server/handlers/{effect,layer-style}/*`, `ui/features/{effect,layer-style}/*`, `inspector/{use-stroke-position.ts,stroke-position-model.ts,use-stroke-position-ring.ts}` |
| 5 text-lists | `contracts/src/text-format-properties.ts`, the 3 text lines of `contracts.ts`, `tailwind/keyword-groups.ts`, the `SINGLE_PROPS` hunk and one moved case of `tailwind/map.ts`, `inspector/{list-style-*,use-list-style.ts,text-section.tsx}`, `textList` block of `inspector/copy.ts` |

Shared files and conflict warnings:
- `src/ui/features/inspector/copy.ts` (389 lines): picks 1 (`rotation`), 2 (`divider`) and 5 (`textList`) each add one new block, and pick 4 adds `stateSections` only if it needs a tip. This is the main collision (cycle 22 hit it with two blocks and the export line). Each pick adds its block and its export name only; none edits an existing block. Merge one at a time, rebase, keep both sides, format.
- `ui/features/state-styles/copy.ts`: pick 3 only. `ui/features/canvas/copy.ts`: no pick.
- `packages/common/contracts/src/contracts.ts` (over 2000 lines, may not grow): pick 1 replaces the `"transform",` line, pick 5 replaces the `font-style`, `text-decoration-line` and `text-transform` lines. Different lines, but the same array, so the second merge rebases. Run gen-routes after each.
- `packages/common/contracts/src/state-styles.ts`: pick 3 only.
- Tailwind engine: `map.ts` (982, may not grow) is shared by picks 1 and 5 in different hunks: pick 1 moves the `transform` case out, pick 5 adds 2 `SINGLE_PROPS` lines and moves one other case out. Merge 1, then rebase 5. Pick 1 alone owns `classes.ts` (819, may not grow). No pick edits `plan.ts`. Pick 2 edits only `space-stack.ts` and writes divide classes in its own `style-scope/divider` writer. Pick 3 and 4 do not touch the engine folder.
- `actions/src/fill/*`: pick 4 only (moves the variant schema). Pick 2 uses `_core/style-variant.ts` once pick 4 is merged; before that, a local schema it repoints after the merge.
- Bridge: pick 1 owns the computed style read; pick 3 owns `bridge/force-state.ts`. No other pick edits `src/bridge`.
- `inspector/stroke-position-*`: pick 4 only. `inspector/auto-layout-*`, `gap-*`: pick 2 only. `inspector/position-*`: pick 1 only. `inspector/text-section.tsx`: pick 5 only.
- `shared/keymap.ts` (459): pick 1 only (2 entries).
- New actions: `spacing.getDivider`, `spacing.setDivider` (pick 2, existing domain, so no edit to `main/live-layer.ts`). Run `pnpm exec tsx scripts/gen-routes.ts` after its merge.
- `server/style-scope/index.ts`: pick 2 adds one export line; pick 4 adds one only if the effect or layer-style writer gets a new export. Keep both lines at the rebase.
- `server/state-styles/`: pick 3 owns it. Pick 2 reuses the CSS rule writer only through an existing export of `server/state-styles/index.ts`; if it needs a new export, it adds that one line, and the rebase over pick 3 keeps both.
- `artifacts/mcp-snapshots/*.json`: `edit_element`, `batch_edit`, `set_state_style` inputs (picks 1 and 5); `set_state_style`, `list_state_styles`, `set_forced_state` inputs and descriptions (pick 3); `set_effect`, `apply_layer_style` inputs (pick 4); new `get_divider_spacing`, `set_divider_spacing` (pick 2). Approve at merge (user decision), with the cycle-14 to 22 diffs that still wait.
- `.claude/goal/roadmap.md` Appendix A: add each pick's new globs before its slice runs (L6e), when the roadmap is in the worktree (cycle 22 found it was not).

## Merge order

All 5 can run at once. Merge 4 (state-sections: moves the variant schema to `_core`; gen-routes), then 1 (rotate-flip: `contracts.ts`, `map.ts`, first `inspector/copy.ts` block; gen-routes), then 3 (parent-states: state styles only; after the rebase rerun the chevron check with Rotation; gen-routes), then 5 (text-lists: rebase over pick 1 in `contracts.ts`, `map.ts` and `inspector/copy.ts`; gen-routes), then 2 (divide-lines last: 2 new actions and the most new files; repoint its variant schema to `_core/style-variant.ts`, rebase over 2 copy blocks, gen-routes). After the last merge run `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run check:scripts`, `pnpm run lint:gate`, `pnpm run build:ui` and `pnpm run check:clip`.

## Runners-up

1. Frame fit to content: Figma "Resize to fit" for canvas frames (the frame grows to the page height); the MCP path needs headless Chrome to measure, which `fix/idle-chrome` owns, "fit" is not an N3 verb (use `update_frame_canvas` with a height), and `min-h-screen` pages grow with the frame; after `fix/idle-chrome` merges.
2. Apply text style under a picked state (cut from pick 4; Figma has no such thing, low use).
3. `get_screenshot` of a failed dev server returns `isError: false` (journey 7, Low); waits for `fix/idle-chrome`.
4. Starter Geist fonts: the first import response lists Geist while the scan runs; needs a `FontsSchema` change in `pack-manifest.ts`.
5. Clickable share link for app route prototypes (journey 15); today app projects get PNG snapshots; high effort.
6. "App now" label on `page.importSource` frames (route-sync left out since cycle 16).
7. Outline matching frames on hover of the shared layers chip (cycle-15 left out; needs a canvas path through `ui/app`).
8. `first:` and `last:` states in the state picker (Bonaparte 113 files), after pick 3.
9. Rotate handle on the canvas: drag just outside a corner to rotate, Shift for 15 degree steps (Figma), after pick 1.
10. Undo speed: measure Cmd+Z to preview for a text edit and patch in place if the preview reloads (friction 13, unverified).

Sources: [Figma release notes archive](https://www.figma.com/release-notes/archive/?page=2), [mcp.directory 2026 comparison](https://mcp.directory/blog/claude-design-vs-stitch-vs-v0-vs-lovable-vs-figma-make-2026), [Figma shortcuts cheatsheet](https://meshworld.in/blog/cheatsheets/figma-shortcuts-cheatsheet/), [Figma forum: flip elements](https://forum.figma.com/t/flip-elements/10176).

## Results

- Merged in order: state-sections, rotate-flip, parent-states, text-lists, divide-lines. Main at ed99abc75.
- Conflicts resolved by keeping both sides: text-lists vs rotate-flip in `tailwind/classes.ts` (group union: KeywordGroup, OutlineGroup, RotateScaleGroup), `contracts.ts` (both property imports) and `inspector/copy.ts`; divide-lines vs both in `inspector/copy.ts`. Formatted, then gen-routes.
- Checks: gen-routes --check pass, typecheck 0 errors, lint:gate pass (59609, baseline 89733), build:ui pass, check:clip 0 findings, desktop:pack pass.
- Installed app: :4570 returns 200. Server idle CPU 0.00 CPU-s/min over 60 s.
- Open: divide lines do not work on CSS projects (rule writer rejects `> * + *`). The space-stack bundle (both axes, `md:space-y-*`) was not done. Text lists cannot edit the parent list from an `li`. An edit on a rotation set by `transform` adds a second rotation. Shadows are written as exact values, not scale names. MCP snapshots not refreshed (user decision).
