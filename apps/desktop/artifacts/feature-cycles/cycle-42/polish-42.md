# Cycle 42 pick 1: polish-42

Branch `feat/polish-42`. Ships 4 of the 5 items: the B1 win, live Fill writes, the popup that stays open, and the near-values rule Fix. The next/font item is left out (see "Left out").

## What changed

- **B1 (Home preload).** `ui/app/screen-preload.ts` has 1 loader, `toDesignSystemModule`. `designSystems` and `newDesignSystem` call it. The built chunk has 1 `__vite__mapDeps` list for the design-system import, not 2.
  - On main: `B1 Home bytes 274705 B (baseline 274703 B, delta 2 B)`. The chunk had 2 lists of 125 chars for that import.
  - After the change: `B1 Home bytes 274551 B (delta -152 B)`. The margin under the baseline is 152 B. The target of 274,600 B or less is met. There are no new chunk names.
- **Fill writer.** `style-scope/fill/classes.ts` `toColorClass` asks `cssClass("background-color", color, theme)` first. It uses the class name with the `from`/`via`/`to` prefix for gradient stops. `cssClass` is exported through `direct-edit/engine/index.ts` and `style-scope/fill/deps.ts`.
- **Live Fill writes.** `fill/use-paint-edit.ts` takes a `live` target (`PaintLive`) or `null`:
  - Solid fill: the popup previews on the canvas. Pointer up writes once through `set_fill`. Escape reverts.
  - Gradient fill: the stop field passes `live={null}`, so it keeps the draft and Apply.
  - `use-fill.ts` has a new `useFillApply` hook (`applyDraft`), `live` and `isColorOnly`.
  - `fill-row.tsx` hides Apply/Reset when only the solid color changed. Enter does not apply twice.
- **Popup stays open.** New `inspector/use-color-dismiss.ts` (`useColorAnchor`) replaces `useAnchoredPopover` in `use-color-popup.ts`.
  - It closes on a pointer down outside the panel and the trigger, and on Escape.
  - On scroll and resize, it places the panel at the trigger again. It closes only when the trigger leaves its scroll box or leaves the DOM.
  - `packages/ui` is not changed, so the other 2 users of `useAnchoredPopover` keep their behavior.
- **near-values rule Fix.** `ReviewFix` keeps its shape. A rule fix is a `DirectEditRequest` with `selector` set to the rule selector and `style: {prop: target}`. The source is one of these 2:
  - a `.css` file that the page links, or
  - the page `.html` file with `tag: "style"`, which means "the rule in a `<style>` block".
- **New and changed files for the rule Fix:**
  - New pure engine `direct-edit/engine/css-rule-value.ts` (`toCssRuleValue`, `toStyleBlockRuleValue`). It rewrites the value of a declaration in the top-level rule with that exact selector and keeps the formatting.
  - New `direct-edit/commit/css-rule-patch.ts`. `commit/edit-source.ts` `patchSource` sends a rule edit there. `.css` is added to the editable extensions.
  - New `review/near-value-rule-fix.ts`. It makes 1 `page.evaluate` for all rule selectors to find the owner sheet (a `<style>` block or a `<link href>`), then builds the fix.
  - The fix is given only when all of these are true: the rule has 1 selector (no comma), it is a top-level rule, the element's file is `.html`, and the CSS file is not remote.
  - App CSS (CSS modules, Next `_next` sheets, Tailwind) keeps `fix: null`.
  - `review/near-value-drafts.ts` calls it. A rule hit has no guard literal, because CSSOM can serialize the value as `rgb(...)`. The "edit changes nothing" guard still runs.

Files outside the pick's list. No other pick owns them:
- `direct-edit/engine/index.ts` (export `cssClass`)
- `style-scope/fill/deps.ts`
- `fill/{paint-field.tsx,gradient-fields.tsx,fill-row.tsx,use-fill.ts}`
- `direct-edit/commit/edit-source.ts`
- new `direct-edit/commit/css-rule-patch.ts`
- new `review/near-value-rule-fix.ts`

`.claude/goal/roadmap.md` is not in the worktree. The new files for Appendix A are:
- `inspector/use-color-dismiss.ts`
- `direct-edit/engine/css-rule-value.ts`
- `direct-edit/commit/css-rule-patch.ts`
- `review/near-value-rule-fix.ts`

## Checked in the running app

Server on port 6440, `STUDIO_AGENT=mock`, data at `ds-wt/polish-42-data`. Fixtures:
- `ds-wt/p42-next`: a copy of `ac-next-b` with a `bg-black/50` box on `/crew`.
- `ds-wt/p42-rule`: `.btn { background-color: #2463ea }` in a `<style>` block, 6 inline `#2563eb` buttons, a shared `.card, .tile` radius rule, 9 inline radius-8 cards, and `.note { color: #64748c }` in a linked `styles.css` next to 4 inline `#64748b`.
- `ds-wt/p42-font`: a copy of `ac-next-b`. It was imported, but no test ran on it.

| Check | Result |
|---|---|
| Fill popup alpha drag, 3 drags in a row (playwright, dark and light) | Passes. 1 `POST /fill` per drag. The class goes `bg-black/50` to `bg-black/38` to `bg-black/62` to `bg-black/38`. The popup stays open after each write. The Fill row shows no Apply |
| Undo 3 times | Passes. Back to `bg-black/50`, 1 "Fill: solid" step per drag |
| Gradient | Passes. Linear adds Apply and makes no write |
| `set_fill` over HTTP | Passes. `rgb(0 0 0 / 0.4)` gives `bg-black/40`, `rgb(15 23 42 / 0.37)` gives `bg-slate-900/37`, `#123457` gives `bg-[#123457]`. Exactly 1 `bg-*` class stays after each write |
| `call-action.ts fill.set` (`rgb(0 0 0 / 0.4)` on `p42-next`) | Passes. 3 surfaces, 0 diffs, `bg-black/40`, reset by 1 undo each |
| Popup scroll | Passes. A 40 px wheel keeps it open and places it again (trigger y 469 to 429). A 2000 px wheel that moves the field out of view closes it |
| Review on `p42-rule` | 3 near-value hits. `.btn` (`<style>` block): Use #2563eb. `.note` (linked `styles.css`): Use #64748b. The shared `.card, .tile` radius: `fix: null`, Ask Claude |
| Fix click in the UI (light) | Passes. `POST /review/fix` gives 1 version, and `background-color: #2563eb;` is written in the rule with the formatting kept. The re-run has no `.btn` hit. Undo restores `#2463ea` |
| `call-action.ts direct-edit.applyReviewFix` on the `.btn` finding | All 3 surfaces apply the fix and reset by 1 undo. It reports "2 diffs": these are the version `id`, `createdAt`, `parentId` and `meta` origin fields, which differ on each write. The applied ids, the files and the title are the same |

Screenshots in `cycle-42/polish-42/`: `fill-popup-{dark,light}.png`, `review-rule-fix-{dark,light}.png`.

Main proofs: I did not rerun the popup and rule items on main. On main, `useDismiss` closes on any capture scroll (`use-anchored-popover.ts` line 81). The cycle-41 report lists rule hits as Ask Claude only.

## Gates

- `pnpm run typecheck`: 0 errors.
- `pnpm run lint:gate`: passes, 59,593 diagnostics (baseline 89,733).
- `pnpm run build:ui`: passes.
- `check-bundle`: passes. B1 is 274,551 B, delta -152 B, and there are no new chunk names.
- `check-actions.ts --probes`: 557 hits, the same as main at `5e544ae40` (557). Probes pass, 11 of 11.

## Snapshots

No action file and no tool description or input changed, so there is no snapshot diff. Not run: `mcp-snapshot.ts`.

## Left out

- **next/font write for Next apps (whole item).** Not built: no Google Fonts group in a Next app, no `next-font-import.ts` engine, no `next-font-plan.ts`, no 2-file commit. The 4 shipped items used the time.
- **Fill live write on a gradient stop.** Kept on Apply, as the spec says.
- **Rule fix in `@media` or other nested rules.** Only top-level rules are rewritten. A nested rule hit fails the dry run, so it keeps Ask Claude.
- **Merge key of a rule fix.** The fix source is `file:1:<rule index + 1>`, so `mergeEdits` keys stay apart for each rule. If an element in the same HTML file starts at line 1 at that column, its key can collide with the rule fix. This is rare.
