# Cycle 40 pick 3: align-check

Branch `feat/align-check`. Review has a new kind, `align` ("Alignment and gaps"). It finds an edge that is 1 to 3 px off the edge most siblings share, and a list or row whose gaps differ by 1 to 4 px from the common gap. A direct fix is given only when the element's own margin causes the miss.

## What changed

- **Added** `align` to `REVIEW_KINDS` (after `type`) and `REVIEW_KIND_LABEL` ("Alignment and gaps") in `contracts/src/review.ts`.
- **Added** `review/align-probe.ts`: one in-page expression (a `String.raw` source, same `selectorOf` as `probe.ts`). For each container with 2 to 24 kept element children, it sends the child rects, margins, `align-self`, and the parent `display`, `flex-direction` and `align-items`. It skips absolute, fixed, transformed, hidden, `inline` and `contents` children and boxes under 8 px. Max 400 children.
- **Added** the pure engine `review/engine/align.ts` (`toAlignHits`), split with `align-lines.ts` (line and band detection, modes, margin fix) and `align-gap.ts` (uneven gaps), so each file stays under 500 lines.
  - A line is a column (each child under the one before) or a flex or grid row band (wrapped rows are split into bands).
  - The parent `align-items` picks the edge to compare: center, start, end, or start and end for stretch. A block parent compares left edges only. A child whose start and end offsets cancel (a narrower centered child) is skipped.
  - An edge hit needs 3 or more children and a majority within 0.5 px. A gap hit needs 4 or more children with the same tag and width and height within 10 percent.
  - The engine returns max 12 hits per frame. Severity is low, and medium when the frame has 3 or more hits.
- **Added** `review/align-drafts.ts`: hit to `Draft`, with a `margin-*` style edit on the element that owns the margin.
- **Changed** `review/run.ts`: the probe runs in the same `Promise.all` as the type and interaction probes, and the fix-target selectors go into the element probe. `import/max-dependencies` is 20 there, so the type probe expression moved into `type-drafts.ts` (`toTypeExpression`), the same pattern that `interaction-drafts.ts` uses.
- **Changed** the `review_frame` description in `actions/src/direct-edit/run-review.ts` (533 chars) and both `review_frame` texts in `agent/tool-help.ts`.
- **Not changed**: `review/checks.ts`, the UI. The panel group comes from `REVIEW_KINDS` and `REVIEW_KIND_LABEL`. The run-end fix loop does not call `runReview`, so runs keep their speed.

Files outside the pick list (no other pick owns them): new `review/align-drafts.ts`, new `review/engine/{align-lines.ts,align-gap.ts}`, `review/type-drafts.ts` (the moved type probe expression).

## Checked in the running app

Server on port 7340, `STUDIO_AGENT=mock`, data at `ds-wt/align-check-data`. HTML fixture `ds-wt/ag-seed/index.html`: a flex row of 4 cards where card 3 has `margin-top: 2px`, a list with `margin-bottom` 24, 24, 21, a flex-column form where one label has `position: relative; left: 1px`, and a clean section (3 cards and a 4-item list).

| Check | Result |
|---|---|
| Review panel, "Alignment and gaps" group | Passes: 3 hits, medium. "This card is 2 px lower than the 3 cards beside it." (Set margin-top to 0px), "The gaps in this list are 24, 24 and 21 px. Use one gap." (Set margin-bottom to 24px), "The left edge of this label is 1 px further right than the left edges of the 5 elements in this column." (Ask Claude) |
| Clean section | Passes: 0 hits |
| Fix on card 3 | Passes: 1 version ("Edit div: margin-top"), the card hit is gone on the re-run, 2 hits left (now low) |
| `call-action.ts direct-edit.runReview` | HTTP and MCP (`review_frame`) give the same 3 align findings. The only diff is `ranAt`. The agent surface is skipped: the action is `agent: { off: "legacy-agent" }`, and the chat agent serves `review_frame` from `review/agent-tool.ts`, which maps the new findings with no change |
| Probe cost, 406-element page (20 flex rows of 19 cards, 400 children) | In-page probe 2.7 to 4.1 ms, probe and engine with the round trip 19 to 27 ms. Under the 80 ms budget |

Screenshots: `cycle-40/align-check/review-align-{dark,light}.png` (panel) and `review-align-group-{dark,light}.png` (group).

## Gates

`pnpm run typecheck` 0 errors. `pnpm run typecheck:tsrs` passes. `pnpm run lint:gate` passes (59,625, baseline 89,733). `pnpm run build:ui` passes. `check-bundle` passes, B1 274,703 B, delta 0. `gen-routes.ts --check` passes. `check-actions.ts --probes`: 286 hits on the branch and on main (`f385e4372`), no new hit.

N12 union grep: `REVIEW_KIND_LABEL` (got the entry), `review-model.ts` line 39 and `run.ts` (both iterate `REVIEW_KINDS`), `review-group.tsx` (reads the label). No `switch` over the kind.

## Snapshots

Not refreshed (Tyler decides). The `review_frame` description changed. `mcp-snapshot.ts --all --check` names `review_frame` as changed in `direct-edit-component.json`. The spec also names `design-system.json` and `direct-edit-element.json`, which hold `review_frame` too. The check reports other differences in many groups that this branch does not touch.

## Left out

- The Review entry tooltip ("Check contrast, tap targets, alt text, tokens and clipping") does not name alignment. It is in `review-entry-button.tsx`, outside the pick list.
- No check for gaps in grids with more than one row, or for edges in rows of a block parent (inline-block children align on the baseline).
- No real-model run (the spec has none).
