# Cycle 16 pick 2: route-sync

Branch `feat/route-sync`. A route prototype page now shows "App changed" when the app route file or its layout files change, and one click copies the route again as a new page.

## What changed

- **Record:** `project.createPrototype` with `routePath` writes `.studio/route-source.json` in the prototype folder: one entry per page with `appProjectId`, `routePath`, `viewport`, `page`, `frameId`, `copiedAt` and `files` (the route file from `listAppRoutes` plus each `layout.*` on its folder chain up to the app router folder, with a sha256). `.studio/*` is not versioned, so undo and restore do not touch it.
- **Action `page.inspectSource`:** `GET /api/projects/:projectId/d/:directionId/pages/source`, read, MCP and agent `inspect_source_page` (lean, set `app`). It hashes the files again. No git and no dev server on the read path. A page with no entry, or a page file that is gone, gives `isRouteCopy: false`.
- **Action `page.importSource`:** `POST` on the same path, edit, MCP and agent `import_source_page` (set `app`). It starts the app dev server when it is off, copies the route with `PageWriter` as `<page>-app.html` and a new frame, and adds a new record entry for that page. The source entry does not change. One version and one undo step. Errors: `NotFound` (no page, or app gone), `BadRequest` (not a route copy, or the dev server did not start).
- **Server:** `project-ops/route-source/` holds `RouteSourceStore` (read), `RouteSourceWriter` (write), pure engines `to-route-files.ts` and `to-changed-files.ts`, and `toReadyAppUpstream`, which moved out of `create-prototype.ts` so both handlers share the 2-minute dev server wait.
- **UI:** `route-source-chip.tsx` in `frame-label-extras.tsx`. A red "App changed" chip on a frame whose page changed. `data-tip` lists the changed files (deleted files are marked). The menu has "Copy app again" and "Compare with app copy" (makes the latest `<page>-app*` frame active). The check runs when the canvas opens and after each `page.importSource`, never on a timer.

## Checked

- Fake Next app in `ds-wt/route-sync-app` (a `node_modules/.bin/next` stub that serves `app/<route>/page.tsx` as HTML). Made a route prototype of `/settings`: the record has `app/settings/page.tsx` and `app/layout.tsx`. No chip.
- Changed the heading in `app/settings/page.tsx`: `inspect_source_page` gives `isChanged: true`, `changedFiles: [{ change: "changed", file: "app/settings/page.tsx" }]`, and the frame shows the chip.
- "Copy app again" in the UI: a new frame on the right shows the new heading "Your account". The new frame has no chip. The source frame keeps its chip and its page.
- Cmd+Z: "Undid import page index-app.html". The page and frame left `canvas.json`, and `inspect_source_page` on `index-app.html` gives `isRouteCopy: false`.
- Moved the route file away: the change is `deleted`.
- `call-action.ts page.inspectSource`: pass, 3 surfaces, 0 diffs (unchanged, changed, removed page).
- `call-action.ts page.importSource`: all 3 surfaces ran with no error. The outputs differ only in `frameId`, `page` (`index-app`, `-2`, `-3`) and `versionId`, because each surface makes its own copy (`route-sync/call-action-import.txt`).
- HTTP: a missing page gives `NotFound`, a plain HTML page gives `BadRequest`.
- Screenshots: `route-sync/route-sync-menu-dark.jpg`, `route-sync-copied-dark.jpg`, `route-sync-menu-light.jpg`.
- `pnpm run typecheck`, `pnpm run lint:gate` (pass, 59683 against 89733), `pnpm run build:ui` and `gen-routes --check` pass.
- `check-actions` fails on main already (277 findings). It adds one O12 row for `page.inspectSource` (`changedFiles` has no `limit`), the same row that most read actions on main have. `changedFiles` has a max of 50.

## Left out

- The new frame keeps the page title as its label, not "App now", and goes where `applyPlacement` puts it (to the right on this canvas). A label or position needs a change in `share/page-import/**` (not owned) or a second canvas write (a second undo step).
- "Copy app again" does not make the new frame active. "Compare" makes the copy frame active. The canvas has no multi-frame selection, so it does not select both frames.
- No token sweep on the new copy (it would add a second version).
- The chip does not refresh when the agent edits the app in another project. It refreshes when the canvas opens and after `page.importSource`.
- Permissions are `project.read` and `project.update`, as every other `page` action, not `studio.read` and `studio.write` from the spec.
- The dev-server failure is still `BadRequest` (shared with `create-prototype`), not `Conflict`.
- MCP snapshot files are not changed. `inspect_source_page` and `import_source_page` wait for approval at merge.
- Found on main, not fixed: a route prototype of an app with fewer than 4 CSS tokens fails with a defect, because `setPrototypeTokensLink` (`project-ops-prototype.ts`) uses `attemptKnown(access)`, which dies on ENOENT. The fake app got 5 tokens to get past it.
