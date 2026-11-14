# Feature cycle 33: next 5 features

Date: 2026-11-14. Main at `b30747617` (all 5 cycle-32 picks merged at `c518923a1`).

## Method

- Read `cycle-32.md` (picks, runners-up, Results "Open"), `cycle-32/{port-proof,kit-cards,first-launch,size-keys,polish-32}.md`, the runners-up and Results of cycles 25 to 31 (13 to 24 through their carried-over runners-up), `real-runs/report{,-2,-3}.md`, the tail of `.claude/goal/feature-log.md`, `git log --oneline -120` and `git branch -a`.
- Read the code that each pick changes: `agent/prototype-kit-review.ts` (`isKitRun`, `TAG_WORDS`, `PLURAL_WORDS`), `components/kit-drift/engine/*`, `actions/kit-drift/schema.ts` (`KitDriftTagSchema`), `agent/port-review-snapshot.ts` (`createTree`, `restoreRouteSnapshot`, `toStartTag`, `hasRouteChange`), `agent/prompt.ts` (the Bash rule), `shared/keymap.ts`, `shared/keymap-edit.ts`, `desktop/menu.ts` (accelerators), `ui/features/inspector/{text-style-toggles.tsx,align-field.tsx,use-element-nudge.ts}`, `ui/features/versions-layers-tokens/{layers-list.tsx,layer-row-model.ts}`.
- Counted kit use in Bonaparte (read only): `apps/dashboard` imports `@workspace/ui/components/badge` 674 times; `<Badge` is in 480 files, `<Card` in 446, `<Button` in 538. `packages/ui/src/components/badge.tsx` is a `cva` recipe with variants `default`, `outline`, `secondary`, `info`, `success`, `warning`, `destructive`, `focus`, `invert`. Bonaparte has 46,860 tracked files.
- No real-model run and no measure for this research.

### Findings

- **Two real-model gates are still open** (cycle-32 Results "Open").
  - Port 80 gate: real run 1 scored 96 through the fix loop, but the values pass was refused (`no_base_version`, fixed later with mock proof only). Real run 2 wrote nothing: the agent's `sed -i` failed (macOS `sed -i` needs a suffix), and the agent did not load `apply_port` (it is behind `ToolSearch`; the ask was only in the prototype source). No real run has the values pass and the agent `apply_port` live.
  - Card fix loop: both real runs built one bordered stat strip, not 4 cards, so the card rule had nothing to find.
  - The prompt rule in `agent/prompt.ts` already says "not to rewrite files with sed", and the agent used `sed -i` anyway. So the next run must be designed so that the gates must trigger, not left to the model. Pick 1.
- **Figma gap: text style keys.** `Mod+B` (bold), `Mod+U` (underline), `Mod+Shift+X` (strikethrough) and `Mod+Alt+L`, `Mod+Alt+T`, `Mod+Alt+R`, `Mod+Alt+J` (text align) are not bound (`keymap.ts`, `keymap-edit.ts`, no `desktop/menu.ts` accelerator). The writes exist: `text-style-toggles.tsx` (underline, strike, italic) and `align-field.tsx`. `Mod+I` is "Ask the chat about the selection", so Figma italic stays unbound. Already built and dropped: opacity digits, font size, letter spacing, line height keys, resize keys, select siblings, copy and paste style, selection colors, Alt drag copy, flip, align, distribute, tidy up. Pick 2.
- **AI quality: badges.** The prototype kit check finds buttons, inputs, labels, tables and cards, but not badges and status pills. In Bonaparte, Badge is the most imported kit part after Button, and its variants carry the status tones (`info`, `success`, `warning`, `destructive`). A dashboard prototype beside Bonaparte with hand-styled green and red pills passes the check today, and Move to app then ports raw colors. `KitDriftTagSchema` has no `badge` (runner-up in cycles 30 and 31 with cards). Pick 3.
- **Bonaparte: the port snapshot writes into the app repo.** `createTree` (`port-review-snapshot.ts`) copies the app index to a temp file, then runs `git add -A` and `write-tree` in the app work tree. `git add` writes a loose object for each changed and untracked file into the app's own `.git/objects`. Since cycle 32 this also runs at every `port.start` (`toStartTag`), on the whole work tree, with a 60 s timeout. On a repo the size of Bonaparte that is a write into the user's repo with no opt-in, and a wait before the run starts. Runner-up 5 in cycle 32. Pick 4.
- **Small open items** (pick 5):
  - The Layers panel highlights only the last selected row (`layers-list.tsx` takes one `selectedNode`); the canvas and inspector show all (cycle-32 Results, polish-32 "Left out").
  - `Mod+Arrow` on a Tailwind layer with no size class writes an arbitrary class (`w-[241px]`) also when the new size is on the theme scale (size-keys "Left out").
  - The early window freezes the `--studio-boot` marks, so the `app.start` telemetry detail lost `serverReady` (first-launch "Left out").
- **Not picked (user decisions, forbidden files or not small):** panel rail, Home cuts, MCP snapshot refresh, frame fit to content (100vh), lazy tool registries and the closed MCP request in a `get_run` wait (hand aggregators), `Mod+]` and `Mod+[` (DOM order against z-index decision), starter pills with AI (Home cuts decision).
- **Competitor recheck (2 web searches, 2026-11-14).** Figma release notes: Figma Make imports npm packages, so a prototype can use design system components, and variables import and export roll out in November. This is the same bar as picks 1 and 3: a prototype must use the real kit. Nothing new found for Claude Design, v0, Lovable, Bolt, open design or doop since the cycle-32 recheck. Figma's text shortcuts (`Mod+B`, `Mod+U`, `Mod+Alt+L/T/R/J`) confirmed for pick 2.
- **Branch check.** No `feat/real-proof`, `feat/text-keys`, `feat/kit-badges`, `feat/port-objects` or `feat/polish-33`. Near names that exist and are not used: `feat/port-proof`, `feat/kit-cards`, `feat/kit-drift`, `feat/kit-check`, `feat/text-lists`, `feat/text-wrap`, `feat/polish-32`.

## Ranking

Score = value x fit with "simple and fast" / effort (1 to 5 each).

| Rank | Key | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|---|
| 1 | real-proof | Fake apps and prompts built so the port 80 gate and the card fix loop must trigger; about 6 short real runs; fix what they show | 5 | 5 | 3 | 8.3 |
| 2 | kit-badges | The prototype kit check finds hand-styled badges and status pills and maps them to the app Badge variant (AI quality) | 4 | 5 | 3 | 6.7 |
| 3 | port-objects | The port snapshot writes no object into the app repo and does not delay Move to app on a Bonaparte-size repo | 4 | 5 | 2 | 10 |
| 4 | text-keys | `Mod+B`, `Mod+U`, `Mod+Shift+X` and `Mod+Alt+L/T/R/J` set text style and align (Figma) | 3 | 5 | 2 | 7.5 |
| 5 | polish-33 | All selected rows highlighted in Layers, resize keys snap to the Tailwind scale, `serverReady` back in boot telemetry | 3 | 5 | 1 | 15 |

No pick adds an always-visible control:
- Pick 1 changes fixtures, prompts and run code only.
- Pick 2 changes the kit check and its note.
- Pick 3 changes where git writes the snapshot.
- Pick 4 adds keys (shown only in the shortcut sheet).
- Pick 5 fixes existing paths.

---

## 1. real-proof: make the port 80 gate and the card fix loop trigger in real runs

**Why.** Two cycles of port work and one of card work have only mock proof. The last real runs failed for reasons the plan did not control: a failed `sed -i`, an ask hidden in the prototype source, a strip in place of cards. This pick designs the fixtures and prompts so that each gate must fire, runs them fresh, and fixes what the runs show.

**Behaviour.**
- **Fixture A, port gate: `ds-wt/rp-next-tw`.** Next 16, Tailwind 4.2, built as `pp-next-tw` (dereferenced `node_modules` copy; never Bonaparte). One route `/visits`:
  - The app route has 3 known value diffs against the prototype: the `h1` has `mb-1` (4 px) and the prototype has `margin-bottom: 24px`; the stat row has `gap-2` (8 px) against 24 px; the list card has `p-2` (8 px) against 16 px.
  - The prototype also has one new text line the app lacks ("Today, 12 visits"). So the agent must write the route, and the studio check must run on a changed route file, whatever tool writes it.
  - Before each run, `port.inspect` with no model: start score 55 to 70; else rebuild the copy. Each run gets its own app copy (`rp-next-tw-1` and on, from one prepared copy) and its own studio data folder.
  - Attach the copy and save its first version before the run (`no_base_version` must not show in the log).
- **Fixture B, card loop: `ds-wt/rp-kd-next`.** A copy of `ds-wt/kd-next` (Card, Button, Input, Label, Table recipes). Two starts:
  - B1, seeded: a prototype beside the app with 4 hand-styled stat cards (Tailwind classes: border, `rounded-xl`, `bg-white`, `p-4`, 2 children) and a visit list. The kit check scans the whole page in an edit run (`isKitRun`: kit prototype and `mode: "edit"`), and `listPrototypeDrift(project, workTree, null)` scans the whole page with no changed-line filter (checked), so the 4 seeded cards are found on the first pass whatever the model writes.
  - B2, fresh: a new prototype beside the app, with no seed.
- **Runs (budget 6, short, Sonnet, local sign-in).**
  1. A1, branch: Move to app of the fixture A prototype onto `/visits`. Gate: the values pass runs (log line), the studio score after it is **80 or more**, the run log shows `resume: null`.
  2. A2, branch: the same on a fresh copy, with the ask in the run prompt (a queued user message, not the prototype source): "Call apply_port with routePath /visits, then inspect_port." The ask says to call `apply_port` before any other route write. Gate: the agent's `apply_port` has no refusal, and either returns `applied` with 1 or more items, or returns `applied: []` because the values are already there and `inspect_port` is 80 or more (an empty list after an Edit write is correct, as in cycle 32: 95 -> 95).
  3. B1, branch: edit run on the seeded prototype: "Add a fifth stat card for no-shows; keep the visit list." Gate: first kit pass lists 4 or more cards, a fix loop runs, final scan has **0 hand-styled cards** and 5 kit Cards (`data-slot="card"`).
  4. B2, branch: new prototype: "A clinic dashboard: 4 separate stat cards in a row, each with a label, a number and a trend line, and a visit list below." Gate: final scan 0 hand-styled cards. Record the first-pass finds; 0 finds because the agent used the kit Card from the start is a pass, and the report says so.
  5 and 6. Reserve: re-run a failed gate once after its fix.
- **Fixes the runs may show** (fix them in this pick, inside the owned files; report each with the run that showed it):
  - The agent writes with `sed -i` and it fails on macOS. Fix seam: `agent/bash-edits.ts` sees a failed `sed -i` with no suffix and returns a tool note "Use Edit to change files", or the Move to app prompt (`agent/port-route-update.ts`) names Edit for route writes. Do not add text to the shared `prompt.ts` Bash rule.
  - The agent does not find `apply_port` (behind `ToolSearch`). Fix seam: the Move to app prompt names `mcp__studio__apply_port` as the tool to write paired values, so the agent loads it.
  - The values pass or keep-best does not run on a real write: write the cause from the run log first.
  - The card find does not fire on what a real agent writes (for example a `<style>` rule with an element selector): extend `engine/to-card-drift.ts` only. A fix that needs another engine file goes in the report under "Left out" (pick 2 owns the shared engine files).
- Report per run: first and last score, values written, loops, tools used to write, `apply_port` result, card finds per pass, kit Card uses, seconds and cost. Dark and light screenshots of the run notes.

**Headless.** No new action or tool. `start_port`, `apply_port`, `inspect_port`, `list_kit_drift` keep their schemas. If the `apply_port` `short` text changes, keep it 20 to 160 chars (E8) and run `pnpm exec tsx scripts/gen-routes.ts`.

**Main files.** `agent/{port-route-update.ts,port-start.ts,port-review.ts,port-review-pass.ts,bash-edits.ts,mock-port.ts}`, `components/kit-drift/engine/to-card-drift.ts`, the card lines of `agent/prototype-kit-review.ts`. Not `agent/port-review-snapshot.ts` (pick 3 owns it). `port-start.ts` is at 499 lines: move a block out before any line is added (L2, L2a).

**Verify in the running app.** The no-model checks first: `port.inspect` start score on each copy, a mock `[port-bash]` run on fixture A (values pass, 80 or more), `call-action.ts kit-drift.list` on B1 (4 card finds). Then the 4 to 6 real runs above. Real runs only into the `ds-wt` fixtures, never Bonaparte.

---

## 2. kit-badges: the prototype kit check finds hand-styled badges (AI quality)

**Why.** A prototype beside an app must use the app kit, so Move to app maps it to real parts. Status pills are in almost every dashboard and list, and in Bonaparte the Badge is the second most used kit part (674 imports) with status tones as variants. Today a hand-styled `bg-green-100 text-green-800 rounded-full px-2` pill passes the check and its raw colors reach the app.

**Behaviour.**
- `KitDriftTagSchema` gets `badge`. The markup drift engine flags an inline-level or small element (`span`, `div`, `a` with no `href` role of a button, `p`) as a hand-styled badge when:
  - the app kit has a Badge recipe (`to-component-recipes.ts`, `cva` named `badgeVariants` or a component named `Badge`);
  - the element has a radius (`rounded-*` or `border-radius`), a background or a border, horizontal padding, and a small text size (12 to 14 px or `text-xs`, `text-sm`);
  - its text is short (1 to 3 words, 24 chars or less), with no element child except one icon or dot;
  - it is not already a kit Badge (`data-slot="badge"` or all Badge base classes), and it is not a button, link button, input or card (those tags win).
- **Variant pick.** The find has a new `variant` field (`string | null`; null for every other tag) with the closest variant from the recipe, by the hue of the background or text: red to `destructive`, amber or yellow to `warning`, green to `success`, blue to `info`, border with no background to `outline`, neutral gray to `secondary`, else `default`. Only variants that the recipe has; else `default`.
- The prototype kit review lists badges with the other controls, grouped as now. Its fix line: "Replace the hand-styled badge with the app Badge (variant <name>); keep the text." It gives the Badge recipe classes and `data-slot`. The fix loop rule does not change.
- A pill inside a table cell is flagged (status columns are the common case); a pill inside a kit Badge is not.
- No UI change. The finds show in the existing "Studio check" note.

**Headless.** No new action. `kit-drift.list` (`list_kit_drift`) returns `tag: "badge"` finds with the new `variant` field. `parts` keeps its one meaning (Card sub-parts) and is empty for a badge (N0: one word means one thing). The tool is in no MCP snapshot and its input does not change. If the description names badges, keep 20 to 600 chars (E10; it is at 588, so shorten another clause) and run `pnpm exec tsx scripts/gen-routes.ts`.

**Main files.** `packages/common/actions/src/kit-drift/schema.ts` (`KitDriftTagSchema`), `components/kit-drift/engine/{types.ts,to-markup-drift.ts,to-drift-matches.ts,index.ts}`, new `components/kit-drift/engine/to-badge-drift.ts`, `agent/prototype-kit-review.ts` (`TAG_WORDS`, `PLURAL_WORDS`, the badge line), `components/kit-drift/kit-drift-list.ts` (the `variant` field), `packages/common/actions/src/kit-drift/list.ts` (text only).

**Verify in the running app.**
- New fake app `ds-wt/kb-next`: Next 16, Tailwind 4, shadcn-style Badge with `default`, `secondary`, `outline`, `success`, `warning`, `destructive` variants, plus Card and Button. A prototype beside it with 5 hand-styled pills (green, amber, red, gray, outline), 1 kit Badge, 1 pill in a table cell, 1 small rounded button.
- No model: `pnpm exec tsx scripts/call-action.ts kit-drift.list '<json>'`: http, mcp and agent match; 6 badge finds with the right variants (5 pills and the cell pill), 0 for the kit Badge, the button stays a button find.
- **Real-model run (short, 2 runs):** a new prototype beside `kb-next`, prompt "a visit list with a status pill per row: scheduled, completed, missed, cancelled", on main and on the branch. Score both with the branch `list_kit_drift`. Gate: 0 hand-styled badges at the end on the branch. Report first-pass finds, kit Badge uses, loops, seconds and cost.
- Dark and light screenshots of the prototype and the run note.

---

## 3. port-objects: the port snapshot writes nothing into the app repo (Bonaparte)

**Why.** Every Move to app now takes a git tree snapshot of the whole app at `port.start`, and the review takes more. `git add -A` writes loose objects into the app's own `.git/objects`. The user did not opt in to that write, and on a repo the size of Bonaparte (46,860 tracked files) it can hold the run start for seconds. App edits must stay opt-in, and the studio must stay fast inside real apps.

**Behaviour.**
- `createTree` runs `git add -A` and `write-tree` with `GIT_OBJECT_DIRECTORY` set to a studio-owned folder (`<dataDir>/port-objects/<app id>/objects`) and `GIT_ALTERNATE_OBJECT_DIRECTORIES` set to the app's object folder, and with the temp index as now. So git reads the app objects and writes new ones only into the studio folder.
- Keep the exported names and signatures of `port-review-snapshot.ts` (`createRouteSnapshot`, `restoreRouteSnapshot`, `toStartTag`, `hasRouteChange` and the rest) unchanged, and keep the env inside the module, so the import lines in picks 1's files (`port-review-pass.ts`, `port-review.ts`, `port-start.ts`) do not change.
- Every later git call on a snapshot tree (`listTreeChanges`, `hasRouteChange`, `listChangedFiles`, `restoreRouteSnapshot`) uses the same env, so it can read the snapshot objects. Put the env in one function in `port-review-snapshot.ts`.
- The studio folder is removed when the run ends, or kept to a cap (for example the last 3 runs per app). Never touch `.git` of the app.
- **Speed.** Measure `toStartTag` on a Bonaparte-size repo (see Verify). If `port.start` waits 1 s or more, start the snapshot in parallel with the rest of the port start and await it only before the prompt is built; do not drop the snapshot.
- A git error still returns null and the run goes on with the old rule (edit tools only), as now.

**Headless.** No action or tool change. `start_port` and `apply_port` behave the same over UI, MCP and the agent.

**Main files.** `agent/port-review-snapshot.ts` (owner), `agent/port-start.ts` (only the await point of `toStartTag`, if the measure needs it; it is at 499 lines, so move a block out first), `src/server/platform/git/index.ts` only if `userGit` must pass the env (read it first; it may already take `env`).

**Verify in the running app.**
- No model, fake app `ds-wt/po-next` (a small git repo): run `git count-objects -v` in the app before and after a mock Move to app (`[port-bash]`): the count does not change; the values pass still runs (65 to 95 class); keep-best restore still works (a mock that makes the score worse is put back).
- Bonaparte-size measure, read only: `git clone --no-local` Bonaparte into `ds-wt/po-bp` (a full copy with no hardlinks to Bonaparte objects; reads Bonaparte only; never write into Bonaparte). A clean clone has no untracked files, so `git add -A` looks faster than on a real checkout: before timing, add 200 untracked files and change 50 tracked files in the clone, attach the clone in the studio with no model, and time `toStartTag` and `port.start` to the run start, 5 times on main and on the branch. Report p50, and the object count of the clone before and after (no change on the branch). No Move to app real run on the clone.
- No real-model run needed.

---

## 4. text-keys: Figma text style and align keys

**Why.** Figma users style text from the keyboard: `Mod+B` bold, `Mod+U` underline, `Mod+Shift+X` strikethrough, `Mod+Alt+L`, `T`, `R`, `J` align left, center, right, justify. Here they must open the inspector Text section.

**Behaviour.** With one or more text layers selected and no text field focused:
- `Mod+B` toggles bold: if every selected layer is 600 or more, set 400, else set 700. Tailwind page: `font-bold` and `font-normal` (replace any `font-*` weight class); plain CSS: `font-weight`.
- `Mod+U` toggles underline and `Mod+Shift+X` toggles line-through, with the same write as the inspector toggles (`text-style-toggles.tsx`, `text-decoration-line`).
- `Mod+Alt+L`, `Mod+Alt+T`, `Mod+Alt+R`, `Mod+Alt+J` set `text-align` with the same write as `align-field.tsx` (Tailwind `text-left`, `text-center`, `text-right`, `text-justify`).
- One version and one undo step per key press, for all selected layers.
- While a text edit is open (Enter on a layer), the bridge calls `preventDefault` on `Mod+B` and `Mod+U`, so the browser does not insert `<b>` or `<u>` into the source; the keys then apply to the whole layer, as above. Inline ranges are out of scope.
- A selection with no text layer: no change and a toast with the reason.
- `Mod+I` stays "Ask the chat about the selection"; italic stays in the inspector.
- On Windows and Linux `Mod+Alt+T` is `Ctrl+Alt+T`, which is Tidy up. There, Tidy up wins and the align center key is not bound; the shortcut sheet shows this.
- The keys show in the shortcut sheet only.

**Headless.** No new action. Each key writes the same style edit as the inspector (`direct-edit.apply`, MCP `edit_element` with a style change), so MCP and the agent get the same result with the existing tools.

**Main files.** `shared/keymap-edit.ts` (new entries `text-bold`, `text-underline`, `text-strike`, `text-align-left`, `text-align-center`, `text-align-right`, `text-align-justify`), `bridge/keyboard.ts` (forward the keys, `preventDefault` in text edit), new `ui/features/inspector/{use-text-keys.ts,text-keys-model.ts}`, `ui/features/inspector/use-element-nudge.ts` (mount the hook beside `useSizeKeys`), `ui/features/inspector/copy.ts` (toast lines). If the bridge needs a message type, add it in `packages/common/actions/src/bridge-protocol.ts`.

**Verify in the running app.**
- HTML prototype: select a heading, `Mod+B`: weight 700; again: 400; `Mod+Alt+T`: centered; one `Mod+Z` per press.
- Tailwind route copy in a fake app (`ds-wt/tk-next`): `Mod+B` on a `font-medium` label writes `font-bold`; the source diff shows the class swap, no second weight class.
- 3 selected labels take `Mod+U` together, in one version.
- Text edit open, `Mod+B`: no `<b>` in the source.
- Over MCP: `edit_element` with the same style gives the same source diff.
- Dark and light screenshots of the shortcut sheet rows and the toast. No real-model run.

---

## 5. polish-33: small open items

**Items.**
- **All selected rows highlighted in Layers.** `layers-list.tsx`, `layer-row-model.ts` and the callers that pass `selectedNode` (`use-layer-list-state.ts`, `use-layers-panel-state.ts`; grep `selectedNode`) take the set of selected nodes, not one `selectedNode`. Each selected row gets the selected style and `aria-selected`; the scroll target stays the last selected row.
- **Resize keys snap to the scale.** On a Tailwind layer with no size class, `Mod+Arrow` writes a scale class when the new size is on the theme scale (240 px to `w-60`), and an arbitrary class only when it is not (`size-keys-model.ts`).
- **`serverReady` back in boot telemetry.** The `app.start` detail gets the `serverReady` mark again, read when the server is ready, not when the early window is made (`desktop/main.ts` or `desktop/boot.ts`). `app.start` ms does not change.

**Headless.** No new action or tool.

**Main files.** `ui/features/versions-layers-tokens/{layers-list.tsx,layers-list-body.tsx,layer-row-model.ts}` and the `selectedNode` callers, `ui/features/inspector/size-keys-model.ts`, `desktop/{main.ts,boot.ts}`. No `copy.ts`.

**Verify in the running app.**
- Select 3 layers on the canvas: 3 rows are highlighted in Layers; Shift+click in Layers adds a fourth.
- Tailwind fake app (`ds-wt/p33-next`): a 236 px wide card with no size class, `Mod+Right` 4 times: `w-60`, not `w-[240px]`.
- Packed app, first launch: the `app.start` telemetry detail has `serverReady`.
- Dark and light screenshots of the Layers multi-select. No real-model run.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 real-proof | `agent/{port-route-update.ts,port-start.ts,port-review.ts,port-review-pass.ts,bash-edits.ts,mock-port.ts}`; `kit-drift/engine/to-card-drift.ts`; the card lines of `agent/prototype-kit-review.ts`; fixtures `ds-wt/rp-next-tw*`, `ds-wt/rp-kd-next*` |
| 2 kit-badges | `actions/src/kit-drift/{schema.ts,list.ts}`; `kit-drift/engine/{types.ts,to-markup-drift.ts,to-drift-matches.ts,index.ts}` and new `to-badge-drift.ts`; `kit-drift/kit-drift-list.ts`; `TAG_WORDS`, `PLURAL_WORDS` and the badge line of `agent/prototype-kit-review.ts`; fixture `ds-wt/kb-next` |
| 3 port-objects | `agent/port-review-snapshot.ts`; the `toStartTag` await point in `agent/port-start.ts`; `platform/git/index.ts` (only if needed); fixtures `ds-wt/po-next`, `ds-wt/po-bp` |
| 4 text-keys | `shared/keymap-edit.ts`; `bridge/keyboard.ts`; new `inspector/{use-text-keys.ts,text-keys-model.ts}`; `inspector/use-element-nudge.ts`; `inspector/copy.ts`; `actions/src/bridge-protocol.ts` (only if needed); fixture `ds-wt/tk-next` |
| 5 polish-33 | `versions-layers-tokens/{layers-list.tsx,layers-list-body.tsx,layer-row-model.ts,use-layer-list-state.ts,use-layers-panel-state.ts}`; `inspector/size-keys-model.ts`; `desktop/{main.ts,boot.ts}`; fixture `ds-wt/p33-next` |

Shared files and conflict warnings:
- **`agent/prototype-kit-review.ts` (picks 1 and 2).** Pick 1 may change only the card line. Pick 2 adds `badge` to `TAG_WORDS` and `PLURAL_WORDS` (both `Record<DriftTag, string>`, so tsc fails until they have the new key) and adds the badge line. Different lines, same file: merge pick 1 first, rebase pick 2.
- **`kit-drift/engine/` (picks 1 and 2).** Pick 1 may change only `to-card-drift.ts`; any other engine change it needs goes under "Left out". Pick 2 owns the shared engine files and the new `to-badge-drift.ts`. So the merge order (pick 1 first) holds.
- **Union `KitDriftTagSchema` and `DriftTag` (pick 2 only).** Every `Record<DriftTag, ...>` must get `badge`: grep for `DriftTag` before the commit.
- **`port-review-snapshot.ts` exports (picks 1 and 3).** Picks 1's files import from it; pick 3 keeps every export name and signature, so no import line changes.
- **`agent/port-start.ts` (picks 1 and 3).** It is at 499 lines (limit 500). Pick 1 moves a block out first and owns the file; pick 3 changes only the line that awaits `toStartTag`. Merge pick 1 first; pick 3 rebases onto it. `agent/port-review-snapshot.ts` is pick 3 only.
- **`ui/features/inspector/` (picks 4 and 5).** Pick 4 owns `use-element-nudge.ts` (the hook mount line) and `copy.ts`. Pick 5 owns only `size-keys-model.ts`. No shared file.
- **`copy.ts`:** only pick 4 (`inspector/copy.ts`).
- **Keymap ids:** pick 4 adds 7 members to the `KeyId` union through `keymap-edit.ts`. No other pick changes the keymap.
- **`@generated` lists:** no pick adds an action. Picks 1 and 2 may change action text; each then runs `pnpm exec tsx scripts/gen-routes.ts`. Run `gen-routes --check` after each merge.
- **`desktop/` (pick 5) vs the rest:** only pick 5 touches the desktop boot files.
- **Hand aggregators:** no pick edits `agent-tools/registry.ts`, `mcp/registry.ts`, `actions/index.ts`, `main/live-layer.ts` or `http/mount-all.ts`.
- **MCP snapshots:** no pick changes a tool input schema in `artifacts/mcp-snapshots/*.json`.
- **Fake apps under `ds-wt`:** each pick has its own (see the table). No pick writes into Bonaparte; pick 3 reads it once, through `git clone`. No Move to app run targets Bonaparte or the clone.
- **`.claude/goal/roadmap.md` Appendix A:** add each pick's new files when the file is in the worktree (L6e).

## Merge order

All 5 can run at once. Merge in this order:
1. **real-proof**: it owns `port-start.ts` and the card line, and its run fixes set the base for picks 2 and 3.
2. **port-objects**: rebase on pick 1 (`port-start.ts` await line), then re-run the mock `[port-bash]` check.
3. **kit-badges**: rebase on pick 1 (`prototype-kit-review.ts`); run `gen-routes --check` and `pnpm run typecheck` (the `DriftTag` records).
4. **polish-33**: Layers, size keys and desktop boot files.
5. **text-keys**: keymap, bridge and inspector files; run `pnpm run typecheck` once more, because `KeyId` and the bridge messages are shared types.

After the last merge, run `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run check:scripts`, `pnpm run lint:gate`, `pnpm run build:ui`, `pnpm exec tsx scripts/check-bundle.ts` and `pnpm exec tsx scripts/check-boot-imports.ts`. Then `pnpm run desktop:pack`. Then one real-model session of 2 runs on merged main, each with a fresh fixture copy and studio data folder:
1. Move to app of a fresh `rp-next-tw` copy onto `/visits`: values pass ran, score 80 or more, no object added to the app repo.
2. A visit list with status pills beside `kb-next`: 0 hand-styled badges, 0 hand-styled cards.

Real-model checks (local Claude Code sign-in, short runs; Move to app only into a fake Next app under `ds-wt`, never Bonaparte):
- pick 1: 4 runs plus up to 2 re-runs (about 6), only after the no-model checks pass;
- pick 2: 2 runs (main and branch);
- the final merged session (2 runs).

Picks 3, 4 and 5 need none.

## Runners-up

1. Flow onto existing routes: Move to app of a flow still refuses routes that exist (route-apply "Left out" since cycle 28).
2. Cards and badges in app source: `toDriftTag` never returns `card` or `badge` for TSX, and `apply_kit_drift` has no card or badge splice (kit-cards "Left out").
3. Cold project open: about 11 reads each wait about 170 ms on the first open after boot; measure the blocking task first.
4. Skeleton states in the kit check: Bonaparte uses `<Skeleton` in 498 files; flag hand-made gray loading blocks in data-state frames.
5. Port plain CSS path: build and check `rf-next-rt`; it is not known if `port.apply` lands a style edit as inline JSX style.
6. Photo slots from the image provider: when `create_image` has a key, offer generated images for art slots, as an opt-in cost.
7. Canvas memory (doop): a design note on the canvas that every new frame and run in the project reads.
8. Figma variables JSON import and export into project tokens (Figma ships variables import and export in November).
9. Port look reads inline `style="font-family"` and follows `@import` in linked CSS (port-look "Left out").
10. `get_screenshot` under Playwright `_electron` times out on `page.goto` (first-launch "Left out"); a direct launch works.

Sources: [Figma release notes archive](https://www.figma.com/release-notes/archive/?page=2), [Figma What's new](https://www.figma.com/whats-new/), [refontelearning.com design-to-code tools](https://www.refontelearning.com/blog/ai-design-to-code-tools-figma-make-v0-lovable), [Figma help: keyboard shortcuts](https://help.figma.com/hc/en-us/articles/360039956634), [defkey Figma shortcuts](https://defkey.com/figma-shortcuts).

## Results

- Merged with no conflicts, in order: real-proof, port-objects, kit-badges, polish-33, text-keys (main at 778d9e8dc).
- real-proof: both open real-model gates now pass. Tailwind 4 route update: 100 (A1, A1r); with the agent's own apply_port call: 89 (A2b). Card loop: B1 5 kit Cards, 0 finds; B2 gamed the check with data-slot, fixed; B2r 0 finds. Fixed: route copy added a 3px border, values pass paired repeated text wrongly, data-slot alone counted as a kit Card. port-start.ts split 499 -> 379 lines.
- port-objects: Move to app adds 0 git objects to the app repo (main added ~400 per run on a Bonaparte clone); toStartTag p50 763 ms vs 732 ms; fixed keep-best restore when the app is a repo subfolder.
- kit-badges: real run 8 kit Badges, 0 hand-styled, 56 s, $0.19.
- text-keys: Mod+B, Mod+U, Mod+Shift+X, Mod+Alt+L/T/R/J; same diff over MCP edit_element.
- polish-33: Layers highlights every selected row; serverReady back in boot telemetry; the size-key snap bug did not reproduce.
- Checks: gen-routes --check pass, typecheck 0 errors, lint:gate pass (59608, baseline 89733), build:ui pass, check:clip 0 findings, desktop:pack pass.
- Installed app: :4570 returns 200. Server idle CPU 0.02 CPU-s/min over 60 s.
- Open: route copy turns mx-auto into fixed px margins; a steer cancels a port run over the API; Button and Table may share the data-slot gap; script-built pills are not checked.
