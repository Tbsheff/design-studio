# Feature cycle 37: next 5 features

Date: 2026-11-14. Main at `e682c14b6` (all 5 cycle-36 picks merged at `0fe41213c`; B1 lowered to 294,622 B at `e682c14b6`).

## Method

- Read `cycle-36.md` (picks, runners-up, Results "Open") and `cycle-36/{home-lean,range-undo,flow-review,phone-flow,polish-36}.md` ("Left out"), `git log --oneline -6` and `git branch -a`.
- Read the code for each pick:
  - Home preload set: `dist/ui/.vite/manifest.json` (the last `build:ui`, 11:44 today), walked from `index.html`: 33 chunks, 294,622 B. Importers of the `_keymap` and `_stream` chunks.
  - Electron Edit menu: `desktop/menu.ts` (`editMenu`), `desktop/native.ts` (`edit`), `ui/platform/desktop.ts` (`dispatchDesktopCommand`, `recentKeys`, `noteHandledShortcut`), `bridge/history-key.ts`, `ui/features/canvas/use-undo-shortcut.ts`.
  - Route update note: `agent/port-route-update.ts` (`toRouteUpdateNotes`, `toRouteFileNow`), `agent/run-notes.ts`, `agent/mock-port.ts`.
  - Flow review: `agent/port-review-routes.ts` (`listRouteChecks`, `listRoutePasses`, `isLoopOver`, `toRouteScore`), `agent/port-review.ts` (`isLowMatch`, `toFixLines`), `agent/port-flow-update.ts` (`toUpdateTag` use), `agent/port-route-update.ts` (`RULE_LINES`).
  - Range mode: `bridge/text-edit-range-mode.ts` (`INLINE_TAGS`, `isInlineTextChild`, `isMixedLayer`), `server/style-scope/text-search/{wrap-range.ts,segment.ts,apply-range.ts}`.
  - Kit in ports: `components/kit-drift/{kit-drift-scan.ts,kit-inventory.ts,kit-drift-prototype.ts}`, `components/kit-drift/engine/{to-drift-matches.ts,to-markup-drift.ts,to-card-drift.ts,types.ts}`, `actions/src/kit-drift/{list.ts,apply.ts,schema.ts}`, `agent/port-plan.ts` ("Kit components to use"), `feat/kit-cards` and `feat/kit-badges` logs.
  - Dark mode: `preview/{browser.ts,color-scheme.ts,axe.ts}`, `review/port-check/port-shots.ts`, `bridge/theme-control.ts`, `ui/features/canvas/use-play-theme.ts`, `agent/prompt.ts` (tokens.css), `agent/{prototype-phone-review.ts,prototype-kit-review.ts,prototype-review-opening.ts,prototype-review.ts}`.
  - Keys: `shared/{keymap.ts,keymap-edit.ts,keymap-tools.ts,keymap-view.ts,structure-keys.ts}`, `ui/features/layer-style/use-layer-style-host.ts`.
- Counted in Bonaparte (read only, `git ls-files`, `apps/dashboard/**/*.tsx`): `<Card` in 470 files, `<Badge` in 672, `<Skeleton` in 504, `dark:` classes in 220. `packages/ui/src/styles/globals.css` has a `.dark` block.
- No real-model run, no app run and no build for this research.

### Open items from cycle 36, and the pick that closes each

| Open item | Pick |
|---|---|
| Home bundle margin is only 5,378 B under 300,000 B | 5 polish-37 (cut), and the "Home preload files" flag for every pick |
| Range undo not checked against the Electron Edit menu | 5 polish-37 |
| The flow update note names only the first route file | 5 polish-37 |
| One edit route area stayed at 79 after the fix loops | 4 flow-fast (the note says why the loop stopped) |
| First `port.start` on a large repo is about 2.5 s | Not picked. Runner-up 1 |

### Findings

- **Home preload (open item 1, and a rule for all picks).**
  - The Home preload set is 33 chunks, 294,622 B. `react` is 222,320 B; the app code is about 72 KB: `main` 13,251, `stream` 10,122, `keymap` 9,992, `http` 6,783, `screen-preload` 6,462, `global-commands` 3,212, `commands/index` 3,142, `storage` 2,785.
  - `index.html` imports `_keymap` directly. `shared/keymap.ts` spreads `EDIT_KEYS`, `TOOL_KEYS` and `VIEW_KEYS`, so every new `KeyBinding` adds Home bytes. This rules out any pick that adds a key (see "Checked and not picked").
  - `_stream` is a shared chunk with about 100 importers (Home, Studio, share). It is named after its first module; its real content must be measured with a source map, as home-lean did.
- **Polish: Electron Edit menu and Mod+Z (open item 2).**
  - `menu.ts` gives Undo the accelerator `CmdOrCtrl+Z` with `click: actions.undo` (not `role: "undo"`). `native.ts` `edit()` sends `{ type: "undo" }` to the Studio window.
  - `dispatchDesktopCommand` drops the menu echo only when `recentKeys` saw a handled keydown. That listener is on the Studio window; a keydown in a preview frame never reaches it.
  - `bridge/history-key.ts` returns `null` for a typing target, so in a plain edit with typed text the frame does not call `preventDefault` and the key goes to the browser. On macOS the menu key equivalent can then run, the UI runs a history step, and the typed text is lost (range-undo "Left out"). Not proven in the packed app yet; the pick proves it first.
- **Polish: the route update note (open item 3).** `toRouteUpdateNotes` starts from `toRouteFileNow(prompt)`, which reads the first `<route-now>` block only, then adds the folder files. In a flow prompt the 2 other route files are never read, so the note says "Updated app/visits/page.tsx (kept 1 data read)". `port-route-update.ts` has 497 lines, so the per-route note goes in a new file.
- **Flow review is sequential, and the 79 (open item 4).**
  - `listRouteChecks` and `listRoutePasses` in `port-review-routes.ts` recurse one route at a time (`await steps.inspectRoute(head)`, then the rest). A 3-route flow takes about 3 times as long in each check (flow-review "Left out").
  - `isLowMatch` already counts any low area, so the loop did run for `top center 79`. It stopped at `LOOPS_MAX` (2) or `SECOND_LOOP_MS`. `toRouteScore` writes "(top center 79 under 80)" but not why the loop stopped. A third loop would cost a real-model turn per run; the pick changes the note only.
  - Each flow `route-update` block repeats the 8 `RULE_LINES` (`toUpdateTag`), so a 3-route prompt carries the rules 3 times (cycle-36 runner-up 5).
- **Figma gap: range mode on nested inline text.**
  - `isInlineTextChild` needs `element.children.length === 0`, and `isMixedLayer` needs every child to pass. So `<p>Read <a href="/terms"><strong>the terms</strong></a> first</p>` is not a mixed layer, and a `<br>` in a line also turns range mode off. In Figma, a link with bold text in it is one text layer with styled ranges.
  - The server writes one segment at a time (`toPicked` refuses a range across 2 segments with `CROSS_MESSAGE`), so a wrap inside "the terms" works. But `toUnwrapped` rebuilds the outer tag around `before` and `after` text: removing the link from a range inside the `<strong>` puts `<strong>` in `before` and makes `<a><strong></a>`, broken markup. So the pick has a server part.
- **Bonaparte path: Move to app never checks kit use.**
  - `port-plan.ts` writes "Kit components to use" into the prompt. `port-review.ts` checks render and the visual match only; no port file imports `kit-drift`. A port that writes a raw `<button className="bg-primary px-4 h-9">` scores 100 if it looks right.
  - The TSX scan exists: `listDriftIn(ts, inventory, absolutes)` in `kit-drift-scan.ts` scans given files for `button`, `input`, `label`, `select`, `table`, `textarea` and link-as-button. `list_kit_drift` and `apply_kit_drift` (`kit-drift.list`, `kit-drift.apply`) find and swap them.
  - Cards and badges: `feat/kit-cards` (`e2c3fea4a`) and `feat/kit-badges` (`404507e06`) cover HTML prototypes only. The kit-cards report "Left out" says TSX was not covered. `DriftTag` already has `card` and `badge`; `toDriftTag` never returns them, and `KIT_NAMES` in `kit-inventory.ts` has no `Card` or `Badge`. Bonaparte has `<Card` in 470 files and `<Badge` in 672.
- **AI quality: no run check sees dark mode.**
  - `render_check` uses `RENDER_VIEWPORTS` (desktop and mobile) with no `colorScheme`. `port-shots.ts` sets `colorScheme: null`. axe `color-contrast` runs in light only.
  - Users see dark: Play has a theme choice (`use-play-theme.ts` posts `set-theme`, `bridge/theme-control.ts` toggles `.dark`). Every prototype links `tokens.css`, which has dark values under `.dark` and `[data-theme="dark"]` (`agent/prompt.ts` line 64). A raw `color: #1a1a1a` on `var(--surface)` reads well in light and fails in dark.
  - The tool exists: `toSchemedPreview` in `preview/color-scheme.ts` renders with `.dark`, `data-theme` and `colorScheme` set. `get_screenshot` takes `theme: "dark"`.
- **Checked and not picked:**
  - Copy and paste properties keys (Mod+Alt+C, Mod+Alt+V; free, Copy style and Paste style exist in `use-layer-style-host.ts`): a new `KeyBinding` grows the Home `_keymap` chunk, and a new `StructureKey` changes a union. Runner-up 3.
  - Hide and lock keys: they exist (`isHideKey`, `isLockKey` in `layers-keys-model.ts`).
  - Select matching layers: exists (`bridge/select-match.ts`).
  - Whole-layer italic key: Mod+I is "Ask the chat about the selection" (`inline-prompt`). Not changed.
  - Skeleton states (Bonaparte `<Skeleton` in 504 files): no check finds them (`grep -i skeleton` in `server/` finds only page templates). Runner-up 6.
- **Competitor recheck (5 web searches, 2026-11-14).**
  - Claude Design: no confirmed November change. One unconfirmed blog post again. The June 2026 update (design-system import, Claude Code sync, export targets, compliance checks) is the base.
  - Figma: November items are variables, npm packages in Figma Make and extended collections. Text on a path, text on a circle and text color in table cells are listed in What's new (dates not confirmed). Text wrap Balance and Pretty shipped in August.
  - v0 and Lovable: no dated November item. v0 design mode (June 2026) has a floating toolbar on select. Lovable's toolbar has 4 modes, with inline text edit.
  - open design (nexu-io): now at v0.19.1 (cycle 36 said v0.13.0); v0.17 added one-click MCP setup, v0.18 fixed MCP hosts after a port change.
  - doop: HTML frames, MCP agents with their own cursors, screenshot self-review, Linear link. Nothing new since cycle 36.
  - The bar stays: fast to open, Figma-like direct edits, real-repo flows in the app's kit, and a flow that reads well on the device and theme it is opened in.
- **Branch check.** No `feat/range-nest`, `feat/port-kit`, `feat/dark-check`, `feat/flow-fast` or `feat/polish-37`. Near names that exist and are not used: `feat/kit-cards`, `feat/kit-badges`, `feat/kit-drift`, `feat/port-check`, `feat/port-verify`, `feat/text-keys`, `feat/figma-keys`, `feat/fast-boot`.
- **Fixture prefixes.** `rn-`, `pk-`, `dk-`, `fl-` and `p37-` are not in `ds-wt` (checked with `ls`). `ff-` is taken, so pick 4 uses `fl-`.

## Ranking

Score = value x fit with "simple and fast" / effort (1 to 5 each).

| Rank | Key | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|---|
| 1 | range-nest | Range mode works on lines with nested inline tags and `<br>`; removing an outer style splits the inner tag cleanly (Figma) | 4 | 5 | 3 | 6.7 |
| 2 | port-kit | The Move to app check flags raw markup that the app kit covers, cards and badges too, and the fix loop swaps it (Bonaparte) | 5 | 5 | 3 | 8.3 |
| 3 | dark-check | The prototype check renders each flow page in dark and flags text under AA contrast (AI quality) | 4 | 5 | 3 | 6.7 |
| 4 | flow-fast | Flow route checks run in parallel; the rules go once per flow prompt; the note says why the loop stopped (speed) | 3 | 5 | 2 | 7.5 |
| 5 | polish-37 | Mod+Z under the Electron Edit menu keeps typed text; the update note names every route; Home margin over 15 KB | 3 | 5 | 2 | 7.5 |

No pick adds an always-visible control, a key binding or a Home import:
- Pick 1 changes bridge rules and one server engine.
- Pick 2 adds review lines.
- Pick 3 adds review lines.
- Pick 4 changes review order, prompt text and note text.
- Pick 5 changes a frame message path, note text and lowers Home bytes.

---

## 1. range-nest: range mode on nested inline text (Figma)

**Why.** Links with bold text, and lines with a `<br>`, are common in real pages ("Read **the terms** first", an address on 2 lines). Today these lines open a plain edit, so the range bar, Mod+B and Mod+Z-in-edit (range-undo) do not work on them. In Figma such a line is one text layer with styled ranges.

**Behaviour.**
- **Mixed layer.** `isMixedLayer` accepts a line whose children are inline text tags (`INLINE_TAGS`) up to 2 deep (`<a><strong>x</strong></a>`), and `<br>`. Deeper nesting, a block child, or an element with its own layout keeps today's plain edit.
- **Snapshot and restore.** `toSnapshot` in range mode records every inline descendant, not only direct children, so the edit can restore the line after a blocked `beforeinput`.
- **Wrap.** A range inside one text part (one segment) wraps as now. A range across 2 parts keeps the server's `CROSS_MESSAGE`; the bar shows it as a notice, as now.
- **Unwrap of an outer tag.** When the range sits inside an inner tag (remove the link from "terms" in `<a><strong>the terms</strong></a>`), `toUnwrapped` closes and reopens the inner tags at the cut points, so the result is `<strong>the </strong><a><strong>terms</strong></a>`-shaped balanced markup, never `<a><strong></a>`. If the split cannot be made balanced (a `{...}` expression or an attribute on the inner tag that cannot be copied), fail with: "Remove the inner style first, then this one."
- **Double-click.** `hover-select.ts` `onDblClick` treats a nested inline child as part of its mixed line (range-undo already does this for depth 1).
- One write is one version, as now. No new toast.

**Headless.** No new action. `apply_range_text` (`text.applyRange`) input does not change (N4). The server change makes the MCP and agent calls safe on nested markup too.

**Main files.** `bridge/text-edit-range-mode.ts` (246 lines), `bridge/text-range.ts` (299) and `bridge/text-range-target.ts` only if the range offset walk reads direct children, `bridge/hover-select.ts` (`onDblClick` only), `server/style-scope/text-search/wrap-range.ts` (471 lines: put the inner-tag split in a new `text-search/split-inner.ts`). Not `bridge/history-key.ts` (pick 5), not `bridge/text-edit.ts` unless one call line is needed (455 lines).

**Verify in the running app.**
- HTML prototype (mock agent, data folder `ds-wt/rn-data`): `<p>Read <a href="/terms"><strong>the terms</strong></a> before you book.<br>Classes start at 7 am.</p>`.
  - Enter: range mode (the bar shows). Select "terms", Mod+U: underline inside the strong. Mod+Z: back, edit open (range-undo path).
  - Select "terms", remove the link in the bar: source has balanced tags; "the " keeps link and bold; "terms" keeps bold. `git diff` shows only those tags.
  - Select "7 am" on the second line, Mod+B: bold; the `<br>` stays.
  - Select across "terms" and " before": the notice names the cross rule; source unchanged.
- Tailwind fake app `ds-wt/rn-next` (Next 16, Tailwind 4, a JSX paragraph with `<Link><strong>`): the same steps with HMR; `next build` passes.
- `pnpm exec tsx scripts/call-action.ts text.applyRange '<json>'` for the outer-unwrap case: http, mcp and agent match, and the file parses.
- Dark and light screenshots of the range bar on the nested line. No real-model run.

---

## 2. port-kit: the Move to app check flags raw markup the kit covers (Bonaparte)

**Why.** Move to app is the Bonaparte path. The port plan tells the model which kit components to use, but no check reads the result. A route that looks right but uses a raw `<button>` and a hand-made card `div` scores 100, and the user gets a "done" note with code that a Bonaparte reviewer sends back. Bonaparte uses `<Card` in 470 dashboard files and `<Badge` in 672.

**Behaviour.**
- **Scan the changed route files.** After the render and match check, a new step runs `listDriftIn` on the TSX files that the port changed (the route files and their folder files from the port prompt, not the whole repo), with the app's kit inventory (`getKitInventory`).
- **Cards and badges (detect only).** A new pure engine `components/kit-drift/engine/to-tsx-card-drift.ts` finds JSX `div` and `span` elements whose static `className` has the card or badge signals. Reuse the signal helpers of `to-card-drift.ts` and `to-badge-variant.ts` (export them; do not copy). It finds only when the inventory has `Card` or `Badge`. These finds are port-review lines only; they do not enter `toDriftMatches`, so `list_kit_drift` output and `apply_kit_drift` do not change.
- **Review lines.** One line per find, max 6, then a count line:
  - "- Kit: app/visits/page.tsx line 42 has a raw <button> with button classes. Use Button from @/components/ui/button. Swap it with apply_kit_drift (id kd-…)."
  - "- Kit: app/visits/[id]/page.tsx line 18 is a hand-made card (border, radius, padding). Use Card from @/components/ui/card."
- **Fix loop.** A high-confidence find counts as a gap in `isFixNeeded`, so the loop runs as for a low area. Medium finds are listed only. The pass cap does not change. Single-page and flow ports use the same lines (`toFixLines` is shared by `port-review-routes.ts`).
- **Run note.** "Kit: 3 raw elements found, 0 left" next to the scores.

**Headless.** No new action, no schema change. `list_kit_drift` (`kit-drift.list`) and `apply_kit_drift` (`kit-drift.apply`) exist; the lines name them (E19). `start_port` input does not change (N4).

**Main files.** New `agent/port-review-kit.ts`; `agent/port-review.ts` (`toFixLines`, `isFixNeeded`: call lines only; 466 lines, stay under 500); new `components/kit-drift/engine/to-tsx-card-drift.ts`; `components/kit-drift/engine/{to-card-drift.ts,to-badge-variant.ts}` (export the signal helpers only) and `engine/index.ts` (export lines); `components/kit-drift/kit-inventory.ts` (read `Card` and `Badge` entries for the port step; if adding them to `KIT_NAMES` changes `list_kit_drift` output, use a separate lookup instead). Not `port-review-routes.ts` (pick 4), not `port-plan.ts` (1295 lines), not `kit-drift-apply.ts`.

**Verify in the running app.**
- New fake app `ds-wt/pk-next`: Next 16, Tailwind 4, shadcn-style `components/ui/{button,card,badge,input}.tsx`, routes `/crew` and `/crew/[id]`. A prototype beside it with a crew list (cards, status badges, a primary button).
- No model: a script feeds a ported `page.tsx` with a raw button, a card `div` and a badge `span` to the review step: 3 lines; after the swaps, 0 lines and no fix prompt.
- `pnpm exec tsx scripts/call-action.ts kit-drift.list '<json>'` on `pk-next` before and after the branch: same output (no action change).
- **Real-model run (2 short runs, Sonnet, fresh data folder):** Move to app of the crew flow onto `pk-next`. Pass: the run note shows kit finds and 0 left, the route files import `Button`, `Card` and `Badge`, all route scores are 80 or more, `next build` passes. One re-run after a fix. Never target Bonaparte.
- Dark and light screenshots of the run note.

---

## 3. dark-check: the prototype check renders each flow page in dark (AI quality)

**Why.** Every prototype links `tokens.css` with dark values, and Play lets the viewer switch to dark. No run check renders dark, so a raw text color that is fine in light can be unreadable in dark, and the user finds it in Play. Claude Design's bar is a design that holds in each theme it ships with.

**Behaviour.**
- At the prototype review of an HTML run with an edit, a new step checks each flow page (the page list of `inspectFlowPages`, up to 6).
- **Only pages with dark values.** Skip a page whose linked CSS has no `.dark` or `[data-theme="dark"]` block and no `prefers-color-scheme: dark` rule (a file read, no render). 0 such pages: no render, no line.
- **Dark render.** Render the page at 1440 x 900 through `toSchemedPreview(preview, "dark")` and run axe with `color-contrast` only (`runAxe`). The pages render in parallel, as the phone step does.
- **Lines.** One line per page with misses, max 6, then a count line:
  - "- Dark: 4 text items on plan.html are under AA contrast in dark (first: \".price\" 1.3:1). Use token colors such as var(--fg), not raw colors, then take get_screenshot with theme dark."
- The opening asks for a fix loop only when there is a dark line, with the same pass cap. Use `prototype-review-opening.ts` for the text; add a dark count to its counts type. One opening per pass: kit, flow, phone, then dark.
- Write the added seconds per pass in the report.

**Headless.** No new action. An MCP agent already has `get_screenshot` with `theme: "dark"` and `inspect_flow_page`. The line names only these tools (E19).

**Main files.** New `agent/prototype-dark-review.ts`; `agent/prototype-kit-review.ts` (`listKitLines` adds the dark lines: call lines only; 421 lines, stay under 500); `agent/prototype-review-opening.ts` (dark count and opening text); `preview/color-scheme.ts` and `preview/axe.ts` (exports only, if needed, through `preview/index.ts` or a leaf index, not the preview barrel from a lower area: W19b). Not `final-check.ts`, not `prototype-review.ts`, not `sdk-driver.ts`.

**Verify in the running app.**
- No model: seeded HTML project `ds-wt/dk-seed` with `tokens.css` (light and `.dark`), `index.html` (token colors only), `plan.html` (`.price { color: #1a1a1a }` on `var(--surface)`). A script calls the line builder: 1 dark line on `plan.html`; after a token fix, 0 lines and no opening. A page with no dark block: no render (log shows no dark render).
- **Real-model run (2 short runs):** the cycle-36 yoga flow prompt plus "Use a dark navy price badge on each plan.", on main and on the branch, fresh data folders. Score both with the branch step. Gate: 0 dark lines at run end on the branch. Report misses on main, loops, seconds and cost on both.
- Open the branch run's share link in Play, theme dark: the 3 pages read well. Dark and light screenshots.

---

## 4. flow-fast: faster flow checks and leaner flow prompts (speed)

**Why.** The goal says simple and fast. The flow check runs each route in turn, so a 3-route flow waits about 3 times as long at each check. The flow prompt repeats the same 8 rule lines in every route block. And when the loop stops with an area at 79, the note does not say why.

**Behaviour.**
- **Parallel checks.** `listRouteChecks` and `listRoutePasses` run the routes with at most 3 at a time (one shared limit), in route order for the output. The values pass on a route still runs after that route's check. Snapshots and undo of a loop stay per run, as now.
- **Rules once.** The flow prompt writes `RULE_LINES` once, under the flow header, and each `route-update` block keeps only its file, data reads and diff. Single-page prompts keep the rules in their block, as now.
- **Stop reason.** When the loop ends with a route or area under 80, the note adds why: "stopped after 2 fix loops" or "stopped at the time limit". No third loop.
- Write the check seconds per route on main and branch (mock driver and the real run).

**Headless.** No new action. `start_port` input does not change (N4). `inspect_port` is called the same way.

**Main files.** `agent/port-review-routes.ts` (416 lines), `agent/port-flow-update.ts` (rules once), `agent/port-route-update.ts` (497 lines: export `RULE_LINES` and give `toUpdateTag` a rules switch only; no growth over 500, else move `RULE_LINES` to a new `agent/port-rule-lines.ts`). Not `port-review.ts` (pick 2), not `port-start-prompt.ts` unless one header line is needed.

**Verify in the running app.**
- Fake app `ds-wt/fl-next` (copy of the cycle-36 `fv-next` shape: `/visits`, `/visits/[id]`, `/visits/[id]/edit`) and a 3-page prototype beside it.
- No model: `port.start` with `flow: true` over HTTP and MCP; the run log prompt has the rule lines once and 3 `route-update` blocks. Mock `[port-bash]` driver: 3 route scores, the first check's wall time on main and branch (5 runs each, p50).
- **Real-model run (1 short run, Sonnet, fresh data folder):** Move to app of the flow onto `fl-next`. Pass: 3 scores, each 80 or more or a stop reason in the note, `next build` passes, total run time and cost against the cycle-36 flow-review run.
- Dark and light screenshots of the run note.

---

## 5. polish-37: Electron Mod+Z, the flow update note, Home margin

**Items.**
- **Mod+Z under the Electron Edit menu.** First prove it in the packed app (`pnpm run desktop:pack`): a plain edit, type "x", Cmd+Z. Then fix the case that shows:
  - A: the browser undoes "x" and the menu also runs a history step. Fix: when `historyKeyBody` leaves Mod+Z to the browser, the bridge posts a notice; `ui/features/canvas/preview-key-forward.ts` (lazy, not on Home) calls the existing `noteHandledShortcut`, so `dispatchDesktopCommand` drops the menu echo.
  - B: the menu runs and the browser does not undo. Fix: on the same notice, the UI answers the next menu `undo` or `redo` by posting a text undo to the frame, which runs `document.execCommand("undo")` (or `"redo"`) in the edit, and skips the history step.
  - Do not edit `ui/platform/desktop.ts` or `desktop/menu.ts` (Home chunk; menu role stays). If neither case shows, write that in the report and change nothing.
- **The flow update note names every route.** A new `agent/port-route-notes.ts` reads every `<route-now>` block of a flow prompt (reuse the block parse that flow-review added in `port-flow-update.ts`; do not copy it), reads each file after the run and writes one note: "Updated app/visits/page.tsx, app/visits/[id]/page.tsx and app/visits/[id]/edit/page.tsx (kept 4 of 4 data reads)". Single-page notes stay as now. `run-notes.ts` and `mock-port.ts` call the new function (call lines only).
- **Home margin over 15 KB.** Build once with `build.sourcemap` in a temporary config (no commit), sum Home bytes per source, and cut at least 10,000 B more with no behaviour change, so the margin is over 15,000 B. Start with `_stream` (a shared chunk with about 100 importers: find which of its modules Home does not run before paint) and `_keymap` (Home shows only General and Home labels). Do not change `scripts/perf/baseline.json` (P10); write the new bytes and chunk list in the report for the merge step.

**Headless.** No new action. The note text is the same on every surface. MCP and the chat agent do not load Home code.

**Main files.** `bridge/history-key.ts`; `ui/features/canvas/preview-key-forward.ts`; `packages/common/contracts/src/contracts.ts` only if a bridge message is needed (see unions); new `agent/port-route-notes.ts`; `agent/{run-notes.ts,mock-port.ts}` (call lines); `agent/port-flow-update.ts` (export the block parse only); Home cuts in the files that the source map names, without moving share-viewer or canvas code into Home. Not `ui/platform/desktop.ts`, not `desktop/menu.ts`, not `port-review*.ts`.

**Verify in the running app.**
- Packed app, prototype with an `h1`: Enter, type "x", Cmd+Z: "x" goes, no version change in Versions. Cmd+Z again: one history step. Then Edit menu > Undo with the mouse in the same states: same result. Range mode (range-undo steps): still undoes the style and keeps the edit open.
- Mock flow port on `ds-wt/p37-next` (3 routes): the run note names 3 files.
- `pnpm run build:ui`, then `pnpm exec tsx scripts/check-bundle.ts`: B1 under 285,000 B, 0 byte failures. Cold Home load in a fresh data folder: Home paints, open a project, open a share link.
- Dark and light screenshots of Home and the run note. No real-model run.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 range-nest | `bridge/{text-edit-range-mode.ts,text-range.ts,text-range-target.ts,hover-select.ts}`; `server/style-scope/text-search/wrap-range.ts` and new `text-search/split-inner.ts`; fixtures `ds-wt/rn-*` |
| 2 port-kit | new `agent/port-review-kit.ts`; `agent/port-review.ts` (call lines); new `components/kit-drift/engine/to-tsx-card-drift.ts`; `components/kit-drift/engine/{to-card-drift.ts,to-badge-variant.ts,index.ts}` (exports); `components/kit-drift/kit-inventory.ts`; fixtures `ds-wt/pk-*` |
| 3 dark-check | new `agent/prototype-dark-review.ts`; `agent/{prototype-kit-review.ts,prototype-review-opening.ts}`; `preview/{color-scheme.ts,axe.ts}` (exports only); fixtures `ds-wt/dk-*` |
| 4 flow-fast | `agent/{port-review-routes.ts,port-route-update.ts}`; `agent/port-flow-update.ts` (rules once); new `agent/port-rule-lines.ts` only if needed; fixtures `ds-wt/fl-*` |
| 5 polish-37 | `bridge/history-key.ts`; `ui/features/canvas/preview-key-forward.ts`; new `agent/port-route-notes.ts`; `agent/{run-notes.ts,mock-port.ts}` (call lines); `agent/port-flow-update.ts` (one export); the Home cut files the source map names; `packages/common/contracts/src/contracts.ts` (only if needed); fixtures `ds-wt/p37-*` |

Shared files and conflict warnings:
- **Home preload files (all picks).** The 33 Home chunks come from `ui/app/main.tsx`, `ui/app/screen-preload.ts`, `shared/keymap*.ts`, `ui/platform/{desktop,http,storage,query,telemetry,typing-target,find-element,live-store,router,focus}.ts` and their `_stream` and `_http` shared modules, and `ui/features/commands/{index,global-commands,keys,registry,command-disabled,copy}.ts`. No pick adds a line to these files except pick 5, and pick 5 only removes bytes. Every pick with a `src/ui` or `src/shared` change runs `pnpm run build:ui` and `check-bundle`: B1 at or under 294,622 B (pick 5: under 285,000 B).
- **Bridge (picks 1 and 5).** Pick 1 owns the range files and `hover-select.ts`; pick 5 owns `history-key.ts`. Neither edits the other's files. `bridge/text-edit.ts` (455 lines): one call line each at most; if both need it, pick 5 rebases on pick 1. After both merge, run the range-undo steps and the pick 5 packed-app steps once more.
- **Port review (picks 2, 4 and 5).** Pick 2 owns `port-review.ts`; pick 4 owns `port-review-routes.ts` and `port-route-update.ts`; pick 5 adds only a new notes file and call lines. `port-flow-update.ts`: pick 4 changes the block text (rules once); pick 5 exports the block parse only. Pick 5's parser must read `<route-now>` blocks, never the rule lines, so pick 4's change does not break it. Pick 2's kit lines go through `toFixLines`, which pick 4's parallel loop calls unchanged.
- **Kit drift (pick 2 only).** No other pick edits `components/kit-drift/**`. Pick 3 reads no kit-drift code.
- **Prototype review (pick 3 only).** Pick 3 owns `prototype-kit-review.ts` and `prototype-review-opening.ts`. No pick edits `final-check.ts`, `prototype-review.ts`, `prototype-phone-review.ts` or `sdk-driver.ts`.
- **Unions.**
  - Pick 5 may add one frame-to-UI message (the "left to the browser" notice) and one UI-to-frame message (text undo, case B only). If it does, grep every `switch` and `Record<` over `BridgeMessage['type']` and the `*_TYPES` lists in `src/shared` and `src/bridge` (N12) before the commit. Prefer a field on the existing `history-key` message if that covers case A.
  - Pick 2 adds no `DriftTag` or `KitDriftSkipReason` member: `card` and `badge` exist, and TSX card finds stay outside `toDriftMatches`.
  - Pick 3 adds a count field to the opening counts type in `prototype-review-opening.ts` only.
  - No two picks change one union.
- **`copy.ts`.** No pick needs UI copy. If pick 1 shows the new unwrap message, it comes from the server text, not `text-range/copy.ts`.
- **`@generated` lists.** No pick adds or changes an action, so `gen-routes` output must not change. Run `pnpm exec tsx scripts/gen-routes.ts --check` after each merge.
- **Hand aggregators.** No pick edits `actions/index.ts`, `main/live-layer.ts`, `http/mount-all.ts`, `mcp/registry.ts` or `agent-tools/registry.ts`.
- **MCP snapshots.** No pick changes a tool input in `artifacts/mcp-snapshots/*.json`, and no tool description.
- **Perf baseline.** Pick 5 must not edit `scripts/perf/baseline.json` (P10, L6). The merge step sets B1 from pick 5's report, downward only.
- **Long files.** `port-plan.ts` (1295), `sdk-driver.ts` (1622): no edits. `port-route-update.ts` (497), `wrap-range.ts` (471), `port-review.ts` (466), `text-edit.ts` (455), `prototype-kit-review.ts` (421), `port-review-routes.ts` (416): keep under 500; new logic in new files.
- **Fake apps under `ds-wt`.** Each pick has its own prefix (`rn-`, `pk-`, `dk-`, `fl-`, `p37-`). No pick writes into Bonaparte. No Move to app run targets Bonaparte or a clone of it.
- **`.claude/goal/roadmap.md` Appendix A:** add each pick's new files when the file is in the worktree (L6e). Cycle 36 found the file missing in worktrees; write that in the report if it is still missing.

## Merge order

All 5 can run at once. Merge in this order:
1. **polish-37**: Home cut first, so the other picks rebase on the wider margin; the merge step then sets B1. Run the packed-app Mod+Z steps after merge.
2. **range-nest**: bridge and one server engine; rebase on polish-37, run `pnpm run typecheck`, `build:ui`, `check-bundle`, then the range-undo and range-nest steps.
3. **flow-fast**: port review loop and flow prompt; run the mock `[port-bash]` check after merge (3 scores, rules once, pick 5's note names 3 files).
4. **port-kit**: adds kit lines into the port loop; rebase on flow-fast, re-run its no-model line script and `call-action.ts kit-drift.list`.
5. **dark-check**: last, because it adds a render to every prototype run with dark tokens; re-run its no-model line check after the rebase.

After the last merge, run `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run check:scripts`, `pnpm run lint:gate`, `pnpm run build:ui`, `pnpm exec tsx scripts/check-bundle.ts` and `pnpm exec tsx scripts/check-boot-imports.ts`. Then `pnpm run desktop:pack`. Then one real-model session of 2 runs on merged main, each with a fresh data folder:
1. The pick 3 prompt from Home to a share link in Play, theme dark: 0 dark lines, 0 phone gaps, tap through 3 screens.
2. A 3-page prototype beside a fresh `pk-next` copy, then Move to app of the flow: 3 route scores, kit finds 0 left, the note names 3 files, `next build` passes.

## Real-model run budget

Local Claude Code sign-in, Sonnet, short runs. Move to app only into a fake Next app under `ds-wt`, never Bonaparte.
- pick 2 port-kit: 2 runs (branch gate, one re-run after a fix);
- pick 3 dark-check: 2 runs (main and branch);
- pick 4 flow-fast: 1 run (branch, time against cycle 36);
- the final merged session: 2 runs.

Picks 1 and 5 need none. Total: 7 runs.

## Runners-up

1. First `port.start` under 2 s: start the first app version save on a user step before Start through a write route (`get_port_plan` is a read, S7).
2. Cards and badges swap in app source: an `apply_kit_drift` splice for TSX `Card` and `Badge` (pick 2 only detects them).
3. Copy and paste properties keys (Mod+Alt+C, Mod+Alt+V) for Copy style and Paste style, once a key can load off Home.
4. Dark check in Move to app: render each port route with `.dark` for apps that have dark tokens (Bonaparte has `dark:` in 220 files).
5. Asset folder for a dynamic single page: a move to `/visits/[id]` copies assets to `public/id/` (flow-review "Left out").
6. Skeleton states in the kit check: Bonaparte uses `<Skeleton` in 504 files; flag hand-made gray loading blocks.
7. Route copy into an existing prototype drops the first page's canvas frame (seen in cycle 35 and cycle 36).
8. Phone tally in the run note and a phone opening on the `toPrototypeReviewGaps` path (phone-flow "Left out").
9. Figma variables JSON import and export into project tokens (Figma rolls it out in November 2026).
10. Undo of a created route file leaves an empty folder (`app/crew3/`) (polish-36 "Left out").

Sources: [Figma release notes](https://figma.com/release-notes), [Figma release notes archive](https://www.figma.com/release-notes/archive/), [Figma What's new](https://www.figma.com/whats-new/), [Releasebot Figma](https://releasebot.io/updates/figma), [releases.sh productivity digest 2026-11-02](https://releases.sh/collections/productivity-apps/digest/2026-11-02), [mean.ceo: Claude Design news November 2026](https://blog.mean.ceo/claude-design-news-november-2026/), [The New Stack: Claude Design overhaul](https://thenewstack.io/anthropic-claude-design-overhaul/), [PureAI: Anthropic overhauls Claude Design](https://pureai.com/articles/2026/06/17/anthropic-overhauls-claude-design.aspx), [IT Brief: Claude Design connectors](https://itbrief.co.uk/story/anthropic-expands-claude-design-with-new-connectors), [createwith: v0 design mode](https://www.createwith.com/tool/v0/updates/v0-launches-design-mode-with-visual-editing-and-layer-management), [createwith: Lovable toolbar](https://www.createwith.com/tool/lovable/updates/lovable-launches-new-toolbar-with-four-interaction-modes-for-visual-editing), [scrumlaunch: Lovable vs v0 2026](https://www.scrumlaunch.com/blog/lovable-vs-v0-ai-app-builders-2026), [GitHub: nexu-io/open-design](https://github.com/nexu-io/open-design), [newreleases: open design v0.19.1](https://newreleases.io/project/github/nexu-io/open-design/release/open-design-v0.19.1), [newreleases: open design v0.18.0](https://newreleases.io/project/github/nexu-io/open-design/release/open-design-v0.18.0), [mcpservers.org: doop](https://mcpservers.org/servers/kgoedecke/doop), [pyshine: doop](https://pyshine.com/Doop-A-Multiplayer-Design-Canvas-Where-Agents-Design-Too/).

## Results

- **Merged:** all 5 into main in order (polish-37, range-nest, flow-fast, port-kit, dark-check), no conflicts. Main fix `a329c5b51`: `isLowerSet` keeps a flow loop that trades kit parts for a drop of 2 points or less, as `isLower` does.
- **Checks:** gen-routes --check, typecheck, lint:gate (59619, baseline 89733), build:ui pass. check:clip 0 findings. check-bundle passes.
- **Bundle:** Home preload 274,703 B (was 294,622 B). The merge step lowered B1 bytes in `scripts/perf/baseline.json` to 274,703 B.
- **Installed:** desktop:pack passed, reinstalled to /Applications. :4570 answers 200. Idle CPU 0.02 CPU-s per 60 s.
- **range-nest:** range mode works on nested tags and `<br>`; unwrap keeps tags balanced.
- **flow-fast:** route checks run 3 at a time; first check p50 3.37 s to 2.70 s; real run 100/100/100.
- **port-kit:** port check finds raw kit markup and hand-made cards and badges; both real runs used the kit already.
- **dark-check:** branch real run ended with 0 dark contrast lines; main ended with 2.
- **polish-37:** update note names every route file; Edit > Undo in a text edit undoes typed text.
- **Open:** parallel route checks hit preview errors (re-check covers it, root cause unknown); bar Bold double-bolds inside a link; Cmd+Z through the macOS menu by keyboard not checked.
