# Feature cycle 34: next 5 features

Date: 2026-11-14. Main at `d274c9cff` (all 5 cycle-33 picks merged at `778d9e8dc`).

## Method

- Read `cycle-33.md` (picks, runners-up, Results "Open"), `cycle-33/{real-proof,port-objects,kit-badges,text-keys,polish-33}.md` ("Left out"), the runners-up and Results of cycles 28 to 32 (13 to 27 through their carried-over runners-up), `real-runs/report{,-2,-3}.md`, `user-journeys.md`, `journeys-run/b-9-15.md`, `.claude/goal/feature-log.md`, `git log --oneline -120` and `git branch -a`.
- Read the code on the fresh-user flow: `agent/run-level.ts` (`FLOW_STEP`), `agent/prompt.ts` (flow line), `agent/sdk-driver.ts` (run-end checks), `agent/todo-tracker.ts` (`canvas_place`), `canvas/links/{play-links.ts,implicit-links.ts,start-points.ts}`, `share/play-data.ts`, `actions/src/share/create.ts`, `actions/src/canvas/{create-linked-frame.ts,create-flow.ts,apply-implicit-link.ts}`.
- Read the code for the other picks: `share/page-import/collect-script.ts`, `components/kit-drift/{kit-drift-prototype.ts,engine/*}`, `actions/src/text/schema.ts` (`TEXT_RANGE_STYLES`), `ui/features/inspector/{use-text-keys.ts,text-keys-model.ts}`, `ui/features/text-range/*`, `ui/features/versions-layers-tokens/layers-keys-model.ts`, `shared/keymap*.ts`, `agent/lifecycle.ts` (`steer`), `agent/port-review-snapshot.ts` (`PENDING_PREFIX`), `app/first-version.ts`.
- Counted in Bonaparte (read only, `git grep`): `mx-auto` in 142 `apps/dashboard` TSX files and 6 `packages/ui` files; `ml-auto` or `ms-auto` in 146 files; `mr-auto` or `me-auto` in 4; `<Skeleton` in 504; `.map(` in 1,793 dashboard TSX files.
- No real-model run and no measure for this research.

### Findings

- **Fresh-user flow: the canvas depends on the model to show each screen.** `FLOW_STEP` (`run-level.ts`) tells the agent to write one page per step and then call `canvas_list` and `canvas_place` for each new page. No studio code places a frame when the agent skips this (grep of `server/agent`, `server/canvas` and `ui/features/canvas`: only the prompt text and the `todo-tracker.ts` tick).
  - This matters for the share link: `create_share_link` takes "every visible frame" by default, and share Play reads implicit links between frames (`play-data.ts` -> `toPlayLinks`). A page with no frame is not in the share, and a link to it does not click through.
  - It also costs time: `canvas_list` plus one `canvas_place` per page is 2 to 4 more model turns at the end of every flow run.
  - No real run has timed this flow end to end (the journey runs predate the clickable share). So pick 1 measures first and fixes the worst step by a fixed rule; the missing-frame fallback is the lead hypothesis.
- **Bonaparte: route copy turns `mx-auto` into fixed px.** `collect-script.ts` reads `margin-*` through `getComputedStyle`, which returns the used px value (`margin-left: 336px` at 1440 px). The copy then breaks when the frame width changes, and Move to app sees a px margin the app never had. real-proof's fixture script reset it by hand; the copier is not fixed (cycle-33 Results "Open"). Bonaparte centers content with `mx-auto` in 148 files and pushes items right with `ml-auto` in 146. page-import last changed in `f76f509ac` (border width), so this is the next gap in the same file.
- **AI quality: the kit check reads static HTML only.** `kit-drift-prototype.ts` reads each page with `readFile`. Rows, pills and cards that a `<script>` builds from an array are not checked (kit-badges "Left out": the main real run showed it). Real prototypes build lists from JS arrays often. Also open: Button and Table may count `data-slot` alone as kit use (real-proof "Left out"; cards were fixed in `5d9cdc283`).
- **Figma gap: text keys on a range.** text-keys left out ranges: in a text edit with a range selected, `Mod+U` and `Mod+Shift+X` style the whole layer, and `Mod+B` keeps the browser's inline bold. Figma styles only the range. The write exists: `text.applyRange` (`apply_range_text`) does bold, italic, link and class, but not underline or strike. Also "a card that holds text takes the text keys" (text-keys "Left out"). Checked and not picked: hide and lock from the canvas (`Mod+Shift+H` is Go to Home, a user decision), batch rename, paragraph spacing (low use in code-based design).
- **Small open items** (pick 5):
  - A steer at the start of a port run cancels it with no follow-up over the API (real-proof "Left out"; `lifecycle.ts` `steer` cancels, then `next()` must pick up `steerText`).
  - A `pending-<uuid>` snapshot folder left by a crash is never removed (port-objects "Left out").
  - `port.start` to run start was not timed on the Bonaparte-size clone (port-objects "Left out").
- **Already fixed, dropped:** share link as a PNG gallery (HTML shares are now a clickable prototype), the first-version text for an HTML prototype (`toFirstPrototypeVersionText`), port asset copy (`feat/port-assets` merged), size-key snap (did not reproduce).
- **Not picked (user decisions or hand aggregators):** panel rail, Home cuts, MCP snapshot refresh, frame fit to content (100vh), lazy tool registries and the closed-request `get_run` wait (hand aggregators), `Mod+]` and `Mod+[`, starter pills with AI, canvas hide and lock keys.
- **Competitor recheck (2 web searches, 2026-11-14).** Figma Make now has an editing panel for its output and imports npm packages so prototypes use real design-system parts (rolling out in November). Claude Design is still a research preview with link share and an Export to Claude Code handoff. Nothing new for v0, Lovable, Bolt, open design or doop since cycle 33. The bar stays the same: one prompt to a shared, clickable flow, and prototypes that use the real kit.
- **Branch check.** No `feat/flow-frames`, `feat/range-keys`, `feat/kit-render`, `feat/route-auto` or `feat/polish-34`. Near names that exist and are not used: `feat/proto-links`, `feat/start-points`, `feat/next-screen`, `feat/new-screen`, `feat/flow-video`, `feat/text-keys`, `feat/kit-badges`, `feat/route-fidelity`, `feat/polish-33`.

## Ranking

Score = value x fit with "simple and fast" / effort (1 to 5 each).

| Rank | Key | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|---|
| 1 | flow-frames | Time a fresh "3 linked screens -> share link" run, then remove its worst step (lead: the studio gives every linked page a frame, so the share and Play have every screen) | 5 | 5 | 3 | 8.3 |
| 2 | route-auto | Route copy keeps `mx-auto` and `ml-auto` as `auto`, not fixed px (Bonaparte) | 4 | 5 | 2 | 10 |
| 3 | kit-render | The prototype kit check scans the rendered page, so script-built pills, cards and rows are checked (AI quality) | 4 | 5 | 3 | 6.7 |
| 4 | range-keys | `Mod+B`, `Mod+U`, `Mod+Shift+X` style only the selected range in a text edit (Figma) | 3 | 5 | 2 | 7.5 |
| 5 | polish-34 | Steer keeps a port run going, crash snapshot folders cleaned, `port.start` timed on a big repo | 3 | 5 | 1 | 15 |

No pick adds an always-visible control:
- Pick 1 adds a run-end step and one action; no new UI unless the run shows a share dialog fix (copy only).
- Pick 2 changes the route copier.
- Pick 3 changes the kit check input.
- Pick 4 adds key behaviour in text edit (shortcut sheet only).
- Pick 5 fixes existing paths.

---

## 1. flow-frames: fresh prototype to share link, worst step removed

**Why.** The easiest path to a shared prototype must work for a new user with one prompt. Today every screen of a flow reaches the canvas, the share link and Play only if the model remembers `canvas_place` for each page. This pick times the whole flow fresh, then removes its slowest or most confusing step.

**Stage A: baseline (real run on main, before any code).**
- Fresh studio data folder (`ds-wt/fs-data-main`), installed-like dev run (`STUDIO_DATA_DIR=... pnpm run dev`, no `STUDIO_AGENT=mock`), Sonnet, local sign-in.
- On Home, prompt: "A 3-screen sign-up flow for a yoga studio app: welcome, plan picker, confirmation. Each step links to the next."
- Then, as a user: wait for the run end, look at the canvas, press Play and click through 3 screens, open Share, make a link, open it in a 390 px page and tap through.
- Record per step: wall seconds (run log splits model and tool time), clicks, and every step that needed a manual fix (a missing frame, a wrong start, a dead tap, a link that only opens on this computer). Record `canvas_list` and `canvas_place` calls and their turn time. Save `ds-wt/fs/baseline.json` and dark and light shots.

**Stage B: fix the worst step.** Rule: fix the step with a manual fix first; if none, the slowest step. Seams, in the order the code evidence ranks them:
1. **Missing or misplaced frames (lead).** New action `canvas.createPageFrames`: for an HTML project, find each page that is reachable by a link from a page that has a frame and has no frame, and add a frame for it right of the frame that links to it, in link order, labelled with the page `<title>` or first `h1`, default gap 80, desktop size of the source frame. One canvas version, one undo step. If no start point is set, set the entry page frame as the first start point (`setFirstStart` in `canvas/links/start-points.ts`).
   - **Page finder.** `implicit-links.ts` cannot be used as it is: `targetFrame` returns null for a page with no frame, so those links are dropped. Read the anchors with the same readers (`canvas/links/html-anchors.ts`, `script-links.ts`), resolve each href with `hrefTarget`, and keep targets that are `.html` files in the work tree.
   - **No re-adds.** There is no record of frames the user removed (`canvas/frame-delete/` keeps only the removed list of one call). So the run-end call passes `pages`: only the pages that this run created (from the run's write paths). A page that the user removed earlier and the run did not write is never added back. A direct call with `pages: null` takes every unframed linked page.
   - Run end: `sdk-driver.ts` calls it once after the last write of an HTML prototype or flow run and before the screen check, and adds a run note line ("Studio placed 2 frames: Plan picker, Confirmation."). One import line and one call line; the logic goes in a new `agent/flow-frames.ts` (`sdk-driver.ts` is 1622 lines, L2a).
   - Then drop the `canvas_list` and `canvas_place` sentence from `FLOW_STEP` (`run-level.ts`) for HTML projects only, so the agent spends no turns on it. React prototypes and app flows keep the sentence: the fallback does not cover them. Keep the `prompt.ts` `canvas_place` line for states and compares.
2. **Play or share starts on the wrong screen, or frames are out of order:** fixed by the start point and link order in seam 1.
3. **The share link only opens on this computer and the user does not know it** (the link is on a local listener unless Allow on local network is on): change only the share dialog copy line under the URL, in `share-publish-ship-export/copy.ts`. Do not change the LAN default (user decision).
4. **Anything else the run shows:** fix it only if it stays in the owned files; else write it under "Left out" with the run that showed it.

**Stage C: gate (real run on the branch).** The same prompt on a fresh data folder. Pass when: the canvas shows 3 labelled frames left to right with no overlap, Play and the share link at 390 px tap through all 3 screens, no step needed a manual fix, and time from Enter to a working share link is lower than the baseline. Report both tables side by side, model turns and cost. Budget: 1 baseline, 1 gate, 1 re-run after a fix (3 short runs).

**Headless.**
- New action `canvas.createPageFrames`: POST, route as the stamp derives it (nearby pattern: `create-linked-frame.ts` uses `/api/projects/:projectId/canvas/linked-frames`), `access: "edit"`, `needs: "project.update"`, `scope: "project"`, `confirm: "none"`. Input: `projectId`, `directionId` (null for main), `fromFrame` (frame id or `@label`, null for every frame), `pages` (page paths, null for every unframed linked page). Output: `{ frames: [{ id, label, page }], startFrame }` as a `Schema.Struct`. `invalidates`: `canvas.getDoc`, `canvas.listLinks`, `canvas.listImplicitLinks`. Errors `BadRequest` (not an HTML project), `NotFound`.
- MCP and agent name: `create_page_frames_canvas` (derived; `mcp { name }`, agent `{ lean: true, name, set: "core", short }`). An outside agent that writes pages over MCP calls it once instead of one `canvas_place` per page.
- Stamp with `pnpm run new:action` (`apps/desktop/package.json` runs `tsx scripts/new-action.ts`; read its usage line for the argument shape), then `pnpm exec tsx scripts/gen-routes.ts`.

**Main files.** New `actions/src/canvas/create-page-frames.ts` (+ schema in a new `actions/src/canvas/page-frames/schema.ts`, not `canvas/schema.ts`), new `handlers/canvas/create-page-frames.ts`, new `server/canvas/page-frames/{page-frames-writer.ts,index.ts}` and pure `engine/to-page-frames.ts`, `server/canvas/index.ts` (export), `handlers/canvas/live.ts` (only if the writer is a new service), new `agent/flow-frames.ts`, `agent/sdk-driver.ts` (import and call line only), `agent/run-level.ts` (`FLOW_STEP` only). Only if stage A shows it: `share-publish-ship-export/copy.ts` (one line). Read but do not edit `share/page-import/place-frame.ts` (pick 2 owns page-import).

**Verify in the running app.**
- No model: `pnpm exec tsx scripts/call-action.ts canvas.createPageFrames '<json>'` on a seeded HTML project with `index.html` linking to `plans.html` linking to `done.html` and one frame: http, mcp and agent match; 2 frames added, labels from the titles; a second call adds 0; `Mod+Z` removes both in one step. Delete one frame, then run a mock run that writes only `index.html`: the deleted frame is not added back.
- Mock run (`STUDIO_AGENT=mock`) that writes 3 pages and no `canvas_place`: the run note line shows and 3 frames are on the canvas.
- Real runs: stages A and C above (needs a short real-model run). Dark and light screenshots of the canvas, Play and the share page at 390 px.

---

## 2. route-auto: route copy keeps auto margins (Bonaparte)

**Why.** A prototype beside a real app starts as a route copy. Bonaparte centers its pages with `mx-auto` and pushes actions right with `ml-auto`. The copier writes the used px value, so the copy is not centered at any other frame width, and Move to app then compares or writes a px margin that the app never had.

**Behaviour.**
- In `collect-script.ts`, for each element whose computed `margin-left` or `margin-right` is not 0, find out if the specified value is `auto`:
  1. First try `el.computedStyleMap().get("margin-left")`: if Chromium returns the keyword `auto`, use it (check this first in the running page and write the result in the report).
  2. Else use a layout test: set the inline margin of that side to `auto`, compare `getBoundingClientRect().left` and `width` with the values before, restore the inline style. Equal within 0.5 px: write `auto`. Only test elements that are in flow (`position` static or relative) and whose parent is block or flex.
- `mx-auto` becomes `margin-left: auto; margin-right: auto`; `ml-auto` in a flex row becomes `margin-left: auto`. Any other margin stays as now.
- Cap the extra layout reads (for example the first 2,000 elements with a non-zero side margin) so a big page does not slow the copy; write the copy time before and after in the report.
- No change to the values pass. It must not pair an `auto` side as a px diff; if it does, write it under "Left out" (pick owner is the port code, not this pick).

**Headless.** No new action. `create_prototype_project` (route copy) and `import_source_page` give the same output on every surface; their schemas do not change.

**Main files.** `share/page-import/collect-script.ts` (owner), `share/page-import/styles.ts` only if the style writer drops `auto`. `collect-script.ts` is a string source: keep it in the parent file (W17), and keep the `__name` shim rule (W21) if any function is serialized.

**Verify in the running app.**
- New fake app `ds-wt/am-next`: Next 16, Tailwind 4, a route `/visits` with `<main class="mx-auto max-w-5xl px-6">`, a header row with a title and an `ml-auto` button, and a centered `mx-auto w-fit` empty state.
- Route copy of `/visits` (UI: Prototype beside app; MCP: `create_prototype_project`): the copy's style has `margin-left: auto` for the 3 elements. Resize the frame to 1024 and 390 px: the content stays centered and the button stays right. On main the same copy is off center at 1024 px.
- Re-run real-proof fixture A (`ds-wt/rp-next-tw`) on a fresh copy without its auto-reset script, with the mock `[port-bash]` driver: `port.inspect` start score is the same or higher than with the reset script, and the values pass lists no margin pair for the `mx-auto` element.
- Copy time of a 1,500-node route: report main and branch.
- Dark and light screenshots of the copy at 1440 and 390 px. No real-model run needed. Never route-copy into or write to Bonaparte.

---

## 3. kit-render: the kit check scans the rendered page (AI quality)

**Why.** A prototype beside an app must use the app kit, so Move to app maps it to real parts. The check reads static HTML, so pills, cards and buttons that a script builds from an array pass unchecked. List and table prototypes build rows from arrays all the time, and that is where status pills live.

**Behaviour.**
- `listPrototypeDrift` scans the rendered DOM of each page as well as the static file: open the page in the preview (the same page probe `render_check` uses), wait for load, take `document.body.outerHTML` after scripts ran, and pass it to the same pure engine. One render per page per check; reuse an open preview page when one is open.
- Merge finds: a find that is also in the static file keeps its static line and selector, as now. A find only in the rendered DOM is script-built: its new field `isScriptBuilt: true` and the fix line in the kit note says "This markup is built by a script: change the template in the <script> of <page> (search for '<short text>')." Static finds get `isScriptBuilt: false`.
- A render error or timeout: fall back to the static scan only, and the note says the rendered scan was skipped.
- **data-slot gap.** Button and Table finds in `to-markup-drift.ts` must not pass on `data-slot` alone, as cards were fixed in `5d9cdc283`: they pass only with the recipe base classes (or the kit component in JSX).
- The kit note says "parts" (not "controls") when it lists cards, tables and badges (the shared clause real-proof left out).

**Headless.** No new action. `kit-drift.list` (`list_kit_drift`) returns the new `isScriptBuilt` field (required boolean, L14). The tool is in no MCP snapshot. If the description changes, keep it 20 to 600 chars (E10) and run `pnpm exec tsx scripts/gen-routes.ts`.

**Main files.** `components/kit-drift/kit-drift-prototype.ts` (render input; keep it under 500 lines, put the render call in a new `components/kit-drift/kit-drift-render.ts`), `components/kit-drift/kit-drift-list.ts` (field), `components/kit-drift/engine/{to-markup-drift.ts,types.ts,to-drift-matches.ts}`, `actions/src/kit-drift/{schema.ts,list.ts}`, `agent/prototype-kit-review.ts` (fix line and "parts"). If the preview page import needs it, import from a leaf such as `preview/page-capture/index.ts`, never the `preview/index.ts` barrel (W19b). A service that opens a page is `access: "read"` only if it takes no screenshot and writes nothing (S6a).

**Verify in the running app.**
- New fake app `ds-wt/kr-next`: Next 16, Tailwind 4, shadcn-style Badge, Card, Button and Table. A prototype beside it with a visit list built in a `<script>` from a 6-item array (each row: hand-styled status pill and a hand-styled button), 2 static hand-styled pills, and 1 `<button data-slot="button">` with no recipe classes.
- No model: `pnpm exec tsx scripts/call-action.ts kit-drift.list '<json>'`: http, mcp and agent match; 6 script-built pill finds and 6 button finds with `isScriptBuilt: true`, 2 static pill finds with `isScriptBuilt: false`, 1 button find for the `data-slot`-only button. On main: 2 pill finds.
- **Real-model run (short, 2 runs):** a new prototype beside `kr-next`, prompt "a visit list built from a JS array, 8 rows, with a status pill and a Reschedule button per row", on main and on the branch. Score both with the branch `list_kit_drift`. Gate: 0 hand-styled pills and buttons at the end on the branch. Report first-pass finds, loops, seconds and cost.
- Dark and light screenshots of the prototype and the run note.

---

## 4. range-keys: text keys style the selected range (Figma)

**Why.** In Figma, `Mod+B` on a selected word bolds that word. Here the range bar can do it, but the keys style the whole layer or leave the browser's own `<b>`. A designer types and styles in one motion.

**Behaviour.** In a text edit (Enter on a layer) with a non-empty range selected:
- `Mod+B` toggles bold on the range, `Mod+U` underline, `Mod+Shift+X` strikethrough. Each is one `text.applyRange` write: one version, one undo step. If the whole range already has the style, the write removes it (`isRemove: true`).
- The bridge keeps calling `preventDefault`, so the browser writes no `<b>` or `<u>`. The text edit stays open and the range stays selected after the write.
- With no range (caret only), the keys act on the whole layer, as text-keys does now.
- `Mod+I` stays "Ask the chat about the selection"; italic stays in the range bar.
- **Text layer rule.** Outside a text edit, the text keys act only on layers whose children are text or inline elements (no block child). A card that holds text gets a toast with the reason, not a style write (text-keys "Left out").
- The keys show in the shortcut sheet only. The range bar gets no new button.

**Headless.** `text.applyRange` (`apply_range_text`) gets 2 new style values: `underline` (writes `<u>` in HTML; in JSX a `<span className="underline">` when Tailwind, else `<u>`) and `strike` (`<s>`, or `line-through`). This changes the `TEXT_RANGE_STYLES` literal union: grep every `Record<` and switch over it before the commit. The tool is in no MCP snapshot. Update the field description (E10) and run `pnpm exec tsx scripts/gen-routes.ts`. MCP clients and the agent get the same result with the same tool.

**Main files.** `actions/src/text/schema.ts` (`TEXT_RANGE_STYLES` and its description), the server range writer (`server/text/**`, find the `bold` case of `text.applyRange`), `bridge/text-edit.ts` and `bridge/keyboard.ts` (send the range with the key), `ui/features/inspector/{use-text-keys.ts,text-keys-model.ts}` (range path and the text layer rule), `ui/features/inspector/copy.ts` (one toast line). If the bridge needs a message type, add it in `actions/src/bridge-protocol.ts`.

**Verify in the running app.**
- HTML prototype: Enter on a paragraph, select one word, `Mod+B`: the source has `<strong>` around the word only; again: removed. `Mod+U` and `Mod+Shift+X` the same with `<u>` and `<s>`. One `Mod+Z` per press.
- Tailwind JSX route copy in a fake app (`ds-wt/rk-next`): `Mod+U` on a range writes a `span` with `underline`.
- A card with text, `Mod+B` outside a text edit: toast, no source change.
- `pnpm exec tsx scripts/call-action.ts text.applyRange '<json>'` with `style: "strike"`: http, mcp and agent match.
- Dark and light screenshots of the range in the frame and the toast. No real-model run.

---

## 5. polish-34: small open items

**Items.**
- **Steer keeps a port run going.** A steer at the start of a Move to app run cancels the run with no follow-up over the API. Find why `next()` does not start the steer text for a port run (the port run starts a fresh session, cycle 32), and fix it so the steer text runs as the next turn of the same port run, with the same port scope and studio check. Keep `lifecycle.ts` at its line count or lower (1058 lines, L2a): put new logic in a sibling file.
- **Crash snapshot folders cleaned.** The snapshot cap in `port-review-snapshot.ts` also removes `pending-<uuid>` folders older than 1 hour. A live run's pending folder is never removed.
- **Time `port.start` on a big repo.** On the cycle-33 clone `ds-wt/po-bp` (or a fresh `git clone --no-local` of Bonaparte, read only), time `port.start` to run start 5 times with the mock driver. Report p50. If it is 2 s or more, write the top blocking step in the report under "Left out" with its file.

**Headless.** No new action or tool. `run.setSteer` (`POST /api/projects/:projectId/runs/:runId/steer`) is `mcp` and `agent` `{ off: "run-control" }`, so the fix must work over the UI (chat composer during a run) and the HTTP API.

**Main files.** `agent/lifecycle.ts` (steer path only), new sibling file if needed, `agent/port-start.ts` only for the steer hand-off, `agent/port-review-snapshot.ts` (cap). Not `agent/sdk-driver.ts` (pick 1 owns its import and call lines); if the steer fix needs it, write it under "Left out".

**Verify in the running app.**
- Mock port run on `ds-wt/p34-next` (small fake Next app): steer at 1 s with "Keep the header as it is": the run goes on, the run log shows the steer turn, the studio check runs, the final state is `done`, not `canceled`. Same over the HTTP steer route.
- Make a `pending-x` folder with an mtime 2 hours ago: the next snapshot removes it; a fresh one stays.
- `port.start` p50 on the clone, main and branch.
- Dark and light screenshots of the run chat after the steer. No real-model run.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 flow-frames | new `actions/src/canvas/{create-page-frames.ts,page-frames/schema.ts}`; new `handlers/canvas/create-page-frames.ts`; new `server/canvas/page-frames/**`; `server/canvas/index.ts` (one export); `handlers/canvas/live.ts` (only if needed); new `agent/flow-frames.ts`; `agent/sdk-driver.ts` (import and call line); `agent/run-level.ts` (`FLOW_STEP`); `share-publish-ship-export/copy.ts` (one line, only if stage A shows it); fixtures `ds-wt/fs-*` |
| 2 route-auto | `share/page-import/collect-script.ts`; `share/page-import/styles.ts` (only if needed); fixture `ds-wt/am-next`; fresh copies of `ds-wt/rp-next-tw` |
| 3 kit-render | `components/kit-drift/{kit-drift-prototype.ts,kit-drift-list.ts}` and new `kit-drift-render.ts`; `components/kit-drift/engine/{to-markup-drift.ts,types.ts,to-drift-matches.ts}`; `actions/src/kit-drift/{schema.ts,list.ts}`; `agent/prototype-kit-review.ts`; fixture `ds-wt/kr-next` |
| 4 range-keys | `actions/src/text/schema.ts`; the server `text.applyRange` writer; `bridge/{text-edit.ts,keyboard.ts}`; `ui/features/inspector/{use-text-keys.ts,text-keys-model.ts,copy.ts}`; `actions/src/bridge-protocol.ts` (only if needed); fixture `ds-wt/rk-next` |
| 5 polish-34 | `agent/lifecycle.ts` (steer path) and a new sibling; `agent/port-start.ts` (steer hand-off only); `agent/port-review-snapshot.ts` (cap); fixtures `ds-wt/p34-next`, `ds-wt/po-bp` (read only) |

Shared files and conflict warnings:
- **`agent/sdk-driver.ts` (pick 1 only).** Pick 1 adds one import line and one call line. Pick 5 must not touch it. Pick 3 changes the kit check through `prototype-kit-review.ts` and `kit-drift-prototype.ts`, not the run-end hook.
- **Run-end order (picks 1 and 3).** Pick 1's frame step runs before the screen check; pick 3's rendered kit scan runs inside the existing kit check in `final-check.ts`, which neither pick edits. If pick 3 needs a `final-check.ts` line, it is the only owner of that file.
- **Preview page use (picks 1 and 3).** Pick 3 opens rendered pages through a preview leaf index. Pick 1 reads links through `canvas/links` and opens no page. Neither edits `preview/**`.
- **`share/**` (picks 1 and 2).** Pick 2 owns `share/page-import/**`. Pick 1 may read `share/page-import/place-frame.ts` but not edit it, and edits only `share-publish-ship-export/copy.ts` in the UI.
- **Unions.** Pick 3 adds the `isScriptBuilt` field to the kit-drift find schema (a struct, not the `DriftTag` union). Pick 4 adds 2 members to `TEXT_RANGE_STYLES`. No two picks change one union.
- **`copy.ts`.** Pick 1: `share-publish-ship-export/copy.ts` (maybe). Pick 4: `inspector/copy.ts`. No other pick.
- **`port-start.ts` (pick 5 only)** this cycle. No other pick touches the port code.
- **`@generated` lists.** Pick 1 adds an action; picks 3 and 4 may change action text. Each runs `pnpm exec tsx scripts/gen-routes.ts`; after each merge run `gen-routes --check`, and regenerate (never hand-merge) the generated files on a conflict.
- **Hand aggregators.** No pick edits `agent-tools/registry.ts`, `mcp/registry.ts`, `actions/index.ts`, `main/live-layer.ts` or `http/mount-all.ts`. Pick 1's new service, if any, goes in `handlers/canvas/live.ts`.
- **MCP snapshots.** No pick changes a tool in `artifacts/mcp-snapshots/*.json` (`create_share_link` in `share.json` keeps its input).
- **Long files.** `sdk-driver.ts` (1622), `lifecycle.ts` (1058), `final-check.ts` (537): add net zero lines; put logic in new files.
- **Fake apps under `ds-wt`.** Each pick has its own prefix (`fs-`, `am-`, `kr-`, `rk-`, `p34-`). No pick writes into Bonaparte; pick 5 reads it once through `git clone --no-local`. No Move to app run targets Bonaparte or the clone.
- **`.claude/goal/roadmap.md` Appendix A:** add each pick's new files when the file is in the worktree (L6e).

## Merge order

All 5 can run at once. Merge in this order:
1. **polish-34**: port and lifecycle files only; nothing else depends on it.
2. **route-auto**: page-import only; re-run the fixture A mock check after merge.
3. **kit-render**: kit-drift files and `prototype-kit-review.ts`; run `gen-routes --check` and `pnpm run typecheck`.
4. **range-keys**: text schema, bridge and inspector; run `gen-routes --check` and `pnpm run typecheck` (`TEXT_RANGE_STYLES` and bridge message types are shared types).
5. **flow-frames**: last, because it adds an action (generated lists) and the `sdk-driver.ts` hook; regenerate with `pnpm exec tsx scripts/gen-routes.ts` after the rebase.

After the last merge, run `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run check:scripts`, `pnpm run lint:gate`, `pnpm run build:ui`, `pnpm exec tsx scripts/check-bundle.ts` and `pnpm exec tsx scripts/check-boot-imports.ts`. Then `pnpm run desktop:pack`. Then one real-model session of 2 runs on merged main, each with a fresh data folder:
1. The pick 1 prompt from Home to a share link at 390 px: 3 frames, no manual fix, time at or under the branch gate.
2. A list prototype beside a fresh `kr-next` copy whose route copy came from `am-next`-style `mx-auto` layout: centered copy, 0 hand-styled pills and buttons at the end.

Real-model checks (local Claude Code sign-in, short runs; Move to app only into a fake Next app under `ds-wt`, never Bonaparte):
- pick 1: 3 runs (baseline, gate, one re-run);
- pick 3: 2 runs (main and branch);
- the final merged session (2 runs).

Picks 2, 4 and 5 need none.

## Runners-up

1. Flow onto existing routes: Move to app of a flow still refuses routes that exist (route-apply "Left out" since cycle 28).
2. Skeleton states in the kit check: Bonaparte uses `<Skeleton` in 504 files; flag hand-made gray loading blocks in data-state frames.
3. Cards and badges in app source: `toDriftTag` never returns `card` or `badge` for TSX, and `apply_kit_drift` has no card or badge splice.
4. Cold project open: about 11 reads each wait about 170 ms on the first open after boot; measure the blocking task first.
5. Flow consistency check: after a flow run, flag drift in the shared header, nav and `:root` tokens across the pages.
6. Port plain CSS path: build and check `rf-next-rt`; it is not known if `port.apply` lands a style edit as inline JSX style.
7. Photo slots from the image provider: when `create_image` has a key, offer generated images for art slots, as an opt-in cost.
8. Canvas memory (doop): a design note on the canvas that every new frame and run in the project reads.
9. Figma variables JSON import and export into project tokens.
10. Second flow measure: time "prototype beside the app -> Move to app" on a fresh user setup and remove its worst step (pick 1's method, the other flow).

Sources: [Figma release notes](https://figma.com/release-notes), [Figma release notes archive](https://www.figma.com/release-notes/archive/?page=2), [Figma What's new](https://www.figma.com/whats-new/), [releases.sh Figma](https://releases.sh/figma/figma-release-notes), [mcp.directory 2026 comparison](https://mcp.directory/blog/claude-design-vs-stitch-vs-v0-vs-lovable-vs-figma-make-2026), [banani.co Claude Design review](https://www.banani.co/blog/claude-design-review), [mejba.me Claude Design first look](https://www.mejba.me/pt/blog/claude-design-anthropic-first-look), [monkfrom.earth Claude Design vs Figma, Lovable, v0](https://monkfrom.earth/blogs/claude-design-vs-figma-lovable-v0).

## Results

- **Merged:** all 5 into main in order (polish-34, route-auto, kit-render, range-keys, flow-frames), no conflicts. Main at `924c13259`.
- **Checks:** gen-routes --check, typecheck, lint:gate (59604, baseline 89733), build:ui pass. check:clip 0 findings.
- **Installed:** desktop:pack passed, reinstalled to /Applications. :4570 answers 200. Idle CPU 0.02 CPU-s per 60 s.
- **flow-frames:** 3-screen flow run 79 s / $0.22 (main 107 s / $0.35). Canvas tool calls 0 (main 4).
- **route-auto:** route copy keeps `margin: auto`. Port score 100 (11 with fixed px).
- **kit-render:** real run left 0 hand-styled parts (main 16).
- **range-keys:** Mod+B/U/Shift+X style only the selected range.
- **polish-34:** steer starts a follow-up port run; stale pending snapshot folders cleaned.
- **Open:** text edit closes after a range write; a second styled word in one line fails; queued messages during a port run are dropped; first `port.start` on a large repo is slow (`git add -A`).
