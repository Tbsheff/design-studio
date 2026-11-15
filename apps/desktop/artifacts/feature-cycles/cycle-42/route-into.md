# Cycle 42, pick 3: route-into

A route copy into an existing prototype (`create_prototype_project` with `intoProjectId`) keeps the frames that are on the canvas.

## Fix

- `importRouteCopy` in `src/server/handlers/project/create-prototype.ts` takes a required `isNewTarget: boolean`. It deletes the start frame `f1` only when `isNewTarget` is true.
- `createRoutePrototype` sets `isNewTarget` to `input.intoProjectId === null` (the same branch that picks `toIntoTarget` or `writer.createPrototype` in `toRouteTarget`) and passes it through `toCopyOutcome`.
- Placement: no change. `pages.import` already puts the new frame to the right of the right-most frame with the canvas gap (x 1520 for a 1440 frame). No overlap.
- Cost: no new read. File is 437 lines (was 428).

## Proof

Fake app `ds-wt/ri-next` (copy of `ac-next-b` with `/visits` and `/visits/[id]`), `STUDIO_AGENT=mock`, port 6950.

Main (before the fix), `/visits` into a new prototype, then `/visits/1` with `intoProjectId`:

- Canvas before: `[{ id: "f1", x: 0, path: "index.html" }]`
- Canvas after: `[{ id: "f2", x: 1520, path: "index-2.html" }]`. The first page's frame is gone.

Branch (after the fix), same steps:

- Canvas before: `[{ id: "f1", x: 0, path: "index.html" }]`
- Canvas after: `[{ id: "f1", x: 0, path: "index.html" }, { id: "f2", x: 1520, path: "index-2.html" }]`
- The UI shows 2 frames side by side. The frames render "Visits" and "Visit 1".
- No regression: `/visits` into a new prototype gives 1 frame, `f1`, with the route copy. There is no empty start frame.

`pnpm exec tsx scripts/call-action.ts project.createPrototype` with `intoProjectId` and `routePath: "/visits/2"`: 3 surfaces ran (http, mcp, agent), 0 failed surfaces, 0 error results. The canvas then has f1 to f5 in a row (x 0, 1520, 3040, 4560, 6080). The tool reports 2 diffs. They are only `headVersionId` and `updatedAt`, because each surface adds one more copy and one more version. This is expected for a write action.

Screenshots: `cycle-42/route-into/canvas-two-frames-dark.png`, `canvas-two-frames-light.png`.

## Checks

- `pnpm run typecheck`: pass.
- `pnpm run lint:gate`: pass (59593 diagnostics, baseline 89733).
- `pnpm run build:ui`: pass.
- `check-actions --probes`: 278 hits, same as main (same lines).
- MCP snapshots: no change (no input or description change).

## Notes

- Seen, not changed: every route copy shows the "Unfinished changes in 1 file" banner. It also shows after a single copy into a new prototype, so it is not from this fix.
- Seen, not changed: both frames take the label "Crew", the `metadata.title` of the app layout, not the route.
- Left out: the cycle-35 default route for a dynamic route in the dialog (runner-up 9).
- Files outside the pick's list: none.
