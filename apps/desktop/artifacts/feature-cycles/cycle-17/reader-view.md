# Cycle 17 pick 4: reader-view

## Done

- Added `accessibility.listReaderLines` (GET `/api/projects/:projectId/d/:directionId/accessibility/reader-lines`, read, `project.read`, project scope). Tool name `list_reader_lines_accessibility` on MCP and the agent (set `app`). Input: `projectId`, `directionId`, `frame`, `PageFields`. Output: `pageOf(ReaderLineSchema)` plus `frame` and `total`.
- Added `ReaderLineStore` (`access: "read"`), `reader-run.ts`, the in-page `reader-probe.ts` and the pure engine `engine/to-reader-lines.ts` (lines and cursor pages).
- Changed the "Tabs" toggle to a menu: Tab order, Reader. Reader mode shows a list at the right edge of the frame, one row per line ("heading level 2, Schedule", "button, More filters, collapsed"). A row with no name shows a red "!" mark. Hovering a row outlines its layer. Clicking a row selects the layer.

## Checked

- `call-action accessibility.listReaderLines` with `limit: 5`: http, mcp and agent all pass, 0 diffs, 5 lines, `next: "5"`, `total: 17`.
- HTML test page: `sr-only` text shows as part of the name ("button, Save visit for Ana Ruiz") and as a text line ("Last saved two minutes ago"). Headings show their levels in DOM order. The icon button and the img with no alt are marked.
- UI: hover outline and click select (h2 selected, inspector open). Screenshots: `reader-view/reader-view-{dark,light}.png`, `reader-menu-dark.png`, `reader-select-light.png`.
- `pnpm run typecheck`, `pnpm run lint:gate` and `pnpm run build:ui` pass.

## Changed from the spec

- The lines come from an in-page DOM and ARIA walk, not from playwright `ariaSnapshot`. `RenderPage` (shared `server-ports.ts`) does not expose `ariaSnapshot`, and the YAML has no element refs, so it cannot give a `layerId`. The walk gives `layerId` (source loc) and `selector` per line. The description says the lines follow the browser accessibility tree rules and are not a VoiceOver or NVDA run.
- The route has `/d/:directionId/` like `accessibility.inspect`.
- One line in `src/server/review/index.ts` exports `ReaderLineStore` (handlers import through the area index).
- `ReaderLine` also has `selector` so the UI can outline and select a layer.

## Left out

- Bonaparte route copy check (pick 2 test not run here).
- The MCP snapshot for `list_reader_lines_accessibility` waits for approval at merge.
- A label's text shows twice (as the checkbox name and as a text line), as in the Chromium tree.
