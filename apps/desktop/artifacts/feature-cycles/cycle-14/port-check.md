# Cycle 14 pick 5: port-check

Branch `feat/port-check`. A port run now checks how well the app route matches its prototype page.

## What works

- **Action:** `port.inspect` (`GET /api/projects/:projectId/port/match`, read, `project.read`). MCP tool `inspect_port`, agent tool `inspect_port` (lean, set `app`). Input: `projectId`, `directionId` (null default), `path`, `targetProjectId`, `routePath`, `width` (default 1280), `limit` (default 9). Output: `score`, `isLow`, `areas` (`row`, `col`, `name`, `score`, worst first, only areas under 80), `diffPath`, `prototypePath`, `appPath`.
- **Score:** renders both pages through `McpReadStore.screenshot` at one size (width x 1600), then scores them with the `compare_to_reference` scorer (`diffPictures`, content 20%, edges 80%, 3x3 areas). Next route groups such as `/(design)` are removed from the URL.
- **Files:** writes the prototype, app and side-by-side diff PNGs to `<data dir>/port-check/<proto>-<app>-<route>-<width>-*.png`. The name is stable, so each check overwrites the last one. It never writes to the app.
- **Port prompt:** `agent/port-start.ts` adds a `<port-check projectId directionId path targetProjectId routePath />` line to the page and flow prompts. The line tells the agent to call `inspect_port` before it reports done, and to fix the areas under 80. For a flow, only the first page is checked.
- **Chat row:** when a completed run has task `port` and the tag, the run body shows "Matches the prototype: N% · K areas differ". Under 80 the row is amber and shows "Fix differences". That button starts a follow-up port run in the app. Its prompt names the worst areas and the diff path, and repeats the tag, so the new run gets its own row.

## Checked

- **call-action:** `scripts/call-action.ts port.inspect` passes. HTTP, MCP and agent all return score 18 with the same areas and paths (0 diffs).
- **Score moves with the route:**
  - A copy of the prototype as the route scores 100 with no areas.
  - A darker, taller card in the route scores 18 and lists 6 areas. The worst is "top center", at 8.
  - A heading text change scores 97.
- **Port run:** ran `port.start` with the mock agent. The run prompt contains the tag. The chat row showed 12% in amber. Fix differences started run `s9NC9RcEOkuNPgFUTOcDS` in the app with the fix prompt.
- **Gates:** `pnpm run typecheck`, `pnpm run lint:gate` (pass, 59671 against a baseline of 89733) and `pnpm run build:ui` pass.
- **Screenshots** in `cycle-14/port-check/`:
  - `port-check-low-dark.png` and `port-check-low-light.png` show the amber row.
  - `port-check-match-dark.png` and `port-check-match-light.png` show the 97% row.
- **Test app:** a copy of `route-app` at `ds-wt/port-check-app`. Its fake server also serves `app/<route>/page.html`.

## Left out

- **Show diff:** has no button. No image viewer exists in the UI, and no route serves a data-dir PNG. The path is in the tool output and in the Fix prompt.
- **Live scores:** the row reads the score live, so older port runs in the same thread show the current score, not the score at the time of that run.
- **Flow ports:** only the first page is scored.

## Notes for merge

- **Service placement:** `PortMatchStore` lives in `src/server/review/port-check/`, not in `src/server/port-check/`. The boundaries config has no `port-check` area, and slices must not add one. The handler yields `McpReadStore` and passes it in, the same way `impact.run` does.
- **Read access:** `PortMatchStore` is `access: "read"`, but it takes screenshots and writes the PNGs two files away, as `CommentStore.inspectReference` does. The `read-service-io` rule does not see this.
- **Shared files touched:**
  - `main/live-layer.ts`: added `PortLive`. The port domain live was not wired, and before this `port.inspect` failed with "Service not found".
  - `review/index.ts`: one export line.
  - `preview/picture-diff/index.ts`: now also exports `diffPictures`, `pictureSheet` and their types.
  - `chat/copy.ts`: one block.
  - `chat/run-body-content.tsx`: one mount line.
- **`check:scripts`:** fails on `check-actions` because of rules O12, E16 and others in actions this pick does not own. `port.inspect` has no finding.
- **MCP snapshot:** `inspect_port` is a new tool name for the MCP snapshot diff.
