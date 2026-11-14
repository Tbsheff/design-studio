# Cycle 36 pick 3: flow-review

Branch `feat/flow-review`. The studio check of a Move to app flow now renders, scores and fixes every route. A single-page move of a dynamic route copy now targets the pattern route.

## What changed

- **Changed** `agent/port-start-prompt.ts`: `toFlowPrompt` writes one `<port-check>` line per flow route (up to 4, then a count line) and one instruction to call `inspect_port` for each line. `toPagePrompt` takes the check route from the caller.
- **Changed** `agent/port-flow-update.ts`:
  - `toCopyRoute` returns the pattern route and the copy-time path from the copy record.
  - A copy also remaps when its copy-time path is under the base. So a single page with route `/visits/1` maps to `/visits/[id]`.
  - Added the `listFlowCheckRoutes` and `toPatternRoute` exports. A dynamic route gets the copy-time path (`/visits/1`) as its check route, because the pattern cannot render.
- **Changed** `agent/port-route-update.ts`: the copy entry schema reads `routePath`. The file has 497 lines.
- **Changed** `agent/port-start.ts`: `startPageRun` defaults a dynamic route copy to its pattern route. `startFlowRun` passes the check routes.
- **Changed** `agent/port-review.ts`: reads every `<port-check>` tag (`matchAll`) and sets `isUpdate` per route from that page's prompt section. It adds `routes` to `PortReviewGaps` and exports `toFixLines` and `toContinueText`.
- **Added** `agent/port-review-routes.ts`. It runs when a flow has more than 1 route:
  - It checks each route in turn and runs the values pass on each updated route that needs a fix.
  - It sends one fix prompt that names every route that is under 80 or that does not render.
  - After each loop it checks every route again. The cap stays at 2 loops in total.
  - It undoes a loop when the summed score drops.
  - It writes one score per route in the note, and one record (lowest score, rendered only when all routes render).
- **Changed** `agent/port-review-pass.ts`: `runPortReview` hands a run with more than 1 route to `port-review-routes.ts`. The `sdk-driver.ts` call sites did not change.
- **Changed** UI `design-system/port-model.ts`: `toSourceRoute` shows the plan's pattern route when it matches the copy path. `toRouteUpdate` accepts the pattern as the copy route.
- **Files outside the spec list** (no other pick owns them):
  - `agent/tool-groups/port-apply-call.ts`: `apply_port` now uses the ref whose `routePath` matches the call. Before, route 2 got page 1's `path`.
  - `ui/features/design-system/use-port-form.ts`: sends the raw copy path to the plan and shows the pattern route. This prevents a plan refetch loop.

## Checks

- **Built fixture** `ds-wt/fv-next`:
  - Next 16.4.1 and Tailwind 4.2.2. The packages are clone copies (`cp -c`) of the Bonaparte pnpm store packages, which I only read.
  - Routes `/visits`, `/visits/[id]` and `/visits/[id]/edit`, with data from `app/data.ts`.
  - A prototype `fv-proto` with 3 route copies, hand links and a dark green header.
- **Passed** mock flow, HTTP (`[port-bash]` driver): the run log prompt has 3 `<port-check>` lines (`/visits`, `/visits/1`, `/visits/1/edit`). The review rendered 3 URLs, and the note has 3 scores.
- **Passed** `call-action.ts port.start` (flow) on HTTP. MCP returned "A run is in progress", because the HTTP run was still going, as in cycle 35. Agent: off (`run-control`).
- **Passed** MCP alone after the HTTP run ended (`start_port`, card approved): 3 routes, and the run prompt has 3 check lines.
- **Passed** single page over HTTP: `port.start` with `index-2.html` and route `/visits/1` returned `/visits/[id]`, updated `app/visits/[id]/page.tsx` in place, and checked `/visits/1`.
- **Passed** Start with the route the dialog sends: `port.start` with route `/visits/[id]` returned 200 and that route, and its check line has `routePath="/visits/1"`.
- **Passed** dialog: Move to app on the `/visits/1` copy shows route `/visits/[id]`, "Updates app/visits/[id]/page.tsx" and no taken-route error.
- **Passed** real run 1 (Sonnet, fresh data folder `flow-review-data-r1`; the detail prototype was changed to a 4-column grid):
  - The model called `inspect_port` for all 3 routes with the right page and path.
  - First studio scores: `/visits` 20, `/visits/1` 38, `/visits/1/edit` 49. The model had not restyled the shared header in `app/layout.tsx`.
  - 2 joint fix loops ran on all 3 routes. The final scores were `/visits` 83, `/visits/1` 85 and `/visits/1/edit` 83 (top center 79).
  - `next build` passed, and the data reads stayed.
  - The run log shows $0.31 and 39.6 s. These numbers may cover only the last segment.
- **Skipped** real run 2: the gate passed on run 1.
- **Passed** `pnpm run typecheck`, `pnpm run lint:gate` (59,612, baseline 89,733), `pnpm run build:ui` and `gen-routes --check` (no change).
- **Saved** screenshots in `cycle-36/flow-review/`: `dialog-route-{dark,light}.jpg` and `run-note-{dark,light}.jpg`.

## Left out and findings

- **Route update note covers one file.** `toRouteUpdateNotes` names only the first route file ("Updated app/visits/page.tsx (kept 1 data read)"). The 2 other routes changed too.
- **Asset folder for a dynamic single page.** A single-page move to `/visits/[id]` copies assets to `public/id/`. The folder comes from the route slug.
- **Review is sequential.** Each check renders one route at a time. A flow of 3 routes runs about 3 times as long in the first check as a single page.
- **apply_port with a pattern path.** If the model passes `/visits/[id]` to `apply_port`, the call falls back to the first ref. The prompt tells the model to pass a real path.
- **Found: route copy drops a frame.** This is the same as cycle 35: `index.html` has no canvas frame after the 3 copies.
- **Missing roadmap file.** The worktree has no `.claude/goal/roadmap.md`, so I added no Appendix A entry for `port-review-routes.ts`.
