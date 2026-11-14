# Cycle 35 pick 1: flow-update

Branch `feat/flow-update`. Move to app of a flow now updates existing app routes in place. It does not refuse them.

## What changed

- **Added** `agent/port-flow-update.ts`:
  - `toFlowUpdatePlan` runs `buildFlowPlan`, then remaps each flow page that is a route copy of this app (from `.studio/route-source.json`) onto its source route. A copy route must be under the base path. Dynamic routes work (`/visits/[id]`), and the link map moves with the page.
  - `listFlowRouteBlocks` builds one `route-update` block per existing route. The first 3 are full. After that, a block sends only the file name and the diff.
  - `toFlowUpdateLead` writes the "These route files exist in the app. Update them in place." lines.
  - The fixture flow could not work without the remap: `flowRoutes` gives `/visits/index-2`, which never matches `/visits/[id]`.
- **Changed** `port-start.ts`: `startFlowRun` no longer throws Conflict on a taken route. Removed `toTakenText`.
- **Changed** `port-start-prompt.ts`: `toFlowPrompt` names the updated and the new files, puts the lead after `<port-flow>`, and puts each block after its page's `<port-plan>`.
- **Changed** `port-route-update.ts`: split out the per-page builder (`toUpdateOf`) and exported helpers. A flow page that is not a copy gets a block with no snapshot instead of a Conflict. The file has 496 lines.
- **Files outside the spec list** (no pick owns them):
  - `agent/index.ts`: added the `toFlowUpdatePlan` export and dropped `buildFlowPlan`.
  - `http/port-routes.ts`: `planPort` uses the same plan, so the dialog and `get_port_plan` show the remapped routes.
  - `handlers/port/start.ts`: the MCP preview no longer refuses a flow.
  - UI `design-system/{port-model.ts,port-form-foot.tsx,port-page-row.tsx,copy.ts}`, `styles/port-flow.css`: no taken-route error for flows. Each row shows "Updates `<file>`" in neutral color, and the foot says "Updates 3 route files in place in fu-next."
- **Kept** `Conflict` in `port.start` errors: a run in progress and a single page onto a route that is not its copy still throw it. The input did not change.

## Prompt length (fu-next, mock run log)

| Pages (all existing) | Prompt chars | route-update blocks |
|---|---|---|
| 1 (page run) | 12,418 | 1 |
| 2 | 23,666 | 2 |
| 3 | 35,541 | 3 |
| 4 | 42,206 | 4 (1 diff-only) |

## Checks

- **Built fixture** `ds-wt/fu-next`: Next 16.4.1 and Tailwind 4.2.2 (a clone copy of the Bonaparte pnpm store closure, read only), routes `/visits`, `/visits/[id]`, `/visits/[id]/edit` and `/visits/new`.
- **Built prototype** with 3 route copies (`create_prototype_project` with `intoProjectId`), hand links and a teal header redesign.
- **Passed** plan read (`GET /api/port/plan`, flow): the 3 pages give `/visits`, `/visits/[id]` and `/visits/[id]/edit`, each with `routeExists: true`. With base `/visits-v2`, all 3 stay new routes.
- **Main refuses**: `startFlowRun` on main throws `ConflictError("The app already has ... Pick a new base path.")`. I read this in the code and did not run main.
- **Passed** `call-action.ts port.start`:
  - HTTP returned a run id and 3 routes.
  - MCP passed the approval card, then got "A run is in progress" because the HTTP run was still going.
  - MCP alone (`start_port`, card approved) returned a run id and 3 routes.
  - Agent: off (`run-control`).
- **Real run 1** (Sonnet, fresh data folder, started from the dialog's Start run):
  - All 3 route files changed in place, with no new route folder.
  - `listVisits`, `getVisit` and `params` reads stayed.
  - Links go to `/visits/${visit.id}` and `/visits/${visit.id}/edit`.
  - `next build` passed.
  - `inspect_port` scores: `/visits` 82, `/visits/1` 100, `/visits/1/edit` 99.
- **Skipped** real run 2: no fix was needed.
- **Restore**: `restore_version` to the pre-run version brought all 3 files back to the fixture commit.
- **Passed** `pnpm run typecheck`, `pnpm run lint:gate` and `pnpm run build:ui`.
- **Saved screenshots**: `cycle-35/flow-update/dialog-{dark,light}.png`, `started-dark.png` and `app-after-{list,detail,edit}-{light,dark}.png`.

## Left out and findings

- **Undo leaves part of a change.** Edit-history undo (Cmd+Z) of the port run leaves part of `/visits` changed. `apply_port` direct edits made during the run save as their own history entries, between the model's writes, so 3 undos do not reach the start state. `restore_version` works. The fix belongs to the snapshot or history code (pick 5 owns `port-review-snapshot.ts`).
- **Review covers the first page only.** `toRouteFileNow`, `toRouteUpdateNotes` and the port review read only the first route (`isUpdate`, the score). The model also checked only `/visits`.
- **Rules repeat in each block.** Every full block holds the 8 single-page rule lines. I did not dedupe them.
- **Hand pages have no target.** A flow page that is not a route copy cannot target a dynamic route. Only route copies remap.
- **Dialog cannot show conflicts in a flow.** Inside a flow it cannot tell a copy page from a non-copy page on an existing route. Both show "Updates", and both are updated, the non-copy one with no snapshot.
- **Found: route copy drops a frame.** A route copy into an existing prototype (`intoProjectId`) drops the first page's canvas frame. `index.html` had no frame until I added one.
- **Found: dynamic route default.** For a copy of a dynamic route, the dialog's default route is the fixture path (`/visits/1`), so a single-page move would write `app/visits/1/page.tsx`.
- **Missing roadmap file.** The worktree has no `.claude/goal/roadmap.md`, so I added no Appendix A entry.
