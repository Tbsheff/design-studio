# Cycle 39, pick 4: kit-skel

## Done

- Added: `skeleton` to `KitDriftTag` and `DriftTag`.
- Added: `engine/to-skeleton-drift.ts`. It finds a `div` or `span` with `animate-pulse`, a muted or gray background and no text child. Empty block: high, with an id. Block with child elements: medium, skip `needs-parts`, so apply refuses it and the port line says "swap by hand".
- Added: own class plan. It drops the kit base classes, `animate-pulse` and the gray background. It keeps size, margin and other radius classes (`rounded-full`).
- Added: `Skeleton` to the kit lookup (`kit-inventory.ts`). No `skeleton.tsx` means no find.
- Added: HTML branch in `to-markup-drift.ts` when the pack has a `Skeleton` recipe.
- Added: panel label "loading block to Skeleton". Swap is off for medium blocks.
- Added: port and app-check kit line text, and the prototype review words.
- Changed: `list_kit_drift` description (599 chars).

## Checked

- `call-action kit-drift.list` on `ds-wt/kl-next`: 3 high with ids, 1 medium, 0 for the plain `bg-muted` block. http, mcp and agent: 0 diffs (`kit-skel/kl-list-next.txt`).
- `kit-drift.apply` with the 4 ids: 3 changed, 1 skipped `needs-parts`, one version "Swap kit components: 3 elements". Output: `<Skeleton className="h-4 w-32" />`. `next build` passes.
- App with no `skeleton.tsx` (`kl-bare`): 0 skeleton finds.
- HTML branch, engine script: 1 high, 1 medium, 0 for the text block, the kit-styled block and the plain block; 0 with no recipe (`kl-markup.txt`).
- Union grep: `COMPONENT_OF`, `COMPONENT_NAMES`, `TAG_WORDS`, `PLURAL_WORDS`. tsc forces each one. `LOOK_COMPONENT` needs no entry.
- Screenshots: `kit-skel/kl-panel-dark.png` and `kl-panel-light.png`.
- Passed: `typecheck`, `lint:gate`, `build:ui`, `check-bundle` (B1 274,703 B, delta 0), `gen-routes --check`.

## Open

- Fails (already on main, not this pick): on a newly attached app, the first apply returns "This direction has no saved version yet". MCP and agent get the same result for a button swap. The surface that runs next succeeds. So `call-action kit-drift.apply` reports an http error on a fresh project (`kl-apply.txt`).
- Not run: an in-app HTML prototype check. The engine script covers that branch.
- Missing: `.claude/goal/roadmap.md` is not in the worktree, so Appendix A is not updated.

## Files outside the pick list

- `components/kit-drift/scan-elements.ts`: scans `div` and `span` only when they have `animate-pulse`, and adds `childKind`.
- `components/kit-drift/source-files.ts`: the prefilter also accepts files that contain `animate-pulse`.
- `agent/port-review-kit.ts`: adds the loading-block line text.
- `agent/prototype-kit-review.ts`: adds the tag words.
- `ui/features/kit-drift/kit-drift-row.tsx`: adds the label and the disabled swap.
