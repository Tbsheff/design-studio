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
- Open, desktop Esc: the new `desktop-native.spec.ts` R3-2 test (Esc with focus in the composer and in the preview, on a fresh folder project) passed in 8 of 9 desktop runs. In 1 run, Esc with focus in the composer did not stop the run (focus was in the composer, no overlay open). With a probe that logs key delivery and the cancel request it passed 4 of 4. Not explained; the probe stays in the test so the next failure shows where the key goes. The preview case needs a fresh project, because after several frame reloads Playwright reads the Electron preview frame as an empty page.
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
