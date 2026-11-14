# Feature cycle 26: next 5 features

Date: 2026-11-13. Main at `54a921252` (all 5 cycle-25 picks merged at `4840c7267`, `fix/run-log-bugs` merged at `c16cd9b06`).

## Method

- Read `cycle-25.md` (picks, runners-up, Results "Open"), the 5 `cycle-25/*.md` reports ("Left out"), the runners-up and "Open" lines of cycles 13 to 24, `artifacts/real-runs/report.md` and `report-2.md` (Bugs, Fixes, Left), `bonaparte-benchmark.md`, `mcp-bonaparte-test-2/report.md`, `journeys-run/a-1-8-rerun.md` and `git log --oneline -120`.
- Rechecked each Bonaparte benchmark friction against the code and the git log:
  - Fixed before this cycle: 1 to 6 (benchmark branch), 7, 12 and 15 (`polish-22`, `993d4e8ef`, `d7a5cf926`), 14 (`1176129a7`), 9 (`app-tokens/detect.ts` `shadcnCss` resolves `components.json` against the workspace root; the Tokens panel shows "From <app>" through `app-tokens/source.ts`).
  - User decision (Home cuts): 8 ("no git" status) and 11 (three recent lists). Skipped.
  - Still open: 10 and 13.
    - 10: `nameFromPrompt` (`packages/common/contracts/src/folders.ts` line 13) keeps the first 6 words, so "A patient intake summary card with" is exactly the cut. The same name feeds the h1 (`project-ops/engine/to-prototype-page.ts` line 43) and the Move to app route slug.
    - 13: undo is unverified. The path is `use-edit-history.ts` lines 165 to 192: `before()` (in `ui/app/studio/use-studio-edit.ts` lines 79 to 85) settles the edit and posts `preview-reset` and `optimistic-drop`, then `api.editHistory` and `api.editHistoryStep` run one after the other. Nothing patches the frame. The frame changes only when Next Fast Refresh or Vite reacts to the file write.
- Move to app (port) recheck: `port.start` (`start_port`, `confirm: "user"`) exists now, so the J8 MCP gap is closed. `port-plan.ts` maps the app kit (`kitFor`, line 852) and tokens (`mapTokens`, line 716) and resolves `apps/dashboard` routes. `toCutSlug` cuts at a dash (`78b465d9c`). Still open:
  - The run's end check is a prompt line only. `port-start.ts` `toCheckLine` (lines 215 to 233) asks the agent to call `inspect_port`, and the server never runs it.
  - `appReviewGaps` (`final-check.ts` line 218) reviews `ctx.target` and `ctx.previewUrl`. On a port run that is likely the frame the user had open, not the new route. Not traced; the pick checks it first.
  - No real Move to app run exists in any artifact.
  - The "App now" label is still open: `share/page-import/import-page.ts` line 324 sets `label: written.title.slice(0, LABEL_MAX)`. It is a runner-up in every cycle since 16. Compare is built (`canvas/use-route-source.ts` `handleCompare`).
- Images: `server/agent/prompt.ts` line 13 says "Keep assets inline (SVG markup, CSS shapes). Do not reference images that do not exist." `search_images` and `place_image` serve the agent, but each call places one photo, and no prompt line names them. Image search is off by default (`STUDIO_IMAGE_SEARCH` or the project setting `imageSearch`), because the query goes to Openverse.
- Figma gaps checked and dropped as built: layer align and distribute (`inspector/arrange-model.ts`), select matching (`select-matching-section.tsx`, `bridge/select-match.ts`), group and ungroup (`structure-edits-model.ts`), absolute position in auto layout (`absolute-toggle.tsx`), aspect lock, z-index (`stacking/z-index-field.tsx`), hide layer (Shift+Cmd+H), corner radius, text case, Alt-drag duplicate (`bridge/free-move.ts` line 370). The open Figma gap is a group rotate around one shared center (cycle-25 runner-up 3, multi-rotate "Left out"). Bonaparte `packages/ui` uses Tailwind `^4.1.0`, and `*.tsx` has 117 `rotate-` uses, while the engine writes `rotate-[15deg]` (`engine/tailwind/rotate-scale.ts` `ROTATE_STEPS`, v3 steps only).
- Bonaparte (read-only `git ls-files` and `git grep`): `apps/dashboard/app` has about 259 `page.*` route files. `apps/dashboard/components.json` points at `../../packages/ui/src/styles/globals.css`.
- Competitor recheck (1 web search, 2026-11-13): no item dated November 2026 for Claude Design, Figma Make, v0, Lovable, Bolt, open design or doop. Reviews still credit Claude Design with reading production code and an export to Claude Code. That is the Move to app path, which pick 1 makes reliable. They also credit its real images and polish, which pick 3 aims at.
- Branch check (`git branch -a`, remotes included): no `feat/port-verify`, `feat/undo-patch`, `feat/photo-fill`, `feat/group-rotate` or `feat/polish-26`. Near names that exist and are not used: `feat/port-check`, `feat/r15-port-to-app`, `feat/r16-port-flow`, `feat/layer-undo`, `feat/r11-images`, `feat/rotate-flip`, `feat/rotate-handle`, `feat/multi-rotate`, `feat/polish-22`, `feat/polish-24`.
- Skipped as the user's decision: the panel rail until edit mode, the Home cuts (frictions 8 and 11), the MCP snapshot approvals from cycles 14 to 25, the MCP names with repeated words.
- The `idle-chrome-fix` agent (`fix/idle-chrome`) still owns the headless Chrome launch and `get_screenshot`. No pick changes a page launch. Pick 1 captures through the path that `inspect_port` and `review/run.ts` use today (`preview.withPage`).
- `.claude/goal/roadmap.md` was not in the cycle 23 to 25 worktrees. Add each pick's globs to Appendix A when it is there (L6e), and say so in the report when it is not.

## Ranking

Score = user value x fit with "simple and fast" / effort (1 to 5 each). Rank by value first. The score breaks ties.

| Rank | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|
| 1 | port-verify: the studio checks a Move to app route and runs one fix loop, plus clause-cut names and the "App now" label (Bonaparte) | 5 | 5 | 3 | 8.3 |
| 2 | undo-patch: Cmd+Z shows the old value in the frame at once on an attached app, measured first (Bonaparte friction 13) | 4 | 5 | 2 | 10 |
| 3 | photo-fill: real photos in prototypes in one studio call when image search is on (AI quality) | 4 | 4 | 3 | 5.3 |
| 4 | group-rotate: rotate a multi-selection around one center, and `rotate-15` on Tailwind 4 (Figma) | 3 | 5 | 2 | 7.5 |
| 5 | polish-26: Esc clears a forced state, one write per Enter, opacity in percent, no lost screen image | 3 | 5 | 2 | 7.5 |

No pick adds an always-visible control:
- Pick 1 shows only through the chat run note and the existing frame label.
- Pick 2 changes when the frame updates.
- Pick 3 adds one Cmd+K command and changes the agent prompt.
- Pick 4 reuses the multi-selection rotate zone.
- Pick 5 fixes existing fields.

---

## 1. port-verify: the studio checks a Move to app route (Bonaparte)

**Why.** Move to app is the step where a prototype beside Bonaparte becomes real app code, and it has the most risk of error. Today the plan maps the kit and the tokens well, but the only check after the run is a prompt line that asks the agent to call `inspect_port`. If the agent skips it, a route that fails to render or scores 50 against the prototype still reports done. Cycle 25 showed the pattern that fixes this: the studio runs the check itself and sends one fix loop only when it finds something.

Bundled: benchmark friction 10 and the "App now" label. Both are about route names on the same path.
- Friction 10: names cut at 6 words. The cut name becomes the prototype h1 and the route slug.
- "App now" label: open since cycle 16.

**UI behaviour.**
- No new control. After a Move to app run, the chat run note adds one line: "Studio port check: score 86, route renders" or "Studio port check: score 62 (header, cards under 80), a fix loop ran". The line uses the `run-notes.ts` note path, so it survives with the other check lines.
- The fix loop starts only in these cases:
  - The route fails to render: an HTTP status of 400 or more, a Next error overlay, or a console error from a file the run wrote.
  - The `inspect_port` score or an area is under 80, and the agent did not call `inspect_port` after its last edit.
  - A clean run gets no extra model turn.
- At most one fix loop, then one more `inspect_port` that only reports.
- Not on: runs whose task is not `port`, failed or stopped runs, and lean runs.
- Names: `nameFromPrompt` cuts at a clause. It stops before a trailing "with", "for", "and", "of", "to", "that" or "which", or at the first comma, inside the same 47-character cap. "A patient intake summary card with allergies" becomes "A patient intake summary card". The h1 follows, because it reads the name. The port slug comes from the page `<title>` (`contracts/src/port.ts` line 210, cut before " · " or " | "), and the title is the prototype name, so the slug follows too. The agent confirms that the title is the name.
- "App now": `page.importSource` (the route copy that Compare uses) stores the frame label "App now · <route>" at import. That is one canvas write and one undo step, and no rename runs afterwards.

**Agent loop.**
- First, the agent finds what `appReviewGaps` reviews on a port run. If `ctx.target` and `ctx.previewUrl` are the old frame, the studio app check reviews the wrong page. The port check then names the new route url (from `plan.target.routeFile` and the route path) as its own target, and the app check skips port runs, so one run never gets two reviews of different pages. Report what was found.
- New `server/agent/port-review.ts`:
  - `toPortReviewGaps(ctx, run, toolOrder)` returns null unless the request task is `port`, the run edited after its last `inspect_port`, and the target project has a dev server url.
  - `runPortReview` calls the `inspect_port` handler path (the same service that `port.inspect` uses, not the MCP tool) and a render probe of the route url through `preview.withPage`, then builds the continuation prompt and the note.
- `sdk-driver.ts` (1628 lines) and `final-check.ts` (567) may not grow (L2a). One call site in `appReviewPass` picks the port gaps. Offset line for line, as cycle 25 did for `prototype-review.ts`.
- `port-start.ts` keeps `toCheckLine`, because an agent that calls `inspect_port` itself saves the studio pass.
- No `tsc` on the app. Bonaparte is a large monorepo, and a typecheck per run is too slow. The render probe and the console catch import and type errors that break the page.
- Report the cost: seconds and tokens added for a clean run and for a run with a fix loop.

**Headless.**
- No new action.
- The MCP `start_port` caller gets the same studio check, because it runs inside the agent run that `start_port` starts. `get_run` `summary.finalCheck` gains `port`, next to `appReview`. `FinalCheck` is an interface in `contracts.ts` (line 590; the file is over 2000 lines). Add one `port?: PortReviewRecord` line and take one line off elsewhere in the same file, and define `PortReviewRecord` (`score: number | null`, `rendered: boolean`, `fixLoop: boolean`) in `run-notes.ts` or a contracts leaf file.
- `page.importSource` keeps its input and output. Only the stored label changes.
- No snapshot diff: `get_run` is in none of the `artifacts/mcp-snapshots/*.json` files (grep checked).

**Main files.**
- New `server/agent/port-review.ts`.
- `server/agent/sdk-driver.ts` (the `appReviewPass` call site; this pick only) and `server/agent/final-check.ts` (the port skip in `appReviewGaps`; no growth).
- `server/agent/run-notes.ts` (one note kind).
- `packages/common/contracts/src/contracts.ts` (the `FinalCheck` interface, net 0 lines).
- `packages/common/contracts/src/folders.ts` (`nameFromPrompt`).
- `server/share/page-import/import-page.ts` (a label input to `importPageCopy`) and `server/handlers/page/import-source.ts` (passes it).
- No `copy.ts`: the note text is a server template, and "App now" is a const in `import-page.ts`.

**Verify in the running app** (`STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev`).
- Mock agent, fake Next app (a folder with a Next `package.json` and `app/` router, attached with `create_dev_server`) and an HTML prototype beside it:
  - Run Move to app. The mock run writes a route that throws on render. The run log shows the studio port check and a fix-loop prompt that names the render error, and the chat note has the "Studio port check:" line.
  - A mock route that renders and that the mock agent already checked with `inspect_port`: no extra turn (run log `continuations` unchanged).
- A non-port edit run on the same app: no port check, and the app check works as before (same note text).
- Home prompt "A patient intake summary card with allergies and meds": project name and h1 "A patient intake summary card". Get the port plan for it: the route slug has no trailing "with".
- Copy a route of the fake app (`page.importSource`): the frame label reads "App now · /<route>". One Cmd+Z removes the frame.
- Real model, 1 short run (local Claude Code sign-in): Move to app of a 1-screen HTML prototype into the fake Next app with `start_port`. Report the score, whether the studio check fired, the seconds and tokens it added, and the route screenshot next to the prototype.
- Bonaparte (read only): `get_port_plan` for a prototype beside `apps/dashboard`. The route file goes under `apps/dashboard/app/...`, and the plan lists Bonaparte kit components and tokens. Never call `start_port` on Bonaparte. Bonaparte `git status --short` shows the same 14 entries before and after (the owner's work).
- Dark and light screenshots of the chat note and of the "App now" frame label.

---

## 2. undo-patch: Cmd+Z shows the old value at once (Bonaparte friction 13)

**Why.** In an attached app, every manual edit already shows at once through the optimistic preview patch. Undo does not. It drops the patch, makes two HTTP calls in sequence, and then waits for Next Fast Refresh. On a large Next app such as Bonaparte, that wait can be seconds. The benchmark saw 1.5 to 3.5 s but marked it unverified (the hidden pane delays screenshots). Undo is the most common key in manual design, so a slow undo makes every try-and-revert edit slow.

**Step 1: measure. This step decides the pick.**
- Use DOM timestamps, not screenshots. A `MutationObserver` in a test page script, or `performance.now()` in the bridge, gives the time from the Cmd+Z keydown to the moment the frame shows the old text. Measure a text edit and a class edit (padding), 5 times each, on:
  - an HTML project;
  - the fake Next app (a real `next dev`).
- Also measure the studio's own part alone: keydown to the end of the file write (settle, plus the 2 serial calls). A small fresh `next dev` app refreshes in about 100 to 200 ms, and Bonaparte is far larger, so a small app hides the Fast Refresh cost. Take the Bonaparte refresh time as unknown and larger.
- Drop rule: build step 2 when the studio part is over 150 ms, or the full time on the Next app is over 300 ms. Otherwise write the numbers in the report.
- Fallback under the same key, if the gate drops step 2: build runner-up 1, the route data offer. When a route copy of a server-data route renders empty or fails, the copy result offers "Make a data fixture". It runs `fixture.create` only after the user confirms it, because that writes a page in the app. The MCP and agent path is the existing `fixture.create` tool, and the route copy output names the offer.

**UI behaviour (step 2).**
- No new control. Cmd+Z and Shift+Cmd+Z show the old (or new) value in the frame within one frame of the keydown, for direct edits whose step is one of these:
  - a text change;
  - a class change;
  - a style change on one or more layers.
- Other steps (structure, insert, delete, agent runs) keep today's path.
- The patch stays until the source change for the step lands, then drops, as edit patches do today. If the step fails (409, file changed), the patch drops and the error line shows as today.
- The toast and the history state do not change.

**How.**
- The history state that `api.editHistory` returns, or the client edit log, must give the reverse change of the top step. The agent finds which one has it. If neither has it, add `reverse: { selector, text | classes | style } | null` to the top step in the history state output (one schema field), so no second request is needed.
- In `before()`, post the reverse patch with the existing optimistic patch message in place of `optimistic-drop`. `onStepped` drops it when the source change arrives.
- Skip the extra `api.editHistory` GET when the client state is fresh (the last `apply` was after the last commit). The step call already returns the new state.

**Headless.** No new action. MCP `undo` and `redo` write the file as today. The in-place patch is a UI frame effect. If a `reverse` field is added to the history output, it is an output diff on the history tool (user decision at merge).

**Main files.**
- `ui/features/inspector/use-edit-history.ts` (399 lines).
- `ui/app/studio/use-studio-edit.ts` (`before`, `onStepped`).
- The bridge optimistic patch handler, if it needs a "patch from history" kind (`bridge/` file that handles `optimistic-drop`; the agent names it).
- `server/direct-edit/commit/history.ts` and its action schema, only if `reverse` is needed.
- No `copy.ts`.

**Verify in the running app.**
- The step 1 numbers, before and after, on HTML and on the fake Next app.
- Fake Next app:
  - Edit a heading's text, then Cmd+Z: the frame shows the old text at once, and after Fast Refresh it still shows it, with no flash of the edited text. Shift+Cmd+Z the same.
  - Change padding, then Cmd+Z: the old padding shows at once.
  - Edit the file by hand between the edit and the undo: the undo fails as today and the patch drops.
- HTML project: the same text and class checks.
- MCP `undo` after a UI edit: the file and the frame match.
- Bonaparte cannot render routes without its database, so it is not run. Name that in the report.
- Dark and light screenshots before and after an undo (DOM timing is the real proof).

---

## 3. photo-fill: real photos in prototypes in one call (AI quality)

**Why.** Claude Design first results use real images, and ours use gray boxes or inline SVG: `prompt.ts` line 13 tells the agent never to reference an image that does not exist. The image search tools exist (Openverse, Creative Commons, credits in `ASSETS.md`), but they place one photo per call, and the prompt never names them, so the agent does not use them. One studio call that fills every photo slot on a page gives real photos at the cost of one tool turn.

**What a default user sees.** Almost nothing changes while image search is off, which is the default, because the query goes to Openverse. The pick does not turn search on. When it is off, a PROTOTYPE run that writes gray-box photo placeholders ends its run note with one line that names the switch (below). The line shows once per project.

**UI behaviour (search on).**
- On PROTOTYPE and POLISH runs, the agent writes each photo slot as `<img data-photo="<2 to 6 search words>" alt="..." width height>`, or `data-photo` on an element with a background. Then it calls `apply_image_search` once, right after the first draft.
- The studio fills every slot in one version and one undo step:
  - a search by the words, with the orientation taken from the slot's aspect;
  - the first result that is not already used on the page;
  - a download into the assets folder, with credits in `ASSETS.md`.
  - It removes `data-photo` from each slot it fills.
- A slot with no result keeps its placeholder, and the output lists it.
- Cmd+K "Fill photo slots" runs the same action on the active page.
- WIREFRAME keeps its "no images" rule. Lean runs and ask mode do not change.
- The prompt asks for `data-photo` slots only when search is on. When it is off, the prompt keeps the gray-box placeholder (a `div` with a short label). So no `<img>` without a `src` is written, and the cycle-25 broken-image check (it flags `complete && naturalWidth === 0`, which an `<img>` with no `src` matches) does not start a fix loop. The run-note line in that case reads "Photo slots are gray boxes. Turn on image search in the image sheet (Turn on image search for this project) or with STUDIO_IMAGE_SEARCH=on for real photos." It uses the setting name from `ui/features/image-search/copy.ts` `offSwitch`.
- Cost: `apply_image_search` is not in the hot tool set (`screenshot`, `render_check`, `design_review`, `edit_element`, `define_tweaks`, `studio_help`), so its first call adds a `ToolSearch` turn. Report it. Do not add it to the hot set in this pick, because that set is in `sdk-driver.ts` (pick 1).

**Agent loop.**
- `prompt.ts` line 13 becomes: "Keep icons and shapes inline (SVG, CSS). For photos, write `data-photo` slots and call `apply_image_search` when image search is on; never reference a file that does not exist." Net 0 lines (`prompt.ts` is 482).
- `run-level.ts`: the PROTOTYPE and POLISH steps add "after the first draft, call `apply_image_search` if image search is on". The run context already knows the gate state, or the agent adds `isImageSearchOn` to `RunLevelContext`.
- `agent/tool-help.ts` names `apply_image_search`.
- The broken-image check from cycle 25 catches a fill that fails to load.

**Headless.**
- New action `image-search.apply`, stamped with `pnpm run new:action image-search apply` (N1, N3 `apply`). Derived names: const `applyImageSearch`, MCP and agent tool `apply_image_search`, route `POST /api/projects/:projectId/image-search/apply`.
- Fields: `access: "edit"`, `confirm: "none"`, `scope: "project"`, `needs: "project.update"` (copied from `image-search.insert`), `agent: { lean: false, name: "apply_image_search", set: "core", short }`, and `invalidates` naming the page and asset read ids that `image-search.insert` lists.
- Input: `projectId`, `directionId` (`null` for main), `path` (the page).
- Output: `{ filled: readonly { selector, query, photoId }[], missed: readonly { selector, query }[] }`.
- Errors: `BadRequest` (search off, with the setting name in the message), `NotFound`, `Conflict`.
- Run `pnpm exec tsx scripts/gen-routes.ts` and never hand-edit `all-actions.generated.ts` or the image-search `index.ts`. New tool, so a new snapshot entry (user decision at merge).

**Main files.**
- New `packages/common/actions/src/image-search/apply.ts` and `schema.ts` fields.
- New `server/handlers/image-search/apply.ts`.
- `server/share/image-search/` (a page-fill service, or a function next to the insert code; it reuses the insert path per slot and writes once).
- `server/agent/{prompt.ts,run-level.ts,tool-help.ts}`.
- The Cmd+K command in `ui/features/commands/` (one label in its copy).
- The run-note line in `server/agent/run-notes.ts`.

**Verify in the running app.**
- `STUDIO_IMAGE_SEARCH=on`, mock agent:
  - An HTML page with 3 `data-photo` slots (wide hero, 2 square cards): `apply_image_search` fills 3 distinct photos, `ASSETS.md` gets 3 credits, and one Cmd+Z restores all 3 placeholders.
  - A slot with nonsense words is listed in `missed` and keeps its placeholder.
- Search off: the action fails with `BadRequest` naming the setting, and the run note line shows once.
- `pnpm exec tsx scripts/call-action.ts image-search.apply '<json>'`: the HTTP, MCP and agent outputs match.
- Real model, 2 short runs with search on (local sign-in): a blank "bakery landing page" before and after this branch. Report:
  - the photo count;
  - broken-image findings (expect 0);
  - first-draft time (must stay near 3.5 s, because the fill comes after the draft);
  - run total time and the tokens added.
- Dark and light screenshots of the filled page and of the run note.

---

## 4. group-rotate: rotate a multi-selection around one center (Figma)

**Why.** In Figma, rotating a selection turns it as one object around the selection center. Cycle 25 turns each layer around its own center, so a row of badges or a scattered icon set loses its arrangement. Bundled: the Tailwind 4 rotate steps. Bonaparte uses Tailwind `^4.1`, where `rotate-15` is valid, but the engine writes `rotate-[15deg]` for any angle outside the v3 steps. Both changes touch `rotate-scale.ts`.

**UI behaviour.**
- The multi-selection rotate zone drag turns the selection around the center of its box.
  - Each absolutely positioned layer gets the same rotation, and its `left` and `top` move to its rotated center.
  - On Tailwind projects the position is written in the form the layer already uses. A layer with `left-[13px]` stays in arbitrary values, and a layer on the spacing scale snaps to the nearest step. The report names any off-token value this adds.
- Flow layers (not absolute) cannot move without a translate, and a translate on Tailwind is an arbitrary value that the `off-token` review flags. So a selection with any flow layer keeps today's per-layer center, and the angle label shows "Each" next to the degrees.
- HTML (CSS) projects move flow layers too, with the `translate` property, because the CSS writer has no token rule.
- Shift snaps to 15 degrees and Escape cancels. One write and one undo step on release.
- The Rotation field in the multi editor keeps per-layer rotation (Figma's field does the same).
- Tailwind 4: an angle that is a whole number writes `rotate-<n>` (`rotate-15`, `-rotate-30`). Tailwind 3 keeps the v3 steps and `rotate-[15deg]`. The engine is pure (W8a), so the Tailwind major version comes in as an input from the service that already reads the project's Tailwind setup. The agent finds that service and names it.

**Headless.** No new action. The UI sends one `batch_edit` with `rotate`, `left` and `top` per layer. Agents and MCP callers rotate a group the same way. The `batch_edit` description adds one sentence: "To rotate several layers as one, give each the same rotate and move each absolute layer around the shared center." That is a description diff (user decision at merge).

**Main files.**
- `ui/features/canvas/{rotate-drag-model.ts,use-rotate-drag.ts,group-rotate-frame.tsx}`.
- `ui/features/inspector/use-multi-rotation.ts` (only if the drag shares its write).
- `server/direct-edit/engine/tailwind/rotate-scale.ts` and its caller in `engine/tailwind/map.ts` (the version input).
- The `batch_edit` description: it is a hand-written legacy MCP tool in `server/mcp/edit-tools.ts` (line 70), with no action file. Change the text there and in `server/mcp/legacy/direct-edit-schema.ts` if the text is kept there too.
- Copy: if the "Each" label needs a key, one key in `ui/features/canvas/copy.ts` (362 lines). No block in `inspector/copy.ts` (437).

**Verify in the running app.**
- Tailwind 4 fake app, 3 absolute badges in a row:
  - Select all 3 and drag the zone with Shift to 30 degrees: the row turns as one, and each badge gets `rotate-30` and a new left and top. One Cmd+Z restores all 3. Escape mid-drag writes nothing.
  - 2 flow icons and 1 absolute badge: each turns around its own center, and the label says "Each".
  - Type 15 in the single Rotation field: `rotate-15`.
- Tailwind 3 fake app: 15 writes `rotate-[15deg]`, and 45 writes `rotate-45`.
- HTML project: 3 flow boxes turn around the shared center with `rotate` and `translate`.
- `pnpm exec tsx scripts/call-action.ts` on the batch edit action with 3 rotate and position edits: the 3 surfaces match.
- Bonaparte (read only): `git grep` count of `rotate-<n>` forms the new writer can now read as a step.
- Dark and light screenshots of the group drag.

---

## 5. polish-26: small open items from cycles 25 and real runs

**Why.** Four small faults in manual editing and in the studio check, each too small for a pick, all open on `main`.

**Items.**
- **Esc leaves a forced state** (data-states "Left out"). Esc deselects the layer but leaves `data-studio-force` and the forced attribute on the frame (also for Hover). The fault is in the deselect path. Fix: the deselect path clears the forced state through the same message the Default chip sends. Files: the canvas deselect handler and `bridge/force-state.ts`.
- **Enter writes twice in an effect number field** (cycle-24 and cycle-25 open, "The layer already has these effects"). Fix: Enter commits once and blur after Enter does not commit again. Files: `ui/features/effect/effect-field.tsx` (or the shared number field it uses).
- **Opacity takes 0 to 1, so 60 becomes 1**, and **Fill color does not write on Enter** (data-states "Left out"). Fix: the Opacity field reads and takes percent (60 means 0.6, and the field shows 60%), and Enter in the Fill color field commits. Files: the opacity and fill field models in `ui/features/inspector/` and `ui/features/fill/`.
- **The screen check drops every image of a screen when one size fails** (report-2 "Not fixed"). `server/agent/screen-review.ts` line 94 has `.catch(() => [])` around `runScreens`. Fix: catch per size, keep the sizes that worked, and name the failed size in the note. This keeps the S12 rule: the same fallback value, at a finer grain.

**Headless.** No new action and no MCP change. The Enter, opacity and Esc items are UI. The screen check is the in-app agent end-of-run path.

**Main files.** `bridge/force-state.ts`; the canvas deselect handler (the agent names it); `ui/features/effect/effect-field.tsx`; the inspector opacity field model; `ui/features/fill/` color field; `server/agent/screen-review.ts`. No `copy.ts` change. If the failed-size note needs text, it is a server template.

**Verify in the running app.**
- Force Hover on a button, then Esc: the frame shows the default style and the button has no `data-studio-force`. The same for Closed on a data-state layer.
- Effect: add a shadow and type 8 in Blur, Enter: one write, one version, no "already has these effects" error.
- Opacity: type 60, Enter: `opacity-60` (Tailwind) or `opacity: 0.6`, and the field shows 60%.
- Fill: type a hex and press Enter: written. One undo step for each.
- Screen check: a mock run with 2 screens where the desktop shot of screen 2 fails (point it at a 500 url): the note names the failed size, and screen 2's mobile image is still sent.
- Dark and light screenshots of the Opacity field and the effect row.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 port-verify | new `server/agent/port-review.ts`; `server/agent/{sdk-driver.ts,final-check.ts,run-notes.ts}`; the `FinalCheck` interface of `contracts/src/contracts.ts` (net 0 lines); `contracts/src/folders.ts`; `server/share/page-import/import-page.ts`; `server/handlers/page/import-source.ts` |
| 2 undo-patch | (fallback: the route copy result and its UI note, `server/share/page-import/*` read path only, no overlap with pick 1's label line; coordinate with pick 1 if `import-page.ts` changes) `ui/features/inspector/use-edit-history.ts`; `ui/app/studio/use-studio-edit.ts`; the bridge optimistic patch handler; `server/direct-edit/commit/history.ts` and the history schema (only if `reverse` is needed) |
| 3 photo-fill | new `actions/src/image-search/apply.ts`, `image-search/schema.ts`; new `server/handlers/image-search/apply.ts`; `server/share/image-search/*`; `server/agent/{prompt.ts,run-level.ts,tool-help.ts}`; one note kind in `server/agent/run-notes.ts`; one Cmd+K command and label in `ui/features/commands/` |
| 4 group-rotate | `ui/features/canvas/{rotate-drag-model.ts,use-rotate-drag.ts,group-rotate-frame.tsx}`; `ui/features/inspector/use-multi-rotation.ts` (if needed); `server/direct-edit/engine/tailwind/{rotate-scale.ts,map.ts}`; the `batch_edit` description in `server/mcp/edit-tools.ts`; one key in `ui/features/canvas/copy.ts` (if needed) |
| 5 polish-26 | `bridge/force-state.ts`; the canvas deselect handler; `ui/features/effect/effect-field.tsx`; the opacity field model in `ui/features/inspector/`; the fill color field in `ui/features/fill/`; `server/agent/screen-review.ts` |

Shared files and conflict warnings:
- `server/agent/run-notes.ts` (22 lines): picks 1 and 3 each add one note kind to the same note list or union. **Flag: same union line.** Merge 1 first, then rebase 3 and add its member after pick 1's member.
- `server/agent/*`:
  - Pick 1 alone owns `sdk-driver.ts` and `final-check.ts`. Both may not grow; offset line for line.
  - Pick 3 alone owns `prompt.ts` (line 13, net 0), `run-level.ts` and `tool-help.ts`.
  - Pick 5 alone owns `screen-review.ts`.
  - Picks 1 and 5 both change what runs at the end of a run (port check and screen check). After both merge, read one run log to check that both note lines show.
- Copy files:
  - Pick 3 adds one label to the commands `copy.ts`.
  - Pick 4 may add one key to `ui/features/canvas/copy.ts`.
  - Picks 1, 2 and 5 add no copy.
  - No two picks add to the same `copy.ts`. No pick adds to `inspector/copy.ts` (437 lines).
- Unions and lists:
  - Pick 1 adds `port` to the `FinalCheck` interface in `contracts.ts` (line 590). The file is over 2000 lines: net 0 lines.
  - Pick 3 adds a new action, so `all-actions.generated.ts` and the image-search `index.ts`, `routes.ts` and `handlers.ts` are regenerated with `gen-routes`. Never hand-edit them.
  - No other pick adds an action.
- Bridge: pick 5 owns `force-state.ts`. Pick 2 owns the optimistic patch handler. If both are in one bridge file, merge 2 first.
- `ui/features/inspector/*`: pick 2 (`use-edit-history.ts`), pick 4 (`use-multi-rotation.ts`, if needed), pick 5 (the opacity field model). These are different files.
- `artifacts/mcp-snapshots/*.json` (user decision at merge):
  - Pick 3: the new `apply_image_search` tool.
  - Pick 4: the `batch_edit` description.
  - Pick 2: the history output, only if `reverse` is added.
  - Pick 1: none. `get_run` is in no snapshot file.
  - These diffs join the ones that wait from cycles 14 to 25.
- `.claude/goal/roadmap.md` Appendix A: add the new globs before each slice (`server/agent/port-review.ts`, `actions/src/image-search/apply.ts`, `server/handlers/image-search/apply.ts`) when the roadmap is in the worktree.

## Merge order

All 5 can run at once. Merge in this order:
1. **undo-patch**: UI and bridge, with the measure gate first.
2. **polish-26**: bridge, inspector and `screen-review.ts`. Rebase over undo-patch if they share a bridge file.
3. **group-rotate**: canvas and the Tailwind engine. Run gen-routes for the description.
4. **port-verify**: the agent end-of-run path, contracts and names. After merge, read one mock port run log to check that the port check and the screen check notes both show.
5. **photo-fill**: gen-routes for the new action. Rebase over port-verify for `run-notes.ts`.

After the last merge run `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run check:scripts`, `pnpm run lint:gate`, `pnpm run build:ui` and `pnpm exec tsx scripts/check-bundle.ts`. Then run one real-model session of 2 runs with `STUDIO_IMAGE_SEARCH=on` on merged main: a blank HTML prototype, then Move to app into the fake Next app. Report the first-draft time, the photos, the studio checks and the port score.

Real-model checks (local Claude Code sign-in, short runs):
- pick 1: 1 run (`start_port` into the fake Next app);
- pick 3: 2 runs (before and after, search on);
- the final merged session.

Picks 2, 4 and 5 need none.

## Runners-up

1. Route data offer: when a route copy of a server-data route renders empty or fails (Bonaparte needs its database), offer "Make a data fixture" as a confirmed app edit (`fixture.create` writes a page in the app), never automatic. Pick 2 builds it under its own key if its measure gate drops the undo patch.
2. Starter look: a blank prototype's first run builds 3 theme candidates and writes the first as `tokens.css`; needs a starter token base (`theme-run.ts` line 75 fails with no tokens).
3. Prototype kit check: flag hand-styled buttons, inputs and cards in a prototype beside an app that has a matching kit recipe, so Move to app maps them (kit-drift checks app source only).
4. Load `TodoWrite` up front (not deferred behind `ToolSearch`); after draft-first the turn no longer delays the first bytes, so measure before building.
5. Rotate zone and Rotation field write the picked breakpoint or state, not only the base style (rotate-handle left out).
6. Sequence line names a skipped state, board labels stale after a re-pin, and the 404s on page load (real-runs bugs 5, 6, 9; report-2 minor 6).
7. Continuation number repeats (`continuation: 1` twice) and the file chip says "+96 -10" on a created file (report-2 minor 5, 7).
8. Frame fit to content (Figma "Resize to fit"); waits for `fix/idle-chrome`.
9. Screenshot token cut at a new run; trades a cache write against about 7k tokens per turn, so it needs a measured decision.
10. Editable `data-[side=*]`, `data-[orientation=*]` and `group-data-[collapsible=icon]` states (Bonaparte 11 to 58 uses), after data-states lists them read-only.

Sources: [mcp.directory 2026 comparison](https://mcp.directory/blog/claude-design-vs-stitch-vs-v0-vs-lovable-vs-figma-make-2026), [konigi.com Claude Design](https://konigi.com/articles/claude-design-has-the-incumbents-scrambling/), [monkfrom.earth Claude Design vs Figma, Lovable, v0](https://monkfrom.earth/blogs/claude-design-vs-figma-lovable-v0), [mindstudio Claude Design vs Figma](https://www.mindstudio.ai/blog/claude-design-vs-figma).

## Results

- Merged with no conflicts, in order: undo-patch, polish-26, group-rotate, port-verify, photo-fill (main at d015670e2).
- undo-patch: the measure gate dropped the undo patch (studio part ~5 ms vs 150 ms limit; full undo 85 ms median on a fake Next app), so the key built runner-up 1: the "Make a data fixture" offer for empty route copies.
- Bug fix fix/port-scope (main at 2476bbb86): in agent runs, inspect_port scored the wrong project (~13); now http, mcp and agent all score the same (40, 0 diffs). The studio port check no longer scores the prototype against itself.
- Real runs (artifacts/real-runs/report-3.md, 3 runs, $0.52): photo fill filled 4/4 slots and the "Studio check:" line shows. No real run yet proved an agent-scored inspect_port with a fix loop (setup error on the last run).
- Checks: gen-routes --check pass, typecheck 0 errors, lint:gate pass (59612, baseline 89733), build:ui pass, check:clip 0 findings (before the port fix), desktop:pack pass.
- Installed app: :4570 returns 200. Server idle CPU 0.02 CPU-s/min over 60 s.
- Open: the port prompt does not name the prototype folder, so the agent searched the disk ~3 min and images 404'd; wrong "not saved yet" text; create_prototype_project output changed (MCP snapshot, user decision); an existing translate is replaced, not added to.
