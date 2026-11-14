# Cycle 34 pick 5: polish-34

Branch `feat/polish-34`, cut from main `d274c9cff`.

## What changed

- **Steer keeps a port run going.** Cause: `applyRunFollowUp` (`http/run-follow-up.ts`) returned early for every run with a `task`, so `handle.next()` never ran for a port run (`task: "port"`). Also, the follow-up request kept only `mode`, `level`, `effort` and `canvas`, so it would have lost the port task, the port plan and the `<port-start>` tag.
  - `run-follow-up.ts`: a port run now gets a follow-up. New `toNextRequest`: for a port run, only a steer continues (a queued message after a port run is still dropped, as before); for other runs, the queue request is the same as before (moved here from `app-context.ts`).
  - `port-start.ts`: new `toPortSteerRequest` keeps the whole port request (`task`, `level`, `mode`) and adds the steer text after the port plan. The plan, the route files, the check ref and the start tag stay in the prompt, so the studio check and keep-best run as in the first run.
  - `lifecycle.ts` is not changed (1058 lines). `sdk-driver.ts` is not changed.
- **Crash snapshot folders cleaned.** `port-review-snapshot.ts`: the cap now also removes `pending-<uuid>` folders with an mtime older than 1 hour. A live pending folder lives for one `git add` (60 s timeout), so it is never removed.

## Checked (mock driver, no real model)

Fixture `ds-wt/p34-next` (Next 16.4.1, Tailwind 4.2.2, copy of the `am-next` closure). Prototype `p34-proto/index.html` with a header and a list.

| Surface | Steer at 1 s | First run | Follow-up run | Studio check |
|---|---|---|---|---|
| HTTP `POST .../runs/:runId/steer` (`steer-http.txt`) | "Keep the header as it is" | `canceled` | `completed`, `task: port`, prompt ends with the steer | score 100, route renders |
| UI: chat composer, `Mod+Enter` during the run | same | `canceled` | `completed`, same | same, "Matches the prototype: 100%" |

- Screenshots: `cycle-34/polish-34/steer-{dark,light}.png` (the app chat after the steer turn).
- Pending folders: `pending-x` with an mtime 2 hours ago was removed by the next snapshot; `pending-fresh` stayed.
- `port.start` on the Bonaparte clone (`port-start-timing.txt`): p50 494 ms on main, 477 ms and 491 ms on the branch. Under 2 s, so no blocking step is listed.
- No action or tool changed, so `scripts/call-action.ts` and `gen-routes` were not needed. `run.setSteer` is `{ off: "run-control" }` on MCP and the agent.
- `pnpm run typecheck`, `pnpm run lint:gate` and `pnpm run build:ui` pass.

## Files outside the owned list

No other pick owns these files:
- `apps/desktop/src/server/http/run-follow-up.ts` (the cause of the bug).
- `apps/desktop/src/server/http/app-context.ts` (`continueWithNext` calls `toNextRequest`; 2 fewer lines).
- `apps/desktop/src/server/agent/index.ts` (exports `toPortSteerRequest`).

## Left out

- The follow-up starts a new port session with the full plan and the steer, not a resume of the canceled session (port runs always start a fresh session, `lean-run.ts`). The chat shows the full port prompt in the steer turn.
- A message queued during a port run is still dropped when the run ends. Only a steer continues.
- The first `port.start` after a new studio data folder is slow on the clone (10.1 s on main, 2.8 s on the branch): the first snapshot runs `git add -A` over 46,860 files (`createTree` in `agent/port-review-snapshot.ts`). Later calls take about 0.5 s.
- `.claude/goal/roadmap.md` is not in the worktree, so no Appendix A globs were added.
