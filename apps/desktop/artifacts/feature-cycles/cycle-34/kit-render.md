# Cycle 34, pick 3: kit-render

Branch `feat/kit-render`. The prototype kit check now scans the rendered page, so it finds pills, buttons and cards that a `<script>` builds.

## What changed

- **Added `kit-drift-render.ts`.** It opens each page through the preview probe (`probeOnPage`, which reuses a warm peek page), reads `document.documentElement.outerHTML` after scripts ran, and gives it to the same pure engine. The timeout is 8 s. On an error or timeout, the scan falls back to the static file.
- **Added `engine/to-script-drift.ts` (pure).** The preview stamps each static element with `data-studio-loc`. A rendered find on an element with no stamp is script-built. Static finds keep their line. A script-built find gets `isScriptBuilt: true`, a `scriptText` (the longest run of its classes that is also in the file), and the line of that text in the `<script>`.
- **Added `isScriptBuilt`** (required boolean) to `KitDriftSchema`. App-source finds return `false`. Rewrote the `kit-drift.list` description (597 chars). `gen-routes` gave no generated diff.
- **Changed `prototype-kit-review.ts`.** A script group's line ends: "This markup is built by a script: change the template in the <script> of index.html (search for '...')". A skipped render adds one line. The note says "parts", not "controls". Repeated places are listed once.
- **Fixed the data-slot gap.** Button and Table finds pass only with all recipe base classes. `data-slot` alone no longer passes (when the base is empty, the slot alone still passes).

## Checks

- **call-action `kit-drift.list`** on the `kr-next` fixture prototype (`kr-fixture.html`). It passed on http, mcp and agent with 0 diffs.
  - Branch (`call-branch.txt`): 6 script-built pills and 6 script-built buttons (`isScriptBuilt: true`), 2 static pills and 1 `data-slot`-only button (`false`).
  - Main (`call-main.txt`): 2 pill finds.
  - The app-source path on kr-next passed (`call-app.txt`).
- **Kit note** (`kit-note-check.txt`): the script line with the search text, and the skipped-render line on the fallback path.
- **Real runs.** Prompt: "a visit list built from a JS array, 8 rows, with a status pill and a Reschedule button per row", beside kr-next. Both were scored with the branch `list_kit_drift`.

| | main | branch |
|---|---|---|
| First-pass kit finds | 0 | 17 |
| Fix loops | 0 | 1 |
| Hand-styled pills and buttons at end | 16 (8 + 8, all script-built) | 0 |
| Time, cost | 33 s, $0.12 | 76 s, $0.24 |

  - The gate passes: 0 hand-styled pills and buttons on the branch.
- **Screenshots:** `kit-render/run-note-{dark,light}.png` show the branch prototype and its check note.
- **Gates pass:** `pnpm run typecheck`, `pnpm run lint:gate` (59610 against baseline 89733) and `pnpm run build:ui`.

## Left out

- A script that only changes classes on a static element (it keeps its stamp). The static scan reports that element as it is in the file.
- Script-built finds have no canvas badge, because no element carries their place.
- The UI shows no "rendered scan skipped" state. Only the agent kit note says it.

## Files outside the spec list

- `components/kit-drift/{kit-drift-run.ts,kit-drift-store.ts,deps.ts}`: these pass the preview to the list path. The store reads it from the existing `viewportRuntime`.
- `components/kit-drift/engine/{index.ts,to-script-drift.ts}`: the new engine file and its export.
- `agent/final-check.ts`: one line, which passes `input.preview` to `listKitLines` (net zero lines).
- No other pick owns these files.
