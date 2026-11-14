# Feature cycle 27: next 5 features

Date: 2026-11-14. Main at `f8dbc0c6d` (all 5 cycle-26 picks merged at `d015670e2`, `fix/port-scope` merged at `2476bbb86`).

## Method

- Read `cycle-26.md` (picks, runners-up, Results "Open"), the 5 `cycle-26/*.md` reports ("Left out"), `real-runs/report-3.md` (Bugs), the runners-up and Results "Open" lines of cycles 20 to 25 (13 to 19 through their carried-over runners-up), the tail of `.claude/goal/feature-log.md`, `bonaparte-benchmark.md` and `git log --oneline -120`.
- Fixed pick 1 (from the user): the Move to app prompt names the prototype folder and the asset paths, and the wrong "not saved yet" text goes. Report-3 bugs 1 and 2.
- Bonaparte benchmark: no friction is open for a pick.
  - Fixed: 1 to 7, 9, 12, 14, 15 (cycle-26 Method), 10 (`524526604`, clause-cut names).
  - Measured: 13 (undo, 85 ms median on a fake Next app, `cycle-26/undo-patch.md`). It cannot run on Bonaparte (read-only, no database).
  - User decision: 8 and 11 (Home cuts).
  - So the Bonaparte pick (4) is the nearest Bonaparte-path item: the route data fixture flow. Every Bonaparte dashboard route reads server data, so every route copy hits it. Its open items are the undo-patch "Left out" lines.
- Figma gap check (grep in `ui/features`, `bridge`):
  - Built, so dropped: selection colors (Values section, `style-replace`), paste style (`layer-style`), wrap in frame, line clamp (`truncate-model.ts`), min and max size (`min-max-rows.tsx`), image fit and focal point (`image-model.ts`, `focal-pad-model.ts`), Alt distance (`measurements.tsx`), nudge, group rotate.
  - Open: resize of a multi-selection. `artboard-overlay.tsx` line 102 mounts `ResizeHandles` only when `resize.target` is set. `use-resize-handles.ts` line 94 scales only with `target !== null`. The multi editor (`simple-multi-body.tsx`, `simple-multi-editor.tsx`) has no W or H field. Alt from center is also open: `resize-handles-session.ts` lines 135 to 147 read only `shiftKey`.
- AI quality: starter look is still blocked. `theme-run.ts` line 75 fails with `NO_TOKENS` when a direction has no token file, which is the case for every blank prototype.
- Port recheck (report-3 bug 1):
  - `toPagePrompt` and `toFlowPrompt` (`agent/port-start.ts` lines 235 to 300) send the prototype HTML and the plan, but not `input.source.direction.workTree`.
  - `imagesOf` (`agent/port-plan.ts` line 385) reads only `img src` and inline `svg`. It skips `srcset`, `poster`, CSS `url()`, `<link href>` stylesheets (`tokens.css`) and fonts.
  - The port run has Bash (run 2 ran `find /`; `permissions.ts` line 130 turns Bash off only for runs with comments). So the agent can copy a file once it knows the path, but a copy by Bash is one more slow, unchecked step, and the edit tools write text only. The studio knows both folders, so it copies the files itself and the prompt names the folder and the new URLs.
  - `get_port_plan` is in `artifacts/mcp-snapshots/mcp-read.json`, so a new field on `PortPlan` is an output diff. Pick 1 keeps the asset map out of the `PortPlan` contract. `start_port` is in no snapshot file.
- "Not saved yet" (report-3 bug 2): `firstVersionWaitText` (`app/first-version.ts` line 126) serves app callers (`mcp/run-edit.ts`, `mcp/legacy/write-file.ts`, `http/edit-history-routes.ts`, `http/app-routes.ts`), where the text is correct. Only the two `preview/` throws are for a project with no app: `preview/file-read.ts` line 133 and `preview/frame-source.ts` line 168.
- Competitor recheck (1 web search, 2026-11-14): no item newer than August 2026 for Claude Design, Figma Make, v0, Lovable, Bolt, open design or doop. Reviews still credit Claude Design with two things: a design system read from a codebase, and a handoff to Claude Code. The studio has both. Pick 1 makes the handoff (Move to app) keep the photos, and pick 3 gives a blank prototype a deliberate look, as Claude Design first results have.
- Branch check (`git branch -a`): no `feat/port-assets`, `feat/group-resize`, `feat/starter-look`, `feat/fixture-flow` or `feat/polish-27`. Near names that exist and are not used: `feat/port-check`, `feat/port-verify`, `feat/scale-handles`, `feat/group-rotate`, `feat/starter-tokens`, `feat/server-data-fixture`, `feat/polish-26`.
- Skipped as the user's decision: the panel rail, the Home cuts (frictions 8 and 11), the MCP snapshot refresh and the repeated-word MCP names.
- The `idle-chrome-fix` agent still owns the headless Chrome launch, `get_screenshot` and `preview/browser.ts`. No pick changes them. So the Next 16 hydration warning (report-3 bug 4) is a runner-up.
- `.claude/goal/roadmap.md` exists at the root but is untracked (`git ls-files` prints nothing), so worktrees do not get it. Each pick adds its globs to Appendix A only if the file is in its worktree, and says so in the report (L6e).

## Ranking

Score = user value x fit with "simple and fast" / effort (1 to 5 each). Rank by value first. The score breaks ties.

| Rank | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|
| 1 | port-assets: Move to app copies the prototype photos, fonts and CSS files into the app and names the folder; right text for an unsaved prototype (fixed pick) | 5 | 5 | 2 | 12.5 |
| 2 | group-resize: resize a multi-selection with the box handles, and Alt resizes from the center (Figma) | 4 | 5 | 3 | 6.7 |
| 3 | starter-look: a blank prototype gets a token file and a look from the brief, with a Look choice (AI quality) | 4 | 4 | 3 | 5.3 |
| 4 | fixture-flow: a data fixture copy keeps the typed prompt, the source route name and one project (Bonaparte path) | 3 | 5 | 2 | 7.5 |
| 5 | polish-27: one photo fill per page, translate added to, the run continuation number and the created-file chip | 3 | 5 | 2 | 7.5 |

No pick adds an always-visible control:
- Pick 1 changes the port run and one error text.
- Pick 2 shows handles only on a multi-selection, where the rotate zones show today.
- Pick 3 shows one decision row in the chat after the first run, as decision chips do today.
- Pick 4 changes what the existing offer buttons do.
- Pick 5 fixes existing paths.

---

## 1. port-assets: Move to app keeps the prototype assets (fixed pick)

**Why.** In real run 2 (report-3), the port agent did not know where the prototype lived. It ran `find /` and `find ~/Library` for about 3 min of a 273.6 s run, also inside the user's studio data, then shipped a route where 4 photos return 404. The photos came from `apply_image_search`, so every port of a photo-filled prototype hits this. Its edit tools write text only, and a Bash copy is one more slow, unchecked step. The studio knows both folders, so it copies the files and gives the agent the new URLs.

Bundled: the "not saved yet" text (report-3 bug 2). `inspect_port` on a prototype with no saved version says "The first version of this app is not saved yet. Try again in a few seconds." It is not an app, and a retry never works. The agent retried once in run 3.

**UI behaviour.**
- No new control. Move to app works as today, and the run is faster and has no 404s.
- Before the agent's first turn, the studio copies each local asset that the prototype page uses into the app's public folder, at `public/<route-slug>/<file name>`. `public` is the folder of the target app (`apps/dashboard/public` for Bonaparte), not the workspace root. The slug is the one `toCutSlug` makes for the route.
- Asset kinds: `img src` and `srcset`, `video poster`, `source src`, CSS `url()` in `<style>` and in `style` attributes, `<link rel="stylesheet" href>` files (for example `tokens.css`) and the `url()` font and image files inside them.
- Out of scope: remote URLs (`http:`, `https:`, `data:`), files outside the prototype folder (a `../` that leaves the work tree is listed as skipped, never copied), and files over 10 MB (listed as skipped).
- A shared asset in a flow port is copied once, to the flow base slug.
- A name clash with a file that is already in `public/<slug>/` and has other content gets a `-2` suffix. Never overwrite an app file.
- The copy is in the run's undo. The agent first finds how the port run takes its start snapshot and its end version. If the start snapshot comes before the copy, one undo of the run removes the route and the copied files. If a stopped or failed run would leave the files, the copy moves to the first step inside the run (after the start snapshot). The report says which one it is.
- The run note line names the count: "Copied 6 prototype assets to public/coffee-cart/." The line uses the existing `run-notes.ts` note path.

**Agent loop.**
- The port prompt gets one new tag after `<port-plan>`: `<prototype-assets>`. It holds the prototype folder as a read path (one line: "The prototype files are in `<workTree>`. Read only these files. Do not search the disk."), then one line per asset: the old reference, then the new URL (`assets/hero.jpg -> /coffee-cart/hero.jpg`).
- The prompt adds one rule: "Use the new URLs for every asset. Do not copy or move files. The studio copied them." For `tokens.css`: "Map the prototype tokens to the app tokens as the port plan says. The copied tokens.css is a reference; do not link it unless the plan has no token match." The agent decides this line after it reads `mapTokens` (`port-plan.ts` line 716).
- Both `toPagePrompt` and `toFlowPrompt` get the tag.
- `port-start.ts` (432 lines) may not grow past 500. Put the collect, copy and tag code in a new `agent/port-assets.ts`. `port-plan.ts` (1298 lines) does not change: the asset scan is new code in `port-assets.ts` that reads the same HTML. `imagesOf` and `PortImage` keep their shape, so `get_port_plan` has no output diff.
- The mock port run (`agent/mock-port.ts`) writes an `<img>` with the new URL, so the mock path proves the map.

**"Not saved yet" text.**
- New `firstPrototypeVersionText` next to `firstVersionWaitText` in `app/first-version.ts`: "This prototype has no saved version yet. Save a version with create_version, or let a run finish, then call this tool again." `create_version` is the MCP name of `version.create` (E19).
- `preview/file-read.ts` line 133 and `preview/frame-source.ts` line 168 throw the new text. They are the only callers for a project with no app. The app callers keep their text.
- Better than text: if the agent finds that a prototype with no head version can read its work tree as a live source (as the app branch above each throw does with `LIVE_VERSION_ID`), it does that for `inspect_port` and keeps the throw only for paths that need a version. It reports which paths it changed.

**Headless.**
- No new action. `start_port` (MCP and agent) runs the same copy and prompt, because the copy is in `startPageRun` and the flow start.
- `get_port_plan` output does not change. `start_port` is in no snapshot file.
- The error text change shows to MCP and the agent at once.

**Main files.**
- New `server/agent/port-assets.ts` (collect references from the HTML and linked CSS, resolve inside the work tree, copy, build the tag).
- `server/agent/port-start.ts` (call the copy in `startPageRun` and the flow start, add the tag in `toPagePrompt` and `toFlowPrompt`).
- `server/agent/mock-port.ts` (the mock route uses the new URL).
- `server/agent/run-notes.ts` (one note line, through the existing note path).
- `server/agent/index.ts` (one export, only if another area needs it; the agent tries to keep it internal).
- `server/app/first-version.ts`, `server/app/index.ts` (export), `server/preview/file-read.ts`, `server/preview/frame-source.ts`.
- No `copy.ts`.

**Verify in the running app** (`STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev`).
- `ds-wt/ps-next-app` and `ds-wt/port-next-app` are gone. Make a new fake Next 16 app under `/Volumes/DevProjects/code/ds-wt/` (a `package.json` with `next`, `app/layout.jsx`, `app/page.jsx`, an empty `public/`), and attach it with `create_dev_server`.
- Mock agent:
  - An HTML prototype beside it with 2 `<img>` files in `assets/`, one CSS `url()` background, and `<link href="tokens.css">` with one font `url()`. Keep a version. Move to app to `/coffee-cart`: `public/coffee-cart/` has the 5 files, the prompt in the run log has `<prototype-assets>` with 5 lines, and the route loads every asset with status 200 (network log).
  - Undo the run once: the route file and the 5 copied files are gone. Stop a second run mid-way: the report says what is left.
  - A prototype with a `../outside.png` reference: it is listed as skipped and not copied.
  - A flow port of 2 pages that share `assets/logo.svg`: it is copied once.
  - `inspect_port` on an HTML prototype with no version (`projects.create` with `startRun: false`, write `index.html`): the new text (or a score, if the live read path is built). No "app", no "Try again in a few seconds".
- Real model, 1 short run (local Claude Code sign-in), never on Bonaparte:
  - Prototype: an HTML page filled with `apply_image_search` (image search on) that links `tokens.css`, with a saved version.
  - `start_port` into the fake Next app.
  - Report: 404 count in the network log (expect 0); `find /` or `~` in the tool log (expect none); run time against 273.6 s in run 2; and whether the agent's own `inspect_port` returned a score (not proved in report-3).
- Bonaparte (read only): `get_port_plan` for a prototype beside `apps/dashboard` still gives `apps/dashboard/app/...`, and the target public folder is `apps/dashboard/public/<slug>/`. Never call `start_port` on Bonaparte. Bonaparte `git status --short` is the same before and after.
- Dark and light screenshots of the run note and of the ported route next to the prototype.

---

## 2. group-resize: resize a multi-selection (Figma)

**Why.** In Figma, a multi-selection has one box with 8 handles. A drag resizes every layer in proportion, and Alt resizes from the center. In the studio, a multi-selection shows only the rotate zones. There are no handles and no W or H field, so a user who wants 3 cards a bit wider must resize each one. Alt from center is also missing on a single layer.

**UI behaviour.**
- A multi-selection shows the 8 resize handles on its box, next to the rotate zones that `GroupRotateFrame` draws today. They show only while 2 or more layers are selected, so no always-visible UI is added.
- A handle drag scales the group box. Each layer gets the same factor on the dragged axis, and the opposite edge of the box stays in place:
  - An absolutely positioned layer gets a new width and height, and its `left` and `top` move with the factor from the fixed edge.
  - A flow layer gets the new width and height only. Its place comes from the layout. This is the same split that group-rotate uses.
  - A text layer with no fixed width keeps auto width. Only a fixed `w-*` or `width` scales.
- Shift keeps the box ratio. Alt scales from the box center (absolute layers move on both sides). Escape cancels. One `batch_edit` and one undo step on release.
- Tailwind: a size or position on the spacing scale snaps to the nearest step. An arbitrary value stays arbitrary. The report names any off-token value the drag writes.
- Single layer: Alt on a handle resizes from the layer center. For a flow layer that means only the size changes (both sides look to move). For an absolute layer, `left` and `top` move by half the change.
- The size label under the box shows the group W x H while dragging, through the existing size label.

**Headless.** No new action. The UI sends one `batch_edit` with `width`, `height`, `left` and `top` per layer. The `batch_edit` description adds one sentence after the group rotate one: "To resize several layers as one, scale each size by the same factor and move each absolute layer from the fixed edge." That is a description diff (user decision at merge).

**Main files.**
- New `ui/features/canvas/group-resize-model.ts` (pure: box, factor, per-layer size and position; flow or absolute split).
- New `ui/features/canvas/use-group-resize.ts` (drag session; reuse `resize-handles-session.ts` helpers through their exports, do not copy them).
- `ui/features/canvas/group-rotate-frame.tsx` (draw the handles in the same frame) or a new `group-resize-frame.tsx` mounted next to it in `artboard-overlay.tsx` (one line).
- `ui/features/canvas/resize-handles-session.ts` and `resize-handles-model.ts` (Alt from center on a single layer).
- `server/mcp/edit-tools.ts` (the `batch_edit` description) and `server/mcp/legacy/direct-edit-schema.ts` if the text lives there too.
- Copy: none expected. The size label exists. If a key is needed, one key in `ui/features/canvas/copy.ts`.

**Verify in the running app.**
- Tailwind 4 fake app (the one from pick 1 is fine), 3 absolute badges in a row: select all 3, drag the right handle 50%. Each badge is 1.5 times wider and moves right in proportion, the left edge stays. One Cmd+Z restores all 3. Escape mid-drag writes nothing.
- 3 flow cards in a flex row: drag the bottom handle. Each card gets a new height, and nothing moves.
- Alt and Shift on the group: the box scales from the center with the same ratio.
- One absolute layer, Alt on the corner handle: it grows on all sides.
- HTML project: the same 3 checks, written as CSS.
- `pnpm exec tsx scripts/call-action.ts` on the batch edit action with 3 size and position edits: the 3 surfaces match.
- Dark and light screenshots of the group handles mid-drag.

---

## 3. starter-look: a blank prototype gets a deliberate look (AI quality)

**Why.** A blank prototype has no token file, so the first draft picks colors and fonts inline, and `theme.create` fails with `NO_TOKENS` on it. Claude Design first results look designed because they start from a theme. The theme engine (`style-scope/theme/engine/`, with `brief.ts`, `palette.ts`, `fonts.ts`) builds a theme from a brief with no model call. It only lacks a token file to write into.

**UI behaviour.**
- On the first new-page run of a blank HTML prototype (no `tokens.css`, no design system, no app; `isNewPage` in `run-level.ts`), the studio writes a starter `tokens.css`: the role tokens that `theme-base.ts` `ROLE_PATHS` reads (bg, surface, fg, fg-muted, border, primary, primary-fg, accent, accent-fg, ring), a display and a body font, and a radius. The values come from the theme engine with the run prompt as the brief.
- The write runs at run start, in parallel with the first model turn. It must not delay the first draft (target about 3.5 s). If it is not done when the agent writes the first page, the agent still links `tokens.css`, and the page picks the values up when the file lands.
- The prompt line about `tokens.css` (`prompt.ts` line 64) already tells the agent to link it and use `var(--token)`. No new prompt line, unless the agent finds the rule applies only when the file exists at prompt time. Then it adds one line in `user-message.ts` for this run.
- After the run, the chat shows one decision row "Look" with 3 options: the one in use and 2 more seeds from the same brief. A click applies that theme with `theme.apply` (no model call, one version, one undo step). The row uses the existing decision row (`ui/features/chat/use-decision-row.ts`, `decision-row-chip.tsx`).
- Not on: a project that has tokens, an attached app, a folder prototype beside an app (it uses the app tokens), WIREFRAME runs, lean runs and ask mode.

**Agent loop.** No new tool. The in-app agent sees `tokens.css` as it sees one from a design system. The agent can call `create_theme` later, because the base now exists.

**Headless.**
- No new action. `theme.create` on a direction with no token file writes the starter base first, then the theme, in place of the `NO_TOKENS` failure. Its description adds one sentence that says so. The agent checks if `create_theme` is in a snapshot file; if so, the description diff is a user decision at merge.
- An MCP caller that makes a blank prototype and calls `create_theme` gets the same result as the in-app run.

**Main files.**
- New `server/style-scope/theme/theme-starter.ts` (write the starter base from the engine; one file, the `tokens.css` path from `theme-paths.ts`).
- `server/style-scope/theme/theme-run.ts` (call the starter in place of `NO_TOKENS`) and `theme-base.ts` only if the read needs it.
- `packages/common/actions/src/theme/create.ts` (one description sentence).
- The run start hook for a new-page prototype run: `server/agent/new-page.ts` or `user-message.ts` (the agent names it). Not `sdk-driver.ts`, which may not grow.
- `ui/features/chat/use-decision-row.ts` and `decision-row-chip.tsx` (the Look options), and the label "Look" in `ui/features/chat/copy.ts`.

**Verify in the running app.**
- Mock agent, blank HTML prototype "bakery landing page": `tokens.css` exists after the run with the role tokens and 2 fonts, `index.html` links it, and the Look row shows 3 options. Click the second: one version, the page colors change, Cmd+Z restores them.
- A project with a design system: no starter file, no Look row.
- An attached app project: no starter file.
- MCP `create_theme` on a blank prototype: it succeeds, and `tokens.css` is written.
- Time from prompt to first draft on the mock run: no change (run log `firstDraftMs`).
- Real model, 2 short runs (local sign-in): "bakery landing page" before and after this branch. Report the first-draft time, the count of hard-coded colors in the page (grep `#` and `rgb(` outside `tokens.css`), the `review_frame` findings, and tokens and seconds added. Dark and light screenshots of both pages and of the Look row.

---

## 4. fixture-flow: a data fixture copy keeps the prompt and the route (Bonaparte path)

**Why.** Every Bonaparte dashboard route reads server data, and Bonaparte does not run without its database. So a route copy of Bonaparte gives an empty page, and the cycle-26 fixture offer is the only path to a real redesign of a Bonaparte route. The undo-patch report lists 3 faults on that path:
- "Open the copy" opens a project with no run, so the prompt the user typed is lost.
- After "Make a data fixture", the user has 2 prototype projects for one route (the empty one and the fixture one).
- The fixture copy's run prompt names the fixture route (`Redesign /__studio-fixture/<id>: ...`), not the source route, so the agent and the project name say the wrong route.

**UI behaviour.**
- "Open the copy" opens the empty copy and starts the typed prompt as its first run, as a normal route copy does.
- "Make a data fixture" writes the fixture copy into the same prototype project as a new version, in place of a new project. The empty copy stays in history (one undo returns to it). So one route gives one project.
- The run prompt and the project name name the source route: "Redesign /patients (with a data fixture): ...". The fixture route is named once in the run context as the place the data comes from.
- No new control. The two buttons keep their labels.

**Headless.**
- `project.createPrototype` (`create_prototype_project`) gets one input field, `intoProjectId: string | null` with `Schema.withDecodingDefault` to `null`. When it is set, the copy writes into that project if it is a route copy of the same app; otherwise it fails with `BadRequest`. The `fixtureOffer` text in the output tells the caller to pass the empty copy's id. The agent checks that this input fits `scope` and `needs` (T11: the project-owned id is in the input).
- The prompt and name fix applies to every surface.
- MCP snapshot: `create_prototype_project` already waits for a decision (cycle 26). This adds an input field and one description sentence to the same diff.

**Main files.**
- `packages/common/actions/src/project/{schema.ts,create-prototype.ts}` (input field, description).
- `server/handlers/project/create-prototype.ts` (write into the project, prompt and name).
- `ui/features/prototype/{use-fixture-offer.ts,fixture-offer-model.ts,use-prototype-create.ts}` (Open the copy runs the prompt; the fixture copy passes `intoProjectId`).
- `ui/features/prototype/copy.ts` only if a label changes (not expected).
- Run `pnpm exec tsx scripts/gen-routes.ts` if the routes or tool lists change.

**Verify in the running app.**
- Fake Next app route `/patients` that throws "DATABASE_URL is not set" (as in cycle 26). Copy it with a prompt:
  - "Open the copy": the project opens and the mock run starts with the typed prompt.
  - "Make a data fixture": the same project gets a new version with the patient list. The Home list has one project for `/patients`. Cmd+Z returns to the empty copy.
  - The run prompt in the run log says "/patients", and the project name says "/patients".
- `pnpm exec tsx scripts/call-action.ts project.createPrototype '<json>'` with `intoProjectId`: the 3 surfaces match (except new ids and times, as in cycle 26).
- `intoProjectId` of a project from another app: `BadRequest`.
- No real-model run needed. Bonaparte is not run (no database). Name that in the report.
- Dark and light screenshots of the offer and of the fixture copy.

---

## 5. polish-27: small open items from cycle 26 and report-3

**Items.**
- **One photo fill per page** (report-3 bug 3: `apply_image_search` ran 3 times on one page, 28.3 s). A call on a page with no `data-photo` slot left returns at once with `filled: []` and a short note, with no search. The PROTOTYPE and POLISH step text in `run-level.ts` says "call it once per page, after the first draft". Files: `server/share/image-search/photo-fill.ts`, `server/agent/run-level.ts`. The agent checks if the later calls in run 1 changed any slot, and reports it.
- **A background photo slot keeps its label text** (photo-fill "Left out"). The fill removes the placeholder label of a background slot it fills. File: `server/share/image-search/photo-fill.ts`.
- **An existing translate is replaced, not added to** (group-rotate "Left out", cycle-26 Results). The bridge sends `translate` in the selection styles, and the group rotate adds its shift to it. Files: the bridge selection styles (`bridge/element-info.ts`), `transform-style-properties.ts`, `ui/features/canvas/rotate-drag-model.ts`. Pick 2 does not touch `rotate-drag-model.ts`.
- **The continuation number repeats** (`continuation: 1` twice, report-2 minor 5). Each studio continuation (app review, port check, screen check, reference) takes the next number from one counter. Files: the run-log continuation writer that `sdk-driver.ts` lines 1259 to 1304 call. The agent fixes it outside `sdk-driver.ts` if it can, and keeps `sdk-driver.ts` from growing (L2a).
- **The file chip says "+96 -10" on a created file** (report-2 minor 7). A created file shows "+96" and "new". Files: the chat file chip model in `ui/features/chat/` (the agent names it) and the diff count on the server if the count is wrong there.

**Headless.** No new action. The photo fill change is an output note on `apply_image_search` (the tool is not in a snapshot yet; it waits for the cycle-26 decision). The other items are internal.

**Main files.** `server/share/image-search/photo-fill.ts`; `server/agent/run-level.ts`; `bridge/element-info.ts`; `transform-style-properties.ts`; `ui/features/canvas/rotate-drag-model.ts`; the run-log continuation writer; the chat file chip model. No `copy.ts` change, unless the chip needs the word "new" (then one key in `ui/features/chat/copy.ts`, see shared files).

**Verify in the running app.**
- `STUDIO_IMAGE_SEARCH=on`, mock: fill a page with 3 slots, then call `apply_image_search` again: it returns in under 100 ms with `filled: []`, and no Openverse request runs.
- A background slot with a label: after the fill, no label over the photo.
- CSS project, a box with `translate: 10px 0`, rotate it in a group: the result keeps the 10 px plus the group shift.
- A mock run with an app review and a screen check: the run log shows continuation 1, then 2.
- A run that creates `new.html` with 96 lines: the chip says "+96" and "new".
- Dark and light screenshots of the chip and of the filled background slot.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 port-assets | new `server/agent/port-assets.ts`; `server/agent/{port-start.ts,mock-port.ts}`; one note line in `server/agent/run-notes.ts`; `server/app/{first-version.ts,index.ts}`; `server/preview/{file-read.ts,frame-source.ts}` |
| 2 group-resize | new `ui/features/canvas/{group-resize-model.ts,use-group-resize.ts}` (and `group-resize-frame.tsx` if split); `ui/features/canvas/{group-rotate-frame.tsx,artboard-overlay.tsx,resize-handles-session.ts,resize-handles-model.ts}`; the `batch_edit` description in `server/mcp/edit-tools.ts` |
| 3 starter-look | new `server/style-scope/theme/theme-starter.ts`; `server/style-scope/theme/{theme-run.ts,theme-base.ts}`; `actions/src/theme/create.ts` (description); the new-page run start hook (`server/agent/new-page.ts` or `user-message.ts`); `ui/features/chat/{use-decision-row.ts,decision-row-chip.tsx,copy.ts}` |
| 4 fixture-flow | `actions/src/project/{schema.ts,create-prototype.ts}`; `server/handlers/project/create-prototype.ts`; `ui/features/prototype/{use-fixture-offer.ts,fixture-offer-model.ts,use-prototype-create.ts}` |
| 5 polish-27 | `server/share/image-search/photo-fill.ts`; `server/agent/run-level.ts`; `bridge/element-info.ts`; `transform-style-properties.ts`; `ui/features/canvas/rotate-drag-model.ts`; the run-log continuation writer; the chat file chip model |

Shared files and conflict warnings:
- `ui/features/chat/copy.ts`: pick 3 adds "Look". Pick 5 adds a key only if the chip needs the word "new". **Flag: same `copy.ts`.** Pick 5 merges first (merge order), so pick 3 rebases and adds its key after pick 5's key. No two picks add to the same union or import line in it, because pick 5's key is a new line.
- `server/agent/run-notes.ts`: only pick 1 adds a note line. No union change: the line uses the existing note path.
- `server/agent/*`: pick 1 owns `port-start.ts`, `mock-port.ts` and the new `port-assets.ts`. Pick 3 owns the new-page hook file. Pick 5 owns `run-level.ts`. If pick 3 must change `run-level.ts`, it does not: it uses `new-page.ts` or `user-message.ts`. No pick changes `sdk-driver.ts` (1628 lines, may not grow) except pick 5 if the continuation counter lives there, net 0 lines.
- `server/agent/index.ts`: pick 1 adds an export only if needed. **Flag: same export block**, if pick 3 also exports its hook from there. Merge 1 first.
- `ui/features/canvas/*`: pick 2 owns the resize and group frame files. Pick 5 owns `rotate-drag-model.ts`. Different files. `ui/features/canvas/copy.ts` gets a key only from pick 2, if any.
- `server/mcp/edit-tools.ts`: pick 2 only.
- `bridge/element-info.ts`: pick 5 only. Pick 2 reads the selection rects that the bridge already sends.
- Unions and generated lists: no pick adds an action. Pick 4 changes an action input, so it runs `pnpm exec tsx scripts/gen-routes.ts`. Picks 2 (description in a legacy MCP file) and 3 (description) run `gen-routes --check`. Never hand-edit a `// @generated` file.
- `packages/common/contracts`: no pick changes it. Pick 1 keeps the asset map out of `PortPlan`.
- `artifacts/mcp-snapshots/*.json` (user decision at merge): pick 2 (`batch_edit` description), pick 3 (`create_theme` description, if it is in a snapshot), pick 4 (`create_prototype_project` input, joins the cycle-26 diff). Pick 1: none. Pick 5: none.
- `.claude/goal/roadmap.md` Appendix A: add `server/agent/port-assets.ts`, `ui/features/canvas/group-resize-*`, `ui/features/canvas/use-group-resize.ts` and `server/style-scope/theme/theme-starter.ts` when the file is in the worktree. It is untracked today.

## Merge order

All 5 can run at once. Merge in this order:
1. **port-assets**: the fixed pick. It owns the port prompt and the one `agent/index.ts` export.
2. **polish-27**: small server, bridge and chat fixes. Rebase over pick 1 if `agent/index.ts` changed.
3. **group-resize**: canvas and the `batch_edit` text. Run `gen-routes --check`.
4. **fixture-flow**: action input change. Run gen-routes.
5. **starter-look**: theme, run start and chat. Rebase over pick 5 for `ui/features/chat/copy.ts`.

After the last merge, run `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run check:scripts`, `pnpm run lint:gate`, `pnpm run build:ui` and `pnpm exec tsx scripts/check-bundle.ts`. Then run one real-model session of 2 runs on merged main with `STUDIO_IMAGE_SEARCH=on`: a blank "coffee cart" HTML prototype (starter look, photos, one fill call), then Move to app into the fake Next app under `ds-wt`. Report the first-draft time, the photo count, the 404 count on the route, the port score and the seconds and tokens.

Real-model checks (local Claude Code sign-in, short runs; Move to app only into a fake Next app under `ds-wt`, never Bonaparte):
- pick 1: 1 run (`start_port` of a photo prototype);
- pick 3: 2 runs (before and after);
- the final merged session (2 runs).

Picks 2, 4 and 5 need none.

## Runners-up

1. Port fidelity: the port run keeps the prototype fonts and colors (run 3 scored 40 because the agent used Tailwind stone and orange and dropped Fraunces and Inter); shares `port-start.ts` with pick 1, so after it.
2. Next 16 hydration warning from the studio bridge counted as 2 console errors on every route by `render_check` and the port probe (report-3 bug 4); after `fix/idle-chrome` merges.
3. Prototype kit check: flag hand-styled buttons, inputs and cards in a prototype beside an app whose kit has a recipe (`to-component-recipes.ts`), so Move to app maps them (`list_kit_drift` scans app source only).
4. Frame fit to content (Figma "Resize to fit"); waits for `fix/idle-chrome`.
5. W and H fields in the multi editor (`simple-multi-body.tsx` has none), after pick 2 gives the group resize write.
6. JSX background photo slots: fill `data-photo` on non-`img` elements in `.jsx` and `.tsx` pages (photo-fill "Left out").
7. Load `TodoWrite` up front, not behind `ToolSearch`; measure first, because draft-first already moved it off the first bytes.
8. Rotate zone and Rotation field write the picked breakpoint or state, not only the base style (rotate-handle "Left out").
9. Editable `data-[side=*]`, `data-[orientation=*]` and `group-data-[collapsible=icon]` states (Bonaparte 11 to 58 uses), after data-states lists them read-only.
10. Screenshot token cut at a new run; trades a cache write against about 7k tokens per turn, so it needs a measured decision.

Sources: [mcp.directory 2026 comparison](https://mcp.directory/blog/claude-design-vs-stitch-vs-v0-vs-lovable-vs-figma-make-2026), [konigi.com Claude Design](https://konigi.com/articles/claude-design-has-the-incumbents-scrambling/), [monkfrom.earth Claude Design vs Figma, Lovable, v0](https://monkfrom.earth/blogs/claude-design-vs-figma-lovable-v0), [refontelearning.com design-to-code tools](https://www.refontelearning.com/blog/ai-design-to-code-tools-figma-make-v0-lovable), [agentwiki comparison](https://agentwiki.org/_export/raw/claude_design_vs_figma_vs_lovable_vs_bolt_vs_v0). No result was newer than August 2026.

## Results

- Merged with no conflicts, in order: port-assets, polish-27, group-resize, fixture-flow, starter-look (main at b79bd94c7).
- Real runs: port-assets Move to app run took 32 s (was 273.6 s in report-3), 0 image 404s, no disk search, inspect_port 97. starter-look first run: 3 hard-coded colors (was 21), run 59 s (was 88 s), $0.18 (was $0.25).
- Checks: gen-routes --check pass, typecheck 0 errors, lint:gate pass (59615, baseline 89733), build:ui pass, check:clip 0 findings, desktop:pack pass.
- Installed app: :4570 returns 200. Server idle CPU 0.02 CPU-s/min over 60 s.
- Open: fixture flow Cmd+Z takes 2 steps back to the empty copy; a layer anchored by right or bottom gets a left move on group resize; a percent translate is still replaced; dark frame goes light after theme.apply; MCP snapshot diffs for batch_edit, create_theme and create_prototype_project wait for the user.
