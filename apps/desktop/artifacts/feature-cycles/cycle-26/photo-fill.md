# Cycle 26 pick 3: photo-fill

Branch `feat/photo-fill`, cut from `54a921252`.

## Built

- Added `image-search.apply` (stamped with `new:action`, generated files from `gen-routes`). MCP and agent tool `apply_image_search`, route `POST /api/projects/:projectId/d/:directionId/image-search/apply`. Input `projectId`, `directionId`, `path`. Output `{ filled: { selector, query, photoId }[], missed: { selector, query }[], versionId }`. Errors `BadRequest`, `Conflict`, `NotFound`.
- Fills every `data-photo` slot on one page:
  - runs all searches in parallel, with the orientation from the `width` and `height` attributes;
  - gives each slot up to 3 results that the page and the other slots do not use (ids in `ASSETS.md` whose file the page shows count as used);
  - downloads into the assets folder, credits every photo in `ASSETS.md`;
  - sets `src` on an `img`, or `background-image` on another element (HTML), and removes `data-photo`;
  - writes one version and one undo step;
  - keeps a slot with no result and lists it in `missed`.
- Runs in the agent's own first-draft run: a new project has no saved version until the run ends, so `assertCanEdit` refused the call. In that case the action writes the files and the run version keeps them.
- Agent:
  - `prompt.ts` line 13 is now a photo rule from `photo-search.ts`. When search is on, the agent writes `data-photo` slots and calls `apply_image_search` once after the first draft. When search is off, it writes gray-box divs with `data-photo` and a label, never an `<img>` with no `src`. React projects get the same line.
  - `run-level.ts`: PROTOTYPE and POLISH add a "Photos" step after the draft when search is on. WIREFRAME says "no img slots and no apply_image_search".
  - `run-notes.ts` and `photo-note.ts`: when search is off and a PROTOTYPE or POLISH page has `data-photo` slots, the run note ends with "Photo slots are gray boxes. Turn on image search in the image sheet (Turn on image search for this project) or with STUDIO_IMAGE_SEARCH=on for real photos." A marker file next to the runs folder (`photo-note.json`) shows it once per project. Lean runs and ask mode are skipped.
- Cmd+K "Fill photo slots" (Run group) calls the action on the page of the active canvas frame. If nothing fills, the error banner lists the search words.

## Checked

- `call-action.ts image-search.apply` on a page with one nonsense slot: pass, 3 surfaces, 0 diffs (`photo-fill/call-action-on.txt`). With search off, all 3 surfaces return the same message, which names `STUDIO_IMAGE_SEARCH` and the `imageSearch` setting (`call-action-off.txt`). The tool reports "fail" there only because the HTTP error body and the MCP error text have different shapes.
- Mock agent, search on, a page with a wide hero, 2 square cards and 1 nonsense slot: 3 distinct photos, 3 credits in `ASSETS.md`, the nonsense slot listed in `missed`. One undo (HTTP, and Cmd+Z in the UI) restored all 3 `data-photo` slots. A second fill of a new "croissant pastry" slot took a new photo, not the one already on the page. A `div` slot got a background image.
- A one-off script ran the fill inside `runAsAgent` with no saved version (the first-draft case): HTML and `.tsx` (`img` slot filled, `div` slot listed in `missed`), versionId null, files written.
- Run note: a one-off script with search off returned the note on the first call and nothing on the second.
- Screenshots: `photo-fill/palette-{dark,light}.png` (the command), `filled-{dark,light}.png` (the test page after Cmd+K), `real-page-filled-{dark,light}.png` (the real-model page after one fill: 5 slots, 5 backgrounds, 0 broken images).
- `pnpm run typecheck`, `pnpm run lint:gate` (59605, baseline 89733) and `pnpm run build:ui` pass. `pnpm run check:scripts` fails on main already (E1 and S11 hits in files this pick does not touch). None of its hits are in this pick's files.

## Real-model runs (2, Sonnet 5.5, search on, "A bakery landing page", PROTOTYPE)

| | Before (main) | After (this branch, before the first-draft fix) |
|---|---|---|
| Photos | 0 (colored blocks, critic flagged it medium) | 0 in the run; 5 after one Cmd+K fill on the run's page |
| Broken-image findings | 0 | 0 (0 after the fill too) |
| First Write (draft) | 23.3 s after start | 23.3 s after start |
| Total time | 85.5 s | 77.5 s |
| Output tokens | 8483 | 7489 |
| Cache read / write | 336k / 50k | 382k / 47k |
| Cost | $0.247 | $0.233 |

- The after run followed the prompt: it wrote 5 `data-photo` slots, loaded `apply_image_search` in the same `ToolSearch` call as `TodoWrite` (no extra turn), and called it at 25.7 s, right after the draft. The call failed 3 times with "This direction has no saved version yet", because the project had no version until the run ended. The agent then turned the slots into gray-box divs. The first-draft fix above is the change for this. A third real run to prove it would pass the 2-run limit, so the script check above covers it.
- The first-draft time does not change, because the fill comes after the draft. A fill of 5 slots took 14.6 s (Openverse search and download).

## Left out

- The `tool-help.ts` entry. AGENTS.md E16 forbids adding a stamped action to `tool-help.ts`. The action's `short` and `description` serve the help.
- JSX background slots: in a `.jsx`/`.tsx` page only `img` slots fill. Other elements go to `missed`.
- A background slot keeps its label text over the photo.
- The `apply_image_search` MCP snapshot entry: user decision at merge.
- A real run after the first-draft fix, and a UI screenshot of the run note. Both need a third real run.
- `.claude/goal/roadmap.md` is not in the worktree, so Appendix A has no new globs.

## Shared files

- `server/agent/sdk-driver.ts` (pick 1): one line. `toNotedOutcome(referenced.outcome, segment, input)` is now awaited and takes the segment and input. Net 0 lines (the file may not grow).
- `server/agent/run-notes.ts`: `toNotedOutcome` is now async and adds the photo note. Rebase after pick 1 adds its note kind.
- `server/agent/user-message.ts`: `isImageSearchOn` in `UserMessageParts`.
- `ui/app/studio/bind-studio-commands.ts`: binds `onFillPhotos`.
- `server/share/image-search/place.ts`: exports `toFetchImage`.
