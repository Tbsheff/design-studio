# Feature cycle 42: next 5 features

Date: 2026-11-14. Main at `ba9a07a03` (all 5 cycle-41 picks merged, then the `ed6a4335b` review fix; B1 at 274,705 B, 2 B over the 274,703 B baseline).

## Method

- Read `cycle-41.md` (picks, runners-up, Results, Open) and `cycle-41/{polish-41,color-pick,wrap-check,font-web,near-values}.md` ("Left out", "Open" and "Differences from the spec").
- Read the runners-up of `cycle-33.md` to `cycle-40.md`, and counted the items that came back cycle after cycle.
- Read the code for each candidate:
  - Home preload: `ui/app/screen-preload.ts`, `ui/app/main.tsx` (dynamic imports), `scripts/check-bundle.ts` (`checkB1`, `ENTRY`), `scripts/perf/baseline.json` (B1 bytes and the 32 chunk names). Read the built `dist/ui/assets/screen-preload-CQLBER7Z.js` (6,485 B, built 2026-11-14 17:53) with `grep -o` (read only, no build).
  - Color popup and fill: `ui/features/inspector/{use-color-popup.ts,color-*.tsx,color-popup-model.ts,copy.ts}`, `ui/features/fill/use-paint-edit.ts`, `server/style-scope/fill/classes.ts`, `server/direct-edit/engine/tailwind/map.ts` (`nearestColor`, `cssClass`), `packages/ui/src/use-anchored-popover.ts`, `packages/ui/package.json`, `actions/src/fill/{get.ts,set.ts}`.
  - near-values rule fix: `server/review/near-value-drafts.ts`, `server/review/run.ts`, `contracts/src/review.ts` (`ReviewFix`), `contracts/src/contracts.ts` (`DirectEditRequest`, line 2174), `actions/src/direct-edit/{apply-review-fix.ts,payload/schema.ts}`, `server/handlers/direct-edit/apply-review-fix.ts`, `server/direct-edit/engine/css.ts`, `server/direct-edit/commit/replace.ts`, `server/breakpoints/{input.ts,commit.ts}`.
  - next/font: `actions/src/font/schema.ts`, `server/design-system/extract/next-font.ts`, `server/design-system/font-list/{font-list-run.ts,engine/to-font-rows.ts}`, `server/direct-edit/commit/{edit-plan.ts,google-font-link.ts,batch.ts,apply.ts}`. Read the Bonaparte layouts (read only, `git grep -l 'next/font'`).
  - Figma editing: `shared/{keymap.ts,keymap-edit.ts,keymap-view.ts}`, `ui/features/versions-layers-tokens/{use-layer-rename.ts,use-node-edits.ts,token-inputs.tsx,copy.ts}`, `ui/features/inspector/{tweaks-panel.tsx,corners-model.ts,aspect-lock-*.tsx,select-matching-button.tsx,image-fit-row.tsx,absolute-toggle.tsx}`, `ui/features/canvas/{use-draw-tool.ts,measurements.tsx,use-ruler-guides.ts,use-copy-png.ts,frame-menu-model.ts}`, `bridge/layers-at-point.ts`, `server/mcp/{layer-state-tools.ts,history-tools.ts,edit-tools.ts,server.ts}`, `server/agent/layer-state-tool.ts`, `server/direct-edit/engine/validate.ts`.
  - Chat, first run and handoff: the file lists of `ui/features/{chat,home,comments}`, `ui/features/chat/chat-turn-model.ts` (`onEditResend`), `ui/features/comments/copy.ts` (queued comments, "Fix with Claude"), `ui/features/share-publish-ship-export/{copy-code-*,export-formats.ts}`, `server/export/pptx.ts`.
  - Sharing: `contracts/src/share.ts`, `actions/src/share/{create.ts,list.ts,update.ts,schema.ts}`, `ui/features/share-viewer/{use-share-viewer.ts,share-viewer-model.ts}`, `ui/platform/share-play.ts`, `ui/app/share-main.tsx`, `share.html`, `server/share/play-app.ts`.
  - Route copy: `server/handlers/project/create-prototype.ts`, `actions/src/project/create-prototype.ts`, `cycle-35/flow-update.md`.
  - Accessibility: `actions/src/accessibility/{inspect.ts,schema.ts}`, `actions/src/workspace/get-screenshot.ts` (`colorScheme`).
  - MCP snapshots: `scripts/mcp-snapshot.ts` (`EXISTING_GROUPS` line 57, `NEW_GROUPS` line 61, `isSameTool` line 260), `artifacts/mcp-snapshots/{share.json,direct-edit-element.json}` (tool names, `samples`), `scripts/stamp/names.ts` (line 126), `apps/desktop/package.json` (`new:action`, `gen:routes`, `check:actions`).
- Ran `git ls-files` and `git check-ignore` on `.claude/goal/roadmap.md`, `git branch -a --list` for the 5 keys, and `ls` on `ds-wt` for fixture prefixes.
- Did no web search, no real-model run, no app run, no build and no test. The B1 number is from the cycle-41 Results (`check-bundle` at the merge).

### Open items from cycle 41, and the pick that closes each

| Open item | Pick |
|---|---|
| Home preload B1 is 274,705 B, 2 B over the 274,703 B baseline | 1 polish-42 |
| The Fill row needs Apply, and writes `bg-[rgb(0_0_0_/_0.4)]`, not `bg-black/40` | 1 polish-42 |
| The color popup closes after a Tailwind write (HMR scroll) | 1 polish-42 |
| near-values: a value from a CSS rule gets no Fix | 1 polish-42 |
| font-web: no `next/font` write for Next apps | 1 polish-42 |
| The color popup is not in the token editor (cycle-41 runner-up 6) | 4 token-color | new `ui/domain/color-picker-slot.ts`; `inspector/index.ts` (1 lazy export) and new `inspector/color-picker-popup.tsx`; `ui/app/studio/studio-column-body.tsx`; `versions-layers-tokens/{token-inputs.tsx,copy.ts}` and new `use-color-picker-slot.ts`; fixtures `ds-wt/tc-*` |
| Batch rename (cycle-41 runner-up 1) | 2 batch-rename |
| Route copy into an existing prototype drops the first page's frame (cycles 35 to 41) | 3 route-into |
| `check:scripts` S11, E1, O12 and E16 items | Tyler decides. Not planned |
| MCP snapshot diffs (`export`, `export_handoff_export`, `review_frame`, `canvas.json` height, `set_forced_state`) and snapshot-check wiring | Tyler decides. Not planned. No pick edits a snapshot file |
| Cmd+Z by OS keyboard (macOS menu) | Tyler decides. Not planned |
| Home preload at or under 274,703 B | Gate for every pick |

### Findings

- **Home preload (a rule for all picks).**
  - The gate is B1 at or under 274,703 B, and no chunk name that is not in `baseline.json` `B1.chunks` (`checkB1`, `check-bundle.ts` line 143; it fails on a new chunk name too). Never edit `scripts/perf/baseline.json` (P10, L6).
  - The B1 entry is `index.html` (`check-bundle.ts` line 43). The share viewer is a separate entry (`share.html`, `ui/app/share-main.tsx`), so share-viewer code is not in B1.
  - Why B1 grew by 2 B: `screen-preload` holds a `__vite__mapDeps([...])` index list for each `import()`. The studio list has 167 indexes. When a merge adds a lazy chunk, the indexes shift and some get 1 more digit. So any pick that adds a lazy chunk anywhere can add bytes to B1 with no new Home code.
  - The win (polish-42): `screen-preload.ts` has 2 `import("../features/design-system")` calls (lines 55 and 61). The built chunk has 2 copies of the same 35-index `__vite__mapDeps` list for that import (about 110 B each). One shared loader keeps 1 copy.
  - CSS does not count in B1. No key handler goes in a Home chunk (`ui/features/commands/**`, `ui/platform/*`, `ui/app/main.tsx`, `ui/app/screen-preload.ts`).
  - `packages/ui/src/index.ts` is in the Home preload (`@design-studio/ui` barrel). A change there can add B1 bytes. So no pick edits `index.ts` or `use-anchored-popover.ts` in `packages/ui`.
- **Fill row (polish-42).**
  - `fill/use-paint-edit.ts` (42 lines) turns `preview` into `onColor` (a draft) and makes `commit`, `commitSoon` and `revert` no-ops (lines 29 to 35). So a popup drag on the Fill row needs Apply.
  - `toColorClass` (`style-scope/fill/classes.ts` line 45) writes `bg-${token}` or `bg-[${toArbitrary(color)}]`. It does not use the alpha-aware namer of direct edits (`nearestColor`, `tailwind/map.ts` line 430, which writes `bg-black/40` at line 464). The public writer is `cssClass` (`map.ts` line 914).
  - The fill tools are `set_fill` and `get_fill` (`actions/src/fill/{set.ts,get.ts}`).
- **Popup closes after a Tailwind write (polish-42).** `useDismiss` in `packages/ui/src/use-anchored-popover.ts` closes on any `scroll` (capture) outside the panel (line 81). An HMR reload changes the inspector height, the inspector scrolls, and the popup closes. The hook has 3 users. It is a Home chunk file (see above), so the fix goes in `use-color-popup.ts` (158 lines), not in the package.
- **near-values rule Fix (polish-42).**
  - `near-value-drafts.ts` gives `fix: null` and an Ask Claude hint for every `via: "rule"` hit (lines 82 and 135). The direct-edit path writes only to the element.
  - `ReviewFix` is `{ label, edit: DirectEditRequest }` (`contracts/src/review.ts` line 48). It has 5 users: `review/checks.ts`, `design-rules/check.ts`, `share/direct-edit/direct-edit-writer.ts`, `handlers/direct-edit/apply-review-fix.ts`, `ui/features/review/use-review.ts`.
  - A CSS rule writer exists for HTML: `variant` on a `DirectEditRequest` writes a `:hover` or `@media` rule in a plain HTML file (`contracts.ts` line 1077), and `set_breakpoint_style` writes `@media` declarations (`breakpoints/input.ts` line 7). The CSS text engine is `direct-edit/engine/css.ts` (150 lines).
  - `contracts.ts` has 2,758 lines and `checks.ts` has 834. They must not grow (L2a). So the fix does not add a field to `DirectEditRequest`.
- **next/font (polish-42).**
  - `FONT_SOURCES` has `next-font` and `catalog` (`font/schema.ts` line 3). The "Google Fonts" group shows only when `isHtmlPrototype` (`font-list-run.ts` line 186) is true.
  - `next-font.ts` reads `next/font/google` imports from `LAYOUTS` (`app/layout`, `src/app/layout`, `pages/_app`, `src/pages/_app`, line 8) in the app root, `apps/*` and `packages/*`.
  - The font link step (`toFontLinkedCode`, `edit-plan.ts` line 30 and `batch.ts` line 33) changes the same file as the edit. A `next/font` write changes 2 files: the layout and the element's file. `batch.ts` (429 lines) already commits many files as 1 version.
  - Bonaparte: `apps/dashboard/app/layout.tsx` imports `Inter` from `next/font/google` (line 6) and sets `<body className={`${inter.className} size-full h-screen overflow-hidden`}>` (line 82), a template literal.
  - The bridge `font-preview` message (cycle 41, in `contracts.ts` `ParentToBridge`) already previews a family. A Next app needs no new bridge message.
- **Figma editing: which gaps are real.** Most Figma controls exist. Do not plan these again:
  - Measure (`keymap-view.ts` "Measure distance", `canvas/measurements.tsx`), rulers and guides (`canvas/use-ruler-guides.ts`, Shift+R), zoom to fit and to selection (Shift+1, Shift+2).
  - Per-corner radius (`inspector/corners-model.ts`), aspect lock (`inspector/aspect-lock-*.tsx`), absolute position in auto layout (`inspector/absolute-toggle.tsx`), blend modes (`fill/blend-select.tsx`), image fit (`inspector/image-fit-row.tsx`), border per side (`inspector/border-side-model.ts`).
  - Select layer under the pointer (`bridge/layers-at-point.ts`, `canvas/copy.ts` line 224 "Select layer"), select matching (`inspector/select-matching-button.tsx`), find and replace text (`text-search/copy.ts` line 15), swap instance (`inspector/swap-candidate-row.tsx`).
  - Shape and text tools (`canvas/copy.ts` lines 195 and 266), copy as PNG of a layer (`canvas/use-copy-png.ts`), layer export as SVG or PPTX (`export.exportFrame` `selector`).
  - **Real gap 1: batch rename.** 0 hits for `renameLayers|batch rename|rename-many|renameMany`. F2 (`keymap.ts` line 312) renames 1 layer. `renameNode` (`use-node-edits.ts` line 45) sends 1 `apply` per layer, so 1 version per layer. `set_layer_state` renames 1 layer (`mcp/layer-state-tools.ts` line 99). A batch refuses a name: `validate.ts` line 158 throws "a batch can only change style, text and classes". `batch_edit` edit items have no `name` field (`direct-edit-element.json`). `DirectEditRequest` already has `name` (`contracts.ts` line 2180), and the HTML and JSX engines write it (`engine/html.ts` line 449, `engine/jsx.ts` line 625).
  - **Real gap 2: the color popup in the token editor.** The last native `<input type="color">` is `versions-layers-tokens/token-inputs.tsx` line 70. It has no alpha, and it shows `NEUTRAL_SWATCH` for an alpha color. `ColorValue` from that file serves the token value editor, the dark-value slot (`token-dark-slot.tsx`) and the tweaks panel (`inspector/tweaks-panel.tsx` line 5). The cycle-41 popup lives in `ui/features/inspector/color-*`. U7 forbids a feature-to-feature import, and L22 forbids new entries in `UI_CROSS_FEATURE_FILES`. The popup files import the inspector `copy.ts`, `use-color-popup.ts` types and `shared/token-match.ts`, so they cannot move into `packages/ui` (N7). `ui/app` can pass the popup down with a context slot. `ui/domain` holds shared `.ts` code (`lint/boundaries.ts` line 46).
- **Chat, first run and handoff: which gaps are real.** Do not plan these again: edit and resend a past prompt (`chat-turn-model.ts` line 7, `onEditResend`), queued comments sent to Claude (`comments/send-queued-button.tsx`, "Fix with Claude"), templates and starters (`home/home-templates.tsx`, `home/starter-pills.tsx`), image and URL attach (`home/image-chip.tsx`, `home/url-attach-form.tsx`), repo import (`home/repo-import-field.tsx`), copy code (`share-publish-ship-export/copy-code-menu-list.tsx`), PPTX export (`server/export/pptx.ts`), tweaks (`direct-edit/get-tweaks.ts`). 0 hits for `SpeechRecognition|dictat`, but macOS dictation works in every text field, so no pick.
- **Sharing: real gap 3, a link to one frame.** Figma has "Copy link to selection". Here a share link always opens at the start frame: `useShareViewer` starts with `selected = -1` and `startId` from the links file (`use-share-viewer.ts` lines 45 and 47). 0 hits for `searchParams|location.hash` in `ui/features/share-viewer`. The share link is `${base}/s/${token}` (`contracts/src/share.ts` line 96). `ShareFrame.id` is optional (line 19), so a deep link needs a fallback key. U1: a `location` read goes in `ui/platform/share-play.ts` (155 lines), which already reads `location.pathname` (line 30). Only `share-viewer/{use-share-play.ts,use-share-comments.ts}` import it, so it is not in B1.
- **Route copy into a prototype: real gap 4, the cause found.**
  - `importRouteCopy` (`handlers/project/create-prototype.ts` line 128) deletes frame `f1` (`ENTRY_FRAME`, line 68) whenever the imported frame id is not `f1` (lines 147 to 150). That step is right for a new prototype, where `f1` is the empty start frame.
  - `toCopyOutcome` (line 165) calls it for every target. With `intoProjectId`, the target is an existing prototype (`toIntoTarget`, line 277), where `f1` is the first page's real frame. So the copy deletes it. This matches the cycle-35 report ("`index.html` had no frame until I added one", `cycle-35/flow-update.md` line 60) and every repeat through cycle 41.
  - Also from cycle 35 (line 61): for a copy of a dynamic route, the dialog's default route is the fixture path (`/visits/1`). Not rechecked; runner-up 9.
- **Repeat items.**
  - `inspect_accessibility` has no `colorScheme` (cycles 39 to 41): still real (0 hits in `actions/src/accessibility/`; only `get_screenshot` has it). Runner-up 1.
  - Canvas memory (doop) fell off after cycle 36. Figma variables import and export exists (dropped in cycle 39).
- **Tool names.** A derived name is `snake(verb)_snake(camel(domain))` (`stamp/names.ts` line 126). `new:action` exists (`apps/desktop/package.json` line 31). Pick 2 adds 1 action, `layer.rename`, with the derived tool name `rename_layer`. It passes `studio/derived-tool-name` and is in no snapshot and in no code (0 hits). Every other pick reuses a tool by name: `set_fill`, `apply_fix`, `review_frame`, `list_font`, `edit_element`, `batch_edit`, `create_prototype_project`, `canvas_list`, `update_tokens_direct_edit`, `get_tokens`, `create_share_link`, `list_share_links`.
- **Snapshots.** `isSameTool` (`mcp-snapshot.ts` line 260) compares only `inputSchema` and `annotations`. An output change makes no diff. `share.json` is an `EXISTING_GROUPS` file, and its `samples` hold `list_share_links` and `revoke_share_link` results, not `create_share_link`. So pick 5 changes only the `create_share_link` output, and no input.
- **Branch check.** No `feat/polish-42`, `feat/batch-rename`, `feat/route-into`, `feat/token-color` or `feat/frame-link`.
- **Fixture prefixes.** `p42-`, `br-`, `ri-`, `tc-` and `lk-` are not in `ds-wt`. `rn-`, `tk-`, `fk-` and `fl-` are in use, so no pick uses them. `ac-next-b` is in `ds-wt`; picks copy it and never write into it.
- **`.claude/goal/roadmap.md`.** It is on disk but ignored (`.gitignore` line 18, `.claude/`), so a worktree does not get it. Each pick writes "not in worktree" in its report and lists its new files there, so the merge step can add them to Appendix A (L6e).

## Ranking

Score = value x fit with "simple and fast" / effort (1 to 5 each).

| Rank | Key | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|---|
| 1 | polish-42 | B1 back under the baseline, live Fill writes with `bg-black/40`, the popup stays open, a Fix for rule hits, `next/font` writes | 4 | 5 | 4 | 5.0 |
| 2 | batch-rename | Rename many layers with a pattern in 1 version (Figma) | 4 | 5 | 2 | 10.0 |
| 3 | route-into | A route copy into a prototype keeps its frames (Bonaparte) | 4 | 5 | 1 | 20.0 |
| 4 | token-color | The color popup with alpha in the token editor and tweaks (Figma) | 3 | 5 | 2 | 7.5 |
| 5 | frame-link | A share link that opens at one frame (sharing) | 4 | 5 | 2 | 10.0 |

The file lists the picks in a fixed order (polish, Figma, Bonaparte, Figma, sharing), not by score. Picks 2 and 4 are Figma manual-editing gaps. 0 picks add a Review check (polish-42 adds a Fix to the existing near-values kind). route-into is small; it is a pick because it is the oldest open bug (7 cycles) and it breaks the main Bonaparte flow.

Only pick 2 adds an action, so only pick 2 changes the `@generated` action lists. No pick adds an always-visible control or a Home import.

---

## 1. polish-42: B1 back under the baseline, live Fill writes, popup stays open, rule Fix, next/font (polish)

**Items.** Prove each one first; change code only for what the proof shows.

- **Home preload: win back the 2 B.**
  - Proof first: `pnpm run build:ui`, then `pnpm exec tsx scripts/check-bundle.ts`. Expected on main: B1 274,705 B. Write the line in the report. Count the `__vite__mapDeps` lists in the `screen-preload-*.js` chunk with `grep -o`.
  - Fix: in `ui/app/screen-preload.ts`, make 1 loader `const toDesignSystemModule = async () => await import("../features/design-system");` and call it from `designSystems` and `newDesignSystem` (lines 54 to 63). The built chunk then has 1 `import()` and 1 mapDeps list for that module, not 2.
  - Do not change any other line of a Home file. Do not remove a feature, a preload or a chunk.
  - Pass: B1 at or under 274,703 B, and no new chunk name. Target: 274,600 B or less, so the next lazy chunk does not put it over (the 2 mapDeps copies suggest a win of about 100 to 150 B). Write the bytes, the delta and the margin in the report. If the win is less than 2 B, stop and report it; do not edit `baseline.json`.
- **Fill row: live write and `bg-black/40`.**
  - Proof first: Tailwind app `ds-wt/p42-next` (copy of `ac-next-b`) with an overlay `bg-black/50`. Open the Fill row popup, drag alpha to 40 %. Expected on main: no write until Apply; then the class is `bg-[rgb(0_0_0_/_0.4)]`.
  - Writer (`style-scope/fill/classes.ts` line 45): when the paint has no token, `toColorClass` asks `cssClass("background-color", paint.color, theme)` (`tailwind/map.ts` line 914) first and uses its class when it is not null (it gives `bg-black/40`, `bg-slate-900/[0.37]`). Else it keeps the arbitrary class. For a gradient stop prefix (`from`, `via`, `to`) use the same namer with that prefix. Import `cssClass` only through the `direct-edit` area `index.ts` (W16a); widen that export if it is not there.
  - Live write (`fill/use-paint-edit.ts`): for a solid fill, `preview` previews on the canvas and pointer up commits with `edit.commitSoon` (1 version per drag), as the other color fields do. Escape during a drag reverts. A gradient fill keeps the draft and Apply path (the stop list is 1 write).
  - Pass: `p42-next` overlay at 40 %: 1 version with `bg-black/40`, no Apply step, Cmd+Z restores `bg-black/50`. A gradient stop still needs Apply. `set_fill` over MCP with `rgb(0 0 0 / 0.4)` writes `bg-black/40`.
- **Popup stays open after a Tailwind write.**
  - Proof first: `p42-next`, open the text color popup, drag alpha, release. Expected on main: the popup closes when HMR reloads.
  - Fix (`inspector/use-color-popup.ts` only): the color popup gets its own dismiss hook, new `inspector/use-color-dismiss.ts`. It closes on a pointer down outside the panel and the trigger, and on Escape. On scroll and resize it re-places the panel at the trigger. It closes on scroll only when the trigger rect leaves the inspector scroll box. Do not change `packages/ui/src/use-anchored-popover.ts`; its other 2 users keep their behavior.
  - Pass: in `p42-next` the popup stays open across 3 drags in a row, and each drag gives 1 version. A wheel scroll that moves the field out of view closes it.
- **near-values: a Fix for a value in a CSS rule.**
  - Proof first: HTML prototype `ds-wt/p42-rule` with no tokens: `.btn { background-color: #2463ea }` on 1 button and `#2563eb` inline on 6 others; `.card, .tile { border-radius: 10px }` (a shared rule) and radius 8 on 9 cards. Expected on main: 2 hits, both with Ask Claude and no Fix.
  - Read first: the `variant` rule write for plain HTML (the `@media` and `:hover` path behind `contracts.ts` line 1077) and `engine/css.ts`. Reuse that code to rewrite 1 declaration (`property: from` to `property: to`) in the rule with that exact selector, in a `<style>` block of the page or in a project `.css` file that the page links.
  - Shape: prefer a fix that needs no new `ReviewFix` shape. If the existing edit shape cannot carry it, make `ReviewFix` a union with a literal tag (`kind: "element" | "rule"`, E17) in `contracts/src/review.ts`, where `kind: "rule"` holds `{ file, selector, property, from, to }`. Then update all 5 users (Findings). Do not add a field to `DirectEditRequest` (`contracts.ts`, 2,758 lines) and add no line to `checks.ts` (834 lines). If the existing builders must change, put the default in one `toElementFix` helper in a new small file, not in `checks.ts`.
  - Only rules with 1 selector get a Fix. A rule with a comma (a shared rule) keeps `fix: null` and the hint (`near-value-drafts.ts` line 135). App CSS modules and Tailwind `@apply` keep `fix: null`.
  - Pass: `p42-rule`: the `.btn` hit has Fix; Fix gives 1 version with `background-color: #2563eb` in the rule, 0 hits on re-run, Cmd+Z restores it. The shared radius rule keeps Ask Claude. `apply_fix` over MCP on the `.btn` finding: the same result.
- **font-web: `next/font` write for Next apps.**
  - Proof first: `ds-wt/p42-font` (copy of `ac-next-b`) and a read of its layout. Expected on main: no "Google Fonts" group; a typed family previews with no link.
  - Rows: `isHtmlPrototype` (`font-list-run.ts` line 186) becomes 2 cases. The "Google Fonts" group shows in an HTML prototype (as now) and in a Next app whose layout file (`next-font.ts` `LAYOUTS`) exists. Other apps: no group.
  - Write: a new pure engine `direct-edit/engine/next-font-import.ts` (`toNextFontLayoutCode(code, family)`) adds, in the layout file: the family to the `next/font/google` import (or a new import line), a const `const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });`, and `${fraunces.variable}` to the className of `<html>` or `<body>`. It handles a string literal and a template literal (Bonaparte, `apps/dashboard/app/layout.tsx` line 82). For a className built with `cn()` or another call, it returns `{ ok: false, code: "class_in_code" }`, and the edit fails with "The layout className is built in code. Add the font in the layout by hand, or ask Claude." (P7).
  - The element gets `font-family: var(--font-fraunces), <fallback>` (Tailwind: `font-[family-name:var(--font-fraunces)]`).
  - Commit: the layout file and the element's file are 1 version and 1 Cmd+Z. Use the many-file commit in `commit/batch.ts`, called from both `apply.ts` and `batch.ts` through 1 new helper `commit/next-font-plan.ts`. Do not put the step in `edit-plan.ts` (it plans 1 file). Skip the layout step when the layout already imports the family.
  - Preview: reuse the `font-preview` bridge message. No new message.
  - Pass: `p42-font` `h1`: pick Fraunces, Enter: 1 version, the layout imports Fraunces once, the `h1` uses the variable, Cmd+Z restores both files. Pick it again on a second element: no second import. `edit_element` over MCP with a Fraunces stack: the same 2-file version. `list_font` over MCP in `p42-font` returns `catalog` rows. A copy of the layout with `cn(...)`: the refusal text.

**Headless.** No new action and no new tool name. `set_fill` writes `bg-black/40`. `apply_fix` applies a rule fix from `review_frame`. `edit_element` and `batch_edit` write `next/font` in a Next app. `list_font` lists the catalog in a Next app. Do not change a tool description or input, so no snapshot changes (`isSameTool` compares inputs and annotations only).

**Main files.** `ui/app/screen-preload.ts` (1 loader, no other line); `style-scope/fill/classes.ts`; `ui/features/fill/use-paint-edit.ts`; `ui/features/inspector/use-color-popup.ts` and new `inspector/use-color-dismiss.ts`; `review/near-value-drafts.ts`; `contracts/src/review.ts` (only if the union is needed) and the 5 `ReviewFix` users; new `direct-edit/engine/css-rule-value.ts` or a widened export of `engine/css.ts`; `handlers/direct-edit/apply-review-fix.ts`; `design-system/font-list/font-list-run.ts`; new `direct-edit/engine/next-font-import.ts`; new `direct-edit/commit/next-font-plan.ts`; `direct-edit/commit/{apply.ts,batch.ts}`; `direct-edit/index.ts` (export lines); fixtures `ds-wt/p42-*`. Not `contracts.ts`, not `checks.ts`, not `packages/ui/**`, not `baseline.json`, not `artifacts/mcp-snapshots/**`.

**Verify in the running app.** The steps above, on `STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev`. Dark and light screenshots of the Fill popup and of the near-values group with the rule Fix. `pnpm exec tsx scripts/call-action.ts fill.set '<json>'` and `font.list '<json>'` on `p42-next` and `p42-font`: 0 diffs. `pnpm run build:ui`, `check-bundle`: B1 at or under 274,703 B (target 274,600 B). No real-model run.

---

## 2. batch-rename: rename many layers with a pattern (Figma)

**Why.** In Figma you select 12 cards, press Cmd+R, type "Card $n", and every layer gets a number in 1 step. Here F2 renames 1 layer, and each rename is 1 version. An AI page has many unnamed `div` layers, so a clean layer list takes many steps.

**Behaviour.**
- **Open.** With 2 or more layers selected, F2 (or "Rename layers…" in the layer context menu) opens a small popup at the Layers panel (`.ui-menu` surface): a "Rename to" field and a "Find" and "Replace" pair. F2 with 1 layer keeps the inline rename.
- **Tokens (as Figma).** `$&` is the current name, `$n` is a number (1, 2, 3), `$nn` a number with 2 digits (01, 02), `$N` counts down. Numbers follow the Layers panel order (top to bottom), not the click order.
- **Find and replace.** When "Find" is not empty, the popup changes only that text in each name, and "Rename to" is off.
- **Preview.** The popup lists the first 5 new names ("Card 1 … Card 5, and 7 more"). Enter applies; Escape closes with no change.
- **Write.** 1 call, 1 version, 1 Cmd+Z. The names are written as `data-name`, as the single rename does. An empty result removes the name. Max 50 layers (the batch cap); over that, the popup says "Select 50 layers or fewer to rename them."
- **Inline rename.** While a single inline rename is open, Tab commits it and opens the rename of the next layer in the panel, Shift+Tab the previous one (Figma). Each commit is 1 version.

**Spec.**
- Stamp the action with `pnpm run new:action layer rename ...`: id `layer.rename`, const `renameLayer`, definition `packages/common/actions/src/layer/rename.ts`, handler `src/server/handlers/layer/rename.ts`, tool `rename_layer`. Fill all 13 keys (E2): `access: "edit"`, `confirm: "none"`, `needs: "project.update"`, `scope: "project"`, `invalidates: ["direct-edit.getTree"]`, `mcp: { name: "rename_layer" }`, `agent: { lean: true, name: "rename_layer", set: "core", short: "Rename up to 50 layers in one version. Names are written as data-name." }`.
- Input: one flat `Schema.Struct` (E3): `projectId`, `directionId`, `path` (`withDecodingDefault`), and `layers`: an array of 1 to 50 `{ selector, name }`, where `selector` is a layer id or CSS selector and `name` is `string | null` (0 to 80 chars, the `set_layer_state` limit). Schemas in `actions/layer/schema.ts`. Output: a `Schema.Struct` with `versionId`, `renamed` (count) and `skipped` (a list of `{ selector, reason }`).
- The pattern stays in the UI (a pure `versions-layers-tokens/rename-pattern-model.ts`, `toPatternNames(names, pattern, find, replace)`). An MCP client sends the final names.
- Handler (thin, E14): yield `DirectEditWriter` (from `share/index.ts`) and call a new method `rename`. A `DirectEditRequest` needs `source` and `tag`, so the service resolves each selector or layer id to its source element first, the same way its `setImage` method does for `set_image_direct_edit` (`handlers/direct-edit/set-image.ts` line 16). Then it sends 1 batch of `{ name }` requests: 1 version. Put any helper in a sibling file of `share/direct-edit/direct-edit-writer.ts` (W5b).
- Batch rule (`direct-edit/engine/validate.ts` line 158): allow `name` in a batch when the request changes only the name. `move` and `insert` stay refused. Keep the text of the refusal for those.
- F2 reaches the Layers panel through `onStartRename` (`ui/app/shell/pane-menu-model.ts` line 30). The many-layer branch goes in `versions-layers-tokens/use-layer-rename.ts`, not in `ui/app/shell` or `ui/features/commands/**`, so no key handler joins a Home chunk.
- UI: `use-node-edits.ts` gets `renameNodes(ids, names)` that calls `call(routes.rename, input)` once. `use-layer-rename.ts` gets the Tab and Shift+Tab step. New `versions-layers-tokens/{rename-many-popup.tsx,use-rename-many.ts,rename-pattern-model.ts}`. Text in `versions-layers-tokens/copy.ts` (246 lines).
- `set_layer_state` stays as it is (a legacy tool; E8 `legacy-agent` count may not go up).

**Headless.** New tool `rename_layer` (derived from `layer.rename`, passes `studio/derived-tool-name`, in no snapshot). `get_layers` lists the ids to pass. `set_layer_state` still renames 1 layer.

**Main files.** New `packages/common/actions/src/layer/{rename.ts,schema.ts}` and the generated `layer/{index.ts,routes.ts,errors/...}`; new `src/server/handlers/layer/{rename.ts,live.ts}` and the generated `handlers.ts`; the global generated lists (`all-actions.generated.ts`, `all-live.generated.ts`); `direct-edit/engine/validate.ts`; `share/direct-edit/direct-edit-writer.ts` (the `rename` method) and a sibling helper file; `ui/features/versions-layers-tokens/{use-node-edits.ts,use-layer-rename.ts,copy.ts}` and the 3 new files; fixtures `ds-wt/br-*`. Not the 5 hand aggregators (W12), not `agent/tool-sets.ts` (E16).

**Verify in the running app.**
- HTML prototype `ds-wt/br-seed`: a grid of 12 cards with no `data-name`, and 3 cards named "Item A", "Item B", "Item C".
- Select the 12 cards, F2, "Card $nn": the preview shows "Card 01 … Card 05, and 7 more"; Enter: 1 version, the Layers panel shows "Card 01" to "Card 12" in panel order; 1 Cmd+Z restores all.
- Select the 3 named cards, Find "Item", Replace "Plan": "Plan A", "Plan B", "Plan C".
- Inline rename on card 1, Tab: card 2 opens for rename.
- Tailwind app `ds-wt/br-next` (copy of `ac-next-b`): rename 4 JSX elements: 1 version, `data-name` in the JSX.
- `pnpm exec tsx scripts/call-action.ts layer.rename '<json>'` with 3 layers: http, mcp and agent the same, 0 diffs.
- Dark and light screenshots of the popup. No real-model run.

---

## 3. route-into: a route copy into a prototype keeps its frames (Bonaparte)

**Why.** In Bonaparte you copy `/visits` into a prototype, then copy `/visits/[id]` into the same prototype to design the flow. Today the second copy deletes the first page's canvas frame, so the prototype shows only the new page until you add the frame by hand. This came back in every cycle from 35 to 41. It is a small fix.

**Behaviour.**
- **Proof first.** Fake app `ds-wt/ri-next` (copy of `ac-next-b` with 2 routes, `/visits` and `/visits/[id]`). `create_prototype_project` with `routePath: "/visits"`, then again with `routePath: "/visits/1"` and `intoProjectId` of the first. Expected on main: after the second call the canvas has no frame for the first page. Write the `canvas_list` output before and after in the report.
- **Fix.** `importRouteCopy` (`create-prototype.ts` line 128) takes a new `isNewTarget: boolean` (L14, required). It deletes `ENTRY_FRAME` only when `isNewTarget` is true. `toRouteTarget` knows it: `toIntoTarget` gives `false`, `writer.createPrototype` gives `true`. Pass it through `toCopyOutcome`.
- **Place.** The new frame of an into copy goes to the right of the right-most frame, with the canvas gap, not on top of a frame. Check the placement that `pages.import` gives first; change it only if the proof shows overlap.
- **Cost.** No new read on the copy path.

**Headless.** No new action. `create_prototype_project` with `intoProjectId` keeps the existing frames. Do not change its description or input (it is in no snapshot file, so no snapshot changes).

**Main files.** `src/server/handlers/project/create-prototype.ts` (428 lines; stay under 500); fixtures `ds-wt/ri-*`. Not `actions/src/project/**`, not the UI.

**Verify in the running app.**
- The proof steps above in the app: the prototype canvas shows 2 frames side by side after the second copy, and both open.
- Copy `/visits` into a new prototype: the empty start frame is gone, as before (no regression).
- `pnpm exec tsx scripts/call-action.ts project.createPrototype '<json>'` with `intoProjectId` on the mock agent: 0 diffs, and `canvas_list` lists both frames.
- Dark and light screenshots of the canvas. No real-model run (`STUDIO_AGENT=mock`).

---

## 4. token-color: the color popup in the token editor and tweaks (Figma)

**Why.** In Figma you edit a color variable with the same picker as a fill: saturation pad, hue, alpha. Here the token editor still opens the OS color panel. It has no alpha, so a token such as `--overlay: rgb(15 23 42 / 0.5)` shows a white swatch, and a pick drops the alpha. The tweaks panel uses the same field.

**Behaviour.**
- **Open.** A click on the swatch of a token color (or Enter on it) opens the color popup of cycle 41: pad, hue, alpha, hex and alpha fields. "On this page" shows only in the inspector (it needs the style scan); the token editor shows no page row.
- **Write.** A drag previews the token value on the canvas (the existing token preview path) and pointer up commits 1 version. Escape mid-drag reverts. The value is the hex at 100 % alpha, else `rgb(r g b / a)`.
- **Swatch.** The token swatch uses `toSwatchColor` (cycle 41), on a check pattern, so an alpha token no longer shows white.
- **Where.** The token value editor (`token-value-editor.tsx`), the dark value slot (`token-dark-slot.tsx`) and the tweaks panel (`inspector/tweaks-panel.tsx`), all through `ColorValue` in `token-inputs.tsx`.

**Spec.**
- Do not move the popup files. They import the inspector `copy.ts`, `use-color-controls.ts` and `use-color-popup.ts` types, and `shared/token-match.ts` (`color-pad.tsx` lines 4 to 7, `color-popup-model.ts` line 3), so a move into `packages/ui` would pull app code into a package (N7).
- Use a slot that `ui/app` fills (U7: `ui/app` composes features):
  - New `ui/domain/color-picker-slot.ts`: a React context `ColorPickerSlot` whose value is a render function `(props: ColorPickerSlotProps) => ReactElement` or `null`. Props: `value`, `label`, `onPreview`, `onCommit`, `onRevert`, `anchor`. Types only and `createContext`; no component, no hook in the file.
  - `ui/features/inspector/index.ts` exports a lazy named `ColorPickerPopup` (U22, U20) that wraps the existing `color-popup.tsx` with no "On this page" row.
  - The studio column (`ui/app/studio/studio-column-body.tsx`, not a Home chunk: `studio` is lazy in `screen-preload.ts` line 48) provides the context with that lazy export.
  - `token-inputs.tsx` (94 lines) reads the context in a new `versions-layers-tokens/use-color-picker-slot.ts` hook (U6a). When the value is not null, the swatch button opens it. When it is null, the field keeps the native `<input type="color">` (line 70), so no screen loses its picker.
  - The tweaks panel (`inspector/tweaks-panel.tsx`) gets the popup through the same `ColorValue`, so it changes with no extra file.
- Add no entry to `UI_CROSS_FEATURE_FILES` (L22) and no root `src/ui/*-slots.ts` hub (U21).
**Headless.** No new action. MCP clients read tokens with `get_tokens` and write a color token with alpha through `update_tokens_direct_edit` (value `rgb(15 23 42 / 0.5)`), the same write the token editor sends. No description or input change.

**Main files.** New `ui/domain/color-picker-slot.ts`; `ui/features/inspector/index.ts` (1 lazy export) and a new `inspector/color-picker-popup.tsx` wrapper; `ui/app/studio/studio-column-body.tsx` (the provider); `ui/features/versions-layers-tokens/{token-inputs.tsx,copy.ts}` and new `use-color-picker-slot.ts`; fixtures `ds-wt/tc-*`. Not `packages/ui/**`, not the cycle-41 `inspector/color-*` files other than the import of the wrapper, not `ui/app/main.tsx`.

**Verify in the running app.**
- HTML prototype `ds-wt/tc-seed` with `:root { --overlay: rgb(15 23 42 / 0.5); --brand: #2563eb; }` and a dark value for `--brand`.
- Token editor: `--overlay` shows the alpha swatch. Open the popup, alpha 30 %: the canvas follows, pointer up gives 1 version with `rgb(15 23 42 / 0.3)`, Cmd+Z restores. The dark slot of `--brand`: the popup writes the dark value only.
- Inspector color field (cycle-41 checks): the popup and "On this page" work as before; 1 version per drag.
- Tweaks panel color: the popup opens and writes.
- Dark and light screenshots of the token popup. `pnpm run build:ui`, `check-bundle`: B1 at or under the polish-42 result, and no new chunk name. No real-model run.

---

## 5. frame-link: a share link that opens at one frame (sharing)

**Why.** In Figma you copy a link to one frame and paste it in a review thread. Here a share link always opens at the start frame, so a reviewer must find the page. For a 6-page flow this is slow, and the reviewer comments on the wrong page.

**Behaviour.**
- **Link.** A share link takes a hash: `${base}/s/${token}#frame=<key>`. The key is `ShareFrame.id`, or the frame index (`#frame=2`) when the frame has no id. A hash is not sent to the server, so the play route does not change.
- **Viewer.** On load, the viewer reads the hash once (in `ui/platform/share-play.ts`, U1), selects that frame and centers it in canvas mode. In play mode it starts at that frame. An unknown key opens the start frame, with no error. The viewer does not write the hash back.
- **Copy.** Each frame row in the share link panel gets "Copy link to this frame" (`data-tip`, text in `share-publish-ship-export/copy.ts`). The canvas frame menu gets "Copy share link to this frame" only when an active share link holds that frame. When no link holds it, the item is not shown. Share is a confirm permission (E7), so no item makes a link without the dialog.
- **Cost.** No server change on the play path.

**Spec.**
- `contracts/src/share.ts` (97 lines): add `toShareFrameUrl(base, token, frameKey)` beside `shareUrl` (line 95), and `toShareFrameKey(frame, index)`. Pure.
- `actions/src/share/schema.ts`: `ShareCreatedSchema` (line 42) gets `frameUrls`: a list of `{ frameKey, name, url }`, `url` is `null` when `url` is `null`. Output only; no input or description change, so `share.json` (an `EXISTING_GROUPS` file) has no diff (`isSameTool` compares inputs and annotations).
- `server/handlers/share/create.ts` fills `frameUrls` with the contracts helper.
- `ui/platform/share-play.ts` exports `readShareFrameKey()`. `use-share-viewer.ts` uses it for the first `selected` and for `toPlayStart`. Do not add a `location` read in `share-viewer-model.ts` (it already has 2 legacy reads; no new one).
- `ui/features/share-publish-ship-export/{share-link-urls.tsx,use-copy-new.ts}` and a new `share-frame-link-button.tsx`; `ui/features/canvas/frame-menu-model.ts` (254 lines) adds the item. It is a pure model file (N8b), so the share list read goes in a new hook `canvas/use-frame-share-link.ts`, which passes the active link and its frame keys into the model as a parameter.

**Headless.** No new action. `create_share_link` returns `frameUrls`, so an MCP client can post a link to one page. `list_share_links` lists the frames with their ids (no change; its `samples` stay the same).

**Main files.** `contracts/src/share.ts`; `actions/src/share/schema.ts`; `src/server/handlers/share/create.ts`; `ui/platform/share-play.ts`; `ui/features/share-viewer/use-share-viewer.ts`; `ui/features/share-publish-ship-export/{share-link-urls.tsx,use-copy-new.ts,copy.ts}` and new `share-frame-link-button.tsx`; `ui/features/canvas/{frame-menu-model.ts,copy.ts}` and new `use-frame-share-link.ts`; fixtures `ds-wt/lk-*`. Not `actions/src/share/create.ts` (description and input stay), not `server/share/play-app.ts`, not `apps/publish/**` (the cloud viewer is runner-up 3).

**Verify in the running app.**
- HTML prototype `ds-wt/lk-seed` with 4 pages and a share link that holds all 4.
- Share panel: "Copy link to this frame" on page 3; open the link in the share viewer: page 3 is selected and centered. Play: it starts at page 3. `#frame=9`: the start frame opens.
- Canvas frame menu of page 2: the item copies the page 2 link. A frame that no link holds: no item.
- `create_share_link` over MCP: `frameUrls` has 4 entries. `pnpm exec tsx scripts/call-action.ts share.create '<json>'`: 0 diffs.
- Dark and light screenshots of the share panel row and of the viewer on page 3. No real-model run.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 polish-42 | `ui/app/screen-preload.ts` (1 loader); `style-scope/fill/classes.ts`; `ui/features/fill/use-paint-edit.ts`; `inspector/use-color-popup.ts` and new `inspector/use-color-dismiss.ts`; `review/near-value-drafts.ts`; `contracts/src/review.ts` and the `ReviewFix` users (only if the union is needed); `handlers/direct-edit/apply-review-fix.ts`; `direct-edit/engine/{css.ts or new css-rule-value.ts,new next-font-import.ts}`; `direct-edit/commit/{apply.ts,batch.ts,new next-font-plan.ts}`; `direct-edit/index.ts`; `design-system/font-list/font-list-run.ts`; fixtures `ds-wt/p42-*` |
| 2 batch-rename | new `actions/src/layer/**`; new `server/handlers/layer/**`; the generated action and live lists; `direct-edit/engine/validate.ts`; `share/direct-edit/direct-edit-writer.ts` and a sibling helper; `versions-layers-tokens/{use-node-edits.ts,use-layer-rename.ts,copy.ts}` and 3 new files; fixtures `ds-wt/br-*` |
| 3 route-into | `server/handlers/project/create-prototype.ts`; fixtures `ds-wt/ri-*` |
| 4 token-color | new `ui/domain/color-picker-slot.ts`; `inspector/index.ts` (1 lazy export) and new `inspector/color-picker-popup.tsx`; `ui/app/studio/studio-column-body.tsx`; `versions-layers-tokens/{token-inputs.tsx,copy.ts}` and new `use-color-picker-slot.ts`; fixtures `ds-wt/tc-*` |
| 5 frame-link | `contracts/src/share.ts`; `actions/src/share/schema.ts`; `handlers/share/create.ts`; `ui/platform/share-play.ts`; `share-viewer/use-share-viewer.ts`; `share-publish-ship-export/{share-link-urls.tsx,use-copy-new.ts,copy.ts}` and 1 new file; `canvas/{frame-menu-model.ts,copy.ts}` and new `use-frame-share-link.ts`; fixtures `ds-wt/lk-*` |

Shared files and conflict warnings:
- **Color popup (picks 1 and 4).** Pick 1 changes `inspector/use-color-popup.ts` and adds `use-color-dismiss.ts`. Pick 4 wraps `color-popup.tsx` in a new file and does not edit pick 1's files. Pick 4 rebases on pick 1, so the token popup gets the new dismiss.
- **`versions-layers-tokens/copy.ts` (picks 2 and 4).** 246 lines. Pick 2 adds 12 lines or fewer, pick 4 adds 4 or fewer. Text lines only; rebase.
- **`inspector/copy.ts` (487 lines).** No pick adds a line. If pick 1 or 4 needs text, it goes in the feature's own new file or in `versions-layers-tokens/copy.ts`.
- **`direct-edit/**` (picks 1 and 2).** Pick 1 owns `commit/{apply.ts,batch.ts}`, the new engines and `direct-edit/index.ts`. Pick 2 owns only `engine/validate.ts`. Pick 2 sends its batch through `DirectEditWriter`; it does not edit `batch.ts`.
- **`share/direct-edit/direct-edit-writer.ts` (picks 1 and 2).** Pick 2 adds the `rename` method. Pick 1 edits the file only if the `ReviewFix` union is needed (it is 1 of the 5 users). If both edit it, pick 2 rebases on pick 1; different methods.
- **`contracts` (picks 1 and 5).** Pick 1 may edit `review.ts`; pick 5 edits `share.ts`. 2 different files. Nobody edits `contracts.ts` (2,758 lines).
- **`packages/ui`.** No pick edits it. `packages/ui/src/index.ts` and `use-anchored-popover.ts` are in the Home preload.
- **Home preload files.** Only pick 1 edits a Home file (`screen-preload.ts`, 1 loader). Pick 4 edits `ui/app/studio/studio-column-body.tsx`, which loads with the lazy `studio` screen, not with Home. Pick 5 edits `ui/platform/share-play.ts`, which only `share-viewer/{use-share-play.ts,use-share-comments.ts}` import (the share entry, not B1). No pick adds a line to `ui/app/main.tsx`, another `ui/platform/*` file, `ui/features/commands/**`, `styles/inspector.css` or `styles/review.css`.
- **Unions.**
  - Pick 1: `ReviewFix` (if the union is needed). Check all 5 users (Findings).
  - Pick 2: the new action joins `AllActions`; check-actions checks the pair rule.
  - Picks 3, 4 and 5: none.
- **MCP snapshots.** No pick edits a file in `artifacts/mcp-snapshots/`. No pick changes an input or a description of a snapshot tool. Pick 5 changes only the `create_share_link` output. Pick 2 adds `rename_layer`, which is in no snapshot. Each pick confirms its tool with a `node -e` read, not with `mcp-snapshot.ts`.
- **`check-actions`.** No pick may add a check-actions hit. Each runs `pnpm exec tsx scripts/check-actions.ts --probes` and reports the hit count against main (it fails on main; the count must not go up).
- **Generated lists.** Only pick 2 changes the `@generated` action lists (it adds `layer.rename`). Run `pnpm exec tsx scripts/gen-routes.ts` in pick 2, and `pnpm exec tsx scripts/gen-routes.ts --check` after each merge. No pick changes the `contracts` `exports` map.
- **Hand aggregators.** No pick edits `actions/index.ts`, `main/live-layer.ts`, `http/mount-all.ts`, `mcp/registry.ts` or `agent-tools/registry.ts` (W12).
- **Long files.** `contracts.ts` (2,758), `checks.ts` (834), `inspector/copy.ts` (487), `review/run.ts` (472), `direct-edit/commit/batch.ts` (429), `create-prototype.ts` (428): no growth for files over 500, and no growth past 500 for the others (L2a).
- **Perf baseline.** No pick edits `scripts/perf/baseline.json` (P10, L6).
- **Fake apps under `ds-wt`.** Each pick has its own prefix (`p42-`, `br-`, `ri-`, `tc-`, `lk-`). No pick writes into Bonaparte or `ac-next-b`.

## Merge order

All 5 can run at once. Only batch-rename changes the generated lists, so it merges last. Merge in this order, and run `pnpm run build:ui` and `pnpm exec tsx scripts/check-bundle.ts` after each merge (a new lazy chunk can shift the `screen-preload` indexes):
1. **polish-42**: first. It wins back the B1 margin that the other picks need, and it adds `use-color-dismiss.ts`, which the token popup then uses.
2. **route-into**: no shared file with the others.
3. **frame-link**: no shared file with picks 1 and 3. Check that B1 does not change (the share viewer is a separate entry).
4. **token-color**: rebase on polish-42 (the popup dismiss), `build:ui`, `check-bundle` (the new lazy inspector export must not add a Home chunk name).
5. **batch-rename**: last. It adds an action, so it changes the generated action and live lists, and it shares `versions-layers-tokens/copy.ts` with token-color. Rebase, run `pnpm exec tsx scripts/gen-routes.ts`, check the `copy.ts` line count, run `call-action.ts layer.rename`.

After the last merge, run `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run check:scripts` (expected to fail only at the `check-actions` items left for Tyler; write the counts), `pnpm run lint:gate`, `pnpm exec tsx scripts/gen-routes.ts --check`, `pnpm run build:ui`, `pnpm exec tsx scripts/check-bundle.ts` and `pnpm exec tsx scripts/check-boot-imports.ts`. Then `pnpm run desktop:pack`. Then one mock session on merged main: a Fill alpha drag on `p42-next` (1 version, `bg-black/40`), a rule Fix on `p42-rule`, a Fraunces pick on `p42-font`, a 12-layer rename on `br-seed`, 2 route copies into one prototype on `ri-next`, a token alpha drag on `tc-seed`, and a frame link on `lk-seed`.

## Real-model run budget

None. No pick changes a prompt or the run loop. route-into uses `STUDIO_AGENT=mock` for the run that `create_prototype_project` starts. Total: 0 runs.

## Runners-up

1. `inspect_accessibility` takes `colorScheme`, so an MCP client and the Accessibility panel can check dark contrast on any frame (cycles 39 to 41; 0 hits in `actions/src/accessibility/`).
2. Multi-selection color fields show "On this page" (color-pick "Open"; there is no port context there).
3. Frame links in the cloud viewer (`apps/publish`), the same `#frame=` hash as frame-link.
4. Hide and lock keys (Figma `Mod+Shift+H`, `Mod+Shift+L`). `Mod+Shift+H` is "Go to Home" (`keymap.ts` line 61), so it needs a key decision first.
5. Alignment and wrap hits in the run-end fix loop for prototypes (needs a real-model budget).
6. Near-duplicate shadows: the review probe does not collect `box-shadow` literals.
7. Fixes for near-values hits in app CSS modules and Tailwind `@apply` (polish-42 covers plain HTML rules only).
8. Card parts: split a 2-part hand card into `CardHeader` and `CardContent` (kit-swap skips it with `needs-parts`).
9. Dynamic routes in Move to app: the default route is the fixture path (`/visits/1`), and assets go to `public/id/` (cycle-35 flow-update and flow-review; not rechecked).
10. The first double-click after a page load sometimes does not open the text edit (not rechecked).

Dropped from the list: measure, rulers, zoom keys, per-corner radius, aspect lock, absolute position, blend modes, image fit, border per side, select layer, select matching, find and replace, swap instance, shape and text tools, layer copy as PNG, edit and resend, queued comments, templates, URL and image attach, copy code, PPTX export, tweaks (the code exists, see Findings). Voice input: macOS dictation already works in every text field.
