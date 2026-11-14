# Cycle 31 pick 1: route-tw

Branch `feat/route-tw`, cut from main `9ad35116e`.

## What changed

- **New action `port.apply`** (`apply_port`; agent `{ lean, set: "app" }`), stamped with `new:action`, `gen-routes` run. POST `/api/projects/:projectId/port/apply`, `edit`, `project.update`, `confirm: "user"`, with a `preview` card that lists the writes, `invalidates: ["port.inspect"]`.
  - It re-runs the port check with source sites on, pairs every element (not only the 8 listed), plans the writes, dry-runs each with `planDirectEdit`, and writes all of them as one `DirectEditWriter` batch (one version). It then scores again.
  - Output: `{ applied, skipped, scoreBefore, scoreAfter, versionId }`. Each `applied` item has element, property, app and prototype values, and the class written (`mb-6 (was mb-2)`). Each `skipped` item has a reason: `no-source`, `shared-site`, `dynamic-site`, `inherited`, `follows-parent`, `not-written`.
  - Rules: height is never written. Width is written only as `max-width` or `width` when the element has a `max-w-*` or fixed `w-*` class. Type values (size, leading, weight) are written only on an element with its own text or its own type class. A dry run that falls to inline style or a dynamic class is skipped. Kept text and data rows are not in pairs, so they are never written.
- **Source sites.** The pair probe can ask a new bridge global `__studioSourceLocs` (in `bridge/style-scan.ts`, using the existing `sourcesOf`) for each node's `data-studio-loc`. It also records the class list and if the node owns text.
- **Class hints.** `PortDiff` has a new `write` field (for example `mb-6, not mb-2`), filled in Tailwind apps from the app theme. The studio fix prompt and the UI "Fix differences" prompt show `margin-bottom app 8px, prototype 24px (write mb-6, not mb-2)`.
- **Values pass and keep-best** (new `agent/port-review-pass.ts`; `port-review.ts` is now 394 lines). For a route update: first check, then `apply_port` through a new `runConfirmedAgentTool` (allow gate, run scope of the app, so no second approval), then a new check. Each step takes a git tree snapshot of the app first (new `agent/port-review-snapshot.ts`). If a step lowers the score, the studio restores that snapshot and stops.
- **Run note**: `Studio check: wrote 8 prototype values (max-w-220, mb-6, text-[32px], leading-[normal], text-[15px]); port score 65 -> 95; a fix loop lowered the score; its edits were undone; kept score 95 ...`.

## Checked

Setup: `ds-wt/rf-next-tw` (Next 16.4.1, Tailwind 4.2.2, `node_modules` copied from `ds-wt/rf-new-tw`, which is a dereferenced copy). Route copy taken before the app change ("Ward list for today." and 6 rows), then the cycle-29 prototype page put in the copy, and the cycle-30 run-2 files put in the app. Studio on 7410, data in `ds-wt/route-tw-data`.

- **No-model gate** (`call-action-apply.txt`, `apply-app.diff`): HTTP passes, score **65 -> 95**. Writes `mb-6`, `text-[32px]`, `leading-[normal]` (h1), `text-[15px] leading-[normal]` (table), `leading-[normal]` (th), `max-w-220` (main). "Ward list for today." and the data rows are unchanged.
- **MCP** alone from the same start (`call-mcp-apply.txt`): 65 -> 95, the same app diff as HTTP. In the call-action run, MCP ran after HTTP, so it had nothing left to write (same limit as other write actions).
- **Agent route** reaches the confirm gate and answers "needs the user to allow it", because a script caller has no approval prompt (same as cycle 17). The studio loop calls the same action with the allow gate.
- **Keep-best, no model** (`mock-run-keep-best.txt`, on the final commit): the mock Move to app keeps the run-2 files, the values pass writes 8 values (65 -> 95), then a scripted fix loop (`[port-worse]` mock tag) lowers the score. The studio restores the snapshot. The note says so, and the app files keep the pass values.
- **Class hints** (`inspect-class-hints.txt`): `mb-6, not mb-2`, `text-[32px], not text-3xl`, `leading-[normal]`, `text-[15px], not text-base`, `max-w-220, not max-w-4xl`.
- **UI**: `run-note-{dark,light}.png` show the run note and the port check row "Matches the prototype: 95%".
- `pnpm run typecheck` passes. `pnpm run lint:gate` passes (59606, baseline 89733). `pnpm run build:ui` passes. `gen-routes --check` passes.

### Real model (local sign-in, Sonnet 5.5)

| Run | Code | First studio score | Values pass | Loops | Final | Kept text edited | Data reads | Sample rows | Time | Cost |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | main | 69 | n/a | 1 | 99 | text no; margin `mb-4` to `mb-6` | 2 | 0 | 31 s | $0.150 |
| 2 | branch | none | did not run | 0 | 99 (`inspect_port` after) | text no | 2 | 0 | 12 s | $0.050 |

- **The branch run does not test the pick.** It resumed the main run's SDK session (the app direction kept its `sessionId`), and the agent wrote both files from memory with one Bash heredoc while `render_check` ran. No edit tool reached `toolOrder`, so `toPortReviewGaps` returned null: no studio check, no values pass, `finalCheck` null. This is existing `sdk-driver` behaviour. The merged-session run must reset the app direction session before a second Move to app on the same app.
- **Main reached 99 on this fixture** after 1 loop. The cycle-30 run that scored 65 had no class guidance; this main run wrote `max-w-[880px]`, `text-[32px]`, `leading-[normal]` itself.
- **Budget:** a third, accidental real call ran on main code (a script re-ran the start). I cancelled it; it made no edit (`render_check` and `inspect_port` only), 5 s, $0.030. Files: `real-run-main/accidental-run.txt`.
- So the branch gate (80 or more through the studio pass, real model) is **not proven**. The pass has only the no-model proof above.

## Deviations

- `port.apply` input reuses the `inspect_port` fields (`projectId`, `directionId`, `path`, `routePath`, `targetProjectId`, `width`), and it computes the match again. There is no stored match to read.
- The engine writes `max-w-220`, not `max-w-[880px]`: the same 880px on the TW4 spacing scale.
- Files outside the owned list: `bridge/style-scan.ts` (new global), `mcp/{agent-call,index}.ts` (`runConfirmedAgentTool`), `handlers/port/{inspect,live}.ts`, `agent/{sdk-driver,mock-port}.ts` (imports; mock tags `[port-keep]`, `[port-worse]`), `direct-edit/index.ts` (3 exports: `decideClassEdit`, `projectTailwindTheme`, `TailwindTheme`). New: `review/port-check/{port-apply,port-apply-plan,port-class-hints}.ts`, `agent/{port-review-pass,port-review-snapshot}.ts`.

## Left out

- **Plain CSS path** (`rf-next-rt`): not built or checked. It is not known if a style edit there lands as inline JSX style.
- **Agent `apply_port` inside a Move to app run** gets `run_in_progress`, because `port.apply` is not in `TARGET_SCOPED_ACTIONS` (`agent-tools/registry.ts`, a hand aggregator). The studio loop is not affected.
- After the pass, top center stays at 75, so a loop still runs on this fixture; the spec's "0 fix loops ran" does not happen here.
- Side effect: the snapshot runs `git add -A` with a temp index, so it writes loose objects into the app repo. It changes no ref, index or stash.
- `.claude/goal/roadmap.md` is not in the worktree, so no Appendix A globs were added.
