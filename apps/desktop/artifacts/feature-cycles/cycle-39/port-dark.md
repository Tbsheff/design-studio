# Cycle 39 pick 1: port-dark

Branch `feat/port-dark`. Each Move to app port review pass now checks the route in dark. Dark items count as gaps for the fix loop. No new action. No schema change.

## What works

- **Check.** `inspectRoute` (`agent/port-review-pass.ts`) runs a 4th check, `dark`, beside match, render and kit. The new `agent/port-review-dark.ts` calls `inspectAppDark` (`app-review-dark.ts`) with the route URL and the route files: the page file and its route folder files (`listScanFiles` from `port-review-kit.ts`).
- **Changed lines.**
  - New route: every line counts (`lines: null`).
  - Route update: in the page file, only the lines that changed against the `route-file-now` text in the prompt count (`changedLineRanges`). The gaps carry this text as `before`. Route folder files have no before text, so all of their lines count.
- **No dark values.** `PortCheck.dark` is `null`, the log says `[agent] app dark check: no dark values, so no dark render`, and the note says "Dark: not checked (the app has no dark values)". A failed render says "Dark: not checked (no dark render)".
- **Fix loop.** `isFixNeeded` includes `hasDarkGap`. The fix prompt gets the `AppDarkCheck.lines` (max 6, then a count line), with the same text as the app check. The keep rule (`isKitTrade`, and `isLowerSet` for flows) counts high kit finds plus dark items through `toGapCount`. The pass cap does not change.
- **Note.** The dark text is part of `toCheckText`, so the run note shows it before and after the loops. Example: "Studio port check: score 36 (top left 37 under 80), route renders; Dark: 1 item under AA (app/pay/page.tsx line 4, 1.4:1), 2 fix loops ran; after it score 37 (...), route renders; Dark: 0 items under AA. Kit: 0 raw elements found." Flow notes add the dark text to each route score.
- **Cost.** One dark render per route per pass, in parallel with the other 3 checks. Measured: 3,141 ms on the first render (Next compile), 1,015 to 1,141 ms after that.

## Checked

- **Mock run, UI path** (`STUDIO_AGENT=mock`, port 6772, `port-dark-data`, `ds-wt/pd-proto` into `ds-wt/pd-next` at `/pay`). The new mock tag `[port-dark]` writes a label in `text-[#1a2a4a]`; its fix loop writes `text-foreground`.
  - **Passed:** pass 1 gave 1 dark line (line 4, 1.4:1) and a fix prompt with it. After the fix: 0 items, and the second fix prompt has no dark line.
  - **Passed:** `ds-wt/pd-light` (no `.dark` block): "Dark: not checked (the app has no dark values)" and the log line on each pass.
- **Mock flow run.** **Passed:** a 2-page flow onto `/pay-flow`. The "Studio port check of 2 routes" note shows `Dark: 1 item under AA (app/pay-flow/page.tsx line 4, 1.4:1)` on the first route, and `Dark: 0 items under AA` after the fix loop. The fix prompt has the dark line. The second route gave HTTP 404, because the mock agent writes only the first route file (this is old mock behaviour).
- **MCP path.** **Passed:** `start_port` onto `/pay-mcp`, then `get_run`. The note is the same as for the UI run.
- **Real-model runs** (Sonnet 5.5, fresh data folders, `pd-proto-real` into fresh copies `pd-next-rm` and `pd-next-rb`):

  | Run | Time | Cost | Loops | Dark at end | `next build` |
  |---|---|---|---|---|---|
  | main | 14.3 s (18.8 s wall) | $0.099 | 0 | not checked (no dark check on main) | passes |
  | branch | 14.4 s (18.4 s wall) | $0.103 | 0 | 0 items | passes |

  Both models wrote token classes (`text-primary`, `text-foreground`), so main shipped no dark item either. Only the mock run proves the dark fix loop. Added time on the branch: 1,015 ms for the dark render, run in parallel with the match check.
- **`call-action.ts`:** not run. This pick adds no action.
- **Screenshots:** `cycle-39/port-dark/run-note-{dark,light}.png` (the mock run note in the chat).
- **Gates:** `pnpm run typecheck` passes. `pnpm run lint:gate` passes (59,616, baseline 89,733). `pnpm run build:ui` passes.

## Files outside the pick list

- `agent/port-review-routes.ts` (in the list, 493 lines): the flow fix prompt now says "fail to render, score under 80, or have kit or dark gaps".
- `agent/mock-port.ts`: the `[port-dark]` tag for the no-model check (495 lines).
- `agent/port-review-kit.ts`: exports `listScanFiles`.
- `agent/app-review-dark.ts`: exports `hasAppDarkValues` (the export word only).

## Left out

- **Route-update changed lines** are not proven in a run. A route copy is needed for an update port, and no run made one.
- **Old code in route folder files on an update.** An existing folder component with a raw color counts as a dark gap, so it can open a fix loop on old code. A fix needs the start version of each folder file (from the `port-start` tree).
- **Real-run proof of the fix loop.** Neither model wrote a raw color.
- **`PortReviewRecord`** has no dark count. The record schema did not change.
