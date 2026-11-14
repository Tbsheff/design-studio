# Cycle 36 pick 1: home-lean

Branch `feat/home-lean`. Home no longer preloads Studio code.

## Result

| Measure | main `79d75cc9f` | branch |
|---|---|---|
| B1 Home preload (check-bundle) | 1,059,038 B | 294,622 B |
| Home preload chunks | 107 | 33 |
| JS fetched by a cold Home load (decoded, p50 of 5) | 1,241,129 B | 556,998 B |
| Home ready (sample card visible), p50 of 5 cold loads | 62 ms | 60 ms |
| First contentful paint, p50 | 36 ms | 28 ms |

- Timing is on loopback with a warm server, so the byte cut shows little in ms. Over a slow disk or the packed app the 760 KB cut counts more.
- The 5 largest Home chunks now: `react` 222,320 B, `main` 13,251 B, `stream` 10,122 B, `keymap` 9,992 B, `http` 6,783 B.
- B1 chunk list for the merge step (33): main, preload-helper, react, desktop, use-latest, focus, find-element, live-store, telemetry, api-telemetry, api-core, http, json-guard, query, stream, pick, storage, ui-select-model, pick, router, index, global-commands, command-disabled, copy, keymap, app-events, project-nav, screen-preload, registry, keys, api-error, prototype-dialog, typing-target.
- check-bundle still exits 1, with 31 failures. All of them say a chunk name is "new to the Home preload set". The baseline lists only `index` and `react`, and the entry chunk is now named `main`. The byte check passes. `scripts/perf/baseline.json` is not changed (P10). The merge step must set B1 to 294,622 B and the list above.

## Cuts (one commit each)

1. `0645df6ae` Connect AI: `app/connect-ai-layer.tsx` loaded the `share-publish-ship-export` barrel statically. Its `exportApi` imports `canvas/index.ts`, which imports the whole canvas. This one edge cost about 730 KB. Now the layer imports the barrel with `import()` when the dialog opens, through a new `loadConnectAiDialog`.
2. `4e8001cbd` Commands: `commands/index.ts` has no value export of `useStudioCommands` or `useCanvasCommands` now. It exports `loadStudioCommands` and `loadCanvasCommands`, with the same shape as `moveRegion`. `use-studio-compose.ts` and `canvas-commands-host.ts` get the hook with a top-level await. They are in the lazy Studio chunk. The type export of `useStudioCommands` stays for `typeof` users.
3. `92350ac7b` Chat: `useAskChat` pulled `chat-slots.ts` into Home, and `chat-slots.ts` pulls the inspector barrel. It is now `loadAskChat` (top-level await in `use-studio-panes.ts`). `McpToasts` in `app-notice.tsx` loads the chat barrel with `import()` (`loadMcpToasts`). That takes about 5.7 KB off the preload. The chat barrel (about 27 KB, no canvas or inspector) loads after paint.
4. `3c2eee7d9` Code edit: `app-notice.tsx` no longer imports `codeEditStore`. The host loads the inspector barrel with `import()` (`importCodeEditHost`). It mounts on the first project open or the first file open, then stays mounted, so a stale target cannot come back. The file open from Mod+P calls `setCodeEditFile` (new, in `use-code-edit-target.ts`).

- I did not add `"sideEffects": false`. It was not needed.
- No action, tool or route changed, so there are no `call-action.ts` runs and the gen-routes output does not change. MCP and the chat agent do not load Home code.

## Checked

- Cold Home with a fresh data folder: no chunk that holds `features/canvas` or `features/inspector` code is on the Home preload path. Home's own lazy screen still fetches 2 small shared chunks: `swatches` (2 inspector files, 588 B) and `reference-url` (`canvas/variations-api.ts`, 995 B). They come from `features/home` imports, which I did not touch. Main loads them too.
- Mod+K on Home: 21 rows. In Studio: 96 rows.
- In the sample project, a click on the h1 opens the inspector.
- Mod+P, then Enter, opens "Edit source file" (Code edit host).
- Connect AI opens from the Home palette.
- Share, then "Create link", returns a link, and the share viewer page opens.
- No page errors. The Studio modules with a top-level await load with no deadlock.
- Screenshots: `cycle-36/home-lean/{home,project}-{dark,light}.png`.
- `pnpm run typecheck` passes, `pnpm run lint:gate` passes (59,612, baseline 89,733), and `pnpm run build:ui` passes.

## Outside the pick's file list

These files have no owner in the spec:
- `ui/app/connect-ai-layer.tsx`
- `ui/features/share-publish-ship-export/index.ts`
- `ui/features/chat/index.ts`
- `ui/features/inspector/use-code-edit-target.ts`
- `ui/app/studio/use-studio-panes.ts` (the `useAskChat` line only)

## Left out / open

- The share viewer showed no frame image. The UI sent `frames: ["f1"]`, and the server stored `frames: []`. This is server code that the pick does not touch. I did not compare it with main.
- The check-bundle chunk-name failures stay until the merge step sets B1.
- The margin under 300,000 B is 5,378 B. The next Home import over that fails B1.
