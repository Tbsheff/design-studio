# Feature cycle 24: next 5 features

Date: 2026-11-13. Main at `04d73abcb` (all 5 cycle-23 picks merged at `ed99abc75`).

## Method

- Read `cycle-23.md` (picks, runners-up, Results), the 5 `cycle-23/*.md` reports ("Left out"), cycles 13 to 22 (picks, runners-up, Results open items) and `git log --oneline -120`.
- This cycle gives more weight to AI quality. Read the agent quality path: `server/agent/{prompt.ts,critic.ts,polish-loop.ts,final-check.ts,check-tool.ts,clarify.ts,taste.ts}`, `server/preview/{quality.ts,quality-probe.ts}`, `server/review/{run.ts,checks.ts,probe.ts}` and the `theme`, `brief`, `variation` and `run` decision actions.
- Checked each candidate with narrow greps in `packages/common/{actions,contracts}/src` and `apps/desktop/src/{ui,server,bridge,shared}`, and in Bonaparte (`git grep -l` on `*.tsx`, read-only, counts only).
- Proof of each gap:
  - Type and spacing check: `QualityCheckName` (`contracts.ts` line 929) and `REVIEW_KINDS` (`contracts/src/review.ts`) have no typography or spacing member. `quality-probe.ts` and `review/probe.ts` read no font size, line height or line length (`ProbeElement` has `width`, `height`, `padding` only). The prompt asks for "a type scale with real contrast between levels" and "one spacing scale" (`prompt.ts` line 109), but only the model critic judges this. No measured check reaches the fix loop.
  - Rotate handle: `ui/features/canvas` has resize and scale handles, no rotate handle (`rotat` hits in canvas are the Play device rotate and the menu item only). Cycle-23 runner-up 9. Rotate-flip "Left out": a rotation from `transform` gets a second rotation on edit, no multi-select flip, focus stays in the Rotation field.
  - Shadow scale: `style-scope/effect/engine/variant-classes.ts` line 149 writes only `shadow-[...]`. State-sections "Left out": "effect.get reads only arbitrary classes back; a hand-written `hover:shadow-lg` is not listed". `classes.ts` has a `SHADOW_NAMES` set but the Effect path does not use it. Bonaparte: `shadow-xs|sm|md|lg|xl|2xl|none` in 343 files, `shadow-[` in 11.
  - Edge states: `STYLE_STATES` in `contracts/src/state-styles.ts` has no `first`, `last`, `odd` or `even`. Bonaparte: `first:` or `last:` in 113 files, `odd:` or `even:` in 5. Cycle-23 runner-up 8. Divide-lines "Left out": CSS projects answer 400 because `direct-edit/engine/variant-css.ts` accepts only `.sv-xxxxxx` with a state, not `> * + *`.
  - Polish-24: cycle-23 Results "Open": the space-stack bundle (both axes, `md:space-y-*`), text lists cannot edit the parent list from an `li`, and the divider class line updates only on the next selection.
- Checked and dropped: a "starter look" pick (build theme candidates from the brief on a blank prototype, write the first, offer the others as a Look decision chip). `theme.create` fails on a blank prototype: `style-scope/theme/theme-run.ts` line 75 throws `BadRequestError(NO_TOKENS)` when `getThemeTokenBase` (`design-system/theme-tokens.ts`) returns `null`, and it does when there are no app tokens and no `tokens.css`. The pick would also need a starter token base, so it is over "a few hours". It is runner-up 1.
- Already built, so not picked as AI quality: design critique before finish (`critic.ts` full, quick and regression critics, `final-check.ts` runs `review_frame`), clarify questions (`clarify.ts`), decision chips (`run.createDecision`), taste rules (`taste.ts`), generic-layout and duplicate-content checks, theme candidates (`theme.*`), variations (`variation.start`), brief expand (`brief.run`), reference match.
- Branch check: `git branch -a` has no `feat/type-rhythm`, `feat/rotate-handle`, `feat/shadow-scale`, `feat/edge-states` or `feat/polish-24`. Near names that exist and are not used: `r6-critic`, `r11-ai-quality`, `starter-tokens`, `theme-from-site`, `polish-22`, `composer-craft`.
- Competitor recheck (2 web searches, 2026-11-13): no item dated November 2026 for Claude Design, Figma or Figma Make, v0, Lovable, Bolt, open design or doop. Claude Design now runs inside Claude chats and Claude Code and has a revamped Design Systems setting (claude.com/design); the June 2026 update added an admin lock for one design system (already runner-up "Locked design system" in earlier cycles). No pick comes from a new competitor feature.
- Skipped as the user's decision: the panel rail until edit mode, the Home cuts, the MCP snapshot approvals that wait from cycles 14 to 23, and the MCP names with repeated words.
- `fix/idle-chrome` (another agent, this session) still owns headless Chrome and `get_screenshot`. No pick changes a headless Chrome path. Pick 1 uses `preview.withPage` as `review/run.ts` does today and adds no new page launch.

## Skipped as built (checked this cycle)

Everything in the cycle-13 to 23 lists, plus:
- Truncate and line clamp (`inspector/truncate-model.ts`), Select matching (`inspector/select-matching-*.tsx`), absolute position in auto layout (`mcp/arrange-tools.ts`), per-corner radius, background blur, glass, noise and shader effects, text indent, tabular numbers.

## Ranking

Score = user value x fit with "simple and fast" / effort (1 to 5 each). Rank by value first; the score breaks ties.

| Rank | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|
| 1 | type-rhythm: a measured type and spacing check that the agent fixes before it finishes (AI quality) | 5 | 5 | 2 | 12.5 |
| 2 | shadow-scale: shadows read and write as `shadow-sm` to `shadow-2xl` (Bonaparte) | 5 | 5 | 2 | 12.5 |
| 3 | rotate-handle: drag just outside a corner to rotate (Figma) | 4 | 5 | 3 | 6.7 |
| 4 | edge-states: First, Last, Odd and Even in the state picker, plus divide lines on CSS projects | 4 | 4 | 3 | 5.3 |
| 5 | polish-24: the cycle-23 open items in one pick | 3 | 5 | 2 | 7.5 |

Type-rhythm is the AI-quality pick. The model already gets a prompt rule for a type scale and a spacing scale, and a model critic, but nothing measures them, so the first result often has 9 font sizes, 110-character lines and 13 px gaps, and the user asks for a follow-up. A measured finding in `review_frame` reaches the agent's final check and fix loop at no extra model cost, and the user sees the same findings in the Review panel. Shadow-scale is the Bonaparte pick: 343 Bonaparte files use a named shadow, and the Effect section turns each one into an arbitrary `shadow-[...]` class on the first edit. Rotate-handle is the Figma manual gap and closes the rotate-flip left-outs. Edge-states is the second Bonaparte item (113 files) and owns `variant-css.ts`, so it also fixes divide lines on CSS projects in that file. Polish-24 bundles the other small cycle-23 open items.

No pick adds an always-visible control: findings show in the existing Review panel, the shadow size is a choice inside an existing shadow row, the rotate handle shows only on hover just outside a corner of a selected layer, the edge states show in the existing state picker only on list children, and polish-24 adds no control.

---

## 1. type-rhythm: a measured type and spacing check that the agent fixes before it finishes (AI quality)

**Why.** Claude Design's first results look good because the type and spacing are consistent. Our prompt says so (`prompt.ts` line 109), and the critic looks at typography, but a model looking at a screenshot misses "11 font sizes" or "15 px and 13 px gaps next to 16 px". These are facts the page can measure. When the check is measured, the agent fixes it in the same run, the critic can spend its 10 issues on layout and copy, and the user needs fewer follow-ups.

**UI behaviour.**
- The Review panel lists a new group "Type and spacing" with the existing finding rows. No new section, no new button.
- Findings (all measured on visible text and boxes in the frame):
  - Too many font sizes: more than 7 distinct sizes in one frame (medium), or more than 9 (high). The message names the sizes and how many elements use each. Fix: snap each size used by 2 or fewer elements to the nearest size used more, or to the nearest token step when the project has type tokens.
  - Long lines: a paragraph or list item with more than 85 characters per line at desktop (medium). Fix: `max-w-prose` (Tailwind) or `max-width: 65ch` (CSS).
  - Tight body text: line height under 1.35 on text with 2 or more lines and a size under 20 px (medium). Fix: `leading-relaxed` or `line-height: 1.5`.
  - Loose headings: line height over 1.4 on text of 32 px or more (low). Fix: `leading-tight`.
  - Small text: body text under 14 px that is not a label, caption or badge (low; medium under 12 px).
  - Weak hierarchy: the largest heading is less than 1.25 times the body size, or two heading levels differ by less than 2 px (medium, no direct fix; the message names both elements).
  - Off-scale spacing: padding, gap or margin values that are not on a 4 px step, when 3 or more elements share the off value (low). Fix: snap to the nearest step or spacing token.
  - Too many font families: more than 3 families on visible text (medium).
- Emit one finding per outlier element, each with its own `selector` and `source` (`file:line:col`). Put the frame-level count in the message ("1 of 10 font sizes on this frame"). Never emit a frame-level finding with `source: null`: the final check drops it (`final-check.ts` lines 400 to 403 keep only non-low findings whose source is in a changed file and on a changed line), and its dedupe keys on `kind|selector`, so one frame-level row would also hide the others.
- Direct fixes use the existing Apply fix path (`apply_fix`) and are one undo step each. `ReviewFix.edit` is a `DirectEditRequest`, and `line-height`, `max-width`, `font-size`, `padding` and `gap` are already in `DIRECT_STYLE_PROPERTIES`, so the fix needs no new edit type. Fixes respect app tokens: in an attached app, a fix writes only token classes and never an arbitrary value; with no matching token the finding has `fix: null`.
- In an attached app, only findings on elements in files the run changed are listed in the final check (the final check already filters by changed files, `final-check.ts` line 401). Existing app pages are not flagged in the run loop; the Review panel still shows them.

**Agent loop.** No prompt growth except one line. The final check already runs `review_frame` when the agent did not (`final-check.ts` lines 471 and 526) and feeds back non-low findings in changed files. Medium and high type findings reach the agent through that path. Do not add the new kind to the blocking set in `polish-loop.ts`: `isBlocking` works on `QualityFinding` render checks, and a noisy blocking check would use up `MAX_FIX_LOOPS` (3). In `prompt.ts` (482 lines) change the one line 109 to say "Review lists measured type and spacing findings; fix the medium and high ones." (net 0 lines). Do not edit `critic.ts` (589) or `final-check.ts` (586); both are over 500 lines.

**Headless.** No new action. Add `"type"` to `REVIEW_KINDS` and a `"type": "Type and spacing"` entry to `REVIEW_KIND_LABEL` in `packages/common/contracts/src/review.ts`. `review_frame` (`direct-edit.runReview`) and `apply_fix` (`direct-edit.applyReviewFix`) serve it as they serve the other kinds. The `review_frame` description adds "type scale, line length, line height and spacing steps" (stays under 600 chars). Description diff for `review_frame`; user decision at merge. The in-app agent gets the same findings through `review_frame` and the final check.

**Main files.**
- Contracts: `packages/common/contracts/src/review.ts` (89 lines: one union member, one label). `Record<ReviewKind, ...>` appears only in this file (grep of `apps/desktop/src` and `packages`), so tsc asks for no other map entry; recheck at build time.
- Probe: new `server/review/type-probe.ts` (reads computed `font-size`, `line-height`, `font-family`, the line count and characters per line from text rects, and the padding, gap and margin of boxes; a String.raw source like the other probes, with the `__name` shim if it serializes a function, W21). If it needs a typed in-page function, a `type-probe.probe.ts` sibling listed in `tsconfig.server-probe.json` (W16, W17).
- Engine: new `server/review/engine/type-rhythm.ts` (pure: probe facts and token entries in, `Draft[]` out; no `effect`, no `node:*`, W8a). Use `matchDimension` and `matchForProperty` from `shared/token-match.ts` for token snaps, as `checks.ts` does. Export it from `server/review/engine/index.ts`.
- Runner: `server/review/run.ts` (386 lines): one probe call and one `...typeDrafts(...)` line in the `base` list (line 303). Do not edit `checks.ts` (834).
- Actions: `packages/common/actions/src/direct-edit/run-review.ts` (description only).
- Agent: `server/agent/prompt.ts` line 109 (one line, net 0).
- UI: no new component. If the Review panel needs a group label, it reads `REVIEW_KIND_LABEL`; if `ui/features/review/copy.ts` (91 lines) needs a tip, add one `typeKind` key only.

**Verify in the running app** (`STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev`).
- Seed an HTML project page with 10 font sizes, a 1200 px wide paragraph, a 3-line paragraph with `line-height: 1.1`, a 48 px heading with `line-height: 1.6` and three cards with `padding: 13px`. Open Review: "Type and spacing" lists each finding with the right severity. Apply fix on the paragraph: `max-width: 65ch`, the line count changes, Cmd+Z undoes it in one step.
- Seed a well-set page (5 sizes, 65ch lines, 4 px steps): no type findings.
- Tailwind fake app with `text-[13px]` on 2 elements next to many `text-sm`: the fix writes `text-sm`. Attached app with type tokens: a fix writes only token classes; with no match, `fix` is `null`.
- MCP `review_frame` on the seeded frame: the same findings with `kind: "type"`. `apply_fix` on one: the file changes. `pnpm exec tsx scripts/call-action.ts direct-edit.runReview '<json>'`: HTTP, MCP and agent outputs match.
- Agent loop: start a mock run on the seeded project and read the run log: the final check lists the medium and high type findings in its follow-up text. The mock agent edits a fixed `h1`, so it cannot show a better first result. A real-model run (a blank "pricing page" prompt, compare the number of font sizes and type findings before and after this branch) is still open; report it as open.
- Bonaparte (read-only, route copy beside the app): Review on one dashboard route; report the count of type findings per kind, to check that the thresholds are not noisy on a real app. Bonaparte `git status --short` is unchanged.
- Dark and light screenshots of the Review panel with the group.

---

## 2. shadow-scale: shadows read and write as `shadow-sm` to `shadow-2xl` (Bonaparte)

**Why.** Bonaparte uses named shadows (`shadow-sm`, `shadow-md`, `shadow-lg`) in 343 files and arbitrary `shadow-[...]` in 11. The Effect section edits numbers, and the writer (`variant-classes.ts` line 149) writes `shadow-[0_1px_3px_...]`. One edit on a Bonaparte card turns a token into a raw value, and `review_frame` then files it as off-token. Figma has shadow styles; Tailwind has the shadow scale. Cycle-23 Results lists "Shadows are written as exact values, not scale names".

**UI behaviour.**
- Each Drop shadow row gets a "Size" choice at its head: None, 2XS, XS, SM, MD, LG, XL, 2XL, Custom. No new section. A layer with `shadow-md` opens with MD picked and the numbers of the `md` value shown below, read-only until you change one.
- Picking a size writes `shadow-<name>` and removes the other `shadow-*` class of the same prefix. Under a picked state it writes `hover:shadow-lg` (the variant path from cycle 23 stays).
- Editing a number turns the row to Custom and writes `shadow-[...]` as today. When the edited value equals a scale value, the writer writes the name.
- The scale values come from the project: `--shadow-*` theme variables in the app tokens or `tokens.css`, else the Tailwind v4 defaults. A size that the project overrides shows its project value.
- Named shadows under a variant read back: `hover:shadow-lg` is listed in the state stack, and the row shows LG when Hover is picked.
- `shadow-<color>` (`shadow-black/10`) stays the shadow color and is not a size.
- CSS projects: the Size choice shows only when the project has `--shadow-*` tokens; it writes `box-shadow: var(--shadow-md)`.
- Inner shadow: the same choice with `inset-shadow-*` names (`inset-shadow-xs`, `inset-shadow-sm`) when the engine supports them; else Custom only.

**Headless.** No new action. Each drop-shadow item in `effect.set` (`set_effect`) and `effect.get` (`get_effect`) gets `size`: `"2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | null` (`null` = custom numbers, default `null` with `Schema.withDecodingDefaultKey`). `set_effect` with `size: "md"` writes `shadow-md` and ignores the numbers. `get_effect` returns `size` for named shadows. Also map `edit_element` `{ "box-shadow": "var(--shadow-md)" }` to `shadow-md`. Descriptions of `set_effect` and `get_effect` name `size`. Input and output diffs for both tools; user decision at merge.

**Main files.**
- Actions: `packages/common/actions/src/effect/schema.ts` (drop-shadow and inner-shadow structs, lines 72 to 80), `effect/{set.ts,get.ts}` (descriptions).
- Contracts: `packages/common/contracts/src/layer-effect.ts` (the `size` field and a `SHADOW_SIZES` list). Do not use `SHADOW_NAMES` from `tailwind/classes.ts` (server engine file); keep the list in contracts.
- Engine: new `server/style-scope/effect/engine/shadow-scale.ts` (pure: name to value, value to name, read `--shadow-*` from token entries). Wire it in `engine/variant-classes.ts` (341 lines: the write at line 149 and the read at line 213) and `engine/compile.ts`. Read named classes in `variant-read.ts` (79).
- Server: `server/style-scope/effect/get.ts` (return `size`), the `box-shadow` case of the direct-edit style map (the agent names the file; if it is `tailwind/map.ts`, move an equal number of lines out, as cycle 23 did, because `map.ts` may not grow).
- UI: `ui/features/effect/{effect-row-head.tsx,effect-model.ts,use-effect-handlers.ts}`, new `ui/features/effect/shadow-size-select.tsx`, one new `shadowSize` block in `ui/features/effect/copy.ts` (54 lines).

**Verify in the running app.**
- Tailwind fake app, a card `rounded-lg shadow-sm`. Select it: the shadow row shows SM. Pick LG: classes `rounded-lg shadow-lg`, no `shadow-[`. Cmd+Z: back to `shadow-sm` in one step. Change blur to 7: Custom, `shadow-[...]`. Set the numbers back to the `md` value: `shadow-md`.
- Pick Hover, pick XL: `hover:shadow-xl`, base `shadow-sm` stays. A hand-written `hover:shadow-lg` is listed in the state stack and reads LG under Hover.
- `shadow-md shadow-black/10`: size MD and the color stay separate.
- Project with `--shadow-md` overridden in `tokens.css`: MD shows the project value.
- HTML project with `--shadow-*` tokens: MD writes `box-shadow: var(--shadow-md)`. Without tokens: no Size choice.
- MCP `set_effect` with a drop shadow `size: "lg"`, then `get_effect`: `size: "lg"`. `review_frame` files no off-token finding for it. `pnpm exec tsx scripts/call-action.ts effect.set '<json>'`: 3 surfaces match.
- Bonaparte (read-only route copy): a `shadow-sm` card shows SM; count the `shadow-*` names that read back. Bonaparte `git status --short` is unchanged.
- Dark and light screenshots of the shadow row with the Size choice.

---

## 3. rotate-handle: drag just outside a corner to rotate (Figma)

**Why.** In Figma you rotate by dragging just outside a corner of the selection, with Shift for 15 degree steps. Cycle 23 added the Rotation field and flip keys, but on the canvas you can only scale and resize. Rotating an icon or a badge by hand needs the inspector. The bundle closes the rotate-flip left-outs.

**UI behaviour.**
- With one layer selected, the pointer just outside a corner handle (8 to 20 px out, at screen scale) shows a rotate cursor. No visible handle: only the cursor changes. Drag rotates around the layer center. The canvas shows the angle in a small label next to the pointer while you drag (as the scale ghost box shows the size).
- Shift snaps to 15 degree steps. Release writes one edit: `rotate-45`, `rotate-[17deg]` or `-rotate-12` (Tailwind) or `rotate: 17deg` (CSS), through the same direct-edit style write the Rotation field uses. One undo step. Escape during the drag cancels and puts back the old look.
- During the drag the preview shows the rotation through the bridge live preview (no file write until release).
- Not on: a frame (canvas frames do not rotate), a text layer in text edit, a locked layer, or with the scale tool (K) on. Multi-select: no rotate handle (out of scope; runner-up).
- Bundle (rotate-flip left-outs):
  - A rotation that comes only from `transform: rotate(...)` or a v3 `rotate-*` with `transform` is replaced on edit, not stacked. The write removes the rotate part of `transform` (or the `transform` class when it held only a rotation) in the same edit.
  - Shift+H and Shift+V flip every selected layer when several are selected, in one undo step.
  - After Enter in the Rotation field, focus leaves the field, so Shift+H flips at once.

**Headless.** No new action. The handle uses the existing direct-edit style write with `rotate` (`edit_element` `{ "rotate": "17deg" }`). Multi-select flip uses `batch_edit` with `scale` per layer. The transform fix changes the write only, so `edit_element` with `rotate` on a `transform` rotation also replaces it. No snapshot diff.

**Main files.**
- UI canvas: new `ui/features/canvas/{rotate-zone.tsx,rotate-drag-model.ts,use-rotate-drag.ts,rotate-angle-label.tsx}`, one mount line in `ui/features/canvas/resize-handles.tsx` (91 lines), one new `rotateHandle` block in `ui/features/canvas/copy.ts` (355). The canvas feature calls the direct-edit style action itself with `call(...)` from `src/ui/platform/http.ts` or the route `useAction`; it must not import `inspector/use-rotation.ts` (U7, no feature-to-feature import). Put the degree-to-step math in `rotate-drag-model.ts`; if it equals the inspector's, move the shared part to `src/ui/platform` or a contracts helper, never a cross-feature import.
- Bridge: live preview of `rotate` during the drag through the existing live preview message (`bridge/live-preview.ts`), and `bridge/rotate-style.ts` (48) if the read of a `transform` rotation needs it.
- Engine (transform fix): `server/direct-edit/engine/tailwind/rotate-scale.ts` (269): remove the rotate part of `transform` and v3 `rotate-*` on write.
- Multi-select flip: the flip command in the layer context menu model and the Cmd+K selection command file (cycle 23 named them in `ui/features/canvas/preview-menu-create.ts` and the selection commands), and `bridge/keyboard.ts` if the Shift+H path sends only one layer.
- Focus: `ui/features/inspector/rotation-field.tsx` (blur on Enter).

**Verify in the running app.**
- Tailwind fake app with `<svg className="size-6">`. Select it; move the pointer just outside the top-right corner: the rotate cursor shows. Drag: the icon turns live and the label shows the angle. Hold Shift: 15 degree steps. Release at 45: `rotate-45`. Release at 17: `rotate-[17deg]`. Escape mid-drag: no write. Cmd+Z: one step.
- A canvas frame selected, a text layer in text edit, a locked layer and K on: no rotate cursor.
- A layer with `transform: rotate(10deg)` (CSS) or `[transform:rotate(10deg)]`: drag to 30: one rotation of 30, the old one is gone.
- Select 3 icons, Shift+H: all 3 get `-scale-x-100`, one Cmd+Z undoes all 3.
- Type 30 in the Rotation field and press Enter, then Shift+H: the layer flips, no "H" in the field.
- HTML project: drag writes `rotate: 30deg`.
- MCP `edit_element` `{ "rotate": "30deg" }` on the `transform` layer: one rotation. `pnpm exec tsx scripts/call-action.ts` on the same style action: 3 surfaces match.
- Dark and light screenshots of the drag with the angle label.

---

## 4. edge-states: First, Last, Odd and Even in the state picker, plus divide lines on CSS projects (Bonaparte)

**Why.** Bonaparte styles list edges with `first:` and `last:` in 113 files (`last:border-0`, `first:pt-0`, `first:rounded-t-lg`), and stripes with `odd:` or `even:` in 5. The state picker covers interaction and parent states only, so a person or agent cannot see or edit `last:border-0` from the UI, MCP or the in-app agent. The same structural selector problem blocks divide lines on CSS projects (`> * + *`), and both live in `variant-css.ts`, so one pick owns that file.

**UI behaviour.**
- The state picker lists First, Last, Odd and Even only for a layer whose parent has 2 or more element children of the same tag, or a layer that already has `first:`, `last:`, `odd:` or `even:` classes. Other layers show the list as today.
- First writes `first:`, Last `last:`, Odd `odd:`, Even `even:`. Breakpoints combine as today: `md:last:border-0`. The inspector fields under First show the value for the first item.
- Show on the canvas: these states are structural, so there is nothing to force. Picking First outlines the first sibling in the preview (the layer the class affects).
- Mapped lists (`items.map((item) => <li className="...">)`, the Bonaparte case): one source location renders many items, so one write styles the edge of the whole list. The picker note says "Styles the first item in this list".
- Hand-written siblings (each `li` has its own class list): the write goes to the selected element only. The note says "Styles this layer when it is the first item". The pick never writes to a sibling.
- CSS projects: writes `.sv-xxxxxx:first-child`, `:last-child`, `:nth-child(odd)`, `:nth-child(even)` rules through `variant-css.ts`.
- Bundle: divide lines on CSS projects. `variant-css.ts` accepts a `> * + *` child rule, so `spacing.setDivider` on a CSS project writes `.sv-xxxxxx > * + * { border-top: 1px solid <color> }` (`border-left` for horizontal) instead of the 400 "Lines between items need a Tailwind project". `spacing.getDivider` reads it back. The divide-lines report found the trap: a rule added to the shared state-style block "would be lost on its next rewrite". The child rule must be part of the block model that `variant-css.ts` parses and writes back, so a later state edit on the same layer keeps it.

**Headless.** No new action. Add `first`, `last`, `odd` and `even` to `STYLE_STATES`, so `set_state_style`, `list_state_styles` and `set_forced_state` take them. `set_forced_state` with an edge state answers `isStructural: true` and forces nothing (or add the field only to the output if the schema allows it; the agent checks). Descriptions of the 3 tools name the 4 states and the written forms (under 600 chars). The divide fix changes `set_divider_spacing` behaviour on CSS projects; its description drops the Tailwind-only text. Input enum and description diffs for those 4 tools; user decision at merge.

**Main files.**
- Contracts: `packages/common/contracts/src/state-styles.ts` (282 lines: the 4 states and an `EDGE_STATE_VARIANTS` map next to `GROUP_STATE_VARIANTS`).
- Engine: `server/style-scope/engine/state-scope.ts` (203: read and write the 4 prefixes; keep the data-state and group order rules), `server/direct-edit/engine/variant-css.ts` (309: the 4 pseudo-classes and the `> * + *` child rule).
- Server: the sibling check in `server/state-styles/` (the agent names the file), `server/state-styles/input.ts` (descriptions), `server/style-scope/divider/*` (CSS path, remove the Tailwind-only guard).
- Actions: `packages/common/actions/src/state-style/{set.ts,inspect.ts,set-forced.ts}` and `spacing/set-divider.ts` (descriptions only).
- Bridge: `bridge/force-state.ts` (439: the structural answer and the first-sibling outline; stays under 500).
- UI: `ui/features/state-styles/{state-styles-model.ts,copy.ts}` (one `edge` block in `copy.ts`, 45 lines).

**Verify in the running app.**
- React fake app with `{rows.map((row) => <li key={row} className="border-b py-2">{row}</li>)}` and 4 rows. Select any `li`: the picker lists First, Last, Odd, Even. Pick Last, set border width 0: `last:border-0` on the one source `li`; only the last row loses its line. Pick First, padding top 0: `first:pt-0`. md + Last: `md:last:border-0`. Cmd+Z: one step each.
- Hand-written `<ul><li className="border-b">` x4: select the third `li`, Last, border 0: only that `li` gets `last:border-0` (no visible change, it is not last), the note says it styles this layer.
- A `<p>` alone in a `div`: no edge states. A `div` with `last:mb-0` and no siblings: Last shows (it has the class).
- HTML project: Last border 0 writes a `.sv-xxxxxx:last-child` rule. Lines between on a CSS stack writes the `> * + *` rule and the lines show; `get_divider_spacing` reads it. Then pick Hover on the same layer and change its fill: the divider rule is still in the file and the lines still show.
- MCP `set_state_style` `state: "last"`, then `list_state_styles`: listed. `set_forced_state` `last`: structural answer. `pnpm exec tsx scripts/call-action.ts state-style.set '<json>'`: 3 surfaces. `call-action.ts spacing.setDivider` on the HTML project: 3 surfaces.
- Bonaparte (read-only, `git grep`): count the `first:`, `last:`, `odd:` and `even:` uses that read as a state; report the count. Bonaparte `git status --short` is unchanged.
- Dark and light screenshots of the picker on a list item.

---

## 5. polish-24: the cycle-23 open items in one pick

**Why.** Three small open items from cycle 23 Results make edits feel broken on real code: a `space-y-4 space-x-2` layer converts one axis only, the inspector misreads `md:space-y-*` at the md breakpoint, and the List row is read-only on every `li`, which is the layer people click. The divider class line also lags one selection.

**UI behaviour.**
- Shift+A on a layer with both `space-y-*` and `space-x-*`: one stack with `gap-<larger>` and a `gap-x`/`gap-y` pair when the two differ, no `space-*` left, one undo step.
- With md picked in the variant bar, Auto layout reads `md:space-y-*` as the md gap and writes `md:gap-*` on edit.
- Text lists: select an `li` whose parent `ul` or `ol` is in the same file: the List row edits the parent list (`list-disc` on the `ul`). When the parent is in another file, the row stays read-only with the note "Edit the list layer", as today. Types other than disc, decimal and none (`list-[square]`, `list-[lower-alpha]`) show as a fourth "Other" choice with the value, not a blank choice.
- The class line at the top of the inspector updates after a divider write, as after any other write.

**Headless.** No new action. The bridge selection gains the parent's source location, so the List row and the agent can address the parent. The `space-*` conversion is in the engine that `edit_element` and the auto layout action already use. No snapshot diff unless the selection context in a tool output gains `parentLoc`; if so, an output diff for `get_selection` (or the tool that returns the selection), user decision at merge.

**Main files.**
- Engine: `server/direct-edit/engine/tailwind/space-stack.ts` (241: both axes, the md read).
- UI: `ui/features/inspector/{space-stack-model.ts,use-space-stack.ts}`, `inspector/{list-style-row.tsx,list-style-model.ts,use-list-style.ts}`, the divider write callback in `inspector/use-divider.ts` (refresh the class line through the same path other writes use). One `textListOther` key in the existing `textList` block of `inspector/copy.ts` only if needed.
- Bridge and selection: the selection payload (`bridge/element-info.ts` and its contracts type; the agent names the type file) gains `parentLoc: string | null` (required field, `| null`, N8 and L4).

**Verify in the running app.**
- Tailwind fake app, `<div className="space-y-4 space-x-2">` with 3 children. Shift+A: `flex flex-col gap-y-4 gap-x-2` (or `gap-4` when equal), no `space-*`. Cmd+Z: one step.
- `<div className="space-y-2 md:space-y-6">`: base shows gap 8, md picked shows 24. Edit md gap to 32: `md:gap-8`.
- `<ul><li>One</li></ul>`: select the `li`, Bullets: `list-disc` on the `ul`. A `list-[square]` list shows Other: square.
- Lines between, then look at the class line: it shows `divide-y` at once.
- `pnpm exec tsx scripts/call-action.ts` on the direct-edit style action used by the List row on the `ul`: 3 surfaces match.
- Dark and light screenshots of the List row on an `li`.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 type-rhythm | `contracts/src/review.ts`, `server/review/{type-probe.ts,type-probe.probe.ts?,run.ts}`, `server/review/engine/{type-rhythm.ts,index.ts}`, `actions/src/direct-edit/run-review.ts` (description), `server/agent/prompt.ts` line 109, `typeKind` key of `ui/features/review/copy.ts` (if needed), `tsconfig.server-probe.json` include (if a probe sibling) |
| 2 shadow-scale | `actions/src/effect/{schema.ts,set.ts,get.ts}`, `contracts/src/layer-effect.ts`, `server/style-scope/effect/{get.ts,variant-read.ts}`, `server/style-scope/effect/engine/{shadow-scale.ts,variant-classes.ts,compile.ts}`, the `box-shadow` case of the direct-edit style map, `ui/features/effect/{effect-row-head.tsx,effect-model.ts,use-effect-handlers.ts,shadow-size-select.tsx}`, `shadowSize` block of `ui/features/effect/copy.ts` |
| 3 rotate-handle | `ui/features/canvas/{rotate-zone.tsx,rotate-drag-model.ts,use-rotate-drag.ts,rotate-angle-label.tsx,resize-handles.tsx}`, `rotateHandle` block of `ui/features/canvas/copy.ts`, the flip command in the canvas menu and Cmd+K files, `bridge/{live-preview.ts,rotate-style.ts}` (and `bridge/keyboard.ts` if needed), `tailwind/rotate-scale.ts`, `inspector/rotation-field.tsx` |
| 4 edge-states | `contracts/src/state-styles.ts`, `style-scope/engine/state-scope.ts`, `direct-edit/engine/variant-css.ts`, `server/state-styles/*`, `server/style-scope/divider/*`, `actions/src/state-style/*` and `actions/src/spacing/set-divider.ts` (descriptions), `bridge/force-state.ts`, `ui/features/state-styles/*` |
| 5 polish-24 | `tailwind/space-stack.ts`, `inspector/{space-stack-model.ts,use-space-stack.ts,list-style-row.tsx,list-style-model.ts,use-list-style.ts,use-divider.ts}`, `bridge/element-info.ts` and the selection contracts type |

Shared files and conflict warnings:
- Copy files: each pick adds its block to a different `copy.ts`. Pick 1: `ui/features/review/copy.ts` (one key, only if needed). Pick 2: `ui/features/effect/copy.ts`. Pick 3: `ui/features/canvas/copy.ts`. Pick 4: `ui/features/state-styles/copy.ts`. Pick 5: `ui/features/inspector/copy.ts` (one key inside the existing `textList` block, only if needed). No two picks add a block to the same `copy.ts`. Pick 3 touches `inspector/rotation-field.tsx` but adds no copy.
- Unions and lists: pick 1 adds one member to `REVIEW_KINDS` and one entry to `REVIEW_KIND_LABEL` (`contracts/src/review.ts`); pick 4 adds 4 members to `STYLE_STATES` (`contracts/src/state-styles.ts`); pick 2 adds `SHADOW_SIZES` in `contracts/src/layer-effect.ts`. Three different files. No pick edits `contracts.ts` (over 2000 lines, may not grow): pick 1 uses `REVIEW_KINDS`, not `QualityCheckName`, for that reason. Pick 5 edits the selection type; if it lives in `contracts.ts`, offset the line in the same file (move a line out), as cycle 23 did.
- Import lines: pick 1 adds one import and one spread line in `server/review/run.ts`; no other pick edits it. Pick 1 adds one export line to `server/review/engine/index.ts`; no other pick edits it.
- `direct-edit/engine/variant-css.ts`: pick 4 only. It holds both the edge pseudo-classes and the divide-lines CSS rule, so pick 5 does not take the divide-CSS item.
- Tailwind engine: pick 3 owns `rotate-scale.ts`, pick 5 owns `space-stack.ts`. Pick 2 may need the `box-shadow` case in `tailwind/map.ts` (982, may not grow): offset with an equal move out of `map.ts`. No other pick edits `map.ts`, `classes.ts` or `plan.ts`.
- Bridge: pick 3 owns `live-preview.ts`, `rotate-style.ts` (and `keyboard.ts` if needed); pick 4 owns `force-state.ts`; pick 5 owns `element-info.ts`. If pick 5's selection type is in `src/bridge/bridge-types.ts`, no other pick edits that file.
- `ui/features/inspector/*`: pick 3 edits `rotation-field.tsx` only; pick 5 edits the space-stack, list-style and divider files. Different files.
- `server/state-styles/`: pick 4 only. `server/style-scope/effect/`: pick 2 only. `server/style-scope/divider/`: pick 4 only.
- `server/agent/*`: pick 1 edits one line of `prompt.ts` (482). No pick edits `critic.ts` (589), `final-check.ts` (586) or `polish-loop.ts`.
- `artifacts/mcp-snapshots/*.json`: `review_frame` description (pick 1); `set_effect`, `get_effect` input and output (pick 2); `set_state_style`, `list_state_styles`, `set_forced_state`, `set_divider_spacing` inputs and descriptions (pick 4); the selection output if it changes (pick 5). Pick 3: none. Approve at merge (user decision), with the cycle-14 to 23 diffs that still wait.
- `.claude/goal/roadmap.md` Appendix A: add each pick's new globs before its slice runs (L6e), when the roadmap is in the worktree (cycle 23 found it was not).

## Merge order

All 5 can run at once. Merge 1 (type-rhythm: review only, no overlap; gen-routes for the description), then 2 (shadow-scale: effect only; gen-routes), then 4 (edge-states: state styles, `variant-css.ts` and the divider CSS path; gen-routes), then 3 (rotate-handle: canvas and bridge; rebase over nothing shared, check that Shift+H multi-select still works after pick 4's `force-state.ts` change), then 5 (polish-24 last: it changes the selection payload that many features read; rebase, gen-routes). After the last merge run `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run check:scripts`, `pnpm run lint:gate`, `pnpm run build:ui` and `pnpm run check:clip`. Then run pick 1's Review on the shadow-scale and edge-states test pages to check that their fixes add no new type findings.

## Runners-up

1. Starter look (AI quality): a blank prototype's first run builds 3 theme candidates from the brief, writes the first as `tokens.css`, and shows a Look decision chip whose other options apply a theme with no model call; `theme.create` fails with no token base today (`theme-run.ts` line 75), so it needs a starter token base first.
2. Measured type findings as blocking `QualityFinding` render checks in `check-tool.ts`, after pick 1 shows its thresholds are not noisy on Bonaparte.
3. Critic sees the measured type facts (a short `<type-facts>` block), after `critic.ts` (589) is split under 500 lines.
4. Rotate handle for a multi-selection, rotating each layer around its own center (Figma rotates the group), after pick 3.
5. Frame fit to content: Figma "Resize to fit" for canvas frames; waits for `fix/idle-chrome`.
6. `has-[...]` and `peer-*` states in the state picker (Bonaparte 11 and 10 files), after pick 4.
7. Line clamp count field: `line-clamp-2` as a number next to Truncate (Bonaparte 54 files); check `truncate-model.ts` first.
8. `get_screenshot` of a failed dev server returns `isError: false` (journey 7, Low); waits for `fix/idle-chrome`.
9. "App now" label on `page.importSource` frames (route-sync left out since cycle 16).
10. Clickable share link for app route prototypes (journey 15); today app projects get PNG snapshots; high effort.

Sources: [Claude Design](https://claude.com/design), [Claude Design overhaul (June 2026)](https://pureai.com/articles/2026/06/17/anthropic-overhauls-claude-design.aspx), [Claude Design news, November 2026](https://blog.mean.ceo/claude-design-news-november-2026/), [Figma Make two-way GitHub integration](https://venturebeat.com/technology/are-designers-the-new-swes-figma-makes-new-two-way-github-integration-turns-designs-into-live-production-code-with-built-in-governance), [mcp.directory 2026 comparison](https://mcp.directory/blog/claude-design-vs-stitch-vs-v0-vs-lovable-vs-figma-make-2026).

## Results

- Merged with no conflicts, in order: type-rhythm, shadow-scale, edge-states, rotate-handle, polish-24. Then fix/real-run-bugs (the 6 bugs from the first real-model runs in `artifacts/real-runs/report.md`). Main at 82c8de004.
- Real-run fixes: run 1 context 96k to 20k tokens; after 2 runs 39% of 200k, not 76%. CSS-only edits now count in change spotlight. State-run drafts sit on their own frame, edit drafts are never blank, the draft bar shows the real size, top banners no longer overlap. First draft 9.3 s to 7.7 s.
- Checks: gen-routes --check pass, typecheck 0 errors, lint:gate pass (59604, baseline 89733), build:ui pass, check:clip 0 findings (before the fix merge), desktop:pack pass.
- Installed app: :4570 returns 200. Server idle CPU 0.00 CPU-s/min over 60 s.
- Open: type rhythm's final check runs only for attached apps, so HTML prototypes get type findings only when the agent calls review_frame. Multi-select flip not done. The context meter assumes 200k while the SDK reports 1M. Each run still adds about 26k tokens. First draft still 7.7 s (target 5 s). Pressing Enter in an effect number field can write twice. MCP snapshots not refreshed (user decision).
