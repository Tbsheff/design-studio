# Feature cycle 32: next 5 features

Date: 2026-11-14. Main at `c851715be` (all 5 cycle-31 picks merged at `7850f4f3a`).

## Method

- Read `cycle-31.md` (picks, runners-up, Results "Open"), `cycle-31/{fast-boot,route-tw,port-look,paste-replace,polish-31}.md`, the runners-up and Results of cycles 25 to 30 (13 to 24 through their carried-over runners-up), `real-runs/report{,-2,-3}.md`, the tail of `.claude/goal/feature-log.md`, `git log --oneline -120` and `git branch -a`.
- Read the code that each pick changes: the agent tool scope (`agent-tools/registry.ts`, `mcp/registry.ts`, `mcp/agent-call.ts`, `platform/call-origin/index.ts`), the port review gate (`agent/port-review.ts` `toPortReviewGaps`), the SDK resume path (`agent/sdk-driver.ts`), the desktop boot (`desktop/{main,window,build}.ts`), the keymap (`shared/keymap.ts`, `shared/nudge.ts`, `contracts.ts` `selectMoveOf`, `bridge/keyboard.ts`), the kit drift union (`actions/kit-drift/schema.ts`).
- No real-model run and no boot measure for this research. The boot numbers are from `cycle-31/fast-boot.md`.

### Findings

- **First launch is the slow common path.** Fresh user data (every new install, every `desktop-start.ts` sample): Home usable p50 1060 to 1083 ms. A repeat launch is 775 ms because the saved PATH and the compile cache live in user data. On a first launch the server waits for `zsh -ilc` (190 to 400 ms), then for about 400 ms of module load and evaluation (effect 85 ms, culori 19 ms, zod 17 ms, the 2 tool registries about 75 ms). The window opens only after `serverReady` (`desktop/main.ts` `openWindow`). The cycle-31 experiment that bundled effect, culori, parse5 and entities into `index.js` cut server boot from 427 to 364 ms median. Pick 1.
- **Why the route-tw gate is not proven.** The branch run resumed the main run's SDK session (the app direction kept its `sessionId`). The agent wrote the files from memory with one Bash heredoc, so no edit tool reached `toolOrder`, `toPortReviewGaps` returned null (`hasEdit(toolOrder)` is false), and no studio check or values pass ran. Two product bugs, not only a test setup error: a second Move to app resumes the old session, and a Bash write skips the studio port check.
- **Why the in-app agent is refused `apply_port`.** In a run, `buildAgentTools` (`agent-tools/registry.ts`) drops `projectId` and `directionId` from the tool schema and `runActionCaller` (`mcp/registry.ts` `toScopedArgs`) fills them with the run scope. Only ids in `TARGET_SCOPED_ACTIONS` (`["port.inspect"]`, declared in `agent-tools/registry.ts`) keep `projectId` and get the run project as `targetProjectId`. `port.apply` is not in the set, so its `projectId` becomes the app project, and the write meets the active run (`assertCanEdit` in `direct-edit/commit/publish.ts`: `run_in_progress` unless `isOwnAgentRun`). Both registries are hand aggregators (W12), so the fix must not edit them. This cause is from the cycle-31 report plus a read of the code; it is not yet reproduced. `mcp/action-call.ts` only maps a `run_in_progress` wire body to `RUN_BUSY`, so the refusal comes from the handler path, not from a gate before it. `agent/tool-groups/agent-only.ts` (not a W12 aggregator) builds the in-run tool list with `buildAgentTools(runActionCaller(deps), tool)`, so a wrapping caller there can fix the call without touching the registries. Pick 2.
- **Figma gap.** `Mod+Arrow` does nothing. Figma resizes the selection with `Mod+Arrow` (1 px) and `Mod+Shift+Arrow` (10 px). `nudgeStepOf` (`shared/nudge.ts`) and `selectMoveOf` (`contracts.ts`) both return null on `metaKey`, and no keymap entry uses `Mod+Arrow`. Also `Mod+A` with a layer selected does nothing in the frame (`use-frame-selection.ts` line 70 selects frames only); Figma selects the siblings. Already built and dropped: create component (`create_component`), copy and paste style, hide and lock (eye and lock buttons), Alt measure, paste to replace, select matching, rulers, tidy up. Pick 3.
- **AI quality.** The kit check (`list_kit_drift`, `agent/prototype-kit-review.ts`) finds hand-styled buttons, inputs, labels and tables, but not cards (`KitDriftTagSchema` has no `card`). Open since cycle 29; runner-up 1 in cycles 30 and 31. Cards are the most common block in a dashboard prototype beside an app with a Card recipe. `list_kit_drift` is in no MCP snapshot, and snapshots hold no output schemas, so the union change needs no snapshot decision. Pick 4.
- **Small open items** (pick 5), all from cycle-31 "Left out":
  - `get_screenshot` makes one extra document request per app shot (`preview/dev-page-check.ts`), a second server render on `next dev`, data reads included.
  - After `Mod+Shift+R` on N layers, only the first new layer is selected.
  - An empty `photo-art.css` keeps its import in the JSX page.
  - `home-templates.tsx` reads `/api/starters` itself.
- **Not picked (user decisions or forbidden files):** panel rail, Home cuts, MCP snapshot refresh, frame fit to content (100vh), lazy tool registries (both registries are hand aggregators), the closed MCP request in a `get_run` wait (`mcp/registry.ts`), `Mod+]` and `Mod+[` (needs the DOM order against z-index decision).
- **Competitor recheck (2 web searches, 2026-11-14).** Nothing dated after the cycle-31 recheck. Figma: the design agent on the canvas is generally available with web search; Motion is in open beta. Claude Design: still reads a codebase or Figma file for the design system and hands off to Claude Code. Figma Make: GitHub push to repos. v0: API is generally available. No new item from Lovable, Bolt, open design, doop or Canva. Nothing changes the ranking. Figma's agent on the canvas keeps headless parity and fast manual keys as the bar.
- **Branch check.** No `feat/first-launch`, `feat/port-proof`, `feat/size-keys`, `feat/kit-cards` or `feat/polish-32`. Near names that exist and are not used: `feat/fast-boot`, `feat/route-tw`, `feat/kit-check`, `feat/kit-drift`, `feat/scale-handles`, `feat/polish-31`.

## Ranking

Score = value x fit with "simple and fast" / effort (1 to 5 each).

| Rank | Key | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|---|
| 1 | port-proof | Each Move to app starts a fresh session, a Bash write still gets the studio check, the in-app agent can call `apply_port`; a fresh real run proves 80 or more | 5 | 5 | 3 | 8.3 |
| 2 | first-launch | First launch to Home at 800 ms or less: window opens during server boot, pure ESM packages in the server bundle, no login shell wait on a first launch | 4 | 5 | 3 | 6.7 |
| 3 | kit-cards | The prototype kit check finds hand-styled cards and maps them to the app Card recipe (AI quality) | 4 | 5 | 3 | 6.7 |
| 4 | size-keys | `Mod+Arrow` resizes the selection, `Mod+A` selects the siblings of the selected layer (Figma) | 3 | 5 | 2 | 7.5 |
| 5 | polish-32 | Screenshot status with no extra page request, all replaced layers selected, empty art import removed, one starters read | 3 | 5 | 1 | 15 |

No pick adds an always-visible control:
- Pick 1 changes the port run and the agent tool scope.
- Pick 2 changes boot order and the server bundle.
- Pick 3 changes the kit check and its note.
- Pick 4 adds keys (shown only in the shortcut sheet).
- Pick 5 fixes existing paths.

---

## 1. port-proof: fresh Move to app sessions, studio check on any write, apply_port in the run

**Why.** The cycle-31 values pass scored 65 -> 95 with no model, but no real run proved it, because a second Move to app resumed an old session and wrote files with Bash, which skips the studio check. A user who runs Move to app twice on one app hits the same path. The in-app agent also cannot call `apply_port` during the run, so the tool works from MCP but not from the chat agent.

**Behaviour.**
- **Fresh session per Move to app.** A port run (`task` is the port task, `port.start`) never resumes the app direction's stored SDK session. It starts a new one and stores its id as usual. Normal chat runs on the app direction still resume. Find where `resume` is chosen for a run (`agent/lifecycle.ts` or the `sdk-driver.ts` setup) and put the rule there. `sdk-driver.ts` is 1622 lines: it must not grow (L2a); move a block out if a line must be added.
- **Studio check on any write.** `toPortReviewGaps` also returns the gaps when the app route files changed during the run, whatever tool wrote them: compare the route files (the files the plan names) against a git tree snapshot taken at run start. `agent/port-review-snapshot.ts` today snapshots only before each review step; this pick adds one run-start snapshot with the same helper. So a Bash heredoc write gets the first check, the values pass and keep-best.
- **`apply_port` in the run.** The in-app agent can call `apply_port` during a Move to app run and gets the same writes as the studio pass. It asks no second time, because the user confirmed the app edit when the run started (same rule as `runConfirmedAgentTool`).
  - Reproduce the refusal first (mock port run, mock agent calls `apply_port`) and write the real cause in the report.
  - Do not edit `agent-tools/registry.ts` or `mcp/registry.ts` (W12), and do not swap project ids inside the handler (the runner already authorized and scoped the `projectId` it got, T3 and W7).
  - Fix seam: `agent/tool-groups/agent-only.ts`. Pass `buildAgentTools` a wrapping `CallAction`: for `port.apply` in a port run, it sets `projectId`, `directionId` and `path` to the prototype from the run's port record (`agent/port-start.ts` writes it), sets `targetProjectId` to the run project, and calls through the allow answer inside `runAsAgent` of the run, as `runConfirmedAgentTool` does. Every other action calls `runActionCaller(deps)` as now. So the runner still decodes, authorizes and scopes the call.
  - The `apply_port` agent `short` text says that in a Move to app run it needs only `routePath`.
- No new UI. The run note already shows the pass and the loops.

**Headless.** No new action. `port.apply` (`apply_port`) and `port.start` (`start_port`) keep their schemas. If the `apply_port` `short` text changes, keep it 20 to 160 chars (E8) and run `pnpm exec tsx scripts/gen-routes.ts`. MCP callers see no change.

**Main files.** `agent/{port-review.ts,port-review-pass.ts,port-review-snapshot.ts,port-start.ts,mock-port.ts}`, `agent/tool-groups/agent-only.ts` (the wrapping caller), the run setup file that picks `resume` (`agent/lifecycle.ts` or `agent/sdk-driver.ts`, one of the two), `mcp/agent-call.ts` (only if the confirmed call helper must widen), `packages/common/actions/src/port/apply.ts` (text only).

**Verify in the running app.**
- New fake app `ds-wt/pp-next-tw`: Next 16, Tailwind 4.2, the cycle-30 run-2 `/patients` files (`cycle-30/route-pairs/real-run-2-rf-next-tw/`), `node_modules` as a dereferenced copy from `ds-wt/rf-new-tw` (read only). Never Bonaparte.
- No model, mock driver: a mock port run that writes with Bash only (add a `[port-bash]` mock tag in `mock-port.ts`) gets the studio check and the values pass (65 -> 95). A second mock Move to app on the same app logs a new session, not a resume.
- No model: in a mock port run, the mock agent calls `apply_port` with only `routePath`; the result has `applied` items and no `run_in_progress`.
- **Isolation.** The SDK session is stored on the app direction, and a main run fixes the app files. So each real run gets its own app copy (`ds-wt/pp-next-tw-1`, `-2`, `-3`, made from one prepared copy) and its own studio data folder. Before each run, call `port.inspect` with no model: the start score must be about 65; else rebuild the copy.
- **Real-model run (short, 3 runs):**
  1. main: Move to app of the route copy onto `/patients` (baseline score and loops).
  2. branch: the same; gate **studio score 80 or more** after the values pass, from a fresh session (the run log shows no `resume`).
  3. branch: the same with the prompt "Call apply_port, then inspect_port"; gate: the agent's `apply_port` returns `applied` with 1 or more items and no refusal.
  Report first and last port score, values written, loops, kept text edited or not, data reads kept, sample rows in `app/`, seconds and cost.
- Dark and light screenshots of the run note.

---

## 2. first-launch: first launch to Home at 800 ms or less

**Why.** Every new user and every new install sees the first launch: 1060 to 1083 ms to Home. Cycle 31 sped up only repeat launches (775 ms), because its gains live in user data. The window waits for the server, and the server waits for the login shell.

**Behaviour.**
- **Profile first.** On a fresh user data folder, record the boot marks (`loginShell`, `serverSpawned`, `serverReady`, `window`, `readyToShow`) for 10 samples on main. List the 3 largest gaps in the report before any change.
- **Window during server boot.** Create the main window (hidden) at the start of boot, and load the studio URL when `serverReady` fires. The Electron renderer start, the window state read and the preload then overlap the server boot. Keep `ready-to-show` as the show trigger, so the user never sees a blank or error page. If the server fails, the existing `failBoot` dialog runs as now.
- **No login shell wait on a first launch.** With no saved `login-path.txt`, start the server with `process.env.PATH` plus the usual tool folders that exist on disk (`/opt/homebrew/bin`, `/usr/local/bin`, `~/.local/bin`, the `locateClaude` folder), run `zsh -ilc` in parallel, save its PATH, and restart nothing: the new PATH reaches the server on the next launch (same rule as cycle 31). Say so in the report. If `claude` is not found with the fast PATH, or a version manager folder exists (`~/.nvm`, `~/.volta`, `~/.asdf`, `~/.local/share/fnm`), wait for the login shell as today, because attached app dev servers need the login `node`.
- **Bundle pure ESM packages into the server.** In `desktop/build.ts`, let `externalizeBare` bundle `effect`, `culori`, `parse5` and `entities` (the cycle-31 experiment: 427 -> 364 ms median). Keep native, binary and CJS-only packages external. Check that `copyServerModules` no longer copies the bundled ones, and that the packed app starts.
  - **One effect instance.** If an external package still imports `effect` or an `@effect/*` package, the server gets 2 copies, and Context tags and Schema checks fail at run time. Read the metafile: no external package may import `effect`. If one does, bundle it too or keep `effect` external.
- **Optional: shipped compile cache.** Measure if a `NODE_COMPILE_CACHE` folder made at pack time and copied to user data on the first launch is used by the packaged Electron Node. Keep it only if it cuts the first launch by 30 ms or more.
- Targets: first launch Home usable p50 **800 ms or less**; repeat launch not slower than 775 ms; `check-boot-imports.ts` passes.

**Headless.** No action or tool. Check that the first MCP call and the first agent run still work after boot.

**Main files.** `desktop/{main.ts,window.ts,env.ts,build.ts,boot.ts}`, `desktop/prune.ts` only if the module copy list must change. Do not edit `scripts/perf/baseline.json` (P10). Do not touch `agent-tools/registry.ts` or `mcp/registry.ts` (lazy registries stay a merge-step item).

**Verify in the running app.**
- `pnpm run desktop:pack` on main and on the branch. Run `STUDIO_DESKTOP_EXECUTABLE=... PERF_LABEL=<main|branch> PERF_DESKTOP_SAMPLES=10 pnpm exec tsx scripts/perf/desktop-start.ts` for both, back to back, with fresh user data per sample (first launch). Record the load average. Then 7 repeat launches on one user data folder for both. Report p50, p95 and the marks.
- In the packaged branch app: Home, open a project, `get_screenshot` over MCP, a mock run, the shortcut sheet. Kill the server process by PID once: the restart dialog shows and Restart works. On a first launch with `node` only on the login PATH (a version manager folder present), start an attached fake app dev server: it starts.
- `pnpm exec tsx scripts/check-boot-imports.ts` passes.
- Dark and light screenshots of Home after a first launch. No real-model run.

---

## 3. kit-cards: the prototype kit check finds hand-styled cards (AI quality)

**Why.** A prototype beside an app must use the app kit, so Move to app maps it to real components. The kit check catches buttons, inputs, labels and tables, but not cards. Dashboards and lists are mostly cards, so most hand-styled code in a prototype beside Bonaparte passes the check.

**Behaviour.**
- `KitDriftTagSchema` gets `card`. The markup drift engine flags a block element as a hand-styled card when the app kit has a Card recipe (`to-component-recipes.ts`) and the element has a border or shadow, a radius, a background and padding (as classes or declarations), holds 2 or more children, and is not already a kit Card (`data-slot="card"` or the Card component).
- The find names the recipe parts: `Card` with `CardHeader`, `CardTitle`, `CardContent` when the block has a heading first and content after.
- The prototype kit review (`agent/prototype-kit-review.ts`) lists cards with the other controls. Its fix prompt line says: "Replace the hand-styled card with the app Card (CardHeader, CardTitle, CardContent); keep the content." The fix loop rule stays as it is.
- Nested cards: flag only the outer block. A card inside a table cell is not flagged.
- No UI change. The finds show in the existing "Studio check" note.

**Headless.** No new action. `kit-drift.list` (`list_kit_drift`) returns `tag: "card"` finds; the tool is in no MCP snapshot, and its input schema does not change. If the `list_kit_drift` description must name cards, keep 20 to 600 chars (E10) and run `pnpm exec tsx scripts/gen-routes.ts`.

**Main files.** `packages/common/actions/src/kit-drift/schema.ts` (`KitDriftTagSchema`), `server/components/kit-drift/engine/{to-markup-drift.ts,to-drift-matches.ts,to-drift-splices.ts,types.ts}`, a new engine file for the card rule (`engine/to-card-drift.ts`), `server/agent/prototype-kit-review.ts`.

**Verify in the running app.**
- New fake app `ds-wt/kd-next`: Next 16, Tailwind 4, shadcn-style Card, Button, Input, Label and Table in `components/ui`. A prototype beside it with 4 hand-styled stat cards, 1 kit Card and 1 card in a table cell.
- No model: `pnpm exec tsx scripts/call-action.ts kit-drift.list '<json>'`: http, mcp and agent match; 4 card finds, 0 for the kit Card and the cell card.
- **Real-model run (short, 2 runs):** a new prototype beside `kd-next`, prompt "a clinic dashboard with 4 stat cards and a visit list", on main and on the branch. Main cannot see cards, so score both final prototypes with the branch `kit-drift.list` and no model. Report: hand-styled cards in the final prototype (gate: 0 on the branch), kit Card uses, fix loops, seconds and cost.
- Dark and light screenshots of the prototype and the run note.

---

## 4. size-keys: Mod+Arrow resizes, Mod+A selects siblings (Figma)

**Why.** Figma users resize from the keyboard: `Mod+Right` and `Mod+Down` grow the width and height by 1 px, `Mod+Left` and `Mod+Up` shrink them, and Shift makes it 10 px. Here they must open the inspector W and H fields. `Mod+A` with a layer selected selects its siblings in Figma; here it does nothing in the frame.

**Behaviour.**
- **Resize keys.** With one or more layers selected and no text field focused:
  - Plain CSS page: `Mod+Arrow` changes width or height by 1 px, `Mod+Shift+Arrow` by 10 px, from the measured size. A layer whose width is auto or fill gets a fixed width, as Figma does.
  - Tailwind page: each press steps the `w-*` or `h-*` class one step on the theme scale (`Mod+Shift`: 4 steps). Reuse the scale step code of the type keys (`c6fe0b535`, cycle 30); do not write new stepping logic.
  - The bridge calls `preventDefault` on `Mod+Arrow`, because `Mod+Up` and `Mod+Down` scroll the frame by default. `desktop/menu.ts` has no arrow accelerators (checked). Off the scale, it writes an arbitrary value (`w-[241px]`).
  - Key repeat makes one version per key release, not per repeat, the same as nudge.
  - On a frame root, on kept app text, or on a layer with no single source site: no change and a toast with the reason.
- **Select siblings.** `Mod+A` with a layer selected in the frame selects all the children of its parent (the layer included). With nothing selected, `Mod+A` selects all frames, as now. (`use-stage-keys.ts` line 189 handles only `Shift+A`, auto layout; checked.)
- Both keys show in the shortcut sheet only.

**Headless.** No new action. The resize writes the same style edit as the inspector W and H fields (`direct-edit.apply`, MCP `edit_element` with a style change), so MCP and the agent get the same result. Select siblings is UI-only selection state; MCP and the agent select with the existing selectors.

**Main files.** `shared/keymap.ts` (2 entries: `layer-resize` and `select-siblings`), new `shared/resize-step.ts` (pure: key to `{ dw, dh }`), `bridge/keyboard.ts` (forward `Mod+Arrow` and `Mod+A`), new `ui/features/inspector/{use-size-keys.ts,size-keys-model.ts}` (step and write, beside `use-element-nudge.ts`), `ui/features/inspector/copy.ts` (toast lines), `ui/features/canvas/use-frame-selection.ts` (keep frame `Mod+A` only when nothing is selected). If the bridge needs a new message type, add it in `packages/common/actions/src/bridge-protocol.ts`.

**Verify in the running app.**
- HTML prototype: select a card, `Mod+Right` 3 times: width +3 px; `Mod+Shift+Down`: height +10 px; one `Mod+Z` per release.
- Tailwind route copy in a fake app (`ds-wt/sk-next`): a `w-60` card goes to `w-64` with `Mod+Right`; the source diff shows the class.
- 3 selected layers resize together.
- `Mod+A` on a list item selects the 5 items of its list; `Esc`, then `Mod+A` selects frames.
- Over MCP: `edit_element` with the same width gives the same source diff.
- Dark and light screenshots of the shortcut sheet rows and the toast. No real-model run.

---

## 5. polish-32: small open items

**Items.**
- **Screenshot status with no extra request.** Read the status of the frame's navigation response inside `captureFrame` (`preview/capture.ts`) and fail the shot on 5xx or no answer there, and delete the separate document fetch in `preview/dev-page-check.ts` (keep its error text and the `app_doctor` hint). Same results as cycle 31: 5xx and down fail, 404 and a slow first compile do not.
- **All replaced layers selected.** After `Mod+Shift+R` on N layers, all N new layers are selected (`ui/features/versions-layers-tokens/use-structure-apply.ts` `settleStructure`).
- **Empty art import removed.** When `photo-art.css` is empty after a photo fill, the JSX page drops its import in the same write and undo step (`share/image-search/{photo-art-trim.ts,photo-art-jsx.ts}`).
- **One starters read.** `home-templates.tsx` takes the starters from the shared `use-starters.ts` store, not its own `api.starters()` call.

**Headless.** No new action or tool; `get_screenshot` keeps its schema and results.

**Main files.** Listed per item. No `copy.ts`.

**Verify in the running app.**
- Fake app `ds-wt/p32-next` (small node server, as `pl-next`): healthy shot returns the PNG, a 500 page returns the error text, a stopped server returns the proxy text; http, mcp and agent agree. The server log shows 1 document request per shot (was 2).
- Copy a card, select 3 boxes, `Mod+Shift+R`: 3 new layers selected.
- Photo fill on a JSX prototype with 2 art slots: no `photo-art.css` import left; undo brings it back.
- Open the template grid on Home with the network log: no new `/api/starters` request.
- Dark and light screenshots of the replaced selection. No real-model run.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 port-proof | `agent/{port-review.ts,port-review-pass.ts,port-review-snapshot.ts,port-start.ts,mock-port.ts}`; `agent/tool-groups/agent-only.ts`; one of `agent/lifecycle.ts` or `agent/sdk-driver.ts` (the `resume` choice); `mcp/agent-call.ts`; `actions/src/port/apply.ts` (text only) |
| 2 first-launch | `desktop/{main.ts,window.ts,env.ts,build.ts,boot.ts,prune.ts}` |
| 3 kit-cards | `actions/src/kit-drift/schema.ts`; `components/kit-drift/engine/*` and new `engine/to-card-drift.ts`; `agent/prototype-kit-review.ts` |
| 4 size-keys | `shared/keymap.ts`; new `shared/resize-step.ts`; `bridge/keyboard.ts`; new `inspector/{use-size-keys.ts,size-keys-model.ts}`; `inspector/copy.ts`; `canvas/use-frame-selection.ts`; `actions/src/bridge-protocol.ts` (only if a message type is needed) |
| 5 polish-32 | `preview/{capture.ts,dev-page-check.ts,frame-shot-read.ts}`; `versions-layers-tokens/use-structure-apply.ts`; `share/image-search/{photo-art-trim.ts,photo-art-jsx.ts}`; `home/{home-templates.tsx,use-starters.ts}` |

Shared files and conflict warnings:
- **No file is in two picks.**
- **`copy.ts`:** only pick 4 adds text (`ui/features/inspector/copy.ts`, the toast lines). No other pick edits a `copy.ts`.
- **Unions:** pick 3 adds `card` to `KitDriftTagSchema`. Pick 4 adds 2 members to the keymap id list (`KeyId`) and, only if needed, one bridge message type in `bridge-protocol.ts`. No other pick changes a union.
- **`@generated` lists:** no pick adds an action. Picks 1 and 3 change action text only if they must; each then runs `pnpm exec tsx scripts/gen-routes.ts`. Merge pick 1 first and run `gen-routes --check` after pick 3.
- **`src/server/agent/` (picks 1 and 3):** pick 1 owns the `port-*` files and the `resume` file; pick 3 owns only `prototype-kit-review.ts`. If the joined "Studio check" sentence must change, pick 3 changes only the sentence its own file returns and edits no shared note joiner.
- **`agent/sdk-driver.ts`:** pick 1 only, and only if the `resume` rule cannot live in `lifecycle.ts`; it must not grow (1622 lines, L2a).
- **`preview/` (pick 5) vs `desktop/` (pick 2):** no shared file. Pick 2 changes the server bundle; pick 5 changes server code. Re-run the pack after both merge.
- **Hand aggregators:** no pick edits `agent-tools/registry.ts`, `mcp/registry.ts`, `actions/index.ts`, `main/live-layer.ts` or `http/mount-all.ts`. Pick 1 fixes the in-run scope in `agent/tool-groups/agent-only.ts`, which is not an aggregator.
- **MCP snapshots:** no pick changes a tool input schema in `artifacts/mcp-snapshots/*.json`.
- **Fake apps under `ds-wt`:** pick 1 `pp-next-tw` and its run copies `pp-next-tw-1` to `-3`; pick 3 `kd-next`; pick 4 `sk-next`; pick 5 `p32-next`. No two picks share one. No pick writes into Bonaparte, and no Move to app run targets it.
- **`.claude/goal/roadmap.md` Appendix A:** add each pick's new files when the file is in the worktree (L6e).

## Merge order

All 5 can run at once. Merge in this order:
1. **first-launch**: boot and bundle changes first, so a bundling fault shows early and later checks use the new pack.
2. **port-proof**: the Bonaparte pick; port run, scope and snapshot changes.
3. **kit-cards**: the kit drift union; run `gen-routes --check` after it.
4. **polish-32**: preview, layers, image-search and Home files.
5. **size-keys**: keymap, bridge and inspector files; run `pnpm run typecheck` once more after it, because `KeyId` and the bridge messages are shared types.

After the last merge, run `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run check:scripts`, `pnpm run lint:gate`, `pnpm run build:ui`, `pnpm exec tsx scripts/check-bundle.ts` and `pnpm exec tsx scripts/check-boot-imports.ts`. Then `pnpm run desktop:pack` and the packaged `desktop-start.ts` measure (10 first-launch samples). Then one real-model session of 2 runs on merged main, each with its own fresh app copy and studio data folder (start score about 65 checked with no model):
1. Move to app of a fresh `pp-next-tw` copy's `/patients` route copy: first and last port score, values written, loops, data reads kept, seconds and cost.
2. A dashboard prototype beside `kd-next`: hand-styled cards left, kit Card uses.

Real-model checks (local Claude Code sign-in, short runs; Move to app only into a fake Next app under `ds-wt`, never Bonaparte):
- pick 1: 3 runs (main, branch, branch with `apply_port` from the agent), only after the no-model checks pass;
- pick 3: 2 runs (main and branch);
- the final merged session (2 runs).

Picks 2, 4 and 5 need none.

## Runners-up

1. Lazy tool registries: build the agent zod shapes and MCP JSON Schemas on first use (about 75 ms of boot); both files are hand aggregators, so the merge step does it.
2. Flow onto existing routes: Move to app of a flow still refuses routes that exist (route-apply "Left out").
3. Cold project open: about 11 reads each wait about 170 ms on the first open after boot; measure the blocking task on the server first.
4. Bring forward and send backward on `Mod+]` and `Mod+[`; needs the DOM order against z-index decision.
5. Port snapshot objects and plain CSS: `port-review-snapshot.ts` writes loose git objects into the app repo (write them into a studio-owned object folder, app objects as an alternate); and the plain CSS path of `port.apply`: build and check `rf-next-rt`; it is not known if a style edit lands as inline JSX style.
6. Photo slots from the image provider: when `create_image` has a key, offer generated images for art slots, as an opt-in cost.
7. Canvas memory (doop): a design note on the canvas that every new frame and run in the project reads.
8. Figma variables JSON import and export into project tokens.
9. Port look reads inline `style="font-family"` and follows `@import` in linked CSS (port-look "Left out").
10. Load `TodoWrite` up front, not behind `ToolSearch`; measure the first-draft time first.

Sources: [Figma release notes](https://figma.com/release-notes), [Figma What's new](https://www.figma.com/whats-new/), [Figma design agent on canvas](https://designcompass.org/en/2026/05-1tp-3tea/22/figma-design-agent-on-canvas/), [releasebot Figma updates](https://releasebot.io/updates/figma), [mcp.directory 2026 comparison](https://mcp.directory/blog/claude-design-vs-stitch-vs-v0-vs-lovable-vs-figma-make-2026), [refontelearning.com design-to-code tools](https://www.refontelearning.com/blog/ai-design-to-code-tools-figma-make-v0-lovable), [konigi.com Claude Design](https://konigi.com/articles/claude-design-has-the-incumbents-scrambling/).

## Results

- Merged with no conflicts, in order: first-launch, port-proof, kit-cards, polish-32, size-keys (main at c518923a1). No agent stopped to ask (the brief now allows unowned files).
- first-launch: first launch to Home 750 ms p50 with no Node version manager (main 871 ms, target 800 ms met); with ~/.nvm 837 ms (main 1009 ms); repeat launch 575 ms (main 704 ms). effect, culori, parse5 and entities are bundled into the server.
- port-proof: Move to app starts a fresh session; Bash-only writes get the studio check and values pass (65 -> 95 in mock); in-run apply_port works (cause on main: run scoping compared the app with itself, score 13); fixed no_base_version on a freshly attached app. Real-model 80 gate still not proven (2 real runs).
- kit-cards: hand-styled cards flagged with parts and the Card recipe; 0 finds after data-slot="card". Real runs built no cards, so the card fix loop is not proven live.
- size-keys: Mod+Arrow 1 px, Mod+Shift+Arrow 10 px, Tailwind class steps (w-60 -> w-64); Mod+A selects siblings.
- polish-32: get_screenshot uses the frame page status (2 requests per shot, was 3); Mod+Shift+R keeps all N new layers selected; empty photo-art.css import removed; Home makes 1 starters request.
- Checks: gen-routes --check pass, typecheck 0 errors, lint:gate pass (59605, baseline 89733), build:ui pass, check:clip 0 findings, desktop:pack pass.
- Installed app: :4570 returns 200. Server idle CPU 0.02 CPU-s/min over 60 s.
- Open: real-run proof for the port 80 gate and the card fix loop; the Layers panel highlights only the last selected row.
