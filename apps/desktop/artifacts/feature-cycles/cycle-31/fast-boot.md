# Cycle 31 pick 2: fast-boot

Branch `feat/fast-boot`. Commits: `ea66b736c` (esbuild on first use), `cb999e619` (saved PATH, compile cache), `86485905e` (lint count back to baseline).

## Profile before the changes (packaged main, `dist/mac-arm64`, built 2026-11-14 05:25)

Server spawn to ready, packaged server alone: 401 to 562 ms (6 runs). CPU profile (`--cpu-prof`, mapped through `index.js.map`): 0 to 190 ms module load, compile and link; 163 to 390 ms module evaluation; `createServer` runs only 382 to 399 ms. Boot is load and evaluation, not store I/O.

Top 10 modules at boot (packaged, resolve hook count, then the time of `await import(pkg)` in the packaged runtime):

| Module | Files | Import time |
|---|---|---|
| effect | 247 | 85 ms |
| culori | 152 | 19 ms |
| zod | 95 | 17 ms |
| hono | 35 | 5 to 8 ms |
| jszip (+ readable-stream, pako) | 34 + 10 + 16 | 9 ms |
| pngjs | 22 | 4 to 6 ms |
| parse5 + entities | 19 | 6 ms |
| source-map-js | 11 | small |
| @babel/parser | 1 | 5 to 7 ms |
| esbuild | 1 | 3 ms (loaded at boot only because of the bug below) |

Top 10 boot tasks (inclusive CPU, one profile):

| Task | ms |
|---|---|
| Compile of the 8 MB `index.js` (`compileSourceTextModule`) | 87 |
| ESM resolve of external packages (`defaultResolve`, package.json reads) | 51 |
| `toSdkFromSchema` (agent tool zod shapes, built at load by `agent-tools/registry.ts`) | 50 |
| `mcp/index.ts` init, with `mcp/registry.ts` tool JSON Schemas (33) | 43 |
| `agent/legacy/agent-ops.ts`, `permissions.ts`, `lifecycle.ts` init | 21 |
| `handlers/_core/all-entries.generated.ts` and `publish/*` init | 20 |
| `createServer` in `main/public.ts` | 15 |
| `canvas/index.ts` init | 14 |
| `share/index.ts` init | 12 |
| `Schema.toJsonSchemaDocument` (inside the 2 registries) | 30 (shared) |

## Changes

- **esbuild on first use.** `platform/bridge-build/index.ts` now does `await import("esbuild")` inside `buildBridge`. The old dynamic import in `preview/bridge-bundle.ts` did nothing in the packaged app: esbuild inlined the relative module and hoisted its static `import { build } from "esbuild"` to the top of `index.js`. Checked: the branch `index.js` has no `from "esbuild"`, and the resolve hook shows 0 esbuild files at packaged boot. `desktop/build.ts` still awaits `buildBridge` (the pack ran).
- **Warm-up reads only the prebuilt bridge.** New `startBridgeWarmup` in `preview/bridge-bundle.ts` (exported from `preview/index.ts`, called in `main/public.ts`) loads `bridge.js` when it is packaged and does nothing in dev. Dev builds the bridge on the first frame instead. `public.ts` and `preview/index.ts` are outside the spec file list; each has a 1-line change.
- **Saved login PATH.** `desktop/env.ts` reads and writes `login-path.txt` in user data. `desktop/main.ts` starts the server with the saved PATH and still runs `zsh -ilc`, then saves its PATH. A new PATH reaches the server on the next restart. A first launch (no file) waits for the login shell as before.
- **Compile cache.** The packaged server gets `NODE_COMPILE_CACHE=<userData>/compile-cache`. Server boot alone: 421 to 358 ms median (5 interleaved pairs). Child processes of the server (Vite runner, app dev servers) inherit the variable and can write to the same folder.

## Measures (load average 5 to 10 from other agents, so the numbers are noisy)

`desktop-start.ts`, 10 samples each, back to back, fresh user data per sample (always a first launch):

| | Home usable p50 | p95 | serverSpawned | serverReady |
|---|---|---|---|---|
| main | 1060 ms | 1298 | 200 to 446 | 593 to 899 |
| branch | 1083 ms | 1515 | 194 to 501 | 684 to 1069 |

No change on a first launch, as expected: the PATH and compile cache live in user data.

Repeat launches with one user-data folder (own harness, 7 launches, p50 of launches 2 to 7):

| | Home usable p50 | serverReady |
|---|---|---|
| main | 898 ms | 611 to 664 |
| branch | 775 ms | 476 to 538 |

`check-boot-imports.ts` passes on the branch (fails on main with esbuild).

Targets not met: Home 600 ms and spawn to ready 200 ms. Spawn to ready is still about 400 ms.

## Verified in the running app

- Packaged branch app: Home usable; `POST /api/projects` with a mock run (run finished, 5 steps); project opened in the window; `GET /api/projects/:id/screenshot` returned a PNG (prebuilt bridge). Screenshots: `cycle-31/fast-boot/{home,project}-{dark,light}.png`.
- Dev server (`STUDIO_AGENT=mock`, port 4795): `call-action.ts project.create` passes (HTTP; MCP and agent are `legacy-*` off). `call-action.ts workspace.getScreenshot` is ok on HTTP, MCP and the agent; the 2 diffs are the expected result shapes (image object vs text). This frame load built the bridge through the lazy esbuild import.
- `pnpm run typecheck`, `pnpm run lint:gate` and `pnpm run build:ui` pass.

## Left out

- **Attached app route check** in the packaged app. Not run: it needs a fake Next app with node_modules.
- **Inline pure ESM packages in the server bundle** (`desktop/build.ts`, outside this pick): an experiment that bundled effect, culori, parse5 and entities cut server boot from 427 to 364 ms median. Recommended as a later slice.
- **Lazy tool registries**: `agent-tools/registry.ts` and `mcp/registry.ts` build about 75 ms of zod and JSON Schemas at load. They are hand aggregators (W12), so they are not changed here.
- **culori, jszip and pngjs defers**: these have 10 to 15 importers each, including `src/shared`; only culori costs more than 10 ms.
- **Window before server ready** (pre-warm the renderer during server boot): this needs `desktop/window.ts`.
