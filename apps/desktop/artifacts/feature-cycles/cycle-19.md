# Feature cycle 19: next 5 features

Date: 2026-11-13. Main at `4728b2b30` (all 5 cycle-18 picks and `fix/start-points-undo` merged).

## Method

- Read `cycle-13.md` to `cycle-18.md` (picks, runners-up, Results), the 5 `cycle-18/*.md` reports ("Left out"), `open-design-polish.md`, and `git log --oneline -100`.
- Took stock of the canvas chrome that cycles 13 to 18 added: `frame-label.tsx`, `frame-label-extras.tsx`, `frame-more-menu.tsx`, `frame-label-state.ts`, `canvas-wiring-inputs.ts`, `frame-selection-layer.tsx`, `frame-align-bar.tsx`, and the cycle-18 screenshots (`cycle-18/align-frames/align-bar-light.jpg`, `cycle-18/cycle-polish/chip-menu-light.png`).
- Checked each candidate with narrow greps in `packages/common/actions/src`, `packages/common/contracts/src`, `apps/desktop/src/{ui,server,bridge}` and `apps/desktop/e2e`. Checked each new tool name against `artifacts/mcp-snapshots/*.json` and `packages`: no clash.
- Checked Bonaparte on disk (read-only). Counted `.tsx` files that match under `apps` and `packages`, with `node_modules`, `dist` and `.next` left out: `Dialog|Sheet|Drawer` 1630, `isLoading|isPending` 1539 (cycle 18), `Badge` 992, `max-w-` 930, `sm:|md:|lg:` 839, `Skeleton` 745 (cycle 18), `min-w-` 662, `grid-cols-` 535, `DataTable|<Table` 455, `isError|ErrorState` 441 (cycle 18), `truncate` 391, `EmptyState` 251 (cycle 18).
- Branch check: `git branch --list 'feat/*'` has no `feat/quiet-canvas`, `feat/scale-handles`, `feat/state-check`, `feat/safe-matches` or `feat/layout-versions`.
- Competitor recheck (web search, 2026-11-13). Found nothing new for November 2026 for Claude Design, Figma Make, v0 or Lovable. The newest items are from April to August 2026: Claude Design reads the design system from production code and hands off a bundle to Claude Code (covered here by `app-tokens`, `port` and `ship`); Figma Make two-way GitHub (covered by cycle-17 route-merge); v0 API GA; Lovable has a first-party MCP server (covered here: every action has an MCP tool). Cycle 18 checked Bolt, Open Design and doop the same day. No pick comes from a new competitor feature.

## Skipped as built (checked this cycle)

Everything in the cycle-13 to 18 lists, plus:
- Grid layout in the inspector: `inspector/grid-controls.tsx`, `auto-layout-model.ts` (`grid` display). Bonaparte `grid-cols-` is covered.
- Min and max width: `inspector/min-max-rows.tsx`. Bonaparte `min-w-` and `max-w-` are covered.
- Modal, drawer and popover links: `LINK_ACTIONS` in `contracts/src/links.ts`; smart animate in `LINK_TRANSITIONS`.
- A frame that shows an open dialog, sheet or menu: "Keep open" (`canvas/keep-open-section.tsx`, `use-open-steps.ts`, `bridge/open-steps.ts`, `canvas/frame-state/open-step.ts`). Bonaparte `Dialog|Sheet|Drawer` is covered.
- Forced hover and focus: `bridge/force-state.ts`, `state-style.setForced`.
- Data scenarios (filled, empty, long, error, loading): `scenario.create`, `scenario.apply`, `scenario.run`.
- Raw values against tokens: `token.apply`, `kit-drift.list` and `kit-drift.apply`. "Locked design system" is mostly covered.
- "Design this state" on a board frame: `server/agent/run-target.ts` resolves `state` and `stateName` for the run's frame, and `agent/user-message.ts` (line 223) puts "frame state Loading (loading)" in `<canvas-context>`. A run on a board frame already targets its state. Only a UI entry is missing, so it is not a pick of its own (it is part of pick 3).
- Speed fixes in `open-design-polish.md` §3 (Suspense hold, idle prefetch, canvas barrel split): not checked this cycle. `app/screens.tsx` takes the screens from `screen-preload.ts`, so the Suspense hold may still be there. They are speed work, not features, so they are out of scope (runner-up 2).

## Ranking

Score = user value for real-app AI design x fit with "simple and fast" / effort (1 to 5 each). Rank by value first; the score breaks ties.

| Rank | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|
| 1 | quiet-canvas: one menu per selection, grouped frame menu | 5 | 5 | 3 | 8.3 |
| 2 | state-check: find the states that look like the default, then design them | 5 | 4 | 3 | 6.7 |
| 3 | safe-matches: shared layers skip a page that changed after the inspect | 4 | 5 | 2 | 10 |
| 4 | scale-handles: drag a corner to scale (K), and K from inside the preview | 4 | 4 | 3 | 5.3 |
| 5 | layout-versions: a canvas-only change makes a "Layout" version | 4 | 4 | 4 | 4 |

Quiet canvas ranks first: six cycles in a row added frame menu items and floating controls, and Tyler asked for a simplify pick. State check is the Bonaparte pick: the state board (cycle 18) shows 5 states, but a designer must still look at each frame to find the states that have no UI of their own. Safe matches is a data-loss fix that has been open since cycle 15. Scale handles is the Figma manual-editing gap (cycle-15 to 18 runner-up). Layout versions is the oldest open item ("a frame move alone makes no version", cycle 16).

---

## 1. quiet-canvas: one menu per selection, grouped frame menu

**Why.** Cycles 13 to 18 each added canvas chrome. Today:
- The frame "…" menu takes items from 4 sources and has up to 10 rows at the top level: Move to app (`usePortEntry`), Duplicate screen, Copy as PNG, Redesign as prototype (route frames), Tidy up frames (`frame-more-menu.tsx`), Make states (`canvas-wiring-inputs.ts` `toFrameActions`), Show all states, Pin (`frame-label-extras.tsx`), Add section, Hide frame (`frame-label-state.ts` `frameMenuItems`).
- Two of them do almost the same thing: "Make states" (AI makes state variations) and "Show all states" (the cycle-18 board). A third state entry, the state chip (`frame-state-menu.tsx`), shows on every frame label on hover.
- With 2 or more frames selected, an 8-button align bar (`frame-align-bar.tsx`) floats above the group, and a separate "3 frames" count sits on the group (`frame-selection-layer.tsx`). The align-frames report says the bar is wider than a small group and covers nearby frame labels.
- Tidy up shows in 3 places: the frame menu, the palette and Ctrl+Alt+T.

Figma puts align in the selection's right panel and keeps the canvas clean. Open Design shows nothing on the canvas until you ask. This pick removes controls from the canvas. It removes no action, palette command or key.

**UI behaviour.**
- **Selection menu.** With 2 or more frames selected, the only control on the group is the count chip, now a button: "3 frames ▾". Its menu has: Align ▸ (left, center, right, top, middle, bottom), Spread ▸ (horizontal, vertical; disabled with fewer than 3 frames, with the reason as the tip), Tidy up, Remove 3 frames. The floating align bar is removed. The Alt align keys stay; they are bound in `use-tidy-frames.ts` (`useFrameAlignKeys`), not in the bar, so removing the bar does not remove them. Move the `useFrameAlign` call from `frame-align-bar.tsx` into the new menu.
- **Grouped frame menu.** The "…" menu has at most 6 top-level rows: Redesign as prototype (route frames only), Move to app, States ▸, Copy ▸, Arrange ▸, Pin. States ▸ holds "Show all states" first, then "Make states with AI" (renamed from "Make states"), and leaves room for the id `design-states` of pick 2 if it adds one (it does not; see pick 2). Copy ▸ holds Duplicate screen and Copy as PNG. Arrange ▸ holds Tidy up, Add section, Hide frame. Reuse the submenu parts of the preview menu (`submenu-context.ts`, `preview-submenu-row.tsx`). Do not write a second submenu.
- **Group by id, in one model file.** A new `canvas/frame-menu-groups-model.ts` maps each item id (`duplicate-screen`, `copy-png`, `tidy-frames`, `states`, `show-all-states`, `section`, `hide`, …) to a group. The 4 sources keep making their items; only `frame-more-menu.tsx` renders the groups. An unknown id goes to the top level, so a later item never gets lost.
- **Quiet state chip.** The state chip on the frame label shows on hover only when the frame has a state that is not "As the app is", or when the project has states (route and app frames). On an HTML prototype with no states it does not show. Its menu does not change.
- Measure before and after at 1440 px with 3 frames selected and one frame menu open: top-level frame menu rows (now up to 10, after at most 6) and floating controls on a 3-frame selection (now align bar plus count, after one count button).

**Headless.** No action changes. Each removed or moved control keeps its other surfaces:
- Align and spread: `canvas.moveFrames` (`move_frames_canvas`), the 8 palette commands in `features/commands/canvas-commands.ts`, the Alt keys.
- Tidy up: `move_frames_canvas`, palette, Ctrl+Alt+T.
- Remove frames: `canvas.deleteFrames`, Delete key.
- Show all states: `create_state_frames_canvas`. Make states: palette (`app/studio/bind-studio-commands.ts` `onMakeStates`).
- Pin and Hide frame have no palette command today (grep found only "pin feedback note"). They stay as menu rows; do not claim a palette command.

**Main files.**
- New: `canvas/frame-menu-groups-model.ts`, `canvas/frame-select-menu.tsx`, `canvas/use-frame-select-menu.ts`.
- Changed: `canvas/frame-more-menu.tsx`, `canvas/frame-menu-model.ts`, `canvas/frame-label-state.ts`, `canvas/canvas-wiring-inputs.ts` (label text only), `canvas/frame-label-extras.tsx`, `canvas/frame-state-menu.tsx` (visibility only), `canvas/frame-selection-layer.tsx`, `styles/frames.css`, one block in `canvas/copy.ts`.
- Deleted: `canvas/frame-align-bar.tsx` (and its CSS). Keep `frame-align-model.ts`; the menu reads its 8 entries.
- e2e: no spec in `apps/desktop/e2e` names `frame-align`, `frame-select-count`, "Show all states", "Make states", "Tidy up frames", "Copy as PNG" or "Duplicate screen". `e2e/levels.spec.ts` names "More actions for"; the button keeps that `aria-label`.

**Verify in the running app** (`STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev`).
- An HTML project with 4 pages. Open a frame "…" menu: 6 rows or fewer. States ▸, Copy ▸ and Arrange ▸ open with the keyboard (arrow right, Esc) and the mouse. Each item still works: Duplicate screen, Copy as PNG, Tidy up, Add section, Hide frame, Show all states, Make states with AI.
- Select 3 frames: no bar above the group. "3 frames ▾" opens Align and Spread. Align left: one undo step. Spread with 2 frames: disabled with a tip. Alt+A still aligns left.
- An HTML frame with no states: no state chip on hover. A route frame with the Loading state: the chip shows.
- MCP `move_frames_canvas` with `layout: "left"`: unchanged.
- Dark and light screenshots, before and after, of the frame menu and of a 3-frame selection.

---

## 2. state-check: find the states that look like the default, then design them

**Why.** Bonaparte screens have a lot of state code (loading flag in 1539 files, `Skeleton` in 745, error handling in 441, `EmptyState` in 251), but many routes do not render each state. The cycle-18 state board shows 5 frames side by side, and the user must compare them by eye. A frame that looks like "As the app is" in the Loading state means the route has no loading UI. Today nothing says so. `scenario.run` reports overflow and console errors per data scenario, but it does not compare the states with the default. The agent already knows a frame's state (`run-target.ts`, `user-message.ts`), so a run on such a frame designs that state with no prompt change.

**UI behaviour.**
- The board section label ("<page> states", made by `canvas.createStateFrames`) gets one line after the board settles: "2 of 4 states look like the default". No new chip on each frame label (pick 1 removes chrome; this pick adds none on frames).
- A frame whose state matches the default within the threshold gets a dimmed "Same as default" note in its label `note` slot (the slot exists in `frame-label.tsx`). Shown only on board frames.
- The section label has one button, "Design missing states". It starts one chat run with those frames as focus (the cycle-18 frame-focus path, `focusPaths`) and with the first matching frame as the run's canvas frame. The prompt names each state: "Design the Loading and Empty states of /visits. Each frame shows one state. Change only the code for those states."
- A re-check runs when a board frame's preview reloads after a version (`action.done`), never on a timer (U12).

**Actions.**
- New: `canvas.inspectStateFrames`, GET `/api/projects/:projectId/canvas/state-frames`. `access: "read"`, `confirm: "none"`, `needs: "project.read"` (as `canvas.listFrameStates`), `scope: "project"`. Input: `projectId`, `frame` (any board frame id or `@label`), `threshold` (`Schema.withDecodingDefault` 0.98, the similarity at or above which a state "looks like the default"). Output: `{ items: [{ frameId, state, stateName, similarity, isSameAsDefault, consoleErrors }] }` (at most 9 items: the default plus 8 states; not a list action, so no paging). `invalidates`: `[]`. MCP and agent: `inspect_state_frames_canvas` (agent set `app`, as `create_state_frames_canvas`). Errors: `NotFound` (no frame or no board), `Unavailable` (the dev server is not up).
- The handler yields a read service only (S7). It captures each board frame's URL in its state (`pageUrl` / `withFrameStateHost`) through `preview/page-capture/index.ts` (leaf import, W19b), and compares each capture with the default capture through `server/preview/visual-diff.ts` (the port-check diff). Captures run one at a time, not in parallel (one headless page). It writes no file.

**Main files.**
- New: `packages/common/actions/src/canvas/inspect-state-frames.ts`, schemas in `actions/canvas/state-frames/schema.ts` (pick 1 of cycle 18 made this file; add to it).
- New: `src/server/handlers/canvas/inspect-state-frames.ts`, `src/server/canvas/state-frames/state-check-store.ts` (`StateCheckStore`, `access: "read"`), `src/server/canvas/state-frames/engine/to-state-likeness.ts` (pure threshold rule). One export line in `server/canvas/state-frames/index.ts`; provide the store in `handlers/canvas/live.ts`.
- UI: new `canvas/{use-state-check.ts,state-check-model.ts,state-check-line.tsx}`; changed: the section label file that draws board labels (the agent names it; grep `sectionCopy` users), one block in `canvas/copy.ts`. The "Design missing states" run goes through `ui/app/studio` (chat must not import canvas, U7), as frame-focus did in `studio-left.tsx`.

**Verify in the running app.**
- The cycle-18 fake Next app in `/tmp`: one route with a client fetch to `/api/visits`, a list, a skeleton and an error text, but no empty text. "Show all states": the section line reads "1 of 4 states looks like the default", and the Empty frame shows "Same as default".
- "Design missing states" with the mock agent: the run log shows the Empty frame's file in `focusPaths` and "frame state Empty data (empty)" in the canvas context.
- MCP `inspect_state_frames_canvas` with `@<page> loading`: 5 items, `isSameAsDefault` false for Loading. `pnpm exec tsx scripts/call-action.ts canvas.inspectStateFrames '<json>'` matches on 3 surfaces; report ms per capture.
- An HTML project board: all states are "Same as default" (expected; HTML pages have no fetch).
- Bonaparte: no live dashboard run (it needs a database). Say so in the report.
- Dark and light screenshots of a board with the section line.

---

## 3. safe-matches: shared layers skip a page that changed after the inspect

**Why.** Shared layers (cycle 15) copies an edited nav or footer to every matching page. `page.updateMatches` (`update_matches_page`) writes each target with no check, so a page that the agent or the user changed after `page.inspectMatches` loses that change. The cycle-15 Results named it, and cycles 16, 17 and 18 carried it as a runner-up.

**UI behaviour.**
- No new control. "Apply to 5 pages" sends the hash of each target element that the inspect returned.
- When a page changed after the inspect, it is left out and the rest are written as one version. The chip then reads "Applied to 4 pages. 1 changed since: pricing.html", and re-inspects.
- When every target changed, nothing is written, and the chip says to try again.

**Actions.**
- Changed: `page.inspectMatches` output gets `markupHash` (sha-1 of the normalized markup of the target element, the same normalize step as the match rule) on each item.
- Changed: `page.updateMatches` input: each target gets `markupHash: Schema.NullOr(Schema.String)` with `Schema.withDecodingDefault` null, so an old MCP caller with no hash keeps working (no check for that target). Output gets `skipped: [{ file, reason }]`. Fails with `Conflict` when every target is skipped. The `inspect_matches_page` and `update_matches_page` snapshots change; approve the diff at merge. Add one sentence to the description: "Pass markupHash from inspect_matches_page so a page that changed since is left out."
- The check and the write happen in the same locked step, so no write can land between them (P4: write through the page's one owner).

**Main files.**
- Changed: `packages/common/actions/src/page/{match/schema.ts,update-matches.ts,inspect-matches.ts}` (description), the server match ops (the agent names them: grep `updateMatchesPage` under `src/server/handlers/page` and the service it yields), `src/ui/features/inspector/{use-shared-layers.ts,shared-layers-model.ts,shared-layers-chip.tsx,copy.ts}`.

**Verify in the running app.**
- An HTML project with 4 pages and the same nav. Select the nav on page 1, edit its text: "Apply to 3 pages". Before the click, change the nav on `pricing.html` by hand (edit the file). Click: 2 pages change, `pricing.html` keeps its edit, the chip names it. Cmd+Z takes back the 2 pages.
- MCP `inspect_matches_page`, then `update_matches_page` with the hashes after one file changed: `skipped` lists it. With no hashes: all pages are written (old behaviour). All targets changed: `Conflict`.
- `call-action page.updateMatches` on 3 surfaces.
- Dark and light screenshots of the chip after a skip.

---

## 4. scale-handles: drag a corner to scale (K), and K from inside the preview

**Why.** Figma's scale tool (K) scales a layer by a drag on its corner, with its type, spacing and radius. Cycle 15 added the Scale field in the inspector (`layer-style.update`, `update_layer_style`), but no drag on the canvas, and K does nothing when focus is in the preview frame (cycle-15 Left out). `TOOL_APP_KEYS` in `contracts/src/contracts.ts` maps C, F, H, L, T and V from the preview to the app; K is not there.

**UI behaviour.**
- With one layer selected, K turns on scale mode, as in Figma: the 4 corner handles of the layer selection (`canvas/resize-handles.tsx`) show as scale handles, and the inspector Scale field gets focus as today. V or Esc turns it off.
- A drag on a corner handle in scale mode shows a ghost box at the new size and a percent label ("80%"), with the opposite corner fixed. On release, one `layer-style.update` call with the factor (new width / old width, kept between 0.25 and 4) writes the change as one version and one undo step. The "Keep tokens" toggle of the Scale field applies.
- Shift is not needed: scale is always proportional. A drag under 2 px writes nothing.
- K works with focus in the preview frame: the bridge sends it as an app key, as it does for V and T.

**Headless.** No new action. `update_layer_style` with `factor` is the MCP and agent form. Pick 4 changes no action file.

**Main files.**
- Changed: `packages/common/contracts/src/contracts.ts` (one `["KeyK", "tool-scale"]` row in `TOOL_APP_KEYS` and the `AppKey` union; the file is long, so add lines only), the app-key handler that maps `tool-*` keys (the agent names it; grep `"tool-text"` in `src/ui`).
- Changed: `canvas/resize-handles.tsx`, `canvas/use-resize-handles.ts`, `canvas/resize-handles-session.ts`. New: `canvas/{scale-drag-model.ts,use-scale-drag.ts}`, one block in `canvas/copy.ts`.
- The inspector owns the Scale field (`inspector/use-scale-field.ts`). The canvas must not import the inspector (U7): put the scale-mode flag in a small store in `src/ui/platform` (or the existing tool store) that both read, and call `layer-style.update` from the canvas hook.

**Verify in the running app.**
- An HTML card with 24 px padding, 16 px text and 12 px radius. Click it in the preview (focus in the frame), press K: scale handles show. Drag a corner to about half size: the label reads "50%". Release: padding 12 px, text 8 px, radius 6 px. Cmd+Z restores it in one step.
- A Tailwind page: values snap to scale classes, as with the field.
- K with no layer selected does nothing. V leaves scale mode.
- `update_layer_style` with `factor: 0.8` over MCP: unchanged.
- Dark and light screenshots of a drag with the percent label.

---

## 5. layout-versions: a canvas-only change makes a "Layout" version

**Why.** A frame move, an align, a state board or a start point change is a layout step (Cmd+Z works), but no version: Versions does not list it, restore does not bring it back, and share or export of an older version shows today's layout. The cycle-16 Results named it ("a frame move alone makes no version"), and cycles 17 and 18 carried it as runner-up 1. Figma version history covers canvas layout.

**UI behaviour.**
- When the canvas layout changes and no page file changes, one "Layout" version is saved after 10 s with no further layout change, or when the project closes. Many moves in a row make one version ("Layout: moved 4 frames, aligned 3"). The text comes from the layout-history labels.
- Versions lists it with a layout icon. Restore of that version (or of an older one) puts the layout back with the files.
- A run or a manual file edit in the window takes the pending layout change into its own version; no extra "Layout" version is saved then.

**Actions.**
- No new action. `version.list` (`list_versions`) shows the new kind. If the version kind union is a closed schema, add `layout` to it and approve the snapshot diff.
- Server rules: never await the commit on the edit path (P3): the layout write returns at once, and a coalesce timer in a service saves the version later. Restore must apply the stored layout. Today `resetForRestore` in `store/versions.ts` keeps the live layout (`kept`); for a target with a stored layout, it must take that one.

**Main files.**
- New: `src/server/store/layout-version-queue.ts` (`LayoutVersionQueue`, `access: "write"`, the coalesce timer), exported from `store/index.ts`, provided in the canvas domain live layer.
- Changed: `src/server/store/versions.ts` (call lines only, and the `resetForRestore` rule; the file is 2186 lines, so put new logic in the new file, L2a), the canvas layout write path (`server/canvas/canvas-writer.ts`: one call that notes a layout change), and the version kind label in the Versions panel UI (the agent names the file).
- Not owned: `server/canvas/layout-history.ts`. Read its labels through an export; do not change its steps.

**Verify in the running app.**
- An HTML project. Move 2 frames and align 3: after 10 s, Versions shows one "Layout" entry. Restore the version before it: the frames go back.
- Start a mock run within 10 s of a move: one version (the run's), no extra "Layout" entry.
- An imported folder (cycle-16 import-versions): the same.
- MCP `list_versions`: the layout version is in the list.
- Time a frame drop with and without the queue: no added wait on the edit (P3). Report the ms.
- Dark and light screenshots of the Versions panel.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 quiet-canvas | `canvas/frame-more-menu.tsx`, `canvas/frame-menu-model.ts`, `canvas/frame-menu-groups-model.ts`, `canvas/frame-label-state.ts`, `canvas/canvas-wiring-inputs.ts`, `canvas/frame-label-extras.tsx`, `canvas/frame-state-menu.tsx`, `canvas/frame-selection-layer.tsx`, `canvas/frame-select-menu.tsx`, `canvas/use-frame-select-menu.ts`, `canvas/frame-align-bar.tsx` (delete), `styles/frames.css` |
| 2 state-check | `actions/canvas/inspect-state-frames.ts`, `actions/canvas/state-frames/schema.ts`, `handlers/canvas/inspect-state-frames.ts`, `server/canvas/state-frames/**`, `handlers/canvas/live.ts`, `canvas/{use-state-check.ts,state-check-model.ts,state-check-line.tsx}`, the section label file, one `ui/app/studio` file |
| 3 safe-matches | `actions/page/{match/schema.ts,update-matches.ts,inspect-matches.ts}`, the server match ops, `inspector/{use-shared-layers.ts,shared-layers-model.ts,shared-layers-chip.tsx}` |
| 4 scale-handles | `contracts/src/contracts.ts` (`TOOL_APP_KEYS`), the app-key handler, `canvas/{resize-handles.tsx,use-resize-handles.ts,resize-handles-session.ts,scale-drag-model.ts,use-scale-drag.ts}`, one `src/ui/platform` store |
| 5 layout-versions | `server/store/layout-version-queue.ts`, `server/store/versions.ts`, `server/store/index.ts`, `server/canvas/canvas-writer.ts`, the Versions panel label file |

Shared files:
- `src/ui/features/canvas/copy.ts`: picks 1, 2 and 4 each add one block.
- `src/ui/features/inspector/copy.ts`: pick 3 only.
- `handlers/canvas/live.ts`: pick 2 provides `StateCheckStore`; pick 5 provides `LayoutVersionQueue` (if the agent puts it in the canvas live layer, not a store layer). Two lines; keep both at merge.
- `@generated` files (`all-actions.generated.ts`, per-domain `routes.ts`, `handlers.ts`, `index.ts`) and `packages/common/actions/package.json` (export map): pick 2 adds an action; pick 3 changes schemas only. Run `pnpm exec tsx scripts/gen-routes.ts` after each merge, one at a time.
- `packages/common/contracts`: pick 4 only (`contracts.ts`).
- `artifacts/mcp-snapshots/*.json`: new `inspect_state_frames_canvas` (pick 2); changed `inspect_matches_page`, `update_matches_page` (pick 3); maybe `list_versions` (pick 5); plus the cycle-14 to 18 tools that still wait. Approve each diff at merge (user decision).
- Pick 2's section line and pick 1's frame menu do not share a file: pick 2 adds no frame menu item. If pick 2 needs `frame-label-extras.tsx` for the "Same as default" note, it stops and uses the `note` prop path in `frame-label.tsx` instead.
- `.claude/goal/roadmap.md` Appendix A: add the globs of each pick before its slice runs (L6e).

## Merge order

All 5 can run at once. Merge 3 (safe-matches, inspector and page only), then 4 (scale-handles, contracts and resize handles), then 2 (state-check, new action; gen-routes), then 5 (layout-versions, server store), then 1 (quiet-canvas last: it changes the frame menu and selection files that sit next to the others, and its before/after screenshots should show the final canvas). Run gen-routes after 2.

## Runners-up

1. Merge data scenarios into frame states: `scenario.*` (filled, empty, long, error, loading) and frame states overlap; one state list with "Long data" as a state (simplify, but it changes 2 domains).
2. Panel rail and edit mode: hide the rail and the tool group until edit mode (`open-design-polish.md` §2), plus its speed fix 1 (Suspense hold) if it is still there. Tyler decision: it reverses approved nitpicks 15 and 18.
3. Home cuts from `open-design-polish.md` (Continue card, starter cards into prompt chips, status bar to one dot). Tyler decision, same reason.
4. Outline matching frames on hover of the shared layers chip (cycle-15 left out; needs a canvas path through `ui/app`).
5. "App now" label on `page.importSource` frames: store the label at import (`share/page-import/import-page.ts` line 324).
6. Fix all states in one run per state, in turn, after pick 2 (a run queue on `run.setQueue`).
7. Bonaparte dev without a database: run a route prototype against fixture data so the dashboard renders; blocks every Bonaparte live test; high effort.
8. Live data from a URL (Figma Make connectors); needs a PHI rule before it points at a Bonaparte API.
9. Touch pointer in Play on phone frames (round 28 pick 5); UI only, low on headless.
10. Export a frame to Figma as editable layers (Claude Design still lacks it); needs a Figma plugin.

Sources: [mcp.directory 2026 comparison](https://mcp.directory/blog/claude-design-vs-stitch-vs-v0-vs-lovable-vs-figma-make-2026), [konigi.com Claude Design](https://konigi.com/articles/claude-design-has-the-incumbents-scrambling/), [monkfrom.earth Claude Design vs Figma, Lovable, v0](https://monkfrom.earth/blogs/claude-design-vs-figma-lovable-v0), [refontelearning.com design-to-code tools](https://www.refontelearning.com/blog/ai-design-to-code-tools-figma-make-v0-lovable), [vibecoding.app Claude Design review](https://vibecoding.app/blog/claude-design-review).

## Results

- Merged in order: safe-matches, scale-handles, state-check, layout-versions, quiet-canvas. Main at 53966638a.
- Conflict: state-check vs scale-handles in `ui/features/canvas/copy.ts` (two copy blocks and the export line). Kept both, then gen-routes.
- Checks: gen-routes --check pass, typecheck 0 errors, lint:gate pass (59646, baseline 89733), build:ui pass, desktop:pack pass.
- Installed app: :4570 returns 200. Server idle CPU 0.00 CPU-s/min over 60 s.
- Open: at about 11% zoom the × on a hovered frame label covers the next frame's name, and one test click removed a frame by mistake. No layout version on project close. State check has no "Same as default" note on each frame. Scale handles overlap on layers under 40 px. MCP snapshots for inspect_state_frames_canvas, inspect_matches_page, update_matches_page and list_versions not refreshed (user decision).
