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
- Thumbnails: on each `version.created` of kind init, run, undo, restore or keep on the main direction, one worker shoots the first 1280×800 viewport of the head and stores a 640×400 PNG in `projects/<pid>/thumbs/` (outside the work tree). Only the newest file is kept. `updatedAt` does not change. The UI loads the image with the token and keeps it by project and version. Home polls the list every 1 s while a thumbnail is behind the head or a project changed in the last 2 min.

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
- One AC-14 failure in the first `ac-core` run ("Not found" in the preview). It passed in the rerun and in 4 repeats. The likely cause: I rebuilt `dist/ui` while that suite ran. Not reproduced.

### Test runs (final)

- `npx tsc --noEmit -p tsconfig.json`: clean.
- `npx vitest run`: 80 files, 678 tests passed.
- `npm run build:ui`: built.
- Playwright with `STUDIO_E2E_GROUP=r1 STUDIO_E2E_PORT_OFFSET=3700`: `playwright.config.ts` 65 passed (7 new in `home-r1.spec.ts`), `ac-core` 7, `ac-edit` 19, `ac-safety` 10.
- `npm run e2e:desktop`: 19 passed.
