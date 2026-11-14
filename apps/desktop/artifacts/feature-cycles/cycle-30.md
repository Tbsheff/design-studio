# Feature cycle 30: next 5 features

Date: 2026-11-14. Main at `f224e3a68` (all 5 cycle-29 picks merged at `4f71945a8`).

## Method

- Read `cycle-29.md` (picks, runners-up, Results "Open"), the 5 `cycle-29/*.md` reports ("Left out"), `real-runs/report{,-2,-3}.md`, the runners-up and Results "Open" lines of cycles 25 to 28 (13 to 24 through their carried-over runners-up and a grep for sign-in and first-run items), the tail of `.claude/goal/feature-log.md`, `git log --oneline -120` and `git branch -a`.
- Read the port fix loop (`agent/port-review.ts`), the route-fidelity replay inputs and the run-2 output (`cycle-29/route-fidelity/{replay-inputs,real-run-2-branch}/`).
- Read the first-run path: `desktop/first-run.ts`, `desktop/setup-checks.ts`, `ui/features/home/{home-empty,start-cards,prompt-area,use-example,use-home-submit,use-open-flows}.ts(x)`, `server/store/starters.ts`.
- Read the copy and paste path: `shared/keymap.ts`, `shared/structure-keys.ts`, `bridge/keyboard.ts`, `ui/features/versions-layers-tokens/{use-cut-paste,use-structure-ops}.ts`, `ui/features/canvas/use-free-move.ts`, `mcp/move-tools.ts`.
- No app was run for this research. Each pick checks its own "today" behaviour in the running app before it changes code.

### Why real route updates score 71, not 80

The no-model replay of a correct route update scores 99 (cycle 29). The real run 2 scored 71 before and after its fix loop. The report names the cause: the agent left `.title` at `margin-bottom: 4px` (the prototype has 24 px). With the kept line hidden, the table sits 20 px high, so every edge under it misses. The fix loop then changed the margin of the hidden kept line, so the score did not move.

The fix prompt (`toFixPrompt`, `port-review.ts`) gives the low areas and up to 3 element names with text. It gives no measured value. The agent cannot see "4 px against 24 px", so it guesses. Pick 1 adds paired element values. The `rf-next-tw` (Tailwind 4) real run was never done; pick 1 does it.

### First run today

- **Setup is covered.** The desktop first-run window (`desktop/first-run.ts`, `setup-checks.ts`) checks Git, Claude Code install, Claude Code sign-in ("Not logged in. Run `claude` in Terminal and log in, then recheck."), disk and network before Home opens. A sign-in gate on Home would repeat it. Not picked.
- **Home with 0 projects** shows `HomeEmpty`: the found apps list, "Open the sample" (a finished prototype, no AI), starter pills (copy a static template, no AI) and the composer. The composer placeholder rotates 5 examples every 3.5 s (`home-model.ts` `EXAMPLES`). Tab does not take the example: the user must type a prompt. The 5 examples are short ("Wireframe a settings page"). The starter prompts in `server/store/starters.ts` are better briefs (subject, feel, sections) but no UI uses them.
- Clarify is off by default (`shouldAskFirst: false`), and draft-first paints the first draft (7.7 s in report 1, 21.6 s to the first `Write` in the cycle-29 bakery run). So the shortest path today is: type a prompt, Enter. The typing is the step to remove. Pick 4.

### Other findings

- **Figma gap.** `Mod+C` on a selected layer does nothing on the canvas. `Mod+X` (cut to move) and `Mod+V` (move the cut layers, or paste JSX from the clipboard) exist; Alt+drag duplicate exists (`use-free-move.ts`); `Mod+D` duplicates in place. Figma users copy a layer and paste it into another container or frame. Pick 3.
- **AI quality.** Photo art (cycle 29) paints HTML pages only and reads the light tokens. A route copy (JSX) still gets the gray box, and a dark preview shows light art (`cycle-29/photo-art/real-branch-bakery-art-dark.png`). Route copies are the Bonaparte prototype path, so this is where the gray box is left. Pick 2. Its measure is the cycle-29 flat-box scan (`ds-wt/pa-scan.mjs`) on a short real run.
- **Small open items** (pick 5): kit check skips labels and tables in prototype mode (both are in the `KitDriftTagSchema` union already); the kit and review notes join two "Studio check:" sentences; `import_source_page` with several fixtures takes the latest, not the one with the same params; the `fixture.create` description still says "Writes one page file"; multi-selection type keys step 1 px, not the Tailwind scale; 2 page-load 404s from report 1 and report 2 (check first, they may be fixed).
- **Not picked:** the `get_run` summary trim (about 50 KB; needs a schema or description decision), cards in the kit check (adds a `card` member to `KitDriftTagSchema`; runner-up 1), frame fit to content, the panel rail, the Home cuts, the MCP snapshot refresh (user decisions), the closed MCP request in a `get_run` wait (`mcp/registry.ts`, a hand aggregator).
- **Competitor recheck (2 web searches, 2026-11-14).** No Claude Design, v0, Lovable, Bolt, open design or doop item newer than the cycle-29 recheck. Figma release notes list npm import in Make and question cards in Make (undated). Onboarding in Claude Design asks one role question, then New Project puts the user in the canvas with the prompt in the chat; Replit Design and Lovart put one prompt box first; Canva puts templates first. All aim at one prompt to a first design, which supports pick 4.
- **Branch check.** No `feat/route-pairs`, `feat/art-jsx`, `feat/layer-copy`, `feat/first-design` or `feat/polish-30`. Near names that exist and are not used: `feat/route-fidelity`, `feat/photo-art`, `feat/photo-fill`, `feat/draft-first`, `feat/front-door`, `feat/start-points`, `feat/polish-29`.
- **MCP snapshots.** No pick adds an action or changes a tool in `apps/desktop/artifacts/mcp-snapshots/*.json`. `inspect_port`, `apply_image_search`, `list_kit_drift` and `import_source_page` are in no snapshot. `move_element` is in `direct-edit-element.json`; pick 3 does not change it.
- `.claude/goal/roadmap.md` is untracked, so worktrees do not get it. Each pick adds its globs to Appendix A only if the file is in its worktree, and says so in its report (L6e).

## Ranking

Score = value x fit with "simple and fast" / effort (1 to 5 each). Rank by value first.

| Rank | Key | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|---|
| 1 | route-pairs | Route update fix loop gets paired prototype and app values ("margin-bottom: app 4px, prototype 24px"); real runs reach 80 in plain CSS and Tailwind 4 (Bonaparte) | 5 | 5 | 3 | 8.3 |
| 2 | art-jsx | Photo art in JSX and TSX route copies, a dark variant, and repaint after a Look or theme change (AI quality) | 4 | 5 | 3 | 6.7 |
| 3 | layer-copy | `Mod+C` copies layers, `Mod+V` pastes a copy into the selection, also in another frame (Figma) | 4 | 5 | 2 | 10 |
| 4 | first-design | Tab takes the shown example; the examples are tested briefs; measured clicks and seconds to a first design (onboarding) | 4 | 5 | 2 | 10 |
| 5 | polish-30 | Kit check labels and tables, one "Studio check:" line, fixture params, fixture text, multi type keys, 404 checks | 3 | 5 | 2 | 7.5 |

No pick adds an always-visible control:
- Pick 1 changes the fix prompt, the port probe and the "Fix differences" text.
- Pick 2 changes what fills a photo slot.
- Pick 3 adds a key (shown only in the shortcut sheet and Cmd+K).
- Pick 4 adds a key and changes the placeholder text.
- Pick 5 fixes existing paths.

---

## 1. route-pairs: the route update fix loop gets measured values (Bonaparte)

**Why.** A correct route update now scores 99 with no model, but a real run scores 71. The agent cannot fix a 20 px gap it cannot see. Bonaparte work is mostly route updates, so this is the score users read.

**Behaviour.**
- **Element pairs.** The port probe pairs app elements with prototype elements on the whole page: same text (trimmed, case-folded), else same tag and the same order among siblings with that tag. Kept app elements (`masked` `app-change`) and data cells are not paired.
- **First shift.** Low areas show where content moved, not where the move started (in run 2 the table rows are low; the cause is the title margin above them). So the probe walks the pairs in document order and finds the first pair whose top offset (app minus prototype) changes by 2 px or more from the pair before it. It always reports that pair and the element just above it, even outside the low areas: the shifted element's `margin-top` and the upper element's `margin-bottom`, `padding-bottom` and `height`.
- **Area pairs.** Then up to 3 pairs per low area, 8 per check in all, first shift included.
- **Values.** For each pair, the probe reads the box (`top`, `height`, `width`) and these computed values on both pages: `margin-top`, `margin-bottom`, `padding` (4 sides), `gap`, `font-size`, `line-height`, `font-weight`, `border-width`, `border-radius`. It lists only values that differ by 2 px or more (or any font weight change).
- **Prompt lines.** First: `- First shift: content from table.patients is 20px higher than the prototype. Above it, main > h1 "Patients": margin-bottom app 4px, prototype 24px.` Then the area lines: `- top left 52: ...`. A kept app element (`masked` `app-change`) is never in a pair. The line under the kept text says: "Do not edit the kept app text or its margins."
- **Second loop.** When the first fix loop raises the score but leaves it under 80, one more fix loop runs with the new values. Max 2 loops. No second loop when the score did not rise (to stop guess loops) or when the first loop took over 60 s.
- **Output.** `PortElementSchema` (the `elements` items of `PortAreaSchema`) gains `diffs`: a list of `{ property, app, prototype }` (max 6 per element). `PortMatchSchema` gains `firstShift`: `{ shift, element, above }` or null (elements as `PortElementSchema`).
- **"Fix differences" in the chat** (`ui/features/chat/port-check-model.ts`) builds its prompt from the same lines: the masked items and the paired values (route-fidelity "Left out").
- **Run note.** When rows were hidden: "Studio port check: score 84; hid 1 extra data row on the app page." (route-fidelity "Left out").

**Agent loop.** No new tool. The run agent gets the better fix prompt. Its own `inspect_port` call returns `diffs` too.

**Headless.** No new action. `port.inspect` (`inspect_port`, in no snapshot file): output `areas[].elements[].diffs`; the description adds one sentence ("For each low area it pairs app and prototype elements and lists the computed values that differ."). Run `pnpm exec tsx scripts/gen-routes.ts`. The in-app agent uses the same `inspect_port` (agent `set: "app"`).

**Main files.**
- `server/review/port-check/{port-mask-probe.ts (132 lines),port-masks.ts (269),port-match-read.ts}`; new `server/review/port-check/port-pairs.ts` (pairing and value diff, pure) and new `port-pairs-probe.ts` (the in-page reader string, W21 `__name` shim).
- `server/agent/port-review.ts` (341 lines; area lines, second loop), `server/agent/port-review-read.ts` (read `diffs`).
- `packages/common/actions/src/port/{inspect.ts,schema.ts}`.
- `ui/features/chat/port-check-model.ts` (no `copy.ts` change; the lines are built from the server output).
- `server/preview/visual-diff.ts` stays at 840 lines: no growth.

**Verify in the running app** (`STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev`).
- `ds-wt/rf-next` no longer exists. Make it again as in `cycle-29/route-fidelity.md` "Checked" (Next 16, `.jsx`, no Tailwind, `app/globals.css`, `lib/server.js` that throws unless `.db-ok` exists, `node_modules` as a dereferenced copy; the before files are in `cycle-29/route-fidelity/replay-inputs/`). Make `ds-wt/rf-next-tw`: the same app with Tailwind 4 and the route styled with classes. Pick 1 owns both. Never Bonaparte.
- **Replay, no model (the gate).** Put `cycle-29/route-fidelity/real-run-2-branch/{page.jsx,patient-list.jsx,patients.module.css}` into `rf-next` as the updated route, with the "Ward list for today." app change, against `replay-inputs/prototype-index.html`. Call `inspect_port` on main and on the branch and record both scores. Gate: the branch output has `firstShift.above` on `h1 "Patients"` (or `.title`) with `margin-bottom` app 4px, prototype 24px. Check it on the `inspect_port` output, not on a mock run log (a mock Move to app writes the mock page over the app files). If the gate fails, stop and report why before any real run.
- **Correct port.** `replay-inputs/correct-port.module.css`: 99, no area under 80, no `diffs`.
- **Fault.** Correct port with `.card { border: none }` and `.title { font-size: 20px }`: under 80, and the lines name `border-width` and `font-size` with both values.
- `pnpm exec tsx scripts/call-action.ts port.inspect '<json>'`: 3 surfaces match.
- **Real model, 2 short runs** (local Claude Code sign-in, Sonnet), each a Move to app of the fixture copy onto `/patients` after the app change: one in `rf-next`, one in `rf-next-tw`. Gate: both score 80 or more after the fix loops. Report the first score, the score after each loop, loop count, whether the agent edited the kept text (expect no), data reads kept (grep), sample rows in `app/` (expect 0), seconds and cost. If a run stays under 80, name the remaining cause from its `diffs`.
- Dark and light screenshots of the run note and of the "Fix differences" prompt in the composer.

---

## 2. art-jsx: photo art in route copies and in dark mode (AI quality)

**Why.** Cycle 29 took the flat-box share of a first HTML screen from 23.6% to 0%. A route copy (JSX or TSX, the Bonaparte prototype path) still gets the gray box (`PHOTO_STEP` keeps the gray-box rule for JSX), and a dark preview shows light art. Both are first-draft defects that a user sees at once.

**Behaviour.**
- **First check: the asset URL.** Find how a route-copy frame serves a file from the prototype folder (`assets/...`). If the copy renders through the app's own dev server, the SVG URL must still resolve with no write to the app's `public/` (for example a studio preview route). Report the URL form before writing code.
- **No inline background.** An inline `backgroundImage` beats every stylesheet rule, so a dark rule could never win. The art moves to a stylesheet keyed on `data-photo-art="<hash>"`: one light rule and, with a dark block, one dark rule. The cycle-29 HTML art writes `background-image` inline (`photo-art.ts` line 133); change HTML to the same stylesheet form (the page `<style>`), and keep reading old inline art as an art slot.
- **JSX and TSX slots.** After a completed edit run with image search off, the studio paints plain `data-photo` slots in `.jsx` and `.tsx` entry pages of a prototype (a route copy or a JSX prototype): the same engine (`engine/to-photo-art.ts`), the same `assets/photo-art-<hash>.svg` file in the prototype folder. A `div` slot gets `data-photo-art="<hash>"`, `role="img"` and `aria-label` from its label. An `img` slot gets `src` and `alt`. Elements made by `.map()` are skipped (the same rule as `move_element`). The rules go in a stylesheet that the prototype owns: a new `photo-art.css` beside the route copy entry, imported once by that entry. Never `app/globals.css` or any other app source file.
- **Dark variant.** When the tokens have a dark block (`.dark`, `[data-theme="dark"]` or `@media (prefers-color-scheme: dark)`), the studio writes a second SVG from the dark values and a dark rule under the same selector. No dark block: one SVG and one rule.
- **Repaint.** A Look pick or `theme.apply` repaints the art slots of the pages it changed, in the same version as the theme change (no extra undo step).
- **Prompt.** `PHOTO_OFF_RULE` and `PHOTO_STEP` drop the gray-box line for JSX entries; `photo-note.ts` uses the art note for both.
- **Bundled (photo-art "Left out"):** remove the old `photo-art-*.svg` when a photo replaces the art; a `slots` call that misses again writes no version.

**Headless.**
- `image-search.apply` (`apply_image_search`, in no snapshot file): with search off it paints JSX and TSX pages too. The description changes one sentence. Run gen-routes.
- The in-app agent and MCP get the art with no call: the studio step runs after the run.

**Main files.**
- New `server/share/image-search/photo-art-jsx.ts` (find slots and write the JSX attributes with the existing JSX patch path the agent finds in `direct-edit`; `photo-art.ts` is 419 lines and `photo-fill.ts` 495, so new code goes in new files), new `server/share/image-search/photo-art-dark.ts` (dark token read, second SVG, swap rule).
- `server/share/image-search/{photo-art.ts,photo-art-colors.ts,photo-fill.ts (net 0 lines),image-search-run.ts,index.ts}`.
- `server/http/run-follow-up.ts` (call the JSX painter), `server/style-scope/theme/theme-run.ts` (repaint hook, 302 lines).
- `server/agent/{photo-search.ts,photo-note.ts}`.
- `packages/common/actions/src/image-search/apply.ts` (description).
- No `copy.ts`.

**Verify in the running app.**
- Use its own fake app `ds-wt/rf-next-art` (a copy of pick 1's `rf-next` setup; `fixture.create` writes into the app, so picks must not share one). Mock, search off, a route copy of `/patients` with a seeded `data-photo` `div` and one `img` slot in `page.jsx`: both get art and the art shows in the frame; one Cmd+Z returns the plain slots; the app folder has no change (`git status --short` in `rf-next-art`).
- Dark: a starter look with a dark block; switch the preview to dark: the art uses the dark colors. Pick another Look: the art repaints with no extra undo step.
- `call-action.ts image-search.apply '<json>'` on the JSX copy: HTTP and MCP match.
- Search on: a photo replaces the art and the old SVG goes.
- **Real model, 2 short runs** (search off, main and branch): a route copy of `rf-next-art` `/patients` with the prompt "Redesign this page as a clinic team page with a photo for each doctor and a hero image". Measure with `ds-wt/pa-scan.mjs` on the first 1280 x 900 screen, light and dark: flat-box share (expect a gray-box share on main, under 3% on the branch, light and dark). Also report `review_frame` findings, first-draft time (unchanged), seconds and cost. Dark and light screenshots of both runs.

---

## 3. layer-copy: copy and paste layers (Figma)

**Why.** In Figma, `Mod+C` then `Mod+V` is the most used way to reuse a layer: copy a card, select another column or frame, paste. The studio has cut-to-move, `Mod+D` in place and Alt+drag, but `Mod+C` on a layer does nothing.

**UI behaviour.**
- With 1 or more layers selected and the canvas focused (not in a text field, text edit, the chat or an input), `Mod+C` records the selected layers (targets and the head version) and writes their source markup (JSX or HTML) to the system clipboard. A toast: "Copied 2 layers. Mod+V pastes them into the selection."
- `Mod+V` order: 1) cut layers waiting (today's move); 2) copied layers (this pick); 3) JSX or HTML from the clipboard (today's `pasteJsx`); 4) the "cut first" notice. A new copy clears a waiting cut, and a new cut clears a copy, so only one is ever waiting.
- **Same file.** Paste is `duplicate` with `into` the last selected layer (append), or `after` it when it cannot hold children (`img`, `input`, text-only). One version, one undo step. The copy stays on the clipboard, so `Mod+V` again pastes again.
- **Another file** (another frame or route file): paste the recorded markup through the existing `pasteJsx` path (`insert_jsx`), with the same import handling. When that path refuses (for example a component that the target file cannot import), the notice says why and nothing changes.
- **Changed head.** When the head version changed after the copy and a copied target no longer exists, paste uses the clipboard markup (step 3), not the stale targets.
- `Mod+C` inside a text edit, a text selection in the frame, the chat or an input keeps the normal text copy. `Mod+Shift+C` (Copy as PNG) does not change.
- The key shows in the shortcut sheet (`shared/keymap.ts`, "Copy layers") and Cmd+K.

**Headless.** No new action and no description change. MCP and the agent already copy with `move_element` (`copy: true`, same file) and `insert_jsx` (another file).

**Main files.**
- `packages/common/contracts/src/contracts.ts`: add `"copy"` to the `StructureKey` union (one line).
- `shared/structure-keys.ts`, `bridge/keyboard.ts` (forward `Mod+C` from the frame only when no text is selected).
- `shared/keymap.ts` (one entry `layer-copy`; 471 lines, stay at 500 or less).
- `ui/features/versions-layers-tokens/{use-cut-paste.ts,use-structure-ops.ts,layer-structure-deps.ts,layer-edits-model.ts,copy.ts}`; new `ui/features/versions-layers-tokens/copy-paste-model.ts` (the paste order and the same-file test).
- `ui/features/inspector/structure-edits-model.ts` (a "Copy" item in the structure menu, if it lists cut and paste).
- Clipboard write through the platform helper the agent finds in `src/ui/platform/**` (U1); add one there if none exists.

**Verify in the running app.**
- Tailwind 4 project and HTML project. Select a card, `Mod+C`, select another column, `Mod+V`: a copy is the last child there; one Cmd+Z removes it. `Mod+V` again: a second copy.
- Copy a button from frame 1 (route A) and paste into a section in frame 2 (route B): the button and its import are in route B's file.
- Copy, then cut another layer, then `Mod+V`: the cut moves (the copy was cleared). Cut, then copy, `Mod+V`: the copy pastes.
- `Mod+C` with text selected in a frame and in text edit: the text copies, no toast. `Mod+C` in the chat: text copy.
- Paste into an `img`: the copy goes after it.
- No real-model run. Dark and light screenshots of the toast and the shortcut sheet row.

---

## 4. first-design: one key from Home to a first design (onboarding)

**Why.** After the setup window, a new user sees Home with a composer whose placeholder shows an example, but must type a prompt. Claude Design, Replit Design and Lovart all lead with one prompt box; the fewest steps is to take the shown example. The examples should also be briefs that give a good first page, not "Wireframe a settings page".

**Measure first (main).** Fresh `STUDIO_DATA_DIR` and fresh studio settings (no projects). Open Home. First confirm that a user with 0 projects sees the rotating examples (`useExample` shows a fixed placeholder when `placeholder` is not null). If the placeholder is fixed, the pick decides what that state shows, so Tab has a brief to take. Count the user steps (clicks and keys, typing counts as 1) and seconds to: the first painted draft, and the run end. Take one short real run with the shortest path a new user can take (type the shown example, Enter). Screenshot each screen. Write down every stall: a spinner with no text, a panel the user must open, a question.

**UI behaviour.**
- **Tab takes the example.** In an empty Home prompt, Tab puts the shown example into the prompt and stops the rotation; Enter builds it. With text in the prompt, Tab does what it does today (focus moves), and an open slash or mention menu keeps its Tab.
- **Placeholder.** The shown example ends with " — Tab to use" (text in `home-model.ts` or `copy.ts`, no new element). Screen readers: the prompt `aria-describedby` names the Tab key once.
- **Better examples.** The examples become the starter briefs from `server/store/starters.ts` (`prompt` of each starter, read through the existing `/api/starters` call that the starter pills make), so one list serves both. Fall back to today's `EXAMPLES` while the list loads.
- **Fix one stall** that the measure finds on the first run, if it costs 60 lines or less (for example: the chat column closed on the first run so the user does not see progress). Name it in the report; if the fix is larger, list it as "Left out".
- No new control. The starter pills and "Open the sample" do not change (the Home cuts are the user's decision).

**Headless.** No new action. MCP and the agent already reach a first design with `create_project` and a prompt. Name this in the report.

**Main files.**
- `ui/features/home/{prompt-area.tsx,use-example.ts,home-model.ts,use-starters.ts,copy.ts}`; new `ui/features/home/use-example-take.ts` (the Tab handler; U6a: no hook in a `.tsx` file).
- The one stall fix: the file the measure points to, named in the report.

**Verify in the running app.**
- Fresh data dir: Home shows a starter brief in the placeholder with "Tab to use". Tab: the prompt holds it. Enter: the project opens and the draft paints.
- Type "a", then Tab: focus moves, the text stays. `/` menu open, Tab: the menu takes it.
- **Real model, 1 short run on the branch** (fresh data dir, Tab, Enter). Report steps and seconds to the first painted draft and to the run end, next to the main measure. Target: 2 user steps from Home to the run start (main: 2 plus typing).
- Dark and light screenshots of the empty Home with the placeholder, and of the first draft.

---

## 5. polish-30: small open items

**Items.**
- **Kit check labels and tables.** The prototype kit check (`to-markup-drift.ts`) adds `label` and `table` finds against the app recipes (both are in `KitDriftTagSchema` already; no union change). First check that the recipe reader gives a recipe for a plain `cn(...)` component with no cva (a shadcn Table). If it gives none, do labels only and say so. Files: `server/components/kit-drift/engine/to-markup-drift.ts` (246 lines), `server/agent/prototype-kit-review.ts`.
- **One "Studio check:" line.** When both the prototype review and the kit check ran, the note says "Studio check: 2 review gaps and 3 controls did not use the app kit; a fix loop ran; after it 0." in one sentence. Files: `server/agent/{prototype-review.ts,prototype-kit-review.ts}`.
- **Fixture params.** `import_source_page` on a route with several fixtures picks the fixture whose params match the copy's recorded params, else the latest. Files: the import source path from cycle 29 (`1bd4b9099`) and `server/export/fixture/fixture-saved.ts`.
- **Fixture text.** The `fixture.create` description says it reuses the fixture of the same route and params. File: `packages/common/actions/src/fixture/create.ts`. Run gen-routes.
- **Multi type keys.** With several layers selected, `Mod+Shift+.`, `Alt+.` and `Alt+Shift+.` step the Tailwind scale when every layer's value is on it (else 1 px, as today). Files: `ui/features/inspector/{use-edit-keys.ts,edit-keys-model.ts}` and the multi edit model the agent finds.
- **Check: page-load 404s.** `GET .../changes?from=null&to=<sha>` after the first version (report 2, minor 6) and `GET .../runs/states/states-s1` before any sequence (report 1, bug 9). If either still 404s, skip the call when there is nothing to ask for. Files: `ui/features/canvas/use-change-rings.ts` and the states caller the agent finds.

**Headless.** No new action. Only the `fixture.create` description changes.

**Main files.** Listed per item. No `copy.ts`.

**Verify in the running app.**
- `ds-wt/kc-next` no longer exists. Make it again as in `cycle-29/kit-check.md` (Next 16, Tailwind 4, shadcn-style `components/ui/{button,input,card}.tsx`) and add `label.tsx` and `table.tsx`. Use `ds-wt/rf-next-fx` (own copy of pick 1's `rf-next` setup) for the fixture items. Seed a prototype page with 2 hand-styled labels and 1 hand-styled table: `list_kit_drift` with `page` lists 3 finds with the recipe names; `call-action.ts kit-drift.list '<json>'` matches on 3 surfaces.
- Note: a seeded run log with both checks reads as one sentence (mock or the unit path the agent finds; no test files).
- Two fixtures for `/patients` with different params: `import_source_page` on each copy reads its own fixture.
- Multi-select two `text-sm` headings, `Mod+Shift+.`: both `text-base`.
- Load a new project and a states board with the network log open: no 404 (or the report says both were already fixed).
- No real-model run. Dark and light screenshots of the kit note.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 route-pairs | `review/port-check/{port-mask-probe.ts,port-masks.ts,port-match-read.ts}`, new `review/port-check/{port-pairs.ts,port-pairs-probe.ts}`; `agent/{port-review.ts,port-review-read.ts}`; `actions/src/port/{inspect.ts,schema.ts}`; `ui/features/chat/port-check-model.ts` |
| 2 art-jsx | new `share/image-search/{photo-art-jsx.ts,photo-art-dark.ts}`; `share/image-search/{photo-art.ts,photo-art-colors.ts,photo-fill.ts,image-search-run.ts,index.ts}`; `http/run-follow-up.ts`; `style-scope/theme/theme-run.ts`; `agent/{photo-search.ts,photo-note.ts}`; `actions/src/image-search/apply.ts` |
| 3 layer-copy | `contracts/src/contracts.ts` (`StructureKey`, one line); `shared/{structure-keys.ts,keymap.ts}`; `bridge/keyboard.ts`; `ui/features/versions-layers-tokens/{use-cut-paste.ts,use-structure-ops.ts,layer-structure-deps.ts,layer-edits-model.ts,copy.ts}`, new `copy-paste-model.ts`; `ui/features/inspector/structure-edits-model.ts`; one `ui/platform` clipboard helper |
| 4 first-design | `ui/features/home/{prompt-area.tsx,use-example.ts,home-model.ts,use-starters.ts,copy.ts}`, new `use-example-take.ts`; the one stall file it names |
| 5 polish-30 | `components/kit-drift/engine/to-markup-drift.ts`; `agent/{prototype-review.ts,prototype-kit-review.ts}`; `export/fixture/fixture-saved.ts` and the import source file; `actions/src/fixture/create.ts`; `ui/features/inspector/{use-edit-keys.ts,edit-keys-model.ts}`; `ui/features/canvas/use-change-rings.ts` and the states caller |

Shared files and conflict warnings:
- **`copy.ts`:** pick 3 adds to `ui/features/versions-layers-tokens/copy.ts` (toast text); pick 4 adds to `ui/features/home/copy.ts` (Tab hint). Different files. Picks 1, 2 and 5 add no copy text; pick 1 edits `ui/features/chat/port-check-model.ts` only, never `ui/features/chat/copy.ts`.
- **Unions:** only pick 3 changes a union (`StructureKey` in `contracts/src/contracts.ts`, one member). Pick 5 does not add a `KitDriftTagSchema` member (label and table exist). Cards are runner-up 1 because they need a `card` member.
- **`ui/features/chat`:** pick 1 only (`port-check-model.ts`). If pick 4's stall fix lands in a chat file, it must not be `port-check-model.ts`; name it in the report.
- **`ui/features/inspector`:** pick 3 owns `structure-edits-model.ts`; pick 5 owns `use-edit-keys.ts` and `edit-keys-model.ts`. No shared file, but both mount near the same keys: pick 3 must not change `use-edit-keys.ts`.
- **`shared/keymap.ts`:** pick 3 only. Pick 4's Tab is a composer key, not a keymap entry.
- **`agent/`:** pick 1 `port-review*.ts`, pick 2 `photo-*.ts`, pick 5 `prototype-*review.ts`. No shared file. `run-notes.ts` and `sdk-driver.ts`: no pick edits them; if pick 1's note line needs `run-notes.ts`, pick 1 owns it and pick 5 does not touch it.
- **`style-scope/theme/theme-run.ts`:** pick 2 only.
- **`packages/common/actions/src`:** pick 1 `port/`, pick 2 `image-search/`, pick 5 `fixture/`. No shared domain folder. No pick adds an action, error or domain, so no `@generated` list changes. Picks 1, 2 and 5 change a description or schema: run `pnpm exec tsx scripts/gen-routes.ts` in the branch and `--check` after each merge.
- **Fake apps under `ds-wt`:** `rf-next` and `kc-next` were removed after cycle 29; each pick makes its own. `fixture.create` writes a fixture page into the app, so no two picks share one: pick 1 `rf-next` and `rf-next-tw`, pick 2 `rf-next-art`, pick 5 `rf-next-fx` and `kc-next`. The final merged session makes its own copy. No pick writes into Bonaparte.
- **Hand aggregators** and `artifacts/mcp-snapshots/*.json`: no pick edits them.
- **`.claude/goal/roadmap.md` Appendix A:** add the new files of each pick when the file is in the worktree.

## Merge order

All 5 can run at once. Merge in this order:
1. **route-pairs**: the Bonaparte pick; port files and the one chat file.
2. **art-jsx**: image-search, theme and run follow-up files.
3. **polish-30**: kit, fixture, inspector keys and the 404 callers.
4. **layer-copy**: contracts union, keymap, bridge and layer files. After it, run `pnpm run typecheck` once more, because `StructureKey` is shared.
5. **first-design**: Home files only; last, so its measure runs on the merged app.

After the last merge, run `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run check:scripts`, `pnpm run lint:gate`, `pnpm run build:ui` and `pnpm exec tsx scripts/check-bundle.ts`. Then one real-model session of 2 runs on merged main:
1. Fresh data dir, Home, Tab, Enter (first-design path). Report steps and seconds to the first draft, and the flat-box share light and dark.
2. A route copy of `ds-wt/rf-next-tw` `/patients` with a data fixture, redesigned with a doctor photo, then Move to app onto `/patients` after an app change. Report the first and last port score, loop count, `diffs` on the first fix prompt, data reads kept, seconds and cost.

Real-model checks (local Claude Code sign-in, short runs; Move to app only into a fake Next app under `ds-wt`, never Bonaparte):
- pick 1: 2 runs (`rf-next`, `rf-next-tw`), only after the no-model gate passes;
- pick 2: 2 runs (main and branch);
- pick 4: 1 run on the branch (plus the main measure run);
- the final merged session (2 runs).

Picks 3 and 5 need none.

## Runners-up

1. Kit check cards: add `card` (and `badge`) to `KitDriftTagSchema` and map hand-styled card blocks to the app Card recipe; a union change, so after pick 5.
2. Port fidelity for a new route: keep the prototype fonts and colors when the app has no token (cycle-27 run 3 dropped Fraunces and `--ink`); after pick 1, which owns the port check.
3. Flow onto existing routes: Move to app of a flow still refuses routes that exist (route-apply "Left out").
4. Starter pills build with AI for a new user (today they copy a static template); a Home behaviour change, so it waits for the Home cuts decision.
5. Bring forward and send backward on `Mod+]` and `Mod+[` as Figma aliases; check the order meaning against Move up and Move down first.
6. Paste to replace (Figma `Mod+Shift+R`): replace the selected layers with the copied layer; after pick 3.
7. Photo slots from the image provider: when `create_image` has a key, offer generated images for art slots, as an opt-in cost.
8. Canvas memory (doop): a design note on the canvas that every new frame and run in the project reads.
9. Load `TodoWrite` up front, not behind `ToolSearch`; measure the first-draft time first (report 1 names it as part of 7.7 s).
10. `get_screenshot` of a failed dev server returns `isError: false` with the error page (journey 7, cycles 22 to 24).

Sources: [mcp.directory 2026 comparison](https://mcp.directory/blog/claude-design-vs-stitch-vs-v0-vs-lovable-vs-figma-make-2026), [refontelearning.com design-to-code tools](https://www.refontelearning.com/blog/ai-design-to-code-tools-figma-make-v0-lovable), [Figma release notes](https://www.figma.com/release-notes/archive/?page=2), [Figma what's new](https://www.figma.com/whats-new/), [ivee.jobs Claude Design guide](https://ivee.jobs/blog/claude-design-step-by-step-guide/), [Replit Design first screen](https://docs.replit.com/design/design-your-first-screen), [Lovart getting started](https://www.lovart.ai/it/blog/05-pillar-getting-started-lovart), [Canva onboarding](https://getperspective.ai/blog/canva-ai-conversational-onboarding-how-200m-users-get-started/markdown). No Claude Design, v0, Lovable, Bolt, open design or doop result was newer than the cycle-29 recheck.

## Results

- Merged with no conflicts, in order: route-pairs, art-jsx, polish-30, layer-copy, first-design (main at d55e5ecb2).
- route-pairs: inspect_port returns paired diffs and firstShift; the run-2 replay names h1 margin-bottom app 4px vs prototype 24px. Real runs: plain CSS app 99; Tailwind 4 app 65 (target 80 not met). Prompt and value rules changed after that run; no real run tests them yet. Applying the listed values by hand scores 96.
- art-jsx: dark art from dark tokens, JSX/TSX prototypes get art, theme apply repaints in the same version. Real runs: 0% flat box on main and branch; only the branch shows dark art.
- layer-copy: Mod+C / Mod+V copy and paste layers, across files through insert_jsx.
- first-design: Home rotates starter briefs with "Tab to use"; Tab fills an empty prompt. The chat shows "Writing index.html" instead of "Starting" for the whole first run.
- polish-30: kit check finds labels and tables (the recipe reader change rewrites components.md for every app pack, Bonaparte included); one "Studio check:" note; fixture params; multi-select type keys step the scale; two page-load 404s fixed.
- Checks: gen-routes --check pass, typecheck 0 errors, lint:gate pass (59602, baseline 89733), build:ui pass, check:clip 0 findings, desktop:pack pass.
- Installed app: :4570 returns 200. Server idle CPU 0.02 CPU-s/min over 60 s.
- Open: Tailwind 4 route update at 65; /api/starters loads twice on Home; a second Mod+V pastes inside the new copy; old SVG art is not removed when a photo replaces it.
