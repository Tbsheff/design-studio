# Cycle 28 pick 1: route-apply

Branch `feat/route-apply`, cut from main `f8274310e`.

## What changed

- **`start_port` updates an existing route** when the prototype page is a route copy of that route file in that app. The copy record (`.studio/route-source.json`) must have the target app id, and its first file must be the plan route file. Any other existing route stays a Conflict ("Pick a new path").
- **New `agent/port-route-update.ts`**:
  - It does the check. It adds a `<route-update file="...">` tag after `</port-plan>`. The tag holds the rule lines (keep data reads and Next exports, replace markup, no sample rows), the route file now, the copy-time snapshot, and a line diff when the app route changed since the copy.
  - It writes the run note `Updated <file> (kept N data reads).` The note counts `await` calls, query calls and `params`/`searchParams` in the old file that are still in the new file. It is added on the SDK path (`run-notes.ts`) and on the mock path (`mock-port.ts`).
- **`port-start.ts`**: the throw moved into the new file. The update tag goes into the page prompt. The file went from 491 to 486 lines.
- **`mock-port.ts`**: for an update, it keeps the old file up to the first `return` of the default export (imports, `dynamic`, the `await`). Then it writes the prototype heading. The fix loop writes the same text.
- **`handlers/port/start.ts` preview** (not on the owned list, but needed for MCP): the preview reads `RouteSourceStore.get` and allows the route copy update. The Allow card says "index.html as /patients: updates app/patients/page.jsx in place". `handlers/port/live.ts` provides `RouteSourceStore`.
- **`create-prototype.ts`**: `recordRouteSource` records `label.sourceRoute`. A fixture copy now records `/patients` and snapshots `app/patients/page.jsx`, not the fixture route.
- **`port/start.ts` description**: one sentence on the update rule. `gen-routes --check` passes.
- **UI**:
  - `use-port-form.ts` reads `inspectSourcePage` (main direction when the dialog has none). The route field defaults to the copied route.
  - The File row says "Updates app/patients/page.jsx". The foot says "Updates app/patients/page.jsx in Clinic Next.". "The app route changed since the copy" shows when the hashes differ.
  - Files: `port-model.ts`, `use-port-form.ts`, `port-plan-summary.tsx`, `port-plan-file.tsx`, `port-form-body.tsx`, `port-form-foot.tsx`, `copy.ts` (2 keys).

## Checked

Setup:
- A fake Next 16.4.1 app at `ds-wt/ra-next`. `/patients` awaits `prefetchPatients()` from `lib/server.js`, which throws "DATABASE_URL is not set" without the env var. It has `export const dynamic = "force-dynamic"` and renders a client `PatientList`.
- The studio ran on port 5590 with data in `ds-wt/route-apply-data`.
- The files are `.jsx`, not `.tsx`, because the copied `node_modules` has no TypeScript.
- The fixture engine refuses a page that renders the awaited value, so the page uses the prefetch pattern from cycle 27.

Mock agent:
- **Copy and fixture**: copy `/patients` gave the fixture offer (500). `fixture.create` 200. The copy into the same project recorded `routePath: "/patients"` with a snapshot of `app/patients/page.jsx`.
- **Dialog**: the route field shows `/patients`. The File row says "Updates app/patients/page.jsx" (`dialog-{dark,light}.png`, `dialog-changed-{dark,light}.png`).
- **Start run (UI)**: one run, "Edited page.jsx +1 -2". The file keeps the `prefetchPatients` import and call, `dynamic` and the `PatientList` import. It has 0 fixture rows. The run note says "Updated app/patients/page.jsx (kept 1 data read)." (`run-note-{dark,light}.png`).
- **Undo**: 1 `edit-history/undo` puts the file back to its hash before the run (`f6416bbb...`). This was checked 3 times.
- **Plain prototype to `/patients`**: 409 Conflict "The app already has /patients (app/patients/page.jsx). Pick a new route."
- **App route changed after the copy**: the dialog shows "The app route changed since the copy". The run prompt has `<route-file-diff>` with `+      <p>Ward list for today.</p>`.
- **call-action `port.start`** (`call-action.txt`):
  - http ok.
  - mcp gave "A run is in progress in Clinic Next", because the http run was still active. The approval card was answered, so the preview passed.
  - agent was skipped (`run-control`).
- **MCP alone** (`mcp-start-port.txt`), after an undo: the output is the same as http except `runId`.

Real model (1 run, Sonnet 5.5, `DATABASE_URL=postgres://fake` on the dev server, route changed after the copy):
- 19.3 s and $0.106. The data reads kept: `prefetchPatients` import and `await`, and `dynamic` (3 grep hits). The `PatientList` import and the app change ("Ward list for today.") were kept. Fixture rows written into the app: 0.
- `render_check`: 0 errors, the route renders. `inspect_port` score: 48 (top left). The kept app paragraph is not in the prototype, so the score stays low.
- Before and after: `real-run-page-before.jsx`, `real-run-page.jsx`.
- **Run 1 did not edit `patient-list.jsx`.** The rule lines did not allow edits to sibling files. Commit `da86c2e4c` adds a rule: "Also restyle the components that the route imports from its own folder. Keep their data reads (hooks, queries) and exports."

Real model, run 2 (after `da86c2e4c`):
- The server restart cleared the in-memory edit history, so run 1 could not be undone. Run 2 started from the run-1 page.
- 22.4 s and $0.188. `patient-list.jsx` changed (token classes) and keeps `usePatients()`. `page.jsx` keeps `prefetchPatients`, `dynamic` and the "Ward list for today." line. Sample rows in `app/` outside the fixture: 0.
- `render_check`: 0 errors, the route renders. `inspect_port`: 48 before the fix loop, 77 after.
- The agent went back to inline styles in `page.jsx`, because the fake app has no Tailwind.
- Files: `real-run-2-page.jsx`, `real-run-2-patient-list.jsx`.

Final checks:
- `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run lint:gate` (59615 diagnostics, baseline 89733), `pnpm run build:ui` and `gen-routes --check` pass.
- `pnpm run check:scripts` fails in `check-actions` ("558 hits (baseline 410)", E16 legacy names). Main `f8274310e` gives the same result, so this branch did not cause it.

Files outside the pick-1 owned list: `handlers/port/{start,live}.ts`, `ui/features/design-system/{port-plan-summary.tsx,port-plan-file.tsx,port-form-body.tsx,port-form-foot.tsx}`.

## Left out

- **Flow path**: a flow onto existing routes stays a Conflict. A route copy is one page.
- **Bonaparte `get_port_plan` check**: not run. It needs a route copy of a Bonaparte route, and the Bonaparte routes need its database. The `get_port_plan` output did not change.
- **A route update counts only the page file.** Components in the route folder can change, but the note and the diff cover only the route file.
- **A fixture copy now records the source route.** `import_source_page` on a fixture copy now reads `/patients`, which answers 500 without data. This is untested.
- **The mock writes a heading, not the full prototype.** So its port score is low. The mock proves only the update rules.
- `.claude/goal/roadmap.md` is not in the worktree, so no Appendix A globs were added.
