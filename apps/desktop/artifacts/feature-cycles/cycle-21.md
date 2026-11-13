# Feature cycle 21: next 5 features

Date: 2026-11-13. Main at `878779b5e` (all 5 cycle-20 picks merged).

## Method

- Read `cycle-20.md` (picks, runners-up, Results), the 5 `cycle-20/*.md` reports ("Left out"), cycles 13 to 19 (picks, runners-up, Results), the tail of `.claude/goal/feature-log.md`, `git log --oneline -100`, `bonaparte-benchmark.md`, `mcp-bonaparte-test-2/report.md`, the `journeys-run/*.md` reports and reruns, `clip-check/report.md` and `idle-chrome-fix.md`.
- Checked each candidate with narrow greps in `packages/common/actions/src`, `packages/common/contracts/src`, `apps/desktop/src/{ui,server,bridge,shared}`, `apps/desktop/scripts/clip` and Bonaparte (read-only).
- Branch check: `git branch -a --list "*feat/<key>*"` is empty for `menu-fit`, `border-sides`, `layer-snap`, `trusted-folders` and `state-queue`.
- Tool name check in `artifacts/mcp-snapshots/*.json`: `start_states_run` and `get_states_run` have 0 hits.
- Competitor recheck (web search, 2026-11-13): nothing new from November 2026 for Claude Design, Figma Make, v0, Lovable or doop. The newest items are still the April 2026 Claude Design launch, the July 2026 Figma Make GitHub link and the August 2026 doop launch. No pick comes from a new competitor feature.
- Skipped as the user's decision: the panel rail until edit mode, and the Home cuts (`open-design-polish.md` §2 and §3). Bonaparte friction 8 ("no git" on Home) and 11 (three recent lists) sit in the Home cuts.
- `fix/idle-chrome` (another agent, this session) owns the headless Chrome, MCP client name, Versions row, `get_run` status and tooltip-after-Escape fixes. No pick touches those files.

## Skipped as built (checked this cycle)

Everything in the cycle-13 to 20 lists, plus:
- Figma manual tools found built: absolute position in auto layout (`inspector/absolute-toggle.tsx`), layer rename (`versions-layers-tokens/layer-rename-input.tsx`), min and max size (`inspector/min-max-rows.tsx`), text truncate (`inspector/truncate-model.ts`), image fit (`inspector/image-model.ts`), flex wrap, blend mode, rotation, distance measure (`canvas/measurements.tsx`), copy as CSS and PNG, selection colors and replace (`inspector/match-*`, feat/style-replace), find and replace text (`features/text-search`), PDF and PPTX export.
- Trusted folders from the env var in `connection.getSetup` (`envTrustedFolders`): built. Only the UI is missing (pick 3).
- File lock on every MCP write and version authors (journey 17): pass in `journeys-run/c-16-19-rerun.md`.
- oklch swatch (friction 14): `toColorHex` falls back to `colorHex` (culori) only when the token UI is not null. Not a pick; bundled into pick 2.

## Ranking

Score = user value x fit with "simple and fast" / effort (1 to 5 each). Rank by value first; the score breaks ties.

| Rank | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|
| 1 | menu-fit: canvas menus and submenus stay on screen, plus cycle-20 open items | 5 | 5 | 2 | 12.5 |
| 2 | border-sides: a border on one side only (Figma stroke sides) | 5 | 5 | 3 | 8.3 |
| 3 | trusted-folders: set MCP trusted folders in Connect AI | 4 | 5 | 2 | 10 |
| 4 | layer-snap: layers in the preview snap to guides and layout grid columns | 4 | 5 | 3 | 6.7 |
| 5 | state-queue: one server call designs every missing state, in turn | 4 | 4 | 3 | 5.3 |

Menu fit is the fixed pick: cycle 20 found the Arrange submenu cut off at the right edge. Border sides is the Figma manual gap with the most Bonaparte weight: `border-b` in 360 Bonaparte `.tsx` files, `border-t` 296, `divide-y` 99, but the inspector has one `border-width` and `DIRECT_STYLE_PROPERTIES` has no side widths. Layer snap closes the cycle-20 open item "Layers inside the preview do not snap to guides" and runner-up 1. Trusted folders is the Bonaparte pick from 2 recorded failures: MCP test 2 "Still open" (no UI for trusted folders) and journey 5 (Bonaparte import "Fail (zero-click)", pass only after "Allow once"). State queue moves the state-runs loop to the server, from the state-runs report: the chat agent has no path, an MCP client must write the loop, and each step reads the state check 3 times. No pick adds an always-visible control.

---

## 1. menu-fit: canvas menus and submenus stay on screen, plus cycle-20 open items

**Why.** In a narrow window, the frame "…" menu's Arrange ▸ submenu is cut off at the right edge (cycle-20 Results). Cause: `.project-menu.preview-submenu` in `styles/canvas.css` has `left: calc(100% + 2px)` and no flip. `use-preview-menu-placement.ts` (`toClampedPoint`) clamps only the root point of the right-click menu, and no other canvas menu clamps. The clip check did not see it: `scripts/clip/session.ts` sets `ignore: ".stage"`, the frame menus render inside `.stage` (none uses a portal), and no clip state opens a canvas menu. So `check:clip` reports 0 with the bug present.

**UI behaviour.**
- **One placement rule.** New pure `canvas/menu-fit-model.ts`: `toMenuFit({ anchor, size, bounds, gap })` returns `{ side: "right" | "left", shiftX, shiftY }`. `bounds` is the visible rect of `.stage` (it has `overflow: hidden`, `styles/canvas.css` line 169) cut by the window, not `window.inner*`: a floating panel or the stage edge can cut a menu that is still inside the window. A root menu shifts left or up to stay 8 px inside `bounds`. A submenu opens on the right; when it does not fit, it opens on the left of its row; when neither fits, it takes the side with more room and shifts. It shifts up when its bottom passes `bounds`. Reuse `toPopoverPosition` from `canvas/play-popover.ts` if it fits; do not copy it.
- **One hook.** New `canvas/use-menu-fit.ts`: on open (pointerenter or focus of the submenu host, and on mount for a root menu) it measures the anchor and the menu, and sets `data-side` and the `--menu-shift-x` and `--menu-shift-y` CSS variables. A `ResizeObserver` and a window resize run it again. CSS in `canvas.css` reads `data-side="left"` (`right: calc(100% + 2px); left: auto`) and the shift variables. Keys do not change: ArrowRight opens a submenu, ArrowLeft closes it, on either side.
- **Menus it covers** (every `role="menu"` in `features/canvas`): `frame-more-menu.tsx`, `frame-submenu.tsx`, `preview-menu.tsx` (keep its clamp; add the submenu flip through `preview-submenu-row.tsx`), `layer-pick-menu.tsx` and `layer-pick-items.tsx`, `frame-select-menu.tsx`, `add-frame-menu.tsx`, `play-start-menu.tsx`, `top-bar-menu.tsx`, `route-source-chip.tsx`, `state-list-panel.tsx`, `frame-page-list.tsx`, `use-in-menu.tsx` (the variation frame menu in `variation-controls.tsx`). Out of scope: `app/shell/project-menu.tsx` and the comments placement (`comments/*`, already has `data-side`).
- **Bundled cycle-20 open items:**
  - **Ctrl+G in the shortcuts list.** `shared/keymap.ts` is 504 lines, and `studio/no-file-growth` blocked the entry in cycle 20. Move one whole group of entries (for example the canvas view group) into a new `shared/keymap-view.ts` that `keymap.ts` spreads into `KEYMAP`, so `keymap.ts` shrinks; then add the entry `{ id: "view-layout-grid", label: "Show layout grids", keys: ["Ctrl+G"], group: "View" }` there. On Windows and Linux Ctrl+G is also `Mod+G` (group, line 309): the label tip says the grid toggle skips when a layer is selected. Do not change the key code in `use-layout-grid.ts`.
  - **Layout version on quit.** It is reachable, but not with one call. Path: `startLayoutVersions` (`http/app-layout-versions.ts`) returns `{ flushLayoutVersions: queue.flushAll }`; `http/app.ts` passes it out with its other return values; `main/public.ts` (297 lines; it calls `handleSignals` at line 288) adds a `flushLayoutVersions` field to `ShutdownParts`; `stopAll` in `main/lifecycle.ts` awaits it first, then runs the existing `Promise.allSettled` (it records versions through the runtime, so it must end before `disposeRuntime` and `preview.stop()`). Wrap it in a timeout under `FORCE_EXIT_MS`, and log a failure, never throw. No module `let` (S21). All 4 files are under the cap (`app.ts` 95, `app-layout-versions.ts` 37, `lifecycle.ts` 109, `public.ts` 297), so the item is in.

**Clip check (the proof).**
- In `scripts/clip/session.ts` and `probe-page.ts`, keep `ignore: ".stage"` for every other box, but measure a box that matches `[role="menu"]` (and its menu items) inside `.stage` against the same `bounds` as `toMenuFit`: the `.stage` rect cut by the viewport. Do not weaken any other rule. Do not edit `clip-baseline.json` upward.
- In `scripts/clip/states.ts` add states (names start with "canvas menu"): "…" menu on the rightmost frame placed against the right edge; Arrange ▸ open (hover, then ArrowRight); each other submenu of the "…" menu; the right-click preview menu at the bottom-right of a frame with a submenu open; the frame selection menu; the add-frame menu; Arrange ▸ with the right floating panel open at 900 px. Add a narrow size 900x700 to the 1440x900 and 1000x800 sizes for these states only. Seed the rightmost frame in `scripts/clip/seed.ts`.
- Proof is 2 runs: on `main` (the states added, no CSS change) the new states give at least 1 `clipped` finding for Arrange ▸; on the branch, `pnpm run check:clip` gives 0 findings of every kind. Save both reports in `artifacts/feature-cycles/cycle-21/menu-fit/`.

**Headless.** No action changes. Menus are UI only; every row already maps to an action or a key.

**Main files.**
- New: `canvas/menu-fit-model.ts`, `canvas/use-menu-fit.ts`, `shared/keymap-view.ts`.
- Changed: the menu files above, `styles/canvas.css` (submenu rules), `shared/keymap.ts` (shrinks), `http/app-layout-versions.ts`, `http/app.ts`, `main/lifecycle.ts`, `main/public.ts`, `scripts/clip/{session.ts,probe-page.ts,states.ts,seed.ts}`.

**Verify in the running app** (`STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev`).
- Window 900 px wide. Put a frame at the right edge. "…" > Arrange ▸: the submenu opens on the left, all rows visible. Move the frame left: it opens on the right again.
- Open the right floating panel at 900 px, then Arrange ▸ on the frame next to it: no row sits under the panel or past the stage edge. Repeat at 11% and 200% zoom.
- Right-click in a frame near the bottom-right corner, open a submenu: it shifts up and opens left. ArrowRight and ArrowLeft still open and close it.
- `pnpm run check:clip`: 0 findings, with the new canvas menu states listed in `clip-check/report.md`.
- Cmd+K > "Keyboard shortcuts": "Show layout grids  Ctrl+G" shows.
- Move a frame, press Ctrl+C on the server in under 10 s, start again: Versions has the "Layout" entry.
- Dark and light screenshots of Arrange ▸ flipped at 900 px.

---

## 2. border-sides: a border on one side only (Figma stroke sides)

**Why.** Figma strokes have All, Top, Right, Bottom, Left and Custom. Design Studio has one `border-width`, `border-style` and `border-color` (`inspector/border-grid.tsx`). `DIRECT_STYLE_PROPERTIES` in `contracts/src/contracts.ts` has no `border-top-width` to `border-left-width`, and the Tailwind map has no sided border group (`SidedGroup` covers radius, padding and margin). Bonaparte puts dividers on one side all the time: `border-b` in 360 `.tsx` files, `border-t` 296, `border-l` 96, `border-r` 57, `divide-y` 99. Today a Bonaparte header with `border-b` shows the wrong width, and a side edit cannot be made by hand, by the agent or over MCP.

**UI behaviour.**
- In the Border section, a side choice next to the width: All, Top, Right, Bottom, Left, Custom (same look and keys as the padding side control, `inspector/side-input.tsx`). No new section and no new top-level control.
- Custom shows 4 width fields (T, R, B, L) in the existing grid. One side shows one width field for that side.
- The section reads the side state from the 4 computed side widths. A layer with `border-b` opens on Bottom with its width.
- The code it writes: in a Tailwind project `border-b`, `border-t-2`, `border-x`, `border-y` (it removes the other classes of the set; All writes `border` or `border-<n>`); in a CSS project the `border-<side>-width` properties through the same style edit. Removing the border removes the side classes too.
- **Bundled friction 14 (oklch swatch).** In `inspector/field-model.ts`, `toColorHex` uses `colorHex` when the token UI is null too, so a plain `oklch(...)` value shows its swatch. Give the text field the room it needs so "Color oklch(…" does not cut to "Color o…" (fix in the field row CSS, not with a new row).

**Headless.** No new action. `direct-edit` style edits (`edit_element` on MCP, the agent direct tools in `agent/direct-tools.ts`, `state-style` and breakpoint tools) take the style keys from `DIRECT_STYLE_PROPERTIES`, so all of them get the 4 side widths. `state-style/schema.ts` and `mcp/edit-kit.ts` use the list too. `direct-edit-element.json` has 2 schema blocks that list `border-width` (one in `edit_element`); grep every snapshot for `"border-width"` and name each tool whose input changes (`set_layer_state` and the state-style tools are likely). Snapshot diff; user decision at merge.

**Main files.**
- Contracts: `packages/common/contracts/src/contracts.ts` is 2624 lines and may not grow (L2a). Move the 4 border entries (`border-radius`, `border-width`, `border-style`, `border-color`) into a new `contracts/src/border-side-properties.ts`, add the 4 side widths there, and spread the list into `DIRECT_STYLE_PROPERTIES` at the same place. That is a net loss of lines after oxfmt, and the order stays the same. Export it through the package `exports` map (gen-routes writes it).
- Engine: `server/direct-edit/engine/tailwind/map.ts` (1041 lines) and `classes.ts` (864) may not grow. Put the `border` sided group (prefixes `border-t/r/b/l/x/y`, width scale) in a new `server/direct-edit/engine/tailwind/border-sides.ts`, and wire it so each file loses lines: move the existing border width code (`borderWidthToken` and its `border-width` case in `map.ts`) into the new file with the side code.
- Bridge: the computed style read (`bridge/element-info.ts` or `bridge/style-scan.ts`, the agent names it) sends the 4 side widths.
- UI: `inspector/{border-section.tsx,border-grid.tsx,simple-model.ts,field-model.ts}`, new `inspector/border-side-model.ts`, new `inspector/use-border-sides.ts`, new `inspector/border-side-row.tsx`, one block in `inspector/copy.ts`.

**Verify in the running app.**
- A Tailwind fake app in `/tmp` with a header `className="border-b"`: the Border section shows Bottom, 1. Set Top, 2: the source class becomes `border-t-2`, the line moves in the frame. Set Custom T 0 R 0 B 2 L 4: classes `border-b-2 border-l-4`. Cmd+Z restores `border-b` in one step.
- An HTML project: the same edits write `border-bottom-width` and friends; All writes `border-width`.
- MCP `edit_element` with `{ "border-bottom-width": "2px" }` on a Tailwind layer: the class is `border-b-2`. The in-app mock agent does the same.
- Bonaparte (read-only, as a route prototype copy): a `border-b` row opens on Bottom. Bonaparte `git status --short` is unchanged.
- Select text with `color: oklch(0.15 0 0)`: the swatch is dark, the value reads in full.
- Dark and light screenshots of the Border section on Bottom and on Custom.

---

## 3. trusted-folders: set MCP trusted folders in Connect AI

**Why.** MCP test 2 "Still open": "No UI for trusted folders yet; only the setting and `STUDIO_MCP_TRUSTED_FOLDERS`." Journey 5 (import the Bonaparte design system over MCP): "Fail (zero-click); pass after 1 UI step (Allow once)". `connection.setStatus` already takes `trustedFolders`, and `connection.getSetup` returns `trustedFolders` and `envTrustedFolders`, but no file in `src/ui` reads either. So the only way to let Claude Code import from Bonaparte with no approval card is an env var.

**UI behaviour.**
- In the Connect AI dialog, a "Trusted folders" row under the Allow edits row (`connect-edits-row.tsx`), closed by default, with the count ("2 folders"). Open: one row per saved folder with × (remove), one row per env folder with the tag "From STUDIO_MCP_TRUSTED_FOLDERS" and no ×, and "Add folder…" (native picker through `desktopBridge` in Electron, a path field in the browser). One line of text: "MCP clients can make a design system from these folders without asking you."
- The MCP approval card for a design-system import from a folder gets a second button, "Always allow this folder", next to "Allow once". It adds the folder to the trusted list, then approves. `McpApprovalSchema` has only a `detail` text today: add `folder: Schema.NullOr(Schema.String)` to the approval wire. The approval list is app-only (check that its MCP and agent are off); if it is in a snapshot, leave the button out and say so.
- **Bundled starter-tokens left out.** The first import response lists Geist in `pack.fonts` and in the DESIGN.md token table until the scan ends (base pack in `server/design-system/draft.ts`). Leave `fonts` empty while the scan runs. If that needs a manifest schema change, leave it out and say so.

**Headless.** UI only by design. `connection.setStatus` is `mcp: { off: "secret" }` and `agent: { off: "secret" }`, and it must stay so: an agent that can add its own trusted folder skips the approval card. No action changes, except the `folder` field on the app-only approval wire.

**Main files.**
- New: `share-publish-ship-export/connect-trusted-row.tsx`, `share-publish-ship-export/use-trusted-folders.ts`, `share-publish-ship-export/trusted-folders-model.ts`.
- Changed: `share-publish-ship-export/connect-ai-body.tsx` (one mount), `share-publish-ship-export/connect-ai-api.ts` or `mcp-status-api.ts` (the call), one block in `share-publish-ship-export/copy.ts`, `chat/mcp-approval.tsx` and `chat/permission-actions.tsx` (the button), one key in `chat/copy.ts`, `actions/connection/schema.ts` (the `folder` field), the server file that builds approvals for a pack import (the agent names it), `server/design-system/draft.ts`.

**Verify in the running app.**
- Connect AI > Trusted folders > Add folder… `/tmp/fake-ds`: the row shows; `connection.getSetup` returns it. Start with `STUDIO_MCP_TRUSTED_FOLDERS=/tmp/env-ds`: that row shows with the tag and no ×.
- Raw JSON-RPC MCP client: import a design system from Bonaparte (read-only) with Bonaparte not trusted: the card shows; click "Always allow this folder": the import runs. Import again: no card (zero-click). Remove the folder: the card shows again.
- The first import response has no Geist.
- Bonaparte `git status --short` is the same before and after.
- Dark and light screenshots of the open row and of the approval card.

---

## 4. layer-snap: layers in the preview snap to guides and layout grid columns

**Why.** Cycle 20 added layout grids and ruler guides, but only frames snap to them. Its reports list as open: "Layers inside the preview do not snap to guides" and "Layers do not snap to the grid" (runner-up 1). In Figma, a layer drag snaps to the columns of its frame grid and to guides. Layer snapping runs in the UI: `canvas/free-move-model.ts` calls `snapRect` with `session.candidates` (sibling rects), and resize calls `snapSize` in `resize-handles-session.ts`.

**UI behaviour.**
- A layer move or resize in the preview snaps its edges and center to: the column edges and margins of its frame's layout grid, the row step lines when set, and the ruler guides that cross the frame. Threshold is the existing `SNAP_PX` (6 screen px). The existing red snap guide shows the line it snapped to.
- Grid lines take part only while the grid shows (Ctrl+G). Guides take part only while the rulers show. Alt or the existing snap-off key turns all snapping off, as today.
- `isSnapSkipped` returns true when `session.candidates.length === 0`, so an absolute card with no siblings never snaps today. Change it to skip only when there are no candidates and no grid or guide lines.
- Limit (report only, no new text in the UI): `isSnapSkipped` skips any layer whose mode is not `absolute`, so a flow child in auto layout reorders and does not snap. This pick does not change that.
- No new control.

**Headless.** No action changes. An agent or MCP client places layers with numbers; the run's canvas context already names the frame grid (cycle 20). The moves still write through the existing free-move and resize edits.

**Main files.**
- New: `canvas/layer-snap-lines-model.ts` (pure: frame grid and guides in canvas units to frame-local snap lines, through `preview-rect-model.ts` for scale and offset), `canvas/use-layer-snap-lines.ts` (reads the grid through the `use-layout-grid.ts` export and the guides through the `use-ruler-guides.ts` export; does not change either hook).
- Changed: `canvas/free-move-model.ts` (`isSnapSkipped` and the `snapRect` call), `canvas/resize-handles-session.ts`, and `canvas/snap-model.ts` only for one new `lines` input on `snapRect` and `snapSize` (it is 492 lines; put the line logic in the new model file so it stays under 500).

**Verify in the running app.**
- An HTML frame at 1440 px with a 12-column grid (margin 80, gutter 24). Drag an absolute card that has no siblings: its left edge snaps at 80 and at each column edge; the red line shows. Ctrl+G off: no grid snap.
- Rulers on, drag a guide to y = 200 across the frame. Resize the card: its bottom snaps at 200. Rulers off: no guide snap.
- Alt-drag: no snap. A flow child in a flex row: reorders as before.
- Zoom 25% and 200%: the snap lands on the same canvas value.
- Dark and light screenshots of a snapped card with the grid and a guide.

---

## 5. state-queue: one server call designs every missing state, in turn

**Why.** Cycle-20 state-runs made "Design missing states" start one run per state, but the sequence lives in the `StateCheckLine` hook. Its report lists the gaps: the chat agent has no path (`start_run` is `agent: { off: "run-control" }`); an MCP client must write the loop (`inspect_state_frames_canvas`, then one `start_run` per item, then `get_run`); each step reads the state check about 3 times (5 frame captures each), so there is a gap of some seconds between runs; and the rest does not start once the project closes. `run.setQueue` queues messages for one run, not runs.

**UI behaviour.**
- The section line looks the same as today: "Designing Loading (1 of 2)…" and Stop. It now reads the sequence from the server, so it keeps its count after a reload and on a second window.
- The server starts the next run when one ends with success, after one state check read for that frame only. A state that no longer looks like the default is skipped. A failed or stopped run ends the sequence; the line names the state that did not finish.
- Stop (the line, or `run.stop` on the current run from anywhere) drops the rest.
- The sequence keeps going when the project closes in the UI, while the server runs. A server restart drops it (stated in the description).

**Actions.**
- New: `run.startStates`, POST `/api/projects/:projectId/runs/states`. `access: "edit"`, `confirm: "none"`, `needs: "project.update"`, `scope: "project"`. Input: `projectId`, `section` (the state board section id). Output: `{ sequenceId, items: [{ state, frameId, status }] }`, `status` one of `waiting`, `running`, `done`, `skipped`, `failed`, `stopped`. Errors: `BadRequest`, `NotFound`, `Conflict` (a sequence already runs for that section). `invalidates`: `["run.list", "run.getStates"]`. MCP `start_states_run`; agent `{ off: "run-control" }` (E8, check-actions).
- New: `run.getStates`, GET `/api/projects/:projectId/runs/states/:sequenceId`. `access: "read"`, same output, `errors: [NotFound]`, `invalidates: []`. MCP `get_states_run`; agent `{ off: "run-control" }`.
- Changed: `run.stop` description says it also drops the rest of a sequence. `canvas.inspectStateFrames` description names `start_states_run` in place of the loop (snapshot description diffs; user decision).
- Check the names against `docs/naming.md` and `studio/derived-tool-name` before the stamp; if the run domain needs another object word, rename both actions together.

**Main files.**
- Area: there is no `server/run` folder. The services go in the existing `server/run-log/` area; a new area needs a `lint/boundaries.ts` element, which only the merge step adds (L6d).
- New: `actions/run/start-states.ts`, `actions/run/get-states.ts`, `actions/run/states/schema.ts`, `handlers/run/start-states.ts`, `handlers/run/get-states.ts`, `server/run-log/state-run-queue.ts` (`StateRunQueue`, `access: "write"`: starts runs, one sequence per section, in a Layer), `server/run-log/state-run-store.ts` (`StateRunStore`, `access: "read"`: the sequence list that the queue writes and `run.getStates` reads; S7a forbids a write service in a read handler), `server/run-log/engine/to-next-state.ts` (pure; move `toNextStepIndex` from `canvas/state-run-model.ts` here, or keep the UI copy and import nothing from the server).
- Changed: `actions/_core/ids.ts` (a branded `StateSequenceIdSchema`, W3), `server/run-log/index.ts` (export both services), `handlers/run/live.ts` (provide both services), `actions/run/stop.ts` and `canvas/inspect-state-frames.ts` (descriptions), `canvas/use-state-check.ts`, `canvas/state-check-line.tsx`, `canvas/state-run-model.ts` (UI loop goes; it calls the action and reads `run.getStates`), `ui/platform/ask-chat.ts` (drop the run-end store if nothing else reads it), one block in `canvas/copy.ts`.
- `@generated` lists and the actions export map: run `pnpm exec tsx scripts/gen-routes.ts`.

**Verify in the running app.**
- Cycle-18 fake Next app with no auth and no loading UI, mock agent: "Design missing states" starts 2 runs in turn, each run log shows its own frame and "frame state <name>". The line counts 1 of 2, then 2 of 2. The gap between runs is under 2 s.
- Reload during run 1: the line still shows 1 of 2. Close the project during run 1, open it again after: run 2 ran.
- Stop during run 1: run 2 does not start. `run.stop` from the chat run menu: the same.
- MCP: `start_states_run` with the section, then `get_states_run` until all `done`. A second `start_states_run` on that section while it runs: `Conflict`.
- `pnpm exec tsx scripts/call-action.ts run.getStates '<json>'` on HTTP and MCP.
- Dark and light screenshots of the section line during a sequence.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 menu-fit | `canvas/menu-fit-model.ts`, `canvas/use-menu-fit.ts`, the 13 canvas menu files listed in pick 1, `styles/canvas.css` (menu rules), `shared/keymap.ts`, `shared/keymap-view.ts`, `http/app-layout-versions.ts`, `http/app.ts`, `main/lifecycle.ts`, `main/public.ts`, `scripts/clip/*` |
| 2 border-sides | `contracts/src/contracts.ts`, `contracts/src/border-side-properties.ts`, `direct-edit/engine/tailwind/{map.ts,classes.ts,border-sides.ts}`, the bridge style read, `inspector/border-*`, `inspector/use-border-sides.ts`, `inspector/simple-model.ts`, `inspector/field-model.ts` |
| 3 trusted-folders | `share-publish-ship-export/connect-*` and `trusted-folders-*`, `chat/{mcp-approval.tsx,permission-actions.tsx}`, `actions/connection/schema.ts`, the pack approval builder, `server/design-system/draft.ts` |
| 4 layer-snap | `canvas/{layer-snap-lines-model.ts,use-layer-snap-lines.ts,free-move-model.ts,resize-handles-session.ts,snap-model.ts}` |
| 5 state-queue | `actions/run/{start-states.ts,get-states.ts,states/}`, `handlers/run/{start-states.ts,get-states.ts,live.ts}`, `server/run-log/{state-run-queue.ts,state-run-store.ts,engine/to-next-state.ts}`, `canvas/{use-state-check.ts,state-check-line.tsx,state-run-model.ts}`, `ui/platform/ask-chat.ts` |

Shared files and conflict warnings:
- `src/ui/features/canvas/copy.ts`: only pick 5 adds a block. Pick 1 adds no copy there (the menu fit has no text; the Ctrl+G label lives in `keymap-view.ts`). Pick 4 adds none. If an agent needs a key here, it adds it to its own block, never to the `copy` object that pick 5 changes.
- `src/ui/features/inspector/copy.ts`: pick 2 only.
- `share-publish-ship-export/copy.ts` and `chat/copy.ts`: pick 3 only.
- `styles/canvas.css`: pick 1 owns the menu rules. Pick 4 reuses the existing snap guide style and must not edit this file.
- Canvas writer and canvas file schema (`canvas-writer.ts`, `contracts/src/canvas-file.ts`, `actions/canvas/frame/schema.ts`, the cycle-20 7-file conflict area): no pick changes them. Pick 4 only reads the grid and guides through the cycle-20 hooks. Pick 5 reads state frames through existing services and does not write the canvas file.
- `packages/common/contracts`: pick 2 only (`contracts.ts`, new `border-side-properties.ts`, the contracts export map).
- `@generated` lists (`all-actions.generated.ts`, `actions/run/routes.ts`, `handlers.ts`, `index.ts`) and `packages/common/actions/package.json`: pick 5 only adds actions. Pick 3 changes one schema file. Run `pnpm exec tsx scripts/gen-routes.ts` after merging 3, 2 (contracts exports) and 5, one at a time.
- `actions/canvas/inspect-state-frames.ts` (description): pick 5 only.
- `packages/common/actions/src/_core/ids.ts`: pick 5 adds one branded id. No other pick edits it; add lines only.
- `canvas/state-run-model.ts`, `use-state-check.ts`: pick 5 only. Cycle-20 `use-same-as-default.ts` imports `isStateBoardSection` and `toBoardFrameId` from `state-check-model.ts`; pick 5 keeps both.
- `use-layout-grid.ts`, `use-ruler-guides.ts`: read-only for picks 1 and 4; no pick edits them.
- `artifacts/mcp-snapshots/*.json`: changed `edit_element` input (pick 2); new `start_states_run`, `get_states_run` and changed `inspect_state_frames_canvas` and `stop_run` descriptions (pick 5). Approve at merge (user decision), with the cycle-14 to 20 diffs that still wait.
- `.claude/goal/roadmap.md` Appendix A: add the globs of each pick before its slice runs (L6e). Pick 1 needs `scripts/clip/**` and `shared/keymap*.ts`; pick 2 needs `packages/common/contracts/src/border-side-properties.ts`.
- Line caps (L2a) that each agent must plan for: `shared/keymap.ts` 504 (pick 1), `contracts.ts` 2624, `tailwind/map.ts` 1041, `tailwind/classes.ts` 864 (pick 2), `snap-model.ts` 492 (pick 4).

## Merge order

All 5 can run at once. Merge 3 (trusted-folders, isolated UI and one schema field; gen-routes), then 2 (border-sides, contracts and engine; gen-routes for the contracts exports), then 4 (layer-snap, canvas snap files only), then 5 (state-queue, new actions; gen-routes), then 1 (menu-fit last: it owns every canvas menu and the clip check, so its 0-finding run must see the final UI of all 5 picks; rerun `pnpm run check:clip` after the merge).

## Runners-up

1. "App now" label and Compare on `page.importSource` frames (route-sync left out since cycle 16).
2. Bonaparte frictions 12, 15 and 7: Play in one click (it is the 4th row of Present today), the tool rail inset at 100%, Open folder with an app chip; recheck 7 and 15 first.
3. Ruler guide drag snaps to frame edges, and the mock agent `canvas_list` text path shows guides (ruler-guides left out; `tools.ts` at its cap).
4. Run canvas context names the ruler guides that cross the frame, as it names the layout grid.
5. Stroke position Inside, Center, Outside (Figma), through `outline` and `box-shadow`, after pick 2.
6. Outline matching frames on hover of the shared layers chip (cycle-15 left out; needs a canvas path through `ui/app`).
7. MCP tool names with repeated words (`create_pack_pack`, `import_pack_pack`, `export_handoff_export`): rename with `mcp.name` aliases (MCP test 2; snapshot diff, user decision).
8. Live data from a URL (Figma Make connectors); needs a PHI rule before it points at a Bonaparte API.
9. Touch pointer in Play on phone frames (round 28 pick 5); UI only, low on headless.
10. Export a frame to Figma as editable layers (Claude Design still lacks it); needs a Figma plugin.

Sources: [mcp.directory 2026 comparison](https://mcp.directory/blog/claude-design-vs-stitch-vs-v0-vs-lovable-vs-figma-make-2026), [konigi.com Claude Design](https://konigi.com/articles/claude-design-has-the-incumbents-scrambling/), [monkfrom.earth Claude Design vs Figma, Lovable, v0](https://monkfrom.earth/blogs/claude-design-vs-figma-lovable-v0), [refontelearning.com design-to-code tools](https://www.refontelearning.com/blog/ai-design-to-code-tools-figma-make-v0-lovable), [chatgate.ai doop](https://chatgate.ai/en/post/doop), [glama.ai doop](https://glama.ai/mcp/servers/kgoedecke/doop), [enterprisedna.co doop](https://enterprisedna.co/resources/ai-pulse/ai-pulse-2026-08-23-a-multiplayer-canvas-lets-agents-design-live-alongside-human).
