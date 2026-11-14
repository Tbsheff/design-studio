# Cycle 37 pick 2: port-kit

The Move to app check now reads the route files that the port wrote. It flags raw markup that the app kit covers, and hand-made cards and badges. A high find is a gap, so the fix loop runs.

## What changed

- `agent/port-review-kit.ts` (new): picks the route's own page file and its folder files from the port prompt, scans them, writes the fix lines (max 6, then a count line) and the run note `Kit: N raw elements found, M left.`
- `agent/port-review.ts`: `PortCheck` has a `kit` field; `isFixNeeded` and `toFixLines` call the kit lines. `PortReviewGaps` carries the app `project`. 474 lines.
- `agent/port-review-pass.ts` (no pick owns it): `inspectRoute` runs the kit scan next to the match and render checks; `runPortReview` scans all route files before and after the review for the note. Single-page and flow ports share it; `port-review-routes.ts` is not changed.
- `components/kit-drift/kit-drift-port.ts` (new): `listDriftIn` with `getKitInventory`, plus the card and badge finds, with the import path from `getImportPath`.
- `components/kit-drift/engine/to-tsx-card-drift.ts` (new, pure): JSX `div`, `section`, `article`, `li` with the 4 card signals; `span`, `div` with the pill signals and short text. Card and Badge finds stay out of `toDriftMatches`.
- `engine/to-card-drift.ts` exports `toTokenSignals`, `SIGNAL_COUNT`. `engine/to-badge-drift.ts` exports `isPillStyled` (the pill signals live there, not in `to-badge-variant.ts`). `engine/index.ts` exports the new engine.
- `kit-inventory.ts`: `listLookEntries` finds `Card` and `Badge` apart from `KIT_NAMES`, so `list_kit_drift` output does not change.
- `scan-elements.ts`: `listTaggedElements` takes a tag set; `listRawElements` calls it with the old set.
- `components/kit-drift/index.ts`: exports `listPortKitFinds`.

No action, schema, tool text or generated file changed.

## Checks

- No model (`ds-wt/pk-loop-check.mts` on `ds-wt/pk-loop`): a ported `app/crew/page.tsx` with a raw `<button>`, a card `div` and a badge `span` gives 3 kit lines and a fix prompt (`port-kit/pk-loop-raw.txt`). After the swap to `Button`, `Card`, `Badge`: 0 lines, no fix, note `Kit: 3 raw elements found, 0 left.` (`port-kit/pk-loop-kit.txt`).
- `call-action.ts kit-drift.list` on `pk-next` (with a raw sample page): main and branch give the same item, same id. 3 surfaces, 0 diffs.
- Mock port of the crew flow (2 routes): the run note ends with `Kit: 0 raw elements found.`
- Real-model run 1 (Sonnet, fresh data folder, `ds-wt/pk-next`: Next 16, Tailwind 4, shadcn-style Button, Card, Badge, Input): 57 s, $0.26. Both route files import `Button`, `Card` and `Badge`. Scores: /crew 96, /crew/member 82. Note: `Kit: 0 raw elements found.` `next build` passes.
- Screenshots: `port-kit/run-note-dark.png`, `port-kit/run-note-light.png`.
- `pnpm run typecheck`: pass. `pnpm run lint:gate`: pass (59,624, baseline 89,733). `pnpm run build:ui`: pass.

## Left out

- Real run 2 not used: run 1 passed, so no fix was needed. The model used the kit, so no real run showed a kit find going to 0 left; the no-model script shows that path.
- Medium finds (for example a raw button whose classes differ from the kit variants) are listed but do not start the fix loop, as the spec says.
- The flow fix prompt head still says the routes "fail to render or score under 80"; a route with only kit gaps is listed under it. That text is in `port-review-routes.ts` (pick 4).
- `.claude/goal/roadmap.md` is still missing in the worktree, so Appendix A is not updated.
- Fixture `pk-next` got Tailwind 4.2.2 by a copy of the packages from the Bonaparte store (read only), not by an install.
