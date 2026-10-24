# Polish log

One section per round. Each feature lists its acceptance check from `polish-benchmark.md`, the proof, and the result.

## Round 1 — Home and first run (2026-10-24)

### Features built

| Item | Acceptance check | Proof | Result |
|---|---|---|---|
| R1-1 Project thumbnails (P0) | After a mock run ends, the card shows an `<img>` of the new version within 2 s; the image changes after a second run | `e2e/home-r1.spec.ts` "R1-1"; `src/server/http/home-routes.test.ts` "saves a half-size thumbnail" | Pass. Lag from run end to the new image on the card (asserted on the second run): 1312 ms alone, 1301 ms in the full suite. The first run, which also loads Home, took 1356 ms alone and 1878 ms in the full suite, so the margin under load is small. `data-version` and the image bytes change after run 2 |
| R1-2 Rename, duplicate, delete (P0) | A rename shows after reload; a duplicate opens with the same head version; delete removes the card and Undo in the toast brings it back | `e2e/home-r1.spec.ts` "R1-2" (right-click menu, More button, context-menu key); vitest rename, duplicate, trash and restore cases | Pass |
| R1-3 Starter gallery (P1) | A starter opens a project with a preview in < 2 s and no model call | `e2e/home-r1.spec.ts` "R1-3: a starter" | Pass. Click to preview `h1`: 921 ms alone, 426 ms in the full suite. Run list empty |
| R1-3 Clarifying questions (P1) | A 5-word prompt with the mock agent shows the question form before any file write | `e2e/home-r1.spec.ts` "R1-3: a 5-word prompt"; `src/server/agent/clarify.test.ts` | Pass. Project count and the projects folder listing do not change while the form is open; the chosen answer reaches `run.sent` |
| R1-4 Drop or paste a screenshot or URL (P1) | A dropped PNG shows a thumbnail chip in < 200 ms; a pasted `https://example.com` shows the chip, and the run prompt holds the captured page | `e2e/home-r1.spec.ts` "R1-4"; vitest "puts a captured reference page into the run prompt" | Pass. Drop to chip: 15 ms alone, 7 ms in the full suite. The `example.com` paste shows the chip; the capture part uses a loopback fixture page, because tests may not use the internet |
| R1-5 Search and sort (P1) | 3 letters filter 50 projects in < 50 ms; `/` focuses search | `e2e/home-r1.spec.ts` "R1-5, R1-8"; `src/ui/projectList.test.ts` | Pass. 3 letters over 50+ projects: 10.2 ms alone, 13.6 ms in the full suite (input event to next frame) |
| R1-6 First-run panel (P1) | A fresh data folder shows the panel; after Close it does not show again | `e2e/home-r1.spec.ts` "R1-6, R1-7"; vitest "keeps the onboarding flag" | Pass. The flag lives in `preferences.json` (`onboardingDismissed`), so it is per data folder |
| R1-7 Sample project (P2) | Opens with a preview and 2 versions, with no model call | `e2e/home-r1.spec.ts` "R1-6, R1-7"; vitest "makes a sample project" | Pass |
| R1-8 Grid arrow keys (P2) | With keys only, open the third project in 4 key presses | `e2e/home-r1.spec.ts` "R1-5, R1-8" | Pass. Start state: focus in the search box (one `/` press from anywhere outside a text field). Then ↓ → → ↩ |

Decisions:
- Delete moves `projects/<pid>/` to `<dataDir>/trash/projects/<pid>-<time>/`. The work tree (the user's folder) is never moved or removed. The toast says the files stay on disk. A run in progress gives 409. Restore merges a ghost folder that late events made.
- Duplicate copies the shadow git as is (same version ids) and checks out the head into a new sibling folder (`<name>-copy`). Only the main direction is copied. Sessions are reset.
- The sample project is an action in the first-run panel, not a seed in every new data folder. A seed would add a project to every e2e server and write to the user's projects folder without a request.
- Clarifying questions run on Home before the project exists. Mock mode returns 3 fixed questions. Real mode makes one Haiku call (no tools, 12 s timeout) and falls back to the fixed questions. "Skip questions" builds at once.
- A pasted lone URL becomes a "Use as reference" chip and is not put in the prompt text. The server reads the page with `safeFetch` (same SSRF guard as design-system import), keeps headings and text (6000 characters max), and adds it to the run prompt in a `<reference-pages>` block marked as untrusted.
- Thumbnails: on each `version.created` of kind init, run, undo, restore or keep on the main direction, one worker shoots the first 1280×800 viewport of the head and stores a 640×400 PNG in `projects/<pid>/thumbs/` (outside the work tree). Only the newest file is kept. `updatedAt` does not change. The UI loads the image with the token and keeps it by project and version. Home polls the list every 500 ms while a thumbnail is behind the head, and every 1.5 s while a project changed in the last 2 min.

### Polish changes

Skills used: `make-interfaces-feel-better`, `emil-design-eng`, `better-interface` (with the `better-*` domain skills) and `impeccable` (audit, through a review agent).

- Project cards: image first (16:10, top-aligned crop, 1 px inner outline), name on one line with a tooltip, meta row with kind, time and design system. The menu button shows on hover and focus.
- Card menu: Open, Rename (F2), Duplicate (⌘D), Delete (⌘⌫), with glyph hints. It opens from the button, right-click (at the pointer, scales from the top left) and the context-menu key (no animation for keyboard opens). Arrow keys, Home, End, Esc and Tab work.
- Toast: an Undo or error toast stays until used or closed; other toasts close after 8 s and pause on hover or focus. The text wraps; it does not truncate.
- Clarify form: each question is a radio group with roving focus. A chosen answer shows a check icon, so the state is not shown by color only.
- Focus: menu items get a 2 px accent inset ring; the composer gets a 2 px accent ring. After delete, focus goes to the next card. After Esc on the questions, focus goes back to the prompt.
- Sizes: chip remove buttons 28×28. Header gap and search padding on the 4 px tokens. First-run uses 2 weights. Step numbers use neutral colors, so accent stays on actions.
- Motion: menu 160 ms ease-out, chips 160 ms, questions 220 ms, thumbnail fade 220 ms. Reduced motion keeps fades only. Card hover depth only with a fine pointer.
- Copy: "Starters", "Opens at once, no agent run", "Close first steps", Create tooltip "Create (⌘↩)". The heading reads "Projects" when the sort is not Recent.

Premium-feel checklist (Home), after the fixes:

| Line | Result |
|---|---|
| Spacing on `--s-*` | Pass |
| Related 8 px, groups 16–24, sections 32+ | Pass |
| Concentric radius | Pass (card 12, 8 padding, inner image 4) |
| Icon buttons ≥ 28×28 | Pass |
| Only `--t-*` sizes, nothing under 12 | Pass |
| 3 sizes and 2 weights per panel | Pass on cards, first-run and questions. The hero keeps its existing 5 sizes across composer, location and folders (not changed this round) |
| `tabular-nums`, truncation with tooltip | Pass |
| `text-wrap: balance` on headings | Pass |
| Hover, active, focus-visible, disabled | Pass |
| Focus ring visible, not clipped | Pass |
| Empty state | Pass (no projects, no search match with Clear search, no projects in folder) |
| Loading within 100 ms | Pass (skeleton cards and starters, spinner on starter and sample) |
| Error with a way out | Pass (toast errors, starter error next to the gallery, form error) |
| Durations from tokens, nothing over 300 ms | Pass (shimmer loop excepted) |
| Enter ease-out, exit faster | Pass |
| Only transform and opacity animate | Partial. New animations use opacity and scale; the existing card `box-shadow` hover transition stays |
| Reduced motion fades only | Pass |
| Smooth (p95 ≤ 16.7 ms) | Not measured this round |
| Copy, same words | Pass |
| Shortcut glyphs | Pass |
| One icon set and stroke | Pass (`Icon.tsx`, new `more`, `trash`, `copy`, `image`) |
| Semantic colors, one accent action | Pass |
| Contrast | Pass (`--text-3` on surfaces 4.95–5.15; focus indicators now accent) |
| Native feel | Partial. Right-click and keys work; Home actions are not yet in the app menu or a palette (R8) |

### Screenshots

Before: `/tmp/polish-r1/before-home-empty.png`, `/tmp/polish-r1/before-home-projects.png` (desktop app, `scripts/ui-shots.ts`).

After (desktop app): `/tmp/polish-r1/after-home-empty.png`, `/tmp/polish-r1/after-home-projects.png`.

After (web, `scripts/home-shots.ts`, 1440×900 at 2x): `/tmp/polish-r1/after-home-first-run.png`, `after-home-questions.png`, `after-home-chips.png`, `after-home-projects.png`, `after-home-projects-full.png`, `after-home-card-menu.png`, `after-home-search.png`.

### Left for later rounds

- Duplicate copies only the main direction; extra directions and comments are not copied.
- Trash has no list or empty-trash screen; items stay in `<dataDir>/trash/projects/`.
- Images and reference links are not passed to a Designs > 1 fan-out from Home.
- Reference pages give text and structure only; no screenshot of the page and no layer import (web clone stays partial).
- Multi-select on the grid (Paper) is not built.
- Home actions in the app menu and command palette: R8.
- Smoothness trace for the Home grid at 50+ cards: R5.
- The questions are fixed in mock mode; real-model question quality is not measured.

### Regressions found

- The clarifying questions catch every Home create under 12 words, so the shared e2e helpers and specs now click "Skip questions" (`clickCreate` in `e2e/support/studio.ts`). No product regression.
- One AC-14 failure in the first `ac-core` run ("Not found" in the preview). It passed in the rerun, in 4 repeats and in the final full run. Likely causes: I rebuilt `dist/ui` while that suite ran, and my screenshot server on port 4970 was running at the same time. Not reproduced.
- Found in review: ⌘↩ in the prompt with the questions open built without the answers. Fixed (it now submits the questions form); the R1-3 e2e uses ⌘↩.
- Process note: I stopped my screenshot server twice with `pkill -f "tsx src/server/index.ts"`, a pattern that matches any Studio server on the machine. Afterwards no other Studio server was running.

### Test runs (final)

The full runs below are on `721622f`. Later commits (card image radius, ⌘↩ with the questions open, faster thumbnail polling) were rechecked with `home-r1`, `folders` and `skills` specs, typecheck and vitest.


- `npx tsc --noEmit -p tsconfig.json`: clean.
- `npx vitest run`: 80 files, 678 tests passed.
- `npm run build:ui`: built.
- Playwright with `STUDIO_E2E_GROUP=r1 STUDIO_E2E_PORT_OFFSET=3700`: `playwright.config.ts` 65 passed (7 new in `home-r1.spec.ts`), `ac-core` 7, `ac-edit` 19, `ac-safety` 10.
- `npm run e2e:desktop`: 19 passed.

## Round 2 — Canvas (2026-10-24)

### Features built

| Item | Acceptance check | Proof | Result |
|---|---|---|---|
| R2-1 Zoom keys like Figma, menu clash (P0) | Desktop: ⌘0, ⌘= and ⌘− change the canvas zoom and `getZoomFactor()` stays 1; Shift+1 fits within 1 frame of the key; both with focus in the iframe | `e2e/desktop-native.spec.ts` "R2-1" (keys in studio and iframe, then each View menu item, zoom factor read from the studio window); "the menus carry the native shortcuts" asserts no `zoomin`, `zoomout`, `resetzoom` roles; `e2e/canvas-r2.spec.ts` "R2-1"; `src/ui/canvasFrames.test.ts` "zoomKeyOf" | Pass. Zoom factor 1 after every key and menu item. The fit is written in the key handler (studio) or the message handler (iframe), so the first animation frame after the key shows it (asserted for every sample). Key to that frame, wall clock, 5 samples per focus, 5 runs (headless web, full load): studio 1–17 ms, median ≤ 15 ms; iframe 1–33 ms, median 4–26 ms, because the key crosses a postMessage hop and the message task sometimes lands after a frame start. Desktop app (the build the check names), 3 runs: studio 1–6 ms, iframe 4–8 ms. Asserts: next frame shows the fit; median ≤ 17.7 ms (studio) or 34.4 ms (iframe); max ≤ 50 ms |
| R2-2 Pan with no React render (P0) | 0 commits of `Canvas` during a 3 s pan; pan smooth | `e2e/canvas-r2.spec.ts` "R2-2": a fake React DevTools hook counts commits where the `Canvas` fiber did work (positive control: the wheel-idle commit is counted); rAF frame probe | Pass. 3 s Space-drag pan and 3 s Ctrl-wheel zoom with 3 frames: 0 Canvas commits, 0 commits at all. Headless (60 Hz vsync): pan p95 16.7 ms, max 16.8 ms, 0 frames > 32 ms. Headed Chrome on the 120 Hz display, 4 runs: pan p95 9.9–10.2 ms, max 10.4 ms; zoom p95 10.0–10.2 ms, max 10.4 ms; 0 frames > 32 ms |
| R2-3 Multi-frame canvas, part 1 (P0) | Add 3 frames (1440, 768, 390), drag one, reload; all 3 keep their place; Shift+1 fits all 3 | `e2e/canvas-r2.spec.ts` "R2-3"; `src/ui/canvasFrames.test.ts` | Pass. The drag moves the label exactly 50, 100 px on screen; frame offsets match before and after reload; all 3 frames inside the stage after Shift+1, before and after reload. Click a frame name to make it the live frame; arrow keys nudge (10 px, Shift 100 px); remove has Undo |
| R2-4 Layers tree, part 1 (P0) | A row click selects the same element in the preview in < 50 ms; on a 1,000-node page the tree opens in < 150 ms (virtual list) | `e2e/canvas-r2.spec.ts` "R2-4" (1,132-node page); `src/ui/layersTree.test.ts` | Pass. Open to first row: 12–17 ms. Row pointerdown to selected box: 12.8–18.8 ms. Fewer than 80 rows in the DOM. The selected box equals the element `getBoundingClientRect`; hover row shows the outline; arrows move, Left collapses and goes to the parent, Right expands; hidden elements are listed and selectable |
| R2-5 Select parent, child, sibling (P1) | From a section, 3 key presses reach a nested button, with focus in the iframe | `e2e/canvas-r2.spec.ts` "R2-5" | Pass. Section, Enter ×3, button "Deep"; Shift+Enter goes back up. Tab and Shift+Tab move between siblings with focus in the studio too. In the tree: Enter and Shift+Enter; Tab is left for focus moves |
| R2-6 Distance measurement (P1) | Labels match `getBoundingClientRect` within 1 px | `e2e/canvas-r2.spec.ts` "R2-6"; `src/ui/measure.test.ts` | Pass. Sibling gap 24 = 24; insets to the parent 24, 24, 24 (and 1216) equal the rects |

### Polish

| Item | Check | Proof | Result |
|---|---|---|---|
| R2-7 Z-click zoom (P2) | Z+click zooms 2× around the cursor; Z+Alt+click zooms out | `e2e/canvas-r2.spec.ts` "R2-7" | Pass. Point under the cursor stays within 1 px; zoom-in cursor while Z is held |
| R2-8 Zoom label and `navigator.platform` (P2) | The menu never shows an empty label; no deprecated API | `zoomOptionLabel` in `CanvasToolbar.tsx`; `isApple()` uses `userAgentData.platform` or the user agent | Pass. The Fit option reads "Fit" or "Fit N%" |

Decisions:
- ⌘1 means fit (Sketch and the benchmark row), ⌘2 means selection. Figma's documented keys (Shift+1, Shift+2, Shift+0) work too.
- The View menu keeps zoom items with ⌘ accelerators for the native-feel line, but they send canvas commands. A key that the page handled and the menu echo of the same key within 150 ms apply once.
- `.artboard` stays the live frame at the world origin, so all old specs that read its transform and size still pass. Other frames are previews of the same URL with no bridge token and no pointer events; a click makes one the live frame. Per-frame pages wait for R7-3 (variations as frames).
- In select mode a click in the preview now focuses the preview, so Enter and Tab reach the bridge instead of the Select button.
- No animation on the layers panel (it opens from ⌥1 many times a day). Twisty rotate 100 ms.

Skills used: `make-interfaces-feel-better` (hit areas to 28 px, press scale), `emil-design-eng` (no panel animation, faster twisty), `better-interface` (keyboard path for frame moves, Undo for frame removal, hidden state shown as text, not only opacity), `impeccable` (no pure white, separator after the layers toggle).

Premium-feel checklist (canvas: toolbar, frames, layers, measure):

| Line | Result |
|---|---|
| Spacing on `--s-*` | Pass on new CSS. Row indent is 4 + 12 px per level (inline style) |
| Related 8 px, groups 16–24, sections 32+ | Pass |
| Concentric radius | Pass (rows 6 inside a 248 px panel with no radius) |
| Icon buttons ≥ 28×28 | Pass (frame name and remove 28; twisty 16 visible, 28 hit area) |
| Only `--t-*` sizes, nothing under 12 | Pass |
| 3 sizes and 2 weights per panel | Pass (layers: 13/600 title, 12/400 rows) |
| `tabular-nums`, truncation with tooltip | Pass (frame names, sizes, measure labels; rows have a title) |
| `text-wrap: balance` | Pass on the empty and note text |
| Hover, active, focus-visible, disabled | Pass (Add frame disabled at 12 frames; Layers disabled outside Live) |
| Focus ring visible, not clipped | Pass (inset rings on rows, frame names, list) |
| Empty state | Pass ("This frame has no elements yet.") |
| Loading within 100 ms | Pass ("Reading layers…" with spinner; the tree arrives in about 15 ms) |
| Error with a way out | Not applicable (no new error paths) |
| Durations from tokens, nothing over 300 ms | Pass (new `--dur-fast` 100 ms) |
| Enter ease-out, exit faster | Pass |
| Only transform and opacity animate | Pass |
| Reduced motion | Pass |
| Smooth | Pass (numbers above) |
| Copy, same words | Pass ("frame" everywhere) |
| Shortcut glyphs | Pass (⇧1, ⇧2, ⇧0, ⌘, ⌥1 in tips; ⌘ accelerators in the View menu) |
| One icon set and stroke | Pass (new `layers`, `frame` in `Icon.tsx`) |
| Semantic colors, one accent action | Pass (new `--measure` token) |
| Contrast | Pass (measure label 0.99 on oklch 0.54 0.2 25, about 4.6:1) |
| Native feel | Pass for zoom (menu items); frame and layer actions have no menu items yet (R8 palette) |

### Screenshots

Before (web, `scripts/canvas-shots.ts`, 1440×900 at 2x): `/tmp/polish-r2/before-canvas.png`, `before-canvas-select.png`, `before-canvas-toolbar.png`.

After: `/tmp/polish-r2/after-canvas.png`, `after-canvas-select.png`, `after-canvas-measure.png`, `after-canvas-layers.png`, `after-canvas-frames.png`, `after-canvas-add-frame-menu.png`, `after-canvas-toolbar.png`. The layers, frames, menu and measure screens did not exist before.

### Left for later rounds

- Frames: per-frame page or route, resize handles on the frame, select and edit in a frame that is not live (one live frame at a time), frames for variations (R7-3).
- Layers: rename, hide, reorder (R4-4); Tab in the tree is kept for focus.
- Z+drag region zoom; Z-click when focus is in the preview.
- Frame and layer actions in the app menu and palette (R8).
- Menu accelerator echo on real keys is handled by the 150 ms rule, but CDP keys never reach accelerators, so only the menu clicks are proven in the desktop e2e.
- Passive frames reload on every HTML change; with many frames this costs load time (minimap and low-zoom thumbnails stay deferred).

### Regressions found

- Intended change: ⌘0 is now 100% and ⌘1 is fit (the reverse of before). `e2e/zoom.spec.ts` was updated on purpose; its zoom label check now polls, because a wheel zoom commits the label 160 ms after the last event.
- Found in review: my first version of R2-5 focused the preview on every select click, so studio keys (F, V, C, Space, Z) stopped working after a click. Fixed: the bridge no longer takes focus; the parent blurs a toolbar button when a `select` arrives, so focus goes to the page body. `e2e/canvas-r2.spec.ts` R2-5 now presses F and V after a select click.
- Found while testing: quick Enter presses lost a step, because a `request-rects` for the old selection reset the bridge selection. The bridge now ignores that reset for 400 ms after its own select, and studio-side moves start from the bridge selection.
- Fit probe flake (test only): the first probe fired on the Shift keydown. It now listens only for Digit1 and the `zoom-key` fit message.
- AC-14 failed in both full runs when ac-core ran right after the main suite ("Not found" in the preview after a 286 ms mock run; the frame did not reload). It passed in 4 standalone ac-core runs. Round 1 saw the same failure with the same text before any Round 2 code, so I count it as a pre-existing race between the first preview load and the first write. Not fixed; listed below.
- AC-48 failed once in the second full ac-safety run and passed alone twice (the known load-sensitive check). AC-49 failed once in the first ac-safety run while my screenshot server was running; with the server stopped it passed in both later full runs.
- R1-1 thumbnail lag in the full suite: first run 1383 ms, 1851 ms and 1386 ms in the three full runs (limit 2 s); second run 1294–1333 ms. No flake this round, but 1851 ms leaves little margin under load.

Left (added): the AC-14 first-load race above.

### Test runs (final)

On `fix(canvas)` (last code commit) and the test-only commits after it:

- `npx tsc --noEmit -p tsconfig.json`: clean.
- `npx vitest run`: 83 files, 689 tests passed (11 new in `canvasFrames.test.ts`, `layersTree.test.ts`, `measure.test.ts`).
- `npm run build:ui`: built.
- Playwright with `STUDIO_E2E_GROUP=r2 STUDIO_E2E_PORT_OFFSET=3700`: `playwright.config.ts` 72 tests (7 new in `canvas-r2.spec.ts`); 71 passed in each full run, the failure was the R2-1 fit probe flake, fixed in the last test commit and then passed 8 of 8 repeats. `ac-core` 7 passed in 4 standalone runs (AC-14 above). `ac-edit` 19 passed. `ac-safety` 10 passed in the first post-fix full run; AC-48 passed alone after its one failure.
- `npm run e2e:desktop`: 20 passed (1 new: R2-1).

### Commits

`336ac87` feat zoom keys, View menu zoom, rAF pan, multi-frame · `2ea8305` test R2-1–3 · `1998aa0` test desktop zoom · `f79e14e` feat layers, select keys, measure, Z-click · `4356937`, `297e3fc`, `39bf401`, `4ca22ce` polish · `9a5f6ed` unit tests · `c5dc30e` docs architecture and scorecard · `0810428` docs log · then the focus fix, the fit-timing test commits and this log update.

## Round 3 — Chat and agent vs Claude Code (2026-10-24)

### Item 0: the AC-14 race

Cause: an app bug in `src/server/preview/watcher.ts`. The watcher uses chokidar with `ignoreInitial: true`, and nothing waited for its `ready` event. A mock run writes `index.html` a few hundred ms after `watch()`. Under load (right after the main suite) chokidar's first scan is slow, so the write lands during the scan, chokidar counts it as an initial file and sends no `add`. Then no `files.changed` goes out, and the frame that showed the 404 "Not found" page (no bridge) never reloads. Alone, the scan ends before the write, so the test passed.

Fix (`211fc4c`): on `ready`, walk the work tree and report every file with an mtime at or after the `watch()` time. No added wait before the run starts, so first-token time does not change. Proof: `src/server/preview/watcher.test.ts` writes a file at once after `watch()` 20 times and gets `files.changed` each time (it failed before the fix). Back-to-back runs: see Test runs.

### Features built

| Item | Acceptance check | Proof | Result |
|---|---|---|---|
| R3-1 Correct transcript (P0) | A mock run with thinking A, tool 1, thinking B, text shows that order and both thinking blocks | `e2e/chat-r3.spec.ts` "R3-1, R3-3, R3-4"; `src/shared/run-parts.test.ts`; `src/ui/runState.test.ts`; `src/server/agent/mock-r3.test.ts` | Pass. Order `thinking, Read, thinking, text`, 2 thinking blocks, same order after reload (`RunSummary.parts`). A finished or stopped run keeps its live parts and streamed text |
| R3-2 Esc, queue and steer (P0) | A message queued in a 3-tool run reaches the agent before tool 3; Esc stops in < 500 ms and done tool rows stay; focus in studio and iframe | `e2e/chat-r3.spec.ts` "R3-2" (3 tests) | Pass. Queued text is in the run's sent records before the third tool starts (PostToolUse `additionalContext`). Esc to "Stopped" < 500 ms with focus in the composer and in the preview (real agent: 11 ms); done rows stay, no row keeps spinning. Cmd+Enter while running steers: the turn ends and the next run starts with that text. Stop puts unsent queued text back in the composer |
| R3-3 Diffs in chat (P0) | A one-line edit shows `+1 −1` with the exact old and new line | `e2e/chat-r3.spec.ts`; `src/shared/line-diff.test.ts` | Pass. Badge `+1−1`, old `<h1>Harbor Lane Coffee</h1>`, new `<h1>Harbor Lane Roasters</h1>`; per-file totals on the run card |
| R3-4 Copy (P0) | Copy puts the exact markdown or code on the clipboard | `e2e/chat-r3.spec.ts` | Pass. Message copy equals the reply markdown; code block copy equals the code |
| R3-5 Permission prompts, part 1 (P1) | A mock Bash call shows the prompt; Deny with "use npm" sends the note and nothing runs | `e2e/chat-r3.spec.ts` "R3-5"; `src/server/agent/ask-gate.test.ts` | Pass. Note in the sent records, no output file, the row shows "Denied". The mock calls the same gate as the SDK driver. Scope: Bash only; writes outside the project stay hard denies (no prompt) |
| R3-6 @ mentions (P1) | List opens in < 100 ms; `@hdr` ranks `Header.tsx` first; chip content is in the sent prompt | `e2e/chat-r3.spec.ts` "R3-6"; `src/shared/fuzzy.test.ts` | Pass for files and tokens; the file text is in the prompt. Partial: layers are not in the list (left for later) |
| R3-7 Todo list (P1) | "1 of 5" to "2 of 5" in place, no re-render of finished messages, list there after reload | `e2e/chat-r3.spec.ts` "R3-7" | Pass. 0 DOM mutations in finished messages during the update (MutationObserver); current item marked; kept after reload |
| R3-8 Plan mode (P1) | A write is refused in plan mode; Approve switches mode and starts the build | `e2e/chat-r3.spec.ts` "R3-8" | Pass. Refused write, no new version; Approve runs the build and adds 1 version |
| R3-9 Context meter, effort (P1) | Meter = input tokens / model window ±1%; the effort choice is in the next request | `e2e/chat-r3.spec.ts` "R3-9" | Pass. 24,000 of 200,000 = 12%; `request.effort` = `high`. Context = input + cache read + cache write of the last API call |
| R3-10 History and retries (P1) | Up fills the last prompt; Retry adds no second user message | `e2e/chat-r3.spec.ts` "R3-1…" and "R3-10" | Pass. Up and Ctrl+R; "Retrying in Ns (1/5)" line from `system/api_retry`; Retry keeps one user message |

### Polish

| Item | Check | Proof | Result |
|---|---|---|---|
| R3-11 Tool rows | 3 reads of one file show one row "Read ×3" | `src/ui/components/ToolChips.test.ts` | Pass. One verb and target format (`toolLabels.ts`); errors open; errors, running tools and diffs never group. New: "Stopped" state (X icon, no time) for tools cut by a stop, "Denied" tag for refused prompts |
| R3-12 Smooth streaming | 10k-token mock reply smooth; an open fence renders as code mid-stream | `e2e/chat-r3.spec.ts` "R3-12" | Pass. Headless rAF p95 ≤ 17.5 ms, 0 frames > 32 ms; `<pre>` present while the fence is open; a wheel scroll up during the stream stays within 2 px (not pulled back). Finished markdown blocks are memoized; only the open tail re-parses |
| Premium-feel items | — | screenshots | Stop and Queue in the composer row with key hints; queued messages as gray cards with edit, remove and drag; tabular numbers in timers, meter and costs; a new run sticks the scroll to the bottom again; Stop and Queue keep a plain accessible name ("Stop", not "Stop Stop (Esc)") |

### Real agent check

`scripts/r3-real-smoke.ts` (`claude-haiku-5-5`, budget $0.15 per run, total $0.026 for the last pass; 5 passes in all, one of them failed partway at the Esc wait because of a script bug; about $0.11 in all):

- Ordered parts and diffs on a real run: create run `Skill ×3, Glob, Write, render_check, screenshot ×2, Edit ×2, define_tweaks, render_check, text`; diffs `Write +175 −0`, `Edit +1 −1`. Context meter 41,068 tokens. No thinking blocks from Haiku, so thinking order is proven only on the mock.
- Queue: a message queued with Enter after the first tool landed in the same run as a `user` part after the first Edit, and the agent made a second Edit for it.
- Esc: 11 ms to "Stopped" after the fix (2055–2087 ms before). The cancel request went out 2 ms after the key.
- Send right after the stop: the run started after 2099 ms (the server waited for the old run) and completed.

### Screenshots

Before (web, `scripts/chat-shots.ts`, 1440×900 at 2x): `/tmp/polish-r3/before-chat-finished.png`, `before-chat-live.png`, `before-chat-stopped.png`, `before-chat-error.png`, `before-composer-running.png`, `before-studio-finished.png`.

After: `/tmp/polish-r3/after-chat-finished.png`, `after-chat-diff.png`, `after-chat-live.png`, `after-composer-running.png` (queued cards), `after-studio-running.png`, `after-chat-stopped.png`, `after-chat-permission.png`, `after-chat-permission-deny.png`, `after-composer-settings.png` (mode, effort), `after-chat-plan.png`, `after-composer-mention.png`, `after-composer-chip.png`, `after-chat-streaming.png`, `after-chat-error.png`, `after-studio-finished.png`. The diff, permission, plan, mention, todo and queue screens did not exist before.

### Left for later rounds

- Permission prompts part 2 (R8-5): "always allow" rules, a mode cycle, prompts for writes outside the project (those stay hard denies now, which is safer than a prompt).
- Queue: Up on an empty composer does not pull a queued message back (CC does); edit the queue in place instead.
- @ mentions: layers are not in the list yet (files and tokens only); the list does not show file previews.
- Plan mode: the plan card is plain markdown; no per-step comments.
- Context meter: the window is 1M for `[1m]` model ids and 200k for all others; it does not read the window from the SDK.
- Retry: the auto-retry line shows only for SDK `api_retry` messages; a network drop between the studio and the server still shows as an error card.
- Tool rows: Ctrl+O style "show all input and output" for every row at once.

### Regressions found

- Intended change: run text before a tool is now its own message part, and tool rows sit inline between the parts. `e2e/ai-chat.spec.ts` assumed one reply bubble and a "5 tool calls" toggle; `e2e/skills.spec.ts` assumed the label "Skill · name". Both specs now check the new layout (verb plus target chip, diff in the row detail).
- Found in review: tool rows of a stopped run kept spinning, because only `durationMs === null` decided the state. They now show "Stopped" when the run is not running.
- Found in review: a failed run rejected `handle.done`, and the follow-up chain for queued messages had no reject handler, so Node logged an unhandled rejection (`comments-routes.test.ts` showed it). Fixed in `http/app.ts`.
- Found while testing: the Stop button's accessible name was "Stop Stop (Esc)" while its tooltip showed, so `getByRole('button', { name: 'Stop' })` and screen readers got the tooltip text. Stop and Queue now have a fixed `aria-label`.
- Found in the real-agent smoke: Esc took 2055–2087 ms to show "Stopped" (the mock took < 50 ms, so the e2e passed). Cause: the UI waited for `run.finished`, and the SDK takes about 2 s to settle after an abort. First fix: a `run.stopping` event at cancel. It still took 2073 ms, because `eventHub.ts` subscribes to a hand-written list of SSE event names and the new name was not in it, so the browser dropped it with no error. Now the list is a typed `Record` over every event type (a missing type fails the typecheck). New mock tag `[slowstop]` settles 2 s after an abort; the R3-2 studio test uses it and failed at 2104 ms without the fix. A send right after a stop used to get a 409 while the old run settled; the server now waits for it.
- Found while testing: after the user scrolled up, a new run did not scroll the chat back down. A new run now sticks the scroll to the bottom; scroll up during a stream is still not pulled back.
- Open risk, not solved: React previews after the `f-restart` server restart. This is older than `bc173ed`: the first full main run this round, on `c3b83c9`, also failed `variations: React fan-out` (it runs after `f-restart`) and it passed alone. On `bc173ed`, 2 of 3 full main runs failed 3 tests each (`latency` and `variations` both times; also `home-r1` once and `folders` once). In the failing runs the restarted server logged no Vite build at all. The third run passed 84 of 84. Two full runs of the same suite on `b361bf5` (the commit before) passed 84 of 84, and so did one run of the new server code with the old `chat-r3.spec.ts`. The machine load average was 16–21 during all of these runs (Spotlight indexing). A short repro (`chat-r3`, `f-restart`, `latency`) passed. So the cause is not found. The evidence points to a load-sensitive failure of React previews after a restart that was there before this change; an effect of the new `[slowstop]` test is not ruled out. A repro with the React specs that run before `f-restart` (`b-react-hmr`, `c-import-vite`, `d-directions`, then `f-restart`, `latency`, `variations`) passed 7 of 7, and no Vite process was left after it. Next step: log the Vite processes and their ports right after the restart inside a full run.
- Fixed, desktop Esc: the `desktop-native.spec.ts` R3-2 test (Esc with focus in the composer and in the preview) failed in 1 of 9 desktop runs. Cause: the test, not the app. It waited for a done tool row in `[data-run-id]` `.last()`, and on the shared "Native undo check" project that matched an older finished run. So Esc could come before the send returned the run id, when the studio had no active run and no Esc handler. A 1.5 s delay on the send POST made it fail every time with the same probe output (key not prevented, 0 cancel requests). The test now opens its own folder projects, takes the run id from the send response, and checks that run's card. It passes with the delay, 10 of 10 with `--repeat-each=10`, and with `-g` alone. The probe is gone. App gap, not fixed: Esc pressed while a send is still pending is dropped; the server can hold that send about 2 s while a stopped run settles, so a user can hit it.
- Seen in a server log, not a test failure: `[thumbnails] capture failed ... ENOENT ... thumbs` when a project is deleted while its thumbnail is queued.

### Test runs (final)

On `bc173ed` (last code commit):

- `npx tsc --noEmit -p tsconfig.json`: clean.
- `npx vitest run`: 92 files, 719 tests passed (30 new across `run-parts`, `line-diff`, `fuzzy`, `ask-gate`, `mock-r3`, `markdownBlocks`, `runState`, `ToolChips`, `watcher`). No unhandled errors.
- `npm run build:ui`: built.
- Playwright with `STUDIO_E2E_GROUP=r3 STUDIO_E2E_PORT_OFFSET=3700`: `playwright.config.ts` 84 tests (12 new in `chat-r3.spec.ts`): 84 passed in the last full run; 81 and 80 passed in the two runs before it (see the open risk above). `chat-r3`, `e-cancel` and `ai-chat` passed twice each with `--repeat-each=2`. `ac-core` 7 passed, also right after the main suite in the same sequence (AC-14, 2 of 2). `ac-edit` 19 passed. `ac-safety` 10 passed.
- `npm run e2e:desktop`: 21 tests (1 new: R3-2 desktop Esc); 21 passed in 8 of 9 runs, see the open desktop Esc entry.
- Real agent: `scripts/r3-real-smoke.ts`, see Real agent check.

### Commits

`211fc4c` fix AC-14 watcher race · `e4fee6d` ordered parts, diffs, copy · `587935e` Esc, queue, steer, Bash prompt, history · `ec85ae4` streaming, scroll, grouped rows · `6e5f505` todos, meter, effort, retry · `21a850b` plan mode · `2dcc414` @ mentions · `32e1f1f` Ctrl+R · `71b5b76`, `c3b83c9` polish fixes · `8be3a8c` spec updates · `b361bf5` docs and smoke script · `bc173ed` real-agent stop fix · then this log update.

## Round 4 — Inspector and direct edits vs Figma (2026-10-24)

### Item 0: the two Round 3 flakes

- **React previews after the server restart (test bug).** The global setup starts the first server from the Playwright runner. `f-restart` starts the new server from a Playwright worker and piped its stdout and stderr through that worker. Playwright replaces the worker after any failed test, so the pipe then had no reader. The Vite children use `stdio: 'inherit'` and share the dead pipe; the first Vite write (a Babel note about react-dom) got EPIPE and the child exited with code 1. HTML previews do not use Vite, so only React specs after the restart failed, and "no Vite build logged" was the dead log writer. Proof: a spec that always fails, put between `f-restart` and `latency`, made `latency` fail every time (Vite child on port 43300 ready, then exit 1, retry exit 1); after the fix the same order passed with 5 Vite children alive until teardown. Fix (`5f0ad41`): `e2e/support/logged-spawn.ts` opens the log file and gives its descriptor to the child, so no pipe goes through a worker. `e2e/support/logged-spawn.test.ts` fails with the old pipe setup. The full main suite then passed 3 runs in a row (84 of 84 each). Not confirmed: which earlier test failed first in the Round 3 runs and started the cascade (`folders` or `home-r1` most likely); neither failed in any Round 4 run.
- **Desktop Esc miss (test bug).** R3-2 waited for a finished tool row in `[data-run-id]` `.last()`. On the shared project that matched an older finished run, so Esc could arrive before the send returned the new run id, when the studio had no active run and no Esc handler. A 1.5 s hold on the send reproduced it every time. Fix (`fa3a83e`): the test opens its own project, takes the run id from the send response and waits on that run's card. `--repeat-each=10`: 10 of 10; full desktop 21 of 21. The probe is removed.
- **App gap found by 0b, fixed in this round** (`c640d55`): Esc while a send waits for its response did nothing (the server can hold a send about 2 s while a stopped run settles). Now Esc in that window stops the run as soon as its id arrives. `e2e/chat-r4.spec.ts` holds the send before and after the server starts the run; both end "Stopped" with no tool finished, about 21 ms after the later of Esc and the response. Without the fix the test times out.

### Features built

| Item | Acceptance check | Proof | Result |
|---|---|---|---|
| R4-1 Inline text edit (P0) | An `h1` edited in the preview is in the source < 200 ms, no model call | `e2e/inline-text-r4.spec.ts` (6 tests), `e2e/edit-latency-r4.spec.ts` | Pass. ⌘↵ → bytes on disk p95 22–30 ms (HTML), 21–23 ms (React); dblclick → caret 13–14 ms; run count unchanged. Esc cancels without leaving select mode or stopping a run; blur commits; Enter on an element with children still selects the child; off during a run, and a run that starts cancels an open edit. Found and fixed: a second edit right after a commit was lost when the HTML frame swapped; the swap now waits for the edit to end |
| R4-2 Flex controls (P0) | Row → column writes `flex-direction: column`, repaint < 250 ms; Fill writes `flex: 1` (or `width: 100%` outside flex) | `e2e/inspector-r4.spec.ts`, `edit-latency-r4` | Pass. Click → preview style p95 33–34 ms, click → disk p95 41–45 ms. Auto layout section: Display, direction, wrap, 3×3 align grid, gap; Size: hug / fill / fixed for W and H; ⇧A adds flex (also with focus in the preview, not in text fields) |
| R4-3 Undo and redo (P0) | 3 edits + 3 ⌘Z → bytes equal the start; 3 ⇧⌘Z → all 3 again | `e2e/undo-r4.spec.ts`, `src/server/direct-edit/history.test.ts` (6), `update-tokens.test.ts`, `src/ui/editHistory.test.ts` (7) | Pass, exact bytes both ways, once with focus in the preview. ⌘Z → disk p95 4–7 ms. One stack per project (steps use the newest record of the current direction), direct edits and token edits. Desktop Edit menu Undo and Redo: routing unit test only (`editHistory.test.ts`), no desktop e2e. A file changed by anyone else refuses the step (409 `history_stale`) and clears the stack; 409 during a run |
| R4-4 Layers part 2 and resize (P1) | 40 px handle drag changes the W field and the file by 40 px; Alt+Down moves a card one place down in the source | `e2e/layers-r4.spec.ts` (5), `src/server/direct-edit/structure.test.ts` | Pass at 50% zoom (20 screen px = 40 px): W 300 → 340, one version, other bytes the same. Alt+↓/↑ in HTML and TSX, from the studio and from the preview, selection stays on the moved card. Rename (double-click or F2) writes `data-name`; hide writes `display: none`, show restores the exact bytes; a row drag commits once. `.map()` siblings and first/last places refuse with a clear message |
| R4-5 Shadow and effects (P1) | An added shadow writes one `box-shadow` that reads back into the same fields | `e2e/inspector-r4.spec.ts`, `src/ui/shadows` tests | Pass, including a token color (`var(--primary)`) after reload; layer blur writes `filter: blur(2px)` |
| R4-6 Math in inputs (P1) | `12+4` → `16px`; `+8` on 16 → `24px` | `inspector-r4`, `mathInput` tests | Pass. Also `-=N` subtracts; a leading `-N` stays a plain negative number (margin −8, letter spacing −1, shadow x −4 tested) |
| R4-7 Mixed values (P1) | 3 cards with 2 radii show "Mixed"; 8 writes `8px` to all 3 | `e2e/multi-select-r4.spec.ts`, `src/ui/mixedValues.test.ts` (10) | Pass. One batch request, one version, one ⌘Z restores all 3 (bytes equal the start). Shift+click now also removes from the selection (canvas and layers rows) |
| R4-8 Breadcrumb and Copy CSS (P1) | Breadcrumb lists each ancestor, a click selects it; Copy CSS gives the authored rules | `e2e/inspector-extras-r4.spec.ts`, `src/ui/authoredCss.test.ts` (12) | Pass. Rules come from `document.styleSheets` in the bridge (matching `@media` only), then the inline block |

### Polish

| Item | Check | Proof | Result |
|---|---|---|---|
| R4-9 Per-corner radius, align, Other styles, Alt+arrow | `border-radius: a b c d`; align-center writes `align-self: center`; an authored style the panel does not cover shows under Other styles | `inspector-r4`, `inspector-extras-r4`, `layers-r4` | Pass. The benchmark example `filter: blur(2px)` is now covered by Effects, so the check uses `transform: rotate(2deg)` and `mix-blend-mode: multiply`, and asserts `filter` does not show |
| R4-10 Inspector CSS | 0 raw padding, margin or gap px in `inspector.css`; fields 28 px; one label baseline | `src/ui/styles/inspector-css.test.ts`; measured in the polish pass | Pass. One 36 px label column, thin select chevron, two weights per panel |
| Premium-feel checklist | see below | screenshots | Inspector, Layers panel, canvas selection / resize / inline edit: pass on spacing, field height, type sizes and weights, tabular numbers, truncation, states, icons, key glyphs, copy, motion. Fixed in the pass: `.select` app rule leaked into inspector selects; invalid focus ring values on the layers eye and rename field (no ring showed); "Disp" label; resize handles shown during inline edit |

Explicit commits (Enter, blur, button, select and toggle clicks, pointerup) now write at once; only arrow-key steps and the color picker drag keep the 250 ms debounce.

### Edit latency (target: visible ≤ 200 ms)

`e2e/edit-latency-r4.spec.ts`, 7 samples per type, 3 runs with nothing else running, p95 in ms (visible / bytes on disk): font size 14–18 / 9–16; flex direction 33–34 / 41–45; inline text HTML 13–14 caret / 22–30; inline text React 13–14 / 21–23; resize 21–24 live / 20–24; rename 11–13 / 8–9; Alt+arrow move 79–86 (new frame in front) / 6–11; ⌘Z 84–87 (new frame in front) / 4–7. Move and undo have no live preview, so "visible" is the reloaded frame. Visible times use the browser clock; disk times use the Node clock and include Playwright send time.

### Screenshots

Before: `/tmp/polish-r4/before-inspector-h1.png`, `before-inspector-card.png`, `before-inspector-card-bottom.png`, `before-layers.png`, `before-canvas-selected.png` (no multi-select existed). After: `/tmp/polish-r4/after-inspector-{top,h1,card,card-bottom,autolayout,autolayout-empty,size,effects,corners,typography,other,mixed}.png`, `after-layers.png`, `after-layers-{hover,rename}.png`, `after-canvas-{selected,resize,inline-edit}.png`, `after-undo-toast.png`, `after-multi-{mixed,shared}.png`. Script: `scripts/inspector-shots.ts`.

### Left for later rounds

- No desktop e2e for Edit menu Undo and Redo (only a routing unit test).
- The edit history is in memory; a server restart clears it. A token edit that creates a new file and tweak commits are not recorded.
- Relative math (`+8`) on a Mixed field is refused (red field and tooltip, no note on screen); arrow keys and scrub do nothing on Mixed; with many elements, Size shows only W and H. The layers panel highlights one row in a multi-selection.
- Reorder moves one place per step (a long drag moves one place). After an undo of a move, the selection keeps the old source location until the next select.
- "Show" cannot unhide an element that CSS or a parent hides (it says so).
- Copy CSS on React pages can show the inline style from before an edit until the preview resets.
- Inline edit: Shift+Enter does nothing (a source line break reads as a space; a `<br>` would make the element not editable). Editing an `h1` that contains an `em` edits the `em`.
- The 3×3 align grid is 84 px tall next to 64 px of controls (shorter cells would go under the 28 px hit area). Size values can show decimals (`641.69px`).
- Free drag-move of absolute elements (P2) stays deferred.

### Regressions found

- Intended change: the Display select moved into Auto layout; the old Layout section is gone. Enter on a layers row still selects the child; rename is double-click or F2.
- Found in the merge: `inspector-r4` "auto layout … timing" failed on the merged branch and on its own branch (3 of 3). Cause: the test helper `selectInFrame` waited for any selected box, so a Fill write went to the section from the step before. The overlay box now has `data-selector` and the helper waits for the box of the bridge's select message (`06c4455`).
- Found in the merge: a leading `-4` subtracted, so negative values could not be typed. Now `-N` is a value and `-=N` subtracts (`6807776`).
- Found while testing (ac configs): they keep state in a fixed temp file, so parallel runs stop each other's servers. A private `TMPDIR` per run avoids it (logged as a papercut; not changed).

### Test runs (final, on `7e66bb0`)

- `npx tsc --noEmit -p tsconfig.json`: clean.
- `npx vitest run`: 813 passed (94 new this round).
- `npm run build:ui`: built.
- Playwright `STUDIO_E2E_GROUP=r4 STUDIO_E2E_PORT_OFFSET=3700`: `playwright.config.ts` 113 of 113 (new: `inspector-r4`, `inspector-extras-r4`, `multi-select-r4`, `layers-r4`, `undo-r4`, `inline-text-r4`, `chat-r4`, `edit-latency-r4`); `ac-core` 7 of 7; `ac-edit` 19 of 19; `ac-safety` 10 of 10 (AC-48 passed).
- `npm run e2e:desktop`: 21 of 21.

### Commits

`5f0ad41` restart log fix · `fa3a83e`, `467ec72` desktop Esc test fix · `6e7bce3` shared contracts · `d150d35` shot script · `22cb677`–`b9eae04` undo and redo · `0d4d14f`–`e8c67b3` layers and resize · `2ca527e`–`a0ecf01` inspector fields · `a617c3b`–`4d7a148` batch, breadcrumb, Copy CSS, Other styles · `ca50a08`, `cc00ae0` inline edit · `c640d55`, `c082976` chat Esc fix · `da219cf`–`0bc4715` multi-select · `06c4455`–`6159582` merge fixes · `3d2ab27`, `5035ef7`, `915aa74` polish · `7e66bb0` latency spec · then the docs.

## Round 5 — Speed (2026-10-24)

Method: every number is p50 / p95 in ms on this machine (14 cores). BEFORE is `9d9facc` (end of Round 4), AFTER is the Round 5 head. Load averages are in the result files (`e2e/results/latency.json`, `perf-r5.json`, `desktop-start-*.json`). Specs: `e2e/latency.spec.ts` (20 samples; 12 for Send and edit), `e2e/perf-r5.spec.ts` (12 samples; 6 for the versions panel), `e2e/edit-latency-r4.spec.ts` (7 per edit type), `scripts/perf/desktop-start.ts` (10 launches, fresh temp data each).

### BEFORE / AFTER

| Metric | Target | BEFORE p50 / p95 | AFTER p50 / p95 | Proof |
|---|---|---|---|---|
| Home usable, web, cold browser context | < 800 | 114 / 243 | 94 / 97 (98 / 110 in the full suite at load 10) | `perf-r5` |
| Home JS (entry + preloads), bytes | < 300,000 | 876,422, one chunk | 298,440 | `perf-r5` |
| Open: studio reload to first preview paint | < 1000 (was 2000) | 96 / 97 | 79–95 / 95 | `latency` |
| Open: Home card click to first preview paint | < 1000 | 63 / 64 | 61 / 63 | `perf-r5` |
| HTML write to preview paint | < 150 (was 250) | 56 / 61 | 64–66 p95 | `latency` |
| React write to HMR paint | < 400 (was 750) | 61 / 79 | 72–81 p95 | `latency` |
| Click to selection outline | < 50 (was 100) | 30 / 31 | 29–32 p95 | `latency` |
| Cmd+Enter to user message in chat | < 50 | 30 / 79 | 4 / 5 (`perf-r5`), 14–17 p95 (`latency`) | `latency`, `perf-r5` R5-5 |
| Cmd+Enter to first token, mock agent | < 1500 | 46 / 95 | 47 / 52–116 | `latency` |
| Direct edit: Enter to bytes on disk | < 200 | 6 / 65 (R4 font size) | 15–21 p95 | `latency`, `edit-latency-r4` |
| Versions: GET at 100 versions | < 300 | 27 / 68 | 22–25 / 40–50 | `perf-r5` |
| Versions panel at 100 versions | < 300 | 88 / 143 | 51–85 / 62–97 | `perf-r5` |
| Home grid scroll, 54–90 cards with thumbnails, 3 s | p95 ≤ 16.7, none > 32 | p95 16.8, max 16.8, 0 > 32 | p95 16.7–16.8, max 16.8, 0 > 32, no long task | `perf-r5` |
| Desktop dev: launch to Home composer | < 1500 | 668 / 1612 (first launch)¹ | 674 / 1311 (first launch) | `desktop-start` |
| Desktop packaged: launch to Home composer | < 1500 | 629 / 1255 (warm p95 817)² | 575 / 2664 (first launch after the repack; warm p95 606) | `desktop-start` |
| Desktop packaged: main process start to Home painted (`app.start`) | < 1500 | not measured | 504 / 734 | `desktop-start` |

¹ Old main process with the new UI (global setup had rebuilt `dist/ui`). ² The packaged app from Oct 23, before Round 4. The only desktop change kept this round is instrumentation, so the desktop rows are a baseline, not a gain.

Under synthetic load (12 `yes` processes, load average 24) `latency` still passed: open 109, HTML 69, React 93, select 29, user message 17, first token 53, edit 71 ms p95.

### Bottlenecks found and fixes

- **No startup or first-token numbers.** New telemetry kinds `app.start`, `run.first_token` (server and visible), `edit.commit`, `frame.long`; app samples without a project go to `<data>/telemetry.jsonl` (`GET /api/telemetry?scope=app`). The run details Latency list shows first token and long frames. Desktop main logs boot phases and hands them to the UI.
- **One 876 kB UI chunk parsed on every start.** Studio, the design systems library and New design system are lazy; Home-only parts that are not on screen at first are their own chunks (Advanced settings fields and the design system list load on hover or open; starter gallery, first-run panel, clarifying questions and the card menu start loading when Home's module runs, so they download in parallel but stay out of the gate). Studio also preloads on card hover and focus. Home JS 298,440 bytes, of which React DOM is about 209,000.
- **A failed lazy chunk would unmount the app** (for example a tab left open across a UI rebuild). Screens and Home now sit in an error boundary with a Reload button.
- **Found while measuring the split: React 19 reveals a suspended boundary no sooner than 300 ms after it suspends.** The first lazy version made card click to paint 362 ms (p50) instead of 63. Fix: `screens.tsx` preloads on Home idle, the card click waits for the chunk, and a loaded screen renders without suspending. Back to 61 ms.
- **The user message waited for the send round trip** (p95 79 ms, up to 2 s while a stopped run settles). Optimistic Send adds the message and "Starting" in the same frame as Cmd+Enter.
- **Flash of "Connecting…" and "Loading project…" text** on fast loads. The text now shows only after 300 ms.
- **Desktop phases (packaged, warm):** app ready 80 ms, data folder and git 20 ms, login-shell PATH and Claude lookup about 115 ms before the server spawns, server spawn to ready about 125 ms (200 ms in dev), window to ready-to-show about 135 ms. Tried: create the window while the server starts. It was slower (server ready +120 ms from CPU contention, Home +60–120 ms), so I reverted it.
- Already fast before this round and not changed: HTML and React preview paths, select, first token with the mock, direct edits, versions (the one-git-process fix and the other ranked fixes in `optimizations.md` landed earlier). R5-4 proof: one EventSource per project on every open (`perf-r5`).

### Features and polish

| Item | Check | Proof | Result |
|---|---|---|---|
| R5-1 Measure what matters | Each new kind has a sample after one mock run and one direct edit | `perf-r5` R5-1, `telemetry-routes.test.ts`, `lifecycle.test.ts`, `desktop.spec.ts` | Pass. First token shows "N ms (server N ms)" in Details |
| R5-2 Tighter gates | `latency` passes 3 times in a row | With the new targets: the full suite at load 12, the run at load 24, and the two final full suites (load 17 and below) | Pass |
| R5-3 Smoothness | Pan, zoom, 10k-token stream, Home grid | R2-2, R3-12, `perf-r5` | Pass with a 17.5 ms tolerance for p95 (headless rAF ticks at 16.7–16.8 ms); 0 frames > 32 ms |
| R5-4 Known perf fixes | Gates pass; one EventSource per project | `perf-r5` | Pass (fixes landed before R5) |
| R5-5 Optimistic Send | User message < 50 ms after Cmd+Enter | `latency`, `perf-r5` R5-5 (send held, then failed) | Pass. Failed send removes the row and restores the draft |
| R5-6 Lazy Studio | Home JS < 300 kB; Home usable < 800 ms web | `perf-r5` | Pass (298,440 bytes; 97 ms) |
| R5-7 Versions at 100 | Panel < 300 ms | `perf-r5` | Pass (≤ 97 ms) |
| R1 leftover: Home grid trace | p95 ≤ 16.7, none > 32 | `perf-r5` | p95 16.7–16.8, 0 > 32 (see R5-3) |

Skills: `vercel-react-best-practices` (applied bundle-dynamic-imports, bundle-preload on hover and focus, conditional loading of Advanced fields; no re-render issue found in the pending row, which reuses the memoized entries) and `better-interface` (pending row, boot text, error card, lazy fallbacks: no finding at HIGH or MEDIUM; the error card has `role="alert"` and one way out; the boot text fade is color only and the global reduced-motion rule cuts it; the rename fallback keeps the name so the card does not shift).

Premium-feel pass on the touched screens (chat pending row, boot text, Home): the pending row is the same markup as a starting run (no shift when the real run replaces it); no spinner or text flash under 300 ms; tabular numbers on the timer. Screenshot: `/tmp/polish-r5/after-optimistic-send.png`.

### Gates tightened

`e2e/latency.spec.ts` TARGETS: open 2000 → 1000, html 250 → 150, react 750 → 400, select 100 → 50; new: userMessage 50, firstToken 1500, edit 200. At load 24 every gate keeps at least 1.7× margin; select is the tightest (29 of 50).

### Left for later rounds

- Desktop: the login-shell PATH lookup (about 115 ms) blocks the server spawn. A cached PATH would save it, but a stale PATH can hide a newly installed `claude`; not done.
- First launch after install or repack is 1.2–2.6 s (cold disk cache); not under our control in the app.
- Real-agent first token (target < 3 s p50) is not measured this round (tests use the mock only).
- Home JS has little room: 298,440 of 300,000 bytes. The next Home feature should be a lazy chunk.
- The smooth p95 ≤ 16.7 ms is met only to rAF precision (16.7–16.8 ms); the gates use 17.5 ms.
- Select is about 2 frames (31 ms); going lower needs an overlay drawn outside React.

### Regressions found

- Found while measuring: the React 19 Suspense reveal delay (see above).
- `desktop.spec.ts` checked `studioDesktop` with `toEqual` and failed once `boot` was added; it now checks the boot marks too.
- Infra, not the app: one full run lost Chrome in `edit-latency-r4` resize ("Mach rendezvous failed"); the spec passed alone and in the next full run.

### Test runs (final, on `0094194`)

- `npx tsc --noEmit -p tsconfig.json`: clean.
- `npx vitest run`: 106 files, 819 tests passed (6 new: `telemetry-routes.test.ts`, first-token tests in `lifecycle.test.ts`, `shownPending` in `runState.test.ts`).
- `npm run build:ui`: built.
- Playwright `STUDIO_E2E_GROUP=r5 STUDIO_E2E_PORT_OFFSET=3700`: `playwright.config.ts` 119 of 119 (also 119 of 119 on `d291350` at load 17; new: `perf-r5.spec.ts` 7 tests; `latency.spec.ts` now also gates user message, first token and direct edit); `ac-core` 7 of 7; `ac-edit` 19 of 19; `ac-safety` 10 of 10 (AC-48 passed).
- `npm run e2e:desktop`: 22 of 22 (1 new: app.start with the boot phases).

### Commits

`eaac241` telemetry · `9bd4ca9`, `175ce7f` optimistic Send · `03ee2e2` code split · `7dcdce6`, `ec05cea` perf and latency specs · `f6adbb9` desktop boot marks and start script · `e9c5261` desktop spec · `5ada5cd` boot text delay · `a2045f2`, `d291350`, `c199cd5` docs · `7a30751` card menu chunk and hover preload · `2ca10b6` screen error boundary · `0094194` byte gate · then this log update.

## Round 6 — Design systems and tokens (2026-10-24)

### Features

| Item | Check | Proof | Result |
|---|---|---|---|
| R6-1 Mode preview on canvas | All frames repaint < 100 ms; source unchanged | `design-system-r6` R6-1 (3 frames: Desktop front, Tablet and Mobile passive; `Date.now()` at click vs. each frame's flip mark; work tree bytes and version count compared) | Pass. Slowest frame per click 18–31 ms (4 clicks) |
| R6-2 Component inventory, part 1 | `Button` and `Card` listed with thumbnails; click adds `@Button` | `design-system-r6` R6-2, `inventory.test.ts` (2), `user-message.test.ts` | Pass. Project source only (React components with a source-loc host, HTML named layers and repeated classes) |
| R6-3 Lint in the inspector | `#ff0001` names the nearest token with ΔE; one click writes `var(--token)` | `design-system-r6` R6-3, `tokenLint.test.ts` (5) | Pass. "Off palette. Nearest is --danger, ΔE 18.5"; the file then has `var(--danger)` |

ΔE is OKLab Euclidean distance × 100 (the same distance as Snap). The old "Close to … Snap" note stays for the field you edit; the token checks list covers authored values on the selection.

### Open questions from the design-system build

| Question | Fix | Proof |
|---|---|---|
| Deleted then recreated pack id matched an old backing project | Delete marks backing projects `designSystemDeleted`; Open in editor skips them | `packs-library-routes.test.ts` |
| "Apply to current project" lost after reload | `libraryFrom` persists beside the screen and is checked on load | `design-system-r6` open questions |
| Built-in copy said "Made here" | Copies keep `copiedFrom`; the badge says Copy | `design-system-r6` open questions, `packs-library-routes.test.ts` |
| Replace on a draft published it | Replace keeps the draft flag | `packs-library-routes.test.ts` |
| No grade for "Open in editor" projects | The backing project gets a coverage file from the saved pack (how complete it is) | `packs-library-routes.test.ts` |
| No e2e for Save as new and the problems notice | Added | `design-system-r6` open questions |

### Polish

| Item | Check | Proof | Result |
|---|---|---|---|
| R6-4 `globals.css` import, breakpoint type | 10 custom properties give 10 tokens of the right types | `extract.test.ts` "globals.css with 10 custom properties" | Pass. Unmapped vars stay as extra tokens; `breakpoint` is a core group (dimension) |
| R6-5 Light and dark swatches on pack cards | Every built-in card shows both | `design-system-r6` R6-5 (every card: two rows, same y, touching) | Pass. Dark swatches come from the server; drawn only in the `DesignSystems` chunk |
| R6-6 DESIGN.md editor | Close with changes asks to save | `design-system-r6` R6-6, `designMdOutline.test.ts` | Pass. Close, Cancel, Esc and backdrop all ask |

Skill passes on the touched screens (`impeccable`, `make-interfaces-feel-better`, `emil-design-eng`, `better-interface`, `better-colors`), changes made:
- Token checks: show 3, then "Show N more"; padding and margin rows name the sides ("Padding top and bottom"); hints wrap instead of cutting off.
- Components tab: card hover only on fine pointers; press scale 0.96; thumbnail outline is neutral black at 10%; the error has "Try again"; the tooltip names the file.
- Pack cards: the dark swatch panel uses a new `--surface-inverse` token, not a literal color.
- DESIGN.md preview: heading sizes and spacing on the type scale; HTML comments do not show.
- The dark switch flips with no animation (it is a mode preview, used often).

Screenshots: `/tmp/polish-r6/before-*.png` and `after-*.png` (studio, canvas toolbar, tokens panel, canvas dark, components panel, inspector, DESIGN.md, DESIGN.md guard, library, pack detail).

### Bundle

Home JS 298,888 bytes in 1 file (gate < 300,000; Round 5 was 298,440, so +448). The new UI loads in the Studio chunks (`Studio` 268,976, `StudioParts` 96,346) and `DesignSystems` (17,127).

### Left for later rounds

- R6-2: kit-page parts are not in the Components tab; instance editing (change `Button` once, every use and the thumbnail update) is not done.
- Light/dark only; no extra theme axes.
- The token checks list appears when the authored CSS arrives, a moment after selection, and moves the inspector down once. A fixed slot would stop the shift.

### Regressions found

- The Components tab used the `.ins-scroll` class, so tests that scroll the inspector matched two elements (`direct-edit`, `inspector-r4`). It has its own scroll class now.
- `token-snap` clicked the text color picker while the token checks list was still coming in, and the click missed. The test now waits for the list.
- `versions-panel` lists the tabs; it now includes Components (intended).
- Found by `latency`: direct edit p95 went from 22 ms to about 300 ms with the Components tab. The hidden tab stayed mounted and rendered every thumbnail in the headless browser after each file change. Thumbnails now load only while the tab is open: 18 ms. A/B on the Round 5 head and a bisect (`8bd418b` 21 ms, `85d8438` 304 ms) found it.
- Load-sensitive, passed on rerun: `home-r1` R1-3 (2,217 ms vs 2,000) and `edit-latency-r4` undo, in full runs at load average 11–19 (other apps on the machine).

### Test runs (final, on `6cade27`)

- `npx tsc --noEmit -p tsconfig.json`: clean.
- `npx vitest run`: 109 files, 832 tests passed (13 new: `tokenLint.test.ts` 5, `inventory.test.ts` 2, `designMdOutline.test.ts` 1, `extract.test.ts`, `packs-library-routes.test.ts`, `user-message.test.ts`).
- `npm run build:ui`: built.
- Playwright `STUDIO_E2E_GROUP=r6 STUDIO_E2E_PORT_OFFSET=3700`: `playwright.config.ts` 125 of 125 (new: `design-system-r6.spec.ts` 6 tests, also 18 of 18 with `--repeat-each 3`); `ac-core` 7 of 7; `ac-edit` 19 of 19; `ac-safety` 10 of 10 (AC-48 passed). Latency p95 in the last full run: edit 15 ms, select 31 ms, html 102 ms.
- `npm run e2e:desktop`: not run; `desktop/` did not change.

### Commits

`70bdf58` canvas dark switch · `8bd418b` token checks · `85d8438` Components tab · `d5dc878`, `6809d4e` open questions · `fe5aa59` pack card swatches · `89ec0fc` DESIGN.md editor · `7dd52eb` CSS import and breakpoint · `48bc393` polish · `878347e` docs · `8a763cd` scroll class and test fixes · `c439457` thumbnails only while the tab is open · `6cade27` R6 spec fixes · then this log update.

## Round 7 — Versions, variations, comments (2026-10-24)

Five sub agents built the work in parallel, each in its own worktree with its own e2e port offset. Their commits were cherry-picked onto `feat/polish-rounds` with no conflicts. The worktrees and branches are removed.

### Features

| Item | Check | Proof | Result |
|---|---|---|---|
| R7-1 Version thumbnails and names | Each row shows a thumbnail; a new name is there after reload | `versions-r7` R7-1, `version-routes.test.ts` (7) | Pass. Thumbs render from the version snapshot on the first GET (one shot queue) and are cached as `thumbs/v-<vid>.png`. The panel fetches only rows in view while it is open, 2 at a time; a closed panel made 0 requests after a file write and a new version. Double-click or F2 renames; names in `version-names.json` |
| R7-2 Compare slider and diff overlay | The overlay marks a changed button and nothing else | `versions-r7` R7-2 | Pass. 3 buttons, only `#b2` changes color; every changed mask pixel is inside `#b2` (±2 px). Modes: Side by side, Slider (keyboard, 28 px handle), Overlay (red mask, opacity, "x% changed") |
| R7-3 Variations as frames | 3 variation frames; "Keep this one" removes the other 2 | `canvas-r7` R7-3, `variations.spec.ts` (HTML and React) | Pass. `VariationsGrid` removed. A click on a passive frame makes it live and its direction current (R2 leftover). Swap gate per frame: max 6 iframes for 5 frames. Directions are never deleted |
| R7-4 Rewind per message, edit as fork | Restore at message 2 of 4 equals version 2; the edit makes a new direction and the old one stays | `run-rewind.test.ts`, `chat-r7` R7-4 (2) | Pass. The restore commit tree id equals version 2's tree id. Fork base: the version before that run (its parent), as in Claude Code. The button says "Edit and rerun": "Edit and resend" contains "send", and Playwright name matching then broke 5 tests that click Send |
| R7-5 Freehand draw | A stroke plus a comment sends one attachment that shows the stroke | `comments-r7` Draw, `comments-routes.test.ts` (4), `drawing.test.ts` | Pass. `sent[0].imageCount` is 1; the PNG is red at the stroke point and transparent in the corner, at frame size. Pen tool key P, 4 colors, Undo stroke, Clear. Transparent strokes, not a screenshot (a screenshot needs headless Chrome, seconds) |
| R7-6 Replies, resolve, Show resolved | A reply shows under its comment; the filter hides and shows resolved | `comments-r7` replies test | Pass. Old comment files still load. Show resolved is off by default |
| R7-7 Run search and rename | Search finds a run by a word; a rename is there after reload | `chat-r7` R7-7, `run-rewind.test.ts` | Pass. In the chat panel (there is no separate run history list) |

Leftovers from earlier rounds, also done:

| Item | Proof | Result |
|---|---|---|
| Duplicate copies extra directions and comments (R1) | `home-routes.test.ts` duplicate test | Pass. Each direction at its own head, same ids, its comments |
| Trash list screen (R1) | `home-r7` trash test, `home-routes.test.ts` | Pass. Lazy `HomeTrash` chunk, no request until it opens. Delete forever removes only the data-dir folder; the work tree stays |
| Page per frame (R2) | `canvas-r7` page per frame | Pass. Relative paths only, HTML lists `.html` files |
| Resize handles on frames (R2) | `canvas-r7` frame resize | Pass. W × H while dragging, Shift keeps ratio, min 240 |

### Polish

- Thumbnails: same-size placeholder (no layout shift), 160 ms fade, 1 px outline, 0.96 press scale.
- Frame chips: Keep and the page chip show on hover or on the live frame; 28 px controls; tabular numbers.
- Toolbar W and H inputs now follow the viewport when it changes elsewhere (before, a blur could set the old size back).
- Chat: message actions show on hover and keyboard focus; the search bar floats over the chat so nothing moves; the restore confirm names the files restore replaces.
- Comments: Resolve and Reopen buttons in the panel; pen icon on drawing pins; reduced-motion rules.
- Trash: empty state, error with Retry, focus moves to the next row after an action, a screen-reader status line.

### Bundle and latency

- Home JS 299,247 bytes (gate 300,000; Round 6 was 298,888, so +359). Trash UI is its own chunk. `Studio` 272,760, `StudioParts` 132,630.
- Latency p95 in the integrated full run (load 8–15): edit 49 ms, select 31 ms, html 65 ms, React 75 ms, open 112 ms, first token 53 ms. Per branch (load average 10–55): edit 23–76 ms, select 30–31 ms, html 66–118 ms. Html missed the 150 ms gate twice at high load, and the untouched base missed it too (199 ms).

### Screenshots

Before in `/tmp/polish-r7/before/` (13), after in `/tmp/polish-r7/after/` (28): `versions-*`, `canvas-*`, `chat-*`, `comments-*`, `home-*`. Some after shots of the Versions panel were taken while thumbnails were still loading.

### Left for later rounds

- Compare as frames (R7-3 title): compare still opens `CompareView`, not frames on the canvas.
- Chat: a failed run start after "Edit and rerun" leaves an empty direction; a failed send loses the edited text.
- Comments: replies can be added only from the popover; strokes keep the old frame size after a viewport change.
- Overlay diff covers the first screen only; React version thumbs start a Vite server per snapshot (no test).
- The page chip is only on frame labels, so a single frame has none.
- Home card thumbnail (old bug): the head shot uses the live work tree after a delay, so a card can show a later state than its version.
- Port 8021 (preview port of e2e offset 3750) is held by launchd on this machine; use another offset.

### Regressions found

- Integrated full run, 2 of 137 failed in `edit-latency-r4`:
  - "resize handle drag": the card width stayed at 224 px after a 4 px drag on the east handle (wanted 228). Not seen on any branch run; not diagnosed. Possible cause: the Round 7 canvas or comment layer changes on the pointer path. This needs a check first in Round 8.
  - "Alt+Down and Alt+Up move": move visible p95 315 ms against 200. This is the same load-sensitive kind as the Round 6 undo miss, but it was not rerun.
- After that run, the rules changed: no new tests and no test runs. So there was no rerun, and `ac-core`, `ac-edit`, `ac-safety` were not run on the integrated head. `desktop/` did not change.

### Test runs (final, on `cdca5c9`)

- `npx tsc --noEmit -p tsconfig.json`: clean.
- `npx vitest run`: 114 files, 868 tests passed (36 new).
- `npm run build:ui`: built.
- Playwright `STUDIO_E2E_GROUP=r7 STUDIO_E2E_PORT_OFFSET=3700`, `playwright.config.ts`: 135 of 137 passed (2 failures above). New specs `versions-r7`, `canvas-r7`, `chat-r7`, `comments-r7`, `home-r7` passed.
- `ac-core`, `ac-edit`, `ac-safety`: not run on the integrated head (rule change). Each branch ran its own area; the chat branch ran all three (7, 19, 10 of 10; AC-48 passed on rerun).

### Commits

`6b0b49d`…`c23800b` duplicate and trash · `5cae5ba`, `1d4eb10` comments, drawing, replies · `0855251`…`117197d` rewind and run titles · `f1cb1cb`…`fc00219` version thumbs, names, compare · `7f1ba1e`, `fd53a9e`, `cdca5c9` variation frames, page per frame, resize · then the docs commit.
