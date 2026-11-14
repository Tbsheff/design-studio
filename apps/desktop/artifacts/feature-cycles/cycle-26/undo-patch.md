# undo-patch (cycle 26, pick 2)

Branch `feat/undo-patch`. The measure gate dropped step 2 (the undo patch). Built the fallback under the same key: runner-up 1, the route data offer.

## Step 1: measure

Method: playwright-core drives the studio UI (headless Chrome, 1440x900). An init script in each frame logs the Cmd+Z keydown and each change of the `h1` text and the `#card` computed `padding-top`, with `performance.timeOrigin + performance.now()`. "Full" is keydown to the first frame state that equals the state before the edit. "Studio" is keydown to the end of the `POST edit-history/undo` response (settle, the history GET and the step call). 4 s wait between the edit and the undo. Driver: `undo-patch/measure-driver.txt`. Raw data: `undo-patch/undo-measure-*.json`.

Apps: an HTML project (Tailwind browser build), and a fake Next app (`next dev`, Next 16.4.1 Turbopack, 2 files) attached as a managed app.

| Case | Runs | Full median | Full max | Studio median | Studio max |
|---|---|---|---|---|---|
| HTML, text | 5 | 48 ms | 49 ms | 5 ms | 5 ms |
| HTML, padding (class) | 5 | 52 ms | 60 ms | 6 ms | 7 ms |
| Next, text | 5 | 85 ms | 202 ms | 7 ms | 35 ms |
| Next, padding (class) | 5 | 79 ms | 93 ms | 6 ms | 6 ms |
| Next, text, Cmd+Z 250 ms after the edit | 3 | 75 ms | 89 ms | 12 ms | 17 ms |

- Gate: build step 2 when the studio part is over 150 ms or the full time on the Next app is over 300 ms. Both are far under. Step 2 is dropped.
- No run showed a flash of the edited value after the old value.
- The studio part is about 5 ms. A slow undo on Bonaparte comes from Next Fast Refresh on a large app, not from the studio calls.
- The 250 ms rows are weaker evidence: the old edit can still be held, so `optimistic-drop` can restore the text before the refresh.
- Bonaparte was not run. It cannot render routes without its database.

## Fallback: route data offer

What it does:
- A route copy ("Redesign as prototype" on an app frame, or `create_prototype_project` with `routePath`) now returns `fixtureOffer: { appProjectId, reason, route } | null`.
- The offer is set when the import answers 4xx or 5xx, when the page has nothing to copy, or when the copy has 3 elements or fewer. No run starts then. Other import failures fail as before.
- UI: the prototype dialog shows "The route copy is empty", the reason, and one line that says a fixture writes one page in the app. "Make a data fixture" runs `fixture.create` only on that click, then copies the fixture route with the same prompt and opens the new prototype. "Open the copy" opens the empty copy.
- MCP and agent: `create_prototype_project` returns the same field. Its description tells the caller to ask the user, then call `create_fixture`, then copy the fixture route.

Files:
- `packages/common/actions/src/project/{schema.ts,create-prototype.ts}`: the output field and the description.
- `src/server/handlers/project/create-prototype.ts`: the offer, and a route match that reads a `%5F` folder as `_` (the fixture route `/__studio-fixture/<id>` did not match `/%5F%5Fstudio-fixture/<id>` from the route list, so the second copy failed with 404).
- `src/server/store/version-external.ts`: keeps the `%5F%5Fstudio-fixture/` line of the app `info/exclude` out of the studio version repo. Before, after a server restart, every `fixture.create` failed with "paths are ignored" from `git add`. This was a bug in the existing fixture path.
- `src/ui/features/prototype/{fixture-offer-foot.tsx,fixture-offer-model.ts,use-fixture-offer.ts}`, and edits to `copy.ts`, `deps.ts`, `prototype-dialog.tsx`, `use-prototype-create.ts`, `prototype.module.css`.

Checked:
- Fake Next app route `/patients` (calls `prefetch` from a `server-only` module and throws "DATABASE_URL is not set", so it answers 500).
- `call-action.ts project.createPrototype` with `routePath: "/patients"`: the offer is the same on HTTP, MCP and agent. The 2 diffs are only the new project ids, folders and times (each call makes a project). call-action prints fail on those 2 diffs. Output: `undo-patch/call-action-create-prototype.txt`.
- A route that renders one empty `div` gets the offer with "The route copy has almost no content." The route `/` gets `fixtureOffer: null`.
- UI, dark: the offer, then "Make a data fixture": `POST fixtures` 200, `POST prototypes` 200, the new prototype opens with the patient list and the mock run ran (`fixture-copy-dark.png`).
- Screenshots: `offer-dark.png`, `offer-light.png`, `fixture-copy-dark.png`. Driver: `offer-driver.txt`.
- `pnpm run typecheck`, `pnpm run lint:gate` (pass, 59603 diagnostics, baseline 89733), `pnpm run build:ui`, `gen-routes --check`: pass.

## Left out

- The undo patch (step 2): dropped by the gate.
- On the offer path, "Open the copy" opens a project with no run, so the typed prompt is not run.
- A failed or empty copy still leaves its prototype project. After "Make a data fixture" the user has 2 prototype projects for the route.
- The offer does not check that the route reads server data. `fixture.create` refuses when it cannot strip the page, and the dialog shows that error.
- The run prompt of the fixture copy names the fixture route (`Redesign /__studio-fixture/<id>: ...`), not the source route.
- No real-model run (not needed for this pick). Bonaparte was not run.
- `.claude/goal/roadmap.md` is not in the worktree, so no Appendix A globs were added.

## For the merge

- MCP snapshot diff (user decision): `create_prototype_project` has a new output field `fixtureOffer` and one more description sentence.
- `version-external.ts` is outside the pick's file list. It is a 6-line change in the store.
