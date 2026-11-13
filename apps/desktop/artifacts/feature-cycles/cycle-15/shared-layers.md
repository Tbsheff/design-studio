# Cycle 15, pick 2: shared layers

Branch `feat/shared-layers`. Select a layer in an HTML page. When the same element is on other pages, a chip at the inspector head tells you. After an edit, the chip copies the edit to every page that matches, as one version.

## What works

- **Adds** `page.inspectMatches` (`GET /api/projects/:projectId/d/:directionId/pages/matches`, MCP and agent `inspect_matches_page`). Input: `projectId`, `directionId`, `file`, `selector`, `versionId` (null is the file on disk). Output: `{ items: [{ file, selector, frameId, isSame }] }`, at most 50 pages. The source page is not in `items`.
- **Adds** `page.updateMatches` (`POST` on the same path, MCP and agent `update_matches_page`). Input: `projectId`, `directionId`, `file`, `selector`, `targets` (1 to 50 `{ file, selector }`). Output: `{ versionId, files }`. One version and one edit-history step for all files.
- **Matches** an element when the tag is the same and the markup is the same. Whitespace, attribute order, class order, `aria-current`, `data-studio-loc` and the classes `active`, `current`, `selected` (and `is-*` forms) are ignored. A page with an element of the same tag at the same selector, or with only one element of that tag, is listed with `isSame: false`.
- **Keeps** each page's own markers on write: the target's `aria-current` and active classes move onto the copied markup, so "About" stays active on about.html.
- **Chip:** "On 3 pages" when all match, "2 of 3 pages match" when one page changed on its own. After an edit, the chip becomes "Apply to N pages". It writes only the pages that match. Cmd+Z takes back the whole apply in one step.
- **Hides** the chip for a multi-selection, a non-HTML source file (React and app projects), and an element with no match.
- **Errors:** `BadRequest` (not an HTML project, the source page in targets, or no target changed), `NotFound` (no element at the selector), `Conflict` (a target no longer has an element of that tag at the selector).

## Files

- **Actions:** `packages/common/actions/src/page/{inspect-matches,update-matches}.ts` (stamped), `page/match/schema.ts`.
- **Server:** `handlers/page/{inspect-matches,update-matches,live}.ts`. `canvas/page-match/`: `page-match-store.ts` (`PageMatchStore`, read), `page-match-writer.ts` (`PageMatchWriter`, write), `page-match-read.ts`, `page-match-write.ts`, `index.ts`, and the pure engines `engine/to-element-spot.ts` (selector to parse5 element and back), `engine/to-page-matches.ts`, `engine/to-marked-markup.ts`. One export line in `canvas/index.ts`.
- **UI:** `inspector/shared-layers-chip.tsx`, `use-shared-layers.ts`, `shared-layers-model.ts`, a block in `inspector/copy.ts`, the mount in `inspector-edit-pane.tsx` (one import, one element), `styles/shared-layers.css` and its import in `app/main.tsx`.

## Checks

- **UI** (mock server, 3-page imported HTML site, playwright-core at 1440 px):
  - Dark: the nav showed "2 of 3 pages match" (contact.html had "Contact us"). A padding edit changed it to "Apply to 2 pages". The click wrote only index.html. contact.html did not change.
  - Light: an "About" link showed "On 3 pages", then "Apply to 3 pages", then "On 3 pages" after the apply. about.html kept `class="active" aria-current="page"` on its own link.
  - Cmd+Z after an apply reverted index.html and contact.html in one step. The source page kept the user's own edit.
  - Screenshots: `cycle-15/shared-layers/shared-layers-{selected,edited,applied}-{dark,light}.png`.
- **call-action** `page.inspectMatches`: pass, 3 surfaces, 0 diffs.
- **call-action** `page.updateMatches`: HTTP wrote index.html. MCP and agent then returned `BadRequest` ("Every target page already has this markup."), as expected on one shared input. After a hand change to index.html each time, the MCP `update_matches_page` call and the agent route `/api/agent-tools/update_matches_page` each wrote index.html. A target at a missing selector returned `Conflict`.
- **Gates:** `pnpm run typecheck` passes. `pnpm run lint:gate` passes (59671, baseline 89733). `pnpm run build:ui` passes. `gen-routes --check` passes.

## Left out

- **No canvas outline on hover.** The chip tooltip lists the matching files instead. An outline needs a shared UI store and canvas files that this pick does not own. `frameId` is in the output for that later step.
- **Weak conflict check.** `Conflict` fires only when the target selector no longer finds an element of that tag. A target whose markup changed after the inspect is still overwritten. The spec's input has no field for the expected markup.
- **Edit detection.** "Apply" shows after the edit session count goes up (or the selection markup changes) since the layer was selected. A reload after an edit shows "1 of 3 pages match", because the match runs on the file on disk. The agent can pass `versionId` to match against the element as it was in a version.
- **One match per page.** The first element that matches on a page is used.
- **MCP snapshot not updated.** `artifacts/mcp-snapshots/*.json` does not have `inspect_matches_page` and `update_matches_page` yet. Approve them at merge.
- **Found, not fixed (not this pick): imported folders cannot save versions after a canvas change.** `project.import` writes `.studio/` into the project's `git/info/exclude` after the `!.studio/canvas.json` line. The next version then fails with "paths are ignored by one of your .gitignore files". For the test, I removed that line in the test data only.
