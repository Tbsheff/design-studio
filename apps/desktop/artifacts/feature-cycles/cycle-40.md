# Feature cycle 40: next 5 features

Date: 2026-11-14. Main at `4936d686c` (all 5 cycle-39 picks merged; B1 at 274,703 B, delta 0).

## Method

- Read `cycle-39.md` (picks, runners-up, Results, Open) and `cycle-39/{port-dark,kit-swap,kit-skel,z-keys,polish-39}.md` ("Left out", "Open" and "Differences from the spec"). Read `cycle-39/kit-skel/kl-apply.txt` (the failed first apply).
- Read the runners-up of `cycle-31.md` to `cycle-38.md`, and counted the items that came back cycle after cycle.
- Read the code for each candidate:
  - First version: `server/app/first-version.ts`, `server/http/{app-routes.ts,first-version-routes.ts,app-devserver-routes.ts}`, `server/direct-edit/commit/publish.ts` (`assertCanEdit`), `server/mcp/run-edit.ts` (`firstVersionRefusal`), `server/handlers/_core/run-action.ts`, `server/store/project-access.ts`, `server/handlers/kit-drift/apply.ts`, `server/components/kit-drift/kit-drift-commit.ts`, `actions/src/kit-drift/{apply.ts,schema.ts}`.
  - Script checks: `scripts/call-action.ts`, `scripts/stamp/{call-report.ts,call-http.ts,call-mcp.ts,call-agent.ts}`, `scripts/check-actions.ts`, `scripts/check-actions-catalog.ts`, `scripts/check-actions-baseline.json`, the `check:scripts` line of `apps/desktop/package.json`.
  - Stacking: `actions/src/stacking/{set.ts,schema.ts}`, `server/handlers/stacking/set.ts`, `server/share/stacking/{set.ts,stacking-writer.ts,deps.ts}`, `server/breakpoints/commit.ts` (`commitBreakpointStyle`), `ui/features/stacking/{z-order-model.ts,use-stacking-keys.ts}`, `LAYER_APP_KEYS` and `layerAppKeyOf` in `contracts/src/contracts.ts`, `actions/src/version/{create-session.ts,restore-history.ts,list-history.ts}`.
  - Keys: `shared/{keymap.ts,keymap-edit.ts,keymap-view.ts}`, `desktop/menu.ts` (direction items).
  - Figma editing: `ui/features/inspector/{font-field.tsx,use-font-field.ts,use-number-text.ts,copy.ts}`, `ui/features/versions-layers-tokens/{layer-eye-button.tsx,layer-lock-button.tsx}`, `ui/features/spacing/*`, `ui/features/token-sweep/*`, `server/mcp/style-tools.ts` (`find_styles`, `replace_style`), `server/design-system/extract/next-font.ts`, `server/design-system/html-link.ts`, `server/style-scope/theme/engine/fonts.ts`.
  - Review quality: `contracts/src/review.ts` (`REVIEW_KINDS`), `server/review/{run.ts,checks.ts,type-probe.ts,interaction-probe.ts}`, `server/review/engine/{type-rhythm.ts,type-scale.ts,interaction.ts}`, `actions/src/direct-edit/run-review.ts`, `ui/features/review/{review-model.ts,review-group.tsx}`.
  - Frames: `contracts/src/canvas-file.ts`, `contracts/src/export.ts`, `server/canvas/frame-fit/engine/to-fit-height.ts`, `server/canvas/tools.ts`, the `4000` literals in `ui/features/canvas` and `actions/src/canvas`.
  - MCP snapshots: all 14 files in `artifacts/mcp-snapshots/` (112 tool names; which hold `4000`, `review_frame`, `z-index`).
- Counted Bonaparte use (read only, `git grep -l` on `*.tsx`): `next/font` in both app `layout.tsx` files, `font-sans|font-mono|font-serif` in 406 files, `z-10` to `z-50` in 170 files.
- Ran the 6 steps of `check:scripts` one by one, read only (no build, no app). Logs in `/tmp/c40-*.log`.
- Ran 1 web search (Figma font picker and layer order keys).
- Did no real-model run, no app run, no build and no test. The B1 number is from cycle 39 (`check-bundle` at the merge).

### Open items from cycle 39, and the pick that closes each

| Open item | Pick |
|---|---|
| First `apply_kit_drift` on a newly attached app fails with "no saved version yet" | 1 polish-40 |
| `call-action.ts` does not reset state between surfaces, so write actions fail on the 2nd and 3rd surface | 1 polish-40 |
| `pnpm run check:scripts` fails on main | 1 polish-40 (fix part, Tyler decides the rest) |
| A multi-select z-key press takes 1 Cmd+Z per layer | 1 polish-40 |
| OS-keyboard Cmd+Z through the macOS menu | Manual check for Tyler. Not planned again |
| Bring to front and Send to back (cycle-39 runner-up 4, z-keys "Left out") | 4 z-ends |
| Frames stop at 4,000 px (cycle-39 runner-up 1) | 5 tall-frames |
| Home preload 274,703 B | Gate for every pick: B1 at or under 274,703 B |

### Findings

- **Home preload (a rule for all picks).** The gate is B1 at or under 274,703 B. No key handler goes in a Home chunk (`ui/features/commands/**`, `ui/platform/*`, `ui/app/main.tsx`, `ui/app/screen-preload.ts`). A handler goes in a lazy feature file, as `ui/features/stacking/use-stacking-keys.ts` does (cycle 39).
- **First version: root cause of "no saved version yet" (polish-40).**
  - Attach starts the first app version in the background (`startFirstVersion`, `app/first-version.ts` line 25). It takes 4 s plus 1.2 ms per file (`estimateFirstVersionMs`). While it runs, `headVersionId` is `null`, and `assertCanEdit` (`direct-edit/commit/publish.ts` line 138) fails with "This direction has no saved version yet; keep or discard the unfinished changes first". `kit-drift-commit.ts` calls `assertCanEdit`.
  - **HTTP path.** The wait is HTTP middleware only: `applyFirstVersionHold` mounts on `app.use("/api/projects/:pid/d/:did/*")` (`app-routes.ts` line 225). `isHeldAction` (`first-version-routes.ts` line 21) also needs `/d/:directionId/` in the path. `kit-drift.apply` is `POST /api/projects/:projectId/kit-drift/apply` (`kit-drift/apply.ts` line 23), so it never waits. A change to `isHeldAction` alone does nothing, because the mount pattern filters the path first.
  - **MCP and agent paths.** Tools with `mcp { name }` run through `makeRunner` (`run-action.ts` line 120). The runner has no first-version wait. Only the legacy `runEdit` waits (`firstVersionRefusal`, `mcp/run-edit.ts` line 92). The MCP call in `kl-apply.txt` passed only because the save ended in the 242 ms after the HTTP call. So every `{ name }` write tool (also `set_stacking` under `/d/`) can fail in the first seconds after attach.
  - **Scope.** 102 write actions with `scope: "project"` have no `/d/:directionId/` in the path. Most of them (29 `canvas`, `comment`, `run`, `share`) do not write source. A hold on all of them freezes `canvas.setPresence` after attach. Rule for the fix: hold only a write action with `needs: "project.update"` whose decoded input has a `directionId` key. `canvas.setPresence` has no `directionId`; `kit-drift.apply` has one (`kit-drift/schema.ts` line 58).
  - **Where.** A new service in the runner needs a line in `main/live-layer.ts`, and W12 and W12b forbid it. So the wait goes on `ProjectAccess` (`store/project-access.ts`, a run-action core service). It is `access: "read"`, so it can wait but cannot start a save.
- **`call-action.ts` (polish-40).** `callSurfaces` (`call-action.ts` line 144) runs http, mcp and agent one after the other with no reset. A write changes the state, so the 2nd and 3rd surfaces see a new state ("The layer already has these stacking values", z-keys report). A reset alone does not make it pass: polish-39 found that "the only diffs are the version ids", and `diffOutcomes` (`stamp/call-report.ts`) compares every field. Edit writes return a `pending-*` version before the commit (P3), so the reset uses the undo route `version.restoreHistory` (`POST .../d/:directionId/edit-history/undo`), not `version.restore`.
- **`check:scripts` (polish-40).** `check:scripts` is 6 steps joined with `&&`. Steps 1 to 4 pass: `gen-routes --check`, `check-ownership`, `check-coarse`, `check-bridge-guards`. **Step 5, `check-actions.ts --probes`, fails.** So step 6 (`check-tenant-boundary.mjs`) never runs in the chain; alone it passes (12 rules).
  - The text scan: "fail, 560 hits (baseline 410)" in 23 files, plus 2 notes that ask for a lower baseline (`home-routes.ts` 17 to 15, `port-routes.ts` 1 to 0). By rule: S11 194 lines, E1 25, W7 5. By file: 12 files changed after the baseline commit `41d7868a5` (2026-11-08), for example `run-log/run-stale.ts` 0 to 21 (`9ab827d16`), `platform/chrome-owner/index.ts` 0 to 24 (`20e46e98b`), `events/event-file.ts` 37 to 61 (`994ab8a49`, `ca01de639`), `share/play-app.ts` 0 to 6 (`b0730342e`). 7 files have 0 to N hits and no commit after 2026-11-08 (`page-probe/{element,layer-ref,owner-probe,source-loc}.ts`, `http/{app-events,app-studio}-routes.ts`, `platform/process/worker-serve.ts`). Their origin is not pinned; one guess is the 2026-11-08 move `c4456f6c1`, but this research did not prove it.
  - The ops catalog: "fail, 383 ops, 10 warnings". Errors: O12 52 (array output with no limit), E16 6 (`run.get`, `run.start`, `run.stop`, `variation.start`, `version.restoreHistory`, `project.createPrototype` still in a legacy list), O6 2 (`image-search.apply` 925 chars, `project.createPrototype` 731 chars), O7 1 (`state-style.setForced` short 545 chars), O11 1 (`connection.getSetup` returns `token`). The 10 warnings are O13. This is cycle-39 runner-up 10.
  - Rule: never raise the baseline (memory "Lint burn-down"), so `check:actions --update` must not accept the about 150 new hits.
- **Multi-select undo (polish-40).** `use-stacking-keys.ts` sends 1 `set_stacking` call per layer, and each call is 1 version and 1 history step. `commitBreakpointStyle` (`breakpoints/commit.ts` line 36) already takes `WrittenFile[]` and writes 1 version and 1 history entry, so a many-layer write fits the commit path. `set_stacking` is in no MCP snapshot (it is not in the 112 names), so a list input on `stacking.set` changes no snapshot. `version.createSession` ("Save the open edit session ... as one new version") may already join N writes; prove it first.
- **Figma editing: which gaps are real.** Most Figma controls exist. Do not plan these again:
  - Math in number fields: `inspector/math-input-model.ts` (imported by `use-number-text.ts` line 4).
  - `Mod+A` siblings, copy and paste style keys, opacity digits: `shared/keymap-edit.ts` lines 14, 20, 118, 124.
  - Text wrap Balance and Pretty, truncate, list styles, rotation, eyedropper, aspect lock, stroke position, blend: `inspector/{text-wrap-choice.tsx,truncate-model.ts,list-style-choice.tsx,use-rotation.ts,eyedropper-button.tsx,aspect-lock-toggle.tsx,stroke-position-model.ts}`, `fill/blend-select.tsx`.
  - Spacing handles on canvas, snap guides, measure, rulers: `ui/features/spacing/spacing-handles.tsx`, `canvas/snap-guides.tsx`, `keymap-view.ts` lines 53 and 72.
  - Layer hide and lock: `versions-layers-tokens/{layer-eye-button.tsx,layer-lock-button.tsx}`, MCP `set_layer_state`.
  - Selection colors: `find_styles` says it works "like the Selection colors panel of the studio inspector" (`mcp/style-tools.ts` line 203); `inspector/{match-scan-model.ts,select-matching-button.tsx}`; Token sweep in `ui/features/token-sweep`.
  - **Real gap 1: font picker.** The Font field is a plain text input (`inspector/font-field.tsx` line 31; `use-font-field.ts` has no list). You must type a family name, and a name that the page does not load falls back with no warning. Figma has a searchable font list with canvas preview on arrow keys (launched again, see Sources). The server can already read the fonts: `harvestNextFonts(root)` (`design-system/extract/next-font.ts` line 110) reads `next/font/google` imports; `extract/css.ts` knows `@font-face`; `design-system/html-link.ts` writes a Google Fonts link in HTML pages. No action lists the project fonts: no `list_fonts` in the 112 snapshot names and no `font` domain in `actions/src`.
  - **Real gap 2: Bring to front and Send to back.** 0 hits for `bring-to-front|bringToFront|send-to-back|sendToBack` in `src`. `layerAppKeyOf` (`contracts.ts` line 1677) refuses Shift. `Mod+Alt+]` and `Mod+Alt+[` are next and previous direction (`keymap.ts` lines 85 and 91, menu items in `desktop/menu.ts` lines 315 and 320). `Mod+Shift+]` and `Mod+Shift+[` are free (0 hits in `shared`, `commands`, `menu.ts`, `contracts.ts`).
- **Claude Design quality: which gap is real.** The review already checks contrast, tap targets, alt text, off-token values, clipping, type scale, line length and leading, hover and focus, emoji icons (`review/engine/interaction.ts` line 140) and broken images. Placeholder photos have photo slots (`share/image-search/photo-slots.ts`). Tweaks, variations, comments, present mode, PPTX export and handoff exist.
  - **Real gap 3: alignment.** `REVIEW_KINDS` (`contracts/src/review.ts` line 3) has no alignment kind. No review file has `misalign`, `near-miss` or `off-grid`; the only "alignment" word is in the critique prompt (`engine/critique-prompt.ts` line 17), a model score with no element. AI output often has a card 2 px off its siblings, or a row with gaps 24, 24, 21. A Figma user sees this with smart guides; here nobody sees it.
  - **Real gap 4: tall frames.** `CANVAS_MAX_SIDE = 4000` (`canvas-file.ts` line 10). A full landing page is often taller, and frame-fit stops with "The page is taller than 4000 px" (`to-fit-height.ts` line 20). The cap has 5 copies as literals: `ui/features/canvas/{use-viewport-custom.ts:9,canvas-frame-ops.ts:29,frame-resize-model.ts:10}`, `actions/src/canvas/schema.ts:232`, `actions/src/canvas/frame/schema.ts:19`. The parser `side()` (`canvas-file.ts` line 128) uses one cap for width and height. `canvas.json` has `"maximum": 4000` 4 times (`canvas_place`, `add_frame`). `export.json` has 2, from `EXPORT_FRAME_MAX_SIDE` (`contracts/src/export.ts` line 28), a separate cap.
- **Repeat items: which are real.**
  - Cold project open (cycles 31 to 35): not rechecked; it needs a timed run.
  - Route copy into a prototype drops the first frame (cycles 35 to 39, 5 cycles): not rechecked; it needs an app run. Runner-up 1.
  - Asset folder for a dynamic page (cycles 37 to 39), phone tally (37 to 39), first double-click after load (38, 39), photo-text on phone renders (39): not rechecked.
  - `inspect_accessibility` has no `colorScheme` (cycle-39 runner-up 2): still real, 0 hits in `accessibility/inspect.ts`.
  - Card parts split (cycle-39 runner-up 3): kit work. Not picked (rule: no more kit and dark picks this cycle).
- **Competitor recheck (1 web search, 2026-11-14).** Figma's font picker previews each family on the canvas while you move through the list with the arrow keys, and saves only on click or Enter. For layer order, Figma Windows lists `Ctrl+Shift+]` and `Ctrl+Shift+[` for Bring to front and Send to back; Mac sources give `⌥⌘]` or `⌥⇧⌘]`. No Claude Design search this cycle; the cycle-39 recheck is from the same day.
- **Branch check.** No `feat/polish-40`, `feat/font-pick`, `feat/align-check`, `feat/z-ends` or `feat/tall-frames` (`git branch -a --list`).
- **Fixture prefixes.** `p40-`, `fp-`, `ag-`, `ze-` and `th-` are not in `ds-wt` (checked with `ls`). `al-`, `tl-` and `tf-` are in use, so no pick uses them. `ac-next-b` and `pt-seed` are in `ds-wt`; picks copy them and never write into them. `zk-seed` and the `p39-*` fixtures are gone, so picks make new ones.
- **`.claude/goal/roadmap.md`** is in the main tree now. Add each pick's new files to Appendix A when the file is in the worktree (L6e).

## Ranking

Score = value x fit with "simple and fast" / effort (1 to 5 each).

| Rank | Key | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|---|
| 1 | polish-40 | First-version wait on every surface, `call-action` reset, `check:scripts` cause and part fix, 1 undo step for a multi-select z-key | 5 | 5 | 3 | 8.3 |
| 2 | font-pick | Font list in the inspector with the project's fonts and canvas preview on arrow keys (Figma) | 5 | 5 | 3 | 8.3 |
| 3 | align-check | Review finds near-miss edges and uneven gaps, with a direct fix (Claude Design quality) | 4 | 5 | 3 | 6.7 |
| 4 | z-ends | Bring to front and Send to back keys and menu items (Figma) | 3 | 5 | 2 | 7.5 |
| 5 | tall-frames | Frames up to 8,000 px tall, so a full landing page fits (Claude Design quality) | 4 | 5 | 2 | 10.0 |

The file lists the picks in a fixed order (polish, Figma, quality, Figma, quality), not by score. 0 of 5 picks are kit or dark check work. Picks 2 and 4 are Figma manual-editing gaps; picks 3 and 5 are Claude Design quality gaps.

No pick adds an always-visible control or a Home import:
- Pick 1 adds a wait step and a list input.
- Pick 2 adds a popup to an existing field and 1 read action.
- Pick 3 adds 1 review kind.
- Pick 4 adds 2 keys and 2 menu items, handled in a lazy file.
- Pick 5 raises 1 cap.

---

## 1. polish-40: first-version wait, call-action reset, check:scripts, 1 undo step (polish)

**Items.** Prove each one first; change code only for what the proof shows.

- **First-version wait on every surface.**
  - Proof first: fresh copy `ds-wt/p40-kit` of `kl-next`'s source (`ac-next-b` plus `components/ui/skeleton.tsx` and one pulse block), attach, then at once call `apply_kit_drift` over MCP (not HTTP first). Expected on main: "no saved version yet". Then the same with the kit drift panel Swap and with `set_stacking` over MCP.
  - Fix: `ProjectAccess` gets one method, `ready(projectId)`. In `makeRunner` (`run-action.ts`), after `checkScope`, call it when `action.access !== "read"`, `action.scope === "project"`, `action.needs === "project.update"` and the decoded input has a `directionId` key. `ready` waits only while a first-version job runs for that project (max 20 s, the `EDIT_WAIT_MS` of `app-routes.ts`). When the wait ends with no head version, it fails with `Conflict` and the `firstVersionWaitText` message (409, the same as the HTTP hold today). With no running job, it returns at once (0 ms on every later call).
  - The job registry (`jobs`, `failures`, `startFirstVersion`, `waitForFirstVersion`, `firstVersionState`, `firstVersionWaitText`) moves from `app/first-version.ts` to new `store/first-version-jobs.ts`, exported through `store/index.ts`, so `ProjectAccess` does not import `app`. `app/first-version.ts` keeps its other code and imports the registry from `store/index.ts` (no shim file, W23).
  - Remove `isHeldActionPath` from `applyFirstVersionHold` and delete `first-version-routes.ts` when nothing else imports it. The `EDIT_ROUTES` part of the middleware stays for the hand-written routes.
  - Print the list of held action ids once (a small `pnpm exec tsx` probe over `AllActions` in the report, not a new script), and check that `canvas.setPresence`, `comment.insert` and the frame actions are not in it.
  - Pass: on `p40-kit`, the first MCP apply, the first panel Swap and the first `set_stacking` after attach all wait and succeed. Later calls add 0 ms.
- **`call-action.ts` resets between surfaces.**
  - For an action with `access !== "read"` and a `directionId` (in the path or the input): before the first surface, read `version.listHistory`. After each surface, call `version.restoreHistory` (undo) until the history length is the start length again (max 3 calls). Write "reset: 1 undo" per surface in the output. If the undo fails, stop and print a `fix:` line (L5c).
  - `diffOutcomes` ignores the per-call fields: `versionId` values that start with `pending-` or are version ids, and `title` when it holds a version time. Put the ignore list in `stamp/call-report.ts` as one const.
  - Check that `toDriftId` gives the same ids after the reset (the kit-drift ids hash the source position).
  - Pass: `call-action.ts stacking.set` and `call-action.ts kit-drift.apply` on `p40-kit`: 3 surfaces ok, 0 diffs, the source after the run is equal to the source before it.
- **`check:scripts`.** The failing step is `check-actions.ts --probes` (see Findings).
  - Fix now: lower the 2 note entries (`home-routes.ts` to 15, `port-routes.ts` to 0); fix the W7 hits (`design-rules/rule-proposal-file.ts` 1, `design-system/ops/library-draft-reuse.ts` 2: decode with `toDecoder` or call the action); fix O6 (2 descriptions to 600 chars or less, STE), O7 (`state-style.setForced` short to 160 chars or less) and O11 (drop `token` from the `connection.getSetup` output, or prove it must stay and say so). Description changes change the MCP snapshot text of those tools; run `pnpm exec tsx scripts/mcp-snapshot.ts` and name the changed files.
  - Do not run `check:actions --update` to accept new hits, and do not raise any baseline entry.
  - Write the rest in the report "Open" as one decision for Tyler, with counts: the S11 and E1 hits per file, the origin of the 7 files with no commit after 2026-11-08 (find the commit with `git log --follow -S`), O12 52, E16 6.
  - Pass: `check-actions.ts --probes` lists fewer hits than on main and no new rule. `check:scripts` still fails until Tyler decides; the report says which step and why.
- **1 undo step for a multi-select z-key.**
  - Proof first: does an edit session (`version.createSession`) join N `set_stacking` writes into 1 history step? If yes, `use-stacking-keys.ts` opens and saves a session around the N writes, and no schema changes.
  - Else: `stacking.set` gets `others: Schema.Array(StackingLayerChangeSchema)` with a decoding default of `[]` and max 20. Each item has a `target` and `zIndex` and `position` only. The handler writes the main layer and the others through one `commitBreakpointStyle` call: 1 version, 1 history step. The output does not change. The description says "one or more layers" (600 chars or less). No snapshot changes (Findings).
  - `use-stacking-keys.ts` sends 1 call for a multi-selection.
  - Pass: select 2 overlapping layers in `ds-wt/p40-z` (a copy of the cycle-39 `zk-seed` layout: a card with an absolute badge and a photo, and 2 overlapping avatars), `Mod+[`: 1 version, 1 Cmd+Z restores both.

**Headless.** No new action. The wait serves every `{ name }` MCP tool, the agent and HTTP. `set_stacking` gets the list input. `call-action.ts` is a script.

**Main files.** `server/handlers/_core/run-action.ts` (1 step); `server/store/{project-access.ts,index.ts}`; new `server/store/first-version-jobs.ts`; `server/app/{first-version.ts,index.ts}`; `server/http/app-routes.ts` (drop `isHeldActionPath`); `server/http/first-version-routes.ts` (delete); `scripts/call-action.ts`; `scripts/stamp/call-report.ts`; `scripts/check-actions-baseline.json` (only the 2 lower entries); `server/design-rules/rule-proposal-file.ts`; `server/design-system/ops/library-draft-reuse.ts`; `actions/src/{image-search/apply.ts,project/create-prototype.ts,state-style/set-forced.ts,connection/get-setup.ts}`; `actions/src/stacking/{set.ts,schema.ts}`; `server/handlers/stacking/set.ts`; `server/share/stacking/{set.ts,stacking-writer.ts}`; `ui/features/stacking/use-stacking-keys.ts`; the changed MCP snapshot files. Not `main/live-layer.ts`, not `lint/**`, not `oxlint.config.ts`.

**Verify in the running app.** The steps above, on `STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev`. Dark and light screenshots of the kit drift panel after the first Swap. `pnpm run build:ui`, `check-bundle`: B1 at or under 274,703 B. No real-model run.

---

## 2. font-pick: font list in the inspector (Figma)

**Why.** In Figma you open the font list, type 2 letters and move with the arrow keys while the canvas shows each font. Here you type a family name by hand, and a name that the page does not load silently falls back to the default font. Bonaparte loads its fonts with `next/font` in `layout.tsx` and uses `font-sans` and `font-mono` in 406 files, so a picked font must be one the app loads, or the class that points at it.

**Behaviour.**
- **Open.** Click the Font field, or press Down in it: a popup list under the field (`.ui-menu`, 28 px rows). Typing filters the list. Up and Down move the active row and preview it on the canvas (`edit.preview`, the same call the field uses now). Enter or click commits 1 version. Escape reverts (`edit.revert`). Blur with no pick reverts.
- **Groups.**
  - "In this project": the families the project loads. In an app: `harvestNextFonts` (`next/font/google` imports), `@font-face` families in the app CSS, and the font tokens (`--font-*`). In an HTML prototype: the families of the Google Fonts link (`toLinkedFamilies`, `theme-run.ts` line 144), `pack.json` fonts and `@font-face`. Each row says where it comes from ("next/font", "token --font-sans", "Google link").
  - "System": `system-ui`, `ui-serif`, `ui-monospace`, `Georgia`, `Arial` (fixed TS const).
  - Rows show the name in the shell font. The canvas shows the real font (the shell does not load project fonts).
- **Write.** A token or theme class is written when the family has one (in Tailwind, `font-sans`; in CSS, `var(--font-sans)`), else the family with its fallback stack. Through the existing font-family edit path; no new write action.
- **Not in this pick.** No Google catalog fetch from the UI (U1, slow) and no new `next/font` import. A typed family that is not in the list still works as now, with a `data-tip` "This font is not loaded on this page."
- **Cost.** The list is read once per project open and when a file under the project changes (content key: the mtime and size of the scanned files, P5). Max 200 rows.

**Headless.** New read action `font.list` (tool `list_fonts`, stamped with `pnpm run new:action font list`): input `projectId`, `directionId`, `PageFields`; output `pageOf(FontSchema)` with `family`, `source`, `token` (or null), `className` (or null) and `stack`. Agent: `set: "core"`, short text 20 to 160 chars. The write is `edit_element` with `font-family` (exists). This pick changes the generated lists, so it merges last.

**Main files.** New `actions/src/font/{list.ts,schema.ts}` and the generated `font` files; new `server/handlers/font/{list.ts,live.ts}`; new `server/design-system/font-list/{font-store.ts,index.ts}` and `font-list/engine/to-font-rows.ts` (pure); `server/design-system/index.ts` (export lines); `ui/features/inspector/{font-field.tsx,use-font-field.ts}`; new `ui/features/inspector/{font-list-popup.tsx,font-list-row.tsx,use-font-list.ts,font-list-model.ts}`; `ui/features/inspector/copy.ts` (469 lines; stay under 500). Not `design-system/extract/next-font.ts` (call it, do not change it), not `ui/features/commands/**`.

**Verify in the running app.**
- New fake app `ds-wt/fp-next` (copy of `ac-next-b`) with `Inter` and `JetBrains_Mono` from `next/font/google` in `app/layout.tsx` and `--font-sans`, `--font-mono` tokens. HTML prototype `ds-wt/fp-proto` with a Google Fonts link for `Fraunces` and `DM Sans`.
- On an `h1`: open the list, type "je", Down: the canvas shows JetBrains Mono, the source does not change. Enter: 1 version, the class `font-mono` in the app, Cmd+Z restores. Escape: no change.
- `pnpm exec tsx scripts/call-action.ts font.list '<json>'` on both fixtures: http, mcp and agent the same.
- Dark and light screenshots of the popup. `pnpm run build:ui`, `check-bundle`: B1 at or under 274,703 B. No real-model run.

---

## 3. align-check: near-miss edges and uneven gaps (Claude Design quality)

**Why.** AI pages often have one card 2 px lower than its row, a label 1 px off the input above it, or a list with gaps 24, 24, 21. People see it as "almost right". Figma users catch it with smart guides. The studio review has no check for it (Findings), and the critique only gives a spacing score with no element.

**Behaviour.**
- **Probe.** One more `page.evaluate` in the `Promise.all` of `run.ts` (line 125), beside the type and interaction probes. For each container with 2 to 24 visible element children: the child rects, `position`, `transform`, the parent `display`, `gap` and each child's margins. Skip absolute and fixed children, transformed children, hidden ones, inline text runs and boxes under 8 px. Max 400 elements.
- **Rules (pure engine `review/engine/align.ts`, `toAlignHits`).**
  - Near-miss edge: in a column, a child whose left (or right) edge is 1 to 3 px from the edge that most siblings share. In a row, the same for top (or bottom) edges and for centers when the parent uses `align-items: center`. 4 px or more counts as on purpose.
  - Uneven gap: in a row or column of 3 or more children of the same tag and a size within 10 percent, a gap that is 1 to 4 px from the most common gap.
  - Max 12 hits per frame. Severity low; medium for a frame with 3 or more hits.
- **Message.** "This card is 2 px lower than the 3 cards beside it." / "The gaps in this list are 24, 24 and 21 px. Use one gap."
- **Fix.** A direct fix only when one child's own margin causes it (`margin-top: 2px` becomes `0`, or the gap goes to the common value on the parent). Else `fix: null`.
- **Where.** The Review panel (new group "Alignment and gaps") and `review_frame`. Not in the run-end fix loop this cycle (runner-up 2), so runs keep their speed.
- **Cost.** At most 80 ms per frame on a 400-element page. Write the ms in the report.

**Headless.** No new action. `review_frame` (`direct-edit/run-review.ts`) returns the new kind; `apply_fix` applies the direct fix. The `run-review.ts` description gets "alignment and gaps" (stay at 600 chars or less); that changes the `review_frame` text in `design-system.json`, `direct-edit-component.json` and `direct-edit-element.json`, so run `pnpm exec tsx scripts/mcp-snapshot.ts`. `REVIEW_KINDS` is in no action schema and no snapshot.

**Main files.** `contracts/src/review.ts` (`align` in `REVIEW_KINDS` and `REVIEW_KIND_LABEL`); new `server/review/align-probe.ts` (an expression like `type-probe.ts`; a `*.probe.ts` sibling only if the dry run flags a typed in-page function, W17, W21); new `server/review/engine/align.ts`; `server/review/engine/index.ts` (export lines); `server/review/run.ts` (443 lines: the probe call and the hit map; put new logic in the new files); `actions/src/direct-edit/run-review.ts` (description); `server/agent/tool-help.ts` (the `review_frame` text); `ui/features/review/copy.ts` if the group needs text. Not `server/review/checks.ts` (834 lines, no growth).

**Verify in the running app.**
- HTML prototype `ds-wt/ag-seed`: a row of 4 cards where card 3 has `margin-top: 2px`, a list with gaps 24, 24, 21 px, a form with one label 1 px off, and a clean section (0 hits).
- Review panel: 3 hits with the messages above, 2 with Fix; Fix on card 3: 1 version, 0 hits on re-run. The clean section: 0. `review_frame` over MCP: the same hits.
- Union grep (N12): every `Record<ReviewKind, ...>` and `switch` over the kind (`REVIEW_KIND_LABEL`, `review-model.ts` line 39, `run.ts` line 217).
- Dark and light screenshots of the group. No real-model run.

---

## 4. z-ends: Bring to front and Send to back (Figma)

**Why.** After cycle 39, `Mod+]` and `Mod+[` move a layer one step. Figma users also jump a layer to the top or the bottom of its siblings in one press. This was a runner-up in cycles 30, 31, 32, 38 and 39.

**Behaviour.**
- **Keys.** `Mod+Shift+]` "Bring to front" and `Mod+Shift+[` "Send to back", in the Selection group. This is the Figma Windows key. `Mod+Alt+]` and `Mod+Alt+[` stay next and previous direction, so no existing key moves (Figma Mac uses `⌥⌘]`; a swap is runner-up 4). Check that `Mod+Shift+]` has no Electron or macOS default in the packed app menu.
- **Rule (`z-order-model.ts`, pure).** Front: the layer's z becomes the highest z among the siblings that overlap it, plus 1 (or that z when the layer is later in the DOM and passes them at equal z). Back: the layer's z becomes 0; every overlapping sibling that would still paint under it at z 0 is raised to z 1, in the same version (this uses the pick 1 list input). z never goes below 0. The same stops as cycle 39: "Already in front", "Already at the back", the no-overlap toast, and `position: relative` for a static layer.
- **Writes.** 1 key press is 1 `set_stacking` call and 1 version; Cmd+Z restores. A multi-selection keeps its order among itself.
- **Shown.** The shortcuts sheet; the canvas menu items "Bring to front" and "Send to back" after the cycle-39 items, with `data-tip` keys.
- **Frame keys.** From the preview frame through the cycle-39 window event `studio:stacking-key` (`ui/domain/stacking-key-events.ts`).

**Headless.** No new action. `get_stacking` and `set_stacking` (with the pick 1 list input) serve MCP and the agent.

**Main files.** `shared/keymap-edit.ts` (2 bindings); `contracts/src/contracts.ts` (2 `AppKey` members `layer-front` and `layer-back`, and a Shift map beside `LAYER_APP_KEYS`, line 1672); `ui/features/stacking/{z-order-model.ts,use-stacking-keys.ts,copy.ts}`; `ui/domain/stacking-key-events.ts`; `ui/features/canvas/{preview-app-keys.ts,preview-menu-create.ts,copy.ts}`. Not `shared/keymap.ts`, not `desktop/menu.ts`, not `use-preview-menu.tsx` (492 lines).

**Verify in the running app.**
- HTML prototype `ds-wt/ze-seed`: 4 overlapping cards in a stack (z auto, 1, 2, auto) and a paragraph.
- Card 1, `Mod+Shift+]`: it paints over all 3, 1 version, boxes do not move. Card 3, `Mod+Shift+[`: it goes under all, the others get z 1 or keep a higher z, 1 version, 1 Cmd+Z restores. The paragraph: the no-overlap toast, 0 writes. The same from the frame, the Layers panel and the canvas menu. In a text edit and the chat composer: nothing.
- `pnpm exec tsx scripts/call-action.ts stacking.set '<json>'` (with the pick 1 reset): 0 diffs.
- Union grep (N12): the 2 `Partial<Record<AppKey, ...>>` maps in `preview-app-keys.ts`. `pnpm run build:ui`, `check-bundle`: B1 at or under 274,703 B. Dark and light screenshots of the menu and the shortcuts sheet. No real-model run.

---

## 5. tall-frames: frames up to 8,000 px tall (Claude Design quality)

**Why.** A quick prototype of a landing page is often 5,000 to 7,000 px tall. Frame-fit stops at 4,000 px, so the canvas cuts the footer and the last sections, and a reviewer sees half a page. Claude Design shows the full page. This was a runner-up in cycle 39 (frame-fit "Left out").

**Behaviour.**
- **One cap per side.** `CANVAS_MAX_HEIGHT = 8000` beside `CANVAS_MAX_SIDE` (width stays 4,000) in `canvas-file.ts`. 8,000 keeps a 2x PNG at 16,000 px, under Chrome's 16,384 px limit. `side()` takes the cap as a parameter, so a saved height up to 8,000 parses.
- **Every copy.** The 5 literals import the cap from `@design-studio/contracts/canvas-file`: width uses `CANVAS_MAX_SIDE`, height `CANVAS_MAX_HEIGHT`. `server/canvas/tools.ts` line 169 the same.
- **Frame-fit.** `to-fit-height.ts` uses `CANVAS_MAX_HEIGHT`; the warning says 8,000 px.
- **Not changed.** `EXPORT_FRAME_MAX_SIDE` (export) stays 4,000 (runner-up 3). `get_screenshot` already sends a tall page as up to 4 images.
- **Cost.** Measure the canvas frame paint and memory with 3 frames of 1440 x 7500: write the ms and MB in the report. If one tall frame costs more than 2x a 4,000 px frame, stop and report.

**Headless.** No new action. `canvas_place` and `add_frame` accept heights up to 8,000. This widens the input in `canvas.json` (4 `maximum: 4000` lines, only the height ones change); run `pnpm exec tsx scripts/mcp-snapshot.ts`. A widening breaks no old caller.

**Main files.** `contracts/src/canvas-file.ts`; `actions/src/canvas/schema.ts` (500 lines: replace the literal, add no line; if the import needs a line, remove one); `actions/src/canvas/frame/schema.ts`; `ui/features/canvas/{use-viewport-custom.ts,canvas-frame-ops.ts,frame-resize-model.ts}`; `server/canvas/tools.ts` (636 lines, line swap only); `server/canvas/frame-fit/engine/to-fit-height.ts`; `artifacts/mcp-snapshots/canvas.json`.

**Verify in the running app.**
- HTML prototype `ds-wt/th-seed`: a landing page of about 6,800 px at 1440 wide.
- Fit the frame: 6,800 px, no warning, the footer shows. A 9,000 px page: 8,000 px and the new warning. Resize a frame by drag to 7,000 px: it stays. Reopen the project: the height stays.
- `pnpm exec tsx scripts/call-action.ts canvas.createFrame '<json>'` with height 7,000: http, mcp and agent the same.
- `get_screenshot` on the tall frame. `pnpm run build:ui`, `check-bundle`: B1 at or under 274,703 B. Dark and light screenshots. No real-model run.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 polish-40 | `handlers/_core/run-action.ts`; `store/{project-access.ts,index.ts}`; new `store/first-version-jobs.ts`; `app/{first-version.ts,index.ts}`; `http/app-routes.ts`; `http/first-version-routes.ts` (delete); `scripts/call-action.ts`; `scripts/stamp/call-report.ts`; `scripts/check-actions-baseline.json` (2 lower entries); `design-rules/rule-proposal-file.ts`; `design-system/ops/library-draft-reuse.ts`; `actions/src/{image-search/apply.ts,project/create-prototype.ts,state-style/set-forced.ts,connection/get-setup.ts}`; `actions/src/stacking/{set.ts,schema.ts}`; `handlers/stacking/set.ts`; `share/stacking/{set.ts,stacking-writer.ts}`; `ui/features/stacking/use-stacking-keys.ts`; fixtures `ds-wt/p40-*` |
| 2 font-pick | new `actions/src/font/**` and handlers `font/**`; new `design-system/font-list/**`; `design-system/index.ts` (export lines); `ui/features/inspector/{font-field.tsx,use-font-field.ts,copy.ts}` and new `font-list-*` files; fixtures `ds-wt/fp-*` |
| 3 align-check | `contracts/src/review.ts`; new `review/align-probe.ts`, `review/engine/align.ts`; `review/engine/index.ts`; `review/run.ts`; `actions/src/direct-edit/run-review.ts` (description); `agent/tool-help.ts` (1 text); `ui/features/review/copy.ts`; fixtures `ds-wt/ag-*` |
| 4 z-ends | `shared/keymap-edit.ts`; `contracts/src/contracts.ts` (`AppKey`, Shift map); `ui/features/stacking/{z-order-model.ts,copy.ts}`; `ui/features/stacking/use-stacking-keys.ts` (after pick 1); `ui/domain/stacking-key-events.ts`; `ui/features/canvas/{preview-app-keys.ts,preview-menu-create.ts,copy.ts}`; fixtures `ds-wt/ze-*` |
| 5 tall-frames | `contracts/src/canvas-file.ts`; `actions/src/canvas/{schema.ts,frame/schema.ts}`; `ui/features/canvas/{use-viewport-custom.ts,canvas-frame-ops.ts,frame-resize-model.ts}`; `canvas/tools.ts`; `canvas/frame-fit/engine/to-fit-height.ts`; fixtures `ds-wt/th-*` |

Shared files and conflict warnings:
- **Stacking (picks 1 and 4).** Both edit `ui/features/stacking/use-stacking-keys.ts`. Pick 1 changes the multi-select write to 1 call; pick 4 adds the 2 key cases. Pick 4 also needs the pick 1 `others` list input for Send to back. Pick 4 rebases on pick 1.
- **`ui/features/canvas/copy.ts` (picks 4 and 5).** Pick 4 adds menu text; pick 5 may change a size text. Text lines only; rebase.
- **`contracts`.** Pick 3 edits `review.ts`, pick 4 edits `contracts.ts`, pick 5 edits `canvas-file.ts`. 3 different files.
- **MCP snapshots.** Pick 1: the snapshot text of the tools whose descriptions it shortens. Pick 3: `review_frame` in `design-system.json`, `direct-edit-component.json`, `direct-edit-element.json`. Pick 5: `canvas.json`. Pick 2 adds `list_fonts`. Each pick runs `pnpm exec tsx scripts/mcp-snapshot.ts` after its rebase and names each changed file. If 2 picks change one file, the later one regenerates it.
- **Unions.**
  - Pick 3: `align` in `REVIEW_KINDS`. Check `REVIEW_KIND_LABEL`, `review-model.ts`, `run.ts`.
  - Pick 4: 2 `AppKey` members. Check the 2 `Partial<Record<AppKey, ...>>` maps in `preview-app-keys.ts`.
  - Picks 1, 2 and 5: none. No two picks change one union.
- **`check-actions` (pick 1).** Picks 2 to 5 must not add a check-actions hit. Each runs `pnpm exec tsx scripts/check-actions.ts --probes` and reports the hit count against main (it fails on main; the count must not go up).
- **Generated lists.** Only pick 2 adds an action, so only pick 2 changes `@generated` files. Run `pnpm exec tsx scripts/gen-routes.ts --check` after each merge.
- **Hand aggregators.** No pick edits `actions/index.ts`, `main/live-layer.ts`, `http/mount-all.ts`, `mcp/registry.ts` or `agent-tools/registry.ts`. Pick 1's wait uses `ProjectAccess`, a core service that the live layer already provides.
- **Home preload files (all picks).** No pick adds a line to `ui/app/main.tsx`, `ui/app/screen-preload.ts`, `ui/platform/*` or `ui/features/commands/**`. Every pick with a `src/ui`, `src/shared` or `src/bridge` change runs `pnpm run build:ui` and `pnpm exec tsx scripts/check-bundle.ts`: B1 at or under 274,703 B.
- **Long files.** `review/checks.ts` (834), `canvas/tools.ts` (636), `actions/src/canvas/schema.ts` (500), `keymap.ts` (492), `use-preview-menu.tsx` (492), `inspector/copy.ts` (469), `review/run.ts` (443): no growth past 500, and no growth at all for files already over 500 (L2a).
- **Perf baseline.** No pick edits `scripts/perf/baseline.json` (P10, L6).
- **Fake apps under `ds-wt`.** Each pick has its own prefix (`p40-`, `fp-`, `ag-`, `ze-`, `th-`). No pick writes into Bonaparte, `ac-next-b` or `pt-seed`.

## Merge order

All 5 can run at once. Merge in this order:
1. **polish-40**: first. It changes the runner, the `set_stacking` input that pick 4 uses, and `call-action.ts`, which every later pick uses for its 3-surface check.
2. **tall-frames**: no overlap with the others except `ui/features/canvas/copy.ts` text.
3. **align-check**: rebase, regenerate its 3 snapshot files, run the union grep.
4. **z-ends**: rebase on polish-40 (`use-stacking-keys.ts`, the `others` input), run the union grep, `build:ui`, `check-bundle`.
5. **font-pick**: last, because it adds an action and changes the generated lists. Rebase, run `pnpm exec tsx scripts/gen-routes.ts`, then `--check`.

After the last merge, run `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run check:scripts` (expected to fail only at the `check-actions` items left for Tyler; write the counts), `pnpm run lint:gate`, `pnpm exec tsx scripts/gen-routes.ts --check`, `pnpm run build:ui`, `pnpm exec tsx scripts/check-bundle.ts` and `pnpm exec tsx scripts/check-boot-imports.ts`. Then `pnpm run desktop:pack`. Then one mock session on merged main: attach a fresh `p40-kit` copy and use the first Swap at once; `call-action.ts` for `stacking.set`, `kit-drift.apply` and `font.list` (0 diffs each).

## Real-model run budget

None. No pick changes a prompt or the run loop. Total: 0 runs.

## Runners-up

1. Route copy into an existing prototype drops the first page's canvas frame (cycles 35 to 39). Needs an app run to prove.
2. Alignment hits in the run-end fix loop for prototypes (after align-check proves the false-hit rate).
3. Export of tall frames: raise `EXPORT_FRAME_MAX_SIDE` for height (export side cap, `contracts/src/export.ts` line 28).
4. Figma Mac keys for Bring to front and Send to back (`⌥⌘]`, `⌥⌘[`): move next and previous direction first.
5. `inspect_accessibility` takes `colorScheme`, so an MCP client can check dark contrast on any frame (0 hits in `accessibility/inspect.ts`).
6. Web fonts in the font list for HTML prototypes: a fixed list of Google families that adds the link through `design-system/html-link.ts` in the same version.
7. Card parts: split a 2-part hand card into `CardHeader` and `CardContent` (kit-swap skips it with `needs-parts`).
8. The rest of `check-actions` (S11 and E1 hits since 2026-11-08, O12 52, E16 6), once Tyler decides.
9. Asset folder for a dynamic single page: a move to `/visits/[id]` copies assets to `public/id/` (not rechecked).
10. The first double-click after a page load sometimes does not open the text edit (not rechecked).

Dropped from the list: math in number fields, selection colors, text wrap and truncate, spacing handles, hide and lock (the code exists, see Findings).

Sources: [Figma forum: preview font families on the canvas with the arrow keys](https://forum.figma.com/t/launched-preview-font-families-on-page-when-cycling-through-with-the-arrow-keys/46227/59), [Figma forum: font picker](https://forum.figma.com/archive-21/launched-font-picker-14332/index2.html), [Fable: canvas font previews](https://fable.app/releases/canvas-font-previews), [Figma forum: bring back the send to back and bring to front shortcuts](https://forum.figma.com/share-your-feedback-26/bring-back-the-send-to-back-and-bring-to-front-shortcuts-46289), [Figma forum: changing bring forward and bring to front hotkeys](https://forum.figma.com/ask-the-community-7/changing-bring-forward-bring-to-front-hotkeys-47717), [Skillademia: Figma shortcuts](https://www.skillademia.com/shortcuts/figma-shortcuts/).

## Results

Merged into main in this order: polish-40, tall-frames, align-check, z-ends, font-pick. There was 1 conflict, in `use-stacking-keys.ts`, between z-ends and the polish-40 batch write. The fix puts every write of one key press into one `writeZOrder` call. Forward and backward give 1 version for any selection. Front and back give 1 version for 1 layer. With many layers selected, front and back give 1 version per layer, so the layers keep their order. No app check was done on this fix.

- **polish-40:** The first-version hold now also covers writes outside `/d/`, and the action runner uses the same rule. The first Swap, `apply_kit_drift` and `set_stacking` on an app that was attached just before now pass on all 3 surfaces. `call-action.ts` now undoes each write and ignores version ids. `stacking.set` takes `others`. The check-actions text scan went from 560 hits to 557.
- **tall-frames:** Frames can be up to 8,000 px tall, and the width limit stays 4,000 px. Frame shots now reach the full frame height. Export and review still stop at 4,000 px.
- **align-check:** The Review panel has a new "Alignment and gaps" group. It finds near-miss edges and uneven gaps, and a Fix gives 1 version. The check takes 19 to 27 ms on a page with 400 elements.
- **z-ends:** Mod+Shift+] brings a layer to front and Mod+Shift+[ sends it to back, from the shell, the frame, the Layers panel and the menu.
- **font-pick:** The inspector Font field opens a font list with a filter. Up and Down show a preview, Enter saves 1 version, and Escape reverts. The tool name is `list_font`, because `list_fonts` fails `studio/derived-tool-name`.

Open (Tyler decides):
- `check:scripts` still fails at check-actions (S11, E1, O12, E16).
- These MCP snapshots differ, and none was edited: the `canvas.json` height maximum (4000 to 8000), `review_frame` in `direct-edit-component.json`, and `set_forced_state`. The cause of the `set_forced_state` diff is not proven.
- Cmd+Z by OS keyboard is a manual check.

Checks: gen, tsc, lint and lint:gate pass (59,586 diagnostics, baseline 89,733). ui passes, clip finds 0, pack and the reinstall pass, and :4570 gives 200. Idle CPU is 0.02 CPU-s over 60 s. check-bundle B1 is 274,703 B (delta 0). Nothing was pushed.
