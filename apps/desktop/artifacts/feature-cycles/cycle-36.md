# Feature cycle 36: next 5 features

Date: 2026-11-14. Main at `79d75cc9f` (all 5 cycle-35 picks merged at `1feb0e346`).

## Method

- Read `cycle-35.md` (picks, runners-up, Results "Open") and `cycle-35/{flow-update,flow-match,mixed-range,phone-play,polish-35}.md` ("Left out"), `git log --oneline -12` and `git branch -a`.
- Read the code for each pick:
  - Home bundle: `scripts/check-bundle.ts` (B1), `scripts/perf/baseline.json` (B1), `dist/ui/.vite/manifest.json` (the last `build:ui`, 10:49 today), `ui/app/{main.tsx,app.tsx,app-notice.tsx,app-screen.tsx,screen-preload.ts}`, `ui/features/{inspector,commands,chat,prototype}/index.ts`, `ui/features/{inspector,commands}/deps.ts`.
  - Undo after a port run: `http/run-follow-up.ts` (`applyRunHistory`), `direct-edit/commit/{run-record.ts,history.ts}`, `http/app-context.ts` (`startRun`), `handlers/port/apply.ts`.
  - Phone pill: `ui/features/share-viewer/{share-body.tsx,share-viewer-head.tsx,copy.ts}`, `ui/styles/share-viewer.css`, `ui/features/canvas/play-model.ts`.
  - First `port.start`: `http/app-routes.ts` (`holdEditsForFirstVersion`, `ensureFirstVersion`), `store/version-seed.ts`, commit `75f3445e2`.
  - Text edit undo: `bridge/{history-key.ts,text-edit.ts,text-edit-range-mode.ts,text-range.ts,text-key-forward.ts,hover-select.ts}`, `ui/features/canvas/preview-key-forward.ts`, `ui/features/text-range/use-text-range-resume.ts`, `actions/src/version/{restore-history.ts,apply-history.ts}`.
  - Flow port check: `agent/{port-start-prompt.ts,port-start.ts,port-review.ts,port-flow-update.ts}`, `ui/features/design-system/port-model.ts`.
  - Phone check of a flow: `agent/{prototype-review.ts,prototype-flow-review.ts,prototype-kit-review.ts}`, `server/viewport/{probe.ts,inspect-matrix.ts,index.ts}`, `actions/src/viewport/run.ts`.
- Counted in Bonaparte (read only, `git ls-files`): 259 `page.tsx` in `apps/dashboard`, 136 of them dynamic (`[param]` in the path).
- No real-model run, no app run and no build for this research.

### Open items from cycle 35, and the pick that closes each

| Open item | Pick |
|---|---|
| Home bundle is over its check-bundle budget (1.06 MB vs 300 KB) | 1 home-lean |
| Cmd+Z after a flow update can leave one route partly changed | 5 polish-36 |
| The "View canvas" pill covers the page bottom in phone share Play | 5 polish-36 |
| The first `port.start` on a large repo is about 2.5 s (first app version save) | Not picked. See "Findings" and runner-up 4 |

### Findings

- **Speed: Home loads the Studio (open item 1).**
  - The last build preloads 107 JS chunks on Home, 1,059,038 B. The baseline (`scripts/perf/baseline.json` B1) is 294,891 B with only `index` and `react`.
  - The biggest chunk is `_index-CMYOu9QT.js` (430,138 B). `index.html` imports it statically. It holds Studio copy: "Click to edit, double-click to zoom", "Move to app…", "Show tab order", "Comment on selection", "Nothing more to undo". So canvas, comments, accessibility and inspector code loads on Home.
  - One static path: `app/app.tsx` -> `app/app-notice.tsx` -> `import { CodeEditHost, codeEditStore } from "../features/inspector"`. `inspector/index.ts` re-exports about 30 non-lazy modules (`use-edit-history.js`, `use-image-api.js`, `use-paste-jsx.js`, `use-current-edit-request.js` and more). They import `inspector/deps.ts`, which imports `../canvas/index.js`, `../share-publish-ship-export/index.js`, `../design-system/index.js` and `../versions-layers-tokens/index.js`.
  - A second path: `app/app-screen.tsx` and `app/use-home-commands.ts` import `../features/commands`. `commands/index.ts` re-exports `useStudioCommands` and `useCanvasCommands` statically, and `commands/deps.ts` pulls `home/project-thumb.js`, `chat/run-settings.js` types and the canvas presets.
  - The pick must measure each cut. The source map of the big chunk is not in `dist/ui` (only `keymap` has one), so the pick builds once with `build.sourcemap` in a temporary config (no commit) and sums bytes per source.
- **Polish: undo after a port run (open item 2).**
  - `applyRunFollowUp` records a run as one history entry: `recordRunInHistory` diffs the run version against its parent (`runChanges` uses `version.parentId`).
  - During a port run, each `apply_port` direct edit writes its own version and its own history entry. So the run version's parent is the last `apply_port` version, not the state at run start. Cmd+Z 1 undoes only the model's writes after the last `apply_port`. Cmd+Z 2 undoes that `apply_port` entry, whose `before` text predates model writes that came after it, so `step` refuses it as stale or leaves mixed text.
  - The head at run start is known: `startRun` in `http/app-context.ts` passes `direction` (loaded after `holdEditsForFirstVersion`) to `applyRunFollowUp`, so `target.direction.headVersionId` is the start version.
- **Polish: the phone pill (open item 3).** `share-body.tsx` renders `.btn.share-canvas-toggle` in Play mode with `position: fixed; bottom: calc(var(--s-4) + env(safe-area-inset-bottom))` (`share-viewer.css:282`). Since phone-play, the page fills `stage.height - FULL_BLEED_HEIGHT_CHROME` (44 px for the head), so the pill sits over the page's last 60 px.
- **Not picked: first `port.start` (open item 4).** polish-35 measured 1,662 ms of 2,553 ms in the first app version save (`ensureFirstVersion` -> `commitInit`, `store/version-seed.ts`), which already reuses the user index and clones only loose objects. Commit `75f3445e2` moved this save from attach to the first edit on purpose. The tried fixes did not reach 2 s, and one raced the asset copy. A warm start when the Move to app dialog opens would need a write in the plan read (`get_port_plan` is a read, S7). Kept as runner-up 4.
- **Figma gap: undo inside an open text edit.**
  - `bridge/history-key.ts` `historyKeyBody` returns `null` when `typingTarget(event)` is true, and a text edit makes the layer `contentEditable`. So Mod+Z in an edit goes to the browser.
  - In range mode (mixed-range), `text-edit-range-mode.ts` blocks `beforeinput`, also `historyUndo`. So Mod+Z and Mod+Shift+Z do nothing in an open range edit (mixed-range "Left out" confirms it in the app). In Figma, Mod+Z inside a text layer undoes the last style change and keeps the edit open.
  - Double-click on a styled word (`hover-select.ts` `onDblClick`) starts a plain edit on the `<strong>` itself, because it has no element children, so typing there writes only that child. In Figma, double-click enters the whole text layer.
  - The MCP surface already has `undo` and `redo` (`version.restoreHistory`, `version.applyHistory`). Only the in-frame key path is missing.
- **Bonaparte path: the studio check of a flow sees page 1 only.**
  - `toFlowPrompt` (`port-start-prompt.ts` lines 169 and 170) writes one `<port-check>` line from `flow.pages[0]`. `toPortCheckRef` in `port-review.ts` reads one tag (`CHECK_TAG.exec`), and `toCheckGaps` builds one URL and one `isUpdate` from `toRouteFileNow` (the first route). So the render check, the score and the fix loop cover the first route. flow-update's real run scored `/visits` 82; the other 2 routes were scored only by hand.
  - Single-page Move to app of a dynamic route copy: `port-model.ts` `toSourceRoute` returns the stored `routePath` (`/visits/1`, the URL at copy time), so the default route makes a new `app/visits/1/page.tsx` next to `app/visits/[id]/page.tsx`. 136 of 259 Bonaparte dashboard pages are dynamic routes.
- **AI quality: only one page of a flow gets a phone check.**
  - `toPrototypeReviewGaps` sets `mobile: !hasMobileShotAfter(run, lastEdit)`: any one 390 px shot after the last edit passes, whichever page it shows. `toFlowReviewGaps` sets `mobile: false`.
  - Since phone-play, share Play on a phone lays out every HTML page at the phone width. A plan picker with a fixed 1200 px grid now scrolls sideways on a phone, and no check sees it.
  - The probe exists: `viewport/probe.ts` reports `scroll.scrollWidth` against `innerWidth` and tap targets under 44 px, and `run_viewport` (`viewport.run`) checks one page at several widths. The review never runs it per page.
  - flow-match "Left out": on a kit project the kit opening wins on pass 1 and pass 2 has no opening, so flow lines after the first kit fix loop are dropped. The same opening logic (`toReviewOpening` in `prototype-kit-review.ts`) decides the new phone lines.
- **Checked and not picked:**
  - Figma variables JSON import and export: Figma rolls it out in November 2026 (see sources). It is import, not manual editing. Runner-up 1.
  - Copy and paste properties (Mod+Alt+C, Mod+Alt+V): Copy style and Paste style exist in the preview menu (`f42b02b1f`); only the keys are missing. Small; runner-up 6.
  - Cards and badges in TSX (`toDriftTag`): still real, still large. Runner-up 2.
  - Nested inline tags in range mode (`<a><strong>x</strong></a>`): kept out of range-undo to keep it small. Runner-up 7.
- **Competitor recheck (5 web searches, 2026-11-14).**
  - Claude Design: no confirmed November change. One unconfirmed blog post says it now runs in any Claude chat, Claude Code and the mobile app. The June 2026 update (design-system import, Claude Code sync, export targets, compliance checks) is still the base.
  - Figma: variables import and export as JSON is rolling out in November. Text wrap Balance and Pretty shipped in August. No new text-range item.
  - v0 and Lovable: v0 has keyboard shortcuts in design mode. Lovable's visual editor edits any part of the app without a prompt. No November item found.
  - open design (nexu-io): latest release found is still v0.13.0 (July 2026); it ships an MCP server for 16+ agent CLIs.
  - doop: open-source canvas, HTML frames in iframes, Claude Code and Codex over MCP, shared design memory, clickable prototypes. Nothing new since cycle 35.
  - The bar stays: fast to open, one prompt to a shared flow that reads well on a phone, real-repo flows that keep the app's look, and Figma-like direct edits.
- **Branch check.** No `feat/home-lean`, `feat/range-undo`, `feat/flow-review`, `feat/phone-flow` or `feat/polish-36`, and no branch that contains these keys. Near names that exist and are not used: `feat/fast-boot`, `feat/layer-undo`, `feat/undo-patch`, `feat/port-check`, `feat/port-verify`, `feat/responsive-fix`, `feat/polish-33`.
- **Fixture prefixes.** `hl-`, `ru-`, `fv-`, `pf-` and `p36-` are not in `ds-wt` (checked with `ls`).

## Ranking

Score = value x fit with "simple and fast" / effort (1 to 5 each).

| Rank | Key | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|---|
| 1 | home-lean | Home loads only Home code: B1 under 300 KB again (speed) | 4 | 5 | 3 | 6.7 |
| 2 | range-undo | Mod+Z and Mod+Shift+Z inside an open text edit undo the last style write and keep the edit open; double-click a styled word opens the whole line (Figma) | 4 | 5 | 2 | 10 |
| 3 | flow-review | The studio check of a Move to app flow scores every route; a dynamic route copy defaults to its pattern route (Bonaparte) | 5 | 5 | 3 | 8.3 |
| 4 | phone-flow | The prototype check renders every page of a flow at 390 px and flags sideways scroll and small tap targets (AI quality) | 4 | 5 | 3 | 6.7 |
| 5 | polish-36 | One Cmd+Z undoes a whole port run; the "View canvas" pill moves out of the phone page | 3 | 5 | 2 | 7.5 |

No pick adds an always-visible control:
- Pick 1 changes imports only.
- Pick 2 changes key and double-click behaviour in an open edit.
- Pick 3 adds prompt lines and review passes; the dialog copy line changes only if needed.
- Pick 4 adds review lines; no new UI.
- Pick 5 changes history records, and moves the existing pill into the existing share head on a phone.

---

## 1. home-lean: Home loads only Home code (speed)

**Why.** The goal says simple and fast. Home is the first screen. It loads 1.06 MB of JS before it can paint, 3.6 times its budget, and most of it is Studio code that Home never runs. check-bundle fails on main, so every UI pick now ships past a red gate.

**Behaviour.**
- No visible change. Home, Studio and the share viewer work as now.
- Cut each static path from Home to Studio code:
  1. `app/app-notice.tsx`: import only the lazy `CodeEditHost` from `features/inspector`. Move every read of `codeEditStore` in `app-notice.tsx` into `code-edit-host.tsx` (the lazy host), so the app root needs no value from the store module.
  2. `features/inspector/index.ts`: the barrel must not pull `inspector/deps.ts` into a caller that takes only a lazy component. If a Home-path caller still needs a non-lazy export, put that export in a leaf module with no `deps.ts` import, and keep the barrel line (U15: callers still import through `index.ts`).
  3. `features/commands/index.ts`: the Home-path exports (`openLayer`, `useCommands`, `runCommand`, `IS_MAC`, `tipWithKey`, `commandBlocker`, the global commands) must not reach `use-studio-commands.js`, `use-canvas-commands.js` or `canvas-commands.js`. Give `useStudioCommands` and `useCanvasCommands` the same lazy-load shape as `moveRegion`, or have their only callers (`app/studio/**`, already lazy) reach them through a lazy loader.
  4. Repeat with the per-source byte sums until the Home preload set is under 300,000 B. Do not add `"sideEffects": false` to `apps/desktop/package.json` unless a measured build shows it is needed and no CSS or bridge side-effect import is lost; write the result in the report either way.
- Do not change `scripts/perf/baseline.json`. Only the merge step rewrites it, and only downward (P10). Write the new byte count and chunk list in the report so the merge step can set it.

**Headless.** No action, tool or route changes. MCP and the in-app chat do not load Home code.

**Main files.** `ui/app/app-notice.tsx`, `ui/features/inspector/{index.ts,code-edit-host.tsx}` and one new leaf file only if needed, `ui/features/commands/index.ts`, `ui/app/{app-screen.tsx,use-home-commands.ts}` (import lines only), `ui/app/canvas-commands-host.ts` and `ui/app/studio/**` (only the lines that call `useStudioCommands` or `useCanvasCommands`). Do not touch `features/text-range/**`, `features/share-viewer/**` or `bridge/**`.

**Verify in the running app.**
- `pnpm run build:ui`, then `pnpm exec tsx scripts/check-bundle.ts`: B1 under 300,000 B, 0 B1 failures. Write before and after bytes, the chunk count and the 5 largest chunks.
- Cold start, fresh data folder (`STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev`): Home paints; the network panel shows no canvas or inspector chunk before you open a project. Then open a project, open the inspector, press Mod+K, open Code edit (the host still works), open a share link.
- Time to first Home paint on main and branch, 5 cold loads each, p50.
- Dark and light screenshots of Home and of an open project. No real-model run.

---

## 2. range-undo: undo inside an open text edit (Figma)

**Why.** In Figma you select a word, press Mod+B, see it is wrong, press Mod+Z, and keep typing styles in the same edit. Here Mod+Z in an open range edit does nothing, and the user must press Escape first, then undo. Double-click on a bold word opens the wrong layer.

**Behaviour.**
- **Undo keys in range mode.** In range mode, `historyKeyBody` no longer treats the edited layer as a typing target. Mod+Z and Mod+Shift+Z post the existing `history-key` message (`{ redo }`). The UI runs the same history step as Cmd+Z outside the edit (`preview-key-forward.ts` -> the edit history step).
- **Edit stays open.** After the step and the frame reload, the UI reuses the mixed-range resume path (`use-text-range-resume.ts`) with the layer and the last range, so the edit reopens with the same characters selected. If the layer or text is gone (the undo removed it), the edit stays closed, as now.
- **Plain edit (typing allowed).** While the layer has unsent typed text (`isDirty`), Mod+Z stays the browser's text undo. When it is not dirty, Mod+Z posts `history-key` as in range mode. So typed text is never lost to a history step.
- **Double-click on a styled word.** When the double-clicked element is an inline text child (`isInlineTextChild`) of a mixed layer (`isMixedLayer`), the edit starts on the parent line in range mode, with the word selected. A child with its own block layout keeps today's behaviour.
- One history step is one version, as now. No new toast.

**Headless.** No new action. MCP and agent callers already have `undo` and `redo` (`version.restoreHistory`, `version.applyHistory`) and `apply_range_text`. Reuse the `history-key` message; if a new field is needed in the bridge union in `packages/common/contracts/src/contracts.ts`, see the union flag below.

**Main files.** `bridge/history-key.ts`, `bridge/text-edit.ts` (dirty flag read, under 500 lines: 422 now), `bridge/text-edit-range-mode.ts`, `bridge/hover-select.ts` (`onDblClick` only), `ui/features/canvas/preview-key-forward.ts` (history-key route only), `ui/features/text-range/{use-text-range-resume.ts,use-text-range-apply.ts,deps.ts}`. `packages/common/contracts/src/contracts.ts` only if a field is needed.

**Verify in the running app.**
- HTML prototype (mock agent, data folder `ds-wt/ru-data`), paragraph "Book your first class today and save 20 percent": Enter, select "today", Mod+B, Mod+Z: bold gone, the edit stays open with "today" selected. Mod+Shift+Z: bold back. Select "save", Mod+U, Mod+Z, Mod+Z: back to the start text, the edit still open.
- Plain `h1`: type "x", Mod+Z removes "x" (browser undo); Mod+Z again runs the history step.
- Double-click "today" after it is bold: range mode on the paragraph, "today" selected; typing shows the range notice and changes nothing.
- Tailwind fake app `ds-wt/ru-next` (Next 16, Tailwind 4): the same steps with HMR; `next build` passes.
- `pnpm exec tsx scripts/call-action.ts version.restoreHistory '<json>'` after an `apply_range_text` write: http, mcp and agent match.
- Dark and light screenshots of the open edit after Mod+Z. No real-model run.

---

## 3. flow-review: the studio check scores every route of a flow (Bonaparte)

**Why.** flow-update moves a list, detail and edit page onto the app in one run. The studio check still renders, scores and fixes only the first route. A broken detail page reaches the user with a "done" note. In Bonaparte 136 of 259 dashboard pages are dynamic routes, and a single-page move of one of them now makes a wrong new route.

**Behaviour.**
- **One check line per route.** `toFlowPrompt` writes one `<port-check>` line per flow page (path and route of that page), up to 4; for more, the first 4 and a count line. The text asks the model to call `inspect_port` for each route.
- **Review all checked routes.** `port-review.ts` reads every `<port-check>` tag (`matchAll`, not `exec`). For each ref it builds the URL and `isUpdate` from that page's own route file, runs the same render and match check, and joins the gaps. Each line names its route. The fix loop runs while any route is under 80. Keep the pass cap as now. Put the per-route loop in a new `agent/port-review-routes.ts` (`port-review.ts` is 404 lines).
- **Run note.** One score per route: "/visits 82, /visits/1 100, /visits/1/edit 99".
- **Dynamic route default.** For a route copy of a dynamic route, the single-page dialog and `port.start` default to the pattern route (`/visits/[id]`) and its existing file, not the URL at copy time (`/visits/1`). Read the pattern from the copy record (`.studio/route-source.json`, `RouteSourceStore`) or map the URL to the pattern with the app's route list, as `port-flow-update.ts` already does for flows. Reuse that mapping; do not copy it.
- Restore and history do not change (pick 5 owns history).

**Headless.** No new action. `port.start` (`start_port`) input does not change (N4). `inspect_port` (`port.inspect`) is called once per route by the in-app agent and by an MCP agent. The run note text is the same on every surface.

**Main files.** `agent/port-start-prompt.ts` (`toFlowPrompt`, `toCheckLine`), `agent/port-review.ts` (`toPortCheckRef`, `toCheckGaps`), new `agent/port-review-routes.ts`, `agent/port-review-pass.ts` (only if the pass reads one ref), `agent/port-flow-update.ts` (export the route remap only), `ui/features/design-system/port-model.ts` (`toSourceRoute`), and the route copy record writer in `project-ops` only if the record lacks the pattern. Not `port-plan.ts` (1295 lines), not `port-review-snapshot.ts`, not `http/run-follow-up.ts`.

**Verify in the running app.**
- New fake app `ds-wt/fv-next`: Next 16, Tailwind 4, routes `/visits`, `/visits/[id]`, `/visits/[id]/edit`, data from a local `data.ts`. A prototype beside it with 3 route copies and a header redesign.
- No model: `port.start` with `flow: true` over HTTP and MCP; the run log prompt has 3 `<port-check>` lines. Mock `[port-bash]` driver: the review renders 3 URLs and the run note has 3 scores.
- Single page: open Move to app on the copy of `/visits/[id]`: the route field shows `/visits/[id]` and "Updates `app/visits/[id]/page.tsx`".
- **Real-model run (2 short runs, Sonnet, fresh data folder):** break the detail page in the prototype (a missing column). Move to app of the flow onto `fv-next`. Pass: the review names `/visits/1`, the fix loop runs on it, all 3 scores are 80 or more, `next build` passes. One re-run after a fix. Never target Bonaparte.
- Dark and light screenshots of the run note and the dialog route field.

---

## 4. phone-flow: the prototype check renders every flow page at 390 px (AI quality)

**Why.** Share Play on a phone now shows each page at the phone width. A page that the model built for 1440 px scrolls sideways or has small buttons, and today only one page of a flow gets a phone shot. Claude Design's bar is a flow that reads well on the device it is opened on.

**Behaviour.**
- At the prototype review of an HTML flow run with an edit, a new step renders each flow page (the `pages` list of `inspectFlowPages`, up to 6) at 390 x 844 with the viewport probe (`viewport/probe.ts`: `scroll`, `taps`).
- A gap is: `scrollWidth` more than `innerWidth` + 1 (sideways scroll), or a tap target under 44 px (the probe's rule for widths up to 768). Each gap is one review line, max 6, then a count line:
  - "- Phone: plan.html scrolls sideways at 390 px (page 1240 px wide). Let the grid wrap or stack under 640 px, then run run_viewport on plan.html."
  - "- Phone: 3 tap targets on done.html are under 44 px (first: \"Back\" 32 x 20 px)."
- The phone opening asks for a fix loop only when there is a phone gap; 0 gaps sends no prompt. A second pass runs while gaps stay, with the same pass cap as flow-match.
- **Opening order.** Fix the flow-match "Left out": on pass 2 after a kit fix loop, the opening names the kit, flow and phone gaps that are left, so flow and phone lines are not dropped. One opening per pass, kit text first.
- The render runs once per page per pass. Write the added seconds per pass in the report.

**Headless.** No new action. An MCP agent already has `inspect_flow_page` (pages) and `run_viewport` (one page, several widths). Add `run_viewport` to the phone line text only; the tool exists (E19). `inspect_flow_page` stays a file read (it must not render: S6a).

**Main files.** New `agent/prototype-phone-review.ts`, `agent/prototype-kit-review.ts` (`listKitLines` adds the phone lines; `toReviewOpening` order), `agent/prototype-flow-review.ts` (export the page list only), `server/viewport/index.ts` (export the probe expression only if needed). Not `final-check.ts`, not `sdk-driver.ts`, not `prototype-review.ts` unless one call line is needed.

**Verify in the running app.**
- No model: seeded HTML project `ds-wt/pf-seed` with `index.html`, `plan.html` (a 3-column grid with `width: 1200px`) and `done.html` (a 32 x 20 px back link). A script that calls the review line builder gives 2 phone lines; after a CSS fix, 0 lines and no opening.
- Kit project copy: the kit fix loop runs on pass 1, the flow and phone lines show on pass 2.
- **Real-model run (2 short runs):** the cycle-35 prompt (3-screen yoga flow, "Each screen has the studio header and nav.") plus "The plan picker shows 3 plans side by side.", on main and on the branch, fresh data folders. Score both with the branch probe. Gate: 0 phone gaps at run end on the branch. Report gaps on main, loops, seconds and cost on both.
- Open the branch run's share link at 390 x 844: the 3 pages fit, no sideways scroll. Dark and light screenshots.

---

## 5. polish-36: one undo for a port run, the phone pill

**Items.**
- **One Cmd+Z undoes a port run.** At the end of a run with `task: "port"`, record one history entry from the head at run start (`target.direction.headVersionId`) to the run version, not from the run version's parent. Drop the history entries that were recorded on that direction during the run (the `apply_port` edits), so the stack holds one entry for the run. Redo applies the whole run again.
  - Generalise `runChanges` in `run-record.ts` to take a base version id. Add one history method that drops the entries after a given point for one direction (keep `history.ts` under 500 lines: 461 now; put the drop in a sibling file if it does not fit).
  - Other run tasks keep today's record.
  - The file limits (`MAX_RUN_FILES` 50, `MAX_RUN_BYTES` 4 MB) stay. Over the limit, clear the history as now and keep `restore_version` as the way back.
- **The "View canvas" pill on a phone.** In full bleed (phone share Play), render the existing "View canvas" button in the share head next to Play and comments, not as the fixed pill. Desktop share keeps the pill. No new button: the same control moves.

**Headless.** No new action. MCP `undo` (`version.restoreHistory`) after a port run reaches the start state in one call. The pill is share-viewer UI only.

**Main files.** `http/run-follow-up.ts` (`applyRunHistory`), `direct-edit/commit/run-record.ts`, `direct-edit/commit/history.ts` and a new sibling if needed, `ui/features/share-viewer/{share-body.tsx,share-viewer-head.tsx}`, `ui/styles/share-viewer.css`. Not `port-*.ts` (pick 3), not `play-model.ts`.

**Verify in the running app.**
- Mock port run on a small fake app `ds-wt/p36-next` with one `apply_port` edit in the middle of the run (mock driver): after the run, `edit_history` lists one entry for the run. One Cmd+Z: every changed file equals the start; `git diff` is empty. Mod+Shift+Z: the run is back. Same with `pnpm exec tsx scripts/call-action.ts version.restoreHistory '<json>'`: http, mcp and agent match.
- A non-port run still records one entry, as now.
- Share link at 390 x 844 in Play: the page bottom is free, "View canvas" is in the head and opens the canvas. At 1440 px the pill is as now.
- Dark and light screenshots of the phone head and the history list. No real-model run.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 home-lean | `ui/app/{app-notice.tsx,app-screen.tsx,use-home-commands.ts,canvas-commands-host.ts}`; `ui/app/studio/**` (command hook call lines only); `ui/features/inspector/{index.ts,code-edit-host.tsx}` and one new leaf; `ui/features/commands/index.ts`; fixtures `ds-wt/hl-*` |
| 2 range-undo | `bridge/{history-key.ts,text-edit.ts,text-edit-range-mode.ts,hover-select.ts}`; `ui/features/canvas/preview-key-forward.ts`; `ui/features/text-range/{use-text-range-resume.ts,use-text-range-apply.ts,deps.ts}`; `packages/common/contracts/src/contracts.ts` (only if needed); fixtures `ds-wt/ru-*` |
| 3 flow-review | `agent/{port-start-prompt.ts,port-review.ts,port-review-pass.ts,port-flow-update.ts}` and new `agent/port-review-routes.ts`; `ui/features/design-system/port-model.ts`; the route copy record writer in `project-ops` (only if needed); fixtures `ds-wt/fv-*` |
| 4 phone-flow | new `agent/prototype-phone-review.ts`; `agent/{prototype-kit-review.ts,prototype-flow-review.ts}`; `server/viewport/index.ts` (one export, only if needed); fixtures `ds-wt/pf-*` |
| 5 polish-36 | `http/run-follow-up.ts`; `direct-edit/commit/{run-record.ts,history.ts}` and a new sibling; `ui/features/share-viewer/{share-body.tsx,share-viewer-head.tsx}`; `ui/styles/share-viewer.css`; fixtures `ds-wt/p36-*` |

Shared files and conflict warnings:
- **Edit history (picks 2 and 5, hidden coupling).** Pick 2 calls the history step from an open edit; pick 5 changes what one history entry holds for a port run. Pick 2 must not edit `history.ts` or `run-record.ts`; pick 5 must not edit `bridge/**` or `features/text-range/**`. After both merge, run the pick 2 undo steps once more.
- **Inspector barrel (picks 1 and 2).** Pick 1 changes `features/inspector/index.ts`. Pick 2 must import nothing new from it; it uses the history step through `preview-key-forward.ts`. If pick 2 needs an inspector export, write it under "Left out".
- **Canvas feature (picks 1 and 2).** Pick 2 owns `canvas/preview-key-forward.ts`. Pick 1 must not edit any `features/canvas/**` file; it changes only how Home reaches canvas code.
- **Share viewer (pick 5 only).** Pick 1 must not move share-viewer imports. Pick 4 only links to the share viewer in its verify.
- **Port code (pick 3 only).** No other pick edits `port-*.ts`. Pick 5 records port history in `http/run-follow-up.ts` and reads only `request.task`; it must not parse the port prompt (pick 3 changes it).
- **Prototype review (pick 4 only).** Pick 4 owns `prototype-kit-review.ts` and `prototype-flow-review.ts`. No pick edits `final-check.ts`, `prototype-review.ts` (one call line for pick 4 only, if needed) or `sdk-driver.ts`.
- **Unions.**
  - Pick 2 reuses the `history-key` message. If it adds a field to the bridge union in `packages/common/contracts/src/contracts.ts`, grep every `switch` and `Record<` over `BridgeMessage['type']` and the `*_TYPES` lists in `src/shared` and `src/bridge` (N12) before the commit.
  - Pick 4 adds no union member; phone gaps are review lines, not a new `PageFlowGap` kind.
  - No two picks change one union.
- **`copy.ts`.** Pick 5: `share-viewer/copy.ts` only if the head needs a new tip (reuse `viewCanvasTip`). Pick 3: the Move to app dialog copy file, only if needed. No other pick.
- **`@generated` lists.** No pick adds or changes an action, so `gen-routes` output must not change. Run `pnpm exec tsx scripts/gen-routes.ts --check` after each merge.
- **Hand aggregators.** No pick edits `actions/index.ts`, `main/live-layer.ts`, `http/mount-all.ts`, `mcp/registry.ts` or `agent-tools/registry.ts`.
- **MCP snapshots.** No pick changes the input of a tool in `artifacts/mcp-snapshots/*.json`.
- **Perf baseline.** Pick 1 must not edit `scripts/perf/baseline.json` (P10, L6). The merge step sets B1 from pick 1's report, downward only.
- **Long files.** `port-plan.ts` (1295), `lifecycle.ts` (1058), `sdk-driver.ts` (1622): no edits. `history.ts` (461), `text-edit.ts` (422), `port-review.ts` (404): keep under 500; new logic in new files.
- **Fake apps under `ds-wt`.** Each pick has its own prefix (`hl-`, `ru-`, `fv-`, `pf-`, `p36-`). No pick writes into Bonaparte. No Move to app run targets Bonaparte or a clone of it.
- **`.claude/goal/roadmap.md` Appendix A:** add each pick's new files when the file is in the worktree (L6e).

## Merge order

All 5 can run at once. Merge in this order:
1. **home-lean**: import moves across many UI files; merge first so the other UI picks rebase on it. Run `pnpm run build:ui` and `check-bundle`; the merge step then sets B1 in `scripts/perf/baseline.json`.
2. **polish-36**: history record and share head; run the mock port undo check after merge.
3. **range-undo**: bridge and text-range UI; rebase on home-lean and polish-36, run `pnpm run typecheck`, then the undo steps again (history coupling).
4. **flow-review**: port prompt and review; run the mock `[port-bash]` check after merge.
5. **phone-flow**: last, because it adds review passes that every prototype run takes; re-run its no-model line check after the rebase.

After the last merge, run `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run check:scripts`, `pnpm run lint:gate`, `pnpm run build:ui`, `pnpm exec tsx scripts/check-bundle.ts` (it must pass now) and `pnpm exec tsx scripts/check-boot-imports.ts`. Then `pnpm run desktop:pack`. Then one real-model session of 2 runs on merged main, each with a fresh data folder:
1. The pick 4 prompt from Home to a share link opened at 390 x 844: 0 flow gaps, 0 phone gaps, tap through 3 screens.
2. A 3-page prototype beside a fresh `fv-next` copy, then Move to app of the flow: 3 route scores in the run note, `next build` passes, then one Cmd+Z returns all 3 files to the start.

## Real-model run budget

Local Claude Code sign-in, Sonnet, short runs. Move to app only into a fake Next app under `ds-wt`, never Bonaparte.
- pick 3 flow-review: 2 runs (branch gate, one re-run after a fix);
- pick 4 phone-flow: 2 runs (main and branch);
- the final merged session: 2 runs.

Picks 1, 2 and 5 need none. Total: 6 runs.

## Runners-up

1. Figma variables JSON import and export into project tokens (Figma rolls it out in November 2026).
2. Cards and badges in app source: `toDriftTag` never returns `card` or `badge` for TSX, and `apply_kit_drift` has no card or badge splice.
3. Skeleton states in the kit check: Bonaparte uses `<Skeleton` in 504 files; flag hand-made gray loading blocks.
4. First `port.start` under 2 s: start the first app version save on a user step before Start (dialog open) through a write route, not the `get_port_plan` read.
5. Rules repeat in each flow `route-update` block: send the 8 rule lines once per flow prompt (flow-update "Left out").
6. Copy and paste properties keys (Mod+Alt+C, Mod+Alt+V) for the existing Copy style and Paste style.
7. Nested inline tags in range mode (`<a><strong>x</strong></a>`).
8. Route copy into an existing prototype drops the first page's canvas frame (flow-update "Left out").
9. Range bar covers the next line when the notice shows: `toSpot` uses a fixed bar height (mixed-range "Left out").
10. Canvas memory (doop): a design note on the canvas that every new frame and run in the project reads.

Sources: [Figma release notes](https://figma.com/release-notes), [Figma release notes archive](https://www.figma.com/release-notes/archive/), [Figma What's new](https://www.figma.com/whats-new/), [Releasebot Figma](https://releasebot.io/updates/figma), [releases.sh productivity digest 2026-11-02](https://releases.sh/collections/productivity-apps/digest/2026-11-02), [mean.ceo: Claude Design news November 2026](https://blog.mean.ceo/claude-design-news-november-2026/), [PureAI: Anthropic overhauls Claude Design](https://pureai.com/articles/2026/06/17/anthropic-overhauls-claude-design.aspx), [The New Stack: Claude Design overhaul](https://thenewstack.io/anthropic-claude-design-overhaul/), [designcompass: Claude Design update](https://designcompass.org/en/2026/06/19/claude-design-update-design-system-ai-canvas/), [createwith: v0 design mode shortcuts](https://www.createwith.com/tool/v0/updates/v0-adds-keyboard-shortcuts-in-design-mode-for-faster-editing), [toolquestor: Lovable visual editor](https://toolquestor.com/news/lovables-new-visual-editor-lets-you-edit-any-part-of-your-app-without-using-prompts), [scrumlaunch: Lovable vs v0 2026](https://www.scrumlaunch.com/blog/lovable-vs-v0-ai-app-builders-2026), [dev.co: open design](https://dev.co/ai/frameworks/open-design), [Augment: open design v0.11](https://www.augmentcode.com/learn/open-design-v011-claude-design-alternative), [mcpservers.org: doop](https://mcpservers.org/servers/kgoedecke/doop), [openalternative: doop](https://openalternative.co/doop).

## Results

- **Merged:** all 5 into main in order (home-lean, polish-36, range-undo, flow-review, phone-flow), no conflicts. Main at `0fe41213c`.
- **Checks:** gen-routes --check, typecheck, lint:gate (59624, baseline 89733), build:ui pass. check:clip 0 findings.
- **Bundle:** Home preload 294,622 B (was 1,059,038 B; limit 300,000 B). check-bundle failed only on 31 new chunk names; the merge step lowered B1 in `scripts/perf/baseline.json` to 294,622 B with the new chunk list, and check-bundle passes.
- **Installed:** desktop:pack passed, reinstalled to /Applications. :4570 answers 200. Idle CPU 0.02 CPU-s per 60 s.
- **range-undo:** Mod+Z in an open range edit undoes and reopens the range.
- **flow-review:** every flow route gets a check; real run scored 83/85/83.
- **phone-flow:** each flow page probed at 390 px; real run fixed its phone line.
- **polish-36:** one Cmd+Z undoes a whole port run; "View canvas" sits in the play bar on phones.
- **Open:** Home bundle margin is only 5 KB; range undo not checked in Electron menus; one edit route area at 79.
