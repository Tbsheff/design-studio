# Cycle 39 pick 2: kit-swap

Branch `feat/kit-swap`. Fake app `ds-wt/ks-next` (copy of `ac-next-b`, route `app/status/page.tsx`, Badge with a `destructive` variant).

## What works

- Gives hand-styled TSX cards and pills a `DriftMatch` with an id in `listDriftIn`. List, apply and the port and app-check kit lines read them from one scan.
- Reads the Card base from the `Card` declaration only, not every string in `card.tsx`. Kept `p-6` (CardHeader also has `p-6`).
- Sets the Badge variant with `toBadgeVariant`. Drops the hand tone colors only when the kit has that variant (`bg-red-100` to `destructive`); keeps them when it falls back to `default` (emerald).
- Skips: 2 padded block children gives `needs-parts` (list shows `parts: [CardHeader, CardContent]`), `{...props}` gives `spread-props`, `ref` gives `dynamic-tag`, an `li` card gives `needs-parts`. Skipped finds are `medium`, so Swap all leaves them; the port lines give them a null id.
- Swaps the tag names, keeps the children, keeps only the kept classes, adds the import, as one version.
- Adds "and hand-styled cards and badges in app TSX" to the `list_kit_drift` description (546 chars).

## Checked

- `call-action.ts kit-drift.list`: pass, 3 surfaces, 0 diffs (`call-list.txt`).
- `call-action.ts kit-drift.apply` with 5 ids: MCP changed the 3 ids, skipped `spread-props` and `needs-parts`, one version. The agent surface then gives `not-found` (ids gone). HTTP failed first with "no saved version yet" on the fresh attach, the same as pick 4's run (`call-apply.txt`).
- `next build` on the swapped page: pass.
- Undo (edit-history undo, then Cmd+Z in the UI after a UI Swap): file restored.
- Panel: Swap on every row, dark and light (`kit-swap/kit-panel-*.png`).
- `pnpm run typecheck`, `pnpm run lint:gate`, `pnpm run build:ui`, `gen-routes --check`: pass.

## Files

- New: `kit-drift/kit-drift-look.ts` (look inventory, declaration base reader, look scan cache), `kit-drift/engine/to-tsx-look-plan.ts`.
- Changed: `kit-drift-scan.ts`, `kit-drift-list.ts`, `kit-drift-apply.ts`, `kit-drift-port.ts` (removed `listFileLooks`, `listLookFinds`, `LOOK_COMPONENT`; `LOOK_COMPONENT` now lives in the engine plan file), `engine/to-tsx-card-drift.ts` (find carries its element), `engine/index.ts`, `actions/src/kit-drift/list.ts`.
- Not touched: `kit-inventory.ts`, `schema.ts`, `to-drift-matches.ts`, `to-drift-splices.ts` (the rename splice already keeps children).

## Left out

- A skip reason in the list output: the schema (pick 4) has no field, so the list keeps a string id and apply reports the reason.
- Card parts split (runner-up 3).
- `.claude/goal/roadmap.md` is missing in the worktree, so Appendix A is not updated.
- The panel empty text still says "button, input and label" (`ui/features/kit-drift/copy.ts` is pick 4's).
