# Feature cycle 41: next 5 features

Date: 2026-11-14. Main at `711b93090` (all 5 cycle-40 picks merged; B1 at 274,703 B, delta 0).

## Method

- Read `cycle-40.md` (picks, runners-up, Results, Open) and `cycle-40/{polish-40,tall-frames,align-check,z-ends,font-pick}.md` ("Left out", "Open" and "Differences from the spec").
- Read the runners-up of `cycle-32.md` to `cycle-39.md`, and counted the items that came back cycle after cycle.
- Read the code for each candidate:
  - Figma editing: `shared/{keymap.ts,keymap-edit.ts}`, `ui/features/inspector/{color-field.tsx,use-color-field.ts,css-value-model.ts,vector-color-row.tsx,swatches.tsx,use-style-scan.ts,use-match-picker.ts,copy.ts}`, `ui/features/fill/*`, `ui/features/effect/copy.ts`, `ui/features/versions-layers-tokens/{use-layer-rename.ts,use-node-edits.ts}`, `ui/features/canvas/free-move-model.ts`, `bridge/free-move.ts`, `server/direct-edit/engine/tailwind/map.ts` (color alpha), `server/style-scope/layer-style/layer-scale-run.ts`, `server/design-system/extract/figma-variables.ts`, `server/design-system/token-export/engine/to-figma.ts`.
  - Fonts: `actions/src/font/{list.ts,schema.ts}`, `server/design-system/font-list/{font-store.ts,engine/to-font-rows.ts}`, `server/design-system/html-link.ts`, `server/direct-edit/commit/edit-plan.ts`, `ui/features/inspector/{use-font-list.ts,font-list-model.ts}`.
  - Review quality: `contracts/src/review.ts`, `server/review/{run.ts,probe.ts,type-probe.ts,type-drafts.ts,checks.ts,align-probe.ts,critique-capture.ts,critique-target.ts,frame.ts}`, `server/review/engine/{index.ts,type-rhythm.ts,type-lines.ts,type-facts.ts,align-lines.ts,align-gap.ts}`, `ui/features/review/{review-model.ts,review-request.ts}`.
  - Tall export and review: `contracts/src/{canvas-file.ts,export.ts}`, `actions/src/export/schema.ts`, `actions/src/direct-edit/payload/schema.ts`, `server/project-source/source.ts`, `server/export/vector.ts`.
  - Stacking: `ui/features/stacking/{use-stacking-keys.ts,stacking-api.ts,z-order-model.ts}`, `actions/src/stacking/{set.ts,schema.ts}`.
  - MCP snapshots: `scripts/mcp-snapshot.ts` (`EXISTING_GROUPS`, `NEW_GROUPS`), `scripts/stamp/names.ts` (`deriveNames`), all 14 files in `artifacts/mcp-snapshots/` (112 tool names), `contracts/src/state-styles.ts`, `actions/src/state-style/{set-forced.ts,schema.ts}`, the `check:scripts` line of `apps/desktop/package.json`, `scripts/check-bundle.ts` (`checkB1`).
- Read `git log` for `state-styles.ts`, `set-forced.ts` and `direct-edit-element.json` since 2026-11-08, and compared the snapshot `state` enum with `STYLE_STATES` with one `node -e` (read only).
- Counted Bonaparte use (read only, `git grep -l` on `*.tsx`, 6,446 files): color alpha classes such as `bg-black/50` in 818 files, `text-balance` or `text-pretty` in 57, `whitespace-nowrap` in 143, `rounded-[` in 31.
- Checked fixture prefixes in `ds-wt` with `ls` and branch names with `git branch -a --list`.
- Did no web search, no real-model run, no app run, no build and no test. I did not run `mcp-snapshot.ts --check`, because it boots the server. The B1 number is from cycle 40 (`check-bundle` at the merge).

### Open items from cycle 40, and the pick that closes each

| Open item | Pick |
|---|---|
| Export and review stop at 4,000 px for frames up to 8,000 px tall | 1 polish-41 |
| Align check does not cover gaps in grids with more than one row, or edges in rows of a block parent | 1 polish-41 |
| Bring to front and Send to back on many layers give 1 version per layer | 1 polish-41 |
| The `set_forced_state` MCP snapshot diff has no known cause | 1 polish-41 (cause found below; the pick reports it, no snapshot edit) |
| `check:scripts` S11, E1, O12 and E16 items | Tyler decides. Not planned |
| OS-keyboard Cmd+Z through the macOS menu | Tyler decides. Not planned |
| The `canvas.json` height maximum diff (4000 to 8000) and the `review_frame` text diff | Tyler decides. No pick edits a snapshot file |
| Home preload 274,703 B | Gate for every pick: B1 at or under 274,703 B |

### Findings

- **Home preload (a rule for all picks).** The gate is B1 at or under 274,703 B. `checkB1` (`scripts/check-bundle.ts` line 143) counts only the `.js` files of the Home preload set. CSS does not count, but `ui/app/main.tsx` imports `styles/inspector.css` (line 30) and `styles/review.css` (line 60) on Home, so new rules go in a feature `*.module.css` file, not in those 2 files. No key handler goes in a Home chunk (`ui/features/commands/**`, `ui/platform/*`, `ui/app/main.tsx`, `ui/app/screen-preload.ts`). The inspector, review and stacking features are not in the Home preload set.
- **`set_forced_state` snapshot diff: the cause (polish-41).**
  - The snapshot `direct-edit-element.json` was written by `mcp-snapshot.ts` in `b852d3b47` (2026-11-08). In it, `set_forced_state` has the old description and a `state` enum of 5 values: `hover`, `focus-visible`, `active`, `disabled`, `dark`.
  - The tool is generated from the action `state-style.setForced` (`actions/src/state-style/set-forced.ts`, `mcp: { name: "set_forced_state" }`). Its `state` field is `Schema.Literals(STYLE_STATES)` (`state-style/schema.ts` line 18). `STYLE_STATES` (`contracts/src/state-styles.ts` line 1) now has 19 values.
  - 8 commits from 2026-11-13 to 2026-11-14 widened the enum or changed the description: `74959ecd9` (open, checked, selected), `0679a706c` (description), `8e7c8b127` and `661642047` (group states), `cd718a551` and `9a4f03c9d` (first, last, odd, even), `7ffed28d0` (closed, on, active-item, invalid), `6b80656a9` (short text). None of them changed a file in `artifacts/mcp-snapshots/` (`git show --stat`).
  - `4b55cbe59` (2026-11-14) changed `direct-edit-element.json` after those commits, but its diff adds only the `replace` field of `edit_element`. So that file was patched by hand for 1 tool, and the other drift stayed.
  - Root cause: nothing runs the snapshot compare. `mcp-snapshot.ts --check` boots a server, and no step of `check:scripts` (6 steps) or `check` calls it (0 hits for `mcp-snapshot` in the `package.json` scripts), and the commit hook does not call it (0 hits in `.git/hooks/pre-commit`, `~/.git-hooks/pre-commit` (`core.hooksPath`, which delegates to the repo hook) and `apps/desktop/scripts/hooks/{pre-commit,run-pre-commit.mjs}`). So a schema change in a stamped action reaches MCP with no failed check.
  - `list_state_styles` has no `state` enum in the snapshot, so its input does not drift. `set_state_style` is in no snapshot. Only `set_forced_state` carries the enum.
  - `direct-edit-element` is a `NEW_GROUPS` file (`mcp-snapshot.ts` line 61), so `mcp-snapshot.ts direct-edit-element` can rewrite it. The 7 `EXISTING_GROUPS` files (line 57: comments, export, mcp-read, packs, publish, share, ship) are never rewritten (line 325).
- **Tall export and review: where the 4,000 cap is (polish-41).**
  - Export: `EXPORT_FRAME_MAX_SIDE = 4000` (`contracts/src/export.ts` line 28) is used for width and height by `SideSchema` in `server/project-source/source.ts` (lines 212 and 246). A second copy is `FRAME_SIDE_MAX = 4000` in `actions/src/export/schema.ts` (line 5), used by `ExportFrameSchema` for width and height. `export.json` has 2 `"maximum": 4000` lines (62 width, 67 height). `export` is an `EXISTING_GROUPS` file, so a higher height cap makes `--check` differ at line 67. This is an expected diff for Tyler, the same as the cycle-40 `canvas.json` diff.
  - Scale: `EXPORT_SCALES` is 1, 2 and 3 (`export.ts` line 26). 3 x 8,000 px is 24,000 px, over Chrome's 16,384 px limit. `export/vector.ts` already caps a page at 16,000 px (`MAX_PAGE_HEIGHT`, line 40) and 60 M pixels (line 41), so the PDF and SVG path is safe; the PNG path is not.
  - Review: `SIDE_MAX = 4000` in `ui/features/review/review-request.ts` (line 11) clamps width and height. `SIDE_MAX = 4000` in `actions/src/direct-edit/payload/schema.ts` (line 17) is the `SideSchema` of `ReviewFrameFields` (lines 108 and 110, its only users). The `review_frame` MCP tool has `frame`, `path` and `viewport` but no `width` or `height` in `direct-edit-component.json`, so a review height cap change makes no snapshot diff.
  - Critique: `critique-capture.ts` uses `tileHeight: target.height` (line 41) and `MAX_TILES = 2` (line 24). Since tall-frames, a 7,000 px frame gives 1 tile of 7,000 px to the model. Keep each tile at 4,000 px or less, so 2 tiles cover 8,000 px.
- **Align check gaps (polish-41).** In `review/engine/align-lines.ts`, `toLines` returns no row line when the parent is not flex or grid (line 156), and `toSides` returns no side for a row of a block parent (line 170). So a row of `inline-block` cards gets no edge check. For a grid, `toBands` (line 121) cuts the children into rows and checks each row alone. Nothing compares the gaps between rows, or the left edges of one column across rows.
- **Front and back on many layers (polish-41).** `runStepPlans` (`use-stacking-keys.ts` line 211) sends 1 `writeZOrder` call for forward and backward. For front and back with 2 or more layers, it calls `runEndSteps` (line 191), which reads the live stack, writes 1 layer, and repeats. Each write is 1 version. The fix plans every layer in memory against one stack, then sends 1 call. Two traps: `toUniqueWrites` (line 133) keeps the first write for each source, but a planned sequence needs the last write to win; and `STACKING_OTHERS_MAX = 20` (`stacking/schema.ts` line 105), so 1 call holds at most 21 layers.
- **Figma editing: which gaps are real.** Most Figma controls exist. Do not plan these again:
  - Distribute, tidy up and align on the canvas: `shared/arrange.ts`, keymap labels "Distribute horizontally", "Tidy up". Group and ungroup: `keymap.ts` lines 254 and 290.
  - Gradient fills: `fill/gradient-fields.tsx`. Inner shadow, layer blur and background blur: `effect/copy.ts` lines 22 to 26.
  - Constraints and min and max size: `inspector/{constraint-rows.tsx,min-max-rows.tsx}`. Hug, fill and fixed: `inspector/sizing-model.ts` (`toSizeMode`).
  - Layer search and drag reorder: `versions-layers-tokens/{layer-search-field.tsx,use-row-drag.ts}`. Copy as CSS: `inspector/copy-css-button.tsx`. Version compare: `versions-layers-tokens/compare-mode-model.ts`. Image paste and drop: `canvas/{use-image-paste.ts,image-drop-model.ts}`.
  - Scale tool: `canvas/use-scale-drag.ts`, `style-scope/layer-style/layer-scale-run.ts`. Alt-drag duplicate: `canvas/free-move-model.ts` line 98 (`copy = drag.alt`).
  - **Figma variables import and export** (runner-up in cycles 32 to 38): `extract/figma-variables.ts` and `token-export/engine/to-figma.ts` exist. Drop it from the list.
  - Color alpha in Tailwind writes: `tailwind/map.ts` line 464 already writes `bg-x/50` and `bg-x/[0.37]`.
  - **Real gap 1: color picker.** The color field swatch is the native `<input type="color">` (`inspector/color-field.tsx` line 71; also `vector-color-row.tsx` line 43 and `token-inputs.tsx` line 70). It has no alpha. `toHexColor` (`css-value-model.ts` line 157) returns null for an alpha below 1, so an `rgba()` fill shows a white swatch (`NEUTRAL_SWATCH`, line 20) and a pick from the native panel drops the alpha. There is no "colors on this page" list: 0 hits for `document colors|recent colors|page colors` in `ui`. Figma's picker has a saturation pad, hue and alpha sliders, and the page colors. Bonaparte uses alpha classes in 818 files.
  - **Real gap 2: web fonts in the font list.** `list_font` lists only the fonts that the direction loads, then 5 system fonts (`to-font-rows.ts` line 231; `FONT_SOURCES` in `font/schema.ts` line 3 has no catalog source). In Figma every Google family is in the list. In a quick HTML prototype you cannot pick a new font without a hand-written `<link>`. This was cycle-40 runner-up 6 and font-pick "Left out".
  - Batch rename: real (0 hits for `renameLayers|batch rename`; `set_layer_state` renames 1 layer), but it needs a new list write. Runner-up 1.
- **Claude Design quality: which gaps are real.**
  - **Real gap 3: orphan words and wrapped buttons.** 0 hits for `orphan|widow|balance|pretty` in `server/review`. `type-probe.ts` already counts the lines of each text with Range rects (`lineCount`, line 31). `text-wrap` and `white-space` are in `DIRECT_STYLE_PROPERTIES` (`contracts.ts` line 2096), so a fix can write `text-balance`, `text-pretty` or `whitespace-nowrap`. AI pages often end a heading with 1 word on its own line, or wrap a 2-word button to 2 lines. Claude Design output uses balanced headings.
  - **Real gap 4: near-duplicate values in a prototype with no tokens.** When a project has no tokens, Review skips the off-token check ("This project has no design tokens yet, so Review skips the off-token check.", `run.ts` line 250). Most quick prototypes have no tokens. The probe still collects every authored color and radius literal (`probe.ts` lines 45 and 46, `COLOR_PROPS` and `LENGTH_PROPS`). The type check covers the spacing scale (`type-lines.ts` line 124) but not radius or color. So `#2563eb` beside `#2463ea`, or radius 10 beside eight uses of 8 and 12, pass with no hit. `shared/color-near.ts` already has the color distance code.
  - The align fix loop at the run end (cycle-40 runner-up 2) changes the run loop and needs a real-model budget. Not picked.
- **Repeat items: which are real.**
  - Route copy into a prototype drops the first frame (cycles 35 to 40, 6 cycles): not rechecked; it needs an app run. Runner-up 2.
  - `inspect_accessibility` has no `colorScheme` (cycles 39 and 40): still real. Dark work; not picked this cycle.
  - Canvas memory (doop, cycles 32 to 36): not rechecked; it fell off the list.
- **Tool names.** A derived name is `snake(verb)_snake(camel(domain))` (`stamp/names.ts` line 126), with a singular domain (`font.list` gives `list_font`, so cycle 40 could not use `list_fonts`). No pick this cycle adds an action, so no new tool name must pass `studio/derived-tool-name`. Every pick reuses a tool by name: `export`, `export_frame`, `review_frame`, `apply_fix`, `get_stacking`, `set_stacking`, `find_styles`, `edit_element`, `batch_edit`, `list_font`.
- **Branch check.** No `feat/polish-41`, `feat/color-pick`, `feat/font-web`, `feat/wrap-check` or `feat/near-values`.
- **Fixture prefixes.** `p41-`, `ck-`, `fw-`, `wc-` and `nv-` are not in `ds-wt`. `cp-`, `pk-` and `tw-` are in use, so no pick uses them. The cycle-40 fixtures `ag-seed`, `th-seed`, `ze-seed` and `fp-*` are gone, so picks make new ones. `ac-next-b` and `pt-seed` are in `ds-wt`; picks copy them and never write into them.
- **`.claude/goal/roadmap.md`.** Cycle-40 picks did not find it in their worktrees. Each pick adds its new files to Appendix A when the file is in the worktree (L6e), and writes "not in worktree" in its report when it is not.

## Ranking

Score = value x fit with "simple and fast" / effort (1 to 5 each).

| Rank | Key | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|---|
| 1 | polish-41 | Tall export and review, align rows and grids, 1 version for front and back on many layers, `set_forced_state` cause | 4 | 5 | 3 | 6.7 |
| 2 | color-pick | Color popup with alpha, a saturation pad and the page colors (Figma) | 5 | 5 | 3 | 8.3 |
| 3 | wrap-check | Review finds orphan words in headings and wrapped buttons, with a fix (Claude Design quality) | 4 | 5 | 2 | 10.0 |
| 4 | font-web | Google families in the font list for HTML prototypes, with the link in the same version (Figma) | 4 | 4 | 3 | 5.3 |
| 5 | near-values | Review finds near-duplicate colors and radii when the project has no tokens (Claude Design quality) | 4 | 5 | 3 | 6.7 |

The file lists the picks in a fixed order (polish, Figma, quality, Figma, quality), not by score. 0 of 5 picks are kit or dark check work. Picks 2 and 4 are Figma manual-editing gaps; picks 3 and 5 are Claude Design quality gaps.

No pick adds an always-visible control, a Home import or an action. Only pick 4 changes a generated file (the `contracts` `exports` map):
- Pick 1 changes caps, 1 engine and 1 write plan.
- Pick 2 replaces the native swatch with a popup on click.
- Pick 3 adds rules to the existing `type` kind.
- Pick 4 adds rows to an existing list and 1 step to the edit plan.
- Pick 5 adds 1 review kind.

---

## 1. polish-41: tall export and review, align rows, 1 version for front and back, set_forced_state cause (polish)

**Items.** Prove each one first; change code only for what the proof shows.

- **Export and review up to 8,000 px tall.**
  - Proof first: HTML prototype `ds-wt/p41-tall` (a landing page of about 7,000 px at 1440 wide; fit the frame). Export it as PNG at 1x and as PDF, and run Review. Expected on main: export refuses with "height must be 1 to 4000", and Review checks only the top 4,000 px.
  - Export: add `EXPORT_FRAME_MAX_HEIGHT` beside `EXPORT_FRAME_MAX_SIDE` in `contracts/src/export.ts`, equal to `CANVAS_MAX_HEIGHT` (import it from `canvas-file.ts`; no second literal). `source.ts` gets 2 side schemas (width 4,000, height 8,000) and the error text names the right cap. `actions/src/export/schema.ts` drops its local `FRAME_SIDE_MAX` and imports both caps; `ExportFrameSchema.height` uses the height cap.
  - Scale rule: when `height x scale` is over 16,000 px for a PNG, fail with `BadRequest` "This frame is 7,000 px tall. Export it at 1x or 2x." The export dialog disables 3x for such a frame, with a `data-tip` that says why. PDF and SVG keep the `vector.ts` caps.
  - Review: `review-request.ts` clamps width to `CANVAS_MAX_SIDE` and height to `CANVAS_MAX_HEIGHT` (2 functions, no literal). `payload/schema.ts` gets a `HeightSchema` up to `CANVAS_MAX_HEIGHT` for `ReviewFrameFields.height` only. `rules-editor.tsx` line 19 is a different cap; do not change it.
  - Critique: `critique-capture.ts` uses a tile height of `Math.min(target.height, CANVAS_MAX_SIDE)`, so 2 tiles cover 8,000 px and no image is over 4,000 px tall.
  - Snapshots: `export.json` will differ at line 67 (the `export` tool frame height maximum, 4000 to 8000). Do not edit it. Write the diff line in the report "Open" for Tyler. Confirm with a `node -e` read that `review_frame` in `direct-edit-component.json` has no width or height field, so it has no new diff.
  - Pass: on `p41-tall`, PNG 1x and 2x and PDF export the full 7,000 px; 3x is off with the tip; Review lists hits below 4,000 px (put one low-contrast footer link there); critique sends 2 tiles, of 4,000 and 3,000 px. Write the export and review ms in the report.
- **Align check: grids with more rows, and rows of a block parent.**
  - Proof first: HTML prototype `ds-wt/p41-align` with a grid of 3 columns and 4 rows of cards whose row gaps are 24, 24 and 21 px (the gap line needs 4 or more rows: `GAP_LINE_MIN = 4`, `align-gap.ts` line 17), one card in column 2 of row 2 that is 2 px right of the column, and a block parent with 4 `inline-block` cards where card 3 is 2 px lower. Expected on main: 0 hits for all 3. Measure the card rects first: a baseline-aligned `inline-block` with `margin-top: 2px` can keep its border box on the baseline. If the box does not move, make card 3 lower with `position: relative; top: 2px` and give that hit `fix: null` (or a `top` fix), not the margin fix.
  - Grid rows (`align-lines.ts`): when `toBands` gives 2 or more bands with the same child count, add 1 column line per column index (child k of each band, axis `column`), checked for start edges; and add 1 gap line over the band tops (the row gaps). Reuse `isNear` and `toMode`; no new threshold.
  - Block rows: in `toLines`, when the parent is not flex or grid and every child is `inline-block` or `inline-flex`, return the row bands (today line 156 returns `[]`). `toSides` for such a row returns `["start"]` (the top edge), and `["end"]` when every child has `vertical-align: bottom`. The probe (`align-probe.ts`) must stop dropping these children: it keeps `inline-block` today (it drops only `inline`, `contents` and `none`, line 40), so add `display` and `verticalAlign` per child to the child record.
  - The direct fix stays the same: a fix only when one child's own margin causes the hit and the proof shows that the margin moves the box.
  - Pass: `p41-align` gives 3 hits (row gap, column edge, inline-block card), 2 with Fix; the cycle-40 rules give the same hits as before on the same page; the check stays under 30 ms on a 400-element page (cycle 40: 19 to 27 ms).
- **Front and back on many layers: 1 version.**
  - Proof first: HTML prototype `ds-wt/p41-z`: 4 overlapping cards (z auto, 1, 2, auto). Select cards 1 and 3, `Mod+Shift+]`: expected on main 2 or more versions.
  - Fix (`use-stacking-keys.ts`, `z-order-model.ts`): read the stacks of all selected layers once (`readEntries`). A new pure function in `z-order-model.ts` (`toEndPlans`) folds the layers in the order of `toRunOrder`: after each layer's plan, it puts the new z values into the in-memory sibling list, so the next plan sees them. It returns one write list in which the last write for each source key wins (a new `toLastWrites`; keep `toUniqueWrites` for forward and backward). Then 1 `writeZOrder` call.
  - Cap: when the list has more than 21 writes (`STACKING_OTHERS_MAX` + 1), make no write and show the toast "Select 20 layers or fewer to bring them to front." (text in `stacking/copy.ts`).
  - The selected layers keep their order among themselves: the top selected layer stays on top after Front, and the bottom one stays at the bottom after Back.
  - Pass: cards 1 and 3, Front: 1 version, both paint over cards 2 and 4, card 3 stays over card 1; 1 Cmd+Z restores all. Back: the same. `pnpm exec tsx scripts/call-action.ts stacking.set '<json>'` with 3 `others`: 0 diffs.
- **`set_forced_state` snapshot diff: report the cause.**
  - The cause is in Findings. The pick confirms it with a `node -e` compare of the snapshot enum against `STYLE_STATES` and the 8 commits (`git log --format='%h %s' 74959ecd9^..HEAD -- packages/common/contracts/src/state-styles.ts packages/common/actions/src/state-style/`), and writes the result in its report under "Open".
  - Do not edit any file in `artifacts/mcp-snapshots/`. Do not wire `mcp-snapshot.ts --check` into a script; that is one more `check:scripts` decision for Tyler. Write it next to the other `check:scripts` items.

**Headless.** No new action and no new tool name. `export` accepts frame heights up to 8,000 (its frame list holds the 2 `maximum: 4000` lines of `export.json`; snapshot diff for Tyler). `export_frame` has no width or height field, so it exports a tall frame at its canvas size with no input change. `review_frame` reviews the full frame height. `set_stacking` already takes `others`. `get_stacking` and `set_stacking` serve MCP and the agent for front and back.

**Main files.** `contracts/src/export.ts`; `actions/src/export/schema.ts`; `server/project-source/source.ts`; `ui/features/share-publish-ship-export/export-scale-field.tsx` (the `EXPORT_SCALES` buttons) and text lines in its `copy.ts`; `ui/features/review/review-request.ts`; `actions/src/direct-edit/payload/schema.ts`; `server/review/critique-capture.ts`; `server/review/{align-probe.ts,engine/align-lines.ts,engine/align-gap.ts}`; `ui/features/stacking/{use-stacking-keys.ts,z-order-model.ts,copy.ts}`; fixtures `ds-wt/p41-*`. Not `actions/src/stacking/**`, not `artifacts/mcp-snapshots/**`, not `package.json`.

**Verify in the running app.** The steps above, on `STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev`. Dark and light screenshots of the export dialog with 3x off and of the Review panel on `p41-align`. `pnpm run build:ui`, `check-bundle`: B1 at or under 274,703 B. No real-model run (the critique tile check uses the mock reply).

---

## 2. color-pick: color popup with alpha and page colors (Figma)

**Why.** In Figma you click a swatch and get a saturation pad, a hue slider, an alpha slider and the colors that the page already uses. Here the swatch opens the OS color panel. It has no alpha, so a pick on an `rgba()` fill or a `bg-black/50` overlay drops the alpha. The swatch of such a color shows white. Bonaparte uses alpha classes in 818 files, so this hits every overlay, border and muted text.

**Behaviour.**
- **Open.** A click on the swatch (or Enter on it) opens a popup under the field (`.ui-menu` surface, 240 px wide). The text input, the eyedropper and the token control stay as they are. Escape or a click outside closes it.
- **Popup parts.**
  - Saturation and value pad (240 x 160) and a hue slider. Drag or arrow keys (1 step, Shift 10) change the color.
  - Alpha slider on a check pattern, and an alpha field (0 to 100 %).
  - Hex field (6 digits; 8 digits when alpha is below 100 %).
  - "On this page": up to 16 swatches of the colors that the frame uses, most used first, from the existing style scan (`use-style-scan.ts`, the same data as Selection colors). A click applies the color. A token color shows its token name in the `data-tip`.
- **Write.** A drag previews on the canvas with `edit.preview` (once per animation frame). Pointer up commits with `edit.commitSoon`: 1 version per drag. Escape during a drag reverts (`edit.revert`). The value is the hex when alpha is 100 %, else `rgb(r g b / a)`. In a Tailwind page the existing map writes `bg-x/50` (`tailwind/map.ts` line 464).
- **Swatch.** `toHexColor` stays as it is for the text field. The swatch gets a new `toSwatchColor` that keeps the alpha, on a check pattern, so `rgba()` values no longer show white.
- **Where.** `color-field.tsx` and `vector-color-row.tsx`. Not the token editor (`token-inputs.tsx`), which is runner-up 6.
- **Cost.** The HSV and hex math is a pure model file with no new package (do not import `culori` into the UI chunk). The page colors come from the scan that the inspector already runs; no new bridge message.

**Headless.** No new action. MCP and the agent use `find_styles` to list the colors on the page (it works "like the Selection colors panel", `mcp/style-tools.ts` line 203) and `edit_element` with a `style` color such as `rgb(15 23 42 / 0.5)` to write one.

**Main files.** `ui/features/inspector/{color-field.tsx,use-color-field.ts,vector-color-row.tsx,css-value-model.ts}`; new `ui/features/inspector/{color-popup.tsx,color-pad.tsx,color-slider.tsx,color-page-swatches.tsx,use-color-popup.ts,color-popup-model.ts,color-popup.module.css}`; `ui/features/inspector/copy.ts` (479 lines: add 10 lines or fewer, see the budget in File ownership). Not `styles/inspector.css` (Home CSS), not `ui/features/commands/**`.

**Verify in the running app.**
- HTML prototype `ds-wt/ck-seed`: a card with `background: rgba(15, 23, 42, 0.5)`, a button with `#2563eb`, and text in 3 grays. Tailwind app `ds-wt/ck-next` (copy of `ac-next-b`) with an overlay `bg-black/50`.
- `ck-seed` overlay: the swatch shows the alpha color, not white. Open the popup, drag alpha to 30 %: the canvas follows, pointer up gives 1 version with `rgb(15 23 42 / 0.3)`, Cmd+Z restores. Click the `#2563eb` swatch in "On this page" on the text: 1 version. Escape mid-drag: no change.
- `ck-next` overlay: alpha 40 % writes `bg-black/40`.
- Arrow keys in the pad move the color; Tab leaves the popup.
- Dark and light screenshots of the popup. `pnpm run build:ui`, `check-bundle`: B1 at or under 274,703 B. No real-model run.

---

## 3. wrap-check: orphan words and wrapped buttons (Claude Design quality)

**Why.** AI pages often end a heading with 1 word on its own line ("Plan your next / trip"), or wrap a 2-word button or badge to 2 lines in a narrow card. People see it as unfinished. Claude Design output balances its headings. Bonaparte uses `text-balance` or `text-pretty` in 57 files and `whitespace-nowrap` in 143. The studio Review has no check for it (Findings).

**Behaviour.**
- **Probe.** `type-probe.ts` adds 3 fields to each text record: `lastLineWords` (the count of words whose Range rect top is on the last line; the probe already finds the line tops in `lineCount`), `textWrap` (the computed `text-wrap` or `text-wrap-style`) and `whiteSpace`. For a label tag (`LABEL_TAGS`, `LABEL_CLASS` in the probe) it also adds `roomPx`: the free width in the parent row (parent content width minus the sum of the child widths, for a flex row; else 0).
- **Rules (pure engine `review/engine/type-wrap.ts`, `toWrapHits`, called from `toTypeHits` in `type-rhythm.ts`).**
  - Orphan heading: `h1` to `h4`, or text of 20 px or more, with 2 or more lines, 1 word on the last line, and `text-wrap` not `balance` or `pretty`. Severity low; medium for an `h1`. Fix: `text-wrap: balance` (Tailwind `text-balance`).
  - Orphan paragraph: `p` or `li` with 3 or more lines, 1 word on the last line, `text-wrap` not `pretty`. Severity low. Fix: `text-wrap: pretty` (`text-pretty`). Max 6 per frame.
  - Wrapped control: a label tag with 4 words or fewer, 2 or more lines and `white-space` not `nowrap`. Severity medium. Fix: `white-space: nowrap` (`whitespace-nowrap`) only when `roomPx` is at least the text width of the extra lines; else `fix: null` with the hint "Shorten the label or give it more room."
  - Max 12 wrap hits per frame, inside the existing type `HIT_CAP` (24).
- **Message.** "The last line of this heading has 1 word ("trip"). Balance the lines." / "This button text wraps to 2 lines."
- **Where.** The existing "Type and spacing" group of the Review panel and `review_frame`. Kind `type`, so `REVIEW_KINDS` does not change.
- **Cost.** At most 10 ms more per frame on a 400-element page. Write the ms in the report.

**Headless.** No new action. `review_frame` returns the hits in kind `type`; `apply_fix` applies the fix. Do not change the `review_frame` description, so no snapshot text changes.

**Main files.** `server/review/type-probe.ts` (116 lines); new `server/review/engine/type-wrap.ts`; `server/review/engine/{type-rhythm.ts,type-facts.ts}` (the 3 new fields on `TypeText`); `server/review/type-drafts.ts` only if the fix needs a new style key mapping. Not `server/review/run.ts`, not `checks.ts` (834 lines), not `contracts/src/review.ts`.

**Verify in the running app.**
- HTML prototype `ds-wt/wc-seed` at 1440 and 390 wide: an `h1` that ends with 1 word at 390, an `h2` with `text-wrap: balance` (0 hits), a 3-line paragraph with 1 last word, a card with a 2-word button that wraps (room in the row), a badge that wraps with no room, and a clean section.
- Review panel at 390: 4 hits, 3 with Fix. Fix on the `h1`: 1 version, `text-wrap: balance`, 0 hits on re-run. The badge: `fix: null` with the hint. At 1440: only the hits that wrap at 1440.
- Tailwind app `ds-wt/wc-next` (copy of `ac-next-b` with one long `h1`): Fix writes `text-balance`.
- `review_frame` over MCP on `wc-seed`: the same hits.
- Dark and light screenshots of the group. No real-model run.

---

## 4. font-web: Google families in the font list (Figma)

**Why.** In Figma every Google family is in the font list. Here the list has only the fonts that the page loads, then 5 system fonts. To try "Fraunces" on a quick prototype heading, you must write a `<link>` by hand. Claude Design prototypes use web fonts, so the user wants to change them by hand too.

**Behaviour.**
- **Rows.** In an HTML prototype the font list gets a third group, "Google Fonts", after "In this project" and before "System": a fixed TS list of 40 families with their fallback (`'Fraunces', ui-serif, serif`). Families that the page loads already stay in "In this project" only. Typing filters all groups. Max 200 rows (the `list_font` cap stays).
- **Next and other apps.** The group is not shown. An app loads fonts with `next/font` or its own CSS, and a `<link>` in an app is wrong. A `next/font` write is runner-up 4.
- **Preview.** Up and Down on a Google row preview it on the canvas. The bridge adds 1 `<link rel="stylesheet" data-studio-font-preview>` for that family to the frame document (one at a time; it replaces the last one) and then sends the `edit.preview`. Escape or blur removes the link and reverts. A family that does not load in 3 s shows the row tip "This font did not load. Check the network." and the preview falls back.
- **Write.** Enter commits through the existing font-family edit path. In `edit-plan.ts`, after `patchSource`, when the target file is `.html`, the request sets `font-family` to a catalog family, and the file has no Google Fonts link with that family, the plan adds the family to the existing `fonts.googleapis.com/css2` link, or adds one link in `<head>`. It is the same file, so it is 1 version and 1 Cmd+Z. The link builder is a pure function beside the catalog.
- **Not in this pick.** No Google catalog fetch (the list is fixed in code), no font upload, no `next/font` import.

**Headless.** No new action. `list_font` returns the new rows with `source: "catalog"` in an HTML prototype. `edit_element` (and `batch_edit`) with `style: { "font-family": "'Fraunces', ui-serif, serif" }` adds the link in the same version, because they use the same edit plan. The `list_font` description says so (`list_font` is in no snapshot, so no snapshot change). Do not change the `edit_element` description, which is in `direct-edit-element.json`.

**Main files.** New `packages/common/contracts/src/google-fonts.ts` (the 40 families and `toGoogleFontsHref`, pure). Its `exports` entry in `packages/common/contracts/package.json` is generated: run `pnpm exec tsx scripts/gen-exports.ts` (`gen-exports.ts` line 99), never a hand edit (N7b). This is the only generated change of the cycle; `actions/src/font/{schema.ts,list.ts}` (`"catalog"` in `FONT_SOURCES` and in the `FontSourceSchema` annotation, the `list_font` description). Not `"google"`: `"google-link"` already means a family that the page links (D44, one word means one thing); `server/design-system/font-list/engine/to-font-rows.ts`; `server/direct-edit/commit/edit-plan.ts` (100 lines; 1 step, the link edit in a new sibling `commit/google-font-link.ts`); `bridge/live-preview.ts` (406 lines) or a new `bridge/font-preview.ts`, and the message type in `bridge/bridge-types.ts` and `actions/src/bridge-protocol.ts`; `ui/features/inspector/{use-font-list.ts,font-list-model.ts,font-list-popup.tsx}`; `ui/features/inspector/copy.ts` (6 lines or fewer). Not `design-system/html-link.ts` (it writes the tokens link; read it for the pattern).

**Verify in the running app.**
- HTML prototype `ds-wt/fw-seed` with an `h1` and no font link, and `ds-wt/fw-link` with a link for `DM Sans`.
- `fw-seed` `h1`: open the list, type "fra", Down: the canvas shows Fraunces, the source does not change. Enter: 1 version, the page has 1 link with `family=Fraunces`, the `h1` has the stack, and the canvas still shows Fraunces right after Enter, before any reload (the bridge keeps the preview link until the frame reloads). Cmd+Z removes both. Escape: no link, no change.
- `fw-link`: pick Fraunces: the one link now has `DM+Sans` and `Fraunces`; no second link.
- `ds-wt/fw-next` (copy of `ac-next-b`): no "Google Fonts" group.
- `pnpm exec tsx scripts/call-action.ts font.list '<json>'` on `fw-seed`: http, mcp and agent the same. `edit_element` over MCP with a Fraunces stack on `fw-seed`: the link is added.
- `pnpm exec tsx scripts/check-bridge-guards.ts` passes. Dark and light screenshots of the list. `pnpm run build:ui`, `check-bundle`: B1 at or under 274,703 B. No real-model run.

---

## 5. near-values: near-duplicate colors and radii (Claude Design quality)

**Why.** A quick AI prototype has no tokens, so Review skips the off-token check (Findings). The page then has `#2563eb` on 6 buttons and `#2463ea` on 1, or radius 8 on 9 cards and 10 on 1. Each value is close to the common one but not equal, so the page looks almost consistent. Claude Design output uses one value per role. Nobody sees these here.

**Behaviour.**
- **When.** Only when the project has no tokens (the case of `noTokensNote`, `run.ts` line 245). With tokens, off-token covers it. With no tokens, off-token still flags Tailwind arbitrary classes (`run.ts` line 247), so near-values skips every probe hit with `via: "class"` and uses only `inline` and `rule` hits. A literal gets 1 hit, never 2.
- **Data.** No new probe. Use `probe.tokens` (the authored literals from inline styles, CSS rules and Tailwind arbitrary classes, `probe.ts` lines 45 to 46). Families: `color`, `background-color`, `border-color`, `border-radius`.
- **Rules (pure engine `review/engine/near-values.ts`, `toNearValueHits`).**
  - Color: 2 distinct literals of one family are near when their OKLab distance is under 0.02 (use `shared/color-near.ts`). The literal with fewer uses gets the hit and points at the one with more uses. Ties: no hit.
  - Radius: a value used 1 or 2 times that is 1 to 2 px from a value used 3 or more times, on elements of the same tag. A value at equal distance from 2 common values: no hit. Report the false-hit count on a copy of `pt-seed`; if it is more than 1, use a 1 px window.
  - Max 10 hits per frame. Severity low.
- **Message.** "This color #2463ea is almost #2563eb, which 6 elements use. Use #2563eb." / "This radius 10 px is almost 8 px, which 9 elements use."
- **Fix.** Rewrite the rare literal in its source (inline style, CSS rule or arbitrary class) to the common literal, with the same fix and guard shape as off-token (`checks.ts` lines 702 to 722), built in a new `near-value-drafts.ts`. A rule that other selectors share: `fix: null`.
- **Where.** New kind `near-value`, label "Near-duplicate values", a new group in the Review panel, and `review_frame`.
- **Cost.** At most 5 ms per frame (pure math over the probe output).

**Headless.** No new action. `review_frame` returns the new kind; `apply_fix` applies the fix. Do not change the `review_frame` description, so no snapshot text changes. `REVIEW_KINDS` is in no action schema and no snapshot.

**Main files.** `contracts/src/review.ts` (`near-value` in `REVIEW_KINDS` and `REVIEW_KIND_LABEL`); new `server/review/engine/near-values.ts`; `server/review/engine/index.ts` (export lines); new `server/review/near-value-drafts.ts`; `server/review/run.ts` (459 lines: 1 call and the drafts merge, stay under 500); `ui/features/review/copy.ts` if the group needs text. Not `checks.ts` (834 lines, no growth).

**Verify in the running app.**
- HTML prototype `ds-wt/nv-seed` with no tokens: 6 buttons `#2563eb` and 1 `#2463ea`, 9 cards radius 8 and 1 radius 10, a gray `#64748b` used 4 times and `#64748c` once in a shared CSS rule, and a clean section.
- Review panel: 3 hits, 2 with Fix; Fix on the button: 1 version, 0 hits on re-run. The shared rule: `fix: null`. The clean section: 0.
- `ds-wt/nv-tok` (copy with a `:root` token for the blue): 0 near-value hits (off-token covers it).
- `review_frame` over MCP: the same hits.
- Union grep (N12): every use of `REVIEW_KINDS` and `ReviewKind` (`REVIEW_KIND_LABEL`, `review-model.ts` line 39, `run.ts` line 228, `checks.ts` line 157, `review-group.tsx`).
- Dark and light screenshots of the group. No real-model run.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 polish-41 | `contracts/src/export.ts`; `actions/src/export/schema.ts`; `project-source/source.ts`; `share-publish-ship-export/export-scale-field.tsx` and text lines in its `copy.ts`; `ui/features/review/review-request.ts`; `actions/src/direct-edit/payload/schema.ts`; `review/critique-capture.ts`; `review/{align-probe.ts,engine/align-lines.ts,engine/align-gap.ts}`; `ui/features/stacking/{use-stacking-keys.ts,z-order-model.ts,copy.ts}`; fixtures `ds-wt/p41-*` |
| 2 color-pick | `ui/features/inspector/{color-field.tsx,use-color-field.ts,vector-color-row.tsx,css-value-model.ts}` and new `color-*` files; `inspector/copy.ts` (10 lines or fewer); fixtures `ds-wt/ck-*` |
| 3 wrap-check | `review/type-probe.ts`; new `review/engine/type-wrap.ts`; `review/engine/{type-rhythm.ts,type-facts.ts}`; `review/type-drafts.ts` (only if needed); fixtures `ds-wt/wc-*` |
| 4 font-web | new `contracts/src/google-fonts.ts` and its generated `exports` entry in `contracts/package.json`; `actions/src/font/{schema.ts,list.ts}`; `design-system/font-list/engine/to-font-rows.ts`; `direct-edit/commit/edit-plan.ts` and new `commit/google-font-link.ts`; `bridge/{live-preview.ts or new font-preview.ts,bridge-types.ts}`; `actions/src/bridge-protocol.ts`; `ui/features/inspector/{use-font-list.ts,font-list-model.ts,font-list-popup.tsx}`; `inspector/copy.ts` (6 lines or fewer); fixtures `ds-wt/fw-*` |
| 5 near-values | `contracts/src/review.ts`; new `review/engine/near-values.ts`, `review/near-value-drafts.ts`; `review/engine/index.ts`; `review/run.ts`; `ui/features/review/{review-model.ts,copy.ts}`; fixtures `ds-wt/nv-*` |

Shared files and conflict warnings:
- **`ui/features/inspector/copy.ts` (picks 2 and 4).** It has 479 lines. Pick 2 adds 10 lines or fewer, pick 4 adds 6 or fewer: 495 at most. If a pick needs more, it removes an unused line first (L2). Text lines only; rebase.
- **Review files (picks 1, 3 and 5).** Pick 1 owns the align files, `critique-capture.ts`, `review-request.ts` and `payload/schema.ts`. Pick 3 owns `type-probe.ts` and the type engine files. Pick 5 owns `run.ts`, `engine/index.ts` and `contracts/src/review.ts`. Pick 3 does not add an `engine/index.ts` line (`type-rhythm.ts` imports `type-wrap.ts` directly). No two picks edit one review file.
- **Font list (pick 4 and the cycle-40 font-pick code).** Pick 4 is the only pick in `font-list-*` and `actions/src/font/**`.
- **Bridge (pick 4).** The only pick that changes `src/bridge` and `bridge-protocol.ts`. It runs `check-bridge-guards.ts` and keeps W20 (type imports only from `@design-studio/actions`).
- **`contracts`.** Pick 1 edits `export.ts`, pick 4 adds `google-fonts.ts`, pick 5 edits `review.ts`. 3 different files. Nobody edits `canvas-file.ts` (pick 1 imports `CANVAS_MAX_HEIGHT` from it).
- **MCP snapshots.** No pick edits a file in `artifacts/mcp-snapshots/`. Pick 1 makes 1 expected diff in `export.json` (line 67, the height maximum). Picks 2 to 5 make no snapshot diff: they change no description or input of a snapshot tool. Each pick checks this with a `node -e` read of the tool it touches, not with `mcp-snapshot.ts`.
- **Unions.**
  - Pick 5: `near-value` in `REVIEW_KINDS`. Check `REVIEW_KIND_LABEL`, `review-model.ts`, `run.ts`, `checks.ts`, `review-group.tsx`.
  - Pick 4: `"catalog"` in `FONT_SOURCES`. Check every `switch` or `Record` over `FontSource` (`font-list-model.ts`, `to-font-rows.ts`, the row label in `font-list-row.tsx`), and the new bridge message in the `*_TYPES` lists (N12).
  - Picks 1, 2 and 3: none. No two picks change one union.
- **`check-actions`.** No pick may add a check-actions hit. Each runs `pnpm exec tsx scripts/check-actions.ts --probes` and reports the hit count against main (557 on main; it fails on main; the count must not go up).
- **Generated lists.** No pick adds an action, so no pick changes the `@generated` action lists. Pick 4 changes 1 generated file: the `contracts` `exports` map (`gen-exports.ts`). Run `pnpm exec tsx scripts/gen-routes.ts --check` after each merge, and `pnpm exec tsx scripts/gen-exports.ts` after the pick 4 rebase.
- **Hand aggregators.** No pick edits `actions/index.ts`, `main/live-layer.ts`, `http/mount-all.ts`, `mcp/registry.ts` or `agent-tools/registry.ts`.
- **Home preload files (all picks).** No pick adds a line to `ui/app/main.tsx`, `ui/app/screen-preload.ts`, `ui/platform/*`, `ui/features/commands/**`, `styles/inspector.css` or `styles/review.css`. Every pick with a `src/ui`, `src/shared` or `src/bridge` change runs `pnpm run build:ui` and `pnpm exec tsx scripts/check-bundle.ts`: B1 at or under 274,703 B.
- **Long files.** `review/checks.ts` (834), `inspector/copy.ts` (479), `review/run.ts` (459), `bridge/live-preview.ts` (406): no growth past 500, and no growth at all for files already over 500 (L2a).
- **Perf baseline.** No pick edits `scripts/perf/baseline.json` (P10, L6).
- **Fake apps under `ds-wt`.** Each pick has its own prefix (`p41-`, `ck-`, `wc-`, `fw-`, `nv-`). No pick writes into Bonaparte, `ac-next-b` or `pt-seed`.

## Merge order

All 5 can run at once. Only font-web changes a generated file (the `contracts` `exports` map), so it merges last. Merge in this order:
1. **polish-41**: first. It changes the review payload and the align engine, and the stacking write that a later Back or Front check uses.
2. **wrap-check**: no shared file with the others. Rebase on polish-41 (the review folder).
3. **near-values**: rebase, run the union grep for `ReviewKind`.
4. **color-pick**: rebase, `build:ui`, `check-bundle`.
5. **font-web**: last. It changes the generated `contracts` `exports` map, shares `inspector/copy.ts` with color-pick, and is the only pick that changes the bridge protocol and the direct-edit plan. Rebase, run `pnpm exec tsx scripts/gen-exports.ts`, check the `copy.ts` line count, run `check-bridge-guards.ts`.

After the last merge, run `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run check:scripts` (expected to fail only at the `check-actions` items left for Tyler; write the counts), `pnpm run lint:gate`, `pnpm exec tsx scripts/gen-routes.ts --check`, `pnpm run build:ui`, `pnpm exec tsx scripts/check-bundle.ts` and `pnpm exec tsx scripts/check-boot-imports.ts`. Then `pnpm run desktop:pack`. Then one mock session on merged main: export a fresh `p41-tall` copy at 2x, Review `wc-seed` and `nv-seed` at 390 wide, pick an alpha color and a Google font on `fw-seed` (1 version each), and `call-action.ts` for `stacking.set` and `font.list` (0 diffs each).

## Real-model run budget

None. No pick changes a prompt or the run loop. Total: 0 runs.

## Runners-up

1. Batch rename: select many layers, F2 renames them all with a pattern ("Card 1" to "Card 4"), in 1 version. Needs a list write; `set_layer_state` renames 1 layer (0 hits for `renameLayers|batch rename`).
2. Route copy into an existing prototype drops the first page's canvas frame (cycles 35 to 40). Needs an app run to prove.
3. Alignment and wrap hits in the run-end fix loop for prototypes (needs a real-model budget).
4. `next/font` write for a font that an app does not load (font-web shows Google rows in HTML prototypes only).
5. `inspect_accessibility` takes `colorScheme`, so an MCP client can check dark contrast on any frame (cycles 39 and 40).
6. The color popup in the token editor (`token-inputs.tsx` line 70).
7. Near-duplicate shadows: the review probe does not collect `box-shadow` literals.
8. Wire `mcp-snapshot.ts --check` into a check, so a stamped schema change fails before merge (the `set_forced_state` cause), once Tyler decides the `check:scripts` items.
9. Figma Mac keys for Bring to front and Send to back (`⌥⌘]`, `⌥⌘[`): move next and previous direction first.
10. The Review entry tooltip does not name alignment (`review-entry-button.tsx`, align-check "Left out"), and `get_screenshot` still says "up to 6000 px" (tall-frames "Left out").

Dropped from the list: Figma variables import and export, the scale tool, distribute and tidy up, group, gradients, inner shadow and blurs, constraints and min and max size, layer search and drag reorder, Copy as CSS, version compare, image paste, Alt-drag duplicate, Tailwind alpha writes (the code exists, see Findings). Canvas memory (doop) fell off the list after cycle 36.

## Results

Merged into main in this order: polish-41, wrap-check, near-values, color-pick, font-web. There were no conflicts. A main fix followed, `ed6a4335b`: `keepSharedAsk` in `review/run.ts` changed `appDir: "."` into `"./"`, and this dropped every Fix in an app at the repo root. wrap-check found the bug. No app check was done on the fix.

- **polish-41:** Frames up to 8,000 px tall now export. PNG works at 1x and 2x, and 3x is refused with a clear message. PDF covers the full page. Review takes tall frames, and the critique sends tiles of 4,000 px or less. Align now covers grid rows and inline-block rows. Front and back on many layers now give 1 version. The `set_forced_state` cause is confirmed: the snapshot has 5 states and the code has 19, and no script runs `mcp-snapshot.ts --check`.
- **wrap-check:** Review finds orphan words in headings and button text that wraps. The Fix writes `text-wrap: balance` or `text-balance`. It costs about 2.7 ms per frame.
- **near-values:** When a project has no tokens, Review finds colors and radii that are almost the same. A value from a CSS rule gets only "Ask Claude" and no Fix.
- **color-pick:** The color popup has a saturation pad, hue, alpha, hex and "On this page". A drag gives 1 version, and Escape reverts it. In Tailwind, alpha writes `text-card/40`. The Fill row still writes `bg-[rgb(...)]`.
- **font-web:** HTML prototypes get a "Google Fonts" group of 40 families. Enter writes the link and the font stack as 1 version. Next apps do not show the group, and `next/font` is left out.

Home preload: B1 is 274,705 B, which is 2 B over the 274,703 B baseline. The color-pick merge shifted the chunk index numbers in `screen-preload`, and no new Home code was added. I did not raise the baseline. Cycle 42 must win back the 2 B.

Open (Tyler decides):
- `check:scripts` S11, E1, O12 and E16.
- MCP snapshot diffs: `export`, `export_handoff_export`, `review_frame`, the `canvas.json` height and `set_forced_state`.
- Wire `mcp-snapshot.ts --check` into a script or a hook.
- Cmd+Z by OS keyboard is a manual check.

Checks: gen, tsc, lint and lint:gate pass (59,593 diagnostics, baseline 89,733). ui passes, clip finds 0, pack and the reinstall pass, and :4570 gives 200. Idle CPU is 0.02 CPU-s over 60 s. check-bundle passes. Nothing was pushed.
