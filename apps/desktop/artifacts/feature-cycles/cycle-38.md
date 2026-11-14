# Feature cycle 38: next 5 features

Date: 2026-11-14. Main at `e51466e7f` (all 5 cycle-37 picks merged; main fix `a329c5b51`; B1 lowered to 274,703 B at `e51466e7f`).

## Method

- Read `cycle-37.md` (picks, runners-up, Results "Open") and `cycle-37/{range-nest,port-kit,dark-check,flow-fast,polish-37}.md` ("Left out"), `git log --oneline -3` and `git branch -a`.
- Read the runners-up and "Open" lines of `cycle-13.md` to `cycle-36.md`, to find the items that came back cycle after cycle and were never picked.
- Read the code for each pick:
  - App run review: `agent/final-check.ts` (`appReviewGaps`, `studioAppReview`, `changedFiles`, `reviewItems`), `agent/prototype-review.ts` (`isPrototypeRun`, `toReviewGaps`, `toReviewNote`), `agent/prototype-kit-review.ts` (`isKitRun`, `listKitDriftLines`, `listFlowPhoneLines`, `listKitLines`, `toKitGaps`), `agent/prototype-flow-review.ts` (`isFlowRun`, `getFlow`), `agent/prototype-dark-review.ts` (`listDarkLines`), `components/kit-drift/{kit-drift-prototype.ts,kit-drift-port.ts}` (`isKitPrototype`, `listPortKitFinds`), `agent/port-review-kit.ts`, `agent/port-review-pass.ts` (`inspectRoute`).
  - Prototype tokens beside an app: `project-ops/{project-ops-prototype.ts,engine/to-prototype-page.ts}`, `design-system/app-tokens/prototype-tokens.ts`, `design-system/engine/to-prototype-css.ts` (`DARK_SELECTOR`).
  - Contrast: `preview/axe.ts` (`axeRunExpression`, `runSharedAxe`, `runAxe`), `preview/browser.ts` (render step, `axeRuns` cache), `QualityFinding` in `packages/common/contracts/src/contracts.ts`, `agent/critic.ts` (line 55), `package.json` (`pngjs`, `pixelmatch`).
  - Frames: `packages/common/actions/src/canvas/{update-frame.ts,move-frames.ts,delete-frames.ts}`, `ui/features/canvas/{frame-menu-model.ts,frame-menu-groups-model.ts}`, `desktop/menu.ts` (accelerators).
  - Keys: `shared/{keymap.ts,keymap-edit.ts,keymap-view.ts,keymap-tools.ts,structure-keys.ts}`, `AppKey` and `StructureKey` in `contracts.ts`, `ui/features/layer-style/use-layer-style-host.ts`, `ui/features/canvas/{preview-key-forward.ts,use-preview-menu.tsx}`, `ui/features/versions-layers-tokens/use-structure-ops.ts`, `actions/src/layer-style/*`.
  - Polish: `preview/{peek-pages.ts,page-pool.ts,render-playwright.ts,index.ts}`, `agent/port-review-read.ts` (`inspectRouteRender`), `bridge/text-range-target.ts` (`toRangeTarget`), `ui/features/text-range/text-range-model.ts` (`STYLE_TAGS`, `toReading`), `agent/{port-start.ts,port-review-snapshot.ts}`, `cycle-35/polish-35.md` ("Left out").
- Measured Home preload from `dist/ui/.vite/manifest.json` and `dist/ui/.vite/modules.json` (build at 12:53 today), walked from `index.html`.
- No real-model run, no app run and no build for this research.

### Open items from cycle 37, and the pick that closes each

| Open item | Pick |
|---|---|
| Parallel flow route checks hit preview errors (re-check covers it, root cause unknown) | 5 polish-38 |
| Range bar Bold double-bolds inside a link | 5 polish-38 |
| Cmd+Z through the macOS Edit menu by keyboard not checked | 5 polish-38 |
| First `port.start` on a large repo is about 2.5 s | 5 polish-38 (with a stop rule) |
| Home preload 274,703 B under 300,000 B | Gate for every pick: B1 delta 0 or less |

### Findings

- **Home preload (a rule for all picks).**
  - 31 chunks, 274,703 B. No `src/shared/*` module is in a Home chunk: `modules.json` lists only `ui/features/commands/keys.ts` (31 B) from the key code. So `shared/keymap*.ts` is off Home, and a new `KeyBinding` no longer adds Home bytes (cycle 37 ruled keys out for this reason).
  - `ui/features/commands/{index,global-commands,registry,keys}` and `ui/platform/*` are still on Home. A key handler must go in a lazy canvas or feature file, never there.
  - The gate is B1 at or under 274,703 B, not the 300,000 B limit.
- **Look-back: the most valuable gap for a user who designs inside Bonaparte with the in-app chat.**
  - That user attaches the app and asks the chat to change a route. This is an app run (`project.app` set, not `PORT_TASK`). It is not a prototype run and not a Move to app run.
  - **No kit check on an app run.** `isKitPrototype` (`kit-drift-prototype.ts` line 32) needs `!project.app`, so `listKitDriftLines` returns `[]`. `port-review-kit.ts` runs only inside the port review (`inspectRoute`). A chat edit that writes `<button className="bg-primary px-4 h-9">` into a Bonaparte page gets no kit line.
  - **No dark check on an app run.** `isFlowRun` (`prototype-flow-review.ts` line 23) needs `!ctx.project.app`, so `getFlow` gives no pages, and `listDarkLines` returns `[]` at `pages.length === 0` (`prototype-dark-review.ts` line 249). Bonaparte has `dark:` in 220 files and a `.dark` block in `globals.css`.
  - **No studio review at all when the agent checked itself.** `appReviewGaps` (`final-check.ts`) returns `null` when the agent took a mobile shot and called `review_frame` after its last edit. Prototypes have a second path (`toKitReviewGaps` in `prototype-review.ts`); app runs have none. So even after a kit and dark branch is added, a self-checked app run skips them.
  - The prototype path beside an app is covered: `project-ops-prototype.ts` writes a local `tokens.css` that `to-prototype-css.ts` fills with a `.dark, [data-theme="dark"]` block, so the cycle-37 dark check reads it. The gap is the app run only.
  - Older repeat items were checked and are lower for this user: canvas memory (doop, 8 cycles) overlaps the `design-rule` domain that exists; Figma variables JSON is an import path, not a chat path.
- **AI quality: no check sees text on a photo or a gradient.**
  - `axeRunExpression` (`axe.ts` line 118) asks for `resultTypes: ['violations']` only. axe puts `color-contrast` nodes over a background image or gradient in `incomplete`, not in `violations`, so they are dropped. The cycle-37 dark check uses the same run.
  - No other code measures it: a search for legibility, scrim and text over photo finds only the critic prompt line "Legibility: low contrast, text too small." (`critic.ts` line 55), which is a model judgment, not a measure.
  - Photo fill and photo art (cycles 26 to 30) put photos and gradient panels behind hero text in many prototypes. White text on a light part of a photo is the common Claude Design-class miss.
  - `pngjs` and `pixelmatch` are dependencies already (`reference-check.ts`, `state-check-ops.ts` decode PNGs).
- **Figma gap 1: Resize to fit for frames.**
  - No code fits a frame to its content: a search for "fit to content", "resize to fit", `fitFrame` and `frame-fit` in `apps/desktop/src` and `packages/common/actions/src` finds nothing. `canvas.updateFrame` (`canvas_place`) takes a viewport or an explicit width and height only. The frame menu (`frame-menu-model.ts`) has duplicate, copy as PNG, tidy up and redesign; no fit item.
  - It was a runner-up in cycles 23 to 29. The blocker was a decision: `100vh`, `h-screen` and `min-h-screen` sections grow with the frame, so a naive fit loop grows without end. Pick 3 makes that decision (fixed-point rule).
- **Figma gap 2: copy and paste properties keys.**
  - Copy style, Paste style and Paste some exist only as canvas menu items (`use-layer-style-host.ts` lines 149 to 166). `Mod+Alt+C` and `Mod+Alt+V` are free: not in `keymap.ts`, `keymap-edit.ts`, `keymap-view.ts` or `keymap-tools.ts`, and not an accelerator in `desktop/menu.ts`. (`CmdOrCtrl+Alt+Shift+R` is `forceReload` in the menu, so no pick uses it.)
  - Cycle 37 held this back (runner-up 3) because a key grew Home. That is no longer true (see above).
  - Frame keys reach the UI as `app-key` (`AppKey` union) or `structure-key` (`StructureKey` union) bridge messages. `use-preview-menu.tsx` (491 lines) holds the `useLayerStyleHost` result.
- **Polish: parallel preview errors (open item 1).**
  - The route render check uses `preview.withPage` (`port-review-read.ts` line 239), which is `browsers.run` → `page-pool.ts`, not the peek pages. The match check runs as an agent tool (`inspect_port`), whose render path is not traced yet.
  - Lead A: `PeekPages.sweep` (`peek-pages.ts` lines 464 to 469) drops a page at `index >= MAX_PAGES` (6) even when `warm.busy > 0`, then closes it. Three routes at 2 viewports plus other live pages pass 6. This gives exactly "Target page, context or browser has been closed". Not yet proven that the port path reaches `peekPage` (`probe-page.ts` calls it).
  - Lead B: in the pool, a page that fails is closed (`run` `finally`), and `recycle` runs after the slot is free. Concurrent `Page.captureScreenshot` on background contexts can fail in headless Chrome.
  - So the pick proves the cause first.
- **Polish: Bold inside a link (open item 2).** `toRangeTarget` (`text-range-target.ts` lines 79 to 86) returns the fallback with `toStyledTag(head, range, tags)` when the inline child has no source (a Next `<Link>`); the bar reading takes `message.tag` (`text-range-model.ts` `toReading`) and compares it with `STYLE_TAGS.bold`. With the outer `a` as the tag, Bold is never "on", so a click wraps a second `<strong>`. The keys pass the style tags in and work.
- **Polish: first `port.start` (open item 4).** `polish-35.md` found the cost is the first app version save (`store/version-seed.ts`, `commitInit`), not `createTree`. 3 fixes did not reach 2 s; one race was found (version save against the asset copy). Cycle 35 timed it on a Bonaparte clone (`ds-wt/po-bp`); this cycle must not use a Bonaparte clone.
- **Competitor recheck (5 web searches, 2026-11-14).**
  - Claude Design: no confirmed November change. One startup blog again; it lists native Figma export, version history and multiplayer edit as missing. The June 2026 update (design-system import, Claude Code sync, canvas editing, export targets) stays the base.
  - Figma (Nov 2 to 8 digest): the agent makes editable vectors and icons, a Select area AI tool for images, code layers read prototype connections, repo clone on by default. Variables import and export are listed in the archive with no year.
  - v0: design mode keys and annotations on generated UI (no November date). Lovable: visual edits that reach live database content (no November date).
  - open design (nexu-io): third-party pages disagree on the version (v0.13 to v0.19.1); no new feature found that changes the bar.
  - doop: multiplayer canvas, MCP agents with OAuth, screenshot self-review before finish, comments as agent tasks. Nothing new since cycle 37.
  - The bar stays: fast to open, Figma-like direct edits, real-repo work in the app kit, and every check the same on the chat, MCP and app paths.
- **Branch check.** No `feat/app-check`, `feat/photo-text`, `feat/frame-fit`, `feat/copy-props` or `feat/polish-38` (checked with `git branch -a --list`). Near names that exist and are not used: `feat/kit-check`, `feat/kit-drift`, `feat/layer-style`, `feat/layer-copy`, `feat/photo-fill`, `feat/photo-art`, `feat/frame-select`, `feat/frame-focus`.
- **Fixture prefixes.** `ac-`, `pt-`, `fz-`, `kp-` and `p38-` are not in `ds-wt` (checked with `ls`).

## Ranking

Score = value x fit with "simple and fast" / effort (1 to 5 each).

| Rank | Key | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|---|
| 1 | app-check | A chat edit of an attached app route gets the kit and dark checks, on the changed lines only, also when the agent checked itself (Bonaparte, look-back item) | 5 | 5 | 3 | 8.3 |
| 2 | photo-text | `render_check` and the studio review measure text on photos and gradients and flag it under AA (AI quality) | 4 | 5 | 3 | 6.7 |
| 3 | frame-fit | Resize to fit: a frame takes its page height, with a fixed-point rule for `100vh` pages (Figma) | 4 | 5 | 3 | 6.7 |
| 4 | copy-props | `Mod+Alt+C` and `Mod+Alt+V` copy and paste layer properties (Figma) | 3 | 5 | 2 | 7.5 |
| 5 | polish-38 | Preview errors root cause, Bold in a link, OS-keyboard Cmd+Z through the menu, first `port.start` | 3 | 5 | 2 | 7.5 |

No pick adds an always-visible control or a Home import:
- Pick 1 adds review lines.
- Pick 2 adds findings to existing checks.
- Pick 3 adds one frame menu item and one action.
- Pick 4 adds 2 keys, handled in a lazy file.
- Pick 5 changes preview internals, one bridge reading and maybe one store step.

---

## 1. app-check: kit and dark checks on chat edits of an attached app (Bonaparte)

**Why.** This is the user's main path: Bonaparte attached, a route open, the in-app chat asked for a change. Prototypes and Move to app runs get kit lines (cycles 29 to 37) and prototypes get dark lines (cycle 37). An app run gets neither, and gets no studio review at all when the agent took its own mobile shot and `review_frame`. A chat edit that adds a raw button or a raw text color that fails in dark passes, and a Bonaparte reviewer sends it back.

**Behaviour.**
- **Which runs.** Attached app, `mode: "edit"`, a target route, a preview URL, at least one edit tool call, and `task !== PORT_TASK` (port-kit covers ports). Wireframe runs are out.
- **Gate fallback.** When `appReviewGaps` returns `null` (the agent checked itself), a new app fallback in the `toReviewGaps` chain returns `{ isPrototype: false, mobile: false, review: false }`, as `toKitReviewGaps` does for prototypes. So the studio review step still runs, but only the kit and dark lines; no second mobile shot or `review_frame`.
- **Kit lines.** Scan the TSX files that the run changed (`changedLinesSince`, the list `changedFiles` already reads) with `listPortKitFinds` and the app inventory. Keep only finds whose line is on or within `NEAR_LINES` of a changed line; count the rest as old code, as `reviewItems` does ("3 raw elements on old code not counted"). Bonaparte has a lot of old raw markup; the fix loop must never edit lines the user did not touch. Line text: reuse `toKitLines` from `port-review-kit.ts` (export it; do not copy). High finds are gaps; medium finds are listed only.
- **Dark lines.**
  - Dark values: read the app token file through `getAppDirTokenFile` and `readCssTokens` (`design-system/app-tokens`). No `dark` scope entry: no render, and log `[agent] app dark check: no dark values, so no dark render`. Do not read the Next bundle CSS.
  - Render the target route through the cycle-37 dark helper: export `inspectDarkPage` (or `listContrastMisses`) from `agent/prototype-dark-review.ts` and call it with the route URL. It already renders at 1440 x 900 through `toSchemedPreview(preview, "dark")`, runs its own `color-contrast` axe expression (`CONTRAST_EXPRESSION`) and has the 12 s timeout. Do not copy it.
  - Keep only items whose `data-studio-loc` source is in a changed file and near a changed line. Max 6 lines, then a count line. Same text as the prototype dark line, with the file and line: "- Dark: 2 text items in app/(dashboard)/crew/page.tsx are under AA contrast in dark (first: line 42, 1.4:1). Use token classes such as text-foreground or dark: variants, not raw colors, then take get_screenshot with colorScheme dark."
- **Opening.** `toReviewOpening` gets the app kit and dark counts; pass 1 asks for one fix loop when a high kit find or a dark line exists. The pass cap does not change. A fix loop that cuts kit finds and costs 2 points or less is kept, as `isKitTrade` does.
- **Run note.** "Studio app check: Kit: 2 raw elements found on changed lines, 0 left; Dark: 0 items under AA."

**Headless.** No new action, no schema change. The MCP agent path already has `list_kit_drift`, `apply_kit_drift`, `get_screenshot` (with `colorScheme`) and `render_check`; the lines name only these tools (E19). The in-app chat gets the lines from the studio review step; an MCP-driven app edit gets the same check through the same run review when it runs as a studio run.

**Main files.** New `agent/app-review-lines.ts` (the fallback gate, the app kit lines and the app dark lines; split into `app-review-kit.ts` and `app-review-dark.ts` if it nears 300 lines). `agent/prototype-kit-review.ts` (427 lines): in `listKitLines`, one app branch that calls the new file and sets the counts; keep under 500. `agent/prototype-review.ts` (166): the fallback in `toReviewGaps` and the note clause. `agent/prototype-review-opening.ts`: app counts and text. `agent/port-review-kit.ts`: export `toKitLines` only. `agent/prototype-dark-review.ts`: one export only. `agent/final-check.ts` (537 lines, L2a): net-zero line edits only. `listKitLines` gets no run, base file or changed files today, so pass `input.run` and `input.baseFile` through the existing `listKitLines(...)` call in `studioAppReview`, and add `export` to `changedFiles`, `changedEntry` and `NEAR_LINES` so the new file can filter to changed lines. The file stays at 537 lines or fewer. Not `port-review-pass.ts`, not `components/kit-drift/**`.

**Verify in the running app.**
- New fake app `ds-wt/ac-next`: Next 16, Tailwind 4, shadcn-style `components/ui/{button,card,badge}.tsx`, `app/globals.css` with `:root` and `.dark` tokens, a route `/crew` with 1 old raw `<button>` (old code), attached as an app.
- No model: a script feeds a run state (changed lines that add a raw button and `text-[#1a1a1a]` on `bg-background`) to the review step: 1 kit line, 1 dark line, the old button counted as old code, a fix opening. After a fix: 0 lines, no opening. A run where the agent took its own mobile shot and `review_frame`: the kit and dark lines still show. An app with no `.dark`: no dark render (log line).
- `pnpm exec tsx scripts/call-action.ts kit-drift.list '<json>'` on `ac-next`, main and branch: same output.
- **Real-model run (2 short runs, Sonnet, fresh data folders):** in-app chat on `ac-next` `/crew`: "Add an Export button and a status pill to the header. Use a dark navy price label." On main and on the branch. Pass on the branch: the changed file imports `Button` and `Badge`, 0 dark lines at run end, the old raw button is not changed, `next build` passes. Report what main shipped, loops, seconds and cost. Never target Bonaparte.
- Dark and light screenshots of the run note.

---

## 2. photo-text: measured contrast for text on photos and gradients (AI quality)

**Why.** Hero text over a photo or a gradient panel is in most prototypes that use photo fill or photo art. axe cannot judge it and puts it in `incomplete`, which the studio drops. So white text on a light sky passes every check, and the user finds it in Play. Claude Design-quality output keeps such text readable with a scrim or a placement off the light part.

**Behaviour.**
- **New in-page pass, apart from the shared run.** Do not change `runSharedAxe` or `axeRunExpression`: they feed the `axeRuns` cache and the `render_check` output on every surface. Add a separate expression in a new file that runs axe `color-contrast` with `resultTypes: ['incomplete']` and keeps nodes whose reason is a background image, a gradient or an overlap. Max 3 nodes per page; skip the pass when the page has no `background-image` and no `<img>` under text (one cheap evaluate first).
- **Pixel measure.** For each node: read its box, text color and font size; set `color: transparent; text-shadow: none` on it, take a clip screenshot of the box, restore the style. Decode with `pngjs`. Compare the text color with the 90th percentile background luminance on the side nearest the text color (light text: the brightest 10%; dark text: the darkest 10%). AA: 4.5:1, or 3:1 for large text.
- **Finding.** A `QualityFinding` with `check: "a11y"`, as every axe finding has today (`axe.ts` line 93; `QualityCheckName` has no `color-contrast` member, so no union change), the axe selector and the `data-studio-loc` source: "Text on a photo or gradient is 2.1:1 at its lightest part (AA needs 4.5:1). Add a scrim behind the text, a text shadow, or move the text off the light part." Severity as the axe impact for contrast.
- **Where it shows.** In the `render_check` result (the in-app agent and MCP) and the studio review lines. It runs on desktop renders only, where axe runs now (`wantsAxe`). The cycle-37 dark step uses its own axe expression, so it does not get this pass (runner-up).
- **Leased pages only.** The pass changes live node styles, so it runs only on a leased page (`withPage`, the pool), never on a peek page, where another caller can take a screenshot at the same moment. `RenderPage.screenshot(outPath, clip)` (`server-ports.ts` line 76) is the clip shot; check it on the electron backend too.
- Write the added ms per render on a page with 0 and with 3 such nodes.

**Headless.** No new action. `render_check` input does not change (N4); its output gets more findings of an existing kind. `get_screenshot` exists for the fix check.

**Main files.** New `preview/text-on-photo.ts` (expression, clip shot and measure); `preview/axe.ts` (144 lines: one call in `runAxe` or a new exported `runPhotoTextAxe`; the `AxePage` type gets an optional `screenshot` with a clip); `preview/page-capture/index.ts` (export line only, if dark-check or app-check needs it). Not `preview/browser.ts` (944 lines: if it needs a call, one line that replaces a line, no growth), not `agent/**`.

**Verify in the running app.**
- No model: seeded HTML project `ds-wt/pt-seed` with a local JPG (no image-search key): `index.html` with white `h1` over the light top of the photo and no scrim; `plan.html` with the same `h1` over a dark-to-clear gradient scrim; a gradient panel card with light text. `render_check` through MCP and the chat agent: 2 findings on `index.html` and the card, 0 on `plan.html`. After a scrim fix: 0.
- A peek-page call (a live canvas probe) never runs the pass (log line).
- **Real-model run (2 short runs):** "A landing page for a mountain yoga retreat with a full-bleed photo hero and the headline on the photo." On main and on the branch, fresh data folders. Score both with the branch check. Gate: 0 photo-text findings at run end on the branch. Report main misses, loops, seconds and cost.
- Dark and light screenshots of the branch hero.

---

## 3. frame-fit: Resize to fit (Figma)

**Why.** A long page in a 900 px frame shows a scroll bar on the canvas, and a share or Copy as PNG of that frame cuts the page. In Figma, "Resize to fit" makes the frame hug its content. It was a runner-up for 7 cycles; the only blocker was how to measure a page that uses `100vh`.

**Behaviour.**
- **Measure (the decision).** The server renders the frame path at the frame width with the viewport height `B`, a fixed base for that width (desktop 900, tablet 1024, phone 844, and 900 when no preset matches; never the current frame height, or a custom frame with an `h-screen` section grows on each fit), and reads `document.documentElement.scrollHeight` after load and fonts. Fit height `H = max(B, scrollHeight)`, max 20,000.
- **Fixed point.** Render again at height `H`. If the new `scrollHeight` is `H` or less, the result is `H`. If it grows again (a `100vh` or `h-screen` section grew with the viewport), keep `H` and return a warning: "The page has sections sized to the screen height (100vh), so it grows with the frame. The frame is set to its height at the device size." Never loop more than 2 renders.
- **Shrink.** A frame taller than its content goes back to `H`, never below `B`.
- **UI.** A "Resize to fit" item in the frame menu (Arrange group), and in the multi-frame menu for a frame selection. One layout history step, so Cmd+Z restores the old heights. No key (Figma's key `Mod+Alt+Shift+R` is `forceReload` in `desktop/menu.ts`).
- Frame width does not change. Route frames of an attached app use the dev server URL, as screenshots do.

**Headless.** New action, stamped with `pnpm run new:action canvas setFrameHeights --access edit --needs project.update --scope project --path /api/projects/:projectId/canvas/frames/heights --method PUT --invalidates canvas.inspect --description "..."` (`scripts/new-action.ts` is on main; positionals `domain verb`, and `scripts/stamp/names.ts` splits `setFrameHeights` into the N3 verb `set` and the object `FrameHeights`). Id `canvas.setFrameHeights`; let the stamp derive the const, the tool name (plural canvas actions derive as `move_frames_canvas` does) and the types; never hand-write them, N2). Input: `projectId`, the direction field, `frames` (ids or `@label`, max 20). Output: a `Schema.Struct` with each frame's old and new height and warnings. `access: "edit"`, `confirm: "none"`, `PUT /api/projects/:projectId/canvas/frames/heights`, `invalidates: ["canvas.inspect"]`, `needs: "project.update"`, `scope: "project"`, `mcp { name }` with the derived name, `agent { lean: false, name, set: "core", short }`. Description in STE. Prove it with `pnpm exec tsx scripts/call-action.ts canvas.setFrameHeights '<json>'`.

**Main files.** New `packages/common/actions/src/canvas/set-frame-heights.ts` and `src/server/handlers/canvas/set-frame-heights.ts` (stamp); a write service for the measure in new `src/server/canvas/frame-fit/` (one `Context.Service` per file; render through the preview service, `Effect.fn`, no `async`), provided in `handlers/canvas/live.ts`; `ui/features/canvas/{frame-menu-model.ts,frame-menu-groups-model.ts,copy.ts}` and the multi-frame menu file; `@generated` lists through `gen-routes` only. Not the 5 hand aggregators (W12), not `main/live-layer.ts`.

**Verify in the running app.**
- HTML project `ds-wt/fz-seed`: `long.html` (3,200 px of content), `short.html` (400 px), `screen.html` (an `h-screen` hero plus 600 px below), each in a 1440 x 900 frame, and `short.html` also in a 1440 x 3000 frame.
- Frame menu > Resize to fit on each: `long` 3,200; `short` 900 (never below the device height); the 3000 frame shrinks to 900; `screen` 1,500 with the warning, no growth on a second fit. Cmd+Z: old heights. Multi-select 3 frames: one step.
- Over MCP (`call-action.ts`): http, mcp and agent give the same output (reset the canvas between surfaces).
- Fake Next app `ds-wt/fz-next` (Next 16, a long route): fit a route frame; the share link and Copy as PNG show the whole page.
- `pnpm run build:ui`, `check-bundle`: B1 delta 0. Dark and light screenshots of the menu and a fitted frame. No real-model run.

---

## 4. copy-props: copy and paste properties keys (Figma)

**Why.** Figma users copy a style with `Mod+Alt+C` and paste it with `Mod+Alt+V` many times a session. Here the same thing needs 2 right-clicks and 2 menu picks. The commands exist; only the keys are missing. Cycle 37 held it back for Home bytes; keys are off Home now.

**Behaviour.**
- `Mod+Alt+C` with one layer selected (canvas, frame or Layers panel focus): run the existing Copy style of that layer; toast "Copied style of h2" (the existing copy text).
- `Mod+Alt+V` with layers selected: run the existing Paste style (`apply(null)`) on all selected layers; the existing blocker text when there is no copied style or the run is busy. One write is one version, as now.
- No key in a typing target (text edit, inspector field, chat). In a range edit the key does nothing.
- The shortcuts sheet shows both keys under Edit; the canvas menu items show them as `data-tip` keys.

**Headless.** No new action. `get_layer_style` and `apply_layer_style` (`layer-style.get`, `layer-style.apply`) already cover it on MCP and the agent.

**Main files.** `shared/keymap.ts` (2 bindings, Edit group); `packages/common/contracts/src/contracts.ts` (2 `AppKey` members, `style-copy` and `style-paste`, or 2 `StructureKey` members; pick the one whose forwarders are not on Home); the bridge key match for frame focus (`bridge/keyboard.ts` or `bridge/zoom-forward.ts`, 1 to 3 lines); new `ui/features/layer-style/use-layer-style-keys.ts` (the handler, lazy with the canvas); `ui/features/canvas/use-preview-menu.tsx` (491 lines: one call line, stay under 500). Not `ui/features/commands/**`, not `ui/platform/**`, not `desktop/menu.ts`.

**Verify in the running app.**
- HTML prototype `ds-wt/kp-seed` with 2 cards. Select card 1's title, `Mod+Alt+C`; select card 2's title and a button, `Mod+Alt+V`: both take the style; one version. Cmd+Z: back.
- The same with focus in the preview frame, in the Layers panel, and in the packed app. In a text edit and in the inspector: the key does nothing.
- Union grep (N12) before the commit. `pnpm run build:ui`, `check-bundle`: B1 delta 0. Dark and light screenshots of the shortcuts sheet. No real-model run.

---

## 5. polish-38: preview errors, Bold in a link, menu Cmd+Z, first port.start

**Items.** Prove each one first; change code only for what the proof shows.
- **Preview errors under parallel checks.**
  - Reproduce with the flow-fast mock `[port-bash]` driver at `ROUTES_AT_ONCE` 3 on `ds-wt/p38-next` (a copy of `fl-next`): 10 runs, count the routes that need the re-check. Log the preview method of each failing call.
  - If the failing call is a peek page: `PeekPages.sweep` must never drop a page with `busy > 0`; an over-cap busy page is dropped when its last user leaves (`occupy` drain).
  - If it is the pool: find the close (a failed `run`, `recycle` after the slot is free, or a concurrent `captureScreenshot`), and fix that one.
  - Pass: 0 routes need the re-check in 10 runs. Keep the re-check as a guard; write the counts in the report.
- **Bold in a link.** The range reading carries the style tags that hold the range (the same walk `toRangeTarget` uses for the keys), so the bar shows Bold as on inside `<a><strong>`, and a click removes it. Prefer a change that keeps `tag` and adds one field; that is a `contracts.ts` change (see unions).
- **OS keyboard Cmd+Z through the macOS menu.** In the packed app with an unlocked screen, drive real key events (`osascript` keystroke, not CDP): plain edit, type "x", Cmd+Z, Cmd+Z, then range mode Mod+B, Cmd+Z. Expected as in polish-37. If the screen is locked, write "not run"; a CDP key event does not count. Fix only a failure.
- **First `port.start`.** Time it on a big synthetic repo `ds-wt/p38-big` (`fl-next` plus about 20,000 generated files, git history of 200 commits), never a Bonaparte clone: 5 fresh data folders, p50. Then try one fix: start the first app version save (`store/version-seed.ts`) when the Move to app dialog opens, through an existing write route, and make the asset copy wait for it. Stop rule: if no existing write route fits, or p50 is not under 2,000 ms, or the race from polish-35 shows, change nothing and write the numbers.

**Headless.** No new action. The Bold fix is in the bar only; the keys and `apply_range_text` are as now. The preview fix serves every surface.

**Main files.** `preview/peek-pages.ts` (491 lines: stay under 500) or `preview/page-pool.ts`, whichever the proof names; `bridge/text-range-target.ts`, `bridge/text-range.ts` (the reading post), `ui/features/text-range/text-range-model.ts`; `contracts.ts` (one field on the range message, only if needed); `store/version-seed.ts` and the Move to app dialog hook, only if the port.start fix holds. Not `preview/browser.ts` (944), not `agent/port-review-routes.ts`.

**Verify in the running app.**
- The 10 mock runs above, before and after.
- `ds-wt/p38-next` route with `<Link href="/terms"><strong>the terms</strong></Link>`: Enter, select "terms", the bar shows Bold on; click Bold: bold goes, one `<strong>` only, `next build` passes; Mod+Z restores.
- The packed-app key steps, or "not run" with the reason.
- The port.start table (main and branch).
- `pnpm run build:ui`, `check-bundle`: B1 delta 0. Dark and light screenshots of the range bar. No real-model run.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 app-check | new `agent/app-review-lines.ts` (and `app-review-{kit,dark}.ts` if split); `agent/{prototype-kit-review.ts,prototype-review.ts,prototype-review-opening.ts}`; `agent/{port-review-kit.ts,prototype-dark-review.ts}` (one export each); `agent/final-check.ts` (net-zero: call arguments and `export` words); fixtures `ds-wt/ac-*` |
| 2 photo-text | new `preview/text-on-photo.ts`; `preview/axe.ts`; `preview/page-capture/index.ts` (export lines); fixtures `ds-wt/pt-*` |
| 3 frame-fit | stamped `actions/canvas/set-frame-heights.ts` and `handlers/canvas/set-frame-heights.ts`; new `server/canvas/frame-fit/**`; `handlers/canvas/live.ts`; `ui/features/canvas/{frame-menu-model.ts,frame-menu-groups-model.ts,copy.ts}` and the multi-frame menu file; generated lists by `gen-routes`; fixtures `ds-wt/fz-*` |
| 4 copy-props | `shared/keymap.ts`; `contracts.ts` (`AppKey` or `StructureKey`); one bridge key file; new `ui/features/layer-style/use-layer-style-keys.ts`; `ui/features/canvas/use-preview-menu.tsx` (one call line); fixtures `ds-wt/kp-*` |
| 5 polish-38 | `preview/peek-pages.ts` or `preview/page-pool.ts`; `bridge/{text-range-target.ts,text-range.ts}`; `ui/features/text-range/text-range-model.ts`; `contracts.ts` (range message field, only if needed); `store/version-seed.ts` and the dialog hook (only if the fix holds); fixtures `ds-wt/p38-*` |

Shared files and conflict warnings:
- **Home preload files (all picks).** No pick adds a line to `ui/app/main.tsx`, `ui/app/screen-preload.ts`, `ui/platform/*` or `ui/features/commands/{index,global-commands,keys,registry,command-disabled,copy}.ts`. Every pick with a `src/ui`, `src/shared` or `src/bridge` change runs `pnpm run build:ui` and `check-bundle`: B1 at or under 274,703 B.
- **`contracts.ts` (picks 4 and 5).** Pick 4 adds 2 members to `AppKey` (or `StructureKey`); pick 5 may add one field to the range message. Different types. Each runs the N12 grep (every `switch` and `Record<` over the union, and the `*_TYPES` lists in `src/shared` and `src/bridge`) before its commit. `STRUCTURE_KEY_IDS` and `structure-edits-model.ts` hold `Record<StructureKey, ...>` maps: if pick 4 uses `StructureKey`, it updates them all.
- **Preview (picks 1, 2, 3 and 5).** Pick 5 owns `peek-pages.ts` and `page-pool.ts`; pick 2 owns `axe.ts` and `page-capture/index.ts`. Pick 1 renders dark through the export from `prototype-dark-review.ts` and edits no preview file. Pick 3 renders through the preview service and edits no preview file. No pick grows `browser.ts` (944).
- **Agent review (pick 1 only).** No other pick edits `prototype-kit-review.ts`, `prototype-review.ts`, `prototype-review-opening.ts`, `prototype-dark-review.ts`, `port-review-kit.ts` or `final-check.ts`. Pick 1's `final-check.ts` change must keep it at 537 lines or fewer. Pick 2's findings reach the app review through `review_frame` and `render_check` unchanged.
- **Canvas UI (picks 3 and 4).** Pick 3 owns the frame menu files and `canvas/copy.ts`; pick 4 owns one call line in `use-preview-menu.tsx` and puts its handler in the layer-style feature. Pick 4 needs no `canvas/copy.ts` text (key labels come from the keymap). If pick 3 needs `use-preview-menu.tsx`, it rebases on pick 4.
- **Unions.**
  - Pick 4: `AppKey` or `StructureKey` (see above).
  - Pick 5: the range message, only if needed.
  - Pick 1: an app count in the opening counts type in `prototype-review-opening.ts` only.
  - Pick 2: none (it reuses `check: "a11y"`).
  - Pick 3: new schema in its own action file only.
  - No two picks change one union.
- **`@generated` lists (pick 3 only).** Pick 3 adds an action, so `gen-routes` output changes. Never merge a generated file by hand: after each rebase run `pnpm exec tsx scripts/gen-routes.ts`, then `--check` after each merge.
- **Hand aggregators.** No pick edits `actions/index.ts`, `main/live-layer.ts`, `http/mount-all.ts`, `mcp/registry.ts` or `agent-tools/registry.ts`. Pick 3 provides its service in `handlers/canvas/live.ts` (W12b).
- **MCP snapshots.** No pick changes an existing tool input or name in `artifacts/mcp-snapshots/*.json`. Pick 3 adds one new tool.
- **Perf baseline.** No pick edits `scripts/perf/baseline.json` (P10, L6).
- **Long files.** `final-check.ts` (537), `browser.ts` (944), `port-plan.ts` (1295), `sdk-driver.ts` (1622): no growth. `peek-pages.ts` (491), `use-preview-menu.tsx` (491), `prototype-kit-review.ts` (427), `port-review-routes.ts` (481): keep under 500; new logic in new files.
- **Fake apps under `ds-wt`.** Each pick has its own prefix (`ac-`, `pt-`, `fz-`, `kp-`, `p38-`). No pick writes into Bonaparte. No app run or Move to app run targets Bonaparte or a clone of it; `ds-wt/po-bp` is not used.
- **`.claude/goal/roadmap.md` Appendix A:** add each pick's new files when the file is in the worktree (L6e). Cycles 36 and 37 found it missing in worktrees; write that in the report if it is still missing.

## Merge order

All 5 can run at once. Merge in this order:
1. **polish-38**: the preview fix first, because picks 1, 2 and 3 render through the pool and peeks; then its range message field (first `contracts.ts` change). Run the 10 mock flow runs after merge.
2. **photo-text**: `axe.ts` and `page-capture/index.ts`; rebase on polish-38, re-run its seed check.
3. **app-check**: uses the dark render and axe; rebase on photo-text, re-run its no-model script (photo-text findings may now add lines on a changed hero, which is correct).
4. **copy-props**: the second `contracts.ts` change; rebase, run the union grep, `build:ui`, `check-bundle`.
5. **frame-fit**: last, because it changes the generated lists; rebase, run `gen-routes`, then `--check` and `call-action.ts canvas.setFrameHeights`.

After the last merge, run `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run check:scripts`, `pnpm run lint:gate`, `pnpm run build:ui`, `pnpm exec tsx scripts/check-bundle.ts` and `pnpm exec tsx scripts/check-boot-imports.ts`. Then `pnpm run desktop:pack`. Then one real-model session of 2 runs on merged main, each with a fresh data folder:
1. The pick 2 prompt from Home: 0 photo-text findings, then Resize to fit on the landing frame and a share link that shows the whole page.
2. The pick 1 prompt in the in-app chat on a fresh `ac-next` copy: kit imports, 0 dark lines, old raw button unchanged, `next build` passes.

## Real-model run budget

Local Claude Code sign-in, Sonnet, short runs. App runs and Move to app only into a fake Next app under `ds-wt`, never Bonaparte.
- pick 1 app-check: 2 runs (main and branch);
- pick 2 photo-text: 2 runs (main and branch);
- the final merged session: 2 runs.

Picks 3, 4 and 5 need none. Total: 6 runs.

## Runners-up

1. Dark check in Move to app: render each port route with `.dark` for apps that have dark tokens (pick 1 covers chat edits only).
2. Cards and badges swap in app source: an `apply_kit_drift` splice for TSX `Card` and `Badge` (port-kit and app-check only detect them).
3. Skeleton states in the kit check: Bonaparte uses `<Skeleton` in 504 files; flag hand-made gray loading blocks.
4. Bring forward and send backward on `Mod+]` and `Mod+[` (Figma), now that keys are off Home; decide DOM order against z-index first.
5. Figma variables JSON import and export into project tokens.
6. Asset folder for a dynamic single page: a move to `/visits/[id]` copies assets to `public/id/` (flow-review "Left out").
7. Route copy into an existing prototype drops the first page's canvas frame (cycles 35 and 36).
8. Phone tally in the run note and a phone opening on the `toPrototypeReviewGaps` path (phone-flow "Left out").
9. Photo-text in dark: the dark step gets the text-on-photo pass, and its dark-values check follows `@import` (dark-check "Left out").
10. The first double-click after a page load sometimes does not open the text edit (range-nest "Left out").

Sources: [mean.ceo: Claude Design news November 2026](https://blog.mean.ceo/claude-design-news-november-2026/), [TechRepublic: Claude Design overhaul](https://www.techrepublic.com/de/article/news-anthropic-claude-design-overhaul-enterprise-teams/), [The New Stack: Claude Design overhaul](https://thenewstack.io/anthropic-claude-design-overhaul/), [PureAI: Anthropic overhauls Claude Design](https://pureai.com/articles/2026/06/17/anthropic-overhauls-claude-design.aspx), [DEV: Claude Design token fix and code sync](https://dev.to/vjswamy/anthropic-updates-claude-design-token-fix-code-sync-30hk), [Figma release notes](https://figma.com/release-notes), [Figma release notes archive](https://www.figma.com/release-notes/archive/), [releases.sh productivity digest 2026-11-02](https://releases.sh/collections/productivity-apps/digest/2026-11-02), [createwith: what Figma shipped in early November](https://createwith.com/tool/figma/updates/what-figma-shipped-in-early-november), [Releasebot Figma](https://releasebot.io/updates/figma), [createwith: v0 design mode keys](https://www.createwith.com/tool/v0/updates/v0-adds-keyboard-shortcuts-in-design-mode-for-faster-editing), [createwith: v0 annotations](https://www.createwith.com/tool/v0/updates/v0-introduces-annotations-for-visual-feedback-on-generated-uis), [Geekflare: Lovable visual edits](https://geekflare.com/news/lovable-visual-edits-just-got-easier-and-faster-to-use), [createwith: Lovable toolbar](https://www.createwith.com/tool/lovable/updates/lovable-launches-new-toolbar-with-four-interaction-modes-for-visual-editing), [GitHub: nexu-io/open-design](https://github.com/nexu-io/open-design), [newreleases: open design v0.16.0](https://newreleases.io/project/github/nexu-io/open-design/release/open-design-v0.16.0), [mcpservers.org: doop](https://mcpservers.org/servers/kgoedecke/doop), [pyshine: doop](https://pyshine.com/Doop-A-Multiplayer-Design-Canvas-Where-Agents-Design-Too/), [scriptbyai: doop](https://www.scriptbyai.com/doop-paper-design-alternative/).

## Results

Merged into main in this order: polish-38, photo-text, app-check, copy-props, frame-fit. There were no conflicts.

- **polish-38:** The peek sweep no longer closes pages that are in use. Over 10 mock flow runs, page-closed errors went from 148 to 0, and wall p50 went from 16.1 s to 13.9 s. Bold inside a link now shows on and a click removes it. The OS-keyboard Cmd+Z was not run, because the screen was locked. The port.start p50 is 635 ms on the large fake repo, so it needs no fix.
- **photo-text:** render_check measures text on photos, gradients and pseudo-element scrims. A render with no photo costs 0 ms, and a render with 3 nodes costs 110 to 260 ms. In real runs, main has 1 finding and the branch has 0. The dark hero step was left out.
- **app-check:** Chat edits of an attached app get kit and dark lines on the changed lines only. A dark-count bug was fixed, but no real run checked the fix.
- **copy-props:** Mod+Alt+C copies a style and Mod+Alt+V pastes it, from the canvas, the frame and the Layers panel. One paste makes one version.
- **frame-fit:** Adds the canvas.setFrameHeights action (tool set_frame_heights_canvas) and Resize to fit in the frame menus. The cap is 4,000 px, which is CANVAS_MAX_SIDE. One Cmd+Z undoes a fit of many frames.

Checks: gen, tsc, lint and lint:gate pass (59,616 diagnostics, baseline 89,733). ui passes, clip finds 0, pack and the reinstall pass, and :4570 gives 200. Idle CPU is 0.02 CPU-s over 60 s. check-bundle B1 is 274,703 B (delta 0). Nothing was pushed.
