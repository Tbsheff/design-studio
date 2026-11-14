# Cycle 40, pick 1: polish-40

Branch `feat/polish-40`. Mock server on port 6910 (MCP on 6920), data at `ds-wt/polish-40-data`. Fixtures: `ds-wt/p40-kit` (copy of `ac-next-b` with `components/ui/skeleton.tsx` and `app/loading/page.tsx` with 3 pulse blocks), copies `p40-kit-a` to `p40-kit-h`, and the HTML project `p40-z` (card with an absolute badge and a photo, 2 overlapping avatars).

## Done

- **First-version wait.**
  - Moved: the job registry from `app/first-version.ts` to new `store/first-version-jobs.ts`, exported from `store/index.ts`. A moved function gets a verb name: `toFirstVersionState`, `toFirstVersionWaitText`, `toFirstVersionEstimateMs`, `isFirstVersionDone` (was `waitForFirstVersion`). Callers import from `store/index.ts`. No shim.
  - Added: `isFirstVersionWrite(action)` in `store/first-version-jobs.ts`: a write with `scope: "project"`, `needs: "project.update"`, and a `/d/:directionId/` path or an `invalidates` entry `version.list` or `direct-edit.getTree`. The runner and the HTTP hold share it.
  - Added: `ProjectAccess.ready(projectId)`. `run-action.ts` calls it after `checkScope` for a held write whose decoded input has `directionId`. It waits while a first-version job runs (max 20 s), then fails with `Conflict` and the wait text. With no job it returns at once.
  - Changed: the HTTP hold now mounts on `/api/projects/:pid/*`, so `kit-drift.apply` (`POST /api/projects/:projectId/kit-drift/apply`) starts and waits for the first version.
  - Held ids: 97 (`polish-40/p40-held.txt`). `kit-drift.apply` and `stacking.set` are held. `canvas.setPresence`, `comment.insert`, `canvas.createFrame`, `canvas.updateFrame`, `canvas.setPoint` and `canvas.setFrameHeights` are not. `canvas.createLinkedFrame`, `canvas.createPageFrames` and `canvas.importFrame` are held, because they save a version.
- **call-action reset.** New `scripts/stamp/call-reset.ts`. For a write with a `directionId` (path or input) and a `projectId`, it reads the undo count before the first surface, and after each surface it calls undo until the count is back (max 3). It prints "reset: 1 undo" per surface. When the undo fails, it skips the next surfaces and prints a `fix:` line. `diffOutcomes` ignores `versionId` (pending or 40-hex) and a `title` with a time, through one `PER_CALL_FIELDS` map in `stamp/call-report.ts`.
- **check:scripts part fix.** Lowered `home-routes.ts` 17 to 15 and removed `port-routes.ts` 1 in `check-actions-baseline.json`. W7: `rule-proposal-file.ts` and `library-draft-reuse.ts` decode with `toDecoder`. O6: `image-search.apply` 594 chars, `project.createPrototype` 587 chars. O7: `state-style.setForced` short 148 chars.
- **1 undo step for a multi-select z-key.** `stacking.set` takes `others` (max 20, default `[]`; each item is `target`, `zIndex`, `position`). New `share/stacking/set-layers.ts` groups the edits by file, patches them last-to-first in the source, and commits all files through one `commitBreakpointStyle` call: 1 version, 1 history step. Title: "Stacking: z-index 1 on 2 layers". `use-stacking-keys.ts` plans each selected layer from one stack read and sends 1 call (`writeZOrder` in `stacking-api.ts`).

## Checked

| Check | Result |
|---|---|
| HTTP `kit-drift.apply` on a new app (`k3BD2GzTvx`), head `null`, before the HTTP hold change | Fails: 400 "This direction has no saved version yet" |
| Same call after the change | Passes: 200 in 454 ms (first version saved). Next call 32 ms |
| Kit drift panel, first Swap on a new app, dark (`p40-kit-g`) and light (`p40-kit-h`) | Passes: apply 200, 4 rows go to 3, head set. `kit-drift-first-swap-{dark,light}.png` |
| MCP `apply_kit_drift` at once after attach (`p40-first-kit-mcp.txt`) | Passes: 192 ms, then 51 ms |
| MCP `set_stacking` at once after attach (`p40-first-stacking-mcp.txt`) | Passes: 313 ms, then 51 ms |
| HTTP apply that starts the job, plus the agent tool route 30 ms later (`p40-race.txt`) | Passes: both 200. The agent call waits in the runner (239 ms) |
| `call-action.ts stacking.set` on `p40-kit-f` | Passes: 3 surfaces ok, 0 diffs, "reset: 1 undo" per surface, source sha equal before and after (`call-action-stacking-set.txt`) |
| `call-action.ts kit-drift.apply` with 2 ids on `p40-kit-f` | Passes: 3 surfaces ok, 0 diffs, same changed ids on each surface (the reset keeps the drift ids), source sha equal (`call-action-kit-drift-apply.txt`) |
| `p40-z`: photo and second avatar selected, `Mod+[` (`p40-z-run.txt`) | Passes: 1 `set_stacking` call with 1 item in `others`, 1 history step. The first avatar paints on top. 1 Cmd+Z restores both layers and the old paint order |
| `check-actions.ts --probes` | 557 hits (main 560), baseline 407 (main 410). W7, O6 and O7 are gone. No new rule; S11 stays 194 |
| `pnpm run typecheck` | Passes |
| `pnpm run lint:gate` | Passes: 59,582 (baseline 89,733) |
| `pnpm run build:ui`, `check-bundle` | Passes: B1 274,703 B, delta 0 |
| `gen-routes.ts --check` | Passes |

## Differences from the spec

- **Attach does not start the first version.** Commit `75f3445e2` moved the save to the first edit. So a wait alone in `ProjectAccess.ready` (a read service) fixes nothing when no job runs. I kept `ready` for an in-flight job, and kept `first-version-routes.ts` (not deleted). It now holds every `isFirstVersionWrite` path, also outside `/d/`, and starts the job.
- **MCP already worked on main.** `runActionEdit` (`mcp/run-edit.ts`) starts and waits for every `{ name }` edit tool. The cycle-39 failure was HTTP only.
- **`canvas.setPresence` has `directionId`** (`PresenceFields`). The "has a `directionId` key" rule alone held it and 6 frame actions. The shared rule also needs a `/d/` path or a version or tree read in `invalidates`.
- **Edit session (`version.createSession`).** It squashes the versions since a base into 1, but it ends the user's own open edit session too. So I used the `others` list.
- **O11 stays.** `connection.getSetup` must return `token`: `share-publish-ship-export/connect-ai-model.ts` builds the `Bearer` connect snippet from it, and the action is `mcp` and `agent` `off: "secret"`.

## Snapshots

Not edited. `mcp-snapshot.ts --all --check` fails on this branch in 9 groups (`mcp-snapshot-check.txt`). Most of those diffs are in tools this pick does not touch. `set_forced_state` in `direct-edit-element.json` is in the diff list; I did not prove if it comes from this pick (only the agent `short` changed). `apply_image_search`, `create_prototype_project` and `set_stacking` are in no snapshot.

## Open (for Tyler)

`check:scripts` still fails at step 5, `check-actions.ts --probes`:
- Text scan: 557 hits against baseline 407. S11 194 and E1 25, in files changed after the baseline commit `41d7868a5`, plus the 7 files with no commit after 2026-11-08 (origin not traced in this pick).
- Ops catalog: O12 52 (array output with no limit), E16 6 (`run.get`, `run.start`, `run.stop`, `variation.start`, `version.restoreHistory`, `project.createPrototype` in a legacy list), O11 1 (must stay, see above).
- One decision: accept these hits with a baseline update, or burn them down by rule.

Also open:
- The agent tool route (mock only) does not start the first version. Real chat runs hold before the run starts (`app-runs-routes.ts`).
- `.claude/goal/roadmap.md` is not in the worktree, so Appendix A is not updated. New files: `store/first-version-jobs.ts`, `share/stacking/set-layers.ts`, `scripts/stamp/call-reset.ts`.

## Files outside the pick list

No other pick owns these: `app/dev-server-ops.ts`, `mcp/run-edit.ts`, `http/edit-history-routes.ts`, `preview/frame-source.ts` (registry import moves), `share/stacking/{deps.ts,stacking-run.ts}`, new `share/stacking/set-layers.ts`, `ui/features/stacking/stacking-api.ts`, new `scripts/stamp/call-reset.ts`.
