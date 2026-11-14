# Cycle 26 pick 1: port-verify

Branch `feat/port-verify`, cut from `54a921252`.

## Commits

- `524526604` feat(names): cut prompt names at a clause
- `b70a474b5` feat(route-copy): label a fresh route copy App now
- `dbc393849` feat(port): studio checks a Move to app route after the run
- `a584358dd` fix(port): probe only an open Next error overlay on a fresh load
- `f682e3f42` fix(port): run the studio port check after every port run edit

## What works

- Port check: after a port run that edited, the studio runs `inspect_port` through the action runner (`runAgentTool`, the `port.inspect` handler) and a render probe of the new route. The probe reads the HTTP status, an open Next error overlay, page errors, and console errors that name the route file.
- Fix loop: a failed render, or a score or an area under 80, sends one fix loop. Then one more check reports only.
- Note: the chat note gets one line, for example "Studio port check: score 100, route renders." `finalCheck.port` holds `score`, `rendered` and `fixLoop`, and `get_run` returns it in `summary.finalCheck`.
- Skips: runs that are not `port`, lean runs, failed or stopped runs, runs with no edit, and runs with no runtime.
- Names: `nameFromPrompt` cuts at the first comma and drops a trailing with, for, and, of, to, that or which. "A patient intake summary card with allergies and meds" gives the name, title and h1 "A patient intake summary card". The suggested port route is `/a-patient-intake-summary-card`, and `get_port_plan` gives `app/a-patient-intake-summary-card/page.tsx`.
- App now: `page.importSource` labels the new frame "App now · /intake-good" in one canvas write. One `undo` removes the frame and its page.

## What the agent loop found

- `appReviewGaps` never ran on a port run. `toPortRequest` sends no `canvas`, so `ctx.target` is null. `ctx.previewUrl` is the app root, not the new route. `appReviewGaps` now also returns null for `task: "port"`. The port check builds the route url from `previewUrl` and the `routePath` in the `<port-check>` tag.
- **Open bug, not fixed (outside this pick):** in an agent run, `toScopedArgs` in `mcp/registry.ts` replaces `projectId` and `directionId` with the run project. On a port run, the agent's own `inspect_port` therefore compares the app with itself (a 404 page). It scores about 13. Real run 1 shows this: the agent got 13 and gave up, while the same route scores 84 with the right ids. `get_port_plan` in an agent run has the same problem. Until this is fixed, the agent's chat text can disagree with the studio note.
- Because of this bug, the gate departs from the spec. The studio check runs after every port run that edited, and it ignores the agent's own `inspect_port` call. The fix prompt tells the agent not to call `inspect_port`.

## Design notes

- `sdk-driver.ts` has a new `continuePort` step after `continueAppReview`. It is not inside `appReviewPass`, because the port record and its single pass do not fit the 3-pass app review. `attachFinalCheck` takes one `{ appReview, port, reference }` object.
- A new inner `resumeTurn` holds the sent, options, prior and segment code. `appReviewPass`, `continueScreenReview` (pick 5 note) and `continueReference` call it. Body lines changed from 1500 to 1491. `final-check.ts` went from 521 to 518, `mock.ts` from 1365 to 1341, and `contracts.ts` from 2625 to 2623 (`LoopStep` extends `Pick<FinalCheck, ...>`).
- The render probe reloads the page. Next 16 mounts a hidden error dialog for the hydration warning that the studio bridge causes, so the probe counts the dialog only when `data-rendered="true"`. A 502 or 503 status (the dev server is starting) is tried again, up to 5 times, 2 s apart.
- No `tsc` runs on the app.

## Files outside the ownership table

- New: `agent/port-review-read.ts`, `agent/mock-port.ts`, and `agent/mock-reference.ts` (`withMockReference` moved out of `mock.ts` and renamed `applyMockReference`).
- Changed: `agent/mock.ts`, `agent/agent-sdk-client.ts` (passes `runtime` to the mock), `main/mock-prototype-driver.ts` (skips port runs, because their prompt says "prototype"), `share/page-import/page-run.ts`, `handlers/page/import.ts`, `handlers/project/create-prototype.ts` (`appRoute: null`), and `contracts/src/port.ts` (`PortReviewRecord`).
- Pick 2 note: `import-page.ts` now takes an `ImportCopyRequest` with `appRoute`.

## Checks

Fake Next 16 app at `ds-wt/port-next-app` (a copy, not pick 2's app). Mock runs use markers in the prototype HTML: none, `[port-low]` and `[port-throw]`.

| Run | Sent | Note |
|---|---|---|
| Mock, faithful route | 1 | score 100, route renders |
| Mock, `[port-low]` | 2 | score 13, fix loop; after it score 100 |
| Mock, `[port-throw]` | 2 | score 12, fails to render (HTTP 500), fix loop; after it score 100, route renders |
| Mock, non-port edit run | 1 | no port note, no `finalCheck.port` |
| Real 1 (before the gate change) | 2 | no studio check, because the agent called `inspect_port`; the agent's score of 13 came from the scope bug |
| Real 2 | 2 | score 84 (top center 79), fix loop; after it score 87, route renders |

- Cost on a clean run: about 2 s for the check, and no model turn or tokens.
- Cost of real run 2 with a fix loop: the check started at 13.5 s and the loop started at 15.3 s. The run ended at 30.9 s, so the loop and the last check added about 16 s. The run cost $0.234 against $0.139 for real run 1 (about 3.1k output tokens each).
- `call-action.ts page.importSource`: http, mcp and agent all returned ok. The 2 diffs are new frame ids, because each surface adds a frame. No action was added.
- Ran `pnpm run typecheck`, `pnpm run lint:gate` (pass, 59607 diagnostics) and `pnpm run build:ui`. All pass.
- Screenshots (dark and light): `cycle-26/port-verify/port-check-note-*.png`, `app-now-label-*.png`. The route next to the prototype from real run 2 is `real-run-route-vs-prototype.png`.

## Left out

- The Bonaparte `get_port_plan` read check (it needs a clone and an attach).
- `.claude/goal/roadmap.md` is not in the worktree, so no Appendix A globs were added.
- The `toScopedArgs` scope bug, as described above.
