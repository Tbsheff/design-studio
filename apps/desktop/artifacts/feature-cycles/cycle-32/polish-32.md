# Cycle 32 pick 5: polish-32

Branch `feat/polish-32`. No new action, no new tool, no MCP schema change.

## Commits

- `5279a70fa` fix(home): template grid reads starters from the shared store
- `7c74ea85a` fix(preview): get_screenshot reads the frame navigation status, no extra document request
- `f0e698dde` fix(image-search): drop the empty photo-art.css import in the same fill write
- `ac5f44070` fix(layers): select every new layer after a structure edit makes many

## Shipped

- **Screenshot status with no extra request.** `dev-page-check.ts` now gives `captureFrame` a page check (new last parameter, only `frame-shot-read.ts` passes it; prefill, handoff, export and snapshot do not). Inside the page the check reads `performance.getEntriesByType("navigation")[0].responseStatus` and `document.body.innerText`. This works in the playwright and the Electron backend, so `RenderPage` and the backends did not change. When the peek page was reused and did not navigate in this call (`performance.timeOrigin` older than the call), or the status is unknown, the check falls back to the old single document fetch. That keeps the "healthy, then server stops" case correct. Same results as cycle 31: 5xx and down fail with `Conflict` and the `app_doctor` hint; 404 and a slow first compile do not.
- **All replaced layers selected.** `settleStructure` passes the other new layers as `others` in the reselect. `select-source` got one optional field, `others` (`contracts.ts`). The bridge (new `bridge/select-sources.ts`) finds all elements and posts one `select-many`, so the order cannot race. `layer-bridge-model.ts` also resolves the reselect on `select-many`.
- **Empty art import removed.** `toTrimmedFill` (`photo-art-trim.ts`) drops `import "./photo-art.css"` when the trimmed sheet is empty. `toSheetUnimported` (`photo-art-jsx.ts`) finds the import with the parser and cuts it by position. The change is in the same write and undo step. The empty file stays (history cannot record a delete).
- **One starters read.** New `useStarterList` (full list) in `use-starters.ts`; `useStarters` keeps the cut to 4. The template grid uses the full list, because templates need starters 5 and 6 (`form`, `docs`).

Files outside the spec list (no other pick owns them): `packages/common/contracts/src/contracts.ts` (1 optional field), `bridge/hover-select.ts`, new `bridge/select-sources.ts`, `versions-layers-tokens/{layer-edits-model.ts,layer-edits-types.ts,layer-bridge-model.ts,use-layer-apply.ts}`, `share/image-search/photo-fill.ts`, `home/template-tile.tsx`.

## Checked

- `call-action.ts workspace.getScreenshot` on fake app `ds-wt/p32-next` (node server, url mode): healthy returns the PNG, 500 returns the error text, stopped server returns the 502 proxy text; HTTP, MCP and agent agree (`call-screenshot-{healthy,broken,down}.txt`). Healthy shot, then stop, then shot on one studio server fails correctly through the fallback (`healthy-then-down.txt`).
- Request log (`screenshot-requests.txt`): per shot, the frame navigation plus the `warmAppPage` fetch (only when the page is not live). The removed check fetch does not show. Was 3 on this setup, now 2. The spec's "1 per shot" needs the warm fetch gone too; it is outside this pick.
- Mod+Shift+R on 3 slots with a copied card: 3 new layers selected, "3 elements" (`replace-selection-{dark,light}.png`). One undo restores the file.
- Photo fill on a JSX page with 2 art slots: no `photo-art.css` import left, sheet empty; undo brings the import and 4 rules back; redo removes them (`photo-art-import.txt`).
- Home: 1 `/api/starters` request after load and after opening the template grid; the `form` tile shows "Form starter" (`home-starters-requests.txt`).
- `pnpm run typecheck`, `pnpm run lint:gate` (pass, 59619, baseline 89733), `pnpm run build:ui` pass. No real-model run (none needed).

## Left out

- The `warmAppPage` document fetch stays when the page is not live (see above).
- The Layers panel highlights only the last of the selected rows; the canvas and inspector show all 3.
