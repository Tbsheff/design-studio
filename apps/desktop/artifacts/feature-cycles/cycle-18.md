# Feature cycle 18: next 5 features

Date: 2026-11-13. Main at `714d7c6c0` (all 5 cycle-17 picks merged).

## Method

- Read `cycle-17.md` (runners-up, "Results" open items), the 5 `cycle-17/*.md` reports ("Left out"), the runners-up and results of `cycle-13.md` to `cycle-16.md`, the round 28 specs in `.claude/goal/feature-log.md`, and `git log --oneline -80`.
- Checked each candidate with narrow greps in `packages/common/actions/src`, `packages/common/contracts/src` and `apps/desktop/src/{ui,server}`. Checked each new action id and tool name against `packages/common/actions/src`, `apps/desktop/src` and `apps/desktop/artifacts/mcp-snapshots/*.json`: no clash. New tool names use the derived form `<verb>_<object>_<domain>` (N2a). Each action id uses an N3 verb (`align` and `distribute` are not N3 verbs, so pick 3 adds layouts to `canvas.moveFrames`).
- Checked Bonaparte on disk (read-only). Counted `.tsx` files that match, under `apps` and `packages`, with `node_modules`, `dist` and `.next` left out: `Skeleton` 745 files, `isLoading|isPending` 1539, `isError|ErrorState` 441, `EmptyState|<Empty` 251, `useQuery|useSuspenseQuery` 256. `apps/dashboard` now has `node_modules`, but `pnpm dev` still needs Prisma and a database (`package.json` script `dev`), so a live dashboard run stays out of reach for an agent.
- Branch check: `git branch --list 'feat/*'` has no `feat/state-board`, `feat/frame-focus`, `feat/align-frames`, `feat/start-points` or `feat/cycle-polish`.
- Competitor recheck (web search, 2026-11-13; cycle 17 checked the same day).
  - Figma Make: GPT-5.6 in Make, the November roundup (Weave, Make, Sites). Two-way GitHub was covered by cycle-17 route-merge.
  - Bolt: prompt queueing (type the next prompt while a build runs). Here `run.setQueue` exists. Nothing new to pick.
  - Claude Design, v0, Lovable, Open Design, doop: nothing new found since cycle 17.

## Skipped as built (checked this cycle)

Everything in the cycle-13 to 17 lists, plus the 5 cycle-17 picks (frame-select, route-merge, auto-layout-padding, reader-view, text-wrap). Also checked:
- Dark, hover and breakpoint edits: `inspector/variant-bar-model.ts` has the `dark` chip, Hover and the width select. Bonaparte `dark:` is covered.
- Per-frame states (As the app is, Signed in, Empty data, Loading, Error): `contracts/frame-state.ts`, `canvas.setFrameState` (`set_frame_state`), `canvas/state-list-panel.tsx`. One state per frame only; no board that shows all states side by side.
- Responsive matrix: `viewport.create` (`create_viewport`) places one frame per width and scheme. Pick 1 copies its group pattern.
- Focus files in chat: `chat/focus-chips.tsx`, `use-run-focus.ts`; `start_run` takes `focusPaths`. It adds the selected layer's file only, never canvas frames.
- Start points: `links.ts` still has one `start?: string`; `canvas.setStartLink` (tool `set_start_frame`). Not built.
- Align and distribute: 0 hits for `alignFrames`, `distribute` in `features/canvas` and `actions/canvas`. Layer align exists (`inspector/arrange-model.ts`), frame align does not.
- Route chip "Compare": `use-route-source.ts` `handleCompare` activates the copy frame only. Not wired to both frames.

## Ranking

Score = user value for real-app AI design x fit with "simple and fast" / effort (1 to 5 each). Rank by value first; the score breaks ties. The section numbers below keep the build order of the brief, not the rank.

| Rank | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|
| 1 | frame-focus: selected frames become chat focus | 5 | 5 | 2 | 12.5 |
| 2 | state-board: show Loading, Empty, Error and Signed in side by side | 5 | 4 | 3 | 6.7 |
| 3 | align-frames: align and spread a frame selection | 4 | 5 | 2 | 10 |
| 4 | start-points: several named Play starts | 4 | 4 | 3 | 5.3 |
| 5 | cycle-polish: the cycle-17 open items in one pick | 3 | 5 | 2 | 7.5 |

Frame focus ranks first: same top value as the state board, with the best score. Frame-select (cycle 17) made a selection store, and the chat cannot use it yet, so "make these 3 screens match" is not possible. State board is the Bonaparte pick: 1539 files read a loading flag, 745 use `Skeleton`, 441 handle errors, and today a designer sees one state per frame at a time. Align frames is the Figma manual-editing gap that frame-select opened. Start points is the oldest runner-up (round 28 pick 3, cycles 16 and 17). Cycle polish closes the open items from cycle-17 Results.

---

## 1. state-board: show Loading, Empty, Error and Signed in side by side

**Why.** Bonaparte screens carry a lot of state code: a loading flag (`isLoading|isPending`, which also matches `useTransition`) in 1539 files, `Skeleton` in 745, `isError|ErrorState` in 441, `EmptyState` in 251. Frame states exist, but one frame shows one state, and the user must switch states one at a time from the frame menu. No rival shows all states of a live app route at once. With the states side by side, the user (or the agent) sees which state is plain or broken and fixes it in place.

**UI behaviour.**
- Frame menu: a new item "Show all states". It places one frame per state of that page in a row below the frame, with a label group "<page> states". Each new frame is pinned to its state (Loading, Empty data, Error, Signed in; the states come from the defaults in `contracts/frame-state.ts` and the project's own custom states, max 8).
- A second "Show all states" on the same page reuses the frames of the earlier board (as `viewport.create` reuses its matrix frames) and adds only missing states.
- Each frame label shows its state name. The board is one layout undo step: Cmd+Z removes all its frames.
- Live edit and the change spotlight work on each frame, as on any frame. A chat run with one board frame in focus edits the shared page file, so all frames update.

**Actions.**
- New: `canvas.createStateFrames`, POST `/api/projects/:projectId/canvas/state-frames`. `access: "edit"`, `confirm: "none"`, `needs: "project.update"` (as `canvas.createFrame`), `scope: "project"`. Input: `projectId`, `frame` (frame id or `@label`), `states` (list of state ids, or null for every state; `Schema.withDecodingDefault` null). Output: `{ frames: [{ id, label, state }], reusedFrames: [id] }`. `invalidates`: `canvas.getDoc`, `canvas.inspect`, `canvas.listFrameStates`. MCP and agent: `create_state_frames_canvas` (agent set `app`, as `set_frame_state`). Errors: `NotFound` (no frame), `BadRequest` (unknown state id).
- Reused: `canvas.setFrameState` sets the state on each new frame inside the service (no second write path).

**Main files.**
- New: `packages/common/actions/src/canvas/create-state-frames.ts`, `actions/canvas/state-frames/schema.ts`.
- New: `src/server/handlers/canvas/create-state-frames.ts`. New `src/server/canvas/state-frames/{state-frames-ops.ts,engine/to-state-board.ts,index.ts}` (the engine places the row; copy `server/viewport/create-matrix.ts` for the group and reuse rule). One method in `canvas-writer.ts`, one export line in `server/canvas/index.ts`.
- Changed UI: `canvas/frame-menu-model.ts` (one item), new `canvas/use-state-board.ts`, one block in `canvas/copy.ts`.

**Verify in the running app** (`STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev`):
- The empty, loading and error states are answered by the dev-server proxy (`server/app/frame-state-plan.ts`), so only browser requests change. Write the fetch in a `"use client"` component (Bonaparte tRPC `useQuery` is client-side too). A server-component fetch never reaches the proxy, and all frames would look the same.
- A fake Next app in `/tmp` with one route whose client component fetches `/api/visits` and renders a list, a skeleton, an empty text and an error text. Make a route prototype of it. "Show all states": 5 frames show the list, the skeleton, the empty text, the error text and the signed-in view. Cmd+Z removes all 5 in one step.
- Run it again after adding a custom state: only the new frame is added.
- An HTML project page: the board still places the frames (states with no fetch look the same; that is expected).
- MCP `create_state_frames_canvas` with `states: ["loading","empty"]`: 2 frames. `pnpm exec tsx scripts/call-action.ts canvas.createStateFrames '<json>'` matches on 3 surfaces.
- Bonaparte: no live dashboard run (it needs a database). Note this in the report and use the fake app.
- Dark and light screenshots of a board.

---

## 2. frame-focus: selected frames become chat focus

**Why.** Frame-select (cycle 17) lets the user select several frames, but the chat sees only the selected layer's file (`run-focus-model.ts` `toSelectionFocusPath`). "Make these 3 screens use the same header" or "fix the empty state on these" needs the files of all selected frames. Claude Design and Figma Make take a multi-screen selection as context. `start_run` already takes `focusPaths`, so MCP and the agent are covered with no server change.

**UI behaviour.**
- When 2 or more frames are selected, the chat composer shows one "Focus on 3 frames" button next to the focus chips. A click adds the page file of each selected frame as a focus chip (dedupe; a board of pick 1 with one page gives one chip).
- A frame whose page has no file inside the project (a route frame with no copy record) is left out, and the button tip says how many were left out.
- The chips clear after the run starts, as today.

**Headless.** No new action. `start_run` with `focusPaths` is the MCP and agent form. The `focusPaths` description in `actions/run/start.ts` gets one sentence: "Pass the page file of each canvas frame to focus on several screens." (one description line, no schema change). Do not touch `agent/user-message.ts` (496 lines, L2a).

**Main files.**
- Changed: `src/ui/features/chat/{use-run-focus.ts,run-focus-model.ts,focus-chips.tsx}`, one block in `chat/copy.ts`.
- The chat feature must not import the canvas feature (U7). `ui/app/studio` reads the frame selection through `features/canvas/index.ts` (one export line for `useFrameSelection` and a `toFramePageFiles` helper) and passes the file list to the chat as a prop. Changed: one `ui/app/studio` file that mounts the composer (`studio-edit-pane.tsx` or the composer host; the agent names it).
- Changed: `packages/common/actions/src/run/start.ts` (description text only).

**Verify in the running app.**
- An HTML project with 4 pages. Select 3 frames: the button reads "Focus on 3 frames". Click: 3 chips. Send "make the headers match" with the mock agent: the run log shows the 3 `focusPaths`.
- A state board of one page selected: one chip.
- MCP `start_run` with 2 `focusPaths`: the run starts with both.
- Dark and light screenshots of the composer with chips.

---

## 3. align-frames: align and spread a frame selection

**Why.** In Figma, a frame selection gets align left, center, right, top, middle, bottom, and spread spacing. Frame-select made the selection; tidy (`canvas.moveFrames`) only makes rows and grids. This is the Figma manual-editing gap on the canvas.

**UI behaviour.**
- With 2 or more frames selected, a small floating bar above the selection bounds shows 6 align buttons and 2 spread buttons (horizontal, vertical), with `data-tip` text. Spread needs 3 frames.
- Shortcuts as Figma: Alt+A left, Alt+D right, Alt+W top, Alt+S bottom, Alt+H center, Alt+V middle. Ctrl+Alt+H and Ctrl+Alt+V spread. Before you bind them, grep `altKey` in `features/canvas` (`use-draw-tool.ts`, `use-frame-selection.ts`, `use-outline-view.ts`, `use-play.ts` read it) and the inspector; drop a key that is taken and name it in the report.
- Each click is one `canvas.moveFrames` call and one layout undo step. The palette gets the same 8 commands.

**Actions.**
- No new action. `canvas.moveFrames` (`move_frames_canvas`) gets 8 new literals in `TidyLayoutSchema` (`actions/canvas/tidy/schema.ts`): `left`, `center`, `right`, `top`, `middle`, `bottom`, `spread-x`, `spread-y`. For spread, `gap` is ignored and the space between frames is made equal inside the outer bounds. The layout description lists the new values. Approve the `move_frames_canvas` snapshot diff at merge.
- A new pure engine `server/canvas/frame-tidy/engine/to-aligned-frames.ts`. The tidy ops call it for the new layouts.

**Main files.**
- Changed: `packages/common/actions/src/canvas/tidy/schema.ts`, `src/server/canvas/frame-tidy/**` (new engine file, one switch in the tidy ops).
- New UI: `canvas/{frame-align-bar.tsx,frame-align-model.ts,use-frame-align.ts}`. Changed: `canvas/frame-selection-layer.tsx` (one mount line), `canvas/use-tidy-frames.ts` (pass the layout), `features/commands/canvas-commands.ts` (8 commands), one block in `canvas/copy.ts`.
- Not owned: `canvas/use-stage-keys.ts` stays with frame-select's code; put the Alt keys in `use-frame-align.ts` with its own key listener.

**Verify in the running app.**
- 4 frames at uneven places. Select 3, click align left: their left edges match, the 4th does not move. Cmd+Z undoes in one step.
- Select 4 frames in a rough row, spread horizontally: equal gaps, outer frames stay.
- Alt+H with 2 frames: centers line up.
- MCP `move_frames_canvas` with `layout: "top"` and 2 `@labels`. `call-action canvas.moveFrames` on 3 surfaces.
- Dark and light screenshots of the align bar.

---

## 4. start-points: several named Play starts

**Why.** Figma prototype flows have several named starting points and a flow list in Play. Here a project has one `start` frame. A Bonaparte flow prototype (sign in, schedule visit, chart review) needs one start per journey. Round 28 pick 3 has the full spec; this pick follows it with the derived tool name.

**UI behaviour.**
- Play bar: a "Start points" menu lists the names. A click restarts Play at that frame. R restarts the current start point.
- Prototype bar for the selected frame: "Add start point here" and a name field. A start point row has rename and remove.
- An old project with one `start` shows it as "Start".

**Actions.**
- Contracts: `packages/common/contracts/src/links.ts` gets `starts: { frame, name }[]` (max 12, names unique). Read an old `start` as one point named "Start". `startFrameOf` returns the first point, so old callers keep working.
- New: `canvas.setStartPoints`, PUT `/api/projects/:projectId/links/starts` (next to `links/start`). `access: "edit"`, `confirm: "none"`, `needs: "project.update"` and `scope` as `canvas.setStartLink`. Input: `projectId`, `starts` (the whole list; empty removes all). Output: `{ starts }`. `invalidates`: `canvas.listImplicitLinks`, `canvas.listLinks` (as `set-start-link.ts`), plus `canvas.listFlowLinks`. MCP and agent: `set_start_points_canvas` (agent set as `set_start_frame`). One layout history step for each change.
- `canvas.setStartLink` (`set_start_frame`) stays and sets the first point; its snapshot is unchanged (N4).

**Main files.**
- `packages/common/contracts/src/links.ts`; new `packages/common/actions/src/canvas/set-start-points.ts`, `actions/canvas/start/schema.ts`; new `src/server/handlers/canvas/set-start-points.ts`; `src/server/canvas/links/{link-ops.ts,link-writer.ts}` (split to a new `links/start-points.ts` if a file nears 500 lines).
- UI: `canvas/play-bar.tsx`, `canvas/prototype-bar.tsx`, `canvas/links-api.ts`, new `canvas/{play-start-menu.tsx,start-points-model.ts,use-start-points.ts}`, one block in `canvas/copy.ts`.

**Verify in the running app.**
- A prototype with 6 linked frames. Add "Sign in" and "Checkout": the Play menu lists both, each starts Play on its frame, R returns to it. Cmd+Z removes the last added point.
- An old project file with one `start`: shows "Start".
- MCP `set_start_points_canvas` with 2 points; `set_start_frame` still works. `call-action canvas.setStartPoints` on 3 surfaces.
- Dark and light screenshots of the Play menu.

---

## 5. cycle-polish: the cycle-17 open items in one pick

**Why.** Cycle-17 Results and the "Left out" lists name 6 small faults. Each is under an hour; one agent can close all of them with no new action.

**Fixes.**
1. Route chip "Compare" selects both frames (the route copy and the `page.importSource` "App now" frame) through the frame selection, and zooms to both. The import frame label reads "App now" (UI label from the route record; if the label must be stored at import, the agent names the server file in its report and skips it). Files: `canvas/{route-source-model.ts,use-route-source.ts,route-source-chip.tsx}`.
2. Frame removal undo label reads "Remove 3 frames" (or "Remove frame"), not "Change canvas frames". The `order` change on the other frames does not count as a second kind. File: `server/canvas/layout-history.ts` (the label code near line 262).
3. The removal toast closes on Cmd+Z. File: `canvas/frame-undo-bar.tsx`.
4. Copy and paste style carries Balance, Pretty and No wrap: add the `text-wrap` group in `server/style-scope/layer-style/engine/groups.ts`.
5. Auto layout on a hug-width parent (`width: auto` or `content-box`) sets no right or bottom padding from the old space, as Figma does for a hug frame. File: `server/style-scope/layer-style/layer-layout-padding.ts`.
6. `inspect_source_page` and `import_source_page` join the `tweak` set, so a chat run in a route prototype gets them (the same move as `4f6e246d6` for the route-merge tools). `server/agent/tool-sets.ts` `scopedTools` loads `tweak` for projects with no attached app and `app` only for app projects; a route prototype has no attached app. These tools act only on route copies, which live in prototype projects, so app runs do not need them. Check first that no app-run prompt or test names them. Files: `actions/page/{inspect-source,import-source}.ts` (`agent.set` only).

**Headless.** No new action. Fix 6 changes the agent set only; no MCP name or input changes.

**Verify in the running app.**
- Route chip on a changed route copy: "Compare" selects both frames and the import frame reads "App now".
- Delete 3 selected frames: the undo row reads "Remove 3 frames". Cmd+Z: the toast closes.
- Copy style from a `text-pretty` paragraph and paste on another: it gets `text-pretty`.
- Shift+A on a `width: auto` parent: no large right padding.
- A chat run in a route prototype lists `inspect_source_page` in its tools (run log).
- Dark and light screenshots of the chip menu and the undo row.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 state-board | `actions/canvas/create-state-frames.ts`, `actions/canvas/state-frames/schema.ts`, `handlers/canvas/create-state-frames.ts`, `server/canvas/state-frames/**`, `server/canvas/canvas-writer.ts`, `canvas/frame-menu-model.ts`, `canvas/use-state-board.ts` |
| 2 frame-focus | `chat/{use-run-focus.ts,run-focus-model.ts,focus-chips.tsx,copy.ts}`, one `ui/app/studio` composer host file, `actions/run/start.ts` (description only) |
| 3 align-frames | `actions/canvas/tidy/schema.ts`, `server/canvas/frame-tidy/**`, `canvas/frame-align-*`, `canvas/use-frame-align.ts`, `canvas/frame-selection-layer.tsx`, `canvas/use-tidy-frames.ts`, `features/commands/canvas-commands.ts` |
| 4 start-points | `contracts/src/links.ts`, `actions/canvas/set-start-points.ts`, `actions/canvas/start/schema.ts`, `handlers/canvas/set-start-points.ts`, `server/canvas/links/**`, `canvas/{play-bar.tsx,prototype-bar.tsx,links-api.ts,play-start-menu.tsx,start-points-model.ts,use-start-points.ts}` |
| 5 cycle-polish | `canvas/route-source-*`, `canvas/use-route-source.ts`, `canvas/frame-undo-bar.tsx`, `server/canvas/layout-history.ts`, `style-scope/layer-style/engine/groups.ts`, `style-scope/layer-style/layer-layout-padding.ts`, `actions/page/{inspect-source,import-source}.ts` |

Shared files:
- `src/ui/features/canvas/copy.ts`: picks 1, 3, 4 and 5 each add one block.
- `src/ui/features/canvas/index.ts`: pick 2 only (one export line). Pick 5 reads the frame selection inside the canvas feature, so it needs no export.
- `src/server/canvas/index.ts`: pick 1 (one export line). Pick 4 only if it adds a links export.
- `src/server/canvas/layout-history.ts`: pick 5 changes the label code. Picks 1 and 4 call the existing step API and do not edit it. If one must, it stops and names the file in its report.
- `@generated` files (`all-actions.generated.ts`, per-domain `routes.ts`, `handlers.ts`, `index.ts`): picks 1 and 4 add actions. Run `pnpm exec tsx scripts/gen-routes.ts` after each merge, one at a time. `main/live-layer.ts`: no change (`canvas` is wired).
- `packages/common/contracts`: pick 4 only (`links.ts`).
- `artifacts/mcp-snapshots/*.json`: new `create_state_frames_canvas`, `set_start_points_canvas`; changed `move_frames_canvas` (pick 3); plus the cycle-14 to 17 tools that still wait. Approve each diff at merge (user decision).
- `.claude/goal/roadmap.md` Appendix A: add the globs of each pick before its slice runs (L6e).

## Merge order

All 5 can run at once. Merge 3 (align-frames, smallest server change), then 2 (frame-focus, UI only), then 1 (state-board), then 4 (start-points, contracts change), then 5 (cycle-polish last, because it touches `layout-history.ts` and canvas files near the others). Run gen-routes after 1 and after 4.

## Runners-up

1. Layout versions: save one coalesced "Layout" version when a session ends with canvas-only changes; must change `resetForRestore` and not await the commit (P3).
2. Shared layers safe apply: send the expected markup and refuse a page that changed after the inspect (cycle-15 left out).
3. K and other tool keys with focus in the preview frame: one bridge key message in contracts (cycle-15 scale-tool left out).
4. Scale handles on the canvas: drag a corner with K held (Figma).
5. Fix states with AI: from a state board frame, "Design this state" starts a run on the empty, loading or error branch only (after pick 1 and 2).
6. Live data from a URL: fill a list from JSON at a URL, refreshed on demand (Figma Make connectors); needs a PHI rule before it points at a Bonaparte API.
7. Locked design system: pin one token source for all prototypes of an app and warn on raw values (Claude Design admin lock).
8. Bonaparte dev without a database: run a route prototype against fixture data so the dashboard renders (blocks every Bonaparte live test; high effort).
9. Touch pointer in Play on phone frames (round 28 pick 5); UI-only, low on "headless".
10. Export a frame to Figma as editable layers (Claude Design still lacks it); needs a Figma plugin.

Sources: [blog.mean.ceo Figma November 2026](https://blog.mean.ceo/figma-news-november-2026/), [createwith.com Figma Make GPT-5.6](https://www.createwith.com/tool/figma/updates/figma-integrates-gpt-56-into-make-improving-design-generation-and-token-efficien), [venturebeat.com Figma Make two-way GitHub](https://venturebeat.com/technology/are-designers-the-new-swes-figma-makes-new-two-way-github-integration-turns-designs-into-live-production-code-with-built-in-governance), [support.bolt.new release notes](https://support.bolt.new/release-notes), [bolt.new product blog](https://bolt.new/blog/category/product), [mcp.directory 2026 comparison](https://mcp.directory/blog/claude-design-vs-stitch-vs-v0-vs-lovable-vs-figma-make-2026).

## Results

- Merged in order: align-frames, frame-focus, state-board, start-points, cycle-polish, then fix/start-points-undo. Main at 9863224a4.
- Conflict: start-points vs state-board in `packages/common/actions/package.json` (export map lines). Kept both, then gen-routes.
- Start points shipped with a Cmd+Z bug (no undo step for name-only changes; undo of the first point lost a point). Fixed in `server/canvas/layout-history.ts` and checked in the app and over MCP.
- Checks: gen-routes --check pass, typecheck 0 errors, lint:gate pass (59653, baseline 89733), build:ui pass, desktop:pack pass.
- Installed app: :4570 returns 200. Server idle CPU 0.01 CPU-s/min over 60 s.
- Open: no Bonaparte run for state board (dashboard needs a database). No "App now" frame label. MCP snapshots for start_run, move_frames_canvas, create_state_frames_canvas and set_start_points_canvas not refreshed (user decision).
