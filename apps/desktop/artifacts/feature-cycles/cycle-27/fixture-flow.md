# Cycle 27 pick 4: fixture-flow

Branch `feat/fixture-flow`, cut from main `f8dbc0c6d`.

## What changed

- **"Open the copy"** starts the typed prompt as the first run of the empty copy (`Redesign /patients: <prompt>`), then opens the project. It calls `run.start` with the main direction of the copy.
- **"Make a data fixture"** runs `fixture.create`, then copies the fixture route into the empty copy with `intoProjectId`. The copy is a new version of the same project. One route gives one prototype project.
- **Run prompt and name** name the source route on every surface. The handler finds the fixture by route in `FixtureStore` and reads its `sourceRoute`: `Redesign /patients (with a data fixture): <prompt>`, then one line: "The page data comes from the data fixture route /__studio-fixture/<id>." A new project for a fixture route is named `Redesign /patients`.
- **`create_prototype_project` input**: new field `intoProjectId: ProjectId | null` (default `null`). The project must be an `html` prototype whose `appProjectId` is the input `projectId`. Otherwise the call fails with `BadRequest`. `intoProjectId` without `routePath` also fails with `BadRequest`. The `fixtureOffer` text and the action description each got one sentence.

Files:
- `packages/common/actions/src/project/{schema.ts,create-prototype.ts}`
- `apps/desktop/src/server/handlers/project/create-prototype.ts`
- `apps/desktop/src/ui/features/prototype/{use-fixture-offer.ts,fixture-offer-model.ts,use-prototype-create.ts,deps.ts}`. `deps.ts` was not on the owned list. It got one line: the `run` routes re-export.

`gen-routes` wrote no change: no route or tool list changed. `handlers/project/live.ts` did not change, because `FixtureLive` in `main/live-layer.ts` already provides `FixtureStore`.

## Checked

Setup: a fake Next 16.4.1 app at `ds-wt/fixture-next-app`. Route `/patients` awaits `prefetch()` from `lib/server.js`, which throws "DATABASE_URL is not set", so the route answers 500. The route renders a client `PatientList` with 5 rows. The studio ran with `STUDIO_AGENT=mock` on port 47810.

- **UI, Make a data fixture** (dark and light): `POST prototypes` sent the offer, then `POST fixtures` 200 and `POST prototypes` 200 went into the same project id. Each flow added 1 project, not 2. The chat shows the prompt "Redesign /patients (with a data fixture): Make the list denser". The canvas shows the patient list (`make-copy-dark.png`, `make-copy-light.png`).
- **UI, Open the copy** (dark): `POST runs` 200. The run prompt is "Redesign /patients: Make the list denser" (`open-copy-dark.png`).
- **Offer**: `offer-dark.png`, `offer-light.png`. Labels unchanged.
- **Undo**: the history of the fixture copy is the run, "Remove frame Frame 1" and "Import page index.html". So 1 Cmd+Z undoes the run (`make-undo-1-*.png`), and 2 more undos return to the empty copy (no `index.html`, no canvas). See Left out.
- **call-action**, `project.createPrototype` with `intoProjectId` (`call-action-into.txt`): http, mcp and agent ran OK. The only diffs are `headVersionId` and `updatedAt`, because each surface writes a new version into the same project.
- **call-action**, with `intoProjectId` set to the app's own id (`call-action-bad-request.txt`): `BadRequest` "Clinic Next is not a route copy of this app..." on all 3 surfaces. The diffs are the error format only (HTTP body vs MCP and agent text).
- `pnpm run typecheck`: pass. `pnpm run lint:gate`: pass, 59612 diagnostics (baseline 89733). `pnpm run build:ui`: pass.
- Driver: `cycle-27/fixture-flow/ui-driver.txt`.
- No real-model run (the spec needs none). Bonaparte was not run: it has no database.

## Left out

- **Undo takes 2 steps, not 1.** After the import, the existing `importRouteCopy` removes the empty frame `f1`, and that removal is its own history entry. So without a run, 2 undos return to the empty copy. To get 1 step, history entries would need grouping, in canvas and history files outside this pick.
- **`tokensFile` is `null`** when `intoProjectId` is set. The tokens file was written when the empty copy was made.
- **`recordRouteSource` keeps the fixture route.** Its source file is the fixture page in the app. Move to app should get the source route `/patients`. That is a follow-up for the port pick.
- **"Unfinished changes in 1 file"** shows on every route copy, because `folder-context.md` is not committed when the project is made. Undo of the first run also removes it. This was already true before this pick.
- **Each "Make a data fixture" click writes a new fixture** in the app. This was already true before this pick.
- **The fixture route sentence shows in the chat bubble**, because it is part of the run prompt. `RunRequest` has no context field.
- **MCP snapshot**: `create_prototype_project` has a new input field and 2 new description sentences. This joins the cycle-26 snapshot diff (user decision).
- `.claude/goal/roadmap.md` is not in the worktree, so no Appendix A globs were added.
