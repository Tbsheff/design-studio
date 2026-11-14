# Feature cycle 39: next 5 features

Date: 2026-11-14. Main at `b503c2048` (all 5 cycle-38 picks merged; B1 at 274,703 B, delta 0).

## Method

- Read `cycle-38.md` (picks, runners-up, Results) and `cycle-38/{app-check,photo-text,frame-fit,copy-props,polish-38}.md` ("Left out" and the copy-props check table).
- Read the runners-up of `cycle-30.md` to `cycle-37.md`, and counted the items that came back cycle after cycle.
- Read the code for each candidate:
  - Kit drift: `packages/common/actions/src/kit-drift/{schema.ts,list.ts}`, `components/kit-drift/{kit-drift-port.ts,kit-drift-apply.ts,kit-inventory.ts}`, `components/kit-drift/engine/{to-drift-matches.ts,to-drift-splices.ts,to-tsx-card-drift.ts,to-card-drift.ts,to-badge-drift.ts,index.ts}`.
  - Dark and port review: `agent/{port-review.ts,port-review-pass.ts,port-review-routes.ts,app-review-dark.ts,app-review-lines.ts,prototype-dark-review.ts}`, `preview/{text-on-photo.ts,axe.ts,page-capture/index.ts}`, `shared/server-ports.ts` (`RenderPage`), `actions/src/port/{start.ts,inspect.ts}`, `actions/src/accessibility/inspect.ts`, `actions/src/workspace/get-screenshot.ts`.
  - Keys and order: `shared/{keymap.ts,keymap-edit.ts}`, `AppKey`, `MOD_APP_KEYS`, `MOD_ALT_APP_KEYS`, `StructureOp` and `STRUCTURE_OPS` in `packages/common/contracts/src/contracts.ts`, `desktop/menu.ts` (accelerators), `actions/src/stacking/{get.ts,set.ts,schema.ts}`, `ui/features/stacking/*`, `mcp/move-tools.ts`.
  - Polish: `ui/features/layer-style/{copy.ts,use-layer-style-host.ts,layer-style-model.ts}`, `style-scope/text-search/apply-range.ts`.
  - Frames: `contracts/src/canvas-file.ts` (`CANVAS_MAX_SIDE`), `canvas/frame-fit/engine/to-fit-height.ts`, the `4000` literals in `ui/features/canvas` and `actions/src/canvas`.
  - Repeat items: `design-system/extract/figma-variables.ts`, `design-system/token-export/engine/to-figma.ts`, `actions/src/design-rule/*`.
- Counted Bonaparte use (read only, `git grep -l` on `*.tsx`): `<Skeleton` 510 files, `animate-pulse` 63, `<Card` 529, `<Badge` 751.
- Ran 2 web searches (Claude Design November 2026, Figma layer order keys).
- Did no real-model run, no app run, no build and no test for this research. The B1 number is from cycle 38 (`check-bundle` at the merge); no new build was made.

### Open items from cycle 38, and the pick that closes each

| Open item | Pick |
|---|---|
| OS-keyboard Cmd+Z through the macOS menu not run (screen locked, 2 cycles) | 5 polish-39 (with a stop rule) |
| Photo-text pass not in the dark step (photo-text "Left out") | 5 polish-39 |
| App-check dark fix `0e62a8f89` (CSS transition race) checked only with the no-model script | 5 polish-39 (one real run) |
| Copy-props toast says "Style copied", not "Copied style of h2" | 5 polish-39 |
| CSS transition race may also hit the prototype dark check `listDarkLines` (app-check "Left out") | 5 polish-39 |
| `apply-range-text` says "The file of this layer was not found." in an app project with no canvas frame (polish-38 finding) | 5 polish-39 (prove first) |
| Frame-fit stops at 4,000 px (`CANVAS_MAX_SIDE`) | Runner-up 1 (a tool input change) |
| Home preload 274,703 B | Gate for every pick: B1 at or under 274,703 B |

### Findings

- **Home preload (a rule for all picks).**
  - The gate is B1 at or under 274,703 B. Cycle 38 found no `src/shared/*` module in a Home chunk; only `ui/features/commands/keys.ts` (31 B) is on Home from the key code.
  - `ui/features/commands/{index,global-commands,registry,keys}` and `ui/platform/*` are on Home. No key handler goes there. A handler goes in a lazy feature file, as `ui/features/layer-style/use-layer-style-keys.ts` does (cycle 38).
- **Repeat items: which are real.**
  - **Cards and badges swap in app source** (runner-up in cycles 33 to 38, 6 cycles). Real. `listFileLooks` in `components/kit-drift/kit-drift-port.ts` (lines 102 to 136) builds each TSX card and badge find with `id: null` (line 132), so `apply_kit_drift` cannot swap it. `toTsxCardDrift` (`engine/to-tsx-card-drift.ts`) returns only `column`, `line` and `tag`, with no class plan.
  - **Skeleton states in the kit check** (cycles 33 to 38, 6 cycles). Real. No `skeleton` or `Skeleton` text in `components/kit-drift/**` or `agent/**`. `KitDriftTagSchema` (`kit-drift/schema.ts` lines 7 to 17) has no `skeleton` member.
  - **Dark check in Move to app** (cycles 37 and 38). Real. `inspectRoute` (`agent/port-review-pass.ts` lines 71 to 88) runs only `match`, `render` and `kit`. `PortCheck` (`agent/port-review.ts` line 62) has no dark field. No `port-review*.ts` file has the word "dark".
  - **Bring forward and send backward on `Mod+]` and `Mod+[`** (cycles 30, 31, 32 and 38). Real. `keyMatches` (`shared/keymap.ts` lines 411 and 412) already reads `BracketRight` and `BracketLeft`, but no binding uses `Mod+]` or `Mod+[`. `Mod+Alt+]` and `Mod+Alt+[` are "Next direction" and "Previous direction" (`keymap.ts` lines 85 and 91), so Figma's Bring to front and Send to back keys are not free. No `desktop/menu.ts` accelerator uses a bracket. `ui/features/stacking/*` has only a z-index field (`z-index-field.tsx`), no forward or backward control.
  - **Figma variables JSON import and export** (cycles 31 to 38, 8 cycles). **Stale: the code exists.** Import: `figmaToDtcg` and `isFigmaVariables` in `design-system/extract/figma-variables.ts`, called from `extract/json-tokens.ts` line 3. Export: `toFigma` in `token-export/engine/to-figma.ts` line 256, format `"figma"` in `token-export/to-token-export.ts` lines 14 and 46. Do not carry it to cycle 40.
  - **Canvas memory (doop)** (cycles 30 to 36). Mostly covered by the `design-rule` domain (`create`, `inspect-proposals`, `set-proposal`) and `dev-note`. Not picked.
- **Layer order: DOM order against z-index (the decision every past cycle held back).**
  - DOM order already has keys and a tool: "Move up" `Alt+↑` and "Move down" `Alt+↓` (`keymap.ts` lines 168 and 169) and the MCP tool `move_element` (`mcp/move-tools.ts` line 153). In flow layout a DOM move changes the layout.
  - Paint order has a tool and no key: `set_stacking` and `get_stacking` (`actions/src/stacking/{set,get}.ts`) with a `zIndex` and a `position` field (`stacking/schema.ts` lines 45 to 58).
  - Decision (pick 3): `Mod+]` and `Mod+[` change paint order only, through `set_stacking`. They never move the element in the DOM, so the layout never changes. Figma shows the result as a list move; here a list move is `Alt+↑` and `Alt+↓`.
- **Dark render helpers that a port check can reuse.**
  - `inspectAppDark(ctx, preview, url, changed)` (`agent/app-review-dark.ts` line 189) reads the app dark tokens, renders the URL in dark at 1440 x 900, keeps the items in the changed files near changed lines, and gives lines and counts. A ported route file is new, so every line of it is a changed line.
  - The transition stop (`STILL_EXPRESSION`, `app-review-dark.ts` line 47) is only on the app path. `listContrastMisses` (`prototype-dark-review.ts` line 144) has none, so the prototype dark check still has the cycle-38 race.
  - `RenderPage.screenshot(outPath, clip)` exists (`shared/server-ports.ts` line 76), so `runPhotoTextPass` (`preview/text-on-photo.ts` line 347) can run on the page that `listContrastMisses` gets. It must import through `preview/page-capture/index.ts` (W19b).
- **MCP paths.**
  - `start_port` (`actions/src/port/start.ts`) "starts one studio agent run in the app", so a Move to app started over MCP gets the same port review as the UI. `inspect_port` returns only `PortMatchSchema` (`port/inspect.ts` line 26).
  - `render_check` is an agent-only tool (`agent/tool-groups/agent-only.ts` line 45), not an MCP tool. `inspect_accessibility` has no `colorScheme` input. `get_screenshot` has `colorScheme` (`workspace/get-screenshot.ts` line 87).
  - `artifacts/mcp-snapshots/*.json` hold no output schemas (0 `outputSchema` in `canvas.json`), and no snapshot lists `list_kit_drift`. So a new `KitDriftTag` member changes no snapshot.
- **Frame cap (not picked).** `CANVAS_MAX_SIDE = 4000` (`contracts/src/canvas-file.ts` line 10) has 5 copies as literals: `ui/features/canvas/{use-viewport-custom.ts:9,canvas-frame-ops.ts:29,frame-resize-model.ts:10}`, `actions/src/canvas/schema.ts:232`, `actions/src/canvas/frame/schema.ts:19`. A change to one and not the others breaks the parser or the resize. Raising it changes tool inputs, so it is runner-up 1.
- **Toast text.** `copied: "Style copied"` is at `ui/features/layer-style/copy.ts` line 6 and is sent at `use-layer-style-host.ts` line 109. The tag is known at that point (`label: target.tag`, line 104).
- **Range apply in an app with no frame.** `toChangedFile` (`style-scope/text-search/apply-range.ts` line 145) throws when `scopeOf(...)` returns no file with the layer path. Cycle 38 found that the scope builds its app files from canvas frames.
- **Competitor recheck (2 web searches, 2026-11-14).**
  - Claude Design: it now runs in any Claude chat, also Claude Code, with on-canvas edit. The standalone site closes on 2026-12-14. An admin can lock one design system. A November startup blog again lists native Figma export, version history and multiplayer edit as missing. No new feature that changes the bar.
  - Figma: `Mod+]` and `Mod+[` are Bring forward and Send backward. Figma moved `Mod+Alt+↑` and `Mod+Alt+↓` to rotate in October 2025 and put them back in February 2026 after user complaints. Layer order keys are used constantly.
  - v0, Lovable, open design and doop: nothing new since cycle 38.
  - The bar stays: fast to open, Figma-like direct edits, real-repo work in the app kit, and the same checks on the chat, MCP and app paths.
- **Branch check.** No `feat/port-dark`, `feat/kit-swap`, `feat/kit-skel`, `feat/z-keys` or `feat/polish-39` (checked with `git branch -a --list`).
- **Fixture prefixes.** `pd-`, `ks-`, `kl-`, `zk-` and `p39-` are not in `ds-wt` (checked with `ls`). `sk-` is in use, so no pick uses it. `ac-next-b` (cycle 38) is in `ds-wt`; picks copy it and never write into it.

## Ranking

Score = value x fit with "simple and fast" / effort (1 to 5 each).

| Rank | Key | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|---|
| 1 | port-dark | Move to app checks each ported route in dark, and the fix loop gets dark lines (Bonaparte) | 5 | 5 | 2 | 12.5 |
| 2 | kit-swap | `apply_kit_drift` swaps hand-styled cards and badges in app TSX for `Card` and `Badge` (Bonaparte) | 5 | 5 | 3 | 8.3 |
| 3 | z-keys | `Mod+]` and `Mod+[` bring a layer forward and send it backward (Figma) | 4 | 5 | 2 | 10.0 |
| 4 | kit-skel | The kit check finds hand-made loading blocks and swaps them for `Skeleton` (AI quality) | 4 | 5 | 3 | 6.7 |
| 5 | polish-39 | Toast text, photo-text in dark, transition stop for prototypes, a real app-check dark run, OS-keyboard Cmd+Z, range apply with no frame | 3 | 5 | 2 | 7.5 |

The file lists the picks in a fixed order (Bonaparte, Bonaparte, Figma, AI quality, polish), not by score.

No pick adds an always-visible control, an action or a Home import:
- Pick 1 adds review lines to the port run.
- Pick 2 gives existing finds an id and a splice.
- Pick 3 adds 2 keys, handled in a lazy file.
- Pick 4 adds one find kind.
- Pick 5 changes one toast text, the dark helper and maybe one scope step.

---

## 1. port-dark: dark check on Move to app routes (Bonaparte)

**Why.** Bonaparte has `dark:` in 220 files and a `.dark` block in `globals.css`. Cycle 37 checks prototypes in dark, and cycle 38 checks chat edits of an app in dark. A Move to app run writes a full new route file and gets no dark check. A ported price label in raw navy text on `bg-background` passes the port review and fails in dark. This was a runner-up in cycles 37 and 38.

**Behaviour.**
- **Which runs.** Every port review pass (`inspectRoute`, `port-review-pass.ts` line 71), for each route of the port, new or update, in the UI and in a `start_port` run.
- **The check.** Add a 4th entry to the `Promise.all` in `inspectRoute`: `dark`, through a new `agent/port-review-dark.ts` that calls `inspectAppDark` (`app-review-dark.ts` line 189) with the route URL and the route files as the changed files. A new route file counts as changed on every line. A route update counts only the lines that the run changed (the same `ChangedFile` list that `app-check` builds). Do not copy the render, the axe expression or the timeout.
- **No dark tokens.** `inspectAppDark` already returns "not checked" and writes `[agent] app dark check: no dark values, so no dark render`. The port line says "Dark: not checked (the app has no dark values)."
- **Lines.** `PortCheck` (`port-review.ts` line 62) gets `readonly dark: AppDarkCheck | null`. The port review prompt gets the dark lines of `AppDarkCheck.lines` (max 6, then a count line), with the same text as the app-check line and the route file and line.
- **Fix loop.** A dark item counts as a gap, as a high kit find does. A pass that lowers the dark count and lowers the match score by 2 points or less is kept, as `isKitTrade` does (`port-review-pass.ts` line 90). The pass cap does not change.
- **Run note.** "Studio port check: Match 86; Kit: 0 left; Dark: 1 item under AA (app/(dashboard)/crew/page.tsx line 42, 1.4:1)."
- **Cost.** One dark render per route per pass, at most 12 s, run in parallel with the other 3 checks. Write the added ms per route in the report.

**Headless.** No new action, no schema change. The UI path is Move to app. The MCP path is `start_port`, which runs the same studio review (read the note with `get_run`). The lines name only `get_screenshot` (with `colorScheme` dark), `edit_element` and `apply_kit_drift` (E19).

**Main files.** New `agent/port-review-dark.ts`. `agent/port-review-pass.ts` (412 lines): the 4th check and the keep rule. `agent/port-review.ts` (472 lines): the `dark` field. `agent/port-review-routes.ts` (496 lines): line swaps only, never growth; put new text in `port-review-dark.ts`. `agent/app-review-dark.ts`: no change, except an `export` word if a type is needed. Not `final-check.ts` (521), not `components/kit-drift/**`, not `preview/**`.

**Verify in the running app.**
- New fake app `ds-wt/pd-next`: a copy of `ac-next-b` (checked clean on 2026-11-14: `app/crew/page.tsx` has no `Export`, `<Button` or `<Badge`; `ac-next-rb` and `ac-next-rm` are the cycle-38 run copies, never use them) (Next 16, Tailwind 4, `components/ui/{button,card,badge}.tsx`, `app/globals.css` with `:root` and `.dark`). A second copy `ds-wt/pd-light` with no `.dark` block.
- HTML prototype `ds-wt/pd-proto` beside `pd-next`, with a page that has a price label in `color: #1a2a4a` on the page background.
- No model: feed a port run state (one written route with that label) to the port review: 1 dark line, a fix opening. After a fix to `text-foreground`: 0 lines. On `pd-light`: "Dark: not checked" and the log line.
- **Real-model run (2 short runs, Sonnet, fresh data folders):** Move to app of `pd-proto` into `pd-next`, on main and on the branch. Pass on the branch: 0 dark items at run end, `next build` passes. Report what main shipped, loops, seconds, cost and the added ms per route. Never target Bonaparte.
- Dark and light screenshots of the run note.

---

## 2. kit-swap: swap hand-styled cards and badges in app TSX (Bonaparte)

**Why.** Bonaparte uses `<Card` in 529 files and `<Badge` in 751. The port check and the app check find a hand-styled card or pill in TSX (cycles 33 and 37), but the find has no id, so `apply_kit_drift` cannot fix it and the agent rewrites it by hand, often badly. This was a runner-up in cycles 33 to 38.

**Behaviour.**
- **Ids.** `listFileLooks` (`kit-drift-port.ts` line 102) gives each look find an id from `toDriftId` (`engine/to-drift-id.ts`), as button finds have. The find keeps `isHigh: true`.
- **Plan.** `toTsxCardDrift` returns a class plan for each find: the classes that the app `Card` or `Badge` base covers (read from the kit file through `kit-inventory.ts`, the same recipe source the HTML card check uses in `to-card-drift.ts`), and the classes to keep. For a badge, also the variant from `toBadgeVariant` (`engine/to-badge-variant.ts`).
- **Splice.** The open and close tag become `Card` or `Badge`; the children stay as they are; `className` keeps only the kept classes; the import is added through `kit-drift-import.ts`. One apply is one version.
- **Skips.** A card with a header, a title row and a body (2 or more block children with their own padding) gets `needs-parts` and no id: a split into `CardHeader` and `CardContent` is out of scope. A find with spread props, a dynamic tag or a `ref` is skipped with the existing reasons. A card whose kit base sets padding or gap drops the matching `p-*` and `gap-*` classes only when they are equal to the base; a different value stays.
- **Where.** The port kit lines (cycle 37), the app-check kit lines (cycle 38) and, new, `list_kit_drift` on an attached app. Today `kit-drift.list` never sees TSX cards or badges: `toTsxCardDrift` has one caller, `kit-drift-port.ts` line 119, and the list path (`kit-drift-list.ts` → `listDriftFiles` in `kit-drift-scan.ts` line 85) calls only `toDriftMatches`. So this pick adds the look finds to `listDriftFiles`, and the port path reads them from there instead of its own `listFileLooks` scan (one scan, not two). The kit drift panel shows Swap on these rows, as for buttons.
- **Base classes.** `kit-inventory.ts` already reads a non-cva base: `listLiteralWords(code)` when `getKitCva` returns `null` (line 70). The shadcn `Card` (a plain `cn("…", className)`) uses that path; `Badge` uses the cva path. No new reader.

**Headless.** No new action. `list_kit_drift` (`kit-drift.list`) gives the ids, and `apply_kit_drift` (`kit-drift.apply`) does the swap, on MCP, the agent and the panel. Output schema unchanged (the `id` field exists and is nullable). The `kit-drift.list` description (`list.ts` line 22) says cards and badges only for HTML prototypes; this pick adds "and in app TSX" (STE, under 600 chars).

**Main files.** `components/kit-drift/kit-drift-scan.ts`: add the look finds to `listDriftFiles`. `components/kit-drift/kit-drift-list.ts`: map look finds to items, if `toItem` (line 86) needs it. `components/kit-drift/kit-drift-port.ts` (229 lines): read the looks from the scan, ids and the plan. `components/kit-drift/engine/to-tsx-card-drift.ts` (133 lines): the class plan; split into a new `engine/to-tsx-look-plan.ts` if it nears 300. `components/kit-drift/engine/to-drift-splices.ts` (129 lines): the child-keeping tag swap. `components/kit-drift/kit-drift-apply.ts` (259 lines): find a look by id on apply. `actions/src/kit-drift/list.ts`: the description (first edit; pick 4 rebases and adds its words). `engine/index.ts`: export lines. Not `kit-drift/schema.ts` (pick 4 owns it), not `engine/to-drift-matches.ts` or `kit-inventory.ts` (pick 4 owns them), not `agent/**`.

**Verify in the running app.**
- New fake app `ds-wt/ks-next` (copy of `ac-next-b`): a route with 2 hand-styled cards (`rounded-xl border bg-card p-6 shadow-sm`, one plain, one with a header and a body), 2 pills (`rounded-full bg-emerald-100 px-2 text-xs text-emerald-800`, one `bg-red-100`), and one `<div {...props}>` card.
- `pnpm exec tsx scripts/call-action.ts kit-drift.list '<json>'`: the plain card and both pills have ids, the 2-part card has `needs-parts`, the spread card `spread-props`. http, mcp and agent give the same output.
- `pnpm exec tsx scripts/call-action.ts kit-drift.apply '<json>'` with the 3 ids: `<Card className="...">` and `<Badge variant="...">` with the children unchanged, one version, `next build` passes, Cmd+Z restores.
- The kit drift panel: Swap on the 3 rows, dark and light screenshots. No real-model run.

---

## 3. z-keys: bring forward and send backward keys (Figma)

**Why.** Figma users press `Mod+]` and `Mod+[` many times a session to put a badge over an image or a card behind a sticker. Here it needs the inspector, the stacking section and a typed z-index. When Figma moved these keys in October 2025, users complained until Figma put them back in February 2026. This was a runner-up in cycles 30, 31, 32 and 38; the blocker was the DOM order against z-index decision, which Findings settles.

**Behaviour.**
- **Keys.** `Mod+]` "Bring forward" and `Mod+[` "Send backward", in the Selection group, one layer or more selected (canvas, frame or Layers panel focus). No key in a typing target or in a range edit. `Mod+Alt+]` and `Mod+Alt+[` stay next and previous direction, so Bring to front and Send to back have no key (canvas menu items only, in this pick).
- **Paint order only.** The key writes `zIndex` (and `position` when needed) through the existing `set_stacking` call. It never moves the element in the DOM, so the layout never changes.
- **Rule (pure model, `ui/features/stacking/z-order-model.ts`).** One step, as in Figma: the layer passes only the nearest overlapping sibling.
  - Inputs: the selected layer's box, its z (auto counts as 0) and DOM index, and the same for its siblings. Paint order is (z, DOM index). Boxes come from the bridge (a new read of the sibling rects, in the same message that reads the selection), not from `get_stacking`, whose fields are CSS values, not boxes. Max 8 siblings that overlap.
  - Forward: find the nearest sibling that overlaps it and paints over it. Set the layer's z to that sibling's z when the layer is later in the DOM, else that z + 1.
  - Backward: find the nearest sibling that overlaps it and paints under it. If that sibling's z is 1 or more, set the layer's z to that z − 1 when the layer is earlier in the DOM, else that z. If the result would be below 0 (2 auto siblings, the layer later in the DOM), raise that one sibling to z 1 instead, in the same version. z never goes below 0, so no layer goes behind its parent's background.
  - No overlapping sibling: no write, toast "No layer overlaps this one. Use Alt+↑ to move it in the list."
  - No sibling to pass: no write, toast "Already in front" or "Already at the back".
  - `position: static` in a parent that is not flex or grid: also set `position: relative` (z-index has no effect otherwise).
- **Writes.** One key press is 1 or 2 `set_stacking` writes in one version; Cmd+Z restores. A multi-selection moves each layer one step, in one version, in DOM order.
- **Shown.** The shortcuts sheet lists both keys; the canvas menu shows Bring forward and Send backward with `data-tip` keys. No Bring to front or Send to back in this pick (runner-up 4).
- **Frame keys.** A key from the preview frame reaches the shell through a window event, as copy-props does (`ui/domain/layer-style-key-events.ts`). Check that Electron gives `Mod+[` no history-back action.

**Headless.** No new action. `get_stacking` (`stacking.get`) and `set_stacking` (`stacking.set`) cover MCP and the agent; `move_element` covers DOM order.

**Main files.** `shared/keymap-edit.ts` (116 lines; 2 bindings; not `keymap.ts`, which has 492 lines). `packages/common/contracts/src/contracts.ts`: 2 `AppKey` members, `layer-forward` and `layer-backward`, matched on `BracketRight` and `BracketLeft` with Mod down and Alt and Shift up, beside `MOD_APP_KEYS` (line 1611). New `ui/features/stacking/{use-stacking-keys.ts,z-order-model.ts}`; `ui/features/stacking/{copy.ts,index.ts,deps.ts}`; new `ui/domain/stacking-key-events.ts`; `ui/features/canvas/preview-app-keys.ts` (the frame key dispatch); `ui/features/canvas/use-preview-menu.tsx` (496 lines: one call line; this pick is the only one that edits it this cycle, and it stays under 500); the canvas menu item file for the 2 items. The bridge selection read file (`bridge/**`, the file that posts the selected layer) for the sibling rects; name it in the report. Not `ui/features/commands/**`, not `ui/platform/**`, not `desktop/menu.ts`.

**Verify in the running app.**
- HTML prototype `ds-wt/zk-seed`: a card with an image, a badge with `position: absolute` under the image in paint order, a flex row of 2 overlapping avatars (`-ml-3`), and one plain paragraph with no overlap.
- Select the badge, `Mod+]`: it paints over the image, one version, the layout does not move (compare the boxes before and after). `Mod+[` on the second avatar: it goes under the first (the first gets z 1), one version. On the paragraph: the no-overlap toast, 0 writes. Cmd+Z: back.
- The same with focus in the preview frame, in the Layers panel and in the packed app. In a text edit, the inspector and the chat composer: nothing.
- `pnpm exec tsx scripts/call-action.ts stacking.set '<json>'`: http, mcp and agent give the same output.
- Union grep (N12) before the commit. `pnpm run build:ui`, `check-bundle`: B1 at or under 274,703 B. Dark and light screenshots of the shortcuts sheet and the menu. No real-model run.

---

## 4. kit-skel: hand-made loading blocks become `Skeleton` (AI quality)

**Why.** AI loading states are gray `div`s with `animate-pulse`, sized by hand. Bonaparte uses `<Skeleton` in 510 files and raw `animate-pulse` in 63, so a reviewer sends hand-made blocks back. Claude Design-class output uses the kit loading part. This was a runner-up in cycles 33 to 38.

**Behaviour.**
- **Find.** In TSX app source, a `div` or `span` whose static `className` has `animate-pulse` and a muted or gray background (`bg-muted`, `bg-accent`, `bg-gray-*`, `bg-slate-*`, `bg-zinc-*`, `bg-neutral-*`, `bg-stone-*`) and no text child. Only when the app kit has a `Skeleton` (`components/ui/skeleton.tsx` or the path `kit-inventory.ts` finds).
- **Confidence.** Empty or self-closing: high, with an id. With element children (a hand-made card skeleton): medium, no id, listed only.
- **Swap.** `<div className="h-4 w-32 animate-pulse rounded-md bg-muted" />` becomes `<Skeleton className="h-4 w-32" />`: drop the classes that the kit base covers (read from `skeleton.tsx`), keep size and margin, add the import. Through the existing tag swap path in `to-drift-splices.ts`.
- **HTML prototypes of an app.** The markup scan (`to-markup-drift.ts`) flags the same block when the pack has a skeleton recipe; else no find.
- **Where.** `list_kit_drift`, the port kit lines, the app-check kit lines and the kit drift panel, as for buttons.

**Headless.** No new action. `list_kit_drift` and `apply_kit_drift` cover MCP, the agent and the panel. `KitDriftTagSchema` gets one literal, `skeleton`; no MCP snapshot holds this output.

**Main files.** `packages/common/actions/src/kit-drift/schema.ts` (one literal). New `components/kit-drift/engine/to-skeleton-drift.ts`. `components/kit-drift/engine/to-drift-matches.ts` (213 lines): the `skeleton` entry in `COMPONENT_OF` (line 36, a `Record<DriftTag, string>`) and the match branch. `components/kit-drift/kit-inventory.ts`: find `Skeleton`. `components/kit-drift/engine/to-markup-drift.ts`: the HTML branch. `engine/index.ts`: export lines (pick 2 also adds lines here; rebase). `ui/features/kit-drift/{kit-drift-model.ts,copy.ts}`: the row label, if a per-tag map needs it. Description of `kit-drift.list` (`kit-drift/list.ts` line 22): add "loading skeletons" (STE, under 600 chars). Not `kit-drift-scan.ts`, `kit-drift-list.ts`, `kit-drift-port.ts`, `to-tsx-card-drift.ts`, `to-drift-splices.ts` or `kit-drift-apply.ts` (pick 2 owns them); if the swap needs a splice change, rebase on pick 2 and change only the lines pick 2 did not touch.

**Verify in the running app.**
- New fake app `ds-wt/kl-next` (copy of `ac-next-b` plus `components/ui/skeleton.tsx`): a route with 3 empty pulse blocks, one pulse block with 2 children, and one `bg-muted` block with no `animate-pulse` (not a find).
- `pnpm exec tsx scripts/call-action.ts kit-drift.list '<json>'`: 3 high finds with ids, 1 medium, 0 for the plain block; http, mcp and agent the same. `kit-drift.apply` with the 3 ids: `<Skeleton className="...">`, one version, `next build` passes.
- An app with no `skeleton.tsx`: 0 skeleton finds.
- Union grep (N12): every `Record<DriftTag, ...>` and `switch` over the tag. Dark and light screenshots of the panel rows. No real-model run.

---

## 5. polish-39: toast text, photo-text in dark, the app-check dark run, Cmd+Z by OS keyboard (polish)

**Items.** Prove each one first; change code only for what the proof shows.
- **Toast "Copied style of h2".** Make `copied` in `ui/features/layer-style/copy.ts` (line 6) a function of the tag: `` (tag: string) => `Copied style of ${tag}` `` (U19 keeps it in `copy.ts`). Call it at `use-layer-style-host.ts` line 109 with `target.tag`. When the tag is empty, keep "Style copied". Menu and `Mod+Alt+C` show the same text.
- **Transition stop for every dark render.** Move `STILL_EXPRESSION` (`app-review-dark.ts` line 47) into `listContrastMisses` (`prototype-dark-review.ts` line 144), before the axe run, and remove it from the app path. Then the prototype dark check (`listDarkLines`) and the port dark check (pick 1) get the same fix as `0e62a8f89`.
- **Photo-text in the dark step.** In `listContrastMisses`, after the contrast run, call `runPhotoTextPass(page, loadAxeSource)` (`text-on-photo.ts` line 347). The page is a leased `RenderPage`, which has `screenshot(outPath, clip)` (`server-ports.ts` line 76). Add `kind: "contrast" | "photo"` to `DarkMiss`, so both dark paths (`listDarkLines` and `inspectAppDark`) pick the line text by kind. Map each photo hit to a dark line: "Dark: hero text on a photo is 2.1:1 at its lightest part in dark (AA needs 4.5:1). Add a scrim behind the text, or move it off the light part." Import through `preview/page-capture/index.ts` (add the export line there; W19b). The cycle-38 skip rules stay: no pass on a page with no photo (0 ms), max 3 nodes.
- **A real run that checks the app-check dark fix.** One Sonnet run, fresh data folder, in-app chat on a fresh copy `ds-wt/p39-ac` of `ac-next-b`, route `/crew`, the cycle-38 prompt: "Add an Export button and a status pill to the header. Use a dark navy price label." Pass: the dark count in pass 1 and pass 2 agree (no transition race), 0 dark items at run end, `next build` passes. Write the counts per pass from the log.
- **OS-keyboard Cmd+Z through the macOS menu.** In the packed app with an unlocked screen, drive real key events (`osascript` keystroke, not CDP): plain edit, type "x", Cmd+Z, Cmd+Z, then range mode `Mod+B`, Cmd+Z. Expected as in polish-37. Fix only a failure. **Stop rule:** if the screen is locked a third time, write "not run" and move it to a manual check for Tyler in the report ("Open"). Do not carry it to cycle 40 as a pick item.
- **Range apply in an app with no canvas frame.** Reproduce on `p39-ac` with no saved frame: `Mod+B` on a range answers "The file of this layer was not found." (`apply-range.ts` line 145). If the proof shows that `scopeOf` builds app files from canvas frames only, add the route file of the open preview to the scope. Pass: `Mod+B` works with no frame; with a frame, as now.

**Headless.** No new action. The dark lines reach `get_run` notes for MCP runs; the range fix serves `apply_range_text`; the toast is UI only (MCP has `get_layer_style`).

**Main files.** `ui/features/layer-style/{copy.ts,use-layer-style-host.ts}`; `agent/{prototype-dark-review.ts,app-review-dark.ts}`; `preview/page-capture/index.ts` (one export line); `style-scope/text-search/apply-range.ts` or its scope file, only if the proof names it. Not `preview/text-on-photo.ts`, not `preview/axe.ts`, not `preview/browser.ts` (944).

**Verify in the running app.**
- Copy style from the menu and with `Mod+Alt+C` on an `h2`: "Copied style of h2". Dark and light screenshots of the toast.
- Seeded HTML project `ds-wt/p39-photo` (a copy of `pt-seed` with `tokens.css` that has a `.dark` block): the dark step gives 1 photo-text line on `index.html`, 0 on `plan.html`. A prototype with CSS color transitions: the same dark count on 5 repeated checks.
- The real run above, the packed-app key steps (or "not run" and the manual check), the range apply steps.
- `pnpm run build:ui`, `check-bundle`: B1 at or under 274,703 B.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 port-dark | new `agent/port-review-dark.ts`; `agent/{port-review-pass.ts,port-review.ts}`; `agent/port-review-routes.ts` (line swaps only); fixtures `ds-wt/pd-*` |
| 2 kit-swap | `components/kit-drift/{kit-drift-scan.ts,kit-drift-list.ts,kit-drift-port.ts,kit-drift-apply.ts}`; `actions/src/kit-drift/list.ts` (description, first edit); `components/kit-drift/engine/{to-tsx-card-drift.ts,to-drift-splices.ts}` and new `engine/to-tsx-look-plan.ts` if split; `engine/index.ts` (export lines); fixtures `ds-wt/ks-*` |
| 3 z-keys | `shared/keymap-edit.ts`; `contracts.ts` (`AppKey` and its match); new `ui/features/stacking/{use-stacking-keys.ts,z-order-model.ts}`; `ui/features/stacking/{copy.ts,index.ts,deps.ts}`; new `ui/domain/stacking-key-events.ts`; `ui/features/canvas/preview-app-keys.ts`; `ui/features/canvas/use-preview-menu.tsx` (one call line); the canvas menu item file; the bridge selection read file (sibling rects); fixtures `ds-wt/zk-*` |
| 4 kit-skel | `actions/src/kit-drift/schema.ts`; `actions/src/kit-drift/list.ts` (description words only, after pick 2); new `engine/to-skeleton-drift.ts`; `engine/{to-drift-matches.ts,to-markup-drift.ts}`; `kit-inventory.ts`; `engine/index.ts` (export lines); `ui/features/kit-drift/{kit-drift-model.ts,copy.ts}`; fixtures `ds-wt/kl-*` |
| 5 polish-39 | `ui/features/layer-style/{copy.ts,use-layer-style-host.ts}`; `agent/{prototype-dark-review.ts,app-review-dark.ts}`; `preview/page-capture/index.ts` (one export line); the range scope file (only if the proof names it); fixtures `ds-wt/p39-*` |

Shared files and conflict warnings:
- **Home preload files (all picks).** No pick adds a line to `ui/app/main.tsx`, `ui/app/screen-preload.ts`, `ui/platform/*` or `ui/features/commands/**`. Every pick with a `src/ui`, `src/shared` or `src/bridge` change runs `pnpm run build:ui` and `pnpm exec tsx scripts/check-bundle.ts`: B1 at or under 274,703 B.
- **Dark helper (picks 1 and 5).** Pick 5 owns `prototype-dark-review.ts` and `app-review-dark.ts`. Pick 1 only calls `inspectAppDark`. If pick 1 needs an exported type, it asks for the `export` word in pick 5's change, or adds only that word after pick 5 merges.
- **Kit drift (picks 2 and 4).** Pick 2 owns the TSX look path, the list scan and the apply; pick 4 owns the schema, the match table, `kit-inventory.ts` (only its `Skeleton` lookup; the non-cva base reader `listLiteralWords` exists, so pick 2 needs no inventory change) and the markup scan. Both add lines to `engine/index.ts` (export lines only) and both add words to the `list.ts` description (pick 2 first). Pick 4 rebases on pick 2.
- **Unions.**
  - Pick 3: 2 `AppKey` members (`contracts.ts`). The N12 grep finds 2 `Partial<Record<AppKey, ...>>` maps today (cycle 38); check again.
  - Pick 4: one `KitDriftTag` literal. `COMPONENT_OF` (`to-drift-matches.ts` line 36) and `LOOK_COMPONENT` (`kit-drift-port.ts` line 46, pick 2's file, a `Record<TsxLookFind["tag"], string>` over card and badge only, so no entry needed) are the maps to check.
  - Pick 1: a `dark` field on `PortCheck` (agent type, not a union).
  - Picks 2 and 5: none.
  - No two picks change one union.
- **`use-preview-menu.tsx` (496 lines).** Only pick 3 edits it, one line.
- **Generated lists.** No pick adds an action, so no `@generated` file changes. Run `pnpm exec tsx scripts/gen-routes.ts --check` after each merge to prove it; a diff means a pick broke the rule.
- **Hand aggregators.** No pick edits `actions/index.ts`, `main/live-layer.ts`, `http/mount-all.ts`, `mcp/registry.ts` or `agent-tools/registry.ts`.
- **MCP snapshots.** No pick changes a tool name or input in `artifacts/mcp-snapshots/*.json`. Pick 4 changes the description of `list_kit_drift`, which no snapshot lists.
- **Perf baseline.** No pick edits `scripts/perf/baseline.json` (P10, L6).
- **Long files.** `final-check.ts` (521), `browser.ts` (944), `port-plan.ts`, `sdk-driver.ts`: no edit. `port-review-routes.ts` (496), `use-preview-menu.tsx` (496), `keymap.ts` (492), `port-review.ts` (472): keep under 500; new logic in new files.
- **Fake apps under `ds-wt`.** Each pick has its own prefix (`pd-`, `ks-`, `zk-`, `kl-`, `p39-`). No pick writes into Bonaparte or into `ac-next-b`. No app run or Move to app run targets Bonaparte or a clone of it.
- **`.claude/goal/roadmap.md` Appendix A:** add each pick's new files when the file is in the worktree (L6e). Cycles 36 to 38 found it missing in worktrees; write that in the report if it is still missing.

## Merge order

All 5 can run at once. No pick changes the generated lists, so no pick must go last for that reason. Merge in this order:
1. **polish-39**: first, because it moves the transition stop and adds photo-text to `listContrastMisses`, which pick 1 renders through. Re-run the `p39-photo` dark check after the merge.
2. **port-dark**: rebase on polish-39, re-run its no-model script (a ported hero on a photo may now add a dark photo-text line, which is correct).
3. **kit-swap**: the kit-drift apply path.
4. **kit-skel**: rebase on kit-swap (`engine/index.ts`, and the splice file if it needed it); run the N12 grep and `call-action.ts kit-drift.list`.
5. **z-keys**: the `contracts.ts` change and the one `use-preview-menu.tsx` line; rebase, run the union grep, `build:ui`, `check-bundle`.

After the last merge, run `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run check:scripts`, `pnpm run lint:gate`, `pnpm exec tsx scripts/gen-routes.ts --check`, `pnpm run build:ui`, `pnpm exec tsx scripts/check-bundle.ts` and `pnpm exec tsx scripts/check-boot-imports.ts`. Then `pnpm run desktop:pack`. Then one real-model session of 2 runs on merged main, each with a fresh data folder:
1. The pick 1 Move to app on a fresh `pd-next` copy: 0 dark items, kit imports for cards and pills, `next build` passes.
2. The polish-39 app-check prompt on a fresh `ac-next-b` copy: the same dark count on every pass, 0 at run end.

## Real-model run budget

Local Claude Code sign-in, Sonnet, short runs. App runs and Move to app only into a fake Next app under `ds-wt`, never Bonaparte.
- pick 1 port-dark: 2 runs (main and branch);
- pick 5 polish-39: 1 run (branch);
- the final merged session: 2 runs.

Picks 2, 3 and 4 need none. Total: 5 runs.

## Runners-up

1. Frames taller than 4,000 px: one `CANVAS_MAX_HEIGHT` (8,000, so a 2x PNG stays under Chrome's 16,384 px limit) in `canvas-file.ts`, used by the 5 copies of `4000`; a tool input change for `canvas_place` and the frame schemas (frame-fit "Left out").
2. `inspect_accessibility` takes `colorScheme`, so an MCP client can check dark contrast on any frame (today only `get_screenshot` has it, and `render_check` is agent-only).
3. Card parts: split a 2-part hand card into `CardHeader` and `CardContent` (pick 2 skips it with `needs-parts`).
4. Bring to front and Send to back keys: `Mod+Alt+]` and `Mod+Alt+[` are next and previous direction; decide whether to move the direction keys first.
5. Photo-text on phone and tablet renders, and text alpha blend (photo-text "Left out").
6. Asset folder for a dynamic single page: a move to `/visits/[id]` copies assets to `public/id/` (flow-review "Left out").
7. Route copy into an existing prototype drops the first page's canvas frame (cycles 35, 36 and 37).
8. Phone tally in the run note and a phone opening on the `toPrototypeReviewGaps` path (phone-flow "Left out").
9. The first double-click after a page load sometimes does not open the text edit (range-nest "Left out").
10. `check-actions` fails on main for 10 old items (O12, E16; frame-fit "Left out").

Dropped from the list: Figma variables JSON import and export (the code exists, see Findings).

Sources: [mean.ceo: Claude Design news November 2026](https://blog.mean.ceo/claude-design-news-november-2026/), [Claude Design](https://claude.com/design), [Claude Design stays on brand](https://claude.com/resources/articles/claude-design-stays-on-brand-for-daily-work), [PureAI: Anthropic overhauls Claude Design](https://pureai.com/articles/2026/06/17/anthropic-overhauls-claude-design.aspx), [Figma forum: bring forward shortcut change](https://forum.figma.com/share-your-feedback-26/problem-bring-forward-shortrcut-cmd-alt-up-down-rotates-the-object-46254), [Figma forum: changing bring forward hotkeys](https://forum.figma.com/ask-the-community-7/changing-bring-forward-bring-to-front-hotkeys-47717), [Noble Desktop: Figma Mac shortcuts](https://www.nobledesktop.com/shortcuts/figma/mac).

## Results

Merged into main in this order: polish-39, port-dark, kit-swap, kit-skel, z-keys. There was 1 conflict, in the `kit-drift.list` description. I joined the two texts into one (558 chars).

- **polish-39:** The toast now says "Copied style of h2". The dark check now stops CSS transitions before axe runs: main missed 2 items on all 5 checks, and the branch found 2 each time. Photo text is now checked in dark. A range apply in an app with no frame works again (fix in `scope.ts`). The Cmd+Z check by OS keyboard did not run, because the screen was locked 3 times. Tyler must check it by hand.
- **port-dark:** Each Move to app route now has a dark check, and dark items start the fix loop. This adds about 1 s per route. Only mock runs proved the fix loop, and no run proved the update path.
- **kit-swap:** Hand-styled TSX cards and badges now get ids, and `apply_kit_drift` swaps them. `next build` passes and undo works.
- **kit-skel:** Hand-made loading blocks become `<Skeleton>` through `list_kit_drift` and `apply_kit_drift`.
- **z-keys:** Mod+] brings a layer forward and Mod+[ sends it backward, through `set_stacking`. The layout does not move. A selection of many layers takes 1 Cmd+Z per layer.

Open:
- The first `apply_kit_drift` on an app that was attached just before fails with "no saved version yet". This bug is already on main.
- `call-action.ts` does not reset state between surfaces for write actions.
- `check:scripts` fails on server files that the z-keys pick did not change.

Checks: gen, tsc, lint and lint:gate pass (59,623 diagnostics, baseline 89,733). ui passes, clip finds 0, pack and the reinstall pass, and :4570 gives 200. Idle CPU is 0.02 CPU-s over 60 s. check-bundle B1 is 274,703 B (delta 0). Nothing was pushed.
