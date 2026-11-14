# Cycle 32 pick 2: first-launch

Branch `feat/first-launch`. Commits: `da3fa35cb` (bundle pure ESM packages), `71c3ce2a7` (early window, fast PATH), `0b98b22d3` (esbuild filter fix), `3b477f1fa` (lint counts).

## Profile on main before the changes

Packaged main, 10 first launches (`desktop-start.ts`, fresh user data, real HOME), Home usable p50 1054 ms. Marks p50: prepared 95, loginShell 224, serverSpawned 234, serverReady 738, readyToShow 913.

The 3 largest gaps:

1. **serverSpawned to serverReady:** about 480 ms (module load and evaluation).
2. **serverReady to readyToShow:** about 170 ms (renderer start, preload, first paint).
3. **prepared to loginShell:** about 130 ms (the spawn waits for `zsh -ilc`).

## Changes

- **Bundled packages.** `externalizeBare` now bundles `effect`, `culori`, `parse5` and `entities`, subpaths included. The rules live in the new `desktop/server-bundle.ts`. Stage fails with a `fix:` line when an external package needs `effect`. Result: the packed `server/node_modules` has none of the 4 packages. The `effect/...` strings left in `index.js` are code-gen text, not imports.
- **Window during server boot.** `runBoot` makes the hidden main window right after `serverSpawned`. It does not make it earlier, because a window made before the spawn delayed `serverSpawned` by about 50 ms. The window gets no URL until `serverReady` and the end of `firstRun`. `ready-to-show` still shows it, and `trackWindow` runs only when the studio URL loads. `failBoot` is not changed.
- **First launch PATH.** If `login-path.txt` does not exist, `toFirstLaunchPath` (`env.ts`) builds a PATH from `process.env.PATH`, the known folders that exist on disk and the `claude` folder. It returns null, and boot waits for the login shell as before, when `claude` is not found or `~/.nvm`, `~/.volta`, `~/.asdf` or `~/.local/share/fnm` exists. The login shell still runs in parallel and saves its PATH. That PATH reaches the server on the next launch; nothing restarts. The same promise feeds `restartIfClaudeMoved` and setup, so the first session cannot restart because the PATH changed.

## Measures (load average 6 to 10 from other agents)

This Mac has `~/.nvm`, so with the real HOME the branch waits for the login shell. To test the fast PATH, "fake HOME" runs used a HOME under `ds-wt` with no version manager folder and only `~/.local/bin/claude`. Main ran with the same HOME. Both apps were run back to back, 10 samples each.

| First launch, `desktop-start.ts` | Home p50 | Home p95 | serverSpawned | serverReady | readyToShow |
|---|---|---|---|---|---|
| main, fake HOME | 871 | 1424 | 107 | 581 | 755 |
| **branch, fake HOME** | **750** | 3519 (cold first sample; next highest is under 840) | 108 | 504 | 620 |
| main, real HOME (nvm) | 1009 | 1150 | 238 | 720 | 891 |
| branch, real HOME (nvm) | 837 | 887 | 224 | 596 | 715 |

Repeat launches use one user data folder, real HOME and 7 launches after a first one. The numbers come from `app.start` p50, measured with a throwaway harness that read marks from stdout:

- **main:** 704 ms (serverReady 494).
- **branch:** 575 ms (serverReady 433).

Target met: first launch p50 is 750 ms or less with no version manager. Repeat launch is not slower.

## Verified

- **Packaged branch app** (Playwright launch, mock agent):
  - Home is usable.
  - A prompt from Home made a project; the mock run finished in 5 steps and the project opened.
  - The shortcut sheet opened with `?`.
  - The server was killed by its PID, after a check of its command line. The restart dialog showed once and Restart worked: there is a new server PID, `GET /` returns 200, and the project reloaded.
- **`get_screenshot`.** On the packaged branch app launched directly, `call-action.ts workspace.getScreenshot` returned a PNG over HTTP, MCP and the agent. The 2 diffs are the expected result shapes, as in cycle 31. `call-action.ts project.create` passed.
- **Real HOME first launch (nvm present).** The fast PATH is off, and the server's `STUDIO_LOGIN_SHELL_PATH` has the nvm node folder.
- **`check-boot-imports.ts`** passes.
- **Checks.** `pnpm run typecheck`, `pnpm run lint:gate` and `pnpm run build:ui` pass.
- **Screenshots.** `cycle-32/first-launch/{home-dark,home-light,project-after-mock-run,shortcuts-dark,after-restart}.png`.

## Left out and notes

- **Shipped compile cache.** Not measured.
- **Attached fake Next dev server.** Not started, because no fake Next app with node_modules exists. The nvm node folder was checked on the server login PATH instead. The version manager path is the same code path as on main.
- **`get_screenshot` under Playwright.** When the packaged app is launched by Playwright `_electron`, `get_screenshot` times out after 30 s on `page.goto`. This happens on main and on the branch. A direct launch works.
- **Boot marks in telemetry.** The early window freezes the `--studio-boot` marks when it is made, so the `app.start` telemetry detail no longer has `serverReady`. `app.start` ms is still correct.
- **Files outside the pick list.** One new file, `desktop/server-bundle.ts`. No other pick owns it. `.claude/goal/roadmap.md` is not in the worktree, so Appendix A did not change.
