# Feature cycle 28: next 5 features

Date: 2026-11-14. Main at `f8274310e` (all 5 cycle-27 picks merged at `b79bd94c7`).

## Method

- Read `cycle-27.md` (picks, runners-up, Results "Open"), the 5 `cycle-27/*.md` reports ("Left out"), `real-runs/report{,-2,-3}.md` (Bugs, Left), the runners-up and Results "Open" lines of cycles 22 to 26 (13 to 21 through their carried-over runners-up), `journeys-run/*.md` (MCP steps and friction), `idle-chrome-fix.md`, the tail of `.claude/goal/feature-log.md` and `git log --oneline -120`.
- Bonaparte path, new finding: **Move to app refuses a route that exists.** `agent/port-start.ts` line 423 (`startPageRun`) throws `The app already has the route ... Pick a new path.` when `plan.target.routeExists`, and `toTakenText` (line 185) does the same for a flow. The `port.start` description says "It checks that each route is new". So a route copy of `/patients` (made with `create_prototype_project`, or with the cycle-27 data fixture) can be redesigned but never put back on `/patients`. The only way back is a new route beside it. That is the core loop for design inside a real app, and every Bonaparte route copy hits it. Pick 1.
  - Related cycle-27 open item: `recordRouteSource` (`handlers/project/create-prototype.ts` line 323) records the fixture route (`/__studio-fixture/<id>`), not the source route, for a fixture copy (fixture-flow "Left out").
- Figma gap check (grep in `ui/features`, `bridge`, `shared/keymap.ts`):
  - Built, so dropped: W and H fields on a multi-selection (`MultiFieldset` passes `selection={null}` into `SimpleSections`, and `LayoutLead` then renders the `WIDTH` and `HEIGHT` `SpecNumberField`s; cycle-27 runner-up 5 is built), Alt-drag copy (`use-free-move.ts` line 107), paste image (`canvas/use-image-paste.ts`), layer hide and lock (`layer-eye-button.tsx`, `layer-lock-button.tsx`), zoom to selection (`pan-zoom-actions.ts` `applyZoomKey`), auto layout wrap, distribute, tidy up, the select-relative keys, flip (Shift+H, Shift+V).
  - Open: **Shift does not lock the drag axis.** `bridge/free-move.ts` reads `shiftKey` only in `down` (line 456, where Shift means add to the selection). `dragOf` (line 376) reads only `altKey`, `metaKey` and `ctrlKey`. `ui/features/canvas/frame-drag.ts` reads no `shiftKey`. In Figma, Shift during a move keeps the layer on one axis. This is pick 2.
  - Open from cycle 27: a layer anchored by `right` or `bottom` gets a `left` move on group resize. Bundled in pick 2 (same drag area).
  - Not picked: frame fit to content (Figma "Resize to fit"). `fix/idle-chrome` merged at `2f9db4605`, so it is not blocked by Chrome now. But a frame that grows to the page height also grows every `100vh` and `min-h-screen` section (the iframe height is the viewport), and most AI hero sections use them. It needs a design decision first. Runner-up 1.
- AI quality: the starter look (cycle 27) writes system font stacks only (`style-scope/theme/engine/fonts.ts` `SYSTEM_FONTS`; starter-look "Left out": "no Google Fonts, radius fixed at 10px"). Before the starter, the agent linked Google Fonts by itself (`agent/prompt.ts` line 13; report-3 run 3 prototype used Fraunces and Inter). Now the first draft reads `var(--font-display)`, which is Georgia or system-ui. So the starter cut hard-coded colors from 21 to 3, but it can make the type plainer. The pack already has a `googleFontsUrl` field and `design-system/html-link.ts` injects it. Pick 3, measured by 2 short real runs.
  - Bundled: the dark frame turns light after `theme.apply` (cycle-27 Results "Open", starter-look "Left out"). Same `style-scope/theme/` files.
- Fewer steps (MCP): an outside agent that makes a prototype runs `create_project` (it starts the run), then `get_run` again and again until the status leaves `running`, then `get_screenshot`. The `run.get` description says "Call it after start_run until the status is no longer running", and `start_port` says "read it with get_run". Each `get_run` returns the whole `events` list (`RunDetailSchema`), so every poll sends the same events again. Pick 4 adds a wait and an event cursor.
  - `get_run` and `start_run` are in no snapshot file (`run-agent.json` has 0 tools; `mcp-read.json` has only `get_run_context`). So pick 4 has no snapshot diff.
- Chrome ownership: `idle-chrome-fix.md` lists the playwright backend launch, the idle close and the orphan record. No pick changes `preview/browser.ts` or the Chrome launch. Pick 5 changes `preview/render-playwright.ts` (console capture) and `app/proxy.ts` (bridge inject), which that report does not list. The `idle-chrome-fix` agent is still active in this session, so pick 5 checks `git log main -- src/server/preview/render-playwright.ts src/server/app/proxy.ts` before it starts.
- Competitor recheck (2 web searches, 2026-11-14): no Claude Design, Figma Make, v0, Lovable or Bolt item newer than May 2026. doop launched on 2026-09-02 as an open-source, MCP-native canvas, with a memory that new frames inherit (runner-up 6). open design 0.10 turned on the composer, the comment queue and a full-height canvas by default (that supports frame fit, runner-up 1). Reviews still credit Claude Design with a design system read from code and the handoff to Claude Code. Pick 1 closes the handoff loop for an existing route.
- Branch check (`git branch -a`): no `feat/route-apply`, `feat/axis-lock`, `feat/starter-fonts`, `feat/run-wait` or `feat/polish-28`. Near names that exist and are not used: `feat/route-merge`, `feat/route-sync`, `feat/route-prototype`, `feat/starter-look`, `feat/starter-tokens`, `feat/polish-27`.
- Skipped as the user's decision: the panel rail, the Home cuts (frictions 8 and 11), the MCP snapshot refresh (cycle-26 and cycle-27 diffs for `batch_edit`, `create_theme`, `create_prototype_project`) and the repeated-word MCP names.
- `.claude/goal/roadmap.md` is still untracked, so worktrees do not get it. Each pick adds its globs to Appendix A only if the file is in its worktree, and says so in its report (L6e).
- No app was run for this research. The facts above come from code reads and the cycle reports. Each pick checks its own "today" behaviour in the running app before it changes code.

## Ranking

Score = user value x fit with "simple and fast" / effort (1 to 5 each). Rank by value first. The score breaks ties.

| Rank | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|
| 1 | route-apply: Move to app on a route copy updates the source route in place and keeps its data reads (Bonaparte path) | 5 | 5 | 3 | 8.3 |
| 2 | starter-fonts: the starter look picks a web font pair and a radius from the brief; dark mode stays after `theme.apply` (AI quality) | 4 | 5 | 2 | 10 |
| 3 | run-wait: `get_run` waits for the run to end and returns only new events (fewer MCP steps) | 4 | 5 | 2 | 10 |
| 4 | axis-lock: Shift locks a layer, group or frame move to one axis; right and bottom anchors on group resize (Figma) | 3 | 5 | 2 | 7.5 |
| 5 | polish-28: Next hydration warning, percent translate, gray box searched again, "Unfinished changes" on a new route copy | 3 | 5 | 2 | 7.5 |

No pick adds an always-visible control:
- Pick 1 changes what the existing Move to app dialog does for a route copy (the route field gets the source route).
- Pick 2 changes the starter files and the Look options.
- Pick 3 adds 2 input fields to an MCP tool.
- Pick 4 adds a modifier key to existing drags.
- Pick 5 fixes existing paths.

---

## 1. route-apply: Move to app updates the source route (Bonaparte path)

**Why.** The studio copies an app route into a prototype beside the app (`create_prototype_project` with `routePath`), and cycle 27 made this work for server-data routes with a data fixture. But Move to app only writes new routes (`port-start.ts` line 423). So a redesign of `/patients` can never go back to `/patients`. The user must copy the result by hand or keep a second route. Claude Design hands off to Claude Code. The studio has the route file, the copy time snapshot (`.studio/route-source/files/`, cycle 17) and the port run, so it can do the last step itself, as an opt-in app edit.

**UI behaviour.**
- Move to app on a page that is a route copy of the chosen app: the route field shows the source route (for example `/patients`) in place of an empty field. The plan row says "Updates app/patients/page.tsx" in place of "New route". The user can still type a new path, which works as today.
- Allow (the existing `confirm: "user"` card) shows the file that changes. No new control.
- The run edits the existing route file and the components it renders from the route folder. It keeps:
  - every data read (server component `await`, tRPC or fetch calls, `params` and `searchParams` use, loaders),
  - the exports Next needs (`default`, `generateMetadata`, `dynamic`, `revalidate`),
  - the imports that the kept code uses.
  It replaces the markup and the classes with the prototype design, mapped to the app tokens and kit as the port plan says.
- For a fixture copy (cycle 27), the fixture rows are sample data. The prompt says to bind the design to the route's own data, and to write no fixture row into the app.
- If the app route changed after the copy (`page.inspectSourceChanges` lists changed files), the run gets the diff and keeps the app change. The plan row says "The app route changed since the copy".
- One run version and one undo step, as for a new route. Undo puts the old route file back.
- A page that is not a route copy, or a route copy of another route: the route check stays (Conflict "Pick a new path").

**Agent loop.**
- New tag in the port prompt after `<port-plan>`: `<route-update>` with the route file, the copy-time snapshot of that file (from the route source record), and the rule lines above ("Keep every data read and export. Replace the markup and classes. Do not write sample data.").
- `port-start.ts` is at 491 lines and may not pass 500. Put the route-update check, the snapshot read and the tag in a new `agent/port-route-update.ts`. `port-plan.ts` (1298 lines) does not change: `routeExists` and `routeFile` are already in the plan.
- The studio port check (`inspect_port` score, render check) runs as today. Add one line to the run note: "Updated app/patients/page.tsx (kept 2 data reads)". The count comes from a scan of the old and new file for the kept read calls. Use the existing `run-notes.ts` note path.
- The mock port (`agent/mock-port.ts`) edits the existing route file in place and keeps its import line, so the mock path proves the update.

**Bundled.** `recordRouteSource` records the source route for a fixture copy. `toRouteLabel` already has `label.sourceRoute`, so record that, and record the fixture page as the data source. Then Move to app on a fixture copy shows `/patients`, not `/__studio-fixture/<id>`.

**Headless.**
- No new action. `port.start` (`start_port`) allows an existing route when the prototype page is a route copy of that route in that app. Its description changes "It checks that each route is new" to one sentence on the update rule. `start_port` is in no snapshot file.
- `get_port_plan` output does not change (it is in `mcp-read.json`). The UI reads the source route from the route source record that it already reads (`ui/platform/prototype-route.ts`).
- The agent surface stays `off: run-control`.

**Main files.**
- New `server/agent/port-route-update.ts`.
- `server/agent/port-start.ts` (call the update check in `startPageRun` and in the flow path, net 0 lines or less).
- `server/agent/mock-port.ts`, `server/agent/run-notes.ts` (one note line).
- `server/handlers/project/create-prototype.ts` (`recordRouteSource` source route).
- `packages/common/actions/src/port/start.ts` (description only).
- `ui/features/design-system/{port-model.ts,use-port-form.ts,port-plan-row.tsx}` (route default and plan row text), `ui/features/design-system/copy.ts` (2 keys: "Updates {file}", "The app route changed since the copy").
- Run `pnpm exec tsx scripts/gen-routes.ts --check` (description change only).

**Verify in the running app** (`STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev`).
- The `ds-wt` fake apps from cycle 27 may be gone. Make a fake Next 16 app under `/Volumes/DevProjects/code/ds-wt/` with `app/patients/page.tsx` as a server component that does `const rows = await getPatients()` from `lib/db.ts` (it throws "DATABASE_URL is not set" without the env var), plus `export const dynamic = "force-dynamic"`. Attach it with `create_dev_server`. Never Bonaparte.
- Mock agent:
  - Copy `/patients` (the fixture offer shows), "Make a data fixture", then run one mock edit in the copy. Move to app: the route field shows `/patients`, the plan row says "Updates app/patients/page.tsx". Allow. After the run, `page.tsx` still has the `getPatients` import and call and `dynamic`, and has no fixture row text. Undo once: the file matches its hash before the run.
  - A plain prototype (not a route copy) to `/patients`: Conflict as today.
  - Change `page.tsx` in the app after the copy, then Move to app: the plan row shows the changed note, and the prompt in the run log has the diff.
  - `pnpm exec tsx scripts/call-action.ts port.start '<json>'` with the route copy and `/patients`: the 3 surfaces match except the run id.
- Real model, 1 short run (local Claude Code sign-in), into the fake app only: Move to app of the fixture copy onto `/patients`. Report: the data reads kept (grep), fixture rows written into the app (expect 0), the `inspect_port` score, `render_check` errors with `DATABASE_URL` set to a fake value that `lib/db.ts` accepts, and run time and cost.
- Bonaparte (read only): `get_port_plan` for a route copy of an `apps/dashboard` route gives `routeExists: true` and the route file under `apps/dashboard/app/(main)/...`. Never call `start_port` on Bonaparte. `git status --short` in Bonaparte is the same before and after.
- Dark and light screenshots of the port dialog with the source route and of the run note.

---

## 2. starter-fonts: the starter look picks real fonts (AI quality)

**Why.** Claude Design first results look designed mostly because of type. The cycle-27 starter look gives a blank prototype role colors from the brief, but its fonts are system stacks and its radius is always 10px. Before the starter, the agent linked Google Fonts by itself. So the starter can make the type plainer while it makes the colors better. The pack manifest already has `fonts.googleFontsUrl`, and `design-system/html-link.ts` injects that link into the page.

**UI behaviour.**
- The theme engine gets a short list of curated web font pairs per mood (serif, sans, rounded, mono, for example Fraunces with Inter, Instrument Serif with Geist, Space Grotesk with Inter, DM Serif Display with DM Sans; about 12 pairs, all on Google Fonts with an OFL license). Each font value keeps a system stack as its fallback, so an offline page still renders.
- The brief picks the mood and the pair (`engine/brief.ts` already reads mood words). The radius also comes from the brief: sharp (4px) for words like "editorial", "finance", "law"; soft (12px to 16px) for "playful", "kids", "cafe"; else 8px. The engine stays pure (W8a): no fetch, no I/O.
- The starter writes `googleFontsUrl` into `design-system/pack.json`, so `html-link.ts` puts one `<link>` in the page head.
- The 3 Look options differ in font pair, not only in hue, so the Look row is a real choice. `theme.apply` writes the new pair and the new link.
- **Bundled bug:** after `theme.apply`, a frame in dark preview turns light. `tokens.css` keeps its dark blocks, so the cause is in what apply writes or which block wins. The agent finds it, fixes it in `style-scope/theme/`, and checks it on a `modern-minimal` project too.

**Agent loop.** No new tool. The prompt font rule (`agent/prompt.ts` `fontsRule`) already reads `designSystem.googleFontsUrl`. The agent checks that a starter run passes the URL to that rule. If not, it fixes the read in the run start hook that starter-look added, not in `prompt.ts`.

**Headless.** No new action. `create_theme` and `apply_theme` write the fonts and the link on every surface. The `create_theme` description is already in the pending cycle-27 snapshot diff; this pick does not change it again.

**Main files.**
- `server/style-scope/theme/engine/{fonts.ts,brief.ts,build.ts,types.ts}` (pairs, radius, a URL field on the draft).
- `server/style-scope/theme/theme-starter.ts` (338 lines; write `googleFontsUrl` and the radius).
- `server/style-scope/theme/{theme-writer.ts,theme-run.ts}` (the dark block fix and the link on apply).
- `server/design-system/html-link.ts` only if the link does not change on apply.
- `server/agent/mock.ts` (the mock page reads `--font-display` and `--radius`).
- No `copy.ts`.

**Verify in the running app.**
- Mock agent, blank HTML prototype "bakery landing page": `pack.json` has a `googleFontsUrl`, `index.html` has one fonts `<link>`, the computed `font-family` of the `h1` is the display font (not Georgia), and `--radius` is 12px or 16px. "Law firm homepage": a serif pair and 4px.
- Look row: the 3 options show 3 font pairs. Click option 2: one version, the heading font changes, Cmd+Z restores it.
- Dark preview on: click a Look option. The frame stays dark. The same on a `modern-minimal` project with `theme.apply`.
- Network off (block `fonts.googleapis.com` in the dev tools): the page renders with the fallback stack and no layout break.
- Mock first-draft time does not change (run log `firstDraftMs`).
- Real model, 2 short runs (local sign-in): "bakery landing page" on main and on this branch. Report: the display and body fonts in use (computed style), font families declared outside `tokens.css` (expect 0), hard-coded colors (grep `#` and `rgb(` outside `tokens.css`; 3 on main in cycle 27), `review_frame` type findings, first-draft time, and seconds and cost. Dark and light screenshots of both pages and of the Look row.

---

## 3. run-wait: get_run waits and returns only new events (fewer MCP steps)

**Why.** An outside agent (Claude Code, Codex, Cursor) that makes or changes a design with `create_project`, `start_run` or `start_port` must call `get_run` again and again until the run ends. Each call sends the full event list, so a 90 s real run costs many calls and many repeated tokens. One call that waits and one cursor for new events cut that to one or two calls.

**Behaviour.**
- `run.get` gets 2 input fields, both with `Schema.withDecodingDefault` (E3b):
  - `waitSeconds`: Int, 0 to 120, default 0. With more than 0, the call returns when the status is no longer `running` or when the time ends, whichever is first.
  - `afterEvent`: Int or null, default null. Null returns every event (as today). A number returns only the events after that index.
- Output adds `eventCount` (Int), so the caller can pass it as the next `afterEvent`.
- GET query strings decode through `Schema.toCodecStringTree(action.input)` (E3), so the Ints work on HTTP and MCP.
- The wait listens to the run events through the events bus in a read service (S7: no lock, write or emit). No `setInterval`, no sleep loop that reads the log file. Copy the cap pattern of `mcp-life/mcp-approval-store.ts` (`WAIT_MAX_SECONDS`). A closed MCP request ends the wait.
- The `run.get` description says: "Pass waitSeconds (up to 120) to wait until the run ends, and afterEvent with the last eventCount to get only new events." The `start_run` and `start_port` descriptions say "read it with get_run and waitSeconds" (E19: tool names only).

**Headless.** MCP and HTTP. The agent surface is `off: run-control` for `run.get`, so the in-app agent is not affected. Say so in the report. No snapshot file has `get_run`, `start_run` or `start_port`, so there is no snapshot diff.

**Main files.**
- `packages/common/actions/src/run/{get.ts,schema.ts}` (input fields, `eventCount`), `packages/common/actions/src/run/start.ts` and `port/start.ts` (one description sentence each; pick 1 also edits the `port/start.ts` description, see shared files).
- `server/handlers/run/get.ts`.
- `server/run-log/run-log-reads.ts` or a new `server/run-log/run-wait-store.ts` (the wait over the bus; `access: "read"`), exported from `run-log/index.ts`, provided in `handlers/run/live.ts`.
- Run `pnpm exec tsx scripts/gen-routes.ts`.

**Verify in the running app.**
- Mock agent, raw MCP JSON-RPC client: `create_project` with a `[slowlong]` prompt, then `get_run` with `waitSeconds: 60`. It returns once, with `status: "completed"`, within 1 s of the run end. Count: 1 `get_run` call, against the calls a 2 s poll makes on main for the same run (run both).
- `afterEvent` with the `eventCount` of a mid-run call: only the new events come back. Report the bytes of the last `get_run` on main and on the branch.
- `waitSeconds: 5` on a long run: returns after about 5 s with `running`.
- `waitSeconds: 500`: decode error (`BadRequest`) with the range in the message.
- A finished run with `waitSeconds: 60`: returns at once.
- `pnpm exec tsx scripts/call-action.ts run.get '<json>'` with both fields: the HTTP and MCP outputs match (the agent surface is off).
- Real model: not needed. Optional: if a real run happens for pick 1 or 2, read it once with `waitSeconds` over MCP and report the call count.

---

## 4. axis-lock: Shift locks a move to one axis (Figma)

**Why.** In Figma, Shift during a move keeps the layer on its row or column. In the studio, a small hand shake during a drag moves the layer off its line, and the user must fix `top` or `left` in the inspector. It is the same for a multi-selection and for canvas frames. Cycle 27 also left one group resize fault: a layer anchored by `right` or `bottom` gets a `left` move.

**UI behaviour.**
- Layer move (absolute and free move, `bridge/free-move.ts`): while Shift is held during a drag, the move keeps only the larger of `dx` and `dy` from the start point. A Shift press or release mid-drag switches at once. Shift at pointer down keeps its meaning (add to the selection), so the lock reads Shift only after the drag starts.
- Flow reorder: Shift keeps the insert line on the flow axis and changes nothing else.
- A multi-selection move (the `others` in the nudge and move path) gets the same lock.
- Canvas frame drag (`frame-drag.ts`) and section drag (`section-drag.ts`): the same lock. Snapping runs on the locked axis only.
- The live distance labels show only the locked axis.
- One write and one undo step, as today. Escape cancels.
- **Bundled:** group resize on a layer anchored by `right` (or `bottom`) moves `right` (or `bottom`) from the fixed edge, not `left` (or `top`). `group-resize-model.ts` is at 484 lines and may not pass 500, so the anchor logic goes in a new `group-resize-anchor-model.ts`.

**Headless.** No new action. The UI writes `left`/`top` (or the transform) through the existing edit path. The MCP and agent caller already write one axis with `edit_element`. No description change.

**Main files.**
- `bridge/free-move.ts` is at 523 lines and may not grow (L2a). Put the lock in a new `bridge/move-axis.ts` (`toLockedDrag(dx, dy, isShiftHeld)`), and call it from `dragOf` with a net 0 line change.
- `ui/features/canvas/{frame-drag.ts,section-drag.ts}` (the lock for frames), `ui/features/canvas/free-move-controller.ts` if the text move path computes its own delta.
- New `ui/features/canvas/group-resize-anchor-model.ts`; `ui/features/canvas/group-resize-model.ts` (net 0 or less).
- `shared/keymap.ts`: one entry in the shortcut list ("Shift while moving: lock to one axis") only if the list shows drag modifiers; the agent checks.
- No `copy.ts` key expected.

**Verify in the running app.**
- HTML project with the Tailwind 4 CDN and a CSS project. An absolute badge: drag right 200 px and down 15 px with Shift held: `left` changes, `top` does not. Press Shift mid-drag: the badge snaps back to its row. Release Shift: it follows the pointer again.
- Shift at pointer down still adds to the selection.
- A multi-selection of 3 badges: Shift drag moves all 3 on one axis. One Cmd+Z restores all 3.
- Two canvas frames: Shift drag one frame. It stays on its row, and snap lines show on that axis only.
- Group resize on 3 badges where one has `right-8`: drag the left handle. That badge keeps `right` and changes width; no `left` is written.
- Dark and light screenshots of a locked drag with its distance label.

---

## 5. polish-28: small open items

**Items.**
- **Next 16 hydration warning** (report-3 bug 4, cycle-26 port-verify). `render_check` and the port probe count 2 console errors on every Next route, caused by the studio bridge. The agent finds the cause first: `injectBridge` in `app/proxy.ts` (line 156) puts a `<script>` right after `<head>`, or the bridge sets attributes before React hydrates. Fix it at the cause if it can (for example, an inject place React does not hydrate, or the bridge waits for `appHydrated`). Else filter only a hydration warning whose diff names a studio node, in `preview/render-playwright.ts` and `agent/port-review-read.ts`. `app/proxy.ts` is at 481 lines and may not pass 500.
- **A percent or z translate is replaced, not added to** (cycle-27 polish "Left out"). The group rotate adds its shift to `translate: 50% 0` and to a 3-value translate. Files: `ui/features/canvas/rotate-drag-model.ts` (474 lines; a new model file if the change is more than about 20 lines), `packages/common/contracts/src/transform-style-properties.ts`.
- **A gray box that keeps `data-photo` after a miss is searched again** (polish-27 "Left out"). After a miss, the fill marks the slot (for example `data-photo-missed`), and a later `apply_image_search` call skips it unless the call names it. File: `server/share/image-search/photo-fill.ts` (446 lines).
- **"Unfinished changes in 1 file" on every new route copy** (fixture-flow "Left out"). `folder-context.md` is written but not in the first version, so the canvas shows unfinished changes, and an undo of the first run removes it. Write it before the first version, or into it. File: `server/project-ops/project-ops-prototype.ts` (`CONTEXT_FILE`, line 42).

**Headless.** No new action. The photo fill skip is an existing `note` line on `apply_image_search` (no snapshot). The other items are internal.

**Main files.** `server/app/proxy.ts` or the bridge boot file the agent names; `server/preview/render-playwright.ts`; `server/agent/port-review-read.ts`; `ui/features/canvas/rotate-drag-model.ts`; `packages/common/contracts/src/transform-style-properties.ts`; `server/share/image-search/photo-fill.ts`; `server/project-ops/project-ops-prototype.ts`. No `copy.ts`.

**Verify in the running app.**
- Fake Next 16 app under `ds-wt` (the one from pick 1 is fine): `render_check` on `/` gives 0 console errors (2 on main). The browser console of the canvas frame shows no hydration warning. The port probe on a ported route gives 0.
- CSS project, a box with `translate: 50% 0`: rotate it in a group. The result keeps the 50% plus the group shift.
- `STUDIO_IMAGE_SEARCH=on`, mock: a page with one slot that misses (a query with no result). A second `apply_image_search` returns at once with `filled: []` and makes no Openverse request.
- A new route copy: no "Unfinished changes" pill. Undo of the first run keeps `folder-context.md`.
- No real-model run needed.
- Dark and light screenshots of the clean `render_check` result and of the route copy with no pill.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 route-apply | new `server/agent/port-route-update.ts`; `server/agent/{port-start.ts,mock-port.ts,run-notes.ts}`; `server/handlers/project/create-prototype.ts`; `actions/src/port/start.ts` (description); `ui/features/design-system/{port-model.ts,use-port-form.ts,port-plan-row.tsx,copy.ts}` |
| 2 starter-fonts | `server/style-scope/theme/engine/{fonts.ts,brief.ts,build.ts,types.ts}`; `server/style-scope/theme/{theme-starter.ts,theme-writer.ts,theme-run.ts}`; `server/design-system/html-link.ts` (only if needed); `server/agent/mock.ts` |
| 3 run-wait | `actions/src/run/{get.ts,schema.ts,start.ts}`; one sentence in `actions/src/port/start.ts`; `server/handlers/run/{get.ts,live.ts}`; `server/run-log/{run-log-reads.ts,index.ts}` or new `run-wait-store.ts` |
| 4 axis-lock | new `bridge/move-axis.ts`; `bridge/free-move.ts` (net 0); `ui/features/canvas/{frame-drag.ts,section-drag.ts,free-move-controller.ts,group-resize-model.ts}`; new `ui/features/canvas/group-resize-anchor-model.ts`; maybe one line in `shared/keymap.ts` |
| 5 polish-28 | `server/app/proxy.ts`; `server/preview/render-playwright.ts`; `server/agent/port-review-read.ts`; `ui/features/canvas/rotate-drag-model.ts`; `packages/common/contracts/src/transform-style-properties.ts`; `server/share/image-search/photo-fill.ts`; `server/project-ops/project-ops-prototype.ts` |

Shared files and conflict warnings:
- **`packages/common/actions/src/port/start.ts`: picks 1 and 3 both change the same `description` string.** This is the one real overlap. Pick 1 merges first and rewrites the sentence on the route check. Pick 3 rebases and changes only "read it with get_run" to "read it with get_run and waitSeconds". Run `gen-routes --check` after each.
- `copy.ts`: only pick 1 adds keys, in `ui/features/design-system/copy.ts`. No other pick adds to a `copy.ts`. `ui/features/canvas/copy.ts`: none expected (pick 4 adds a key only if a drag note needs one; then it is the only one).
- `server/agent/*`: pick 1 owns `port-start.ts`, `mock-port.ts`, `run-notes.ts` and the new `port-route-update.ts`. Pick 2 owns `mock.ts`. Pick 5 owns `port-review-read.ts`. Different files. No pick changes `sdk-driver.ts`, `prompt.ts` or `port-plan.ts`.
- `server/agent/index.ts`: no pick needs a new export (the new pick-1 file is used only inside `agent/`). If one does, it adds one line in the export block; merge order puts pick 1 first.
- `ui/features/canvas/*`: pick 4 owns the drag and group resize files; pick 5 owns `rotate-drag-model.ts`. Different files. Pick 4 does not touch `use-rotate-drag.ts`.
- `bridge/*`: pick 4 only (`free-move.ts`, new `move-axis.ts`). If pick 5 fixes the hydration warning in the bridge boot, it names that file in its report; it is not `free-move.ts`.
- `server/style-scope/theme/*`: pick 2 only.
- Unions and generated lists: no pick adds an action. Pick 3 changes the `run.get` input and output: run `pnpm exec tsx scripts/gen-routes.ts`. Picks 1 and 3 change descriptions: run `gen-routes --check`. Never hand-edit a `// @generated` file. No pick adds to the same union or import line.
- `packages/common/contracts`: only pick 5, and only `transform-style-properties.ts` if the translate fix needs it there.
- `artifacts/mcp-snapshots/*.json`: no pick adds a diff (`get_run`, `start_run`, `start_port` are in no snapshot; `get_port_plan` output does not change).
- `.claude/goal/roadmap.md` Appendix A: add `server/agent/port-route-update.ts`, `bridge/move-axis.ts`, `ui/features/canvas/group-resize-anchor-model.ts` and the pick-3 run-log file when the file is in the worktree.

## Merge order

All 5 can run at once. Merge in this order:
1. **route-apply**: the Bonaparte pick; owns the `port/start.ts` description first.
2. **run-wait**: rebase over pick 1 for the `port/start.ts` description; run gen-routes.
3. **starter-fonts**: theme files only.
4. **polish-28**: proxy, render check, photo fill, rotate and route copy fixes.
5. **axis-lock**: bridge and canvas drags.

After the last merge, run `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run check:scripts`, `pnpm run lint:gate`, `pnpm run build:ui` and `pnpm exec tsx scripts/check-bundle.ts`. Then run one real-model session of 2 runs on merged main against a fake Next app under `ds-wt`:
1. A blank "clinic patients list" HTML prototype (starter fonts). Read the run over MCP with `get_run` and `waitSeconds`.
2. A route copy of `/patients` with a data fixture, redesigned, then Move to app onto `/patients`.

Report the fonts in use, the data reads kept, the `get_run` call count, the `render_check` console errors (expect 0), the port score, and the seconds and cost.

Real-model checks (local Claude Code sign-in, short runs; Move to app only into a fake Next app under `ds-wt`, never Bonaparte):
- pick 1: 1 run (Move to app of a fixture copy onto its source route);
- pick 2: 2 runs (before and after);
- the final merged session (2 runs).

Picks 3, 4 and 5 need none.

## Runners-up

1. Frame fit to content (Figma "Resize to fit"; open design now shows full-height frames): no longer blocked by Chrome, but `100vh` and `min-h-screen` sections grow with the frame, so it needs a decision on how to measure first.
2. Port fidelity: keep the prototype fonts and colors on Move to app when the app has no matching token (the cycle-27 real run dropped the font and `--ink`); after pick 1, which owns the port prompt.
3. One fixture per route: "Make a data fixture" writes a new fixture page in the app on each click; reuse the one for the same route (fixture-flow "Left out").
4. One undo step back to the empty route copy after a fixture copy (today 2, because the frame removal is its own history entry).
5. Prototype kit check: flag hand-styled buttons, inputs and cards in a prototype beside an app whose kit has a recipe, so Move to app maps them.
6. Canvas memory (doop): a design note or rule kept on the canvas that every new frame and run in the project gets, from the comment and decision history.
7. Opacity by number keys (Figma: 1 to 0 set 10% to 100% on the selection); keyboard only, no new UI.
8. Rotate zone and Rotation field write the picked breakpoint or state, not only the base style (rotate-handle "Left out").
9. Editable `data-[side=*]`, `data-[orientation=*]` and `group-data-[collapsible=icon]` states (Bonaparte 11 to 58 uses), after data-states lists them read-only.
10. The fixture route sentence shows in the chat bubble because it is part of the run prompt; needs a run context field on `RunRequest`.

Sources: [mcp.directory 2026 comparison](https://mcp.directory/blog/claude-design-vs-stitch-vs-v0-vs-lovable-vs-figma-make-2026), [konigi.com Claude Design](https://konigi.com/articles/claude-design-has-the-incumbents-scrambling/), [monkfrom.earth Claude Design vs Figma, Lovable, v0](https://monkfrom.earth/blogs/claude-design-vs-figma-lovable-v0), [claudefa.st Claude Design handoff](https://claudefa.st/blog/guide/mechanics/claude-design-handoff), [creativeainews doop launch](https://www.creativeainews.com/articles/doop-open-source-ai-design-canvas-mcp-2026/), [chatgate doop](https://chatgate.ai/en/post/doop), [opendesigner.io open design 0.10](https://opendesigner.io/blog/open-design-0-10-all-in-one-workspace), [superdesign Bolt alternative](https://www.superdesign.dev/blog/bolt-alternative). No Claude Design, Figma Make, v0, Lovable or Bolt result was newer than May 2026.

## Results

- Merged in order: route-apply, run-wait, starter-fonts, polish-28, axis-lock (main at 7059b67e8). One conflict: run-wait and route-apply both changed the start_port description; kept route-apply's text plus "and waitSeconds".
- Real runs: route-apply 2 runs onto a fake Next app kept data reads, 0 sample rows, scores 48 and 77. starter-fonts: Fraunces/Inter (was Helvetica Neue), 71.4 s vs 75.8 s, $0.231 vs $0.236.
- run-wait: 1 get_run call per run (was 24 with a 2 s poll); afterEvent returns only new events.
- polish-28: Next hydration console errors 2 -> 0; route copies no longer show "Unfinished changes".
- Checks: gen-routes --check pass, typecheck 0 errors, lint:gate pass (59615, baseline 89733), build:ui pass, check:clip 0 findings, desktop:pack pass.
- Installed app: :4570 returns 200. Server idle CPU 0.02 CPU-s/min over 60 s.
- Open: a closed MCP request does not end a get_run wait (120 s cap, fix in mcp/registry.ts); a Look pick does not update font names in pack.json; flows onto existing routes are not supported; quoted photo queries are searched every call.
