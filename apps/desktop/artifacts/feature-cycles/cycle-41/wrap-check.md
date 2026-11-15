# Cycle 41 pick 3: wrap-check

Branch `feat/wrap-check`. Review finds a heading or paragraph that ends with 1 word on its own line, and a short button or label that wraps. The hits are kind `type` in the "Type and spacing" group and in `review_frame`. No new action, no union change, no description change.

## What changed

- **Changed** `review/type-probe.ts`: each text record has `lastLineWords`, `lastWord`, `textWrap` (`text-wrap-style`, else `text-wrap`) and `whiteSpace` (`nowrap` when `text-wrap-mode` is `nowrap`). Label texts that wrap also get `roomPx` (free width in a flex row parent of the control, else 0) and `extraPx` (width of the words below the first line). The word scan runs only on texts with 2 or more lines and walks back from the last word.
- **Added** `review/engine/type-wrap.ts` (`toWrapHits`), called from `toTypeHits` in `type-rhythm.ts`. Rules as in the spec: orphan heading (h1 to h4 or 20 px and up, fix `text-wrap: balance`, medium for h1), orphan paragraph (`p`/`li`, 3+ lines, fix `text-wrap: pretty`, max 6), wrapped control (4 words or fewer, fix `white-space: nowrap` only when `roomPx >= extraPx`, else `fix: null` with "Shorten the label or give it more room."). Max 12 wrap hits, inside `HIT_CAP` 24.
- **Changed** `review/engine/type-facts.ts`: the new `TypeText` fields.
- **Not changed**: `type-drafts.ts`. The wrap fixes send only a style. In a Tailwind app the direct-edit planner maps `text-wrap: balance` to `text-balance` and `white-space: nowrap` to `whitespace-nowrap`.
- The spec named 3 probe fields. I added `lastWord` (for the message) and `extraPx` (for the room test) as well.

## Checked in the running app

Server on port 7410, `STUDIO_AGENT=mock`, data at `ds-wt/wrap-check-data`.

| Check | Result |
|---|---|
| `wc-seed` at 390, Review panel | Passes: "Type and spacing 4", "Fix all 3". Button "Book now" wraps (Keep the label on 1 line), badge "Best value" wraps (Ask Claude, hint "Shorten the label or give it more room."), h1 last word "trip" (Balance the lines, medium), p last word "trip" (low). The h2 with `text-wrap: balance` and the clean section: 0 hits |
| `wc-seed` at 1440 | Passes: only the button and the badge (they wrap at 1440 too) |
| Fix on the h1 from the panel | Passes: 1 write, 1 version "Edit h1: text-wrap", source `style="text-wrap: balance;"`, h1 hit gone on the re-run |
| `call-action.ts direct-edit.runReview` at mobile and desktop | HTTP and MCP (`review_frame`) give the same findings. Only diff: `ranAt`. The agent surface is skipped (`legacy-agent`); the chat agent serves `review_frame` from `review/agent-tool.ts`, which passes `type` findings through with no change. `agent-tool.ts` maps `kind` and `fix` (as `directFix`). Not run with the chat agent |
| Tailwind app `ds-wt/wc-next-ws` (copy of `ac-next-b` in `web/`, one long h1) | Passes: fix writes `className="mb-4 text-4xl font-bold text-balance"`, 1 version, 0 findings on the re-run |
| Probe cost, 450-element page at 390 (50 cards, every card has wrapping text) | Old probe 5.4 to 8.1 ms, new 8.2 to 10.3 ms: about 2.7 ms more per frame |

Screenshots: `cycle-41/wrap-check/review-wrap-{dark,light}.png` (panel), `review-wrap-full-{dark,light}.png`, `review-after-fix-light.png`.

## Found, not fixed (outside this pick)

- **Fails: every Review fix in a Next app at the project root.** `keepSharedAsk` in `review/run.ts` builds the prefix `"./"` from `appDir: "."`, and no source path starts with it. So it sets `fix` to null on every finding and adds the "comes from shared code" hint. `ds-wt/wc-next` (the plain copy of `ac-next-b`) shows this. `run.ts` belongs to pick 5, so I did not change it. Fix: treat `"."` like `""`. I proved the Tailwind write in `wc-next-ws`, where `appDir` is `web`.

## Gates

Files outside the pick list: none.


`pnpm run typecheck` 0 errors. `pnpm run lint:gate` passes (59,586, baseline 89,733). `pnpm run build:ui` passes. `check-actions.ts --probes`: 557 hits, same as main. No snapshot diff (no description or input change). `.claude/goal/roadmap.md`: not in worktree.

## Left out

- No real-model run (the spec has none).
- `roomPx` reads only flex row parents (no grid, no wrapped flex rows).
- The wrapped-control rule uses the probe's broad `isLabel`, so a short nav or footer link that wraps can also be a hit.
- The spec's `wc-next` check (root Next app) fails on this branch because of the `run.ts` `appDir: "."` bug above; pick 5 or Tyler must fix it.
