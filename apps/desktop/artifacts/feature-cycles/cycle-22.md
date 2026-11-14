# Feature cycle 22: next 5 features

Date: 2026-11-13. Main at `d49229007` (all 5 cycle-21 picks merged, plus the Text wrap label fix).

## Method

- Read `cycle-21.md` (picks, runners-up, Results), the 5 `cycle-21/*.md` reports ("Left out"), cycles 13 to 20 (picks, runners-up, Results), the tail of `.claude/goal/feature-log.md`, `git log --oneline -120`, `bonaparte-benchmark.md`, `mcp-bonaparte-test-2/report.md` and the `journeys-run/*.md` reports and reruns.
- Checked each candidate with narrow greps in `packages/common/{actions,contracts}/src`, `apps/desktop/src/{ui,server,bridge,shared}` and Bonaparte (read-only, counts only).
- Proof of each gap:
  - Stack spacing: `space-[xy]` has 0 hits in `ui/features/inspector`, `bridge` and `server/direct-edit/engine/tailwind`. `auto-layout-model.ts` knows only `flex` and `inline-flex`. Bonaparte has `space-y-` in 1491 `.tsx` files.
  - Stroke position: every `outline-offset` hit in `src/ui` and `src/server` is app CSS, a CSS module or a template `DESIGN.md`. None is in the inspector or the engine. `DIRECT_STYLE_PROPERTIES` and `border-side-properties.ts` have no `outline-*` key. The Tailwind engine has no `ring` or `outline` group.
  - Open states: `STYLE_STATES` in `contracts/src/state-styles.ts` is `hover`, `focus-visible`, `active`, `disabled`, `dark`. `statePrefixOf` in `style-scope/engine/state-scope.ts` writes `${state}:`, so it cannot write `data-[state=open]:`. Bonaparte has `data-[state=` in 77 app `.tsx` files and 29 package files (`open` 132 uses, `active` 99, `closed` 68, `checked` 34).
  - Guide context: `user-message.ts` line 194 names the layout grid of each frame through `layout-grid-text.ts`, and nothing names guides. `canvas.list` JSON already has `guides` (`canvas/guide-listing.ts`).
- Branch check: `git branch -a --list "*feat/<key>*"` is empty for `space-stack`, `stroke-position`, `open-states`, `guide-context` and `polish-22`. No pick adds an action, so no new MCP tool name.
- Competitor recheck (2 web searches, 2026-11-13). Claude Design, Figma Make, v0 and Lovable have nothing dated November 2026. Bolt release notes list prompt queuing, voice dictation and visual edits for all plans. Design Studio has all 3 (`run.setQueue`, OS dictation in any field, direct edit). Nothing new for open design or doop. No pick comes from a new competitor feature.
- Skipped as the user's decision: the panel rail until edit mode, the Home cuts (`open-design-polish.md` §2 and §3, Bonaparte friction 8 and 11), and the MCP snapshot approvals that wait from cycles 14 to 21.
- `fix/idle-chrome` (another agent, this session) owns headless Chrome, the MCP client name, the Versions row, the `get_run` status and the tooltip after Escape. No pick touches `get_screenshot` or any headless Chrome path.

## Skipped as built (checked this cycle)

Everything in the cycle-13 to 21 lists, plus:
- Journey 8 MCP "no tool writes the route": `port.start` (`start_port`, commit `38f2c03b2`, 2026-11-13 01:48) is newer than the rerun (2026-11-12 21:07). Built.
- Figma tools found built: gradient and radial fills (`fill.set`, `features/fill`), background blur (`effect` schema `backdropBlur`), layer blur, layer lock (`bridge/locks.ts`), hide layer (Shift+Cmd+H), layer search (`layer-search-field.tsx`), clip content (`overflow` in `appearance-grid.tsx`), spacing handles on the canvas (`features/spacing`), prototype overlays (`close-overlay` in `link-interaction/play-runtime.ts`), copy and paste style (`features/layer-style`), line clamp (`truncate-model.ts`), dark state styles (`STYLE_STATES` has `dark`).
- Clickable share link for HTML projects (`share.create` description). App projects still get PNGs (runner-up 4).

## Ranking

Score = user value x fit with "simple and fast" / effort (1 to 5 each). Rank by value first; the score breaks ties.

| Rank | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|
| 1 | space-stack: `space-y` and `space-x` stacks read and edit as auto layout gap | 5 | 5 | 2 | 12.5 |
| 2 | stroke-position: Inside, Center and Outside strokes (Figma) | 4 | 5 | 3 | 6.7 |
| 3 | open-states: style the Open, Checked and Selected states of Radix parts | 4 | 4 | 3 | 5.3 |
| 4 | polish-22: Play in one click, plus cycle-21 open items | 3 | 5 | 2 | 7.5 |
| 5 | guide-context: guides snap to frame edges, and runs name them | 3 | 5 | 2 | 7.5 |

Space stack is the Bonaparte pick and a correctness gap: a Bonaparte card body with `space-y-4` opens with no auto layout and no Gap. Shift+A then adds `flex flex-col gap-*` and keeps `space-y-4`, so the spacing doubles. Stroke position is the Figma manual gap (cycle-21 runner-up 5, which waited for border sides); Bonaparte uses `ring-2` in 167 files, `ring-offset` in 80 and `outline-` in 234. Open states is the second Bonaparte item: the state styles cover hover and dark, but a Radix menu trigger, tab or checkbox cannot be styled in its open, selected or checked look. Polish bundles Bonaparte friction 12 with the cycle-21 open items. Guide context closes cycle-21 runners-up 3 and 4. No pick adds an always-visible control.

---

## 1. space-stack: `space-y` and `space-x` stacks read and edit as auto layout gap

**Why.** Tailwind `space-y-4` puts a top margin on each child after the first. It is the most common stack in Bonaparte (`space-y-` in 1491 `.tsx` files). Figma calls it a vertical auto layout with a gap. Today the inspector reads auto layout only from `display: flex` (`auto-layout-model.ts`). A `space-y-4` parent shows "Add auto layout" and no Gap. The engine has no `space-*` group, so `edit_element` with `row-gap` on it writes `gap-*`, which does nothing on a block parent. Shift+A adds `flex flex-col gap-*` and leaves `space-y-4`, so each gap becomes double.

**UI behaviour.**
- A layer whose classes have `space-y-<n>` (or `space-x-<n>`, or an arbitrary `space-y-[18px]`) and no `flex` or `grid` class opens the Auto layout section as Vertical (or Horizontal) with Gap `<n>` from the theme scale. A small note under the section says "Stack spacing (space-y)". No new row.
- Gap edits keep the code form: Gap 24 writes `space-y-6`. Gap 0 removes the class. Cmd+Z restores it in one step.
- Any other auto layout edit on that layer (direction, align, wrap, padding mode, Hug) turns it into a real auto layout first, in the same write and the same undo step: it removes `space-y-<n>` and adds `flex flex-col gap-<n>` (`flex gap-<n>` for `space-x`). Shift+A does the same. The choice: convert, never keep both, because `space-*` and `gap-*` together give double spacing.
- `space-y-reverse` and negative `-space-y-*`: show the section as read-only with the note "Edit in code", and write nothing.
- CSS projects: no change (`> * + *` rules are out of scope).

**Headless.** No new action. The engine change is in the direct-edit Tailwind plan, so every surface gets it: MCP `edit_element` with `{ "row-gap": "24px" }` on a `space-y-4` parent writes `space-y-6`. `{ "display": "flex" }` on it writes `flex flex-col gap-4` with no `space-y-4`. The agent direct tools (`agent/direct-tools.ts`) and the state and breakpoint tools take the same path. `edit_element` input does not change, so no snapshot diff; its description adds one sentence on `space-*` (description diff; user decision at merge).

**Main files.**
- Engine: new `server/direct-edit/engine/tailwind/space-stack.ts` (pure: find the `space-*` class, map a gap value to the theme scale, plan the rewrite or the conversion). Wire it in `tailwind/plan.ts` (454 lines, room under 500). Do not edit `map.ts` or `classes.ts`; pick 2 owns `map.ts`.
- UI: `inspector/auto-layout-model.ts` (stack read), new `inspector/space-stack-model.ts`, new `inspector/use-space-stack.ts`, `inspector/auto-layout-section.tsx` (one mount of the note), `inspector/gap-fields.tsx` (write path), the Shift+A key path (`inspector/use-layout-keys.ts`), one new `spaceStack` block in `inspector/copy.ts`.
- `agent/direct-tools.ts` or `edit_element` description: one sentence, through the action description file the agent finds.

**Verify in the running app** (`STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev`).
- A Tailwind fake app in `/tmp` with `<div className="space-y-4">` and 3 cards. Select the div: Auto layout shows Vertical, Gap 16, and the note. Set Gap 24: the class is `space-y-6`, the cards move. Cmd+Z: `space-y-4` again in one step.
- Set direction Horizontal: classes `flex gap-4`, no `space-y-*`, the gap stays 16 on screen. Shift+A on a second `space-y-2` div: `flex flex-col gap-2`, the layout does not move (compare screenshots).
- MCP `edit_element` `{ "row-gap": "32px" }` on a `space-y-4` layer: `space-y-8`. `pnpm exec tsx scripts/call-action.ts` on the direct-edit style action with the same input over HTTP, MCP and the agent: the 3 outputs match.
- Bonaparte (read-only, as a route prototype copy): a card body with `space-y-*` opens with the right Gap. Bonaparte `git status --short` is unchanged.
- Dark and light screenshots of the section with the note.

---

## 2. stroke-position: Inside, Center and Outside strokes (Figma)

**Why.** Figma strokes have a position: Inside, Center, Outside. Design Studio writes only `border`, which is Inside under `box-sizing: border-box`. An Outside stroke that does not change the layout needs `outline` or a Tailwind `ring`. Bonaparte uses `ring-2` in 167 files, `ring-offset` in 80 and `outline-` in 234, and the inspector shows none of them as a stroke. Today a Bonaparte card with `ring-1 ring-border` shows no border at all.

**UI behaviour.**
- In the Border section, a Position choice next to the side choice: Inside, Center, Outside (same look as the side control). No new section.
- Inside writes `border` (today). Outside writes `outline outline-<w> outline-<color> outline-offset-0` in Tailwind, and `outline-width`, `outline-style`, `outline-color`, `outline-offset: 0` in CSS. Center writes the outline with `-outline-offset-<w/2>` (CSS `outline-offset: -<w/2>px`). A switch moves width, style and color from one form to the other in one write and one undo step.
- Center and Outside work with All sides only (an outline has no sides). With a side or Custom chosen, Center and Outside are disabled with the tip "Center and Outside work on all sides".
- Read: an outline with a width over 0 and a style that is not `none` shows Outside or Center from its offset. A `ring-<n>` class shows Outside, and `ring-inset` shows Inside. On a ring layer, width and color edits write `ring-<n>` and `ring-<color>` (the code form stays). A position switch on a ring layer converts it to `border` or `outline`.
- Bundled from border-sides "Left out": in a CSS project, All after a side edit removes the old `border-<side>-width` longhands, so no extra declarations stay.

**Headless.** No new action. Add `outline-width`, `outline-style`, `outline-color` and `outline-offset` to `border-side-properties.ts`, which `DIRECT_STYLE_PROPERTIES` spreads. So `edit_element`, the agent direct tools and `set_state_style` take the 4 keys. Grep every `artifacts/mcp-snapshots/*.json` for `"border-width"` and name each tool whose input changes (`edit_element`, `set_state_style` and the breakpoint tools are likely). Snapshot diff; user decision at merge.

**Main files.**
- Contracts: `packages/common/contracts/src/border-side-properties.ts` (23 lines). Not `contracts.ts`.
- Engine: new `server/direct-edit/engine/tailwind/outline.ts` (outline and ring groups, offset scale). Wire it in `tailwind/map.ts`, which is 1026 lines and may not grow (L2a): move one existing block out of `map.ts` into `outline.ts` or `border-sides.ts` (for example the border color case) so `map.ts` loses lines. Do not edit `plan.ts` (pick 1) or `classes.ts`; if `classes.ts` must change, this pick owns it and it must shrink.
- Bridge: the computed style read that border-sides changed sends the 4 outline values and a `ring` flag.
- UI: `inspector/{border-section.tsx,border-grid.tsx,border-side-model.ts,use-border-sides.ts}`, new `inspector/stroke-position-model.ts`, new `inspector/stroke-position-row.tsx`, one new `strokePosition` block in `inspector/copy.ts`.

**Verify in the running app.**
- Tailwind fake app, a card with `border-2 border-slate-300`. Choose Outside: classes `outline outline-2 outline-slate-300 outline-offset-0`, no `border-2`, the card content does not move (screenshot diff of the content box). Center: `-outline-offset-1`. Inside: `border-2 border-slate-300` again. Cmd+Z undoes each in one step.
- A card with `ring-1 ring-slate-200`: the section shows Outside, 1. Set width 2: `ring-2`.
- HTML project: Outside writes `outline-*` declarations. All after a Top edit leaves no `border-top-width` line.
- MCP `edit_element` `{ "outline-width": "2px", "outline-style": "solid" }`: `outline outline-2`. Run `pnpm exec tsx scripts/call-action.ts` on the same edit over the 3 surfaces.
- Bonaparte (read-only route copy): a `ring-1` card shows Outside. Bonaparte `git status --short` is unchanged.
- Dark and light screenshots of the Border section on Outside and on Center.

---

## 3. open-states: style the Open, Checked and Selected states of Radix parts

**Why.** Bonaparte builds menus, tabs, accordions and checkboxes on Radix, which sets `data-state` on the part. Bonaparte styles those looks with `data-[state=open]:` (132 uses), `data-[state=active]:` (99, tabs), `data-[state=checked]:` (34). The state styles (`state-style.set`, `set_state_style`) cover hover, focus-visible, active, disabled and dark only, and `statePrefixOf` writes `${state}:`. So a person, the agent or an MCP client cannot style an open menu trigger or a selected tab, and cannot see the state on the canvas.

**UI behaviour.**
- The state picker of the state styles (`features/state-styles`) lists Open, Checked and Selected only for a layer that has a `data-state` attribute in the frame, or a `data-[state=...]` class. Other layers show the list as today. No new control.
- Open writes `data-[state=open]:`, Checked `data-[state=checked]:`, Selected `data-[state=active]:` (Radix Tabs). A layer that already uses `data-[state=selected]:` keeps that form for Selected. Breakpoints combine as today: `md:data-[state=open]:`. In a CSS page the rule is `[data-state="open"]` on the layer selector.
- Show the state on the canvas: the forced state sets `data-state="<value>"` on the layer in that frame and puts the old value back when the frame shows the default again. Limit, in the description: a Radix part that renders again can set its own value back.

**Headless.** No new action. Add `open`, `checked` and `selected` to `STYLE_STATES`, so `set_state_style`, `list_state_styles` and `set_forced_state` take them. Their descriptions (`server/state-styles/input.ts` and the action files) name the 3 new states and the `data-state` forms. Input enum and description diffs for those 3 tools; user decision at merge. The agent gets the same states through its state-style tools.

**Main files.**
- Contracts: `packages/common/contracts/src/state-styles.ts` (the list, and a `toStatePrefix` map if it is plain code).
- Engine: `server/style-scope/engine/state-scope.ts` (`statePrefixOf`, `stateScopesOf`, `statesOfVariant` read and write the `data-[state=...]` prefix), the `parseVariant` file behind `style-scope/engine/deps.ts`, the CSS rule writer in `server/state-styles/` (the agent names it), `server/state-styles/input.ts` (descriptions).
- Actions: `packages/common/actions/src/state-style/{set.ts,inspect.ts,set-forced.ts}` (descriptions only).
- Bridge: `bridge/force-state.ts` (set and restore `data-state`).
- UI: `ui/features/state-styles/{state-styles-model.ts,copy.ts}`.

**Verify in the running app.**
- A Tailwind fake app with a Radix-style `<button data-state="closed" className="data-[state=open]:bg-slate-100">`. Select it: the picker lists Open. Choose Open and set fill slate-200: the class becomes `data-[state=open]:bg-slate-200`. Force Open on the frame: the button shows slate-200. Default: it goes back to closed.
- A tab with `data-state="active"`: Selected writes `data-[state=active]:`. md breakpoint: `md:data-[state=active]:`.
- HTML project: Open writes a `[data-state="open"]` rule.
- MCP `set_state_style` with `state: "open"`, then `set_forced_state` with `state: "open"`, then `get_screenshot`: the screenshot shows the open look. `list_state_styles` lists the override. `pnpm exec tsx scripts/call-action.ts state-style.set '<json>'` on the 3 surfaces.
- Bonaparte (read-only route copy): a page with a dropdown trigger lists Open. Bonaparte `git status --short` is unchanged.
- Dark and light screenshots of the picker with Open and of the forced frame.

---

## 4. polish-22: Play in one click, plus cycle-21 open items

**Why.** Bonaparte friction 12 is still open: Present is a menu, and Play prototype is not the first click. Cycle 21 left 2 small UI items open. Each is too small for its own pick.

**UI behaviour.**
- **Play in one click (friction 12).** `top-bar-present.tsx` becomes a split button with the same label: a click on "Present" starts Play prototype when the project has a prototype start, else it opens the menu as today. A small chevron next to it opens the menu. The menu entries and the `Mod+Alt+Enter` key do not change. The tip names both.
- **Floating tools bar in the menu bounds (menu-fit "Left out").** `toPanelInset` in `canvas/use-menu-fit.ts` also cuts the bounds by the floating tools bar, so a flipped submenu at 900 px never sits under it.
- **Ctrl+G tip (menu-fit "Left out").** Add an optional `tip` field to `KeyBinding` (`shared/keymap.ts`, 458 lines). The shortcuts list shows it under the label. The `view-layout-grid` entry in `keymap-view.ts` gets "Skips when a layer is selected".
- **Recheck, then fix if still open:** friction 15 (the tool rail covers the left edge of the design at 100%: Fit and Zoom to 100% leave the rail width as a left inset) and friction 7 (Open folder in the rail does nothing while a workspace with an app chip is selected). Name each result in the report, with a screenshot.

**Headless.** UI only. Play is a view mode with no design data; the MCP and agent paths already have `set_start_points_canvas` and the share link. No action changes.

**Main files.** `canvas/top-bar-present.tsx`, `canvas/top-bar-drop.tsx` (only if the split needs it), one new `present` block in `canvas/copy.ts`, `canvas/use-menu-fit.ts`, `shared/keymap.ts`, `shared/keymap-view.ts`, the shortcuts list file in `features/commands` (the agent names it), and for the rechecks the pan-zoom fit file and the rail folder button (the agent names them). `scripts/clip/states.ts`: one state with Arrange ▸ flipped next to the tools bar at 900 px.

**Verify in the running app.**
- A prototype with links: one click on Present starts Play. The chevron opens the menu with the same entries. A project with no start: Present opens the menu.
- 900 px window, Arrange ▸ on a frame next to the tools bar: no row under the bar. `pnpm run check:clip`: 0 findings, the new state listed.
- Cmd+K > "Keyboard shortcuts": "Show layout grids  Ctrl+G" with the tip line.
- Friction 15 and 7: before and after screenshots, or "already fixed" with a screenshot.
- Dark and light screenshots of the split Present button and the shortcuts row.

---

## 5. guide-context: guides snap to frame edges, and runs name them

**Why.** Cycle 20 added ruler guides; cycle 21 made layers snap to them. Two parts are still open (cycle-21 runners-up 3 and 4). In Figma, a guide that you drag snaps to the edges and centers of frames. And the in-app agent does not know the guides: the run canvas context names the layout grid of each frame (`layout-grid-text.ts`), but not the guides that cross it. So "put the card on the guide" fails in chat.

**UI behaviour.**
- A guide drag from a ruler, or a move of an existing guide, snaps to the left, center and right edge (vertical guide) or top, middle and bottom edge (horizontal guide) of each visible frame, within `SNAP_PX` (6 screen px). The existing red snap guide shows the edge. Cmd or Ctrl turns snap off, as for frames. The guide value stays a whole canvas px.
- No new control and no new text.

**Headless.** No new action. `canvas.list` JSON already returns `guides`, and `canvas.setGuides` (`set_guides_canvas`) sets them. The run canvas context gets one more clause per frame: "guides x 80, y 200 (frame-local)" for each guide that crosses the frame, in frame-local px, after the layout grid clause. MCP clients read the same values from `canvas_list`; no tool input or output changes.

**Main files.**
- New `server/agent/guide-text.ts` (pure: canvas guides and a frame rect to the frame-local clause, same shape as `layout-grid-text.ts`).
- `server/agent/user-message.ts` is 497 lines: change line 194 in place to call both text functions. Add no line.
- `server/agent/run-target.ts` (400 lines): pass the canvas guides with the frame, as it passes `layoutGrid` (line 83).
- `canvas/ruler-guide-model.ts` (snap to frame edges, reusing `snapRect` lines from `canvas/snap-model.ts` without editing it), `canvas/use-ruler-guides.ts` (pass the frame rects).
- Out of scope: the mock agent text path in `server/canvas/tools.ts` (636 lines, may not grow).

**Verify in the running app.**
- 2 frames at x 0 and x 1600. Drag a vertical guide near x 1598: it lands on 1600 with the red line. Cmd-drag: no snap. Zoom 25% and 200%: the guide lands on the same canvas value.
- Put guides at x 80 and y 200 across frame 1, start a mock run on it, read the run log prompt: it has "guides x 80, y 200". A frame that no guide crosses has no guides clause.
- MCP `set_guides_canvas`, then `canvas_list`: the guides are in the output (today's behaviour, as a check).
- Dark and light screenshots of a guide snapped to a frame edge.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 space-stack | `tailwind/{space-stack.ts,plan.ts}`, `inspector/{auto-layout-model.ts,auto-layout-section.tsx,gap-fields.tsx,use-layout-keys.ts,space-stack-model.ts,use-space-stack.ts}`, `spaceStack` block of `inspector/copy.ts`, the `edit_element` description line |
| 2 stroke-position | `contracts/src/border-side-properties.ts`, `tailwind/{outline.ts,map.ts}` (and `border-sides.ts`, `classes.ts` if needed), the bridge style read, `inspector/border-*`, `inspector/use-border-sides.ts`, `inspector/stroke-position-*`, `strokePosition` block of `inspector/copy.ts` |
| 3 open-states | `contracts/src/state-styles.ts`, `style-scope/engine/{state-scope.ts,deps.ts target}`, `server/state-styles/*`, `actions/state-style/*` (descriptions), `bridge/force-state.ts`, `ui/features/state-styles/*` |
| 4 polish-22 | `canvas/{top-bar-present.tsx,top-bar-drop.tsx,use-menu-fit.ts}`, `present` block of `canvas/copy.ts`, `shared/{keymap.ts,keymap-view.ts}`, the shortcuts list file, the fit and rail folder files, `scripts/clip/states.ts` |
| 5 guide-context | `server/agent/{guide-text.ts,user-message.ts,run-target.ts}`, `canvas/{ruler-guide-model.ts,use-ruler-guides.ts}` |

Shared files and conflict warnings:
- `server/direct-edit/engine/tailwind/`: pick 1 wires only in `plan.ts`, pick 2 wires only in `map.ts`. Neither edits the other's file. `map.ts` (1026) and `classes.ts` (847) may not grow: pick 2 moves the border color case (or another border block) out of `map.ts`; pick 1 moves nothing out of `map.ts`. If pick 1 finds that the gap case in `map.ts` must change, it stops and reports; it does not edit `map.ts`.
- `src/ui/features/inspector/copy.ts`: picks 1 and 2 each add their own new block (`spaceStack`, `strokePosition`). Neither edits the existing Border or Gap block. Merge one, then rebase the other; the blocks do not overlap.
- `src/ui/features/canvas/copy.ts`: pick 4 adds a `present` block. Pick 5 adds no copy.
- `packages/common/contracts`: pick 2 (`border-side-properties.ts`) and pick 3 (`state-styles.ts`). Different files, but both change the `set_state_style` input (property list and state enum). Run `pnpm exec tsx scripts/gen-routes.ts` after each merge, one at a time.
- Bridge: pick 2 owns the computed style read; pick 3 owns `bridge/force-state.ts`. No other pick edits `src/bridge`.
- `canvas/snap-model.ts` (492 lines): read-only for pick 5. No pick edits it.
- Canvas writer and canvas file schema (`canvas-writer.ts`, `contracts/src/canvas-file.ts`, `actions/canvas/*/schema.ts`): no pick changes them. Pick 5 reads guides that are already in the file.
- `server/agent/user-message.ts` (497): pick 5 only, one line changed in place.
- `scripts/clip/*`: pick 4 adds one state. No other pick edits the clip check.
- `artifacts/mcp-snapshots/*.json`: `edit_element` description (pick 1); `edit_element`, `set_state_style` and breakpoint tool inputs (pick 2); `set_state_style`, `list_state_styles`, `set_forced_state` inputs and descriptions (pick 3). Approve at merge (user decision), with the cycle-14 to 21 diffs that still wait.
- `.claude/goal/roadmap.md` Appendix A: add each pick's globs before its slice runs (L6e). Pick 2 needs `tailwind/outline.ts`; pick 1 needs `tailwind/space-stack.ts`; pick 5 needs `server/agent/guide-text.ts`.
- Line caps (L2a): `tailwind/map.ts` 1026, `classes.ts` 847 (pick 2), `user-message.ts` 497 (pick 5), `tools.ts` 636 (no pick), `snap-model.ts` 492 (no pick).

## Merge order

All 5 can run at once. Merge 5 (guide-context, agent text and guide snap only), then 1 (space-stack, `plan.ts` and the auto layout files), then 2 (stroke-position, contracts and `map.ts`; gen-routes; rebase over pick 1's `inspector/copy.ts` block), then 3 (open-states, contracts and state styles; gen-routes; rebase over pick 2's `set_state_style` change), then 4 (polish-22 last: it owns the menu bounds and the clip state, so its `check:clip` run must see the final UI; rerun `pnpm run check:clip` after the merge).

## Runners-up

1. `divide-y` and `divide-x` as a "Lines between items" choice in Auto layout (Bonaparte `divide-y` 99 files), after pick 1 lands.
2. `get_screenshot` of a failed dev server returns `isError: false` with the error page (journey 7, Low); waits until `fix/idle-chrome` merges, because it owns the screenshot path.
3. Starter Geist fonts: the first import response lists Geist while the scan runs; needs a `FontsSchema` change in `pack-manifest.ts` (trusted-folders left out).
4. Clickable share link for app route prototypes; today app projects get PNG snapshots (journey 15); high effort.
5. "App now" label on `page.importSource` frames (route-sync left out since cycle 16).
6. Outline matching frames on hover of the shared layers chip (cycle-15 left out; needs a canvas path through `ui/app`).
7. Undo speed: measure Cmd+Z to preview for a text edit; patch in place if the preview reloads (friction 13, unverified).
8. MCP tool names with repeated words (`create_pack_pack`, `import_pack_pack`); N4 keeps snapshot names, so this needs `mcp.name` aliases and a user decision.
9. Live data from a URL (Figma Make connectors); needs a PHI rule before it points at a Bonaparte API.
10. Touch pointer in Play on phone frames (round 28 pick 5); UI only, low on headless.

Sources: [mcp.directory 2026 comparison](https://mcp.directory/blog/claude-design-vs-stitch-vs-v0-vs-lovable-vs-figma-make-2026), [monkfrom.earth Claude Design vs Figma, Lovable, v0](https://monkfrom.earth/blogs/claude-design-vs-figma-lovable-v0), [konigi.com Claude Design](https://konigi.com/articles/claude-design-has-the-incumbents-scrambling/), [VentureBeat Figma Make GitHub](https://venturebeat.com/technology/are-designers-the-new-swes-figma-makes-new-two-way-github-integration-turns-designs-into-live-production-code-with-built-in-governance), [Figma news November 2026](https://blog.mean.ceo/figma-news-november-2026/), [Bolt release notes](https://support.bolt.new/release-notes), [Bolt 2026.10.12](https://www.havoptic.com/r/bolt-2026-10-12).
