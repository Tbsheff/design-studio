# Feature cycle 35: next 5 features

Date: 2026-11-14. Main at `2197e34d9` (all 5 cycle-34 picks merged at `924c13259`).

## Method

- Read `cycle-34.md` (picks, runners-up, Results "Open"), `cycle-34/{flow-frames,route-auto,kit-render,range-keys,polish-34}.md` and `cycle-33/{real-proof,port-objects,kit-badges,text-keys,polish-33}.md` ("Left out"), `git log --oneline -15` and `git branch -a`.
- Read the code for each pick:
  - Text edit: `bridge/{text-edit.ts,text-range.ts}`, `ui/features/text-range/{use-text-range-apply.ts,use-text-range-feed.ts}`, `server/style-scope/text-search/{apply-range.ts,wrap-range.ts,segment.ts,scan-html.ts}`.
  - Flow onto app: `agent/{port-start.ts,port-plan.ts,port-route-update.ts,port-review-snapshot.ts,port-review.ts}`.
  - Flow check: `agent/{prototype-review.ts,final-check.ts,flow-frames.ts}`, `server/canvas/page-match/**`, `actions/src/page/{inspect-matches.ts,update-matches.ts}`.
  - Phone Play: `ui/features/share-viewer/{share-viewer-model.ts,use-share-viewer.ts}`, `ui/features/canvas/{play-model.ts,play-frame.tsx,play-slot-view.tsx,use-prototype.tsx}`, `ui/app/share-viewer-app.tsx`.
  - Open items: `agent/lifecycle.ts` (`setQueue`, `steer`, `next`), `http/run-follow-up.ts` (`toNextRequest`), `agent/port-review-snapshot.ts` (`createTree`).
- Counted in Bonaparte (read only, `git ls-files` and `git grep`): 259 `page.tsx` and 55 `layout.tsx` files in `apps/dashboard`; 51 dashboard TSX files with `<header` or `<nav`.
- No real-model run and no app run for this research.

### Open items from cycle 34, and the pick that closes each

| Open item | Pick |
|---|---|
| The text edit closes after a range write | 1 mixed-range |
| A second styled word in one line fails | 1 mixed-range |
| Messages queued during a port run are dropped | 5 polish-35 |
| The first `port.start` on a large repo is slow (`git add -A` in `createTree`) | 5 polish-35 |

### Findings

- **Figma gap: rich text in one line (open items 1 and 2).**
  - `canEdit` in `bridge/text-edit.ts` needs `element.children.length === 0`. A line such as `Book <strong>today</strong> and save` has an element child, so Enter starts no edit, and no range can be selected on it. After the first `Mod+B`, the line has a `<strong>`, so the second word cannot be styled. Figma styles any range in a text layer.
  - `useTextRangeApply` posts `text-edit-stop` before each write (`port.current?.post({ type: "text-edit-stop" })`), and the frame then reloads. So every range write ends the edit.
  - The writer already supports most of the fix. `toPlaced` in `wrap-range.ts` finds each own text segment of the layer inside the rendered text (`spec.text`, which is the full `textContent`) with `indexOf`. So a range inside " and save" places correctly even with the `<strong>` before it. A range that crosses into the child, or lies inside it, gets `null` places and fails with `CROSS_MESSAGE`. A range inside the `<strong>` must target the child layer (its own line and column), with offsets relative to the child. This is a bridge change, not a writer change. The writer files are "read, change only if the verify shows a gap".
  - Typing is not safe on a mixed layer. `text-commit` sends `textContent` and the writer replaces the layer text, so typing would flatten the `<strong>`. The edit on a mixed layer must block typing (range mode), as range-keys "Left out" said.
- **Bonaparte path: Move to app of a flow refuses routes that exist.** `startFlowRun` in `port-start.ts` builds `toTakenText(flow)` from `page.routeExists` and throws `ConflictError("The app already has ... Pick a new base path.")`. A one-page Move to app onto an existing route already works: `startPageRun` calls `toRouteUpdate` (`port-route-update.ts`), which adds the route file now, the file at copy time and a diff, with the rule "Update it in place". A flow of 2 or 3 existing Bonaparte pages (list, detail, edit) is the common redesign case (259 dashboard routes). This is runner-up 1 in cycles 28 to 34.
  - Restore covers it. `createTree` snapshots the whole work tree (`git add -A` on an index copy), and `restoreRouteSnapshot` takes a file list. So the start snapshot holds every existing route file of the flow. `toStartResult` reports only `flow.pages[0]?.routeFile` as `routeFile`, but `routes` lists every page with its `routeFile`. The pick must check that the review and restore use `routes`, not `routeFile`.
- **AI quality: a flow's pages drift apart, and no check sees it.** `toPrototypeReviewGaps` (`prototype-review.ts`) checks the kit, the mobile shot and a review after the last edit. Each check is for one page. Nothing compares pages. The tools exist for one layer at a time: `page.inspectMatches` (`inspect_matches_page`) finds the same nav or footer on other pages and reports `isSame: false` when its copy changed, and `page.updateMatches` copies one layer's markup to them. A model that writes 3 pages in 3 turns often changes the header, nav items, `:root` values or the font link between pages. Claude Design and Figma Make keep one header across screens because they share one file.
- **Claude Design quality: a shared flow on a phone shows a tiny desktop page.** `isPhoneViewer()` (coarse pointer or width under 768) sets `isFullBleed: true`. In `scaleFor` (`play-model.ts`), full bleed scales the frame to the stage: `Math.min(stage.width / frame.width, ...)`. Flow frames are 1440 px wide (flow-frames "Left out": both runs showed it), so at 390 px the page is drawn at 27 percent. HTML prototypes are responsive: they can lay out at the phone width. Only the share viewer sets full bleed; the in-app canvas passes `isFullBleed={false}` (`use-prototype.tsx`).
- **Open items 3 and 4 (polish).**
  - `toNextRequest` in `http/run-follow-up.ts`: for a port request, `if (next.reason !== "steer") return null;`. `lifecycle.ts` `next()` returns `reason: "queue"` with the queue text, and the follow-up drops it. The chat showed the message as queued, so the user thinks it will run.
  - `createTree` runs `git add -A` with `GIT_INDEX_FILE` on a copy of the app index and a separate `GIT_OBJECT_DIRECTORY`. On the 46,860-file clone, the first call took 10.1 s on main and 2.8 s after polish-34; later calls take about 0.5 s (polish-34 "Left out").
- **Checked and not picked:**
  - Cards and badges in TSX app source (`toDriftTag`): real but large; kept as a runner-up.
  - Canvas hide and lock keys, `Mod+]` and `Mod+[`: user decisions (cycle 34).
  - A re-add record for removed frames (flow-frames "Left out"): low use.
  - Tailwind detection by `cn(...)` only (range-keys "Left out"): small, kept as a runner-up.
- **Competitor recheck (5 web searches, 2026-11-14).**
  - Claude Design: the confirmed news is still the June 2026 update (design-system import from GitHub, design files or uploads; closer Claude Code sync; more export targets). No confirmed November change. This supports the Bonaparte and kit direction: start from the real repo and keep the real parts.
  - Figma: Make has an editing panel (July 2026) and npm package import. Text wrap got Balance and Pretty. No new text-range feature found.
  - v0 and Lovable: Lovable has a Design view with visual edits and themes. No new v0 item found.
  - open design (nexu-io): local-first, uses the coding agents you have, latest found release v0.13.0 (July 2026). Nothing new since cycle 34.
  - doop: open-source canvas where Claude Code and Codex build HTML frames live over MCP (v0.1.0 August 2026). Nothing new since cycle 34.
  - The bar stays the same: one prompt to a shared, clickable flow that reads well on a phone; real-repo flows; prototypes that keep one look across screens.
- **Branch check.** No `feat/mixed-range`, `feat/flow-update`, `feat/flow-match`, `feat/phone-play` or `feat/polish-35` (and no branch that contains these keys). Near names that exist and are not used: `cyc9/feat-text-range`, `feat/range-keys`, `feat/route-apply`, `feat/route-merge`, `feat/route-sync`, `feat/r16-port-flow`, `feat/flow-frames`, `feat/shared-layers`, `feat/polish-33`.

## Ranking

Score = value x fit with "simple and fast" / effort (1 to 5 each).

| Rank | Key | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|---|
| 1 | flow-update | Move to app of a flow updates existing app routes in place, as one page already does (Bonaparte) | 5 | 5 | 3 | 8.3 |
| 2 | flow-match | The prototype check compares the pages of a flow: header, nav, footer, `:root` values and font links (AI quality) | 4 | 5 | 3 | 6.7 |
| 3 | mixed-range | Style a second word in a line that has styled text, and the text edit stays open after a range write (Figma) | 4 | 5 | 3 | 6.7 |
| 4 | phone-play | Share Play on a phone lays out an HTML page at the phone width, not a scaled 1440 px page (Claude Design quality) | 4 | 5 | 2 | 10 |
| 5 | polish-35 | A message queued during a port run runs after it; the first `port.start` on a big repo is fast | 3 | 5 | 2 | 7.5 |

No pick adds an always-visible control:
- Pick 1 removes a refusal; the Move to app dialog keeps its fields.
- Pick 2 adds review lines and one read action; no new UI.
- Pick 3 changes text-edit behaviour; the range bar keeps its buttons; one shortcut sheet line at most.
- Pick 4 changes Play sizing in the share viewer only.
- Pick 5 fixes existing paths.

---

## 1. flow-update: a flow moves onto existing app routes (Bonaparte)

**Why.** The main Bonaparte use is to redesign pages that exist: a list, its detail and its edit page. One page can move onto its existing route today. A flow of those pages is refused with "The app already has ... Pick a new base path.", so the user must move each page alone and lose the link map between them.

**Behaviour.**
- `startFlowRun` no longer throws on a taken route. For each flow page whose `routeExists` is true, it builds the same route update as `startPageRun`: `toRouteUpdate(input, page.plan)`. New pages stay as now.
- The flow prompt gets one `route-update` block per existing page (route file now, file at copy time, diff), plus the line "These route files exist in the app. Update them in place. Do not make new routes." Put the per-page assembly in a new `agent/port-flow-update.ts`; `port-plan.ts` is 1295 lines and `port-start.ts` is 384 (L2a: net zero growth in `port-plan.ts`).
- Prompt size: `ROUTE_TEXT_MAX` (24,000) is per route. Cap the sum for a flow at 3 existing routes in full; for more, send the diff block only and name the file. Write the prompt length per page count in the report.
- Mixed flows (some pages new, some existing) work: new pages get new route files, and the link map points to the existing app paths.
- The Move to app dialog shows the routes it will update as text in the existing route list ("updates `/visits` (`app/visits/page.tsx`)"). No new control.
- Review and restore: the start snapshot is the whole work tree, so restore can bring back every route file. Check that `port-review.ts` and the restore path read `result.routes[*].routeFile`, not only `routeFile` (the first page). If a path reads only the first, fix it in `port-flow-update.ts` or the one call line.

**Headless.** No new action. `port.start` (`start_port`, `errors: [BadRequest, Conflict, NotFound]`) takes the same input. Its result already lists `routes` with `routeFile`. Its `errors` list keeps `Conflict` for other cases; if no other case throws it, remove it and say so in the commit. The tool is in an MCP snapshot only if `artifacts/mcp-snapshots/*.json` lists it: the input must not change (N4).

**Main files.** `agent/port-start.ts` (`startFlowRun` and `toTakenText` only), new `agent/port-flow-update.ts`, `agent/port-start-prompt.ts` (`toFlowPrompt`: take the update blocks), `agent/port-route-update.ts` (export a per-page builder only if needed), `agent/port-review.ts` (only if it reads the first `routeFile` alone). The Move to app dialog copy line, only if the route list shows no "updates" text today. Do not edit `port-review-snapshot.ts` (pick 5 owns it).

**Verify in the running app.**
- New fake app `ds-wt/fu-next`: Next 16, Tailwind 4, routes `/visits` (list), `/visits/[id]` (detail) and `/visits/[id]/edit` (form), each with a header row and data from a local `data.ts`. A prototype beside it (route copy of `/visits`, then 2 linked pages for detail and edit).
- No model: `port.start` with `flow: true` over HTTP and MCP on main returns Conflict; on the branch it returns a run id and 3 `routes` with their files. Run with the mock `[port-bash]` driver: the run log prompt has 3 `route-update` blocks.
- **Real-model run (2 short runs, Sonnet, fresh data folder):** Move to app of the 3-page flow onto `fu-next`. Pass: the 3 existing route files change in place, no new route folder, the data reads stay, links go to the app paths, `next build` passes, and the studio check score is 80 or more. One re-run after a fix. Never target Bonaparte.
- Restore: after the run, undo the Move to app: all 3 files return to the snapshot.
- Dark and light screenshots of the Move to app dialog route list and the 3 app pages.

---

## 2. flow-match: the prototype check compares the pages of a flow (AI quality)

**Why.** A flow looks broken when its header changes between screens. The model writes each page in its own turn, so drift is common. The studio already finds the same nav on other pages, but only when a user picks a layer.

**Behaviour.**
- At the prototype review (`toPrototypeReviewGaps`), when the run wrote 2 or more HTML pages that link to each other, a new pure engine compares them:
  1. **Shared parts.** On the entry page, take the first `header`, `nav` and `footer` (and `[role=banner]`, `[role=navigation]`). For each other page, use the page-match engine (`canvas/page-match/engine/to-page-matches.ts`) to find the same element. A part that is missing on a page, or has `isSame: false` (text or structure changed beyond `aria-current` and active classes), is a gap.
  2. **Tokens.** Compare `:root` custom properties: a name with a different value on one page is a gap.
  3. **Fonts and sheets.** Compare `<link rel="stylesheet">` hrefs and font links: a page that lacks one is a gap.
- Each gap is one review line the agent must fix before the run ends, as kit lines are: "Flow: the nav on plans.html differs from index.html (2 items changed). Copy it with update_matches_page, or change both on purpose." Max 6 lines; the rest as a count.
- A part that differs on purpose (for example an active item) is ignored by the match rules already. A user prompt that asks for a different header on one page is a known false find: the line says "or change both on purpose", and the gap goes once the agent answers in the review.
- Pages that a script builds are read as static files (kit-render covers rendered markup; this pick does not render).

**Headless.** New read action `page.inspectFlow`:
- `GET`, path as the stamp derives it (nearby: `/api/projects/:projectId/d/:directionId/pages/matches`), `access: "read"`, `needs: "project.read"`, `scope: "project"`, `confirm: "none"`.
- Input: `projectId`, `directionId`, `entry` (page path, null for the start page). It is an `inspect` report, not a list, so no `PageFields`. Output: `{ pages: [...], gaps: [{ kind, page, part, detail }] }` as a `Schema.Struct`, `kind` a literal union (`part-missing`, `part-changed`, `token-changed`, `sheet-missing`) in a new `actions/src/page/flow/schema.ts`.
- `invalidates: []` (read). Errors `BadRequest` (not an HTML project), `NotFound`.
- MCP and agent name `inspect_flow_page` (derived; `mcp { name }`, agent `{ lean: true, name, set: "core", short }`). An outside agent that wrote pages over MCP calls it once before it shares.
- Stamp with `pnpm run new:action` (read its usage line), then `pnpm exec tsx scripts/gen-routes.ts`.

**Main files.** New `actions/src/page/{inspect-flow.ts,flow/schema.ts}`, new `handlers/page/inspect-flow.ts`, new `server/canvas/page-flow/{page-flow-store.ts,index.ts}` (`access: "read"`, reads files only) and pure `server/canvas/page-flow/engine/to-flow-gaps.ts`, `server/canvas/index.ts` (one export), `handlers/page/live.ts` (provide the store), new `agent/prototype-flow-review.ts`, `agent/prototype-review.ts` (one call line). Read but do not edit `canvas/page-match/**` (import through `canvas/page-match/index.ts`; widen its export there only if needed, and say so).

**Verify in the running app.**
- No model: seeded HTML project, `index.html`, `plans.html`, `done.html`; `plans.html` has a nav with one renamed item and a different `--brand` value. `pnpm exec tsx scripts/call-action.ts page.inspectFlow '<json>'`: http, mcp and agent match; 2 gaps (`part-changed` nav, `token-changed --brand`). Fix with `update_matches_page`: the nav gap goes.
- **Real-model run (2 short runs):** the cycle-34 prompt ("A 3-screen sign-up flow for a yoga studio app: welcome, plan picker, confirmation. Each step links to the next.") plus "each screen has the studio header and nav", on main and on the branch, fresh data folders. Score both with the branch `inspect_flow_page`. Gate: 0 gaps at run end on the branch. Report gaps on main, loops, seconds and cost on both.
- Dark and light screenshots of the 3 frames and the run note.

---

## 3. mixed-range: rich text in one line, and the edit stays open (Figma)

**Why.** In Figma you select a word, press `Mod+B`, select the next word and press `Mod+U`, all in one edit. Here the first write ends the edit, and the line can then not be edited at all, because it holds a `<strong>`.

**Behaviour.**
- **Range mode on a mixed layer.** `canEdit` also accepts a layer whose element children are all inline text tags (`strong`, `b`, `em`, `i`, `u`, `s`, `a`, `span`, `code`, `mark`, `small`, `sub`, `sup`) with no element inside them other than text, under the same text-length cap. On such a layer, Enter starts an edit in range mode:
  - Caret moves, selection, `Mod+A`, the range bar and the range keys work.
  - Typing, paste, delete and IME input are blocked (`beforeinput` `preventDefault`). One toast the first time per layer: "This line has styled text. Select a range to style it. To change the words, edit one part."
  - No `text-commit` is sent from range mode.
- **Range target.** The bridge maps the selection:
  - Inside one own text node of the layer: target is the layer, offsets over its `textContent` (the writer places it today).
  - Inside one inline child: target is the child layer (its selector and source location), offsets over the child text. `Mod+B` on a word that is already in a `<strong>` child removes the bold (`isRemove: true`).
  - Across a child boundary: the bar shows the writer's cross message; no write.
- **Edit stays open.** `useTextRangeApply` no longer posts `text-edit-stop` before the write. After the write and the frame reload, the UI posts a new `text-edit-resume` message with the layer selector and the range (`start`, `end`, text). The bridge finds the element, starts the edit (range mode, as the layer now holds a child), and selects the same characters. If the element or text is not found, the edit stays closed, as now.
- Plain text layers keep today's edit (typing allowed). One write is one version and one undo step, as now.

**Headless.** No new action. `text.applyRange` (`apply_range_text`) input does not change; the child target is a normal `layer`. If the verify shows a writer gap (for example the `isRemove` path on a child), fix it in `wrap-range.ts` and keep its output the same on every surface. The new bridge message types (`text-edit-resume`, the range-mode flag on `text-edit`) go in `actions/src/bridge-protocol.ts` (shared union, see flags).

**Main files.** `bridge/text-edit.ts` (`canEdit`, range mode, resume), `bridge/text-range.ts` (child target), `bridge/message-handlers.ts` (route the resume message), `actions/src/bridge-protocol.ts` (2 message shapes), `ui/features/text-range/{use-text-range-apply.ts,use-text-range.ts,text-range-model.ts,copy.ts}`. Only if the verify needs it: `server/style-scope/text-search/wrap-range.ts`. Keep `text-edit.ts` under 500 lines: put range mode in a new `bridge/text-edit-range-mode.ts`.

**Verify in the running app.**
- HTML prototype, paragraph "Book your first class today and save 20 percent": Enter, select "today", `Mod+B`: `<strong>today</strong>`, the edit stays open with "today" selected. Select "save", `Mod+U`: `<u>save</u>`. Select "today" again, `Mod+B`: bold removed. 3 versions, 3 `Mod+Z` steps.
- Type a letter in range mode: no change, one toast. Escape closes the edit.
- Tailwind JSX route copy in a fake app `ds-wt/mx-next`: the same steps write `span` classes; `next build` passes.
- `pnpm exec tsx scripts/call-action.ts text.applyRange '<json>'` with a child layer target: http, mcp and agent match.
- Dark and light screenshots of the open edit after the second write. No real-model run.

---

## 4. phone-play: share Play fits the phone (Claude Design quality)

**Why.** The share link is the easiest way to show a prototype. Most people open it on a phone. Today they see a 1440 px page drawn at 27 percent, so the text cannot be read and the taps are small.

**Behaviour.**
- In full bleed only (share viewer on a phone), a slot whose frame is an HTML page (the frame has a page `path`) lays out at the stage size: the iframe gets `width = stage.width`, `height = stage.height - FULL_BLEED_HEIGHT_CHROME`, and scale 1. The page scrolls inside the iframe.
- Frames that are not pages (screenshots, imported images, React frames with a fixed size) keep today's scale.
- Rect hotspots: Play reads link rects from the live page (`LayerShot`, `LAYERS_FRESH_MS`), so rects follow the new layout. Check this first. If a link with a drawn hotspot (a stored rect on the frame, not a page element) does not line up, keep the old scale for frames that have such links, and write it under "Left out".
- Overlays (`drawer`, `modal`, `popover`) keep their own rules.
- Desktop share and in-app Play do not change (`isFullBleed={false}` in `use-prototype.tsx`).

**Headless.** No new action or tool. Share links made over MCP (`create_share_link`) get the same viewer.

**Main files.** `ui/features/canvas/play-model.ts` (`scaleFor` and the slot size in full bleed), `ui/features/canvas/play-frame.tsx` (the layout it reads), `ui/features/share-viewer/share-viewer-model.ts` (only if the frame needs a page flag). Keep `play-model.ts` under 500 lines (339 now).

**Verify in the running app.**
- Use the cycle-34 3-screen flow project (or seed one with 3 linked pages). Make a share link (API or Share dialog). Open it at 390 x 844 (`resize_window` mobile): the welcome page shows at phone width with readable text; tap the button: the plan picker opens at phone width; tap through to the confirmation.
- Same link at 1440 px: canvas mode as now; Play as now.
- A share with one image frame at 390 px: scaled as now.
- `pnpm run build:ui`, then `pnpm exec tsx scripts/check-bundle.ts`.
- Dark and light screenshots of each screen at 390 px, main and branch side by side. No real-model run.

---

## 5. polish-35: queued messages in port runs, first `port.start` speed

**Items.**
- **Queued message runs after a port run.** When a port run ends with a queue, `toNextRequest` makes a port follow-up with the queue text, as a steer does now: same port task, scope and studio check, prompt "The user sent this during the Move to app run. Apply it to the same routes:" plus the text. Put the builder in `http/run-follow-up.ts` or a new sibling `http/run-follow-up-port.ts`, not in `port-start.ts` (pick 1 owns it); reuse `toPortSteerRequest` through `agent/index.ts` if its shape fits.
- **First `port.start` on a big repo.** Measure the first call on the clone `ds-wt/po-bp` (or a fresh `git clone --no-local` of Bonaparte, read only) with a fresh studio data folder: split `createIndexCopy`, `git add -A` and `write-tree`. Then apply the first fix that brings it under 2 s, in this order:
  1. Refresh stat data once: `git update-index -q --refresh` on the index copy before `add -A`, so git does not hash every file again.
  2. `-c core.untrackedCache=true -c index.threads=true` on the `add` call.
  3. Build the first snapshot in the background when the app is linked to the project, so `port.start` reuses it.
  - Do not scope `add -A` to the route folder: the snapshot must hold every route file of a flow (pick 1 restores all of them). Scoping to the app folder (`appDir`) is allowed.
  - Keep `port-review-snapshot.ts` under 500 lines (442 now); put new code in a new sibling file.

**Headless.** No new action or tool. The queue fix works over the chat composer and the HTTP queue route (`run.setQueue`; `mcp` and `agent` are `{ off: "run-control" }`).

**Main files.** `http/run-follow-up.ts` (`toNextRequest`), new `http/run-follow-up-port.ts` if needed, `agent/port-review-snapshot.ts` (`createTree`) and a new sibling. Not `agent/lifecycle.ts` (its `next()` already returns the queue), not `agent/port-start.ts`, not `agent/sdk-driver.ts`.

**Verify in the running app.**
- Mock port run on a small fake app `ds-wt/p35-next`: queue "Keep the header as it is" at 1 s: after the run, a second port run starts with that text, the run log shows it, the studio check runs, the final state is `done`. Same over the HTTP queue route.
- `port.start` first call on the clone, fresh data folder, 5 times each on main and branch: report p50 and the split.
- Restore after a mock port run still brings back a changed file outside the route folder.
- Dark and light screenshots of the run chat after the queued turn. No real-model run.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 flow-update | `agent/port-start.ts` (`startFlowRun`, `toTakenText`); new `agent/port-flow-update.ts`; `agent/port-start-prompt.ts` (`toFlowPrompt`); `agent/port-route-update.ts` (export only if needed); `agent/port-review.ts` (only if it reads the first `routeFile` alone); the Move to app dialog copy line (only if needed); fixture `ds-wt/fu-next` |
| 2 flow-match | new `actions/src/page/{inspect-flow.ts,flow/schema.ts}`; new `handlers/page/inspect-flow.ts`; `handlers/page/live.ts`; new `server/canvas/page-flow/**`; `server/canvas/index.ts` (one export); `server/canvas/page-match/index.ts` (export only if needed); new `agent/prototype-flow-review.ts`; `agent/prototype-review.ts` (one call line); fixtures `ds-wt/fm-*` |
| 3 mixed-range | `bridge/{text-edit.ts,text-range.ts,message-handlers.ts}` and new `bridge/text-edit-range-mode.ts`; `actions/src/bridge-protocol.ts`; `ui/features/text-range/{use-text-range-apply.ts,use-text-range.ts,text-range-model.ts,copy.ts}`; `server/style-scope/text-search/wrap-range.ts` (only if needed); fixture `ds-wt/mx-next` |
| 4 phone-play | `ui/features/canvas/{play-model.ts,play-frame.tsx}`; `ui/features/share-viewer/share-viewer-model.ts` (only if needed); fixtures `ds-wt/ph-*` |
| 5 polish-35 | `http/run-follow-up.ts` and new `http/run-follow-up-port.ts`; `agent/port-review-snapshot.ts` (`createTree`) and a new sibling; fixtures `ds-wt/p35-next`, `ds-wt/po-bp` (read only) |

Shared files and conflict warnings:
- **Port code (picks 1 and 5).** Pick 1 owns `port-start.ts`, `port-start-prompt.ts`, `port-route-update.ts`, `port-review.ts`. Pick 5 owns `port-review-snapshot.ts` and `http/run-follow-up.ts`. Pick 5 must not add a port queue builder in `port-start.ts`. Pick 1 must not edit `port-review-snapshot.ts`; if it needs a snapshot change, write it under "Left out".
- **Snapshot scope (hidden coupling, picks 1 and 5).** Pick 1's restore of every flow route file depends on the whole-tree snapshot. Pick 5 may scope `git add -A` to the app folder, never to one route folder.
- **`agent/index.ts`.** Pick 5 may import `toPortSteerRequest` from it; no pick edits it unless a new export is needed (pick 1 only, then say so).
- **Prototype review (pick 2 only).** Pick 2 adds one line to `prototype-review.ts`. No pick edits `final-check.ts` or `sdk-driver.ts` this cycle.
- **`canvas/index.ts` (pick 2 only).** One export line.
- **Unions.**
  - Pick 3 adds 2 message shapes to the bridge message union in `actions/src/bridge-protocol.ts`. Grep every `switch` and `Record<` over `BridgeMessage['type']` and the `*_TYPES` lists in `src/shared` and `src/bridge` (N12) before the commit.
  - Pick 2 adds a new literal union (`kind`) in a new schema file; no existing union changes.
  - No two picks change one union.
- **Play code (pick 4 only).** Pick 3 changes text edit in the bridge, not Play. Pick 4 does not touch `bridge/**`.
- **`copy.ts`.** Pick 3: `text-range/copy.ts`. Pick 1: the Move to app dialog copy file, only if needed. No other pick.
- **`@generated` lists.** Pick 2 adds an action. Each pick that changes action text runs `pnpm exec tsx scripts/gen-routes.ts`; after each merge run `gen-routes --check`, and regenerate (never hand-merge) on a conflict.
- **Hand aggregators.** No pick edits `actions/index.ts`, `main/live-layer.ts`, `http/mount-all.ts`, `mcp/registry.ts` or `agent-tools/registry.ts`. Pick 2's store goes in `handlers/page/live.ts`.
- **MCP snapshots.** No pick changes the input of a tool in `artifacts/mcp-snapshots/*.json`.
- **Long files.** `port-plan.ts` (1295), `lifecycle.ts` (1058), `sdk-driver.ts` (1622): no edits this cycle. `port-review-snapshot.ts` (442), `text-edit.ts` (357), `play-model.ts` (339): keep under 500; new logic in new files.
- **Fake apps under `ds-wt`.** Each pick has its own prefix (`fu-`, `fm-`, `mx-`, `ph-`, `p35-`); `mr-` and `pp-` are taken by older cycles. No pick writes into Bonaparte; pick 5 reads it once through `git clone --no-local`. No Move to app run targets Bonaparte or the clone.
- **`.claude/goal/roadmap.md` Appendix A:** add each pick's new files when the file is in the worktree (L6e).

## Merge order

All 5 can run at once. Merge in this order:
1. **phone-play**: UI Play files only; run `pnpm run build:ui` and `check-bundle`.
2. **polish-35**: follow-up and snapshot files; run the mock queue check after merge.
3. **mixed-range**: bridge protocol union, bridge and text-range UI; run `pnpm run typecheck` (shared bridge types).
4. **flow-update**: port start and prompt; rebase on polish-35 and re-run the restore check (snapshot coupling).
5. **flow-match**: last, because it adds an action (generated lists); regenerate with `pnpm exec tsx scripts/gen-routes.ts` after the rebase.

After the last merge, run `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run check:scripts`, `pnpm run lint:gate`, `pnpm run build:ui`, `pnpm exec tsx scripts/check-bundle.ts` and `pnpm exec tsx scripts/check-boot-imports.ts`. Then `pnpm run desktop:pack`. Then one real-model session of 2 runs on merged main, each with a fresh data folder:
1. The pick 2 prompt from Home to a share link opened at 390 px: 0 flow gaps, 3 screens at phone width, tap through.
2. A 3-page prototype beside a fresh `fu-next` copy, then Move to app of the flow onto its 3 existing routes: files updated in place, `next build` passes, queue one message during the run and see it run after.

## Real-model run budget

Local Claude Code sign-in, Sonnet, short runs. Move to app only into a fake Next app under `ds-wt`, never Bonaparte.
- pick 1 flow-update: 2 runs (branch gate, one re-run after a fix; main needs none, it refuses);
- pick 2 flow-match: 2 runs (main and branch);
- the final merged session: 2 runs.

Picks 3, 4 and 5 need none. Total: 6 runs.

## Runners-up

1. Cards and badges in app source: `toDriftTag` never returns `card` or `badge` for TSX, and `apply_kit_drift` has no card or badge splice.
2. Skeleton states in the kit check: Bonaparte uses `<Skeleton` in 504 files; flag hand-made gray loading blocks.
3. Second flow measure: time "prototype beside the app -> Move to app" on a fresh setup and remove its worst step (cycle-34 pick 1 method).
4. Cold project open: about 11 reads each wait about 170 ms on the first open after boot; measure the blocking task first.
5. Port plain CSS path: build and check `rf-next-rt`; it is not known if `port.apply` lands a style edit as inline JSX style.
6. Tailwind detection by `cn(...)` only for range writes in JSX (range-keys "Left out").
7. Frame re-add record: remember frames the user removed so `create_page_frames_canvas` with `pages: null` never adds them back.
8. Canvas memory (doop): a design note on the canvas that every new frame and run in the project reads.
9. Figma variables JSON import and export into project tokens.
10. Text wrap Balance and Pretty in the inspector (Figma text settings; `text-wrap: balance | pretty`).

Sources: [Figma release notes](https://figma.com/release-notes), [Figma release notes archive](https://www.figma.com/release-notes/archive/?page=2), [Figma What's new](https://www.figma.com/whats-new/), [Releasebot Figma](https://releasebot.io/updates/figma), [PureAI: Anthropic overhauls Claude Design](https://pureai.com/articles/2026/06/17/anthropic-overhauls-claude-design.aspx), [The New Stack: Claude Design overhaul](https://thenewstack.io/anthropic-claude-design-overhaul/), [designcompass: Claude Design update](https://designcompass.org/en/2026/06/19/claude-design-update-design-system-ai-canvas/), [createwith: Lovable updates](https://www.createwith.com/tool/lovable/updates/lovable-ships-15-updates-including-mcp-integration-and-ai-image-generation), [scrumlaunch: Lovable vs v0 2026](https://www.scrumlaunch.com/blog/lovable-vs-v0-ai-app-builders-2026), [Augment: open design v0.11](https://www.augmentcode.com/learn/open-design-v011-claude-design-alternative), [sourcepulse: nexu-io/open-design](https://www.sourcepulse.org/projects/28859130), [creativeainews: doop](https://www.creativeainews.com/articles/doop-open-source-ai-design-canvas-mcp-2026/), [mcpservers.org: doop](https://mcpservers.org/servers/kgoedecke/doop).

## Results

- **Merged:** all 5 into main in order (phone-play, polish-35, mixed-range, flow-update, flow-match), no conflicts. Main at `1feb0e346`.
- **Checks:** gen-routes --check, typecheck, lint:gate (59612, baseline 89733), build:ui pass. check:clip 0 findings.
- **Installed:** desktop:pack passed, reinstalled to /Applications. :4570 answers 200. Idle CPU 0.02 CPU-s per 60 s.
- **flow-update:** a 3-page flow updated 3 existing routes in place; real run scores 82/100/99, `next build` passed.
- **flow-match:** `inspect_flow_page` finds nav and `:root` gaps across pages; 2 real runs had 0 gaps, so the fix loop did not fire live.
- **mixed-range:** range styling works on lines with inline styled text; the edit stays open after each write.
- **phone-play:** share Play on a phone lays out HTML pages at 390 px, scale 1 (was 27%).
- **polish-35:** a message queued late in a port run starts a port follow-up.
- **Open:** first `port.start` on a large repo still about 2.5 s (first version save, store files); Cmd+Z after a flow update can leave one route partly changed; the "View canvas" pill covers the page bottom on phones; Home bundle is over its size budget (check-bundle).
