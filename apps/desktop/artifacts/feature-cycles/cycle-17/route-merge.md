# Cycle 17 pick 2: route-merge

Branch `feat/route-merge`. A route prototype page that shows "App changed" can now take the app change with AI and keep the prototype edits, or be marked as current.

## What changed

- **Snapshot:** `RouteSourceWriter.record` (route copy, `page.importSource`) and the new `set` copy each route file and layout file into `.studio/route-source/files/<page>/<app path>`. Cap 2 MB per entry; over the cap the entry has `hasSnapshot: false` and the old snapshot is removed. The record field `hasSnapshot` decodes to `false` for old records.
- **Action `page.inspectSourceChanges`:** `GET .../pages/source/changes`, read, MCP and agent `inspect_source_changes_page` (set `app`). Per file: `change` (`changed`, `deleted`, `added`), a line diff from `diffLines` (`@@ -a +b @@`, `+`, `-`), `isCut`. Max 50 files, 400 lines per file. No git, no dev server. With no snapshot it lists the hash changes with empty diffs.
- **Action `page.setSource`:** `PUT .../pages/source`, edit, MCP and agent `set_source_page` (set `app`). Hashes the app files again and takes a new snapshot. The page file does not change. Output `{ fileCount, hasSnapshot, page, routePath }`. `NotFound` for no page, `BadRequest` for a page that is not a route copy.
- **UI:** the "App changed" menu has "Update with AI" (starts an edit run through `sendSelectionPrompt` with a fixed prompt from `canvas/copy.ts` `routeMerge`; shows "Running" while a run is on) and "Mark as current" (runs `page.setSource`; the chip goes away).
- **Fix:** `setPrototypeTokensLink` uses `hasFile`, so a route prototype of an app with fewer than 4 tokens no longer dies on ENOENT.

## Checked

- Fake Next app in `ds-wt/route-merge-app` with 3 CSS tokens: the `/settings` route prototype copies with no defect. Record has `hasSnapshot: true` and 2 snapshot files.
- Heading color edited in the page, button label changed in the app: `inspect_source_changes_page` gives the one-line diff of the button label.
- `call-action.ts page.inspectSourceChanges` and `page.setSource`: pass, 3 surfaces, 0 diffs (`route-merge/call-action-*.txt`). After `setSource`, changes are `[]` and the snapshot holds the new app text.
- "Update with AI" in the UI starts a run with the prompt (`route-merge-update-dark.png`). The mock agent does not call named tools (it adds a paragraph), so the tool calls were proven with call-action on the agent surface, not in a run. No real model key was used.
- "Mark as current" in the UI: PUT 200, chip count 1 to 0, page file sha the same.
- Old copy (no `hasSnapshot`, no snapshot folder): `hasSnapshot: false`, hash change with empty diff; `setSource` then writes a snapshot.
- `page.importSource` writes a snapshot for the new `index-app.html` entry.
- HTTP errors: missing page gives `NotFound`, a non-copy file gives `BadRequest`.
- Screenshots: `route-merge/route-merge-menu-dark.png`, `route-merge-menu-light.png`, `route-merge-marked-light.png`, `route-merge-update-dark.png`.
- `pnpm run typecheck`, `pnpm run lint:gate` (pass, 59685 against 89733), `pnpm run build:ui` and `gen-routes --check` pass.

## Left out

- Not tried on a Bonaparte copy. A route prototype needs the app dev server, and a local clone has no `node_modules` and no database. The fake app covers the route and layout chain.
- No real-model run, so "label changes and heading color stays" is not shown end to end.
- `page.inspectSource` (the chip) still compares only the saved files; a new layout file shows only in `inspectSourceChanges` as `added`.
- MCP snapshot files are not changed. `inspect_source_changes_page` and `set_source_page` wait for approval at merge.
