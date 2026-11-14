# Cycle 33 pick 3: port-objects

Branch `feat/port-objects`, cut from main `b30747617`.

## What changed

Only `apps/desktop/src/server/agent/port-review-snapshot.ts`. Export names and signatures are unchanged, so no import line in `port-start.ts`, `port-review.ts` or `port-review-pass.ts` changed.

- **Studio object folder.** `createTree` runs `git add -A` and `write-tree` with the temp index (as before), `GIT_OBJECT_DIRECTORY=<dataDir>/port-objects/<app key>/<tree>/objects` and `GIT_ALTERNATE_OBJECT_DIRECTORIES=<app objects>`. Git reads the app objects and writes new objects only into the studio folder. The app key is a sha256 prefix of the app object folder path (`git rev-parse --git-path objects`), so a subfolder app and a linked worktree get the right object folder.
- **One env function.** `toObjectEnv` makes the env. `listTreeChanges`, `listChangedFiles`, `restoreFiles` and every later `createTree` for a snapshot use the folder of that snapshot tree, so they can read the snapshot objects.
- **Folder per snapshot.** A new snapshot writes into `pending-<uuid>`, then moves to `<tree>`. When the same tree is already there, the existing folder is kept. The folder time is set to now.
- **Cap.** After each new snapshot, the studio keeps the 6 newest tree folders per app (about the last 3 Move to app runs: the start snapshot and the values pass snapshot) and removes older ones. The app `.git` is never written.
- **Subfolder restore (found while testing).** `listTreeChanges` now uses `diff-tree --relative`. Before, keep-best restore failed in an app that is a subfolder of its repo: paths were repo-relative but `git restore` and the delete ran from the app folder. Reproduced on main code in a scratch repo (`restored false`), and fixed on the branch (`restored true`).
- A git error still returns null or false, as before.

## Speed (Bonaparte-size, read only)

`git clone --no-local --single-branch` of Bonaparte into `ds-wt/po-bp` (46,860 tracked files, 1 pack, 0 loose objects). Then 50 tracked `.ts` files changed and 200 untracked files added. `toStartTag` was timed with no model (`cycle-33/port-objects/bp-clone-timing.txt`). Each timed call ran in a new process; `git prune --expire=now` ran before each main call, and a fresh studio data folder was used for each branch call, so neither code reads objects that the other wrote. One warm-up each, then 5 interleaved pairs:

| Code | ms (5 runs) | p50 | Loose objects in the clone after |
|---|---|---|---|
| main | 732, 719, 857, 978, 708 | 732 | +400 per run (pruned between runs) |
| branch | 763, 749, 832, 900, 734 | 763 | 0 (full `count-objects -v` same before and after: 0 loose, 1 pack, 312507 KiB) |

- The branch is about 30 ms slower at p50: it writes the dirty blobs into a new empty studio folder each time.
- `port.start` waits less than 1 s for the snapshot, so `port-start.ts` is unchanged (no parallel start).
- The first timing pass in the same file is not valid for the branch: main ran between the branch passes and left 400 objects that the branch read through the alternate.
- `port.start` itself was not timed on the clone (left out, see below).

## Checked (no model, mock driver)

Fixture `ds-wt/po-next`: Next 16.4.1 and Tailwind 4.2.2 (dereferenced copy of the closure from the Bonaparte pnpm store, read only). A route copy prototype of `/patients` was made with `create_prototype_project`. Then max-width, h1 size and h1 margin were changed in it, and its title has `[port-keep] [port-bash] [port-worse]`.

| Surface | App objects before -> after | Start tag | Values pass | Keep-best |
|---|---|---|---|---|
| HTTP `POST /api/port/start`, 2 runs (`mock-http.txt`) | 14 -> 14 (full `count-objects -v` same: 0 packs) | yes | 8 values, 22 -> 80 | fix loop lowered the score; its edits were undone; kept 80 |
| MCP `start_port`, approval card answered (`mock-mcp.txt`) | 14 -> 14 | yes | 22 -> 80 | same |
| UI: Share, Move to app, Start run (`mock-ui.txt`) | 14 -> 14 | yes | 22 -> 80 | same |

- Tools in each run: `Bash` only for the write, so the studio check ran from the start tree compare (`hasRouteChange`).
- Scratch repo checks: `hasRouteChange` false then true; restore puts back changed files and removes added ones; 9 snapshots leave 6 folders.
- The low start score (22) and the odd `border-3` class come from the fixture: the route copy has `border-style: solid` on every element. This pick does not change the values pass code. The same run was not done on main.
- UI: `cycle-33/port-objects/run-note-{dark,light}.png` show the app chat after the run, with "Matches the prototype: 80%".
- `pnpm run typecheck` passes. `pnpm run build:ui` passes. `pnpm run lint:gate` passes (59605 diagnostics, baseline 89733).
- No action or tool changed, so `scripts/call-action.ts` and `gen-routes` were not needed. `start_port` is `agent: off` (run-control), so the chat agent has no path to test.

## Files outside the owned list

None.

## Left out

- The temp index copy still goes to `os.tmpdir()` (as before). It is removed after each call.
- A `pending-<uuid>` folder left by a crash is not removed by the cap. It is removed only by the call that made it.
- An older snapshot folder can be removed by the cap while a long run still needs it (more than 6 newer snapshots of the same app). Then `hasRouteChange` and restore return false, which is the old fallback.
- `port.start` to run start was not timed on the Bonaparte clone. Only `toStartTag`, the part this pick changes, was timed.
- `.claude/goal/roadmap.md` is not in the worktree, so no Appendix A globs were added.
