# Feature cycle 20: next 5 features

Date: 2026-11-13. Main at `ee242e124` (all 5 cycle-19 picks merged).

## Method

- Read `cycle-19.md` (picks, runners-up, Results), the 5 `cycle-19/*.md` reports ("Left out"), cycles 13 to 18 (runners-up and Results), the tail of `.claude/goal/feature-log.md`, `git log --oneline -100`, `bonaparte-benchmark.md`, `mcp-bonaparte-test-2/report.md` and the `journeys-run/*.md` reports with their reruns.
- Checked each candidate with narrow greps in `packages/common/actions/src`, `packages/common/contracts/src` and `apps/desktop/src/{ui,server,bridge}`. Checked each new tool name in `apps/desktop/artifacts/mcp-snapshots/*.json`: `set_layout_grid_canvas` and `set_guides_canvas` have 0 hits.
- Branch check: `git branch --list "feat/<key>"` is empty for `safe-frame-remove`, `starter-tokens`, `state-runs`, `layout-grid` and `ruler-guides`.
- Competitor recheck (web search, 2026-11-13): nothing new from November 2026 for Claude Design, Figma Make, v0, Lovable or doop. The newest items are the April 2026 Claude Design launch (design system from code, handoff to Claude Code) and the August 2026 doop open-source launch (agents draw HTML frames over MCP). Cycle 18 checked Bolt and Open Design this week. No pick comes from a new competitor feature.
- Skipped as the user's decision: hide the panel rail until edit mode, and the Home cuts (`open-design-polish.md` §2 and §3). Bonaparte friction 11 (three recent lists on Home) is part of the Home cuts.

## Skipped as built (checked this cycle)

Everything in the cycle-13 to 19 lists, plus:
- Bonaparte without a database: `fixture.create`, `fixture.list`, `fixture.delete` render a server-data route with client data (feat/server-data-fixture).
- Move a prototype into the app over MCP (journey 8 "plan only"): `port.start` (`start_port`).
- Token rename and delete on prototypes (journey 11): the "imported app folder" refusal is gone from the source.
- Text tool, in-flow nudge, dark preview toggle, clickable share link, draft X and Keep undo: fixed (`30b161419`, `d20ccad54`, `cd2e8323f`, `e17e12624`, journeys rerun A).
- Frame removal undo: `frame-undo-bar.tsx` shows "Frame removed." with Undo for 8 s, and Cmd+Z closes it (`caff9ebe7`, `ca2780964`). Pick 1 does not rebuild it.
- Figma manual tools checked and found built: layer lock (`bridge/locks.ts`), select parent and child with keys (`select-relative`, `use-stage-keys.ts`), drag to reorder in auto layout (`bridge/free-move.ts`), Alt-drag copy, multi-layer edit (`simple-multi-editor.tsx`), copy and paste style (`features/layer-style`), select matching, swap instance, constraints (`pin-select.tsx`), per-corner radius, gradients (`features/fill`), eyedropper, spacing handles (`features/spacing`), outline view (`bridge/outline-view.ts`), breakpoint and dark variants (`variant-bar-model.ts`), CSS grid (`grid.*` actions, `features/grid`).
- Data scenarios inside the state chip menu: `canvas-body.tsx` already renders `ScenarioSection` in the frame state menu slot (`FrameStateSlotContext`). Cycle-19 runner-up 1 is mostly done in the UI; the data merge is not worth a pick.

## Ranking

Score = user value x fit with "simple and fast" / effort (1 to 5 each). Rank by value first; the score breaks ties.

| Rank | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|
| 1 | safe-frame-remove: no × under a narrow label, plus cycle-19 open items | 5 | 5 | 2 | 12.5 |
| 2 | starter-tokens: the first page of an imported design system uses its own token names | 5 | 5 | 2 | 12.5 |
| 3 | state-runs: Design missing states starts one run per state | 4 | 5 | 2 | 10 |
| 4 | layout-grid: Figma layout grids on a frame, read by the agent | 4 | 4 | 3 | 5.3 |
| 5 | ruler-guides: drag a guide from a ruler, frames snap to it | 3 | 4 | 3 | 4 |

Safe frame remove is the fixed pick: a test click removed a frame by mistake. Starter tokens is the Bonaparte pick from a recorded failure (MCP test 2 "Still open"): an imported Bonaparte system gives a first page in studio colors. State runs fixes a gap in the cycle-19 state check: one run gets the frame state of the first frame only. Layout grid and ruler guides are the 2 Figma manual-editing gaps that greps confirm. Each adds no always-visible control: the grid and guides show only when the user sets them.

---

## 1. safe-frame-remove: no × under a narrow label, plus cycle-19 open items

**Why.** The cycle-19 quiet-canvas report: at about 11% zoom, the tools of a hovered narrow label (× and the page chip) cover the frame name of the label, and spill over the next frame. A click meant for the name hit ×, and the frame was removed. Cause in `styles/frames.css`: on hover, `.frame-label-tools` gets `flex-shrink: 0` and `overflow: visible`, so the tools grow past `max-width: calc(var(--frame-w) / var(--inv-zoom))`. `FrameRemoveButton` sits 2 px from `FrameNameButton`. The undo toast exists, so a mistake can be undone, but the click must not happen.

**UI behaviour.**
- **Container rule.** `.frame-label` becomes a CSS container (`container-type: inline-size`). Its width is already the on-screen frame width, so no zoom prop is needed. Under 200 px, `@container` hides `.frame-remove` and the page chip. Under 120 px, it hides all of `.frame-label-tools` except the "…" button.
- **No spill.** On hover, the tools never grow past the label. The frame name truncates first, then the tools hide by the rule above. Delete the `overflow: visible` hover rule.
- **Hit gap.** Put 6 px between the name button and the first tool, and give × a 20 px hit box that does not overlap the name.
- **Remove in the menu.** Add "Remove frame" as the last row of Arrange ▸ in the "…" menu (id `remove-frame`, `FRAME_MENU_GROUPS`; no new top-level row). It uses the same path as ×, so the undo toast shows.
- **Bundled cycle-19 open items:**
  - **"Same as default" on each board frame.** The state-check report left it out only because `frame-label-state.ts` and `canvas-wiring-inputs.ts` belonged to quiet-canvas. Pass a dimmed "Same as default" text to the label `note` slot of each board frame whose state check item has `isSameAsDefault: true`. Read the result through the existing `use-state-check.ts` export; do not change that hook (pick 3 owns it).
  - **Scale handles on small layers.** On a layer under 40 px on screen, the 4 handles overlap (scale-handles report). In `resize-handles.tsx`, place the handles outside the box corners when the box side is under 40 px, as Figma does.
  - **Layout version on quit.** `LayoutVersionQueue.flushAll` exists, but no shutdown path calls it. Add one call to `stopAll` in `src/server/main/lifecycle.ts`. If the queue is not reachable there with one import and one call, leave it out and say so (do not grow `app-context.ts`, L2a). Close of one project (not the app) stays out.

**Headless.** No action changes. Removal stays `canvas.deleteFrame` (`remove_frame`), `canvas.deleteFrames` (`delete_frames_canvas`) and the Delete key. "Same as default" is `inspect_state_frames_canvas` output, unchanged.

**Main files.**
- Changed: `canvas/frame-label.tsx`, `canvas/frame-remove-button.tsx`, `canvas/frame-menu-groups-model.ts` (one id), `canvas/frame-label-state.ts`, `canvas/canvas-wiring-inputs.ts`, `canvas/resize-handles.tsx`, `styles/frames.css`, one block in `canvas/copy.ts`, one call in `server/main/lifecycle.ts`.

**Verify in the running app** (`STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev`).
- An HTML project with 6 frames in a row. Zoom to 11%, hover each label: no × and no chip, and no tool covers the next frame name. Click each name 10 times: 0 frames removed, each click selects. Zoom to 50%: × shows with the gap.
- "…" > Arrange ▸ > Remove frame: the frame goes, the toast shows, Undo brings it back.
- Cycle-18 fake Next app in `/tmp`, "Show all states": the frame that the section line names shows "Same as default".
- Select a 24 px icon, press K: 4 handles show apart, each one drags.
- Move a frame, quit the server (Ctrl+C) in under 10 s, start again: Versions has the "Layout" entry.
- `remove_frame` over MCP: unchanged.
- Dark and light screenshots of a hovered label at 11% and at 50%, and of the board note.

---

## 2. starter-tokens: the first page of an imported design system uses its own token names

**Why.** MCP test 2 (Bonaparte system to a new screen, headless) passed, but listed as still open: "The starter page uses studio token names with hex fallbacks, not the source names." `server/design-system/engine/to-starter-page.ts` hard-codes `var(--bg, #ffffff)`, `--fg`, `--fg-muted`, `--surface`, `--accent`, `--primary-fg`, `--radius-lg`, `--font-body`, `--space-*`. Bonaparte uses shadcn names (`--background`, `--foreground`, `--muted-foreground`, `--card`, `--primary-foreground`, `--radius`, `--font-sans`). Most `var()` calls miss, so the first frame of a Bonaparte system shows the hex fallbacks, not Bonaparte. This is the first thing a user sees after an import, and the model copies that page as its example. The same report: the first import response says "from no sources" and lists Geist until the scan ends (`extract/compose.ts` line 77).

**UI behaviour.**
- No new control. After an import (Home, Design systems, or MCP), the starter `index.html` uses the pack's own names: `var(--background)`, `var(--card)`, `var(--radius)`. A role with no match in the pack keeps today's name and fallback.
- Spacing: when the pack has no `--space-*` but has `--spacing` (Tailwind 4), write `calc(var(--spacing) * 4)`.
- While the scan runs, the import status says "Reading sources…" and lists no fonts. The font list shows when the scan ends.

**Engine.**
- New pure engine `server/design-system/engine/to-starter-roles.ts`: input the pack token names, output one name per role (`bg`, `fg`, `fg-muted`, `surface`, `border`, `primary`, `primary-fg`, `accent`, `accent-fg`, `radius-md`, `radius-lg`, `font-body`, `font-display`, `space`). Each role has an ordered candidate list (studio name first, then shadcn, then `--color-*`). First grep for a role map that `app-tokens` or `token-sweep` already has, and reuse it if it fits.
- `to-starter-page.ts` takes the roles and writes `var(<name>)` with no fallback when the role matched.

**Headless.** No action changes. The pack import and project create tools (the agent names them; grep `toStarterPage` callers) write the better page. The in-app agent uses the same writer. If the import status text is a field in an action output, the snapshot diff is a user decision.

**Main files.**
- New: `server/design-system/engine/to-starter-roles.ts`.
- Changed: `server/design-system/engine/to-starter-page.ts`, `server/design-system/created-pack.ts` (pass the names), `server/design-system/extract/compose.ts` (status text).

**Verify in the running app.**
- Repeat the MCP test-2 run (raw JSON-RPC, Bonaparte as a trusted folder, read-only): import, `create_project`, `get_screenshot` light and dark. Count in `index.html`: every `var()` names a token in the pack's `tokens.css`; 0 hex fallbacks for matched roles. The screenshot shows Bonaparte colors and radius.
- A built-in pack (`modern-minimal`): the starter `index.html` is the same as before, byte for byte.
- The first import response: no "from no sources", no Geist.
- Bonaparte `git status --short` is the same before and after.
- Dark and light screenshots of the starter frame for Bonaparte and for one built-in pack.

---

## 3. state-runs: Design missing states starts one run per state

**Why.** Cycle 19 added "Design missing states" on the state board section line. It sends one selection prompt for all matching states (`use-state-check.ts` `handleDesign` -> `sendSelectionPrompt`). The run's canvas frame is the first matching frame, so `run-target.ts` puts only that frame's state in `<canvas-context>`. A second state gets a named prompt but no state target, and one long run edits several state branches at once. Bonaparte has a lot of state code (loading flag in 1539 files, `Skeleton` 745, error handling 441, `EmptyState` 251), so most routes have more than one missing state.

**UI behaviour.**
- "Design missing states" starts one run for the first matching state, with that frame as the run's canvas frame and a one-state prompt: "Design the Loading state of /visits. Change only the code for this state."
- When the run ends with success, the next run starts for the next state. The section line shows "Designing Loading (1 of 2)…" in place of the button, and a Stop text button that stops the current run and drops the rest.
- A run that fails or stops ends the sequence; the line names the state that did not finish.
- After each run, the state check runs again on `action.done`, as today (U12). A state that no longer looks like the default is skipped.
- The sequence lives in the UI session. If the project closes, the rest does not start (stated in the tip).

**Headless.** No new action. An MCP client does the same with `inspect_state_frames_canvas`, then one `start_run` per item with `isSameAsDefault: true`, with its frame as the canvas target, and `get_run` to wait. Add that sentence to the description of `canvas.inspectStateFrames` (that snapshot already waits for approval). First confirm that the `start_run` `canvas` field carries the frame id that `run-target.ts` reads. If it does not, stop: a `start_run` input change is a snapshot diff and a user decision.

**Main files.**
- Changed: `canvas/use-state-check.ts`, `canvas/state-check-model.ts`, `canvas/state-check-line.tsx`, one block in `canvas/copy.ts`, the `ui/app/studio` file that owns `sendSelectionPrompt` (chat must not import canvas, U7), `packages/common/actions/src/canvas/inspect-state-frames.ts` (description only).
- New: `canvas/state-run-model.ts` (pure order and next-state rule).

**Verify in the running app.**
- Cycle-18 fake Next app with no auth and no loading UI: 2 states look like the default. Click "Design missing states" with the mock agent: 2 runs in turn, each run log shows its own frame and "frame state <name>" in the canvas context. The line counts 1 of 2, then 2 of 2, then the check re-runs.
- Stop during run 1: run 2 does not start.
- MCP: `inspect_state_frames_canvas`, then `start_run` with the frame: the run log shows the state.
- Dark and light screenshots of the section line during a sequence.

---

## 4. layout-grid: Figma layout grids on a frame, read by the agent

**Why.** Figma layout grids (columns, gutter, margin, and a row step) are how designers check alignment on a screen, and Ctrl+G shows or hides them. Design Studio has CSS grid editing (`grid.*`, `features/grid`), rulers and frame snap, but no layout grid: "gutter" and "layout grid" have 0 hits in `ui/features/canvas`, `contracts` and `actions/canvas`. Bonaparte layouts sit on a container (`max-w-` in 930 files, `grid-cols-` in 535). A grid that the agent also reads makes generated screens line up with it.

**UI behaviour.**
- "…" > Arrange ▸ > "Layout grid…" (id `layout-grid`, no new top-level row) opens a small popover: presets "12 columns", "4 columns" (mobile), "8 px rows", and fields Columns, Gutter, Margin, Row step, and Remove. The default preset follows the frame width: 12 / 24 / 80 at 1024 px or more, 4 / 16 / 16 under that.
- The grid draws over the frame as faint red columns (Figma style) in the overlay layer, with `pointer-events: none`. It hides when a column is under 2 px on screen.
- Ctrl+G shows or hides all layout grids (view state through `src/ui/platform/storage.ts`), plus a palette command "Show layout grids". Check that Ctrl+G is free first.
- Each set is one layout history step (Cmd+Z), because the grid is stored in the canvas file.

**Actions.**
- New: `canvas.setLayoutGrid`, POST `/api/projects/:projectId/canvas/layout-grid`. `access: "edit"`, `confirm: "none"`, `needs: "project.update"`, `scope: "project"`. Input: `projectId`, `frame` (id or `@label`), `layoutGrid`: `Schema.NullOr(Struct { columns: Int 1..24, gutter: Int 0..200, margin: Int 0..400, rowStep: NullOr(Int 2..64) })`; null removes it. Output: `{ frameId, layoutGrid }`. `invalidates`: `["canvas.inspect"]`. Errors: `BadRequest`, `NotFound`. MCP and agent: `set_layout_grid_canvas` (agent set `core`, short text in STE).
- Changed: `canvas.inspect` frame items get `layoutGrid` (snapshot diff; user decision).
- Agent: the run's canvas context names the grid of its frame ("layout grid: 12 columns, gutter 24, margin 80"). `agent/user-message.ts` is at its 500-line cap; add the line in the file that builds the frame part of the context (the agent names it).

**Main files.**
- Contracts: `packages/common/contracts/src/canvas-file.ts` (one optional `layoutGrid` field on `CanvasFileFrame` and its clean step; add lines only).
- New: `actions/canvas/set-layout-grid.ts`, `actions/canvas/layout-grid/schema.ts`, `handlers/canvas/set-layout-grid.ts`, `server/canvas/engine/to-layout-grid.ts` (default preset and clamps).
- UI new: `canvas/{layout-grid-overlay.tsx,layout-grid-popover.tsx,use-layout-grid.ts,layout-grid-model.ts}`. Changed: `canvas/frame-menu-groups-model.ts` (one id), the frame overlay layer that draws per-frame overlays, `features/commands/canvas-commands.ts` (one command), one block in `canvas/copy.ts`.

**Verify in the running app.**
- An HTML frame at 1440 px: "Layout grid…" > 12 columns: red columns show with margins 80. Ctrl+G hides and shows them. Cmd+Z removes the grid in one step. Zoom to 5%: no grid.
- MCP `set_layout_grid_canvas` with `{ columns: 4, gutter: 16, margin: 16, rowStep: 8 }` on `@Mobile`: the UI shows it; `canvas_list` returns it; null removes it.
- A mock run on that frame: the run log context has the grid line.
- `pnpm exec tsx scripts/call-action.ts canvas.setLayoutGrid '<json>'` on 3 surfaces.
- Dark and light screenshots of a 12-column grid and the popover.

---

## 5. ruler-guides: drag a guide from a ruler, frames snap to it

**Why.** In Figma, a drag from a ruler makes a guide, and frames and layers snap to it. Design Studio draws rulers (`canvas-rulers.tsx`, `stage-rulers.tsx`, `ruler-paint-model.ts`), but they have no pointer code, and "guide" in `ui/features/canvas` names only the snap lines of a drag (`frame-snap-store.ts`). Guides keep a row of screens on one baseline and give the agent a place to put new frames.

**UI behaviour.**
- With rulers on (the existing rulers switch), a drag from the top ruler makes a horizontal guide, and from the left ruler a vertical one, in canvas units. A label shows the value while you drag.
- A guide is a 1 px line across the stage. A drag on it moves it; a drag back onto the ruler removes it. Guides hide with the rulers. No other new control.
- A frame drag and a frame resize snap to guides within 6 screen px, through the existing `frame-snap-store.ts` guides list.
- Each add, move or remove is one layout history step (Cmd+Z).

**Actions.**
- New: `canvas.setGuides`, POST `/api/projects/:projectId/canvas/guides`. `access: "edit"`, `confirm: "none"`, `needs: "project.update"`, `scope: "project"`. Input: `projectId`, `guides`: array (max 50) of `{ axis: "x" | "y", at: Number }`; the whole list, so an empty list removes all (as `canvas.setStartPoints`). Output: `{ guides }`. `invalidates`: `["canvas.inspect"]`. Errors: `BadRequest`. MCP and agent: `set_guides_canvas` (agent set `core`).
- Changed: `canvas.inspect` output gets `guides` (snapshot diff; user decision). `canvas_place` with a frame `y` on a guide needs no change.

**Main files.**
- Contracts: `packages/common/contracts/src/canvas-file.ts` (one optional `guides` field on `CanvasFile` and its clean step; add lines only).
- New: `actions/canvas/set-guides.ts`, `actions/canvas/guide/schema.ts`, `handlers/canvas/set-guides.ts`.
- UI new: `canvas/{ruler-guide-layer.tsx,use-ruler-guides.ts,ruler-guide-model.ts}`. Changed: `canvas/canvas-rulers.tsx` (pointer start), `canvas/frame-snap-store.ts` or the snap model that fills it (add guide lines), one block in `canvas/copy.ts`.

**Verify in the running app.**
- Rulers on. Drag from the top ruler to y = 0: a guide shows. Drag 3 frames near it: each snaps. Drag the guide back to the ruler: it goes. Cmd+Z brings it back.
- Rulers off: guides hide; frames do not snap.
- MCP `set_guides_canvas` with 2 guides: the UI shows them; `[]` removes them.
- `call-action canvas.setGuides` on 3 surfaces.
- Dark and light screenshots of a guide with snapped frames.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 safe-frame-remove | `canvas/frame-label.tsx`, `canvas/frame-remove-button.tsx`, `canvas/frame-label-state.ts`, `canvas/canvas-wiring-inputs.ts`, `canvas/resize-handles.tsx`, `styles/frames.css`, `server/main/lifecycle.ts` |
| 2 starter-tokens | `server/design-system/engine/{to-starter-page.ts,to-starter-roles.ts}`, `server/design-system/created-pack.ts`, `server/design-system/extract/compose.ts` |
| 3 state-runs | `canvas/{use-state-check.ts,state-check-model.ts,state-check-line.tsx,state-run-model.ts}`, the `ui/app/studio` prompt file, `actions/canvas/inspect-state-frames.ts` (description) |
| 4 layout-grid | `actions/canvas/{set-layout-grid.ts,layout-grid/schema.ts}`, `handlers/canvas/set-layout-grid.ts`, `server/canvas/engine/to-layout-grid.ts`, `canvas/layout-grid-*`, `canvas/use-layout-grid.ts`, the frame overlay layer file, the agent canvas-context file, `features/commands/canvas-commands.ts` |
| 5 ruler-guides | `actions/canvas/{set-guides.ts,guide/schema.ts}`, `handlers/canvas/set-guides.ts`, `canvas/{ruler-guide-layer.tsx,use-ruler-guides.ts,ruler-guide-model.ts}`, `canvas/canvas-rulers.tsx`, `canvas/frame-snap-store.ts` |

Shared files:
- `src/ui/features/canvas/copy.ts`: picks 1, 3, 4 and 5 each add one block. This file conflicted in cycle 19; keep every block at merge.
- `canvas/frame-menu-groups-model.ts`: picks 1 (`remove-frame`) and 4 (`layout-grid`) each add one id to Arrange ▸.
- `packages/common/contracts/src/canvas-file.ts`: picks 4 (`layoutGrid` on a frame) and 5 (`guides` on the file). Add lines only; both change the clean step, so merge one, then rebase the other.
- `canvas.inspect` output schema (`actions/canvas/schema.ts` or the inspect schema the agent finds): picks 4 and 5 each add one field.
- `@generated` files (`all-actions.generated.ts`, `actions/canvas/routes.ts`, `handlers.ts`, `index.ts`) and `packages/common/actions/package.json` (export map): picks 4 and 5 each add an action. This conflicted in cycles 18 and 19. Run `pnpm exec tsx scripts/gen-routes.ts` after each merge, one at a time.
- `handlers/canvas/live.ts`: only if pick 4 or 5 needs a new service (neither should; the canvas writer exists).
- `artifacts/mcp-snapshots/*.json`: new `set_layout_grid_canvas`, `set_guides_canvas`; changed `canvas_list` (picks 4, 5), `inspect_state_frames_canvas` description (pick 3). Approve at merge (user decision), with the cycle-14 to 19 diffs that still wait.
- `.claude/goal/roadmap.md` Appendix A: add the globs of each pick before its slice runs (L6e).
- Pick 1 reads the state check through `use-state-check.ts` and does not edit it; pick 3 owns that file.

## Merge order

All 5 can run at once. Merge 2 (starter-tokens, server design-system only), then 3 (state-runs, state-check files), then 4 (layout-grid, new action; gen-routes), then 5 (ruler-guides, new action; rebase on 4 for `canvas-file.ts` and the inspect schema; gen-routes), then 1 (safe-frame-remove last: it owns the most label files, it adds a menu id next to pick 4, and its screenshots must show the final label).

## Runners-up

1. Layers snap to the layout grid inside the preview (free move and resize in `bridge/free-move.ts`), after pick 4.
2. Outline matching frames on hover of the shared layers chip (cycle-15 left out; needs a canvas path through `ui/app`).
3. "App now" label and Compare on `page.importSource` frames (route-sync left out since cycle 16).
4. Server-side state run queue that keeps going after the project closes, after pick 3.
5. Trusted folders in Settings (MCP test 2 "Still open": only the setting and `STUDIO_MCP_TRUSTED_FOLDERS` today).
6. Bonaparte frictions 7, 8 and 15 (Open folder with an app chip, "no git" for an attached folder, tool rail over the frame at 100%): recheck first; fix the ones still open.
7. Live data from a URL (Figma Make connectors); needs a PHI rule before it points at a Bonaparte API.
8. Touch pointer in Play on phone frames (round 28 pick 5); UI only, low on headless.
9. Export a frame to Figma as editable layers (Claude Design still lacks it); needs a Figma plugin.
10. Agent engine choice (Codex, Gemini CLI), as in doop and Open Design; high effort.

Sources: [mcp.directory 2026 comparison](https://mcp.directory/blog/claude-design-vs-stitch-vs-v0-vs-lovable-vs-figma-make-2026), [konigi.com Claude Design](https://konigi.com/articles/claude-design-has-the-incumbents-scrambling/), [monkfrom.earth Claude Design vs Figma, Lovable, v0](https://monkfrom.earth/blogs/claude-design-vs-figma-lovable-v0), [claudefa.st Claude Design handoff](https://claudefa.st/blog/guide/mechanics/claude-design-handoff), [chatgate.ai doop](https://chatgate.ai/en/post/doop), [glama.ai doop](https://glama.ai/mcp/servers/kgoedecke/doop).
