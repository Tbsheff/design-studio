# Feature cycle 25: next 5 features

Date: 2026-11-13. Main at `a3e5f72ec` (all 5 cycle-24 picks and `fix/real-run-bugs` merged at `82c8de004`).

## Method

- Read `cycle-24.md` (picks, runners-up, Results), the 5 `cycle-24/*.md` reports ("Left out"), the runners-up and Results "Open" lines of cycles 18 to 23, `artifacts/real-runs/report.md` (Bugs, Fixes, Left) and `git log --oneline -120`.
- Read the agent run path that the fixed pick and the speed pick change: `server/agent/{final-check.ts,sdk-driver.ts,run-level.ts,skill-match.ts,tool-sets.ts,lean-run.ts,screenshot-trim-store.ts}` and `ui/features/chat/{context-share-model.ts,context-meter.tsx}`.
- Checked each candidate with narrow greps in `packages/common/{actions,contracts}/src` and `apps/desktop/src/{ui,server,bridge}`, and in Bonaparte (`git grep` on `*.tsx`, read-only, counts only).
- Proof of each gap:
  - Prototype check: `appReviewGaps` (`final-check.ts` line 217) returns `null` when `!ctx.project.app`. `changedFiles` (line 347) returns `[]` with no app, so even with the guard gone, `inChangedFile` drops every HTML finding. The context meter: `contextWindowFor` (`context-share-model.ts`) gives 1,000,000 only when the model name has `[1m]`; the `run.usage` event (`contracts.ts` line 769) carries `contextTokens` only.
  - First draft speed: the PROTOTYPE level (`run-level.ts` line 70) orders step 0 `TodoWrite` (deferred behind `ToolSearch` since the context fix, so one extra model turn), step 1 Skill loads "before you write any file" (`LOAD_ORDER`, `skill-match.ts` line 113), step 2 a 4-line brief, and only then step 3 the write. The real-run timeline: first usage 3.5 s, TodoWrite 4.5 s, 2 skills 5.0 s, thinking to 8.7 s, write starts (before the fix); 7.7 s after the fix.
  - Interaction check: the POLISH level says "every interactive element needs hover and focus-visible styles" (`run-level.ts`), and `prompt.ts` line 110 asks for "visible focus states", but no measured check reads hover rules, focus styles or image load state. `naturalWidth`, `:hover` and `focus-visible`: 0 hits in `server/review`, `server/preview/quality*.ts` and `check-tool.ts`. `REVIEW_KINDS` has no such member.
  - Multi rotate: cycle-24 rotate-handle "Left out": Shift+H and Shift+V with several layers selected are not done; the rotate zone shows for one layer only (cycle-24 runner-up 4). The multi editor (`inspector/use-direct-edits.ts`, `simple-multi-editor.tsx`) has no Rotation field.
  - Data states: `DATA_STATE_VARIANTS` (`contracts/src/state-styles.ts` line 35) has open, checked, selected (`data-[state=active]`) and selected-item only. Bonaparte `*.tsx` uses `data-[state=closed]:` 65 times, `aria-invalid:` 36, `data-[active=true]:` 36, `data-[disabled]:` 24, `data-[state=on]:` 18; 38 files use closed, on, active=true or disabled, 10 files use `aria-invalid:`. None of these reads back in the state picker.
- Checked and dropped as built: Selection colors (the Values section, `8a2908ae3` style-replace), line clamp count (`inspector/truncate-model.ts` reads and writes `line-clamp-N`), measure distances (`canvas/measurements.tsx`), blend modes (`fill/blend-select.tsx`), constraints and min/max (`inspector/constraint-rows.tsx`, `min-max-rows.tsx`), grid layout (`inspector/grid-section.tsx`), data fixtures (`feat/server-data-fixture` merged), `cn()`/`clsx` class edits (`tailwind/jsx-site.ts` `MERGERS`).
- Branch check: `git branch -a` has no `feat/prototype-check`, `feat/draft-first`, `feat/interaction-check`, `feat/multi-rotate` or `feat/data-states`. Near names that exist and are not used: `feat/edit-speed`, `feat/live-build`, `cyc3/feat-speed`, `feat/state-check`, `feat/edge-states`, `feat/rotate-flip`, `feat/rotate-handle`.
- Competitor recheck (1 web search, 2026-11-13): no item dated November 2026 for Claude Design, Figma Make, v0, Lovable, Bolt, open design or doop. The newest items are Figma Make's GitHub integration (July), the v0 API GA (August) and Lovable's project count (August). No pick comes from a new competitor feature. Claude Design reviews still credit its first-result polish (type, states, real images), which picks 1 and 3 aim at.
- Skipped as the user's decision: the panel rail until edit mode, the Home cuts, the MCP snapshot approvals from cycles 14 to 24, the MCP names with repeated words.
- `fix/idle-chrome` (agent `idle-chrome-fix`, this session) still owns headless Chrome launch and `get_screenshot`. No pick changes a page launch. Picks 1 and 3 use `preview.withPage` the way `review/run.ts` does today.

## Ranking

Score = user value x fit with "simple and fast" / effort (1 to 5 each). Rank by value first; the score breaks ties.

| Rank | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|
| 1 | prototype-check: the studio's final review runs on HTML prototypes too, plus the true context window and a smaller per-run growth (fixed pick, AI quality) | 5 | 5 | 3 | 8.3 |
| 2 | draft-first: write the first draft before plan and skills, to reach 5 s (AI speed) | 5 | 5 | 2 | 12.5 |
| 3 | interaction-check: measured hover, focus and broken-image findings (AI quality) | 4 | 5 | 2 | 10 |
| 4 | data-states: Closed, On, Invalid and Radix Disabled in the state picker (Bonaparte) | 4 | 5 | 2 | 10 |
| 5 | multi-rotate: rotate and flip a multi-selection (Figma) | 3 | 5 | 2 | 7.5 |

No pick adds an always-visible control. Picks 1 and 3 show only through the chat run note and the existing Review panel; pick 2 changes the agent's step order; pick 4 adds choices to the existing state picker only on layers that can use them; pick 5 adds a Rotation field to the existing multi editor and reuses the hover-only rotate zone.

---

## 1. prototype-check: the final review runs on HTML prototypes (fixed pick)

**Why.** The studio final check (`review_frame` at the frame size and at 390 px, with the cycle-24 type and spacing findings) runs only when the project has an attached app. Most first results are HTML prototypes, so they never get the measured type, contrast, tap-target and clipped findings unless the agent calls `review_frame` itself, which PROTOTYPE runs do not ask for. Bundle: the chat meter divides by 200k while the SDK reports a 1M window for `claude-sonnet-5-5`, so it warns at 39% of a window that is really 8% full; and each run still adds about 26k tokens, mostly old screenshots.

**UI behaviour.**
- No new control. After an HTML prototype run in PROTOTYPE or POLISH level, the run note in the chat reads "Studio check: N finding(s) on changed lines, a fix loop ran" (or "no fix loop"), the same note app runs show today (`appReviewNote`).
- The fix loop starts only when a medium or high finding sits on a line the run changed. A run with no such finding gets no extra model turn, so a clean run is as fast as today. The studio skips the mobile screenshot when the agent already took one after its last edit (today's `gaps.mobile` rule).
- Not on: WIREFRAME runs (that level says no screenshots, no design_review), lean runs, ask and critique modes, failed or stopped runs.
- The context meter divides by the window the SDK reports. On `claude-sonnet-5-5` the tip reads "52,291 of 1,000,000 tokens in context" and the ring stays hidden under 50%. With no reported window it keeps today's model-name rule.

**Agent loop.**
- New `server/agent/prototype-review.ts`: `toPrototypeReviewGaps(ctx, run, toolOrder)` for HTML projects (no `project.app`, `request.mode === "edit"`, a target and a preview url, an edit after the last `review_frame`, level not WIREFRAME), and the changed lines from `changedLinesSince(ctx.direction.workTree, ".", run.startedAt, baseFile)`. The agent checks that HTML finding sources (`index.html:12:5`) match the `changedEntry` regex and that the paths are relative to the same root.
- `studioAppReview` and `reviewItems` take the changed-files list as an input, so the HTML path reuses them with no copy. `appReviewPrompt` gets an `isPrototype` flag: the opening line says "You finished a prototype run without review_frame, so the studio ran it." The rest of the text is the same.
- `sdk-driver.ts` `appReviewPass`: one call site picks `appReviewGaps` or `toPrototypeReviewGaps`. Offset line for line: `sdk-driver.ts` (1649), `final-check.ts` (586) and `lifecycle.ts` (1077) may not grow (L2a), so new code goes in `prototype-review.ts`.
- Report the cost in the pick report: seconds and tokens added per run, clean run and run with findings.

**Context meter.** The SDK result message reports `modelUsage[<model>].contextWindow` (the agent checks the SDK type in `@anthropic-ai/claude-agent-sdk` first). `sdk-driver.ts` passes it to `sink.usage(contextTokens, contextWindow)`; `lifecycle.ts` emits `run.usage` with `contextWindow: number | null`. The `run.usage` member is on one line of `contracts.ts` (over 2000 lines, may not grow): add the field on that line. `ui/features/chat/{run-state-model.ts,use-chat-state.ts}` keep the last window, and `contextShare` and `contextWindowFor` in `context-share-model.ts` take it, with the model-name rule as the fallback.

**Per-run growth.** Measure the 26k by part first (text, tool results, images) from the session file. Then make the one safe cut the numbers point at. The report says old screenshots are the largest part. Two choices, the agent picks one and names the cache cost:
- At the start of a new run (a new user turn, where the prompt cache already breaks for the new message tail), drop the screenshots of runs before the last one with the existing trim in `screenshot-trim-store.ts`, not only when the cache is cold. Images the user attached stay.
- Or send agent screenshots at a capped size: JPEG and at most 1280 px on the long side, as `critic.ts` line 319 does for mobile. Image tokens grow with pixel count, so a 1440 x 2400 full page costs far more than a 1280 x 800 view.

**Headless.** No new action and no MCP tool change. The fix loop is the in-app agent path only; MCP callers already call `review_frame` (`direct-edit.runReview`) themselves. No snapshot diff. `run.usage` is an SSE event, not an MCP output.

**Main files.** New `server/agent/prototype-review.ts`; `server/agent/final-check.ts` (signatures of `studioAppReview`, `reviewItems`, `appReviewPrompt`; no growth); `server/agent/sdk-driver.ts` (the `appReviewPass` call site and `contextTokensOf`/usage only); `server/agent/lifecycle.ts` (the `usage` sink); `server/agent/screenshot-trim-store.ts` or the screenshot tool result in `server/agent/tools.ts`; `packages/common/contracts/src/contracts.ts` (the `run.usage` line only); `ui/features/chat/{context-share-model.ts,context-meter.tsx,run-state-model.ts,use-chat-state.ts}`. No `copy.ts` change (the tip text stays a template).

**Verify in the running app** (`STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev`).
- Mock agent, HTML project: seed a page with 10 font sizes and a 3-line paragraph at `line-height: 1.1`, run a PROTOTYPE edit that touches those lines. The run log shows the studio review and a fix-loop prompt that starts "You finished a prototype run"; the chat note lists the findings. A run whose changed lines have no medium or high finding: no extra turn (run log `continuations` unchanged).
- WIREFRAME and lean runs on the same project: no studio review.
- An attached fake app run: the app path still runs as before (same note text).
- Real model, one short session of 2 runs (the SDK uses the local Claude Code sign-in): a blank "pricing page" HTML prototype, then one follow-up. Report: the final check fired on run 1 (or why not), seconds and tokens it added, context tokens at the end of runs 1 and 2 against the report's 52,291 and 78,394, and the meter tip shows 1,000,000.
- Dark and light screenshots of the chat note and the meter tip.

---

## 2. draft-first: the first draft before the plan and the skills (AI speed)

**Why.** The first draft lands at 7.7 s; the target is 5 s. The report found no cheap cause left outside the model, and the model waits on three things the studio asks for before any write: a `TodoWrite` call (now behind a `ToolSearch` turn), 2 Skill loads, and a 4-line brief. Open design and doop start streaming the page almost at once. Moving the plan and the skills after the first write lets the page start streaming at about 5 s, and the skills still shape the fix round.

**UI behaviour.**
- No new control. On a PROTOTYPE or POLISH run that writes a new page (no file yet at the target, or a blank project), the draft frame starts to fill sooner. The plan list in the chat appears after the first write instead of before it.
- The brief stays, cut to 2 lines (audience and primary action; content and density move into the plan), because it is plain text and costs under a second.
- Runs that edit an existing page keep today's order: plan, skills, brief, edit.

**Agent loop.**
- `run-level.ts`: a `FIRST_DRAFT_ORDER` for new-page runs: 0. 2-line brief; 1. write the first full page in one Write (real content, the tokens, the layout); 2. `TodoWrite` with the remaining steps; 3. Skill loads; 4. render_check and the rest as today. The old order stays for edit runs. `run-level.ts` is 199 lines, so it may grow.
- `skill-match.ts` `LOAD_ORDER`: for new-page runs say "after your first draft, before the fix round" in place of "before you write any file". The studio picks the text from a new boolean in the request context (`isNewPage`); the agent finds where the run level already knows the target is empty (`ctx.target` and the project files) and adds the boolean in `run-level.ts`'s `RunLevelContext`, not in `sdk-driver.ts`.
- Does not touch `tool-sets.ts`, `sdk-driver.ts` or the builtin list. If the agent finds that `TodoWrite` can be loaded up front (not deferred) with one change, it reports it and leaves it for the merge step, because `sdk-driver.ts` belongs to pick 1 this cycle.

**Headless.** No new action and no MCP change. The order is an in-app agent prompt change only.

**Main files.** `server/agent/run-level.ts`, `server/agent/skill-match.ts`, and the line in `server/agent/prompt.ts` that builds `RunLevelContext` if the boolean is set there (the agent names it; net 0 lines in `prompt.ts`, 482). No `copy.ts`.

**Verify in the running app.**
- Mock agent: the system prompt of a blank project run lists the new order; an edit run on an existing page lists the old one (read the run log `system` text).
- Real model, one short run before this branch and one after (2 runs; local Claude Code sign-in): a blank "bakery landing page" HTML prototype. Report time to first draft bytes from `run.started` (target 5 s, was 7.7 s), time to `isComplete`, and the number of type findings from `review_frame` on both, so a faster draft is not a worse one. If the after run is slower to finish by more than 20%, say so.
- Dark and light screenshots of the draft frame at 5 s.

---

## 3. interaction-check: measured hover, focus and broken-image findings (AI quality)

**Why.** A first result looks unfinished when its buttons do not react on hover, when focus rings are gone, or when an image is a broken box. The prompt asks for hover and focus-visible states, but only the model critic looks, from a still screenshot that cannot show hover. These are facts the page can measure. With pick 1, the findings reach the fix loop on every HTML prototype run at no extra model cost.

**UI behaviour.**
- The Review panel lists two new groups with the existing finding rows: "Hover and focus" and "Broken images". No new section, no button.
- Findings (visible elements in the frame only):
  - No hover style: a `button`, `a[href]`, `[role=button]`, `summary` or submit input that no stylesheet rule styles under `:hover` (rules inside `@media (hover: hover)` and layer blocks count) and whose class list has no `hover:` class (medium for buttons, low for text links inside a paragraph). One finding per element, with `selector` and `source`.
  - Focus removed: the element's focus style (outline and box-shadow after `focus({ focusVisible: true })`) equals its normal style, and the rules set `outline: none` or `outline-hidden` (high). No direct fix; the message says "Add a focus-visible ring".
  - Broken image: an `img` with `complete && naturalWidth === 0`, or a CSS `background-image` url that failed to load (high). The message names the url. No direct fix; the message names `set_image` and image search.
  - Emoji as icon: an element whose only text is 1 or 2 emoji inside a button, list marker or heading (low).
- Direct fix only for "No hover style" in Tailwind projects with a fill: `hover:` plus the next darker step of the same color token, as one `apply_fix` and one undo step; else `fix: null`. Attached apps: token classes only, never an arbitrary value.

**Headless.** No new action. Add `"interaction"` and `"broken-image"` to `REVIEW_KINDS` and `REVIEW_KIND_LABEL` in `contracts/src/review.ts`. `review_frame` (`direct-edit.runReview`) and `apply_fix` (`direct-edit.applyReviewFix`) serve them. The `review_frame` description adds "hover and focus styles and broken images" (stays under 600 chars). Description diff; user decision at merge. The in-app agent tool help (`agent/tool-help.ts`) lists the type, interaction and broken-image kinds (the type-rhythm left-out).

**Main files.** `packages/common/contracts/src/review.ts` (2 union members, 2 labels); new `server/review/interaction-probe.ts` (a String.raw source; a `*.probe.ts` sibling listed in `tsconfig.server-probe.json` only for a typed in-page function, W16, W17, W21); new `server/review/engine/interaction.ts` (pure, W8a) and one export line in `server/review/engine/index.ts`; `server/review/run.ts` (424: one probe call and one spread line; offset to stay flat); `packages/common/actions/src/direct-edit/run-review.ts` (description); `server/agent/tool-help.ts`. UI: no new component; if the panel needs a tip, one `interactionKind` key in `ui/features/review/copy.ts`.

**Verify in the running app.**
- HTML project seeded with a button with no hover rule, a button with `outline: none` and no focus rule, an `<img src="missing.png">`, a `background-image: url(gone.jpg)` box and a button whose text is one emoji. Review lists each under the right group and severity. A well-made page (hover rules, focus rings, loaded images): no findings.
- Tailwind fake app: a `bg-blue-600` button with no `hover:`; Apply fix writes `hover:bg-blue-700`, Cmd+Z undoes it in one step. A button styled by `hover:` in a `@media (hover: hover)` rule: no finding.
- MCP `review_frame` on the seeded frame: the same findings with `kind: "interaction"` and `"broken-image"`. `pnpm exec tsx scripts/call-action.ts direct-edit.runReview '<json>'`: HTTP, MCP and agent outputs match.
- After pick 1 merges: a mock run on the seeded HTML project shows the high findings in the studio fix-loop prompt.
- Bonaparte (read-only, route copy beside the app, when a route renders): count findings per kind, to check the hover check is not noisy on shadcn buttons. Bonaparte `git status --short` unchanged.
- Dark and light screenshots of the Review panel with both groups.

---

## 4. data-states: Closed, On, Invalid and Radix Disabled in the state picker (Bonaparte)

**Why.** Bonaparte styles Radix and shadcn parts through data attributes: `data-[state=closed]:` 65 uses, `aria-invalid:` 36, `data-[active=true]:` 36, `data-[disabled]:` 24, `data-[state=on]:` 18. The state picker reads open, checked and selected only, so a closing animation, a toggled toolbar button, a sidebar active item or a form error style cannot be seen or edited from the UI, MCP or the in-app agent, and an edit on such a layer can look like it changed nothing.

**UI behaviour.**
- The state picker adds Closed, On, Active item and Invalid, each shown only when it fits: Closed and On when the layer has a `data-state` attribute (or already uses the class), Active item when the layer has `data-active` (or the class), Invalid on `input`, `textarea`, `select` and `[role=combobox]` (or the class). Other layers show the list as today.
- Writes: Closed `data-[state=closed]:`, On `data-[state=on]:`, Active item `data-[active=true]:`, Invalid `aria-invalid:`. Breakpoints combine as today (`md:aria-invalid:border-red-500`).
- Disabled on a layer that already uses `data-[disabled]:` (Radix menu items) writes `data-[disabled]:`, not `disabled:`, and reads both.
- Show on the canvas: forcing sets the attribute (`data-state="closed"`, `data-state="on"`, `data-active="true"`, `aria-invalid="true"`) and puts the old value back, through the same force path as open and checked.
- Any other `data-[k=v]:` or `aria-*:` prefix on the layer shows read-only in the state stack as its prefix text, so nothing is hidden. Not editable (runner-up).
- CSS projects: `[data-state="closed"]`, `[data-state="on"]`, `[data-active="true"]`, `[aria-invalid="true"]` rules through `variant-css.ts`.

**Headless.** No new action. Add `closed`, `on`, `active-item` and `invalid` to `STYLE_STATES`, and the 4 prefixes to `DATA_STATE_VARIANTS` (invalid as its own `ARIA_STATE_VARIANTS` entry). `set_state_style`, `list_state_styles` and `set_forced_state` take them. `list_state_styles` returns the read-only prefixes in a new `other: readonly string[]` output field. Descriptions name the new states (under 600 chars). Input enum, output and description diffs for those 3 tools; user decision at merge.

**Main files.** `packages/common/contracts/src/state-styles.ts` (`STYLE_STATES`, `DATA_STATE_VARIANTS`, `ForcedStatePart`, `StateListResult`); `server/style-scope/engine/state-scope.ts`; `server/direct-edit/engine/variant-css.ts`; `server/state-styles/*` (the fit check); `packages/common/actions/src/state-style/{set.ts,inspect.ts,set-forced.ts,schema.ts}`; `bridge/force-state.ts` (stays under 500); `ui/features/state-styles/{state-styles-model.ts,copy.ts}` (one `dataStates` block).

**Verify in the running app.**
- React fake app with a shadcn-style `Tabs` trigger (`data-state="inactive"`) and a toggle (`data-state="off"`): select the toggle, pick On, set fill: `data-[state=on]:bg-accent`; Show forces `data-state="on"` and the fill shows; Cmd+Z one step.
- A `div` with `data-state="open"` and `data-[state=closed]:opacity-0`: Closed shows in the list with opacity 0; edit it to 50: `data-[state=closed]:opacity-50`.
- An `input` with `aria-invalid:border-red-500`: Invalid reads the red border; Show sets `aria-invalid="true"`. A `p`: no data states.
- A menu item with `data-[disabled]:opacity-50`: Disabled reads 50; edit writes `data-[disabled]:`. A plain button: Disabled writes `disabled:` as today.
- A layer with `data-[side=top]:mt-1`: listed read-only as `data-[side=top]`.
- HTML project: Invalid border writes a `.sv-xxxxxx[aria-invalid="true"]` rule.
- MCP `set_state_style` `state: "on"`, then `list_state_styles`: listed, with `other`. `pnpm exec tsx scripts/call-action.ts state-style.set '<json>'`: 3 surfaces match.
- Bonaparte (read-only `git grep`): count the `data-[state=closed]`, `data-[state=on]`, `data-[active=true]`, `data-[disabled]` and `aria-invalid` uses that read as a state. Bonaparte `git status --short` unchanged.
- Dark and light screenshots of the picker on a toggle.

---

## 5. multi-rotate: rotate and flip a multi-selection (Figma)

**Why.** In Figma, Shift+H flips every selected layer, the rotation field shows "Mixed" for a mixed selection, and the corner zone rotates the whole selection. Cycle 24 gave one layer a rotate zone and flip keys; with several layers selected, Shift+H flips one or none and the multi editor has no rotation. Rotating a set of icons or badges needs one click per layer.

**UI behaviour.**
- Shift+H and Shift+V with several layers selected flip each one in one write and one undo step. The layer menu flip items and the Cmd+K flip commands do the same.
- The multi editor shows the Rotation field: the shared value, or "Mixed" (the existing `copy.mixed`). Typing 15 sets 15 degrees on each layer; one undo step. Enter blurs the field, as in the single field.
- The rotate zone shows just outside the corners of the multi-selection box. Drag rotates each layer by the same delta around its own center (Figma rotates the group around one center; that needs a move, so it is out of scope and named in the report). Shift snaps to 15 degrees; Escape cancels; one write on release.
- Not on: frames, locked layers (same rules as today), selections that cross frames.

**Headless.** No new action. The flip and the field use `batch_edit` (`direct-edit` batch) with `rotate` or `scale` per layer, as the single path uses `edit_element`. No snapshot diff.

**Main files.** `ui/features/inspector/{use-rotation.ts,flip-model.ts,simple-multi-editor.tsx}` and new `inspector/multi-rotation-field.tsx` with `use-multi-rotation.ts`; `ui/features/canvas/{use-rotate-drag.ts,rotate-drag-model.ts,resize-handles-model.ts}` (multi-selection box); the flip items in `canvas/preview-menu-create.ts`; `bridge/keyboard.ts` if Shift+H forwards only one layer. Copy: none new expected; if needed one key in `canvas/copy.ts` (362). `inspector/copy.ts` (437) is near 500: add no block there.

**Verify in the running app.**
- Tailwind fake app with 3 `<svg className="size-6">` icons. Select all 3, Shift+H: each gets `-scale-x-100`; one Cmd+Z undoes all 3. Shift+V the same with `-scale-y-100`.
- Rotate one to 45; select all 3: the field shows Mixed. Type 15, Enter: each gets `rotate-15`; one undo. Shift+H right after Enter flips them (focus left the field).
- Drag outside a corner of the selection box with Shift: each icon turns by 30 around its own center; release writes 3 rotations in one write; Escape mid-drag writes nothing.
- HTML project: the field writes `rotate: 15deg` on each layer.
- `pnpm exec tsx scripts/call-action.ts` on the batch edit action with 3 `rotate` edits: 3 surfaces match.
- Dark and light screenshots of the multi editor with Mixed and of the drag.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 prototype-check | new `server/agent/prototype-review.ts`; `server/agent/{final-check.ts,lifecycle.ts,screenshot-trim-store.ts}`; `server/agent/sdk-driver.ts` (only pick); `server/agent/tools.ts` if the screenshot size cut is chosen; the `run.usage` line of `contracts/src/contracts.ts`; `ui/features/chat/{context-share-model.ts,context-meter.tsx,run-state-model.ts,use-chat-state.ts}` |
| 2 draft-first | `server/agent/{run-level.ts,skill-match.ts}`; one line in `server/agent/prompt.ts` if the context boolean is set there |
| 3 interaction-check | `contracts/src/review.ts`; new `server/review/{interaction-probe.ts,engine/interaction.ts}`; `server/review/{run.ts,engine/index.ts}`; `actions/src/direct-edit/run-review.ts` (description); `server/agent/tool-help.ts`; `interactionKind` key of `ui/features/review/copy.ts` (if needed); `tsconfig.server-probe.json` include (if a probe sibling) |
| 4 data-states | `contracts/src/state-styles.ts`; `server/style-scope/engine/state-scope.ts`; `server/direct-edit/engine/variant-css.ts`; `server/state-styles/*`; `actions/src/state-style/*`; `bridge/force-state.ts`; `ui/features/state-styles/{state-styles-model.ts,copy.ts}` |
| 5 multi-rotate | `ui/features/inspector/{use-rotation.ts,flip-model.ts,simple-multi-editor.tsx,multi-rotation-field.tsx,use-multi-rotation.ts}`; `ui/features/canvas/{use-rotate-drag.ts,rotate-drag-model.ts,resize-handles-model.ts,preview-menu-create.ts}`; `bridge/keyboard.ts` (if needed) |

Shared files and conflict warnings:
- `server/agent/*`: pick 1 owns `sdk-driver.ts`, `final-check.ts`, `lifecycle.ts`, `screenshot-trim-store.ts`; pick 2 owns `run-level.ts`, `skill-match.ts`; pick 3 owns `tool-help.ts`. Pick 2 must not edit `sdk-driver.ts` or `tool-sets.ts`. Only pick 2 may touch `prompt.ts` (one line, net 0). Picks 1 and 2 both change what a PROTOTYPE run does at its end and start: merge 1 first, then rebase 2 and recheck the run log order.
- Copy files: pick 3 `ui/features/review/copy.ts` (one key, only if needed); pick 4 `ui/features/state-styles/copy.ts` (one block); pick 5 `ui/features/canvas/copy.ts` (one key, only if needed). Picks 1 and 2 add no copy. No two picks add to the same `copy.ts`. No pick adds to `inspector/copy.ts` (437).
- Unions and lists: pick 1 adds `contextWindow` to the `run.usage` member in `contracts.ts` (over 2000 lines: same line, no growth); pick 3 adds 2 members to `REVIEW_KINDS` and 2 entries to `REVIEW_KIND_LABEL` (`review.ts`); pick 4 adds 4 members to `STYLE_STATES` and entries to `DATA_STATE_VARIANTS` (`state-styles.ts`). Three different files.
- Import and export lines: pick 3 adds one import and one spread line to `server/review/run.ts` and one export line to `server/review/engine/index.ts`; no other pick edits them. Pick 1 imports `prototype-review.ts` in `sdk-driver.ts` only.
- Bridge: pick 4 owns `force-state.ts`; pick 5 owns `keyboard.ts` (if needed). Different files.
- `ui/features/inspector/*` and `ui/features/canvas/*`: pick 5 only.
- `artifacts/mcp-snapshots/*.json`: `review_frame` description (pick 3); `set_state_style`, `list_state_styles`, `set_forced_state` input, output and descriptions (pick 4). Picks 1, 2 and 5: none. Approve at merge (user decision), with the diffs that still wait from cycles 14 to 24.
- `.claude/goal/roadmap.md` Appendix A: add each pick's new globs before its slice runs (L6e), when the roadmap is in the worktree (cycles 23 and 24 found it was not).

## Merge order

All 5 can run at once. Merge 1 (prototype-check: the agent end-of-run path and the meter; no gen-routes), then 3 (interaction-check: its findings now reach HTML runs through pick 1; gen-routes for the description; rerun the mock fix-loop check), then 2 (draft-first: rebase over pick 1, read one run log to check the new start order and the studio check at the end both hold), then 4 (data-states: gen-routes), then 5 (multi-rotate: UI and bridge only). After the last merge run `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run check:scripts`, `pnpm run lint:gate`, `pnpm run build:ui` and `pnpm exec tsx scripts/check-bundle.ts`, then one real-model session of 2 runs on a blank HTML prototype to report first-draft time, the studio check and context growth on the merged main.

Real-model checks (local Claude Code sign-in, short runs): pick 1 (2 runs: final check, tokens added, meter at 1M), pick 2 (2 runs: before and after first-draft time), and the final merged session. Picks 3, 4 and 5 need none.

## Runners-up

1. Starter look: a blank prototype's first run builds 3 theme candidates and writes the first as `tokens.css`; still needs a starter token base because `theme-run.ts` line 75 fails with no tokens.
2. Load `TodoWrite` up front (not deferred behind `ToolSearch`) to save one model turn, after pick 2 measures what is left and pick 1 frees `sdk-driver.ts`.
3. Rotate a multi-selection around one shared center (true Figma group rotate), after pick 5.
4. Editable `data-[side=*]`, `data-[orientation=*]` and `group-data-[collapsible=icon]` states (Bonaparte 11 to 58 uses), after pick 4 lists them read-only.
5. Draft layer hidden while "Checking your dev server" covers the stage, also on state frames (real-runs "Left").
6. Sequence line names a skipped state, board labels stale after a re-pin, and the 404 on page load (real-runs bugs 5, 6, 9).
7. Enter in an effect number field writes twice ("The layer already has these effects"), shadow-scale left out.
8. Rotate zone and Rotation field write the picked breakpoint or state, not only the base style (rotate-handle left out).
9. Frame fit to content (Figma "Resize to fit"); waits for `fix/idle-chrome`.
10. "App now" label on `page.importSource` frames (route-sync left out since cycle 16).

Sources: [mcp.directory 2026 comparison](https://mcp.directory/blog/claude-design-vs-stitch-vs-v0-vs-lovable-vs-figma-make-2026), [konigi.com Claude Design](https://konigi.com/articles/claude-design-has-the-incumbents-scrambling/), [monkfrom.earth Claude Design vs Figma, Lovable, v0](https://monkfrom.earth/blogs/claude-design-vs-figma-lovable-v0), [agentwiki comparison](https://agentwiki.org/_export/raw/claude_design_vs_figma_vs_lovable_vs_bolt_vs_v0).

## Results

- Merged with no conflicts, in order: prototype-check, interaction-check, draft-first, data-states, multi-rotate. Main at 4840c7267.
- Real-model session on merged main (`artifacts/real-runs/report-2.md`, 2 runs, $0.36): first draft 3.5 s (target 5 s, was 7.7-8.6 s); the studio check fired on an HTML prototype with 4 medium findings (one hover) and one fix loop fixed all 4; context 69k tokens of a 1M window after 2 runs.
- That session found 4 bugs, fixed in fix/run-log-bugs (main at c16cd9b06): the "Studio check:" line is kept in the run log; the screen check dedupes and skips screens the agent already shot; the 1M window survives a reload; replace_all edit drafts are full.
- Checks: gen-routes --check pass, typecheck 0 errors, lint:gate pass (59603, baseline 89733), build:ui pass, check:clip 0 findings (before the fix merge), desktop:pack pass.
- Installed app: :4570 returns 200. Server idle CPU 0.02 CPU-s/min over 60 s.
- Open: the screen check lost one image of a screen in one run. No shared-center group rotate. Tailwind writes rotate-[15deg], not rotate-15. Esc deselects but leaves a forced state on the frame. Screenshot token cut not built (breaks the prompt cache). MCP snapshots not refreshed (user decision).
