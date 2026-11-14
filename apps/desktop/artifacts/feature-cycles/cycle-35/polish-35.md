# Cycle 35 pick 5: polish-35

Branch `feat/polish-35`, cut from main `2197e34d9`.

## What changed

- **Queued message runs after a port run.** `toNextRequest` (`http/run-follow-up.ts`) returned `null` for a port run that ended with a queue. Now it builds a port follow-up with `toPortQueueRequest`: the whole port request (`task`, `level`, `mode`, plan, check ref, start tag) plus "The user sent this during the Move to app run. Apply it to the same routes:" and the queue text. A steer still uses `toPortSteerRequest`.
  - Most queued messages already reach a port run mid-run: the inbox delivers them at the next tool end (`run.user`, then "Noted"). Only a message queued after the last tool call was dropped. That case now runs as a follow-up.
  - The follow-up keeps the first run's `<port-start tree>`. Only `toPortGaps` reads it, through `hasRouteChange`, which compares and never restores. Restores use the snapshot `runWithSnapshot` makes inside the follow-up. So a restore in the follow-up cannot undo the first run.
- **First `port.start` speed: no code change.** See "Checked" and "Left out".

## Checked (mock driver, no real model)

Fake app `ds-wt/p35-next` (git repo, `node_modules/.bin/next` is a small fake dev server that renders `app/<route>/page.tsx`). Prototype `ds-wt/p35-proto/index.html`.

| Surface | Queue | First run | Follow-up run | Studio check |
|---|---|---|---|---|
| HTTP `PUT .../runs/:runId/queue` after the last tool (`queue-http.txt`) | "Keep the header as it is" | `completed` | `completed`, `task: port`, prompt ends with the queue text | ran: render check, fix loop, score 6 (fake renderer) |
| UI: chat composer, Enter after the last tool (`RESP PUT .../queue 200`) | same | `completed` | `completed`, same | same |

- Screenshots: `cycle-35/polish-35/queue-{dark,light}.png` (the follow-up turn with the queued text, and its result).
- `port.start` first call on the Bonaparte clone `ds-wt/po-bp` (`port-start-timing.txt`): 5 fresh data folders, p50 2553 ms (2354 to 2784); later calls p50 about 450 ms. The port.start path is the same code on main and the branch.
  - Split with temporary logs: `createTree` 366 to 511 ms (add 290 to 400, write-tree 57 to 99), first app version save in `holdEditsForFirstVersion` 1662 ms, asset copy and look 332 to 476 ms.
  - Fix 1 (`update-index --refresh`) and fix 2 (`core.untrackedCache`, `index.threads`) gave no gain at the git level (add 332 to 429 ms against 337 to 372 ms plain).
- No action or tool changed, so `call-action.ts` and `gen-routes` were not needed. `run.setQueue` is `{ off: "run-control" }` on MCP and the agent.
- `pnpm run typecheck`, `pnpm run lint:gate` and `pnpm run build:ui` pass.

## Files outside the owned list

None. Only `apps/desktop/src/server/http/run-follow-up.ts` changed.

## Left out

- **First `port.start` under 2 s.** The cost is the first app version save, not `createTree`. It runs on the first edit of an attached app (commit `75f3445e2` moved it there from attach), in `store/version-seed.ts` and `commitInit`. No pick owns those files. None of the 3 listed fixes reaches 2 s:
  - Fixes 1 and 2: no gain, measured.
  - Fix 3 (snapshot at link time): saves about 0.4 s at most, and the snapshot goes stale. A restore would then delete or revert edits the user made between link and start.
  - Tried and dropped: starting the first version at the top of `port.start`, in parallel with the snapshot. One sample was 2084 ms, inside the spread of the old code, and it let the version save race the asset copy into the work tree.
- The restore check for a file outside the route folder was not run: no snapshot code changed.
- The follow-up turn shows the full port prompt in the chat, as the steer turn does (polish-34).
- `.claude/goal/roadmap.md` is not in the worktree, so no Appendix A globs were added.
