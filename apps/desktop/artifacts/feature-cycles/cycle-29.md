# Feature cycle 29: next 5 features

Date: 2026-11-14. Main at `7e8cda099` (all 5 cycle-28 picks merged at `7059b67e8`).

## Method

- Read `cycle-28.md` (picks, runners-up, Results "Open"), the 5 `cycle-28/*.md` reports ("Left out"), `real-runs/report{,-2,-3}.md`, the runners-up and Results "Open" lines of cycles 18 to 27 (13 to 17 through their carried-over runners-up), the tail of `.claude/goal/feature-log.md`, `git log --oneline -120` and `git branch -a`.
- Read the route-apply real-run logs in `ds-wt` (`ra-real-run.json`, `ra-real-run2.json`) and the port score code (`review/port-check/*`, `preview/visual-diff.ts`, `agent/port-review.ts`, `agent/port-route-update.ts`).
- No app was run for this research. Each pick checks its own "today" behaviour in the running app before it changes code.

### Why route-apply scored 48 and 77

The port score is a picture compare. `diffPictures` (`preview/visual-diff.ts`) blends content (20%) and Sobel edge match (80%) between a 1280 x 1600 shot of the prototype and a shot of the app route (`review/port-check/port-shots.ts`). New-route ports score 84 to 97 (cycle 26, cycle 27). Route updates score lower for 5 causes. Causes 1 to 4 are in the run logs; cause 5 follows from the code.

1. **Kept app content counts as a miss.** The route changed after the copy ("Ward list for today."). The run kept it, as the rule says. The prototype does not have it, so the top-left area stays under 80. Run 1: 48 before and 48 after the fix loop. The agent said so in its own text.
2. **The fix loop is blind.** `toFixPrompt` (`port-review.ts`) says "checked the new route" and gives only area names ("top left 48"). It does not say which elements differ or which differences are expected. In run 1 the agent added margins by guess and did not check again.
3. **The route-folder components are not in the prompt.** The `<route-update>` tag holds only `page.jsx`. Run 1 did not restyle `patient-list.jsx`. Commit `da86c2e4c` added a rule line, but not the file text, so run 2 had to find and read it.
4. **The prompt does not name the app style stack.** The rule says "Map them to the app tokens and kit". The fake app has no Tailwind, so the run-1 token classes did nothing. Run 2 found this and changed to inline styles.
5. **Data rows differ by design.** The prototype shows sample rows (Ana Diaz, Ben Ito). The app route renders its own data. On Bonaparte, with a real database, every row text differs, so the edge score falls on correct work.

Pick 1 fixes all 5. It measures the fix first without a model: the saved run-2 output (`cycle-28/route-apply/real-run-2-*.jsx`) scores 77 on main, and it must score 85 or more on the branch with no change to the app files.

### Other findings

- **Figma gap.** Built, so dropped: copy and paste style (`features/layer-style`), select matching, find and replace text, Alt measure (`canvas/measurements.tsx`), Shift resize ratio, bold and italic keys in text edit, the axis lock. Open: number keys for opacity (bare digits are free: `ALT_APP_KEYS` uses Alt+digit, zoom uses Shift and Mod+digit) and the type keys (font size, letter spacing, line height). Pick 4. Bundled: the Rotate zone and the Rotation field write only the base style (runner-up in cycles 25 to 28).
- **AI quality.** Image search is off by default (`STUDIO_IMAGE_SEARCH`, `share/image-search/gate.ts`). Then the prompt asks for a gray `data-photo` box (`agent/photo-search.ts` `PHOTO_OFF_RULE`). In the cycle-28 real bakery run (`cycle-28/starter-fonts/real-branch-bakery-page-light.png`), one flat box fills the right half of the hero, about 25% of the first screen. The fonts are now good, so this box is the largest defect in a default first draft. Pick 2.
- **Bonaparte path, second item.** The prototype kit check is a runner-up in cycles 26, 27 and 28. `list_kit_drift` scans only app source. A prototype beside an app can hand-style buttons and inputs, and Move to app then lists "No kit match". Pick 3.
- **Small open items** (pick 5): a Look pick does not change the font names in `pack.json` (cycle-28 Results); "Make a data fixture" writes a new fixture page on each click; a fixture copy takes 2 undo steps back to the empty copy; a `get_run` cursor call still sends about 50 KB (`sent`, `decisions`); the HTTP abort of a `get_run` wait is not checked; `import_source_page` on a fixture copy is not checked (route-apply "Left out").
- **Not picked:** frame fit to content (needs a decision on `100vh` sections), the closed MCP request in a `get_run` wait (needs `mcp/registry.ts`, a hand aggregator), editable `data-[side=*]` states (adds an MCP snapshot diff, which waits for the user).
- **Competitor recheck (2 web searches, 2026-11-14).** No Claude Design, Figma Make, v0, Lovable, Bolt, open design or doop item newer than the cycle-28 recheck. New: Canva Brush (2026-10-29), a vision-language model that looks at the live canvas and refines its output; this supports the studio-side visual checks in picks 1 and 3. Figma "Intelligent Canvas" (July 2026) puts agents on the canvas. Reviews still credit Claude Design with the design system read from code.
- **Branch check.** No `feat/route-fidelity`, `feat/photo-art`, `feat/figma-keys`, `feat/kit-check` or `feat/polish-29`. Near names that exist and are not used: `feat/route-apply`, `feat/route-sync`, `feat/kit-drift`, `feat/photo-fill`, `feat/polish-28`.
- **Skipped as the user's decision:** the panel rail, the Home cuts, the MCP snapshot refresh. No pick adds an MCP snapshot diff: `inspect_port`, `apply_image_search`, `list_kit_drift` and `get_run` are in no snapshot file.
- `.claude/goal/roadmap.md` is untracked, so worktrees do not get it. Each pick adds its globs to Appendix A only if the file is in its worktree, and says so in its report (L6e).

## Ranking

Score = value x fit with "simple and fast" / effort (1 to 5 each). Rank by value first.

| Rank | Key | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|---|
| 1 | route-fidelity | Route update port score compares like with like; the fix loop names the elements; the prompt has the route-folder files and the style stack (Bonaparte) | 5 | 5 | 4 | 6.3 |
| 2 | photo-art | Photo slots get a designed art panel from the page tokens in place of a gray box (AI quality) | 4 | 5 | 2 | 10 |
| 3 | kit-check | The studio check flags hand-styled controls in a prototype beside an app and maps them to the kit (Bonaparte) | 4 | 5 | 3 | 6.7 |
| 4 | figma-keys | Number keys set opacity, type keys step size, spacing and line height; rotate writes the picked breakpoint or state (Figma) | 3 | 5 | 2 | 7.5 |
| 5 | polish-29 | Look font names, one fixture per route, one undo step, smaller `get_run` cursor calls, 2 unchecked paths | 3 | 5 | 2 | 7.5 |

No pick adds an always-visible control:
- Pick 1 changes the port check and the port prompt.
- Pick 2 changes what fills a photo slot.
- Pick 3 adds lines to the existing studio check note.
- Pick 4 adds keys (shown only in the shortcut sheet and Cmd+K).
- Pick 5 fixes existing paths.

---

## 1. route-fidelity: the route update port check compares like with like (Bonaparte)

**Why.** Move to app onto an existing route (cycle 28) keeps the data reads, but its port score is 48 or 77 where a new route gets 84 to 97. The causes are above. A low score on correct work is noise: the fix loop chases it, and the user cannot trust the note. On Bonaparte every route update would hit causes 1, 3 and 5.

**Behaviour.**
- **Like-for-like shots.** When the port check runs on a route update (the prototype is a route copy of that route; the record is `.studio/route-source.json`):
  - `app-change`: the app elements whose text is on an added line of the `<route-file-diff>` (the kept app change) get `display: none` in the app page before its shot. A flat mask is not enough: the kept paragraph adds height, so every edge under it moves and still misses within `EDGE_TOLERANCE`. Collapse brings the content below back in line.
  - `data-row`: the cell text boxes of repeated data rows (`tbody tr`, repeated `li` or `[role=row]` siblings) are masked on both shots, so the row height, padding, borders and fills still score. When the row counts differ, the pick hides the extra rows on the longer page before the shot, and the note says so.
  - `PortReads` today is only `screenshot` (`port-check-query.ts`), which cannot hide elements or read boxes. The pick adds a probe step (hide by selector, read the cell rects) through the preview service. This is the main extra effort.
  - Reuse `maskRect` and `ProbeRect` in `preview/visual-diff.ts` (used by `diffImages`): export them and add one re-export in `preview/picture-diff/index.ts`. Do not grow the 840-line file.
  - A new route (not an update) gets no masks and no hidden elements. Its score does not change.
- **Gate.** The no-model replay (below) must reach 80 or more with no area under 80. If it does not, the pick reports which cause remains and does not ship masks that do not move the score.
- **Output.** `PortMatchSchema` adds `masked`: a list of `{ reason: "app-change" | "data-row", text }` (text cut to 60 chars, list max 20). The score is the masked score.
- **Fix loop.** For a route update, `toFixPrompt` says "the updated route". It lists the masked items as expected ("Kept app text, not scored: Ward list for today."). For each low area it names up to 3 app elements in that area with selector and text, from the same element probe. The prompt keeps "Do not call inspect_port".
- **Prompt (`<route-update>` tag).**
  - Add the text of each file that the route file imports from its own folder (cap 3 files and the existing `ROUTE_TEXT_MAX`).
  - Add one style-stack line read from the app: Tailwind and its major version from `package.json`, CSS modules, a global CSS file, or none. For none: "This app has no Tailwind. Style with what the route uses now."
- **Note.** "Updated app/patients/page.jsx and patient-list.jsx (kept 2 data reads)." The count covers the route-folder files too (route-apply "Left out").

**Agent loop.** No new tool. The run agent sees the new tag lines and the better fix prompt. The agent's own `inspect_port` call gets the masks and `masked` too.

**Headless.** No new action. `port.inspect` (`inspect_port`, in no snapshot file): output gains `masked`; the description adds one sentence: "For a route update, the studio masks the kept app text and the data row text on both pages, and lists them in masked." Run `pnpm exec tsx scripts/gen-routes.ts`. The in-app agent uses the same `inspect_port` (agent `set: "app"`).

**Main files.**
- New `server/review/port-check/port-masks.ts` (the probe: hide the app-change elements, read the data cell rects on both pages).
- `server/preview/visual-diff.ts` (`export` on `maskRect` only, no growth) and `server/preview/picture-diff/index.ts` (one re-export); the probe call through `server/preview` that the agent finds.
- `server/review/port-check/{port-match-read.ts,port-shots.ts,port-check-query.ts}`; `server/review/port-check/index.ts` only if a new export is needed.
- `server/agent/port-review.ts` (fix prompt), `server/agent/port-review-read.ts` (read `masked`), `server/agent/port-route-update.ts` (route-folder files, style-stack line, note count; 318 lines).
- `packages/common/actions/src/port/{inspect.ts,schema.ts}` (description, `masked`).
- `server/handlers/port/inspect.ts` (pass the route source record), `server/handlers/port/live.ts` only if it must provide `RouteSourceStore` to `port.inspect`.
- No `copy.ts`.

**Verify in the running app** (`STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev`).
- Make a fake Next 16 app under `/Volumes/DevProjects/code/ds-wt/rf-next`, as in route-apply: `app/patients/page.jsx` awaits `prefetchPatients()` from `lib/server.js`, `dynamic = "force-dynamic"`, and a client `PatientList` in the route folder. No Tailwind. Make a second copy `rf-next-tw` with Tailwind 4. Never Bonaparte.
- **Replay, no model (the main measure).** Copy `/patients`, make the fixture, then put `cycle-28/route-apply/real-run-2-page.jsx` and `real-run-2-patient-list.jsx` into the app as the updated route, and add the "Ward list for today." change. Call `inspect_port` on main and on the branch. Report both scores. Expect 77 on main and 80 or more (target 85) with no area under 80 on the branch. `masked` lists the kept line and the data cells.
- **Masks do not hide a real fault.** Remove the table border and the heading font size in the app route: the branch score falls under 80, and the fix prompt names the table and the `h1`.
- **New route.** A plain prototype ported to `/new-list`: the same score on main and on the branch, `masked: []`.
- **Mock run.** Move to app of the fixture copy onto `/patients`: the run log prompt has the `patient-list.jsx` text and the style-stack line. The note names both files.
- `pnpm exec tsx scripts/call-action.ts port.inspect '<json>'` on the route update: 3 surfaces match.
- **Real model, 2 short runs** (local Claude Code sign-in, Sonnet), each a Move to app of the fixture copy onto `/patients` with the app change: one in `rf-next`, one in `rf-next-tw`. Report the first studio check score (48 in route-apply run 1), the score after the fix loop, whether a fix loop ran, `patient-list.jsx` changed in the first pass (yes/no), data reads kept (grep), sample rows in `app/` (expect 0), seconds and cost.
- Bonaparte, read only: `get_port_plan` for a route copy is not possible without its database; skip it and say so. `git status --short` in Bonaparte is the same before and after.
- Dark and light screenshots of the run note and of the port diff sheet with the masks.

---

## 2. photo-art: photo slots get a designed art panel (AI quality)

**Why.** Image search is off by default. Then each photo slot in a first draft is a flat gray or beige box. In the cycle-28 real bakery run one box fills about 25% of the first screen. Claude Design and v0 first drafts do not show empty boxes. The page already has its tokens (`tokens.css` from the starter look), so the studio can paint a panel in the brand colors with no network and no model call.

**Behaviour.**
- New pure engine `share/image-search/engine/to-photo-art.ts` (W8a: no I/O, no Effect). Input: the slot words, the slot aspect, and up to 4 token colors (primary, accent, surface, ink). Output: an SVG string: a soft gradient, 3 to 6 shapes placed from a seed of the words, and a light grain (`feTurbulence`). The same words give the same art. The studio writes it as `assets/photo-art-<hash>.svg` (as image search writes its photos), not as an inline data URI: 6 inline slots would add about 24 KB to `index.html`, which the agent reads again on each later turn (report bug 8).
- Scope: `.html` pages. JSX and TSX slots stay a runner-up (cycle-27 runner-up 6).
- After the first draft of a prototype run, when image search is off, the studio fills each plain `data-photo` slot (no `src`, no background image) with art. It keeps `data-photo` and the label as `aria-label` with `role="img"`, and adds `data-photo-art`. One version "Photo art", one undo step. No model turn.
- With image search on, a missed slot gets art in place of the gray box (`photo-fill.ts` gray-box path).
- A later `apply_image_search` with search on treats `data-photo-art` slots as open slots and replaces them with photos.
- Dark mode: the art reads the token colors at fill time; a later theme change does not repaint it (state this limit in the report, or repaint on `theme.apply` if it costs less than 30 lines).
- `PHOTO_OFF_RULE` changes "write a gray box" to "write a `data-photo` slot with a short label; the studio paints it". `photo-note.ts` says "Photo slots show art from your colors. Turn on image search for real photos."
- **Bundled (photo-fill "Left out"):**
  - `isMarkedMiss` compares raw words, so a query with `"` (written as `&quot;`) is searched on every call. Compare decoded words.
  - `apply_image_search` gets an optional `slots` input (list of slot words, default null through `Schema.withDecodingDefault`) that reopens marked missed slots it names.

**Headless.**
- `image-search.apply` (`apply_image_search`, in no snapshot file): with search off it no longer fails. It fills art and returns `note: "Image search is off. The studio painted N art slots."` With search on it works as today, plus `slots`. Description: 2 sentences change. Run gen-routes.
- The in-app agent gets the tool only with search on (as today); in off mode the studio step does the fill, so the agent needs nothing.

**Main files.**
- New `server/share/image-search/engine/to-photo-art.ts` and `engine/index.ts`; new `server/share/image-search/photo-art.ts` (find the plain slots, read the tokens, write once).
- `server/share/image-search/{photo-fill.ts (427 lines),photo-slots.ts,image-search-run.ts,gate.ts}`.
- `server/agent/{photo-search.ts,photo-note.ts}`; the post-draft hook where the photo step runs (`agent/run-level.ts` `PHOTO_STEP` area, or the hook the agent finds). Not `sdk-driver.ts` (1625 lines) unless the hook is only there; then net 0 lines.
- `packages/common/actions/src/image-search/{apply.ts,schema.ts}`.
- `server/agent/mock.ts` (the mock page writes one `data-photo` slot).
- No `copy.ts` (the photo note text is server text).

**Verify in the running app.**
- Mock, search off, blank HTML "bakery landing page": the slot has `data-photo-art`, `role="img"` and its label; no flat box. One Cmd+Z returns the plain slot. Dark and light preview.
- Turn on image search in the image sheet, call `apply_image_search`: the art slots get photos.
- `apply_image_search` with search off over MCP: success with the note, not the old error.
- A slot with a quoted query that missed: a second call makes no Openverse request; a call with `slots: ["<those words>"]` searches it again.
- `call-action.ts image-search.apply '<json>'`: HTTP and MCP match (agent tool off in off mode; say so).
- **Real model, 2 short runs** ("bakery landing page", search off), main and branch. Measure with a pixel scan script in `ds-wt`: the share of the first 1280 x 900 screen covered by flat single-color boxes of 150 x 150 px or more (expect about 25% on main, under 3% on the branch). Also report `review_frame` findings, first-draft time (unchanged), seconds and cost. Dark and light screenshots of both pages.

---

## 3. kit-check: flag hand-styled controls in a prototype beside an app (Bonaparte)

**Why.** A prototype beside Bonaparte should use the Bonaparte kit, so Move to app maps each control to a component. Today the studio checks kit use only in app source (`list_kit_drift`). A prototype can hand-style 6 buttons and 2 inputs, and the problem shows only at Move to app ("No kit match"), when the fix costs more. Repeated runner-up in cycles 26, 27 and 28.

**Behaviour.**
- The studio prototype check (`agent/prototype-review.ts`, cycle 25) adds kit findings when the prototype has an app source (its pack or route copy record names an app with component recipes from `design-system/engine/to-component-recipes.ts`).
- A finding: a `button`, `input`, `select`, `textarea`, link styled as a button, or a card block whose classes do not contain the base classes of the matching kit recipe. Text: "3 buttons are hand-styled. Use the Button recipe: `<base classes>` (variant default)."
- The link from a prototype to its app is `project.appProjectId` (set in `project-ops/project-ops-prototype.ts` and `handlers/project/create-prototype.ts`). The recipes come from that app's pack.
- The findings join the existing prototype fix loop. No extra loop and no extra turn when the check runs anyway. When only kit findings exist, one fix loop runs, as for review gaps.
- Note line: "Studio check: 3 controls did not use the app kit; a fix loop ran; after it 0."
- A prototype with no app source: no change.

**Headless.**
- `kit-drift.list` (`list_kit_drift`, in no snapshot file): when `projectId` is an HTML prototype with an app source, it scans the prototype page (the `page` input) against that app's recipes. Same output fields; `file` is the prototype file. One description sentence. Run gen-routes.
- `kit-drift.apply` on prototype finds is out of scope; the fix loop or `edit_element` writes the classes. Say so in the description.
- The in-app agent already has `list_kit_drift` if its set includes it; the agent checks and reports.

**Main files.**
- New `server/components/kit-drift/engine/to-markup-drift.ts` (pure HTML scan with the existing `to-class-plan.ts` logic) and `engine/index.ts`.
- `server/components/kit-drift/{kit-drift-list.ts,source-files.ts}` (prototype mode).
- New `server/agent/prototype-kit-review.ts`; `server/agent/prototype-review.ts` (118 lines). `agent/final-check.ts` (565 lines) may not grow: put new text in the new file.
- `packages/common/actions/src/kit-drift/list.ts` (description); `server/handlers/kit-drift/list.ts`.
- `server/agent/run-notes.ts` only if the note line needs a new join (see shared files).
- No `copy.ts`.

**Verify in the running app.**
- Fake Next 16 app `ds-wt/kc-next` with Tailwind 4 and shadcn-style `components/ui/{button,input,card}.tsx` (cva recipes). Attach it, extract its pack, make an HTML prototype beside it.
- Mock: seed a prototype page with 3 hand-styled buttons and 1 input as a file (do not edit `agent/mock.ts`, which pick 2 owns): the studio check lists 4 finds with the recipe names; the fix loop prompt has the base classes.
- `call-action.ts kit-drift.list '<json>'` on the prototype page: 3 surfaces match. On an app page: the same result as main.
- A plain HTML prototype (no app): no kit lines.
- **Real model, 2 short runs** ("patients list with a search field, filters and an add button", beside `kc-next`), main and branch. Report hand-styled controls at the end (from `list_kit_drift` on the branch build for both pages), the "No kit match" count in `get_port_plan` (read only, no port run), the fix loop time, seconds and cost.
- Bonaparte, read only: `list_kit_drift` with `page` on one `apps/dashboard` file gives the same result as main. `git status --short` is the same before and after.
- Dark and light screenshots of the chat note.

---

## 4. figma-keys: number keys for opacity, type keys, rotate on the picked state (Figma)

**Why.** Figma users set opacity with number keys and step type with keys, without a look at the inspector. The studio has the fields but no keys. The Rotate zone and the Rotation field write only the base style, while every other field writes the picked breakpoint or state (rotate-handle "Left out", runner-up 4 times).

**UI behaviour.**
- With 1 or more layers selected and the canvas focused (not in a text field or text edit):
  - `1` to `9` set opacity 10% to 90%; `0` sets 100%. Two digits within 400 ms set the exact value (`4` `5` = 45%; `0` `0` = 0%). One undo step per sequence.
  - `Mod+Shift+.` and `Mod+Shift+,`: font size up and down by 1 px. On Tailwind, a value on the theme scale steps to the next scale class (`text-sm` to `text-base`); else an arbitrary value.
  - `Alt+.` and `Alt+,`: letter spacing up and down by 0.01 em. `Alt+Shift+.` and `Alt+Shift+,`: line height up and down by 1 px (or the next `leading-*` step).
- Each key writes through the same path as the matching inspector field, so it writes the picked breakpoint and state.
- No new control. The keys show in the shortcut sheet (`shared/keymap.ts`) and as Cmd+K commands.
- Match the type keys on `event.code` (`Period`, `Comma`): on macOS `Alt+.` gives `event.key` "≥".
- Check that `Mod+Shift+.` does not fire `stop` (`Mod+.`) and that bare digits do not fire in Play, comment mode or the Home grid.
- **Bundled:** the Rotate zone (`use-rotate-drag.ts`) and the Rotation field (`use-rotation.ts`) write the picked breakpoint or state, as the Opacity field does. This research did not prove the gap in code (only the rotate-handle "Left out" line). Check it in the app first; drop the item if `md` + rotate already writes `md:rotate-*`.

**Headless.** No new action and no description change. MCP and the agent already set these values with `edit_element` and `set_state_style`.

**Main files.**
- New `shared/edit-keys.ts` (chord to edit, like `shared/flip.ts`).
- `bridge/zoom-forward.ts` (forward the chords from the frame, 130 lines).
- `shared/keymap.ts` (471 lines; stay at 500 or less).
- New `ui/features/inspector/{use-edit-keys.ts,edit-keys-model.ts}`; `ui/features/inspector/opacity-field-model.ts`; the font size, letter spacing and line height write models the agent finds in `features/inspector` or `features/text-styles`; `ui/features/inspector/copy.ts` (command titles).
- `ui/features/inspector/use-rotation.ts`, `ui/features/canvas/use-rotate-drag.ts` (440 lines).
- Mount the hook where `useFlipKeys` is mounted.

**Verify in the running app.**
- Tailwind 4 project and CSS project. Select a card: `5` gives `opacity-50`; `4` `5` quickly gives 45%; `0` removes the opacity. One Cmd+Z per sequence.
- Pick `md` and Hover, press `7`: the class is `md:hover:opacity-70`.
- A heading at `text-sm`: `Mod+Shift+.` gives `text-base`. `Alt+.` and `Alt+Shift+.` change tracking and leading. In the CSS project the rule values change.
- Type `5` in the chat box and in a text edit: no opacity change. `Mod+.` still stops a run.
- Rotate zone with `md` picked: `md:rotate-12`, the base keeps no rotate. The Rotation field the same.
- No real-model run. Dark and light screenshots of the shortcut sheet rows and of a 45% layer.

---

## 5. polish-29: small open items

**Items.**
- **Look font names.** After a Look pick, `pack.json` `fonts.display` and `fonts.body` keep the first option's names (cycle-28 Results). Write the picked pair. Files: `server/style-scope/theme/{theme-run.ts,theme-writer.ts}`, or the pack writer the agent finds.
- **One fixture per route.** "Make a data fixture" writes a new fixture page on each click. Reuse the fixture of the same source route and the same params. Files: `server/export/fixture/{fixture-commit.ts,fixture-store.ts,fixture-saved.ts}`.
- **One undo step after a fixture copy.** Today 2 steps return to the empty route copy, because the frame removal is its own history entry. Make it one step. Files: the fixture copy path in `server/handlers/project/create-prototype.ts` or `server/project-ops/project-ops-prototype.ts`.
- **Smaller cursor calls.** With `afterEvent` set, `get_run` also returns only new `sent` and `decisions` entries (run-wait "Left out": about 50 KB per call). The output schema does not change. One description sentence in `packages/common/actions/src/run/get.ts`. Files: `server/handlers/run/get.ts`, `server/run-log/run-log-reads.ts`. Run gen-routes.
- **Check: HTTP abort ends a `get_run` wait.** `http/mount.ts` passes `signal` to `runPromiseExit`. Prove it with `curl --max-time 3` on a 60 s wait and the server log. If it does not end, fix it in `server/run-log/run-wait-store.ts`. Do not edit `mcp/registry.ts`.
- **Check: `import_source_page` on a fixture copy.** The copy now records `/patients`, which answers 500 without data (route-apply "Left out"). If it fails, read the recorded fixture route as the data source. File: the import source path the agent finds (`handlers/page/*` or `project-ops`).

**Headless.** No new action. Only the `run.get` description changes.

**Main files.** Listed per item. No `copy.ts`.

**Verify in the running app.**
- Look pick "option 2" on a starter page: `pack.json` names the new pair; `get_pack` (or the pack read) shows it.
- Fake Next app from pick 1 (or its own copy): "Make a data fixture" twice on `/patients`: one fixture folder. Fixture copy then one Cmd+Z: the empty copy.
- `get_run` with `afterEvent` mid-run: bytes on main and branch (report both).
- The abort check and the import check: report the result and the fix if one was needed.
- No real-model run. Dark and light screenshots of the fixture copy before and after the undo.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 route-fidelity | new `review/port-check/port-masks.ts`; `preview/visual-diff.ts` (export only), `preview/picture-diff/index.ts`; `review/port-check/{port-match-read.ts,port-shots.ts,port-check-query.ts,index.ts}`; `agent/{port-review.ts,port-review-read.ts,port-route-update.ts}`; `actions/src/port/{inspect.ts,schema.ts}`; `handlers/port/{inspect.ts,live.ts}` |
| 2 photo-art | new `share/image-search/engine/*`, new `share/image-search/photo-art.ts`; `share/image-search/{photo-fill.ts,photo-slots.ts,image-search-run.ts,gate.ts}`; `agent/{photo-search.ts,photo-note.ts,run-level.ts,mock.ts}`; `actions/src/image-search/{apply.ts,schema.ts}` |
| 3 kit-check | new `components/kit-drift/engine/to-markup-drift.ts`; `components/kit-drift/{kit-drift-list.ts,source-files.ts,engine/index.ts}`; new `agent/prototype-kit-review.ts`; `agent/prototype-review.ts`; `actions/src/kit-drift/list.ts`; `handlers/kit-drift/list.ts` |
| 4 figma-keys | new `shared/edit-keys.ts`; `shared/keymap.ts`; `bridge/zoom-forward.ts`; new `ui/features/inspector/{use-edit-keys.ts,edit-keys-model.ts}`; `ui/features/inspector/{opacity-field-model.ts,use-rotation.ts,copy.ts}`; `ui/features/canvas/use-rotate-drag.ts` |
| 5 polish-29 | `style-scope/theme/{theme-run.ts,theme-writer.ts}`; `export/fixture/{fixture-commit.ts,fixture-store.ts,fixture-saved.ts}`; `handlers/project/create-prototype.ts` or `project-ops/project-ops-prototype.ts`; `handlers/run/get.ts`; `run-log/{run-log-reads.ts,run-wait-store.ts}`; `actions/src/run/get.ts` |

Shared files and conflict warnings:
- **`server/agent/run-notes.ts`: picks 1 and 3 may both add a note line.** Pick 1 changes the update note in `port-route-update.ts` (its own file) and should not need `run-notes.ts`. Pick 3 adds a kit line only if the prototype note cannot carry it. If both edit `run-notes.ts`, pick 1 merges first and pick 3 rebases. This is the one possible same-file overlap.
- **`server/agent/sdk-driver.ts`: no pick edits it.** Pick 2 hooks the art step where the photo step runs; pick 3 hooks through `toReviewGaps`. If pick 2 must touch `sdk-driver.ts`, net 0 lines, and it says so in its report.
- **`server/agent/mock.ts`**: pick 2 only. Pick 1 uses `mock-port.ts` (not changed unless the note needs it; then pick 1 only).
- **`copy.ts`**: only pick 4 adds keys, in `ui/features/inspector/copy.ts`. No other pick adds to any `copy.ts`.
- **Generated files and unions:** no pick adds an action, an error, a domain or a union member, so no pick changes a `@generated` list or an import line. Picks 1, 2, 3 and 5 change a description or a schema: run `pnpm exec tsx scripts/gen-routes.ts` in the branch and `--check` after each merge. Pick 1 changes `PortMatchSchema` (`port/schema.ts`), pick 2 the image-search input schema; different files.
- **`packages/common/actions/src`**: pick 1 `port/`, pick 2 `image-search/`, pick 3 `kit-drift/`, pick 5 `run/`. No two picks share a domain folder.
- **Design-system data**: pick 5 writes `pack.json` font names; pick 2 reads `tokens.css`; pick 3 reads the pack component recipes. Read-only overlap only.
- **Fake apps under `ds-wt`**: picks 1 and 5 may share `rf-next`; pick 3 uses its own `kc-next`. No pick writes into Bonaparte.
- **`artifacts/mcp-snapshots/*.json`**: no diff (`inspect_port`, `apply_image_search`, `list_kit_drift`, `get_run` are in no snapshot).
- **Hand aggregators** (`mcp/registry.ts` and the other 4): no pick edits them.
- **`.claude/goal/roadmap.md` Appendix A**: add the new files of picks 1 to 4 when the file is in the worktree.

## Merge order

All 5 can run at once. Merge in this order:
1. **route-fidelity**: the Bonaparte pick; first on `agent/` and `run-notes.ts`.
2. **kit-check**: rebase over pick 1 if both touched `run-notes.ts`.
3. **photo-art**: image-search and photo prompt files.
4. **polish-29**: theme, fixture and run read files.
5. **figma-keys**: UI, bridge and keymap only.

After the last merge, run `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run check:scripts`, `pnpm run lint:gate`, `pnpm run build:ui` and `pnpm exec tsx scripts/check-bundle.ts`. Then run one real-model session of 2 runs on merged main against a fake Next app under `ds-wt` (Tailwind 4, shadcn-style kit):
1. A prototype beside the app, "clinic patients list with a search and an add button", image search off. Report the flat-box share, the kit finds before and after the studio check, and the `get_run` call count with `waitSeconds`.
2. A route copy of `/patients` with a data fixture, redesigned, then Move to app onto `/patients` after an app change. Report the first and last port score, `masked`, data reads kept, and seconds and cost.

Real-model checks (local Claude Code sign-in, short runs; Move to app only into a fake Next app under `ds-wt`, never Bonaparte):
- pick 1: 2 runs (`rf-next` and `rf-next-tw`), after the no-model replay;
- pick 2: 2 runs (main and branch);
- pick 3: 2 runs (main and branch);
- the final merged session (2 runs).

Picks 4 and 5 need none.

## Runners-up

1. Frame fit to content (Figma "Resize to fit"): needs a decision on `100vh` and `min-h-screen` sections, which grow with the frame.
2. Port fidelity for a new route: keep the prototype fonts and colors when the app has no token (cycle-27 run 3 dropped Fraunces and `--ink`); after pick 1, which owns the port check.
3. Flow onto existing routes: Move to app of a flow still refuses routes that exist (route-apply "Left out").
4. Editable `data-[side=*]`, `data-[orientation=*]` and `group-data-[collapsible=icon]` states (Bonaparte 11 to 58 uses); adds a `set_state_style` snapshot diff, so it waits for the snapshot decision.
5. A closed MCP request ends a `get_run` wait; needs the abort signal in `mcp/registry.ts` (a hand aggregator, merge step only).
6. Photo slots from the image provider: when `create_image` has a key, offer generated images for art slots, as an opt-in cost.
7. Bring forward and send backward on `Mod+]` and `Mod+[` as Figma aliases of Move up and Move down; check the `Mod+Alt+]` direction keys first.
8. Canvas memory (doop): a design note on the canvas that every new frame and run in the project reads.
9. Load `TodoWrite` up front, not behind `ToolSearch`; measure the first-byte time first.
10. `get_screenshot` of a failed dev server returns `isError: false` with the error page (journey 7, cycles 22 to 24); `fix/idle-chrome` has merged, so it is no longer blocked.

Sources: [mcp.directory 2026 comparison](https://mcp.directory/blog/claude-design-vs-stitch-vs-v0-vs-lovable-vs-figma-make-2026), [konigi.com Claude Design](https://konigi.com/articles/claude-design-has-the-incumbents-scrambling/), [monkfrom.earth Claude Design vs Figma, Lovable, v0](https://monkfrom.earth/blogs/claude-design-vs-figma-lovable-v0), [refontelearning.com design-to-code tools](https://www.refontelearning.com/blog/ai-design-to-code-tools-figma-make-v0-lovable), [designcompass Figma Intelligent Canvas](https://designcompass.org/en/2026/07/15/figma-intelligent-canvas-ai-full-stack-creation/), [cryptobriefing Canva Brush](https://cryptobriefing.com/canva-unveils-brush-vision-language-model/). No Claude Design, Figma Make, v0, Lovable, Bolt, open design or doop result was newer than the cycle-28 recheck.

## Results

- Merged with no conflicts, in order: route-fidelity, kit-check, photo-art, polish-29, figma-keys (main at 4f71945a8).
- route-fidelity: replay with no model scores a correct route update 99 (main 48). Real runs into a fake Next app: 71 on the branch vs 17 on main; still under 80.
- kit-check: real run ended with 0 hand-styled controls (main 6), fix loop about 12 s.
- photo-art: flat-box share of the first screen 0% (was 23.6%), one real run 89 s, $0.24.
- polish-29: Look picks save font names to pack.json; fixture copy undo is 1 step; get_run afterEvent returns only new sent entries; import_source_page works on a fixture copy (main gave 500).
- figma-keys: opacity digits, font size, letter spacing and line height keys; rotate drag writes the picked breakpoint and state.
- Checks: gen-routes --check pass, typecheck 0 errors, lint:gate pass (59601, baseline 89733), build:ui pass, check:clip 0 findings, desktop:pack pass.
- Installed app: :4570 returns 200. Server idle CPU 0.02 CPU-s/min over 60 s.
- Open: real route-update runs score 71, not 80; photo art does not repaint in dark mode and skips JSX pages; kit check skips cards, labels and tables; get_run summary is still about 50 KB per call.
