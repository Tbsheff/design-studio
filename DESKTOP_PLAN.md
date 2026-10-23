# Design Studio for macOS: desktop plan

**Recommendation:** Electron 44.x (P0 pins 44.9.3, Node 24.22.0). Run the existing Hono server unchanged in its own process, keep the UI on `http://127.0.0.1`, and ship separate arm64 and x64 builds.

## 1. Runtime inventory

| Dependency | Where | Desktop impact |
|---|---|---|
| claude CLI | The SDK runs its own native binary from `@anthropic-ai/claude-agent-sdk-<platform>-<arch>/claude`, not the user's `claude`. SDK 0.3.307 pins CLI 2.1.307. | 274 MB, signed by Anthropic (Team Q6L2SF6YDW, hardened runtime). Must sit outside asar and must not be re-signed. |
| Auth | Keychain login (no `~/.claude/.credentials.json`). `sdk-driver.ts` `buildEnv` passes all of `process.env`. | `claude auth status` with only `HOME` and `PATH` reports logged out; adding `USER` reports logged in. Keychain lookup needs `USER`. |
| Env leak in dev | `buildEnv` | Started from Claude Desktop, 30+ `CLAUDE_CODE_*` and `ANTHROPIC_BASE_URL` vars reach the agent. A Finder launch has none, so dev and packaged runs can differ. |
| git | `versions.ts` | `/usr/bin/git` is a stub that prompts to install Command Line Tools when they are missing. |
| npm | `projects.ts` (React template install) | A GUI launch has no npm on PATH; on this Mac `node` is an nvm shell function. |
| node (Vite children) | `vite-manager.ts` `fork`, minimal env, tsx loader | Under Electron `process.execPath` is the app, so the child needs `ELECTRON_RUN_AS_NODE=1`. The runner must stay a separate JS file. |
| Chrome | `browser.ts`, `scripts/dev-check.ts` (`channel: 'chrome'`) | Needs system Chrome. |
| `node:sqlite` | `taste.ts` | Needs Node ≥ 22.5. Electron 44.9.3 ships Node 24.22.0; P0 proved `DatabaseSync(':memory:')` works under `ELECTRON_RUN_AS_NODE`. |
| Repo-relative paths | `config.ts` (data dir), `app.ts` (dist/ui), `packs.ts`, `projects.ts` (templates), `bridge-bundle.ts` (esbuild at runtime), `axe.ts` | Break inside a signed, read-only bundle. |
| Home paths | `skills.ts` (`~/.claude`), `taste.ts` (`~/.design-memory`), tmpdir | Work as they are. |
| Env vars | `STUDIO_PORT`, `STUDIO_PREVIEW_PORT`, `STUDIO_VITE_PORT_BASE`, `STUDIO_DATA_DIR`, `STUDIO_AGENT`, `STUDIO_TASTE`, `STUDIO_CLAUDE_HOME`, `DESIGN_MEMORY_HOME`, `ANTHROPIC_API_KEY` | Main process sets the first four. |
| Ports | 4170, 4171, 5200+; `readPort` rejects 0 | Main process finds free ports before the server starts. |
| Origin and token | `/api/session` needs `sec-fetch-site: same-origin`; `allowedOrigins` = studio origin + `DEV_UI_ORIGINS`; token in a meta tag | Need an http origin. |
| Native modules | esbuild, rollup, lightningcss, tailwind oxide, fsevents, claude | Host-arch only: one build per arch. |
| Network | Google Fonts, Anthropic API, npm registry | Offline means no fonts and no agent. |

## 2. Shell comparison

| | Electron | Tauri + Node sidecar | Browser UI + menu-bar launcher |
|---|---|---|---|
| Node | Built in | Bundle node (~100 MB) | User's Node or bundled |
| Preview engine | Chromium, same as render checks; `*.localhost` works | WKWebView; differs from Chromium checks; `p-<hex>.localhost` may not resolve | User's browser; Safari risk |
| Render checks | Can move in-app (`webContents.debugger`) | Still needs Chrome | Still needs Chrome |
| Size (arm64) | ~600 MB unpacked | ~450 MB | Smallest |
| Sign and update | Known path | Good | Weak |

The 262 MB claude binary dominates every option, so Tauri saves little and loses preview fidelity. **Electron.**

Lessons from open-design's Electron app: electron-builder, asar off, one build per arch; entitlements `allow-jit`, `allow-unsigned-executable-memory`, `disable-library-validation`; sidecars via `ELECTRON_RUN_AS_NODE`; PATH from a fixed list of known folders, not a login shell; deep-link scheme in Info.plist; a renderer crash-loop breaker; local minidumps only.

## 3. Target architecture

```
Electron main (windows, menus, dialogs, render pool, first-run checks)
 ├─ server: ELECTRON_RUN_AS_NODE child → <Resources>/server/index.js   (Hono :4170, HTML preview :4171)
 │    ├─ Vite runners: fork(vite-runner.js) + ELECTRON_RUN_AS_NODE=1   (:5200+)
 │    ├─ git (/usr/bin/git when CLT is installed, else bundled dugite)
 │    └─ claude (app.asar.unpacked/.../claude-agent-sdk-darwin-<arch>/claude)
 └─ BrowserWindow → http://127.0.0.1:<studioPort>  (contextIsolation, sandbox, small preload)
```

- **UI loading:** loopback http. A custom protocol breaks `sec-fetch-site`, `allowedOrigins` and the bridge origin checks. `p-<hex>.localhost` preview origins keep working in Chromium.
- **Ports:** try 4170/4171, else a free pair; save it so origin-keyed localStorage survives. Drop `DEV_UI_ORIGINS` in packaged mode.
- **Navigation:** `will-navigate` and `setWindowOpenHandler` send external links to the default browser. Deny permission requests except clipboard.
- **Data:** `STUDIO_DATA_DIR` = `~/Library/Application Support/Design Studio/studio-data`. Imported folders stay in place; the Open Folder dialog grants access.
- **Resources:** new `STUDIO_RESOURCES_DIR` for ui, packs, templates and a prebuilt `bridge.js`.
- **npm:** ship a prebuilt React-template `node_modules` per arch, copied to `<data>/cache/react-template` on first run with the `.studio-installed` marker.
- **PATH:** fixed list of known folders; add `$SHELL -ilc` PATH (3 s timeout) only for runs with Bash or install allowed. PATH only.
- **Agent env:** allowlist `HOME USER LOGNAME PATH SHELL TMPDIR LANG`.
- **First-run screen** (each line with a fix button):
  1. `xcode-select -p` before any git call; offer "Install Command Line Tools" or bundled git.
  2. `<bundled claude> auth status --json`; if logged out, tell the user to run `claude` in Terminal (copy button).
  3. Disk space and network to `api.anthropic.com`.
  4. Design memory library found (optional).

## 4. Native features
- Menus: New Project ⌘N, Open Folder ⌘O, Open Recent, Undo/Redo routed to version undo when the canvas has focus, Run ⌘↵, Stop ⌘., View zoom.
- `app.addRecentDocument` and the Dock menu for recent projects.
- Drop a folder on the Dock (`open-file`) to import it.
- Notification when a run finishes or fails while the window is in the background (main subscribes to server SSE).
- `designstudio://open?project=<pid>` deep link in Info.plist.
- `requestSingleInstanceLock`; a second launch focuses the window and forwards its deep link.
- Window state per display; "Reveal in Finder" for work trees and exports.

## 5. Packaging and distribution
- **electron-builder** (DMG, zip, `signIgnore`, `afterSign` notarize hook, electron-updater).
- **Per-arch DMGs**, not universal (universal would carry two claude binaries, ~520 MB).
- **asar on** with `asarUnpack` for `@anthropic-ai/claude-agent-sdk-*`, `esbuild`, `@esbuild`, `@rollup`, `lightningcss*`, `fsevents`, the Vite runner and the template cache. Set `pathToClaudeCodeExecutable` to the unpacked path.
- **Signing:** Developer ID, hardened runtime, entitlements `allow-jit`, `allow-unsigned-executable-memory`, `disable-library-validation`. Claude binary in `signIgnore` so it keeps Anthropic's signature and Keychain identity. `NSDocumentsFolderUsageDescription`, `NSDesktopFolderUsageDescription`. Notarize with `@electron/notarize`.
- **Fuses:** keep `RunAsNode` through P3 (server and Vite runners need it). Later: server in main, Vite via `utilityProcess.fork`, then turn `RunAsNode` off.
- **Auto-update:** electron-updater, GitHub Releases or S3, zip updates (no deltas: each release ships a new claude binary). User chooses when to install.
- **Size:** ~230 MB Electron + 262 MB claude + ~80 MB deps and template cache ≈ 600 MB unpacked; DMG ≈ 250–300 MB.
- **Crash logs:** `crashReporter.start({ uploadToServer: false })`, rotated `logs/server.log`, "Save diagnostics…" menu item, renderer crash-loop breaker.

## 6. Phases

**P0: dev shell. Done.**
- Files: `desktop/main.ts`, `desktop/ports.ts`, `desktop/env.ts`, `desktop/server-process.ts`, `desktop/window.ts`, `desktop/navigation.ts`, `desktop/menu.ts`, `desktop/preload.cts`, `scripts/electron-dev.ts`, `playwright.desktop.config.ts`, `e2e/desktop.spec.ts`, `e2e/support/processes.ts`. Details in ARCHITECTURE.md, "Desktop shell".
- Run: `npm run electron:dev`. Test: `npm run e2e:desktop`.
- `vite-manager.ts` `childEnv` adds `ELECTRON_RUN_AS_NODE=1` when `process.versions.electron` is set. No other server change.
- The server child runs on Electron's Node (`process.execPath` + tsx loader), not `.bin/tsx`, whose `node` shebang would pick the PATH node.
- Ports: saved set, then 4170/4171/5200, then 4570+/8200+. It ran next to the terminal studio on 4170 with 4570/4571/8200.
- Data: `STUDIO_DATA_DIR`, else `app.isPackaged` → Application Support, else the repo `studio-data`.
- Exit evidence (2026-10-22):
  - `ELECTRON_RUN_AS_NODE=1 electron -e "…new DatabaseSync(':memory:')…"` printed `24.22.0`.
  - `e2e/desktop.spec.ts` 6/6: studio UI loads; HTML preview paints; mock create → run → version (2 runs, ≥ 2 versions); React h1 changed from a disk edit of `src/App.tsx` with the window marker kept (HMR, no reload); every Vite child is the Electron binary with `ELECTRON_RUN_AS_NODE=1`; one window; external `window.open` and navigation went to the stubbed `shell.openExternal`.
  - Server child env keys (`ps eww`, launched from Claude Desktop with 30+ `CLAUDE_CODE_*`): `ELECTRON_RUN_AS_NODE HOME LOGNAME PATH SHELL STUDIO_DATA_DIR STUDIO_PORT STUDIO_PREVIEW_PORT STUDIO_VITE_PORT_BASE TMPDIR USER`.
  - Dev launch with the default data dir listed the 15 existing projects.
  - After quit, no member of the server process group was alive.
  - Default `playwright.config.ts` suite: 37 passed with `STUDIO_E2E_GROUP=p0 STUDIO_E2E_PORT_OFFSET=1800`. Its global setup runs `build:ui` and `.bin/tsx src/server/index.ts`, so the new `"main"` field does not break the tsx path.
  - The spec sets `CLAUDE_CODE_P0_CANARY` and `ANTHROPIC_BASE_URL` canaries, so the env check holds from any shell. The React create ran `npm install` into a fresh `<data>/cache/react-template` from the Electron child.
  - A second launch 1 s into boot exited and the first kept one window.
- Left for P1: see "P0 notes for P1" below.

**P1: packaged, unsigned .app. Done.**
- Run: `npm run desktop:pack` (stage with `desktop/build.ts`, then `electron-builder --mac --arm64`). Output: `dist/mac-arm64/Design Studio.app`, `dist/Design Studio-0.1.0-arm64.dmg`, `…-arm64-mac.zip`.
- Layout: `app.asar` (109 KB) holds only the Electron main, the preloads and the first-run page. `Contents/Resources/` holds `server/index.js` and `server/vite-runner.js` (esbuild, ESM, packages external), `server/node_modules` (the 311 production packages copied from the repo tree, host arch), `ui/`, `packs/`, `templates/react-vite/`, `react-template/` (prebuilt template `node_modules`), `bridge.js`, `axe.min.js`. The server tree sits outside asar on purpose: real paths for Vite, esbuild, rollup and the claude binary, and no asar fs patch in the RUN_AS_NODE child. So `asarUnpack` is not needed.
- Size (arm64): app 1.0 GB unpacked (967 MiB); DMG 353 MiB (369.7 MB); zip 363 MiB (380.2 MB). Big parts: claude 273 MB, dugite git 170 MB (not ~40 MB), Electron ~250 MB, template cache 78 MB.
- Evidence (2026-10-22, all with temp data dirs):
  - `open -n "dist/mac-arm64/Design Studio.app" --stdout … --env STUDIO_DATA_DIR=… --env STUDIO_DESKTOP_USER_DATA=… --env STUDIO_AGENT=mock` (LaunchServices, the same path as a Finder double-click) logged `[desktop] window: studio http://127.0.0.1:4570` and no setup window: all required checks passed. Server env keys: `ELECTRON_RUN_AS_NODE HOME LOGNAME PATH SHELL STUDIO_AGENT STUDIO_CLAUDE_PATH STUDIO_DATA_DIR STUDIO_DESKTOP_USER_DATA STUDIO_GIT STUDIO_LOGIN_SHELL_PATH STUDIO_PARENT_PID STUDIO_PORT STUDIO_PREVIEW_PORT STUDIO_RESOURCES_DIR STUDIO_VITE_PORT_BASE TMPDIR USER`. Quit from AppleScript left no process.
  - Real run in the packaged app, launched through `_electron.launch` (not Finder; with the env allowlist the server and agent env are the same in both): imported a folder (`bakery site/index.html`), budget $0.50, Prototype, `claude-sonnet-5-5`. Completed in 42.5 s for $0.18. Two `render_check` calls and one fix loop; final check 0 high, 0 medium, 2 low; the chat shows the tool rows and the check result text.
  - Packed `claude`: `codesign -dv` → `Identifier=com.anthropic.claude-code`, `TeamIdentifier=Q6L2SF6YDW`, `codesign --verify --strict` passes. `auth status --json` with only `HOME USER LOGNAME PATH SHELL TMPDIR` → `loggedIn: true`, no Keychain prompt.
  - Packaged server under `ELECTRON_RUN_AS_NODE=1 "<app>/Contents/MacOS/Design Studio" <Resources>/server/index.js` (`STUDIO_E2E_APP`, group p1, offset 1900): default 37 passed, ac-core 7, ac-edit 19, ac-safety 10. A rerun of ac-core showed the listener on 6170 is the packaged `Design Studio` binary. The dev path (tsx, `npm start` code) also passed: default 37.
  - `e2e:desktop` against the packaged app (`STUDIO_DESKTOP_EXECUTABLE`) and in dev: 9 passed each. They include React HMR from the prebuilt template cache (no npm), the setup screen with forced dugite git plus an HTML create with versions, Check Setup… from the app menu, and a SIGKILLed server: one "The studio server stopped" dialog with the log path (stubbed to Restart), a new server on the same ports (stale lock taken over), and the page reloaded with a new token.
  - DMG mounted read-only: the packed claude still shows `TeamIdentifier=Q6L2SF6YDW`; the server booted from the mount and created an HTML project (2 versions) and a React project (Vite preview on its port) with no write into the bundle.
  - Lock: a second packaged server on the same data dir exited 75 with "in use by another studio server (pid …, http://127.0.0.1:4690 …)". After `kill -9` of the holder, the next server took over the stale lock. A clean stop removes `studio.lock`.
  - Watchdog: `kill -9` of the app main with a React project open → server and both Vite children gone in 2 s. Stale pid file: a server started in its own group and named in `userData/server.pid` was stopped by the next launch.
- Cost: two paid runs. The first stopped after 35 s because the script read a render_check file as a finished run (cost not recorded; under the $0.18 of the full run). The second is the run above.
- Found and fixed on the way: `GET /api/projects/:pid/runs` returned the `<runId>-check-<n>.json` render_check files as runs, and the UI crashed (blank page, `reading 'map'`) on reload of any project with a real run. The list now keeps only objects with `id`, `status` and `request` (`isRunSummary`).

**P2: Electron render pool instead of playwright and system Chrome. Done.**
- Files: `src/server/preview/render-backend.ts` (interface, `chooseBackend`), `render-playwright.ts` (system Chrome, the dev and test default), `render-electron.ts` (RPC client), `src/shared/render-rpc.ts` (messages), `desktop/render-pool.ts` (hidden windows + CDP), `desktop/render-rpc-host.ts` (IPC and socket host), `desktop/render-host.ts` (standalone host for tests), `e2e/support/render-host.ts`, `scripts/render-parity.ts`. `browser.ts` and `axe.ts` now use only `RenderPage`. Details in ARCHITECTURE.md, "Render backends" and "Render pool".
- Transport: the app forks the server with an `'ipc'` stdio slot and sets `STUDIO_RENDER_IPC=1`; the server sends render requests with `process.send`. No `--remote-debugging-port`. The render windows have no preload, own in-memory partitions, all permissions denied, and refuse the studio origin, so they never see the session token.
- Run: `npm run render:parity`; `STUDIO_E2E_RENDER=electron` for any e2e config.
- Parity (2026-10-22, `test-results/render-parity.json`, 7 fixtures + `g-after-polish.html` and two real pages from a local run (not in the repository), at 390/768/1440):
  - Pipeline (electron backend vs playwright driving the same Electron 44 engine): worst 0.228% (`pricing-generic` and `pricing-table-then-cards` at 390, where the page overflows and the full-page width is 438 vs 439 px); every other row 0.000%. Findings identical on all 9 pages.
  - Engine (system Chrome 156 vs Electron 44 = Chromium 152): 0.000–3.211%. Every differing pixel is on glyph edges (diff image checked), and long pages are 1–3 px shorter in 152, which shifts the text below. Findings: same on 4 pages, same except the `NxN px` sizes in messages on 5. This gap is the Chromium version, not the pool; it does not meet a literal "< 0.5% vs Chrome" and cannot without the same engine version.
  - `render-check-layout.spec`, `quality-checks.spec`, `g-escape-and-check.spec`: 8 passed on each backend. `quality.test` and `visual-diff.test` are pure logic (no browser) and pass in vitest.
  - A 20000 px page captured whole (8000 px segments, colors checked at 500, 8500 and 19500).
- Bundle trim: `desktop/build.ts` ships only what the server bundles import (esbuild metafile externals) plus their runtime dependency closure: 174 packages (was 311 from `npm ls --omit=dev`). Out: React, base-ui, markdown, Tailwind, `playwright-core` and other UI-only packages.
- dugite decision: **(a) slim it.** `node_modules/dugite/git` is 150 MB, almost all of it `libexec/git-core` helpers (git-remote-http*, perl/tcl GUIs, translations, docs). The studio runs local git only (init, add, commit, diff, ls-files, log, read-tree, write-tree, restore, rm, clean, config, archive, rev-parse, cat-file), all builtins of the main binary. The app ships `bin/git`, `libexec/git-core/git`, templates and `etc/gitconfig`: 6.9 MB. All 117 store and agent unit tests pass with `STUDIO_GIT` on the slim git; the forced-bundled-git e2e passes on the packaged app. Download-on-demand would need a network path and a checksum for a 7 MB file, so no. dugite is now a devDependency (build input only).
- Size (arm64), P1 → P2: unpacked 965 → 745 MiB; DMG 352.6 → 280.8 MiB (369.7 → 294.5 MB); zip 362.6 → 287.3 MiB. Left: claude 262 MB, Electron ~250 MB, template cache 80 MB, server modules 107 MB without claude.
- Evidence (temp data dirs only):
  - Real Prototype run in the packaged app (`_electron.launch`, imported `cafe site/`, `claude-sonnet-5-5`, cap $0.40): completed in 48.9 s for $0.23. Tools: render_check, screenshot ×2, Edit, render_check. Both check files say `backend: electron` for desktop and mobile; 10 PNGs written (checks, baselines, screenshot tiles), checked by eye. The chat shows the check result.
  - Playwright unavailable in the packaged server: with the app outside the repo (`/tmp/p2app`), `STUDIO_RENDER_BACKEND=playwright` gives `Cannot find package 'playwright-core'`. Inside the repo tree Node finds the repo's `node_modules` by walking up from `Contents/Resources/server`, so every packaged suite was rerun from the `/tmp` copy.
  - Packaged (`/tmp/p2app`, group p2, offset 2000): default 37, ac-core 7, ac-edit 19, ac-safety 10 (one timing assertion failed on the first try under load and passed on rerun), `e2e:desktop` 10 (new test: render_check through the app is `electron`, no Chrome in the server group, only the studio window visible).
  - Dev (tsx, playwright backend): default 37, ac-core 7, ac-edit 19, ac-safety 10, `e2e:desktop` 10. Vitest 331, typecheck clean.
  - Watchdog: `kill -9` of the packaged main → server gone in under 0.25 s (IPC disconnect; P1 polling took 2 s).
  - Packed claude still `TeamIdentifier=Q6L2SF6YDW`.

**P3: native features, auto-update, signing config. Code done; Developer ID signing, notarization and the in-place swap wait on the user (see "User steps for P3").**
- Files: `desktop/native.ts` (commands, links, recents, Dock, downloads, reveal, notifications), `desktop/menu.ts`, `desktop/server-link.ts` + `src/server/desktop-link.ts` + `src/shared/desktop-link.ts` (server → main run events and token over the existing IPC channel; no new HTTP route), `desktop/notify.ts`, `desktop/recents.ts`, `desktop/window-state.ts`, `desktop/updater.ts`, `desktop/notarize.cjs`, `desktop/preload.cts` (`onCommand`, `setContext`), `src/ui/desktop.ts`, `src/ui/useDesktopApp.ts`, `scripts/desktop-pack.ts`, `scripts/update-check.ts`, `scripts/clean-machine-check.ts`, `e2e/desktop-native.spec.ts`, `electron-builder.yml`. Details in ARCHITECTURE.md, "Desktop shell".
- Native features: all of §4 except "Undo/Redo" redo on the canvas (no version redo exists; Redo works in text fields only). Evidence, `e2e/desktop-native.spec.ts` 8/8 in dev and on the packaged app (menu items clicked with `getMenuItemById().click()`; Playwright key presses never reach menu accelerators):
  - Accelerators: ⌘N, ⌘O, ⌘Z, ⇧⌘Z, ⌘↵, ⌘.; Open Recent, Reveal Work Tree, Reveal Last Export, zoom in, out and reset are in the menu.
  - Open Folder (dialog stubbed) imports and opens the folder; a second Open Folder of the same path opens the same project (no second import); New Project goes home with the prompt focused; `recent-projects.json` and `app.addRecentDocument` get the folder.
  - `open-file`: a folder imports and opens; a file and a relative path send nothing.
  - `open-url`: `designstudio://open?project=../../etc` and an https link send nothing; a valid id opens the project. `second-instance` with a link in argv opens that project.
  - Undo: with the prompt focused, menu Undo undoes the typing and makes no version; with focus off text fields it makes an `undo` version.
  - Run from the menu sends the draft; Stop is enabled while it runs and cancels it (`canceled`, no notification). With the window minimized, a finished run fires one "Run finished" notification naming the project and prompt.
  - Reveal Work Tree reveals the work tree in the data folder; an export download lands in the downloads folder with its name and Reveal Last Export reveals it.
  - Window state: saved under the current display layout key.
- Auto-update, `scripts/update-check.ts` with 0.1.0 and 0.1.1 ad-hoc builds and a feed on `127.0.0.1:8799`:
  - Menu Check for Updates → `GET /latest-mac.yml`, `GET /Design Studio-0.1.1-arm64-mac.zip`, states checking → downloading 0.1.1 → ready.
  - A `[slow]` mock run was active: state `deferred` ("A run is in progress. Design Studio asks again when it finishes."), app kept running, run kept running.
  - The run ended: "Restart Now / Later" prompt; Restart Now → `installing` → electron-updater handed the zip to Squirrel.Mac.
  - **Stops here, as expected for ad-hoc builds.** Exact error: `Code signature at URL file://~/Library/Caches/dev.designstudio.app.ShipIt/update.3z8elBT/Design%20Studio.app/ did not pass validation: code failed to satisfy specified code requirement(s)`. An ad-hoc designated requirement is the cdhash, so no other build can satisfy it. The app showed "Design Studio could not install the update … keeps running the current version", stayed 0.1.0 on disk, and kept working. The swap needs two builds signed with the same Developer ID.
- Signing: `security find-identity -v -p codesigning` lists one valid identity, a Developer ID Application certificate that belongs to another organization's team, so it was **not** used: a signature and a notarization ticket would name that team as the publisher. All builds are ad-hoc with the hardened runtime. `CSC_IDENTITY_AUTO_DISCOVERY=false` keeps electron-builder from picking it up.
  - `codesign -dv --entitlements -`: app `flags=0x10002(adhoc,runtime)` with allow-jit and disable-library-validation; `Resources/git/bin/git`, `libexec/git-core/git` and `@esbuild/darwin-arm64/bin/esbuild` the same; claude `flags=0x10000(runtime)`, `Identifier=com.anthropic.claude-code`, `TeamIdentifier=Q6L2SF6YDW` (Anthropic's signature kept).
  - `codesign --verify --deep --strict --verbose=2`: `valid on disk`, `satisfies its Designated Requirement`.
  - `spctl -a -vv`: `rejected` (ad-hoc, not notarized; expected).
  - Notarize hook: `[notarize] skipped: STUDIO_NOTARY_PROFILE is not set`; with an ad-hoc signature it also skips.
  - `STUDIO_RENDER_HOST_MODE` is compiled out of release builds; packaged e2e suites now run their socket render host from the dev Electron.
- Hardened-runtime run (ad-hoc 0.1.0 from `/tmp/p3pack`, outside the repo): real Prototype run started from the Run menu on an imported `bike shop/` folder, `claude-sonnet-5-5`, cap $0.40: completed in 67.5 s for $0.29. Two render_check calls, both `backend: electron` at desktop and mobile; two screenshots; nine Edits.
- Clean-machine check (**simulated**, not a VM): `scripts/clean-machine-check.ts` with PATH `/usr/bin:/bin:/usr/sbin:/sbin`, `STUDIO_DESKTOP_GIT=bundled`, fresh data and userData, the setup screen forced, mock agent. Setup: git ok ("Bundled git"), claude logged in, disk ok, network ok, design memory found. HTML and React projects created (mock runs completed, React from the prebuilt template without npm), render_check `electron` at both viewports. Chrome is still installed on this Mac, but the packaged server has no playwright-core, so it cannot use it. CLT is installed too; forcing bundled git is the stand-in.
- Tests (group p3, offset 2100): vitest 349 (24 new), typecheck clean for P3 files. Dev: default 37, ac-core 7, ac-edit 19, ac-safety 9/10, `e2e:desktop` 18. Packaged (`/tmp/p3pack/v010`): default 37, ac-core 7, ac-edit 19, ac-safety 9/10, `e2e:desktop` 18 (one per-display-state failure on the first packaged run, fixed in the spec: it set bounds during the restore after a minimize).
  - AC-48 (`paint.p95` large vs small project) failed in both matrices. The machine load average was 24–86 from other apps. On reruns P3 passed 3 of 6 and the P2 commit (`ee4f9c2`, separate worktree) passed 2 of 5, so it is load, not P3.
- Size (arm64, ad-hoc): unpacked 749 MiB; DMG 280.4 MiB (294.0 MB); zip 286.9 MiB (300.9 MB). SHA-256 (test builds in `/tmp/p3pack`, not release artifacts): DMG `984dd057…bec31`, zip `bc705284…cfff4`, 0.1.1 zip `4e0dc9be…e3cff`.

**User steps for P3** (none of these was done for you; nothing was published)
1. Get a "Developer ID Application" certificate for the publisher of Design Studio (Apple Developer Program, $99/year; Xcode → Settings → Accounts → Manage Certificates → + → Developer ID Application).
2. Make an app-specific password at appleid.apple.com, then store the notary credentials in your Keychain yourself:
   `xcrun notarytool store-credentials "design-studio-notary" --apple-id "<your Apple ID email>" --team-id "<TEAMID>" --password "<app-specific password>"`
3. Build, sign and notarize in one command:
   `STUDIO_SIGN_IDENTITY="Developer ID Application: <Name> (<TEAMID>)" STUDIO_NOTARY_PROFILE="design-studio-notary" STUDIO_UPDATE_URL="https://<your update host>/design-studio/" npm run desktop:pack`
   The first codesign may show a Keychain "allow access" prompt for the private key; answer it yourself.
4. Check: `codesign --verify --deep --strict --verbose=2 "dist/mac-arm64/Design Studio.app"`, `spctl -a -vv "dist/mac-arm64/Design Studio.app"` (expect `accepted source=Notarized Developer ID`), `xcrun stapler validate "dist/mac-arm64/Design Studio.app"`.
5. Update swap: build 0.1.0 and `STUDIO_APP_VERSION=0.1.1 STUDIO_PACK_OUT=/tmp/v011` with the same identity, then `npx tsx scripts/update-check.ts "dist/mac-arm64/Design Studio.app" /tmp/v011` with both built against `STUDIO_UPDATE_URL=http://127.0.0.1:8799/`. Expect "app version on disk after: 0.1.1".
6. Publish `latest-mac.yml` and the zip to the update host when you choose to release.

**P4: Windows, then Linux**
- `npm.cmd` already handled; bundle git (dugite); NSIS installer, Authenticode; `win32-x64/arm64` claude packages; same e2e matrix on CI.

## 7. Decisions (decided 2026-10-22)
1. **claude binary: use the user's installed Claude Code** (changed 2026-10-23; P1 bundled the SDK's pinned binary). This removes 262 MiB from the app. `desktop/claude-cli.ts` finds it: `STUDIO_CLAUDE_PATH`, then the login-shell PATH and the fixed PATH folders, then `~/.local/bin`, `~/.claude/local`, `/opt/homebrew/bin`, `/usr/local/bin`, `~/.npm-global/bin`, the npm prefix. The setup check compares `claude --version` with the SDK's `claudeCodeVersion`: same major.minor passes, older fails ("Update Claude Code"), newer warns. Dev and tests keep the SDK's npm binary unless `STUDIO_CLAUDE_PATH` is set.
2. **Data: `~/Library/Application Support/Design Studio/studio-data`** for packaged builds, with Reveal in Finder and Export. The dev shell keeps the repo `studio-data` so existing projects stay visible; `STUDIO_DATA_DIR` overrides both. The switch on `app.isPackaged` is in `desktop/main.ts`, so P1 only changes packaging.
3. **git: Command Line Tools git when `xcode-select -p` succeeds, else bundled dugite** (P1).

## P0 notes for P1 (all handled in P1)
- Electron binary download: still true for fresh clones and CI (`npx install-electron`).
- Shared data dir: server lock file `studio.lock`; the shell asks before it uses a separate folder.
- npm in dev: from the fixed folders plus `npm_node_execpath`; packaged builds use the prebuilt template cache.
- Login-shell PATH: now only for agent runs with Bash or install allowed (`STUDIO_LOGIN_SHELL_PATH`).
- Hard crash of main: parent watchdog in the server, pid file cleanup on the next launch.
- Server exit after ready: dialog with Restart, Restart and Show Log, Quit.
- Saved ports and `window.open` behavior: unchanged, see P1 notes.
- Tsx from source: replaced by the esbuild bundle in packaged builds.

## P1 notes for P2 (handled in P2 unless marked)
- Trim `server/node_modules`: UI-only packages (`@base-ui/react`, `react-markdown`, `remark-gfm`, `class-variance-authority`, `tailwind-merge`, …) are in `dependencies` and ship (~40 MB). Move them to `devDependencies`.
- dugite is 170 MB per arch. Consider shipping it only in a "no CLT" download, or fetching it on first use.
- Render checks still need system Chrome through playwright-core (`channel: 'chrome'`). P2's render pool removes that.
- x64: not configured. `electron-builder.yml` has no x64 target on purpose, because `desktop/build.ts` copies host-arch `node_modules` (claude, esbuild, rollup, lightningcss, dugite). Add an x64 stage (x64 runner, or `npm ci --cpu=x64 --os=darwin` into the stage dir) first, then `--x64`.
- The dev-shell data-folder dialog only works once the terminal studio runs P1 server code (an older server writes no lock). It was not driven end to end (native dialog).
- The template cache install in `desktop/build.ts` runs without install scripts (no `allowScripts` in the template package). esbuild then uses its platform package; HMR works.
- `window.open` still always opens the default browser. Saved ports still win over 4170.
- Unsigned, ad-hoc linker signature only; Gatekeeper quarantine blocks a downloaded copy until P3 signs it.

## Coordinated changes in `src/server/agent` (done in P1)
- `pathToClaudeCodeExecutable` from `STUDIO_CLAUDE_PATH` through `SdkDriverOptions.claudeExecutable`.
- Env allowlist in `buildEnv`: `HOME USER LOGNAME PATH SHELL TMPDIR LANG ANTHROPIC_API_KEY` plus the proxy and CA variables (`HTTPS_PROXY HTTP_PROXY NO_PROXY NODE_EXTRA_CA_CERTS`).

## P2 notes for P3
- Packaged tests must run from a copy outside the repo (or the mounted DMG): inside the repo, Node module lookup climbs into the repo `node_modules` and hides missing packages.
- Engine gap: render results now come from Electron's Chromium (152 in Electron 44), not the user's Chrome. Visual-diff baselines made by an older playwright build differ by up to ~3% on text edges; regenerate baselines after the switch, and again on every Electron major.
- `STUDIO_RENDER_HOST_MODE=1` makes the packaged binary a render host on a unix socket (tests only). Consider dropping it from release builds or gating it behind a fuse-style build flag.
- Dev and test drivers (`scripts/dev-check.ts`, `scripts/ac-*/real*.ts`, `real-smoke.ts`) still need system Chrome; they are not shipped.
- x64: still not configured (see P1 notes). The slim git copy is host arch too.
- Fuses: `RunAsNode` must stay on (server and Vite). The render pool needs nothing extra.
- Signing: the slim `Resources/git/bin/git` and `libexec/git-core/git` need the Developer ID signature with hardened runtime; claude stays in `signIgnore`.
- (P3) Done: `STUDIO_RENDER_HOST_MODE` is compiled out of release builds; the slim git binaries are signed with the hardened runtime.

## P3 notes for P4
- The in-place update swap is unproven until two builds share a Developer ID (see "User steps for P3", step 5).
- A real clean VM (no CLT, no Chrome, new user) is still to do; P3 only simulated it.
- Version redo does not exist; the menu Redo works in text fields only.
- Windows and Linux: `second-instance` argv is the deep-link path there (done in `native.secondInstance`), `app.setAsDefaultProtocolClient` is needed at runtime (macOS uses Info.plist), and `open-file` does not exist (folders come in argv).
- electron-updater on Windows needs NSIS and a signed installer; the generic feed and `STUDIO_UPDATE_URL` work the same.
- Notifications use Electron's `Notification`; on Windows they need the AppUserModelID (`app.setAppUserModelId`).
- Updater caches go to `~/Library/Caches/design-studio-updater` and `dev.designstudio.app.ShipIt`.
