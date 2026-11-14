# Cycle 37 pick 4: flow-fast

Branch `feat/flow-fast`. Flow route checks run at the same time, the flow prompt writes the route rules once, and the routes note says why the fix loop stopped.

## What changed

- **Added** `agent/port-rule-lines.ts`: `RULE_LINES` moved here, so `port-route-update.ts` shrank from 497 to 490 lines.
- **Changed** `agent/port-route-update.ts`: `toUpdateTag(update, rules)` takes the rule lines. Single-page prompts pass `RULE_LINES`, so they keep the rules in the block.
- **Changed** `agent/port-flow-update.ts`: flow blocks get no rules. `toFlowUpdateLead` writes "Rules for every route-update block below:" and the 8 lines once, under the flow header. The short block (4th route and later) drops its copy of rule 1.
- **Changed** `agent/port-review-routes.ts` (481 lines):
  - `listRouteChecks` runs at most 3 route checks at once (`ROUTES_AT_ONCE`) through one helper (`listLimited`). The output stays in route order.
  - A route whose parallel check has no score gets 1 more check, alone, after the set.
  - Values passes run 1 at a time, not 3. A pass undo restores the whole work tree (`restoreRouteSnapshot`), so 2 passes at once would undo each other's writes. Each pass still runs after its route's check.
  - When a route or area stays under 80, the note adds why: "stopped after 2 fix loops", "stopped at the time limit", "stopped because the fix loop did not raise the scores" or "stopped because the fix prompt did not run". No third loop.
- **Changed** no other files. `port-review.ts`, `port-start-prompt.ts` and the actions are as on main.

## Checks

- **Built fixture** `ds-wt/fl-next`: Next 16.4.1, with plain CSS and no Tailwind (`fv-next` is gone). It has the routes `/visits`, `/visits/[id]` and `/visits/[id]/edit`, with data from `app/data.ts`. The packages are clone copies (`cp -c`) of Bonaparte pnpm store packages, which I only read. The prototype has 3 route copies, hand links and a dark green header.
- **Passed** no model, HTTP: `port.start` with `flow: true`. The run prompt has the rule lines 1 time, 3 `route-update` blocks and 3 `<port-check>` lines.
- **Passed** MCP: `start_port` (flow), after the HTTP run ended. It gave the same prompt counts and a note with 3 scores.
- **Passed** `call-action.ts port.start`: HTTP ok. MCP returned "A run is in progress", because the HTTP run was still going, as in cycle 36. Agent: off (`run-control`).
- **Passed** single page: `port.start` on `index-2.html` gives 1 block, with the rules inside it.
- **Passed** stop reason, mock `[port-bash]`: "...; stopped because the fix loop did not raise the scores."
- **Timed** first check of 3 routes, mock `[port-bash]` driver. "Main" is the branch with the limit set to 1, which runs the same serial loop as main.

  | Limit | Runs | p50 | Range |
  |---|---|---|---|
  | 1 (main) | 5 | 3.37 s | 3.15 to 4.76 s |
  | 3 (branch) | 5 | 2.70 s | 2.61 to 3.74 s |
  | 3 (branch, with re-check) | 6 | 2.79 s | 2.58 to 4.95 s |

  The first check is about 20% faster, not 3 times. The preview work does not scale with the route count.
- **Found and fixed** parallel check failures: in 2 of 5 runs, one route had no score. The server log showed `page.evaluate: Target page, context or browser has been closed` and `Page.captureScreenshot: Unable to capture screenshot`. With limit 1, 4 runs gave 0 errors. The re-check fixed every case: 6 runs with 3 re-checks, and 0 routes with no score. The scores are the same with limit 1 and limit 3.
- **Passed** real run (Sonnet, fresh data folder `flow-fast-data-r1`, Move to app of the flow onto `fl-next`):
  - First studio scores: `/visits` 82 (top center 76 under 80), `/visits/1` 100, `/visits/1/edit` 100. The first check took 3.6 s.
  - 1 fix loop ran. After it, all 3 routes scored 100, so no stop reason was needed.
  - The model changed only `app/globals.css` (header). `next build` passes, and the data reads stay.
  - Run: 43.5 s from start to finish, $0.17, 2 prompts. The first prompt has 27,755 characters. On main, the 3 full blocks would hold 2 more copies of the rules (about 2,060 more characters).
  - Cycle 36 flow-review: 39.6 s and $0.31, on a different fixture and design change, so this comparison is only approximate.
- **Passed** `pnpm run typecheck`, `pnpm run lint:gate` (59,624, baseline 89,733), `pnpm run build:ui` and `gen-routes --check` (no change).
- **Saved** screenshots of the run note in `cycle-37/flow-fast/`: `run-note-dark.jpg` and `run-note-light.jpg`.

## Left out and findings

- **Root cause of the parallel preview errors.** It is in the preview page pool or the render backend (`preview/page-pool.ts`, `render-playwright.ts`), which this pick does not own. The re-check hides the error but costs one extra check when it happens.
- **Values passes stay serial.** See above. The spec asked for the shared limit of 3.
- **Real-run stop reason.** All routes reached 80, so the real run did not show a stop reason. The mock run shows it.
- **Missing roadmap file.** The worktree still has no `.claude/goal/roadmap.md`, so I added no Appendix A entry for `port-rule-lines.ts`.
