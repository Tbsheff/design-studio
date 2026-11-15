# Cycle 42, pick 2: batch-rename

Branch `feat/batch-rename`. Server on port 7520, `STUDIO_AGENT=mock`, data at `ds-wt/batch-rename-data`. Fixtures: `ds-wt/br-seed` (HTML, 12 cards and 3 named plans) and `ds-wt/br-next` (copy of `ac-next-b`, 4 `section` elements).

## What works

- **Action `layer.rename`**, tool `rename_layer` (derived name, not in a snapshot). Input: `projectId`, `directionId`, `path` (default `""`), `layers` (1 to 50 `{ selector, name }`, name 0 to 80 chars or null). Output: `{ renamed, skipped, versionId }`.
- **Selectors.** A layer id from `get_layers`, a CSS selector, or a source location `file:line:col`. A layer id or CSS selector goes through the page probe. A source location reads the tag from the source and needs no probe, so it works on any page. The UI sends the source location of each layer. It takes the location from the selection (the source that the single rename uses) and falls back to the tree `loc`. A Next app tree has no `loc`.
- **Skips.** A layer goes into `skipped` with a reason when it has no match, has no source, or has the same source as an earlier layer in the call. A source location outside the project (absolute or `..`) is skipped too. When no layer is left, the call fails with NotFound. One HTTP call checked this with `../br-next/app/page.tsx:9:7`, `/etc/hosts:1:1` and `div[` plus 1 good layer: 1 rename, 3 skips, no write outside the project.
- **Write.** 1 `applyDirectEditBatch` call: 1 version, 1 history entry, 1 Cmd+Z.
- **Batch rule.** `validate.ts` lets a batch entry change `name` when the entry changes nothing else. `move` and `insert` are still refused with the same text.
- **UI.** With 2 or more layers selected, F2 or "Rename layers…" in the layer context menu opens a popup at the top of the Layers panel. It has "Rename to", "Find" and "Replace" fields, and shows a preview of the first 5 names plus "and N more". The tokens are `$&`, `$n`, `$nn` and `$N`. Numbers follow the panel order. When Find has text, "Rename to" is off. Enter applies the names; Escape closes with no write. Over 50 layers, the popup shows "Select 50 layers or fewer to rename them." F2 on 1 layer still opens the inline rename.
- **Inline Tab.** Tab and Shift+Tab already worked on main (`layer-rename-input.tsx`, `finishRename` step). I checked them; I did not change them.

## Checked

- `call-action.ts layer.rename` on `br-seed`, with 3 layers (a CSS selector, a source location, and a null name): http, mcp and agent passed, 0 diffs, 1 undo each (`batch-rename/call-html.txt`).
- `call-action.ts layer.rename` on `br-next`, with 4 JSX source locations: passed, 0 diffs (`batch-rename/call-next.txt`).
- UI on `br-next` (the Next dev server runs in the studio): 4 sections, F2, "Panel $n", Enter. 1 POST with `app/page.tsx:9:7` to `:12:7`, 1 version, and `data-name="Panel 1"` to `"Panel 4"` in the JSX. The first try sent `layers: []`, because the Next tree has no `loc`. The fix takes the source from the selection.
- UI on `br-seed`:
  - 12 cards, F2, "Card $nn": the preview shows "Card 01" to "Card 05, and 7 more". Enter sends 1 POST, makes 1 version, and the panel shows "Card 01" to "Card 12".
  - 1 Cmd+Z restored all 12 names.
  - 3 plans, Find "Item", Replace "Plan": "Plan A", "Plan B" and "Plan C".
  - `$N` counts down (12 to 1).
  - Escape makes 0 writes.
  - Tab after an inline rename opens the next row.
- Screenshots: `batch-rename/popup-dark.png`, `batch-rename/popup-light.png`, `batch-rename/menu.png`.
- Passes: `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run lint:gate` (59,595 diagnostics, baseline 89,733), `pnpm run build:ui` and `gen-routes --check`.
- `check-bundle` passes. B1 is 274,705 B, the same as main (main is also 274,705 B). An early version added a CSS module, which made a new `layers.css` asset and added 70 B to B1 through `__vite__mapDeps`. The popup styles now live in `styles/canvas.css`.
- `check-actions --probes`: 278 hits on the branch and 278 on main (E1 25, E16 6, O11 1, O12 52, S11 194), so the count did not go up.
- I did no real-model run.

## Open

- **Version title.** A name-only batch is titled "Edit text of 12 elements", because `batchTitle` in `direct-edit/commit/batch.ts` belongs to pick 1. A fix there would say "Rename 12 layers".
- **`$&` on an unnamed layer.** An unnamed layer gives an empty `$&` (the class fallback such as `.card` is not a name), so the preview row is blank until you type a pattern.
- **Selection after the write.** The studio does not reselect the layers after the write, unlike the single rename.

## Files outside the pick list (no other pick owns them)

- `apps/desktop/src/ui/features/canvas/canvas-layers.tsx`: passes `renameNodes` as `onRenameMany`, and moves the action object into `toLayerActions` to keep the component under 80 lines.
- `apps/desktop/src/ui/features/versions-layers-tokens/{layers-panel.tsx,use-layers-panel-state.ts,layer-edits-types.ts}`: render the popup and the menu item, and wire the hook.
- `apps/desktop/src/ui/styles/canvas.css`: `.layers-rename-*` popup styles.
- `apps/desktop/src/server/share/direct-edit/ops/{direct-edit-rename-ops.ts (new),index.ts}`: the helper for the new `DirectEditWriter.rename` method.
- `apps/desktop/src/server/handlers/_core/all-entries.generated.ts`, `packages/common/actions/package.json` (the exports map gets `./layer/*` entries), `_core/errors/all.ts`, `_core/http-status.ts`: generated by `new:domain` and `gen-routes`.

## Notes for the merge

- I ran `pnpm run new:domain layer`, though it prints "(merge step only)". The spec gives this pick the new `actions/src/layer/**` domain.
- New UI files: `versions-layers-tokens/{rename-pattern-model.ts,use-rename-many.ts,rename-many-popup.tsx,rename-many-field.tsx,rename-many-pair.tsx,rename-many-preview.tsx}`. The spec named 3 new files. The lint rules (JSX depth 2, one component per file) made me split the popup into 4.
- `.claude/goal/roadmap.md` is not in the worktree. Add the new files above, `packages/common/actions/src/layer/**` and `apps/desktop/src/server/handlers/layer/**` to Appendix A.
- Snapshots: I did not change one. `rename_layer` is a new tool, and no snapshot tool input changed.
