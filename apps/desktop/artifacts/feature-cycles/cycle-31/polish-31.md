# Pick 5: polish-31

Branch `feat/polish-31`. No new action, no new tool, no schema change.

## Shipped

- **Starters load once** (`ui/features/home/use-starters.ts`). Home asked for `/api/starters` twice: `prompt-area` at about 100 ms and `start-cards` at about 400 ms, after the first answer, so the in-flight dedupe in `api-core.ts` did not catch it. The hook now keeps the list in a `createLiveStore` store and reads it only when the store is empty. The list is the static `STARTERS` const on the server, so no time cache is added (U12a). A failed read leaves the store empty, so the next mount tries again.
- **Old art goes when a photo fills the slot** (new `share/image-search/photo-art-trim.ts`, called from `photo-fill.ts`). In the same write:
  - HTML: rules in `<style data-photo-art-sheet>` whose key has no `data-photo-art` slot on the page are removed. An empty block is removed.
  - JSX: rules in `photo-art.css` for keys that left the page are removed, except keys that a sibling page in the same folder still uses.
  - The sheet change is in the same undo step. Undo brings the art back, redo removes it again.
- **`get_screenshot` on a failed dev server** (new `preview/dev-page-check.ts`, one call in `preview/frame-shot-read.ts`). For an app project, the shot first asks the frame URL as a document (the same request the frame makes). A 5xx answer or no answer fails the action with `Conflict`: the status, the page text (scripts removed, 400 chars) and "Call app_doctor ...". Over MCP this is `isError: true`. A timeout (30 s, slow first compile) does not fail the shot. The tool is served by `workspace.getScreenshot` through `McpReadStore`, not by `mcp/layer-tools.ts` or `edit-tools.ts`, so the fix is in the read path.

## Checked

- Network log on Home: 2 `/api/starters` requests before, 1 after (`cycle-31/polish-31/home-starters-requests.txt`).
- Photo fill, HTML prototype with art in 2 slots (div and img), search on: both slots have the photo, 0 `data-photo-art` matches, no sheet block. JSX prototype with 2 art img slots: both photos, `photo-art.css` empty. Undo and redo checked on both (`photo-art-trim.txt`).
- `call-action.ts workspace.getScreenshot` on the fake app `ds-wt/pl-next` (url mode, a node server on port 12990): healthy page returns the PNG; page answers 500 returns the error text; server stopped returns the 502 proxy text. HTTP, MCP and agent agree (`call-screenshot-{healthy,broken,down}.txt`).
- Screenshots: `home-{dark,light}.png`, `photo-fill-{dark,light}.png`.
- `pnpm run typecheck`, `pnpm run lint:gate` (pass, 59602 diagnostics, baseline 89733), `pnpm run build:ui` pass.
- No real-model run (none needed).

## Left out

- **Old `photo-art-*.svg` files stay in `assets/`.** The edit history cannot record a file delete (`direct-edit/commit/history.ts`, not owned). Only the rules and the slot markers go.
- **Empty `photo-art.css` keeps its import** in the JSX page. It is harmless; removing the import needs the JSX parser step in `photo-art-jsx.ts`.
- **`home-templates.tsx` still reads starters itself** when the template grid opens. It is not on the Home load path.
- **A client-side error page with status 200** (for example a Next client error overlay) is not caught; only 5xx and no answer are.
