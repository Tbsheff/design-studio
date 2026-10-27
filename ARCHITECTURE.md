# Design Studio — Architecture v0.1

Rule: **the filesystem owns the design. The agent edits it. The studio renders it.**

## Processes and ports

```
Browser (studio UI, http://127.0.0.1:4170; all origins use 127.0.0.1)
  ├─ REST + SSE  ──────────────►  Studio server :4170 (Hono, Node)
  │   x-studio-token header            ├─ ProjectStore   (project.json on disk)
  │                                    ├─ VersionStore   (shadow git, plumbing only)
  │                                    ├─ AgentRunner    (Claude Agent SDK query())
  │                                    ├─ EventBus       (seq log + SSE replay)
  │                                    └─ PreviewService
  │                                          ├─ HTML preview :4171, one origin per project (p-<hex pid>.localhost)
  │                                          └─ Vite child processes :5200+ (one per direction, kept alive)
  └─ <iframe> preview  ◄── bridge.js (postMessage, token-checked) ──► parent overlay
```

- The preview runs on another origin. It never sees the studio token, so it cannot call the API (AC-51).
- Each project has its own HTML preview origin: `http://p-<hex of pid>.localhost:<previewPort>`. Chrome resolves `*.localhost` to loopback. The pid is hex-encoded because nanoid ids have mixed case and `_`, which hostnames do not keep. The HTML server reads the `Host` header and returns 403 when the host's project is not the project in the path (`/d/<pid>/...`, `/s/<pid>/...`), and for project paths on the bare `127.0.0.1` host. Responses send `cross-origin-resource-policy: same-origin` and no CORS headers. The server listens on `127.0.0.1` and `::1`.
- The agent may not Write/Edit files that build tools run as code: `vite.config.*`, `vitest.config.*`, `postcss.config.*`, `.postcssrc*`, `tailwind.config.*`, `babel.config.*`, `.babelrc*`, `package.json`, `.npmrc`, `.yarnrc*`, `.pnpmfile.*` (basename at any depth, case-insensitive, also after realpath). `tsconfig*.json` is allowed.
- Each Vite dev server runs in a child process (`vite-runner.ts`, `child_process.fork`). Its env has only `PATH`, `HOME` and `TMPDIR` (a new temp dir) and `NODE_ENV`; no `STUDIO_*` or `ANTHROPIC_*` vars. The parent sends `init` (root, port, cacheDir, bridge script) and `notify` (changed files); the child sends `ready`, `failed` and `build-error`. The parent treats child messages as untrusted (shape check, length cap) and adds the project and direction ids itself. The child exits when the IPC channel closes. The child is not a filesystem sandbox: a project's own `vite.config.*` still runs as the user and can read absolute paths. The deny list above is the main control; the child keeps studio secrets in the env and server memory out of reach.
- The studio API checks `x-studio-token` and `Origin` on every request.

## Data on disk

`STUDIO_DATA_DIR` (default `<repo>/studio-data`):

```
studio-data/
  workspaces.json                saved work folders {version: 1, folders: [{id, path, label, addedAt}]} (zod-checked; bad entries dropped on read)
  trash/projects/<pid>-<time>/   deleted projects (whole projects/<pid> folder plus trashed.json)
  preferences.json               {version: 1, projectsDir?, onboardingDismissed?} the saved default projects folder (zod-checked; a bad file is ignored)
  telemetry.jsonl                app TelemetrySample lines with no project (app.start, frame.long on Home)
  projects/<pid>/
    project.json                 Project (contracts.ts)
    git/                         shadow GIT_DIR, shared by all directions of the project
      index-<did>                one index file per direction (GIT_INDEX_FILE)
    directions/<did>/            work tree for each direction (created projects + extra directions)
    snapshots/<commit>/          read-only materialized versions (for view/compare)
    runs/<runId>.jsonl           every StudioEvent for that run
    runs/<runId>.json            RunSummary
    events.jsonl                 project event log (seq order) for SSE replay
    telemetry.jsonl              TelemetrySample lines
    attachments/<id>.<ext>       user images
    thumbs/<versionId>.png       640x400 image of the main head (Home card)
    thumbs/v-<vid>.png           version row thumbnail, made on the first GET (Round 7)
    thumbs/diff-<a>-<b>-<w>x<h>.png  pixel diff mask for compare overlay (Round 7); v- and diff- files capped at the 200 newest
    version-names.json           user names for versions {vid: name} (zod-checked; a bad file reads as empty)
    comments/<did>.json          pinned comments per direction ({nextN, comments}, replies and drawings too); never in the work tree, so never in a version
```

- Project in a chosen folder (`POST /api/projects` with `parentPath`): the parent is realpathed and must be a folder outside the data dir. The store makes a new subfolder named `slugify(name)` (`src/shared/folders.ts`: ASCII `a-z0-9-`, max 48, `untitled` if empty) with a non-recursive `mkdir`; on `EEXIST` it tries `-2`, `-3` … up to `-999`, so it never writes into a folder that already exists. React gets the template and a `node_modules` symlink to the shared template cache in the data dir. Then it is registered like an import (`imported: {sourcePath, created: true}`): shadow git, snapshots, runs and attachments stay in `projects/<pid>/`, and the work tree (and the agent's file guard) is the new subfolder. `created` keeps the import differences off: the first version is "Starter template" and a pack wires `main.tsx` and the fonts link. A failed create removes only that new subfolder. The parent is added to `workspaces.json`.
- Default projects folder: the saved `projectsDir` in `preferences.json`, else `STUDIO_PROJECTS_DIR`, else `~/Design Studio` in the packaged app and `<repo>/studio-projects` in a dev checkout. `POST /api/projects` with no `parentPath` creates it with `mkdir -p` and then works like a chosen folder (readable subfolder, `-2`, `-3` …); it is not added to `workspaces.json`. `GET /api/workspaces` always lists it first as `{id: 'default', label: 'Design Studio', default: true}` and hides a saved copy of the same path; rename and delete refuse it. `PUT /api/workspaces/default {path}` changes it (same checks as a saved folder) and keeps the old one as a saved folder. Every e2e server and the unit tests set `STUDIO_PROJECTS_DIR` inside their temp dir, next to the data dir (a folder inside the data dir is refused).
- Hidden projects: a project with `imported: null` whose main work tree is in the data dir (made before the default folder existed). Home shows "N projects are in the app's hidden folder" with a Move button. `POST /api/hidden-projects/move` moves each one on its own, under the direction lock, and refuses one with a run going. It reserves a new subfolder, copies the main work tree into it (`verbatimSymlinks`, so `node_modules` stays a link), writes `project.json` with the new `workTree`, `imported: {sourcePath, created: true}` and a fresh agent session (`sessionResetReason: 'move'`, SDK sessions are keyed by cwd), then removes the old tree. An error before the `project.json` write removes only the new subfolder. Shadow git, snapshots, runs, extra directions and attachments stay in `projects/<pid>/`. `preview.release` drops the watcher and Vite child of the old root.
- Saved folders: `GET/POST /api/workspaces`, `PATCH/DELETE /api/workspaces/:id`. Add realpaths the folder, refuses files, missing paths and the data dir, and returns the saved entry for a path it already has. List marks a folder that is gone as `missing`. Delete only forgets the entry. Home shows the projects whose `imported.sourcePath` is inside each folder (path-segment match) and can filter the project grid by folder. The last Location lives in the UI store (`lastLocation`).
- Folder picker: the UI uses `window.studioDesktop.pickFolder` in the app, else `POST /api/pick-folder` (token and Origin like every route, plus `sec-fetch-site: same-origin` when sent). The server runs `/usr/bin/osascript` with `execFile` and the prompt and default folder as `argv` (`on run argv … choose folder`), one dialog at a time (409), 10 min timeout (504), error -128 = cancel (204), not macOS = 501 (the UI then shows the paste field). The picked path is realpathed. The text field stays as a collapsed "Or paste a path" fallback.
- Imported project: the `main` direction's work tree is the user's folder. Extra directions are copies in `directions/<did>/` with `node_modules` symlinked and their own Vite `cacheDir`.
- We never write into the user's `.git` or `vite.config.*`.

## Versions (shadow git, plumbing only)

Every git call sets `GIT_DIR=<pid>/git`, `GIT_WORK_TREE=<work tree>`, `GIT_INDEX_FILE=<pid>/git/index-<did>`. Never use `HEAD`.

- Commit: `git add -A` → `write-tree` → `commit-tree -p <head>` → `update-ref refs/heads/d/<did>`.
- Excludes (`git/info/exclude`): `node_modules node_modules/ dist/ .vite/ .studio/* !.studio/canvas.json .DS_Store`. `.studio/*` (not `.studio/`) lets the negation keep the canvas file in versions (see Canvas layout file). `node_modules` without a slash also matches the symlink in created React projects. The exclude file is rewritten on the first status or commit of each project after boot, and every stage step runs `git rm --cached node_modules`, so old repos drop it too. Export excludes `node_modules` from old commits.
- `status(paths?)`: the watcher passes the changed paths, and status runs `git add -A -- <paths>` and then `diff-index`. A full-tree add runs only when `paths` is undefined (API status calls), when there are more than 500 paths, or when the scoped add fails (ignored or missing path).
- Commit message: first line = title, then a line `studio-meta: <json VersionMeta>`.
- Undo / restore = new commit whose tree is the older tree. Nothing is lost (AC-31). First the index is reset to the head tree (no `-u`), then `read-tree -u --reset <target>`. So files that no version tracks (a user's own notes in an imported folder) stay on disk.
- `PUT design-md` commits only `DESIGN.md` as a `manual` version "Update DESIGN.md" (temp index from head), so it never shows as an unfinished change and never commits other unfinished files.
- New direction from version = new work tree + `read-tree -u --reset <commit>` + new branch (AC-35, AC-37).
- Interrupted run: no commit. `status` shows dirty files. User picks keep (commit) or discard (index to head, move untracked files to `projects/<pid>/trash/<timestamp>/<relpath>`, then `read-tree -u --reset <head>`). Discard never unlinks a user file (AC-14, AC-38).
- Export = `git archive --format=zip <commit>` (AC-56, AC-57).

## Agent runs

`query()` options (names checked against SDK 0.3.307 `sdk.d.ts`):
`cwd, settingSources: [], settings (isolation flags), strictMcpConfig: true, mcpServers: {studio: sdkServer}, tools, plugins, skills, canUseTool, hooks: {PreToolUse}, permissionMode: 'default', maxBudgetUsd (only when the project sets a spending limit), maxTurns, model, resume, includePartialMessages: true, abortController, systemPrompt (string)`.

- The studio does not set `allowedTools` itself: tools listed there skip `canUseTool`. The SDK `skills` option does add `Skill(<id>)` entries to it, and the CLI also auto-allows some read-only calls, so those calls reach only the `PreToolUse` hook. That hook runs the same `evaluateToolUse` check as `canUseTool`, so every call is still checked (smoke evidence: `hookDecisions` in `verification/skills-smoke.json`). `tools` limits which built-ins exist.
- The SDK loads on the first real run (`await import`), not at server boot.

- Use `fileURLToPath`, never `new URL().pathname` (spaces in paths become `%20`).
- Auth: the installed `claude` CLI login. No API key needed.
- Bash is off by default. `canUseTool` realpath-checks every path argument against the work tree.
- Bash path access is NOT sandboxed. The guard cannot check paths inside a shell command, so `cat /etc/hosts` or `echo x > ../file` run when Bash is on. That is why Bash is off by default. Turn it on only for trusted work.
- With `allowBash && !allowInstall`, a Bash command is denied when any token (split on whitespace, quotes and `; & | ( ) $ \``, basename) is `npm npx pnpm pnpx yarn bun bunx pip pip3 uv brew cargo gem corepack curl wget`, or `go get|install`, or when it has `sh -c`/`bash -c`, `eval`, `node -e`, `python -c`.
- Settings: `POST /api/projects {settings}` and `PATCH /api/projects/:pid/settings` accept `model`, `maxBudgetUsd` (0.01..50, or `null` = no spending limit, the default), `maxTurns` (1..200), `allowBash`, `allowInstall`, `disabledSkills` (skill ids, zod, strict), `defaultLevel` (`wireframe|prototype|polish`).
- Attachments: only png, jpeg, gif and webp (mime and extension). Others get 400.
- `STUDIO_AGENT=mock` replaces the SDK with a scripted runner (tests, latency benchmarks). The mock emits a `Skill` tool call for each `[skill:<id>]` tag or `Use the <id> skill.` line in the prompt.

## Run levels

Each run has a level, independent of Edit/Critique: `RunRequest.level`, else `project.settings.defaultLevel` (default `prototype`). `startRun` writes the resolved level into the request, so `run.started`, `RunSummary.level` and the run version's `meta.level` always have it. `POST /api/projects {level}` sets the first run's level. `POST /api/projects {startRun: false}` (zod boolean, default true) creates the project the same way (settings, pack, DESIGN.md, React starter) but starts no run and returns `{project, runId: null}`.

One table, `src/shared/run-levels.ts` (`LEVEL_PRESETS`, `resolveRunConfig`), sets model, turns, checks and critic per level. Runs have no spending limit unless the project sets one. The project settings are ceilings and the model source:

| | wireframe | prototype | polish |
|---|---|---|---|
| model | `claude-haiku-5-5` (always) | project model | project model (Opus if the project says so) |
| turns (runaway guard per segment) | 12 | 30 | 40 |
| typical cost (hint, not a limit) | usually ~$0.01 | usually ~$0.30 | usually ~$0.50 to $1.50 |
| skills | off (no `<recommended-skills>`, `Skill` denied by `canUseTool`) | top 3 recommended | top 3 recommended |
| taste | layout and behavior rules only | all | all |
| render_check | errors, layout and nav-mobile, desktop + mobile | + quality checks, desktop + mobile | + quality checks at 1440 / 768 / 390 |
| screenshots, loops | none; one fix for errors or a high nav-mobile | mobile then desktop, 1 loop, fix high | 3 sizes after every fix round, critic, studio-enforced loop (below) |

Turns are `min(preset, project setting)` (project default 40). Spending: `ProjectSettings.maxBudgetUsd` is `null` by default (Settings field "Spending limit per run", empty = "No limit"). With `null`, the driver passes no `maxBudgetUsd` to the SDK (first segment, continuations and resume retries), the critic call has no cap, tool results carry no budget line, and the prompt and `decideLoop` drop the 20% budget stop. When a limit is set, it is the run limit at every level: the SDK gets the limit (less 2 x $0.15 critic reserve for polish) plus the prior session cost on resume, the critic gets $0.15 per call, the 20% stop applies, and an SDK `error_max_budget_usd` maps to `budget_exceeded` ("Spending limit reached"). Migration: `readProject` reads a stored `maxBudgetUsd: 2` (the old default) as `null` when the project has no `settingsVersion`; every write stamps `settingsVersion: 2`, so a $2 limit set later keeps, and custom values never change. Wireframe ignores tokens and fonts on purpose: its block says grayscale, system fonts, real labels, no images, and that this overrides the design-system rules for that run.

- **Cache rule:** the system prompt is the same at every level (same skill count, full taste block, same MCP tools). The level text goes in a `<run-level>` block in the user message, so a Prototype → Polish resume keeps the prompt hash and sends no `<updated-instructions>`. Message order: `<updated-instructions>` (resume only), `<run-level>`, `<recommended-skills>`, request. A unit test checks one system prompt across the three levels.
- **Tool-first checks:** `render_check` runs everything in one page load per viewport, all viewports in parallel. Quality findings are `{check, severity high|medium|low, viewport, selector, source, message, fix}`, at most 8 per check (the rest counted in `qualityOmitted`), with `timingsMs`:
  - `a11y`: axe-core (`axe.min.js` read from node_modules, run with `page.evaluate`, so a page CSP does not block it) with a short rule list (contrast, alt, labels, names, heading order, landmarks, lang, lists, aria). serious/critical = high. Desktop and mobile only.
  - `tap-target`: interactive elements under 44x44 px at tablet and mobile; under 24 px = high. A `::after`/`::before` absolute hit area counts; inline links in running text are exempt.
  - `placeholder`: visible text matching lorem/ipsum/TODO/TBD/to come/will be added/placeholder/sample data|timings/example.com|org, and email addresses on the reserved `.example` domain. Prototype medium, polish high; `data-sample` on an ancestor lowers it to low.
  - `tokens` (design-system projects): raw colors that snap to a token (`token-match.ts`) and px/rem sizes and spacing that equal a token, with `file:line`.
  - `nav-mobile`: desktop shows 2 or more nav links, a smaller size shows fewer than 2 and has no menu control (`aria-expanded`, `aria-controls`, or a "menu" name) = high. It cannot see a nav deleted at every size; the prompt rule covers that ("never remove navigation to fix a cut-off nav").
  - `generic-layout` (prototype and polish, desktop): DOM heuristics in the quality probe. `plan-cards` = a row of 3 children of equal width (within 12%) and top (within 48 px), at least 2 with a price, and the middle one filled (other background) or raised (taller, higher, transform or other shadow), and no table above the row (a table-first layout passes); the message adds "then a comparison table" and "then an FAQ" when those come below. `hero-feature-cards` = 3 equal cards with headings, no prices, within 900 px below the h1. `all-centered` = 4 or more h1/h2 and 80% of them centered. Medium, with a content-fitting change as `fix`. It does not count for the loop stop rule, so one layout change per run is enough.
  - `visual-diff` (follow-up edits): when the run starts, the driver shoots the current preview at desktop and mobile. The SDK query starts at the same time and does not wait for these shots. The PreToolUse hook holds every tool that can change the preview (all tools except Read, Glob, Grep, Skill, screenshot, render_check and design_review) until the baseline is done or the run is canceled, so the baseline always shows the page before the first edit. The hook matcher timeout is 300 s. Each check compares with pixelmatch, masks the selected elements (by `data-studio-loc`) and reports the changed share and 200 px bands. When the page height changed, it compares only the part above the selection. A selection edit with 1% or more change outside the selection = medium.
  - When the project sets a spending limit, every tool result ends with "Budget: about $X of $Y used, N% left" from the stream's usage estimate plus the critic cost, so the 20% stop rule can work. With no limit, the line is left out.
  - `duplicate-content` (prototype and polish, every checked size): per viewport, visible repeated facts. Prices = currency amount plus its period (`$15/mo`, `/yr`, `/user`), keyed by amount and period, so a plan name with its price counts as the price. CTAs = `a[href]`, `button`, `[role=button]` with the same accessible name and the same action (href, `data-plan`, `value`, or the nearest heading above), outside nav, header, footer, summary, tablist and radiogroup. An element does not count when it is hidden (display, visibility, aria-hidden), smaller than 2 px, clipped away by an overflow ancestor, inside a closed `<details>`, or inside `[data-studio-repeat]` (opt-out for a functional repeat). A mobile-only block and a desktop-only block never meet, because each viewport is probed alone. Medium, with text, count, selectors and source locations. Unlike generic-layout, it blocks the polish loop. Fixture: run g's page (`e2e/fixtures/pricing-doubled.html`) flags all three prices at desktop; a cards-on-mobile, table-on-desktop page passes.
- **Critic (polish):** `design_review` starts a separate `query()` with no resume, `persistSession: false`, `tools: []`, `mcpServers: {}`, `settingSources: []`, its own system prompt, `maxTurns: 1`, and a $0.15 cap only when the project sets a spending limit. Input: fresh desktop (3 tiles) and mobile (2 tiles) screenshots from y=0, the latest render_check findings (without visual-diff notes), the taste rules and the request. Its rubric includes distinctiveness: a stock template for the content gets one `generic-layout` issue (medium) whose fix is one concrete layout change that keeps the content. Output: zod-checked JSON `[{severity, area, where, problem, fix}]`. At most 2 calls; below polish it returns an error. Its cost goes into `RunSummary.costUsd` and `criticCostUsd`, never into the session ledger, so the next resume still subtracts only the SDK session cost.
- **Polish loop (enforced in code, `polish-loop.ts`):** the run keeps a `LoopLog` (tool order, each render_check's severity counts and high/medium findings, each screenshot's size). Layout changes follow a merge rule (prompt and critic rubric): content moves into the new structure, the old blocks go, each fact shows once per viewport, none is dropped. A fix loop = a render_check with an edit since the check before it. When a segment ends, `decideLoop` stops the run only when: (a) a spending limit is set and less than 20% of it is left (segment costs + critic vs the limit), or (b) the last render_check came after the last edit, every level size (390/768/1440) has a screenshot after the last edit, and either no high or medium finding is left (generic-layout and visual-diff do not count) or 3 fix loops are done. Otherwise the driver resumes the same session with a short `<studio-continue>` user turn: missing checks, missing sizes, the remaining findings (at most 8), "no fix loops left, do not edit" after 3 loops. At most 4 continuations. Each turn is logged as a `run.sent` line with `continuation: n`. Cost, usage, model time and duration of all segments add up in the one run (cost by the SDK session total). `maxBudgetUsd` is the same for every segment, so the whole run stays under the level cap. The final reply gets a `Studio check log:` line (loops, findings per check, stop reason), and `RunSummary.loop = {loops, continuations, stopReason, steps}`. render_check also prints "Fix loop n of 3 done. Required next: …" in polish runs.
- **Mandatory final check:** after the stream ends (prototype and polish edit runs with a file edit), the driver checks whether `render_check` ran after the last Write/Edit. If not, the studio runs it and saves `runs/<runId>-check-final.json`. `RunSummary.finalCheck = {ranBy: 'agent'|'studio', errors, high, medium, low}`.
- The first mobile screenshot of a run always starts at y=0, whatever `from` the agent asks for.
- UI: one composer row (attach, skills, Run settings, key hint, Send). The Run settings button shows the current choice ("Edit · Prototype", "· 3 designs" only when Send fans out) and opens a popover (`RunSettings.tsx`, `role=dialog`) with three radio groups: Mode (Edit/Critique), Level (Wireframe / Prototype / Polish) and Designs, each with a visible hint line (the level hint is the preset hint). Radio groups use roving tabindex with arrow keys and Home/End (`useRovingRadioGroup` in `LevelControl.tsx`). The level is saved per project as `defaultLevel`. The run chip and version rows show the level. "Polish this" is offered only on the head version (version row and the chat under a finished wireframe or prototype run); it does not restore an older version, because a silent restore forks history. Restore first, then polish the new head.
- Wireframe also runs the nav-mobile probe (no axe or other quality probes); its block lets it fix a high nav-mobile finding once.
- Mock agent: after a whole-page edit it emits the level's tool calls (wireframe: render_check; prototype: render_check, 2 screenshots, render_check; polish: render_check, 3 screenshots, design_review, render_check).

## Claude skills

The design agent gets the user's own Claude skills. It does not get the rest of the user's Claude Code setup.

```
~/.claude/skills/<name>/SKILL.md ─┐                      (STUDIO_CLAUDE_HOME overrides ~/.claude)
enabled plugin skills ────────────┤  discoverSkills()  src/server/agent/skills.ts
  settings.json enabledPlugins    │    (every run start and every GET /api/skills)
  + plugins/installed_plugins.json│
                                  ▼
<dataDir>/skills-plugins/<plugin>-<hash>/
  .claude-plugin/plugin.json     {name, version, description} only
  skills/<name> -> symlink to the real skill folder
                                  ▼
query({ settingSources: [], plugins: [{type:'local', path, skipMcpDiscovery: true}, ...], skills: ['personal:x', 'plugin-name:y', ...] })
```

- Where they come from: personal skills are the folders in `~/.claude/skills` that have a `SKILL.md` (dot folders and `synced/` are skipped). Plugin skills come from each plugin that `~/.claude/settings.json` `enabledPlugins` turns on and that has a user-scope install in `~/.claude/plugins/installed_plugins.json`: its `skills/*/SKILL.md` and the paths in its manifest `skills` field. `@builtin` plugins are skipped. Plugin commands, agents, hooks and MCP servers are never loaded.
- Scan cost: each scan lists the folders, `settings.json` and `installed_plugins.json` again, so an added, removed or turned-off skill shows on the next run or `GET /api/skills`. It stats and reads the SKILL.md files in parallel and keeps the parsed result per file, keyed by mtime, ctime and size, so it reads only new or changed files. The catalog order stays the folder order. 85 skills: about 22 ms before (serial reads), about 5 ms on a cold scan and about 2 ms on a warm scan now.
- Ids: `personal:<folder>` and `<plugin name>:<folder>`. The SDK `skills` option gets exactly the ids that are on, so the CLI hides every other skill and the Skill tool rejects it.
- Manual-only skills: a SKILL.md with `disable-model-invocation: true` stays in the list, but the CLI refuses it in the Skill tool (smoke run `manual-only-skill`). The composer picker leaves these out, the checklist marks them "manual only", and the prompt count skips them.
- Not loaded: claude.ai synced skills (`~/.claude/skills/synced`, turned off with `syncClaudeAiSkills: false`), plugin slash commands, Codex `.system` skills, and folders with no SKILL.md (listed in `problems`).
- Isolation: `settingSources: []` stays, so the user's CLAUDE.md, settings, hooks and MCP servers do not load. The studio never passes a user plugin directory to the SDK. It generates a plugin that has only symlinked skill folders. The `settings` flag layer sets `disableBundledSkills: true`, `syncClaudeAiSkills: false`, `syncClaudeAiPlugins: false`, and turns off the built-in `cc-plugin-agents-md` and `cc-plugin-plugin-authoring` (a probe with `settingSources: []` showed `cc-plugin-agents-md` loads no AGENTS.md memory either way, so imported projects see no change). The CLI still lists two built-in skills (`design`, `doctor`) in `init.skills`; they are not in the `skills` list, and the PreToolUse guard denies a Skill call for any id that is not on.
- Evidence: `verification/skills-smoke.json` (run `npx tsx scripts/skills-smoke.ts`). It records the SDK `init` message: user skills listed, MCP servers (`studio` only), plugins (the generated ones plus any the user has enabled), no hook events, no memory files, no `Agent` tool.
- Permissions: `Skill` joins the tool list (edit and critique) when at least one skill is on. Read, Glob and Grep may use an absolute path inside the real folder of a skill that is on. Writes there are denied. Everything else outside the work tree stays denied.
- Prompt: one `## Skills` section with the count. The agent loads only the skills in the `<recommended-skills>` block (unless one clearly does not fit) and any skill the user names (`Use the X skill.` or `[skill:X]`). It loads no other skill, even when its description matches. Each skipped Skill call saves one model round trip and the tokens that the skill text keeps in context. When Bash is off, a skill that needs a shell still loads for its guidance; the agent skips only its shell steps.
- Recommended skills (prototype and polish only): `skill-match.ts` scores each enabled, model-invocable skill (name + description terms) against the request prompt, a mode word and a fixed UI-design query. UI words weigh 2, `design` 1, a name hit adds 1; score >= 6; ties sort by id; top 3. The ids go in a `<recommended-skills>` block at the front of the **user message**, not the system prompt, so the system prompt hash and the prompt cache stay the same from run to run. Order: `<updated-instructions>` (resume only), `<run-level>`, `<recommended-skills>`, then the request.
- Settings: `ProjectSettings.disabledSkills: string[]` (default `[]`, so every skill found is on, and new skills turn on by themselves). `GET /api/skills` returns `{skills: SkillInfo[], problems}`; `SkillInfo` has `id, name, description, origin ('personal' | 'plugin:<name>'), sourcePath, needsBash`. `needsBash` is a text match on SKILL.md (bash code blocks, `scripts/`, `npx`, `python`, `curl`); the UI marks those skills, and Bash stays off by default.
- UI: Settings and New project › Advanced have a "Claude skills" checklist. The composer has a Skills button and `/` at the start of an empty prompt; both open a search list (arrows, Enter, Esc). A picked skill becomes a chip, and on send the prompt gets a `Use the <id> skill.` line. The chat shows Skill tool calls as "Skill · <name>" with a book icon; Run details has "Skills used". The "N skills" chip next to the model tag toggles skills for the project.
- Add a skill: put a folder with a `SKILL.md` (front matter `name` and `description`) in `~/.claude/skills`, or enable a Claude Code plugin that has skills. The next run or settings view finds it; there is no restart.
- Safety note: skill text goes to the model, and skill folders are readable by the agent. Do not keep secrets in skill folders. This is a documented exception to AC-52 and AC-55.

## Preview

- HTML: preview origin serves work-tree files. For `.html`, it parses with parse5 (location info) and adds `data-studio-loc="file:line:col"` to each element **in the response only**, and injects `bridge.js`. Files on disk stay clean.
- React: Vite `createServer` (in the child process) with inline config (merged with the user's config file), plus our plugins: `studio-source-tags` (enforce `pre`, tags lowercase JSX host elements with `data-studio-loc`) and `studio-bridge` (injects `bridge.js` in `transformIndexHtml`). HMR stays native.
- File watcher (chokidar) per work tree → `files.changed` event with server time. UI reloads HTML iframe (double buffered: load in back slot, swap on `painted`). React relies on HMR.
- The back slot is never shown before it paints. Render-blocking links (Google Fonts css, tokens.css) hold back `ready` and `painted`, so a slow font css can delay the swap by seconds; the old frame stays visible. Only a page without the bridge (error page) swaps without `painted`: 1.5 s after the change and 0.5 s after its iframe `load`, whichever is later.
- Highlight draws in the parent over the iframe from bridge rects (AC-26).
- HTML iframes use `sandbox="allow-scripts allow-same-origin allow-forms"`. The preview origin differs from the studio origin, so `allow-same-origin` only gives the preview its own origin. The parent accepts messages only when `event.origin` is the origin of that frame's URL and posts only to that origin. `session.previewOrigin` is the bare preview host and is not used for message checks.
- Missed HMR guard: Vite drops an update for a module the page has fetched but not yet run, and a page whose HMR socket opens late never gets it. So the bridge asks `/__studio/changes` at DOMContentLoaded and reloads if a file changed after navigation start, and the `studio-bridge` plugin sends `full-reload` to a socket that connects after a change newer than the last served `index.html`.
- Vite's own watcher can miss or half-read a write right after it starts. The studio watcher forwards each changed file to `ChangeSync`, which emits `change` on Vite's watcher when the file's size/mtime differs from what Vite last saw. If a React frame that has reported a runtime error does not paint within 2.5 s of a change, the UI reloads it; healthy frames are never reloaded for a change.
- The bridge also sends `painted` after DOM mutations (two animation frames later), so the parent can time React HMR updates.
- Vite (`vite-manager.ts`, which forks `vite-runner.ts`) and `playwright-core` (`browser.ts`) load on first use. Boot calls `listen()` first, then starts the HTML preview server; watchers and the bridge bundle warm up in the background.
- Render check (`browser.ts`, `layout-probe.ts`): per viewport it reports console and page errors, page-level `horizontalOverflow`, and `layout` findings (max 10, `layoutTotal` has the full count). The probe is a plain JS string run with `page.evaluate`, because tsx/esbuild name helpers would add `__name` calls that fail in the page. Kinds: `clipped` (error: `scrollWidth > clientWidth + 1`, or taller content, under `overflow: hidden|clip`, not ellipsis or line clamp), `scrolls-sideways` (warning: same under `auto|scroll`; reported at every width, since the user's taste is dense but clear on mobile), `past-viewport` (error: an element outside the viewport and not inside a scroll container). Each finding has a selector, the `data-studio-loc` source, the cut item texts and sizes. Hidden, 1 px, `sr-only`, fully off-screen (`left: -9999px`) and `aria-hidden` nodes are skipped. `ok` still means no errors and no page overflow.
- Agent tools: `screenshot {viewport, from}` returns MCP image blocks, not paths: up to 4 tiles from y=`from` (desktop 1440x900 tiles, mobile 390x1560 tiles, tablet 768x1024), so a long page is not downscaled until text is unreadable. The text block says where the page ends or which `from` to ask for next. Tiles are saved as `runs/<runId>-shot-<n>-<viewport>-<i>.png`; each `render_check` result is saved as `runs/<runId>-check-<n>.json`.
- Verify loop (prompt): the system prompt says the `<run-level>` block sets checks and loops, keeps the look checklist (clipping, sideways tables, cut nav, contradictions, placeholder text, rhythm, hierarchy), says mobile from the top first, never remove navigation, and a final check after the last edit. See "Run levels".
- Render-check screenshots go to `<pid>/checks/`. `GET /api/projects/:pid/files?path=` serves only `.png` files under that project's `checks/` and `runs/` (realpath-checked).

## Build order

1. HTML loop end to end on the mock agent.
2. React/Vite.
3. Real-model smoke run.
4. E2E workflows + latency benchmarks; report each AC as verified / not verified.

## Bridge protocol

- The parent loads the iframe with `?__studio_token=<random>&__studio_parent=<studio origin>`.
- `bridge.js` reads both once, then removes them with `history.replaceState`.
- Every message has `ns: 'studio'` and the token. Each side checks `event.source` and `event.origin`.
- The bridge keeps its session in `sessionStorage` under a key per `location.pathname`, so compare-view iframes on one origin do not collide. Storage and `replaceState` errors are ignored.
- Escape in select mode exits select mode in the bridge and sends `mode-exited`; the parent turns select mode off.
- The preview frame is cross-origin, so the parent never sees its input. The bridge cancels Ctrl/Cmd+wheel (pinch) and sends `wheel` (deltas summed per animation frame, frame-local `clientX/Y`); the parent maps the point through the iframe rect and CSS scale and zooms around it. Zoom keys in the frame (see Canvas) go as `zoom-key`. Plain wheel stays in the frame and scrolls the design.
- Types: `BridgeToParent`, `ParentToBridge` in `src/shared/contracts.ts`.
- The bridge changes the design DOM only for temporary live previews. `preview-style` sets inline properties (only keys in `DIRECT_STYLE_PROPERTIES`) and `preview-text` sets the text of a leaf element. The bridge keeps each original inline value and priority, and the original child nodes. `preview-reset` puts them back. Hover and selection outlines draw in the parent.
- `tokens-preview {css}` puts the css in `<style id="studio-token-preview">` (`TOKEN_PREVIEW_STYLE_ID`) as the last child of `<head>`, so it wins over tokens.css at equal specificity. The bridge keeps the css in memory. While it is not empty, a `MutationObserver` on `<head>` (child list) adds the element again or moves it back to the end when Vite HMR or React adds, removes or replaces head styles. Empty css removes the element and stops the observer.
- `tweaks-preview {css}` is a second layer: `<style id="studio-tweaks-preview">` (`TWEAKS_PREVIEW_STYLE_ID`). One manager and one observer keep the active layers at the end of `<head>` in the fixed order tokens, tweaks (it checks the order, so two layers never fight over the last slot). Tweaks win over the page `:root`, tokens.css and the token preview at equal specificity; they lose to the dark-mode selectors of tokens.css, the same as a committed value.
- `set-theme {theme}`: `'dark'`/`'light'` set `data-theme` on `<html>` and add or remove class `dark`. The first call stores the original `data-theme` and whether `dark` was in the class list; `null` puts both back exactly (and removes a `class` attribute that is then empty).

## Direct edits

`POST /api/projects/:pid/d/:did/direct-edit` changes style or text of one element with no model call.

```
UI inspector → preview-style / preview-text to the bridge (live, not saved)
  → POST direct-edit {source: file:line:col from data-studio-loc, style?, text?}
  → zod check (keys in DIRECT_STYLE_PROPERTIES, safe values ≤ 200 chars, text ≤ 5000)
  → realpath the file inside the work tree (.html .htm .jsx .tsx; not node_modules .git dist .vite .studio)
  → patch: HTML with parse5 locations, JSX/TSX with @babel/parser + magic-string; all other bytes stay the same
  → write (temp file + rename) → versions.commitFile (kind manual, only that file)
  → version.created, direction.updated, status.changed → watcher reload / HMR shows the result
```

- 409 `run_in_progress` while a run is active on the direction. 422 `{error, message}` when the request or source cannot be patched: bad value, path outside the tree, element not found, `style` not an object literal, text on an element with child elements, no base version yet.
- Each user action is one version: a direct edit, a batch, a resize on pointerup, a rename, a move.
- Request forms: `style` and/or `text`; `name` (sets or removes `data-name`); `move: 'up' | 'down'` alone (swaps the element's source range with its previous or next element sibling, other bytes unchanged; refuses at the ends, next to expression siblings and inside `.map()`, code `cannot_move`; the result has `moved`, the new location, and the parent sends `select-source`). `DirectEditBatch {edits}` on the same route (1–50 style/text edits, `batch.ts`): all planned first, each file written atomically, one version, all originals back on any failure.
- Explicit commits (Enter, blur, clicks, pointerup) write at once; only arrow steps and the color drag keep the 250 ms debounce.

### Edit history (Round 4)

```
applyDirectEdit / batch / token edits ──record({files: [{before, after}]})──► direct-edit/history.ts (per project, in memory, cap 100)
⌘Z / ⇧⌘Z (studio keys, bridge `history-key`, desktop Edit menu) → useEditHistory → POST /api/projects/:pid/d/:did/edit-history/undo|redo
  → mutex + run check → every file's bytes must equal the record's after (undo) / before (redo), else 409 history_stale and the stack clears
  → write all files (temp + rename) → one version "Undo: <label>" → edit-history.changed
```

- Steps use the newest record of the current direction; a new edit clears that direction's redo. Token edits record through `design-system/token-history.ts`; a token edit that creates a file and tweak commits are not recorded.
- One ⌘Z path in `Studio.tsx`: unsaved token draft, unsaved tweaks, edit history, then the old version undo (which skips a head that is an Undo or Redo step). Text fields keep native undo.
- The old `POST .../undo` (whole version) stays for the versions panel.

### Inspector (Round 4)

- Sections, each its own component taking the `DirectEdit` shape: Text, Auto layout (`InspectorLayout.tsx`: Display, direction, wrap, align grid, gap, ⇧A), Size (hug `fit-content` / fill `flex: 1` on the parent's main axis, `align-self: stretch` on its cross axis, `100%` outside flex / fixed px; align-self), Spacing (`BoxModel`), Typography, Fill and border (`InspectorCorners.tsx` per-corner radius), Effects (`InspectorEffects.tsx`, `shadows.ts`), Other styles. Header: breadcrumb (`InspectorBreadcrumb.tsx`, walks up with `select-relative` parent), Copy CSS.
- The bridge adds read-only `parent-display`, `parent-flex-direction`, `used-width`, `used-height` to `selection.styles`, and prefers the authored inline value for `box-shadow`, `filter`, `flex`, `align-self` and keyword or percent sizes (`bridge/inlineStyle.ts`), so a token color reads back as the token.
- Authored CSS: `request-authored` → `authored {rules, inline}` (`bridge/authored.ts`): style rules from `document.styleSheets` that match the element (matching `@media` only, try/catch per sheet and selector, size caps); the parent parses the reply again (`authoredCss.ts`). Feeds Copy CSS and Other styles.
- Number fields: `mathInput.ts` (no `eval`): `+ − * /`, brackets, `+N` / `+=N` add, `-=N` subtracts, a leading `-N` is a value.
- Multi-select: `useDirectEdits.ts` returns the same shape with a Mixed marker; one `DirectEditBatch` per change; elements with no source or a shared source refuse writes with a note.

### Canvas edits (Round 4)

- Inline text (`bridge/text-edit.ts`, `useInlineTextEdit.ts`): leaf elements only; dblclick or Enter starts `contenteditable="plaintext-only"`; the bridge owns Enter, Esc and Tab while open; `text-commit {selector, text, at}` → direct edit at once. The parent sends `text-edit-allowed` (off during a run, outside Live, in comment mode) and `text-edit-stop`; the HTML frame swap waits while an edit is open.
- Resize handles (`useResizeHandles.ts`, drawn in `ArtboardOverlay`): pointer delta ÷ canvas zoom, live `preview-style`, one commit on pointerup, Shift keeps the ratio.
- Layers edits (`useLayerEdits.ts`): rename (double-click or F2), hide (⇧⌘H), drag and ⌥↑/⌥↓ (also from the preview as `reorder-key`, `bridge/reorder.ts`).
- Shift+click toggles an element in the selection (canvas and layers rows).
- The HTTP routes for run start, undo, restore, keep, discard and direct edit hold one per-direction mutex (`${pid}/${did}`), so they never interleave. The version store lock is the inner lock. Run start and direct edit check `runner.isRunning(projectId, directionId)` inside it. The runner keys active runs by `${projectId}/${directionId}`.

## Design systems (phase 1)

`src/server/design-system/`. Plan: `research/design-systems-proposal.md`.

```
design-system/tokens.json  (source of truth, DTCG)  ──compileTokens──►  design-system/tokens.css (generated)
        │                                                                  │
        ├─► DESIGN.md token table (between studio:tokens markers)          ├─► HTML: <link> in <head> (agent writes it; preview injects it if missing)
        └─► agent system prompt: <design_md> + <design_tokens>             └─► React: import '../design-system/tokens.css' first in src/main.tsx
```

- Packs: `design-system/packs/<id>/{pack.json,tokens.json,DESIGN.md}`. The registry loads them once per server, validates them (zod manifest, id = folder name, tokens compile with no errors, DESIGN.md present) and skips invalid packs with a log line. `GET /api/packs` returns `PackSummary[]`; swatches are bg, surface, fg, primary, accent, border with aliases resolved.
- Compile: group `$type` inherits down; a core group with no `$type` gets one from its name (color, font = fontFamily, text/space/radius = dimension, shadow). Other groups need a `$type`. Names: `color.x` → `--x`, every other `g.n` → `--g-n`. A whole-value alias `{color.primary}` → `var(--primary)`; shadow and fontFamily values may embed aliases. Cycles, missing targets, unknown types, bad values, `; { } < > \` in values, duplicate css names and missing `REQUIRED_TOKENS` are errors. Output order: color, font, text, space, radius, shadow, then other groups by name; file order inside a group.
- Colors: the base blocks hold sRGB hex (gamut-clamped through OKLCH with culori). One `@supports (color: oklch(0% 0 0))` block repeats the same selectors with `oklch()` values. Two declarations of one custom property do not work as a fallback, because the browser does not check custom property values at parse time.
- Dark: `$extensions["studio.modes"].dark` values go to `:root[data-theme="dark"], .dark`. Alias tokens whose target has a dark value are declared again there, so `.dark` on a subtree also updates them. Only when the pack `mode` is `light` (the default when there is no `pack.json`), the same values also go to `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }`. A dark pack does not follow the OS setting.
- Create with `packId`: 400 for an unknown or non-string id, before any project is made. The pack is applied before the first run starts: tokens.json, pack.json, tokens.css and DESIGN.md (pack DESIGN.md + token table; the user's `designMd` goes under `## Project notes`). React (created, not imported) also gets the `main.tsx` import and the Google Fonts `<link>` in `index.html`. Then an `init` version "Apply <name> design system" (React: after "Starter template"), so Undo of the first run keeps the pack. `project.packId` is set with a locked read-modify-write.
- Recompile: the watcher calls `syncDesignSystem` when `design-system/tokens.json` changes. It writes tokens.css and the DESIGN.md block only when the content differs, so its own writes do not start a loop. Compile errors emit `preview.build-error` with `file: design-system/tokens.json` and leave tokens.css as it was. The run lifecycle calls the same sync (`beforeCommit`, per-work-tree mutex) right before the run commit, so a late tokens.json edit lands in the run version.
- HTML preview: when the served root has tokens.json and the HTML has no `<link ... design-system/tokens.css>`, the preview response gets the link (relative to the HTML file) and the Google Fonts link at the start of `<head>`. Files on disk do not change. `renderCheck` adds "design-system/tokens.css is not linked from <entry>" to `consoleErrors` and sets `ok=false`, so the agent fixes the file and an export works without the studio.
- Agent: the system prompt gets the design-system block (rules, DESIGN.md up to 100 KB in `<design_md>`, token table in `<design_tokens>`) at its end. The token table is the one source of each token name, value, dark value and description: it comes from the compiled tokens, and the studio cuts the generated `studio:tokens` block out of DESIGN.md (before the 100 KB cap) and leaves a one-line pointer, so the prompt has no second, possibly stale copy, so it is a stable prefix for prompt caching. DESIGN.md is then not repeated in the user message. Write/Edit to `design-system/tokens.css` (realpath, any spelling) is denied with "tokens.css is generated from design-system/tokens.json; edit tokens.json instead".
- `GET /api/projects/:pid/d/:did/design-system` → `DesignSystemState` read from that direction's work tree.
- A work tree has a studio design system only when both `design-system/tokens.json` and `design-system/pack.json` exist. So an imported folder with its own `design-system/tokens.json` gets no recompile, injection, warning or prompt block.
- Not in phase 1: imported projects get no automatic link or import; Tailwind `@theme`; colors inside shadow values are not converted to hex.

## Design systems: user library (add a design system, slice 1)

Plan: `research/add-design-system-plan.md`.

```
<dataDir>/packs/user-<slug>/{pack.json,tokens.json,DESIGN.md}   (user packs, same three files as built-ins)
        │
        ├─ packRegistry(builtinDir, {userDir})  built-ins loaded once; user folders re-read when mtime/size of a file changes, invalidate() after a store write
        ├─ library.ts  create / update / duplicate / rename / delete / export (zip)   (one mutex, staged in .tmp-<rand>, then rename)
        └─ project-pack.ts  apply or switch on a direction (one version)  ·  save a direction to the library
```

- Ids: a user pack folder is `user-<slugify(name)>`, `-2`, `-3` … on a clash, so the id = folder rule holds. A user folder without the `user-` prefix, an id that a built-in has, or any file that fails the built-in checks (zod manifest, tokens compile, DESIGN.md present) is skipped and listed by `GET /api/packs/problems`. Built-ins are read-only (400). `PackSummary.source` is `builtin | user`; it is never written into `pack.json`.
- Store writes validate everything first (manifest schema, `parseTokenFile`, `compileTokens` errors, non-empty DESIGN.md, 512 KB caps) and answer 400 with the reason. Update replaces the folder with two renames (old folder to `.old-<rand>`, staged folder to the id). Rename changes `name` only; the id stays, because projects store `packId`. A user pack DESIGN.md is pack prose only: the studio token block is cut on write. Export is a deflate zip (`zip.ts`, no dependency) of `<id>/pack.json`, `<id>/tokens.json`, `<id>/DESIGN.md`.
- Apply (`POST .../design-system/apply {packId}`, per-direction mutex, 409 `run_in_progress`): notes are the `## Project notes` body when the work tree already has a studio design system, else the whole old DESIGN.md. `applyPack` writes tokens.json, pack.json, tokens.css and DESIGN.md (`composeDesignMd`); a created React project also gets the `main.tsx` import and the studio Google Fonts block, replaced (or removed) on a switch. Only those paths are committed (`commitFile`), as one manual version "Apply <name> design system" or "Switch to <name> design system"; a failure restores the old files. 422 `no_change` when the pack is already applied. Imported React projects (not `created`) get the files only: the result has `wired: false` and a `notice`. HTML relies on the preview link injection and the render check.
- `splitDesignMd` is the inverse of `composeDesignMd`: it cuts the `studio:tokens` block and the `## Project notes` section (outside code fences, up to the next `#`/`##` heading). A test checks the round trip for every built-in pack.
- Save (`POST .../design-system/save {name, packId?}`): reads the direction's tokens.json (verbatim), pack.json (must pass `manifestSchema`, else 400) and the DESIGN.md prose; updates `packId` when given (400 for a built-in), else the user pack that `pack.json` names, else creates a new user pack. Provenance stays `imported`, else becomes `extracted`. Then the direction's `pack.json` is rewritten to the saved manifest (and `project.packId` for main), committed alone as one manual version "Save <name> to library"; no version when it did not change. So a second save updates the same pack. 409 `run_in_progress` while a run edits the direction.
- Pack identity follows the files: `DesignSystemState.packId` is the work tree's `pack.json` id (null when the direction has no studio design system). `project.packId` is set when a pack is applied to the main direction and is synced from main's `pack.json` after undo and restore. Other directions only have their files.
- UI: the top bar chip popover has "Change design system…" (modal with `PackList`, no "No design system" option) and "Save to library…" (name prompt). With no design system the top bar shows "Add design system". A toast (`.ds-toast`, `role="status"`) shows the result. `refreshPacks()` clears the `usePacks` cache after a save. Pickers show user packs after built-ins with a "Yours" marker.

## Design systems: new design system and deterministic drafts (slice 2)

```
New design system page (sources: website URLs ≤3, DESIGN.md, brief, tokens file, code folder, images; base pack; name; mode)
  → POST /api/design-systems/draft (JSON, or multipart: request + tokensFile + images)
      extract/  tokens-file.ts > folder.ts > url.ts > design-md.ts (DESIGN.md text, then brief)   candidates per token
      map.ts    pick per required token (source order, then high > medium), derive missing pairs, contrast guard, base pack fills the rest
                → tokens.json + fonts + coverage (score, grade, per-token source and confidence)
      library.createUserPack  (provenance imported: only a tokens file and/or DESIGN.md; else extracted)
      projects.createInFolder "<Name> design system" (HTML, default projects folder, designSystemFor = pack id)
      write index.html (kit page) + source/* → applyPack → one init version "Apply <name> design system"
  → UI opens the project; DraftBar (name, grade, fallback tokens, Save to library, slot for "Improve with AI")
```

- Fetch (`extract/safe-fetch.ts`): `node:http(s)` with a `lookup` that resolves every address, refuses the request when any is blocked, and connects to the checked address (no DNS rebinding gap). IP-literal hosts are checked directly. Blocked: `0/8 10/8 100.64/10 127/8 169.254/16 172.16/12 192.0.0/24 192.168/16 198.18/15`, test nets, multicast and reserved, `:: ::1 fc00::/7 fe80::/10 ff00::/8 64:ff9b::/96`, IPv4-mapped v6, and the names `localhost`, `*.localhost`, `*.local`, `*.internal` and single-label hosts. http/https only, no user info. Redirects are followed by hand (≤3) and every hop is checked again. 10 s per request and 20 s in total per website (page, redirects and all stylesheets; `harvestUrl` races each fetch against the time left and `safeFetch` cuts its timer to it; stylesheets not read are listed as failures and the rest of the harvest is kept), `accept-encoding: identity` (a compressed body is refused), the body is streamed and cut at 2 MB (page) or 1 MB (CSS), up to 20 stylesheets (links, `<style>`, one level of `@import`). A blocked URL answers 400; a failed fetch is a source error in the coverage report.
- `STUDIO_FETCH_ALLOW_LOOPBACK=1` opens 127/8, `::1` and `localhost` only (never other private ranges). `loadConfig` ignores it when `STUDIO_RESOURCES_DIR` is set (packaged app). Only `e2e/support/server.ts` sets it.
- Fetched content is data: it is never run and never goes into a prompt as text. Only validated values leave it: colors (parsed by culori, written as OKLCH), lengths, shadows (≤ 4 layers, each 2–4 lengths, one color culori parses and an optional `inset`, nothing else), and font stacks cut to the first family (`[A-Za-z0-9 .\-_]{1,32}`, ≤ 4 words) plus known system fallbacks and a generic family. The page title and copy are not used. The snapshot is stored as `source/url-N/page.html.txt` and `style-K.css.txt`, so the preview never serves it as HTML.
- URL heuristics: custom properties in root, light and dark contexts (`.dark`, `[data-theme=dark]`, `prefers-color-scheme: dark`); body background and color; button background, text and radius; link color; meta `theme-color`; card background; muted text; input borders; body, heading and code font families; radius and shadow spread; Google Fonts `<link>`.
- Folder (read only): realpath, then a walk with no symlinks, skipping `node_modules`, `.git`, build output and dot folders; caps 20 000 entries, 300 files, 1 MB per file, 16 MB in total, depth 10. It reads CSS/SCSS/Less custom properties (shadcn HSL triples become `hsl()`), SCSS/Less variables, `tailwind.config.*` theme sections (a small JS literal reader, nothing is run) and `*tokens*.json` / `theme.json`.
- Tokens file: DTCG (`$value`/`$type`, inherited group types, whole and embedded aliases, object colors and dimensions, font arrays, shadow objects, `studio.modes`) and Tokens Studio (sets, `value`/`type`, references without the set name, a set named `*dark*` gives dark values). Names map to our tokens through one alias table (`extract/names.ts`).
- Mapping: light packs keep an extracted dark value, derive one for brand colors (same hue, lighter), or keep the base dark value for neutrals; dark packs (mode `dark` or a dark detected bg) use dark values as `$value` and carry no `studio.modes`. Missing `primary-fg`, `accent-fg`, `ring`, `accent`, `surface`, `border`, `fg-muted` and `font.display` are derived from what was found (`source: derived`). A contrast guard fixes fg on bg and the `*-fg` pairs.
- Coverage (`source/coverage.json`): group weights color 0.5, font 0.2, radius 0.1, shadow 0.08, text 0.06, space 0.06; inside color bg/fg/primary weigh 2 and success/warning/danger 0.5; high 1, medium 0.75, derived 0.6, fallback 0. Grades: excellent ≥ 80, usable ≥ 60, needs review ≥ 40, else rebuild.
- DESIGN.md: the pasted one as is, else a template in the 9-section order with name, brief, palette, fonts and scales filled in. Lines that start with `_To do:` are for slice 3 to fill.
- Backing project: `project.designSystemFor = <user pack id>` marks it (undo and restore do not touch it). Its main work tree has `index.html` (kit page: palette light + `.dark`, type scale, spacing, radius, elevation, buttons, inputs, card, alerts, nav, table; only `var(--token)`), `source/meta.json` (`{version, kind: "design-system-draft", packId, name, createdAt, inputs, attachments: [{id, name, mime}], files}`), `source/coverage.json`, `source/evidence.md` (starts with an untrusted-data line), `source/url-N/*`, `source/tokens-file.json.txt`, `source/brief.md`. Images are project attachments (PNG, JPEG, GIF, WebP; ≤ 8, 8 MB each); SVG is refused. `GET /api/projects/:pid/design-system-draft` returns `{packId, coverage}`.
- Save to library in the backing project sends `packId = designSystemFor`, so it always updates the draft pack.
- Draft packs: the draft route creates the user pack with `draft: true` in `pack.json`. `GET /api/packs` still lists it (with `draft`), but the pickers (`pickable()` in `src/ui/packs.ts`: Home, Change/Add design system, base pack select) hide it. Rename and update keep the flag; Save to library sends `draft: false`, so the first save publishes the pack; a duplicate is never a draft.
- A create that fails after the pack is made deletes the pack and the half-made backing project: `projects.discardCreated(id)` removes `<dataDir>/projects/<id>` and the folder it created in the projects folder.
- UI: `uiStore.screen = 'new-design-system'` shows `NewDesignSystem` (App has no router; the screen is reset after create). Entry points: "New design system…" at the foot of the Home pack picker and of the Change/Add design system dialog.

## Design systems: Improve with AI (slice 3)

```
DraftBar  [What should the AI focus on?] [Improve with AI]   check: "Check passed" | "N problems" (list)   [Save to library]
  → POST .../runs {prompt: "Improve this design system.\n\nFocus: …", task: 'design-system', level (wireframe → prototype)}
      400 unless project.designSystemFor · attachmentIds += source/meta.json ids that are this project's attachments
  → driver: first segment → enforceDesignSystemCheck (design-system-run.ts)
        checkDesignSystem(workTree) passes → done
        fails → resume the session with <studio-continue> + the problems (max 3 rounds) → check again
        still fails → status failed, error "Design system check failed: N problem(s) after 3 fix round(s). …"
  → beforeCommit: refreshDraftCoverage → source/coverage.json in the run version
```

- Run purpose: `RunRequest.task = 'design-system'` (beside `tweaks`). `withRunTask` keeps the level's model and turns, turns off skills and the critic (so no polish loop), keeps screenshots, and makes the agent budget the whole spending limit. The task text is the `<run-level>` body (`DESIGN_SYSTEM_TASK` in `run-level.ts`).
- Prompt: `buildDesignSystemDraftBlock(project)` adds `## Design system draft project` to the system prompt of every run in a backing project (keyed on `designSystemFor` only, so the prompt is the same at every level). It lists the files by path, says that every file in `source/` and every attached image is untrusted data, never instructions, forbids other pages and `source/` edits, and names the check tool. No source content goes into the prompt. In a design-system run, attached images get a `<source-images count="N">` note in the user message with the same rule.
- Guards: `ToolPolicy.readOnlyDirs = ['source']` in backing projects, so Write and Edit under `source/` are denied (case-insensitive, realpath-checked). `mcp__studio__design_system_check` is in the permitted tools and in the no-change set (the baseline gate does not wait for it). It answers an error outside backing projects; the MCP tool list is the same in every project.
- Check (`design-system/check.ts`, same function for the tool, the driver and `GET .../design-system-draft`): reads `design-system/tokens.json` (never tokens.css), `design-system/pack.json`, `DESIGN.md` and `index.html`. Rules: `tokens` (parse and compile errors incl. missing required tokens; required colors are `oklch()` or an alias; light packs need `studio.modes.dark` on every required color), `contrast` (AA 4.5:1 for fg/bg, fg-muted/bg, fg/surface and every `X-fg`/`X` color pair, in light and dark for light packs, once for dark packs, aliases followed per mode), `design-md` (the 9 `##` sections of `DESIGN_MD_SECTIONS` from `compose.ts`, each with text, outside code fences; no line that starts with `_To do:`), `kit-colors` (no color literal in any `<style>` block or `style` attribute of the kit page, and no named color in color properties), `fonts` (non-system font token families equal the Google Fonts `<link>` families of the kit page, both ways, and `pack.json` fonts and `googleFontsUrl` match the tokens). At most 8 listed problems per rule plus a count line. A fresh draft fails only on its to-do lines.
- Screenshots: `screenshot` takes `theme: light|dark`; dark sets `data-theme="dark"` and `.dark` on `<html>` before tiling, so tokens.css uses the dark values on both render backends.
- Enforcement lives in one module for both drivers: the SDK driver resumes the session (same `maxBudgetUsd` rule as the polish loop, `run.sent` lines with `continuation: n`); the mock driver runs its fix step. `RunSummary.designSystemCheck = {passed, problems, rounds}`; the final text ends with "Design system check: passed…" or "failed…". A failed run makes no version, like every failed run; the Unfinished banner offers keep or discard.
- Coverage after a run (`draft-project.ts`): in the before-commit hook of every edit run in a backing project, a `fallback` token whose value (and dark value) now differs from the base pack value becomes `source: agent`, `confidence: medium`; score, grade and `fallbacks` are recomputed. The file is written only when it changes.
- UI: `ImproveControl` sits in the DraftBar `improve` slot (disabled while any run is active). The bar reads `{coverage, check}` from `GET .../design-system-draft` on every file change and when the last improve run changes status. Save to library is primary only when the live check passes and the last improve run completed with a passing check; else Improve with AI is primary.
- Mock: `task: 'design-system'` fills the `_To do:` lines, edits tokens.json, emits two screenshots (light, dark) and a check call. `[ds-fail-once]` leaves one to-do line for the first studio round; `[ds-fail-always]` never fixes it.
- Real smoke: `npx tsx scripts/design-system-real.ts` (temp data dir, DTCG draft, `SMOKE_MODEL` default Haiku, `SMOKE_BUDGET` default $0.45).

## Design systems: library screen (slice 4)

```
Home "Design systems" · chip Change dialog "Manage…" (libraryFrom = {projectId, directionId})
  → uiStore.screen = 'design-systems' → DesignSystems: Yours (user, drafts with a Draft badge) then Built-in, preview cards
      card → PackDetailDialog: GET /api/packs/:id (entries) + GET /api/packs/:id/check
            token preview (pack CSS variables set inline on each preview surface, light and dark), type scale, DESIGN.md (Markdown, no raw HTML)
            actions: Apply to current project (libraryFrom only) · Use in new project (Home, lastPackId) · Open in editor | Make a copy to edit
                     Duplicate · Rename · Export (api blob → downloadBlob, Electron will-download) · Delete (confirm)
  Import… → POST /api/packs/import (multipart file, mode) → 409 pack_exists {existing} → "Replace" (mode replace) or "Keep both" (mode copy)
```

- Preview: the app and packs share names such as `--bg`, `--surface` and `--shadow-md`. The preview sets the pack values inline on its own surfaces, so they shadow the app values only inside the preview. No pack CSS goes into the app document and no frame is used. Card fonts use the pack font stacks; the screen does not load Google Fonts (if the browser already has a font, the card uses it).
- Check (`GET /api/packs/:id/check`): `checkDesignSystemFiles(files, {kitPage: false})` skips `kit-colors` and the kit page `<link>` font rules and keeps the pack.json-vs-tokens font rules. Every built-in pack passes.
- Import (`pack-import.ts`, reader in `zip.ts`, no dependency): the central directory is the truth. Refused: more than 2 MB (content-length first, then the file), more than 3 entries, encryption, zip64, methods other than store and deflate, folder or non-regular entries, duplicate names, any name that is not `<id>/pack.json|tokens.json|DESIGN.md` under one folder that matches the pack id rule (this stops `..`, absolute paths and backslashes), a declared size over 512 KB, inflate output over the cap (`maxOutputLength`) and a bad CRC. pack.json must pass `manifestSchema`; then `createUserPack` validates tokens and DESIGN.md as usual. The new pack is `user-<slug of name>` with provenance `imported` and no draft flag. A conflict is a user pack with the zip folder id or the same name (case-insensitive); `replace` keeps that pack id and its draft flag (`updateUserPack`).
- Open in editor (`POST /api/packs/:id/editor`, user packs only, keyed mutex per pack): the project whose `designSystemFor` is the pack id, else a new backing project made with the slice 2 path (kit page from `renderKitPage`, `source/meta.json` with `inputs: {library: id}`, and a coverage file from `libraryCoverage`: each required token the saved pack sets counts as `library`, high confidence). The draft flag does not change. The grade there says how complete the saved pack is, not how well an extraction went.
- Save as a new design system: the Save dialog in the chip offers it when the direction uses a user pack and the project is not a backing project. `POST .../design-system/save {name, asNew: true}` always creates a pack; the direction (and `project.packId` for main) then names the new pack.
- Copies: Duplicate and Make a copy set `copiedFrom` in pack.json, and the card badge says Copy, not Made here.
- Apply to current project: `libraryFrom` persists in localStorage beside the screen and is checked against the project list on load.
- Problems: `GET /api/packs/problems` shows as a closed `<details>` notice ("1 design system could not load").
- Delete: the route marks each backing project of the pack `designSystemDeleted`, and Open in editor skips those. So a new pack with the same id gets a new backing project.

## Design systems (phase 3): live token editing

```
Tokens panel edit
  → POST .../design-system/preview {changes: TokenChange[]}      (no lock, no file writes)
      zod + same value checks as create-token (unknown path 404 unknown_token, bad value 422)
      cached tokens.json (per work tree, key = mtime+size of tokens.json and pack.json;
        also dropped on files.changed for those paths and after an update)
      → applyTokenChanges on a structuredClone → compileTokens(file, {only: changed paths})
      → {css, errors}  css = changed tokens + tokens whose alias chain reaches them
  → UI posts tokens-preview {css} to every frame of the direction (no reload)
Commit
  → POST .../design-system/tokens/update {changes}               (per-direction mutex)
      409 run_in_progress, 404/422 as preview, 422 no_change when the parsed file does not change
      editTokensText: change only the $value string and studio.modes.dark of each token;
        add $extensions when a dark value is new; darkValue null removes dark, then an empty
        studio.modes, then an empty $extensions. Result must parse deep-equal to the in-memory edit.
      → write tokens.json → syncDesignSystem (tokens.css + DESIGN.md block)
      → versions.commitFile([tokens.json, tokens.css, DESIGN.md], "Update tokens: --a, --b, --c, --d +N more", kind manual)
      → version.created, direction.updated, status.changed → {state, version}
  → UI keeps the preview css (it matches the saved values) until the canvas front frame is a reload
    that got `ready` after Commit returned and has painted; then it sends tokens-preview {css: ''}.
    Frames that get `ready` in this time get no preview css. If no such reload comes in 4 s, the css
    goes away, but not while a canvas swap is pending, so the old frame never loses it while visible. Drop preview responses that
    were in flight when Commit started (sequence number).
```

- The bridge keeps the preview css and the theme only in memory. A full reload (HTML watcher reload, Vite full reload) loses both. While a preview or theme is active, the parent sends `tokens-preview` and `set-theme` again on every `ready` from a frame.

- Preview css uses the same blocks as tokens.css: `:root`, `:root[data-theme="dark"], .dark`, the `prefers-color-scheme` block (light packs only), and the `@supports (color: oklch(...))` copy for colors. Each previewed token is declared in the dark selectors too (its dark value, else its light value), so removing a dark value also overrides the old dark value of tokens.css.
- On a write or commit failure the three files go back to their snapshots. Undo is the normal `POST .../undo`.
- Speed: 10 changes take under 1 ms in the server test (`update-tokens.test.ts`), target < 30 ms.

## Design systems: Round 6 (mode preview, token checks, components, CSS import)

```
Canvas toolbar moon / Tokens panel mode  → tokenFrames theme store (one value, reset on direction change)
  → set-theme to every registered frame: front, passive canvas frames and variation panes
    (passive frames now open a bridge session so they register); again on each `ready`
Inspector selection → tokenLint.lintValues(values, token entries, mode, authored css)
  → off-palette color (nearest token, ΔE = OKLab distance × 100), raw size near a space/radius token,
    font outside --font-* → "Use token" previews var(--token) and commits one direct edit
Components tab → GET /api/projects/:pid/d/:did/components   (inventory.ts)
  React: components with a host element that carries data-studio-loc, with use counts;
  HTML: named layers (data-name) and classes used 2+ times
  skips node_modules, dist, build, source, design-system, dot dirs; ≤200 files, ≤256 KB each, depth 6, ≤40 results
  → GET .../components/:id/thumb  (thumbs.ts: one page load per version, clipped shots per selector, cached)
  card click or @ picker → mention {kind: 'component', name, file, selector} → user message names the part
```

- The theme switch only sets `data-theme` in frames. No file changes and no version. The switch shows only when the tokens have dark values (`hasDarkMode`).
- Component names and files come from user files: names must match `^[A-Z][A-Za-z0-9]{0,47}$`, and the agent gets them in a `<mentioned-components>` block.
- CSS import (`extract/vars.ts`, `tokens-file.ts`): a `.css` file in New design system reads its custom properties. Mapped ones fill required tokens; the rest stay as extra tokens with a type from the value (color, dimension, shadow, fontFamily). `breakpoint` is a core group of type dimension, shown in the Tokens panel.
- Pack cards: the server sends the dark swatches in `PackSummary`, and only the `DesignSystems` chunk draws the light and dark pair, so Home stays under its byte gate.
- DESIGN.md editor (`DesignMdModal.tsx`): outline from headings, a live preview with `markdownBlocks` (no raw HTML, comments dropped), and a save prompt on Close, Cancel, Esc and backdrop click when there are changes.

## Tweaks (live controls)

```
agent: mcp__studio__define_tweaks {controls}  (zod: range | color | toggle | select, each bound to one --var)
  → studio/tweaks.json (tracked by versions; Write/Edit to it are denied, any spelling, realpath)
  → result lists every var that has no top-level :root declaration or no var() use
UI Tweaks tab: GET .../tweaks → TweaksState {controls, current (value parsed from the source), tokenPaths, problems}
  drag → tweaks-preview {css: ":root { --x: v; }"} to every frame (rAF, no server call, no reload)
Commit → POST .../tweaks/commit {values: {id: value}}   (per-direction mutex; 409 run active)
  token var (cssVar of a design-system token) → tokens.json via plannedTokensText + writeTokensText (tokens.css, DESIGN.md), and a page :root override of it too, so both agree
  other var → the LAST top-level :root declaration of it in each source that declares it (.css files, HTML <style> text by parse5 offsets); only the value bytes change
  + each control's default in tweaks.json → versions.commitFile(all paths, "Tweak: <labels>") → one version; Undo reverts all
```

- Files: `src/shared/tweaks.ts` (types, value format, preview css), `src/server/tweaks/` (schema, css-vars scanner, sources, store, commit, mock). Errors: 404 `no_tweaks`, 422 `unknown_tweak`, `invalid_tweak_value` (range bounds, option list, `; { } < > \` and comments), `tweak_not_declared`, `no_change`.
- The scanner skips comments, strings, `@media`/`@supports` blocks and nested rules; a selector list counts only when one item is exactly `:root`. `!important` stays outside the replaced span.
- The tool is in the studio MCP server at every level and mode (prompt cache rule); `canUseTool` and the tool itself refuse it in critique runs.
- Prompt: the prototype and polish `<run-level>` blocks (user message, not the system prompt) ask for 3 to 8 tweaks after the build. `RunRequest.task: 'tweaks'` ("Suggest tweaks" in the panel) swaps the block for a tweaks-only one, and `withRunTask` sets Haiku, $0.25 (or no limit when the project has none), 14 turns, no skills, screenshots or critic. All three `resolveRunConfig` callers go through it.
- Preview hold: the same rules as the token preview (`tokenFrames.ts` now keeps one channel per layer, sharing the frame list and the canvas front): after Commit the css stays until the canvas front is a reload that painted, else 4 s, never during a swap; resent on every `ready`.
- Undo: Cmd+Z reverts the last pending token change, then the last pending tweak, then the version.
- Mock: `[tweaks]` in the prompt (or `task: 'tweaks'`) adds `--tw-accent`, `--tw-radius`, `--tw-gap` with rules that use them and defines three controls.

## Personal taste
- `src/server/agent/taste.ts` reads the user's design-memory library (`$DESIGN_MEMORY_HOME` or `~/.design-memory/library.sqlite3`) read-only with `node:sqlite` at each run start.
- Only active global rules go to the model: kind, area and rule text. Statements, ids, references and images stay local.
- `buildSystemPrompt` adds them as a `<taste>` block. Priority: request, then selection scope, then the project design system and DESIGN.md, then taste.
- A missing or unreadable library gives no block. `STUDIO_TASTE=0` turns it off.

## Variations (fan-out)

One prompt makes N (2 to 4; 3 for React) different options, each in its own direction, built at the same time.

```
Composer: Run settings popover, Designs 1|2|3|4 (1 = off), Edit mode, no selection
  (Home: Designs > 1 → POST /api/projects {startRun: false}, then the studio asks for briefs)
  → POST /api/projects/:pid/variations/briefs {prompt, count, fromDirectionId}
      one Haiku query(): tools [], mcpServers {}, maxTurns 1, persistSession false, $0.05 cap
      zod + checks: exact count, title ≤ 40, brief 12..280 chars and ≤ 2 lines, no two briefs alike
      (word Jaccard > 0.5 or same title); a bad reply or a failed call falls back to 4 built-in briefs
      (source 'fallback' and the error, shown on the card). STUDIO_AGENT=mock returns the built-ins.
  → "Directions to try" card: edit or remove (min 2), then Start; "Skip review" starts with the generated briefs
  → POST /api/projects/:pid/variations {prompt, briefs, level, fromDirectionId}
      directions one at a time (they share the shadow git dir): forkDirection = addDirection from the
      source head (empty when it has none) + "Forked as" commit + watch, named "Variation A/B/C"
      ("Variation A (2)" when taken), Direction.variation = {groupId, label, title, brief, index, count, prompt}
      then N runs in parallel (Promise.allSettled), each under its own direction mutex
  → {groupId, items: [{label, directionId, runId, error}], perRunBudgetUsd, totalBudgetUsd}
```

- Each run's user message carries its brief in a `<variation label index of>` block after the request (`buildUserText`), never in the system prompt, so all N runs share one prompt hash and the cache.
- A failed run or a failed start touches only its own item. `POST /api/projects/:pid/variations/:gid/cancel` cancels every run the server started for the group (in memory, also mix runs).
- The budget is the project spending limit per run; the card and the grid show per run and total, or "no spending limit".
- Frames (Round 7, `VariationsGrid` is gone): a fan-out adds one canvas frame per variation (frame record `directionId`), in a row under the existing frames, then fits the view. The source frame stays when its direction has a head. A click on a passive frame or its label makes it live and makes its direction current (one live frame with the bridge and selection). The swap gate runs per frame: a passive frame reloads only when its own direction's files or head change, and it gives up its spare iframe while the live frame reloads, so at most N+1 preview iframes exist.
- "Keep this one" on a variation frame label removes the other variation frames from the canvas only; the directions stay. The bar over the canvas ("one of 3 variations", Show all) puts the frames back.
- Mix: on the live variation frame B with a selection, "Use in…" on its label → A. `POST /api/projects/:pid/variations/mix {fromDirectionId, toDirectionId, element}` starts an Edit run on A with `RunRequest.reference` (not `selection`, so the selection rules and visual-diff masks stay off): B's outerHTML, computed styles, source loc and up to 40 lines of B's source from the loc (realpath-checked in B's work tree), in a `<reference-element>` block that says to keep A's tokens.
- The mock agent logs `run.sent` for every run, writes a different full page per brief index (layout, font, palette, `data-variation`), and for a reference appends `.mock-mix[data-from]`.
- Home: the Run settings popover has Level and Designs (no Mode). Designs > 1 creates the project with `startRun: false`, hands `{projectId, prompt, count, level}` to the studio in memory (`homeVariations` in `storage.ts`, one shot, not saved), and the studio calls `useVariations.propose` when the project and its direction load. The user lands on the brief card; Start works as in the studio. The fan-out forks from the main head (the React starter) or from empty (HTML with no pack). Designs = 1 keeps one first run.

## Pinned comments (queue)

```
Comment mode (C, toolbar, "Click an element to comment" pill)    Select mode (V) with a selection
  click element → bridge 'select'      → the same card beside the selection
                                         (no focus; F focuses; Esc hides; hidden while the composer has a draft)
  → CommentComposer (focus, Tab trap)  → one comment per selected element, same text
        Enter = submit, Shift+Enter = new line, Esc = close (draft kept per element)
        "Send to Claude" off → saved comment (queued, waits for Send N queued)
        "Send to Claude" on, no run → draft → send [id]
        "Send to Claude" on, run active → Enter: queued now, sent when the run ends (useComments afterRun)
                                          Cmd/Ctrl+Enter: steer with "About <breadcrumb> (<selectors>): text", no comment
  → POST .../comments {text, target, context, mentions?, attachmentIds?}   zod; comments.changed {comments} on SSE
Send N queued (Comments tab or the bar above the composer)
  → bridge describe-anchors → fresh SelectionContext per comment (800 ms, else the stored context)
  → POST .../comments/send {ids?, contexts}  (per-direction mutex)
      409 run_in_progress: drafts become queued; UI shows "Agent is running: queued"
      → one Edit run at the current level: prompt "Address N comments: #n text…",
        RunRequest.comments → user message <comments> block (formatSelection per element,
        "address each one, list the numbers you did")
      → markSent(runId); RunHandle.done → completed: resolved + versionId; else queued
  GET .../comments settles 'sent' comments whose run handle is gone from runs/<runId>.json (restart)
```

- Shape: `DesignComment {id, n, createdAt, updatedAt, text, target {selector, sourceLoc?, tag, textSnippet, rectHint}, context?, status, runId?, versionId?, replies?, attachmentIds?, drawing?}`. `replies [{id, text, createdAt}]` (`POST .../comments/:cid/replies`, `DELETE .../replies/:rid`) go into the comment text sent to the agent. A drawing comment (pen tool, key P) carries `drawing {frame, box, strokes}` and the id of a transparent frame-size PNG of the strokes in `attachments/`; `comments/send` passes every attachment id into `RunRequest.attachmentIds` and sends the comment with `element: null` and a `<drawing>` block. "Show resolved" (localStorage `studio.comments.showResolved`, off by default) hides resolved rows and pins. `n` is stable per direction and never reused, so pin numbers and "Done: #2" stay valid after reorder or delete. Queue order is array order (`POST .../reorder {ids}`).
- Status rules (`src/shared/comments.ts`, `canTransition`): only the server sends (`draft|queued → sent`) and settles (`sent → resolved|queued`). The user can queue, resolve, reopen (`resolved → queued`) and re-pin (`orphaned → queued` with a new target). Only `draft` and `queued` can become `orphaned`; `sent` and `resolved` never do, because the run edits their text.
- Comment card (`CommentComposer.tsx`, thread in `CommentPopover.tsx`, geometry in `commentPlacement.ts`): a 400 px `--float-*` surface (warm dark in both themes, a step above `--surface` in dark), counter-scaled like pins. `placeComposer` tries right of the element, then left, below and above, using the measured card height, and keeps the first side while the card grows. The top line is a breadcrumb (page › nearest classed or landmark ancestor › element kind and short text; the full ancestor path is the tooltip). The field is a real `<textarea>` (`field-sizing: content`, 1 to 8 lines, so macOS dictation and IME work); the `@Claude`, mention and image chips sit in front of it, and when they fit on one line the textarea gets a matching `text-indent`, so they read as inline pills. Backspace at the start removes the last chip; removing `@Claude` clears the checkbox (localStorage `studio.comments.sendToClaude`). `@` uses `useMentions` with a lead "Claude" option; picks go in `DesignComment.mentions` and `comments/send` merges them (deduped, max 10) into `RunRequest.mentions`. Pasted or dropped images upload as attachments (max 4) into `attachmentIds`. No mic: Electron has no Web Speech API, and system dictation already types into the textarea.
- Pins are avatar pins (`CommentAvatar.tsx`): the OS user's initial (`GET /api/profile`, `os.userInfo().username`, a comment glyph when null) in a `--pin-bg` circle with a status ring (`--pin-ring` queued, warn sent, ok resolved, muted draft or orphaned) and a teardrop point at the element's top-right corner (mirrored at the frame edge), plus a reply count badge. The number stays in the label, the tooltip and the thread header.
- Pins draw in the parent `.overlay` (counter-scaled like `.box-label`), so they follow pan and zoom. The bridge keeps a second tracker for `track-anchors` (separate from `request-rects`, which belongs to the selection) and answers `anchor-rects` on ResizeObserver, DOM mutation and scroll. `resolveAnchor`: `data-studio-loc` when the match is unique (or disambiguated by selector or text) and the tag is the same; then the selector when its text agrees; then the first element of that tag with the same text; then the selector even with changed text; else no match.
- A fallback match writes the fresh selector and loc back to the comment. A queued comment with no match for 1.5 s on the live front frame (a second report confirms it) becomes `orphaned`; an orphan that matches again goes back to `queued`.
- Code: `src/shared/comments.ts` (rules, resolver), `src/server/store/comments.ts`, `src/server/http/comments-routes.ts`, `src/ui/useComments.ts` (state, SSE, send), `src/ui/useCommentMode.ts` (C key, re-pin), `src/ui/commentAnchors.ts` (report review), `CommentLayer.tsx` (bridge, pins, popovers), `CommentsPanel.tsx`.
- Mock agent: a run with `comments` replaces the text of each target (same edit as a selection edit) and answers `Done: #n, …`.

## Resumed sessions and prompt changes
- The SDK keeps the system prompt a session started with. A resume ignores a new `systemPrompt` (probe: a fact present only in the new prompt was not known).
- Each session ledger in `<project>/sessions/<id>.json` stores `promptHash`, the sha256 of the system prompt last sent.
- On resume, when the hash differs or is missing, `withUpdatedInstructions` puts the full current system prompt in an `<updated-instructions>` block before the user message. Chat history stays; the next run with the same prompt sends nothing extra.
- Fresh session after restore or undo: both move the head to an older state, so the old chat history would describe edits that are no longer in the files. `recordVersion` then sets `sessionId: null`, `sessionCostUsd: 0` and `sessionResetReason` ('restore' or 'undo'). The next run starts a new SDK session (no `resume`, `run.sent` shows `resume: null`), gets the system prompt natively, and its cost uses no old ledger. Its summary carries `sessionNote` ("New agent session after restore"), shown as a small line on the run row; the new session id clears the reason. The old ledger file stays. Discard and keep do not reset: discard returns to the head the session already knows.
- Text deltas: `lifecycle.ts` merges `run.text.delta` events on the server. The first delta after a quiet spell goes out at once; later deltas wait in a buffer that flushes every 50 ms (`DELTA_FLUSH_MS`) or at 2 KB (`DELTA_FLUSH_CHARS`). The buffer always flushes before any other run event, before a `run.sent` line, and when the driver returns, so the event and jsonl order stays the same and the joined text is unchanged. At about 100 deltas/s this writes about 85% fewer events to the bus, the jsonl files and SSE. The event type and shape do not change.
- Sent-message log: before `query()` starts, each attempt appends `{type:'run.sent', text, imageCount, updatedInstructions, recommendedSkills, promptHash, resume}` to `runs/<runId>.jsonl`. It goes straight to the file, never on the event bus or SSE. `GET /api/runs/:id` returns these lines as `sent`, apart from `events`, so the chat replay never sees them. A resume that fails before init and retries fresh writes two lines. Images are counted, never logged.

## Home (Round 1)

- **Thumbnails:** `src/server/thumbnails.ts`. `index.ts` wraps the bus (`observeBus`); each `version.created` of kind init, run, undo, restore or keep on the main direction queues the project. One worker shoots the first 1280×800 viewport of the head (`screenshotTiles`, one tile), halves it with pngjs and writes `projects/<pid>/thumbs/<versionId>.png` (never the work tree; older files are removed). `project.thumbnail = {versionId, at}` is written under the project lock and does not change `updatedAt`. `GET /api/projects/:pid/thumbnail/:vid` (token like every route); the UI fetches it as a blob.
- **Rename, duplicate, trash:** `PATCH /api/projects/:pid {name}` changes the name only, never the folder. `POST /api/projects/:pid/duplicate` (`store/project-library.ts`) copies `git/` and `attachments/` as is (same version ids), reserves `<parent>/<slug>-copy` (the parent of a created project, else the default folder), checks out the main head there, links `node_modules`, resets the session, and checks out every extra direction at its own head into `directions/<did>/` (same ids, names, `variation`) with each `comments/<did>.json`. `DELETE /api/projects/:pid` refuses a running project (409), releases watchers and Vite children, and moves `projects/<pid>/` to `<dataDir>/trash/projects/<pid>-<time>/` with `trashed.json`; the work tree stays on disk. `POST /api/trash/:trashId/restore` moves it back and merges a ghost folder that late events made. Trash screen (lazy `HomeTrash` chunk, no request until it opens): `GET /api/trash`, `GET /api/trash/:trashId/thumbnail`, `DELETE /api/trash/:trashId` and `DELETE /api/trash` remove only folders under `<dataDir>/trash/projects/` (safe-id check); a work tree outside the data dir stays on disk.
- **Starters and sample:** `src/server/templates/starters/<id>/index.html` (6 static HTML pages, packaged by `desktop/build.ts`), thumbnails in `src/ui/assets/starters/` (made by `scripts/starter-thumbs.ts`). `POST /api/projects/from-starter {starterId, parentPath?}` creates an HTML project with the page and an init version "Starter: <name>", no run. `POST /api/projects/sample` adds a second, manual version.
- **Clarifying questions:** `POST /api/clarify {prompt}` (`agent/clarify.ts`). Under 12 words: mock mode returns 3 fixed questions; real mode makes one `query()` (Haiku, no tools, no MCP, `persistSession: false`, 12 s timeout) and falls back to the fixed questions. Home asks before it creates the project and appends the answers to the prompt (`shared/clarify.ts:formatAnswers`).
- **Reference pages:** `POST /api/projects` and `POST /d/:did/runs` take `referenceUrls` (max 3, `checkUrl`). The server reads each with `safeFetch` (8 s, 2 MB), keeps the title, headings and text (6000 characters), and sets `RunRequest.referencePages`; `buildUserText` adds a `<reference-pages>` block marked as untrusted. Home images stay in the browser until create; then the project is made with `startRun: false`, the images are uploaded and the run starts with `attachmentIds`.
- **Onboarding:** `preferences.json` `onboardingDismissed` (`GET /api/onboarding`, `POST /api/onboarding/dismiss`).

## Canvas (Round 2)

```
stage (pointer + wheel)            Canvas render (React)
  └─ usePanZoom: offset/zoom refs ──► paint() in rAF: .artboard style.transform, --stroke, --inv-zoom
                                      commit to uiStore.zoom on key, button, pointerup, or 160 ms after the last wheel
.artboard = the live frame at the world origin (double-buffered iframes, overlay, comments)
  └─ .canvas-frame × N: other frames, same preview URL, no bridge token, pointer-events none
```

- React never owns `transform` on `.artboard`; a render during a pan paints the ref values again in a layout effect, so the view does not jump.
- Frames: `canvasFrames.ts`, stored in the project file `.studio/canvas.json` since pm-ideas (see Canvas layout file; the old localStorage `design-studio.canvas.v1` is read once for migration). In memory: `{frames: [{id, width, height, x, y, directionId?, path?, label?, hidden?}], activeId}`; a missing `directionId` means the current direction, `path` is a relative page (no `.` or `..`) the frame loads; right, bottom and corner handles resize (min 240, Shift keeps the ratio), max 24, validated on load). The active frame size mirrors `uiStore.viewport`. Activate, move and remove keep the world still on screen; in Fit mode they first freeze the zoom to a number.
- Zoom keys: `zoomKeyOf` (shared by studio and bridge): ⌘= ⌘− in/out, ⌘0 and ⇧0 100%, ⌘1 and ⇧1 fit all frames, ⌘2 and ⇧2 selection, bare = + −. Bare and Shift keys are ignored in text fields. The View menu has Zoom In/Out/100%/Fit/Selection that send `{type:'zoom', key}`; there are no Electron zoom roles, so page zoom stays 1. One zoom key from two sources within 150 ms (key and menu echo) applies once.
- Bridge additions: `zoom-key {key, at}`, `hover {altKey, node, source}`, `select {node}`, `tree {nodes, truncated}`; parent sends `request-tree`, `hover-node`, `select-node`, `select-relative {selector, move}`. Node ids are a per-document counter in a WeakMap (`src/bridge/layers.ts`); tree labels are capped and parsed again in the parent (`layersTree.ts`) because preview pages are untrusted. In select mode the bridge handles Enter, Shift+Enter, Tab and Shift+Tab, and a click focuses the preview.
- Layers panel: virtual list (28 px rows), re-requested 400 ms after `painted` while open. Measurement: `measure.ts` from the selected rect to the hovered rect, in frame px.

## Canvas layout file (pm-ideas)

```
UI drag / resize / add / page / hide ──► canvasStore.set (memory, notify) ──400 ms──► PUT /api/projects/:pid/canvas {canvas, baseHash, writer}
agent canvas_place, run level (lo-fi) ──► CanvasService.update ─┐          (stale baseHash → 409, the UI reloads)
restore / undo / edit-session discard ──► CanvasService.announce ┤
                                                                 ▼
             <main work tree>/.studio/canvas.json (temp file + rename, one mutex per project) ──► canvas.changed {canvas, hash, source, writer} on SSE
```

- One file per project, in the **main** direction's work tree. The layout spans directions (variation frames carry `directionId`), so a file per direction would make the canvas jump when a click on a variation frame changes the current direction. Forked directions get a copy of the file in their first tree; nothing reads those copies.
- Format (`src/shared/canvas-file.ts`, `serializeCanvasFile`): `{version: 1, frames: [{id, width, height, x, y, order, directionId?, path?, label?, hidden?}], lofi?: [directionId]}`. Keys sorted at every depth, integers only, 2-space JSON, trailing newline; frames sorted by `order` and renumbered 0..n-1; `lofi` sorted and left out when empty. Same input, same bytes, so diffs stay small. `parseCanvasFile` drops bad frames (id `f<digits>`, sides 200..4000, coordinates within 100 000, path rules of `cleanFramePath`, label at most 40 chars with no `<`, `>` or control chars) and keeps at most 24 frames.
- Not in the file: `activeId` (localStorage `design-studio.canvas.active.v1`, per project), the selection and the frame in view (presence, see Agent canvas tools).
- Versions: the drag writes do not make versions. They fold into the next version of the main direction: `commit()` stages the whole tree, and `commitFile` (direct edits, tweaks, DESIGN.md) adds `.studio/canvas.json` when it exists. `status()` drops the file from `changed`, so a drag never shows the unfinished-changes banner. `discard` keeps the canvas bytes across its reset. Undo and restore reset the tree, so the layout comes back with the version; a version from before the file existed removes it, and the canvas shows the default frame. `recordVersion` (undo, restore on the main direction) and the edit-session discard call `announce`, which sends `canvas.changed` with the file on disk. Drags made after the last version are lost on a restore, as any unsaved file is.
- Preview: the watcher ignores `.studio/`, so a layout write never reloads a frame or runs `status`.
- Agent: Write and Edit under `.studio/` are denied (`STUDIO_DIR_MESSAGE`, realpath and case-insensitive like the tweaks file). The agent changes the layout only with the canvas tools.
- Handoff: `source/.studio/canvas.json` is kept (the rest of `.studio/` is still skipped), and HANDOFF.md gets a Canvas table (frame, label, page, size, position).
- UI store (`canvasStore` in `canvasFrames.ts`): loads with `GET /api/projects/:pid/canvas` when the canvas mounts. A change of only `activeId` writes no file. Writes before the first load stay in memory. `canvas.changed` from this tab (same `writer`) or with the hash it already has is skipped; an event older than the last GET is skipped (SSE replays the log from 0). Another writer (agent, restore, a second window) replaces the layout and drops a pending write.
- Migration: when the file has no frames and localStorage `design-studio.canvas.v1` has a layout for the project, the UI writes it once (`migrate: true`, source `migrate`) and records the project in `design-studio.canvas.migrated.v1`, then deletes the old entry. A later restore to a version without the file does not bring the old frames back.
- Hidden frames: the frame "…" menu has Hide frame (not for the last shown frame); hidden frames render no iframe and do not count for Fit. The top bar file menu lists them as "Hidden"; a click shows the frame again and makes it live.

## Agent canvas tools (pm-ideas)

```
UI (Canvas) ──PUT /api/projects/:pid/canvas/presence every 1.5 s when it changed, else every 60 s──► CanvasService presence (memory, 10 min TTL)
agent: mcp__studio__canvas_list  ──► frames + lofi + {currentDirection, liveFrame, inView, selection}
       mcp__studio__canvas_place ──► CanvasService.update (source agent) ──► .studio/canvas.json ──► canvas.changed
       mcp__studio__canvas_point ──► canvas.point {frameId, selector?, at} ──► UI: unhide, make live, select-selector, zoom to selection or frame
```

- Code: `src/server/canvas/tools.ts` (plain functions on a `CanvasToolContext {canvas, project, direction, mode, plan}`; the SDK tools in `agent/tools.ts` and the mock call the same functions, so mock runs change the real file). `CanvasService` is made once in `index.ts` and passed to `createApp` and `createAgentRunner` (SDK driver option and mock driver option).
- `canvas_place {frames: [...]}` (1..12 items, applied in order in one write): `frame` (id or `@label`) moves or changes a frame, else a new `f<n>` frame is added (bound to the run's direction with `directionId`). Size: `viewport` preset, `width`/`height`, else the moved frame, the reference frame or 1440×900. Placement: one of `below` (left edges lined up), `rightOf` (top edges lined up), `leftOf`, `above` with `gap` (default 80), or `x`/`y` (they override the relative value), else right of all shown frames. `@label` matches the label without case; a bare string matches an id, then a label. An empty file is seeded with the default `f1` at the live size from presence. It refuses more than 24 frames, a bad path and two relations at once (tool error, nothing written). The result lists the placed frames and `warnings` for every pair of shown frames that overlap.
- `canvas_list` and `canvas_point` are read-only for files. `canvas_point` needs a known frame (or `f1` on an empty file); the UI acts on a point only when it is under 8 s old, so the SSE replay of old points on open does nothing.
- Policy: the three tools are in `STUDIO_MCP_TOOLS` at every level and mode (prompt cache rule) and in `NO_CHANGE_TOOLS` (the visual-diff baseline hold does not wait for them). `canvas_place` is denied in plan mode (`PLAN_MODE_DENY`) and in critique runs.
- Prompt: a `## Canvas` section in the system prompt (both modes) says when to use each tool.
- Bridge: `select-selector {selector}` (max 400 chars, `querySelector` in a try) scrolls the element into view and selects it like a click.
- Mock: `[canvas]` in the prompt runs canvas_list, then canvas_place (label f1 "Desktop", add "Mobile" right of it, add "Tablet" at 0,0, which overlaps), a second canvas_place that moves Tablet right of Mobile because of the warning, then canvas_point at `@Mobile` with selector `h1`.

## State frames (pm-ideas)

```
frame "…" menu › Make states │ palette "Make UI states of this page" │ /states in the composer
  → Studio.makeStates(frame = the live frame): RunRequest {prompt: "Make the UI states of <page> as frames.", mode edit, level = project default, states: {path, frame, width, height}}
  → POST .../runs (parseStatesRequest: path by cleanFramePath, frame id, sides 200..4000; edit mode, no task)
  → buildUserText adds a <states-task> block (src/shared/states.ts statesTaskBlock)
  → agent: states/<prefix><state>.html (HTML) or /states/<prefix><state> routes on window.location.pathname (React, no router package)
           + one canvas_place call: a row under the page frame, labelled by state, same size  + canvas_point at the first state
```

- The block lists the suggested states (empty, loading, error, validation error, open menu, success); the agent picks 3 to 6 that fit the page. `<prefix>` is empty for `index.html` and `<page stem>-` for other pages, so states of two pages do not collide.
- The state frames are ordinary frames with `path` and `label`, so they render, reload, resize and export like any extra page frame. The frame label shows the label (the state name) in place of the direction name.
- "Make states" in the frame menu is disabled while a run is going and on frames of another direction (make that direction current first).
- The prompt text in chat stays short; the task text is in the user message only, so the system prompt and its cache do not change.
- Mock: `[states]` in the prompt or `RunRequest.states` writes `states/<prefix>{empty,loading,error,success}.html` (a copy of the page with `<base href="../">` and a dashed state banner; React projects write them under `public/states/`), places the four frames in a row below the source frame with the real `canvas_place` (when the tool warns of an overlap, it moves the row below the lowest other frame), then points at `@Empty`.

## Lo-fi look (pm-ideas)

```
run start (edit mode, no task, no plan) → canvas.update: level wireframe adds the direction id to CanvasFile.lofi, prototype/polish removes it
"…" view row › Lo-fi look (aria-pressed)  → canvasStore.setLofi → PUT canvas (same file, same CAS)
useLofiFrames(stage, kind, current, lofi) → for each iframe.frame in the stage: direction = closest [data-direction-id] or current
  → on:  post {type: 'lofi-preview', css: lofiCss(fontDataUrl)}   off: post {css: ''}   (again on each bridge 'ready')
bridge PREVIEW_LAYERS 'lofi' → <style id="studio-lofi-preview"> last in <head>
```

- The style is grayscale (`html { filter: grayscale(1) }`) plus the bundled Kalam font (OFL, `src/ui/assets/fonts/kalam-latin-400-normal.woff2`) as `Studio Lofi Hand` on every element. The font loads once on first use and goes into the CSS as a base64 data URL, so the preview origin needs no font route.
- The flag is per direction and lives in `.studio/canvas.json`, so it reloads, goes into versions, and follows restore. A run at Prototype or Polish level turns it off, because those levels mean real visual design.
- The layer only changes the preview. User files, export, handoff and screenshots taken by the agent stay as they are.

## Versions, chat rewind and comments (Round 7)

- Version thumbnails: `GET /api/projects/:pid/versions/:vid/thumb` shoots the version snapshot on the first request (one shared shot queue, one at a time) and then serves `thumbs/v-<vid>.png`. The Versions panel fetches only rows in view while the panel is open, at most 2 at a time.
- Version names: `PATCH /api/projects/:pid/versions/:vid {name}` (max 80, empty removes) writes `version-names.json`; `Version.name` is in every version list. Commit messages never change.
- Compare: Side by side, Slider (`clip-path`, keyboard slider) and Overlay. `GET /api/projects/:pid/versions/:vid/diff/:other?w=&h=` returns the pixelmatch mask PNG (A = older by `createdAt`).
- Rewind per message: each user message maps to the version its run made. "Restore code here" uses the Versions panel restore (session reset, AC-54/54b). "Edit and rerun" makes a direction with `POST /directions {fromVersionId}` from the version before that run (its parent, like Claude Code's edit) and runs the edited prompt there; the old direction and its chat stay.
- Run names: `PATCH /api/runs/:runId {title}` (max 80, 409 while running) writes `RunSummary.title`. The chat search matches every word against the prompt and the name.

## Chat and agent (Round 3)

```
SDK stream_event / assistant msg ──► lifecycle sink ──► run.* events (SSE) ──► runState reducer
  content_block_start/delta: text, thinking       applyPartEvent (shared/run-parts.ts)
  tool_use / tool_result                           one ordered RunView.parts list
PreToolUse hook: policy guard ─► before-snapshot ─► Bash ask gate (prompt) ─► tool runs
PostToolUse hook: take queued messages from the inbox ─► additionalContext (lands at the next tool boundary)
tool result: after-snapshot ─► diffLines ─► run.tool.finished {diff, denied}
run end: RunSummary.parts (tool refs by id) ─► same order after reload; old summaries use the old layout
```

- Parts: `text`, `thinking` and `tool` parts in event order. Each thinking block is its own part; a text delta after a tool opens a new text part. `run.finished` keeps the live parts and only fills the final text (`withFinalText`), so a cancel keeps streamed text.
- Diffs: computed on the server (`shared/line-diff.ts`, capped, no binary). The before-snapshot is taken in the PreToolUse hook, because the CLI waits for it; `toolStarted` from the assistant message can come after the tool ran.
- Queue and steer: `PUT /api/runs/:runId/queue` replaces the queue, `POST /api/runs/:runId/steer` ends the turn and the server starts the next run with that text (`handle.next()`, `continueWithNext` in `http/app.ts`). Undelivered queued text after the last tool also starts a next run. Stop never sends the queue; the UI puts it back in the composer.
- Stop: `useEscapeStop` listens in the studio and takes `escape` from the bridge, only while a run is active and only when no popover, edit or comment mode took the key. `cancel()` emits `run.stopping` at once, so the UI shows Stopped and drops late stream events; the real SDK takes about 2 s more to settle. A new run on that direction waits up to 10 s for the old one (`runner.stopping`, `waitForStop` in `http/app.ts`) instead of a 409.
- SSE: `eventHub.ts` subscribes to named events from `EVERY_EVENT_TYPE`, a `Record` over every `StudioEventBody` type, so a new event type that is not listed fails the typecheck.
- Permission prompts (part 1): only Bash, and only when settings allow Bash. The prompt lives in the hook path (`agent/ask-gate.ts`), keyed by tool-use id, so auto-allowed calls also ask. `POST /api/runs/:runId/permissions/:requestId` answers it; a cancel or the 280 s timeout answers deny. Hard denies (outside the work tree, executed config files) stay hard denies and never become prompts. The mock agent calls the same gate.
- Permission prompts (part 2, always rules): "Always allow `<rule>`" saves a rule per project in `<data>/projects/<pid>/command-rules.json` (never in the work tree). `shared/permissionRules.ts` derives it: a command with a shell metacharacter (`;`, `&`, `|`, backtick, `$(`, `>`, `<` or newline) gives the exact command; else 2+ words give `<word1> <word2> *` and 1 word gives the exact command. A prefix rule matches only a command with no metacharacters that starts with those words. The Bash gate checks rules before it asks, for later calls in the same run too; hard denies run before the gate, so a rule never allows what they block. The server re-derives the rule from the pending command and returns 400 on a mismatch. `GET /api/projects/:pid/command-rules` lists, `POST .../command-rules/remove {rule}` removes; Settings shows them under "Allowed commands".
- Plan mode: `RunRequest.plan`; `findToolProblem` refuses write tools, Bash and tweaks with `PLAN_MODE_DENY`. The run ends with a plan card; Approve starts a build run with the plan text.
- Todos: `TodoWrite` is in the allowed tool list; the latest todo input of the direction pins above the composer and comes back after reload from the run summaries.
- Context meter: input + cache-read + cache-write tokens of the last API call (`message_start` usage), over the model window. Effort goes in `RunRequest.effort` and the SDK `effort` option. `system/api_retry` messages become `run.retry` events.
- Streaming: `markdownBlocks.ts` splits finished markdown blocks; each finished block is memoized and only the open tail re-parses. The chat scroll sticks to the bottom only while the user is at the bottom, and a new run sticks it again.
- `@` mentions: the studio lists work-tree files (`listWorkTree` in `http/mentions.ts`) and the direction's tokens; `shared/fuzzy.ts` ranks them. `RunRequest.mentions` carries the picks; the server reads each picked file (capped) into the prompt, and a token goes in as its name and value.

## Speed and telemetry (Round 5)

```
UI (sendTelemetry, src/ui/perfTelemetry.ts) ──► POST /api/telemetry ──► projects/<pid>/telemetry.jsonl
                                                   └─ app.start, frame.long with no projectId ──► <data>/telemetry.jsonl
server (lifecycle.ts) ──► run.first_token {stage: server}, file.write ──► projects/<pid>/telemetry.jsonl
GET /api/telemetry?projectId= | ?scope=app | (none: app + every project)
```

- Kinds: `preview.latency`, `select.latency`, `studio.open`, `file.write` (before), and `app.start` (first usable screen after paint: web = `performance.now()`, desktop = now minus the main process start, with the boot marks in `detail`), `run.first_token` (server: run start to the first text or thinking delta; visible: the Send click in the studio to the frame after the first delta, matched by `run.started`), `edit.commit` (direct edit request to response, the bytes are on disk; `detail.kind` style, text, name, move or batch) and `frame.long` (long animation frames ≥ 50 ms, `long-animation-frame` or `longtask`, the worst one and a count per 5 s window; flushed on hide and when the project scope changes). The run details Latency list shows first token, preview update and long frames.
- Desktop boot marks (`desktop/main.ts` `markBoot`, logged as `[desktop] boot <name> <ms>`): appReady, prepared, serverSpawned, serverReady, window, readyToShow, all from the main process start. The window gets the marks known at creation through `--studio-boot`, and the preload exposes them as `studioDesktop.boot`. `scripts/perf/desktop-start.ts` launches the dev build or `STUDIO_DESKTOP_EXECUTABLE` N times and writes `e2e/results/desktop-start-<label>.json`.
- Code split (`src/ui/screens.tsx`): Studio, the design systems library and New design system are lazy chunks. Home preloads them when idle; a restored session starts the Studio import before the session loads; a card click waits for the chunk before it switches screens. A screen renders the loaded component directly (no Suspense), because React reveals a suspended boundary no sooner than 300 ms after it suspends. Home-only parts that are not on screen at first (starter gallery and first-run panel, clarifying questions, the card menu and rename field, Advanced settings fields, the design system list) are their own chunks; a card hover or focus preloads Studio. Home and each lazy screen sit in `ScreenBoundary`, so a chunk that fails to load shows an error card with Reload. Home JS (entry plus preloads in `index.html`) must stay under 300 kB; `perf-r5.spec.ts` checks it.
- Optimistic Send: the studio adds a pending run (`emptyRun('pending-…')`, user message and "Starting") in the same frame as Cmd+Enter and clears the draft; `shownPending` hides it once a run with the same prompt starts in the direction, and the POST response replaces it. A failed send removes it and puts the draft back. Retries, polish and plan approval do not add a pending row.

## Keyboard, command palette and menus (Round 8)

```
src/shared/keymap.ts (one keymap: id, label, keys, group)
  ├─► shortcut sheet (ShortcutSheet.tsx)      ├─► tooltips (commands/keys.tsx tipWithKey)
  ├─► palette rows (Command.keyId)            └─► desktop/menu.ts accelerators (accelerator(id))
src/ui/commands/registry.ts (commands from useCommands sources, read only when a list opens)
  ◄── Studio (useStudioCommands) ◄── Canvas (useCanvasCommands) ◄── composer (composerCommands)
  ──► palette (Cmd+K) · / list in the composer (commands with a slash name) · desktop menus (COMMAND_EVENT)
```

- The palette and the sheet are one lazy chunk (`commands/CommandLayer.tsx`). App.tsx holds only a capture keydown listener for Cmd+K and `?` (Ctrl+Shift+? in text fields) and the `studio:command-layer` event; the event name is a string there, not an import, so the registry stays out of Home JS. Home preloads the chunk when idle; the Studio preloads it 1.5 s after open. Closed, nothing is mounted and no listener runs; the sheet's key listener runs only while it is open.
- Commands are getters: a source is called when the palette or the / list opens, so a closed palette costs nothing per render. Disabled commands show the reason and do not run. Recent commands (5) are in localStorage `design-studio.commands.recent.v1`.
- Fuzzy rank (`commands/fuzzy.ts`): each query word must match the start of a title word (best), a substring, a keyword, or a subsequence. "zo fi" ranks "Zoom to fit" first.
- Keys in the preview: the bridge posts `app-key` (`palette`, `shortcuts`, `next-region`, `prev-region`) for Cmd+K, `?` outside text fields and F6, so they work with focus in the iframe. F6 and Shift+F6 move focus between the canvas toolbar, the canvas (`.stage`, `tabIndex=-1`), the side panel tab and the composer.
- Right-click in select mode: the bridge selects the element and posts `context-menu` with frame coordinates; the parent maps them through the iframe rect and scale and opens `PreviewMenu` (ask the agent, select parent or child, copy CSS, zoom to selection, show in layers).
- The / list in the composer is the skill picker with app commands added: a command shows only when every query word starts a word of its slash name, so plain skill searches are unchanged. Tab completes the top row; Enter runs a command or adds a skill. Shift+Tab in the composer cycles Edit, Plan, Critique.
- Element resize drags add `body.element-resizing` (frames take no pointer events) and hold the live HTML frame swap until the drag ends (`usePreviewFrames.holdSwap`); a swap during a drag dropped the preview style.

## MCP server (Connect to Claude Code)

The MCP server lets an outside agent (Claude Code or any MCP client) read projects and, when the user turns on Allow edits, work on the design files and the canvas directly. It never starts, steers or stops a studio agent run.

```
MCP client ──HTTP JSON-RPC, Bearer <mcp token>──► MCP server 127.0.0.1:<port>/mcp   (mcp/server.ts)
                                                    ├─ read tools   (mcp/tools.ts, ExportDeps)
                                                    └─ edit tools   (mcp/edit-tools.ts, only when Allow edits is on)
                                                         │ app.request('/api/...', x-studio-token)   same routes, locks and checks as the UI
                                                         │ canvas/tools.ts canvasList / canvasPlace    same code as the agent canvas tools
                                                         │ agent/permissions.ts evaluateToolUse('Write') for write_file paths
                                                         └─ approvals.ask()  only for an export folder outside ~/Downloads and the projects folder
                                                              ├─ bus: mcp.approval / mcp.approval.resolved (project event stream)
                                                              └─ GET /api/mcp/approvals, POST /api/mcp/approvals/:id {allow}   (studio token)
```

- Settings: `<dataDir>/mcp.json` `{enabled, edits, port, token}` (mode 0600). Both flags are off by default. The port is 4590; when it is taken the server picks a free port and saves it. The token is separate from the studio token. The server listens on 127.0.0.1 only, checks the `Host` header, refuses any `Origin` header and needs `Authorization: Bearer <token>`. Body cap 1 MB.
- UI: Export dialog, Handoff tab, "Connect to Claude Code". The first switch starts or stops the server. The second switch, "Allow edits", shows while the server is on. `POST /api/mcp {enabled?, edits?, rotate?}`. Turning either switch off denies the open approval requests. The approval UI and the activity feed are in "MCP in the app" below.
- Client name: `initialize` reads `clientInfo.title` or `clientInfo.name` (letters, digits, ` ._@()-`, 40 characters; default "MCP client") and returns an `mcp-session-id` header. Later calls with that header use the name for version titles ("Edit by <client>") and comment authors.
- Read tools (always listed): `list_projects`, `list_versions`, `get_frame_html`, `get_tokens`, `get_design_md`, `get_screenshot` (also `frameId`: a canvas frame id or `@label` sets the page, the size and the direction), `list_files`, `read_file`.
- Edit tools (listed only when `enabled && edits`; a call while edits are off gets an `isError` result that says how to turn it on). `tools/list` uses `listChanged: false`, so the client must reconnect after a change.

| Tool | Calls | Refused during a studio run |
|---|---|---|
| `canvas_list {projectId, directionId?}` | `canvasList` | no |
| `canvas_place {projectId, directionId?, frames[]}` | `canvasPlace`, write source `agent` | yes |
| `canvas_point {projectId, directionId?, frame, selector?}` | checks the frame, emits `mcp.point`; returns `shown: false` always and `badge: true` when a studio window has the project open | no |
| `add_frame {projectId, directionId?, path?, viewport?, width?, height?, label?, rightOf?, below?}` | `canvasPlace` with one new frame | yes |
| `remove_frame {projectId, frame}` | `canvas.update` without the frame (the last frame stays) | yes |
| `write_file {projectId, directionId?, path, content ≤ 512 KB}` | atomic write, `versions.commitFile` "Edit by <client>", `publishVersion` | yes |
| `edit_element {projectId, directionId?, path?, selector, style?, text?}` | headless render finds the element and its source location, then `POST /d/:did/direct-edit` (the inspector path) | yes |
| `add_comment {projectId, directionId?, path?, selector?, text}` | `POST /d/:did/comments` as `draft` with `author`; no selector = frame comment on `body` | no |
| `reply_comment`, `resolve_comment` | `POST .../replies` with `author`, `PATCH {status:'resolved'}` | no |
| `create_project {name, kind, designSystemId?}` | `POST /api/projects` with `startRun: false`, default projects folder only | n/a |
| `restore_version {projectId, directionId?, versionId}` | `POST /d/:did/restore` (also restores `.studio/canvas.json`) | yes |
| `apply_design_system {projectId, directionId?, packId}` | `POST /d/:did/design-system/apply` | yes |
| `export {projectId, directionId?, versionId?, format png/html/pdf/handoff/zip, scale, frames, folder?}` | `POST /export`, or `POST /handoff` then `GET /handoff/:folder/zip`; files written with `wx` and a `-2`, `-3` suffix | no |

- Run rule: the tools marked "yes" answer "A studio run is editing this design. Try again when it finishes." while a studio run is going in that direction. The routes check again under the direction lock.
- write_file paths: relative, no `..`, then the studio agent's Write policy: inside the work tree after realpath (symlinks out are refused), not `.git` or `node_modules`, not `.studio/`, not `design-system/tokens.css`, not the tweaks file, not build config files run as code, and not `source/` in design-system draft projects.
- Approvals (`mcp/approvals.ts`): a pending record `{id, tool, action, title, detail, projectId, client, createdAt, expiresAt}`. The tool call waits up to 120 s, then refuses. Title and detail are one line with control characters removed (200 and 600 characters). At most 10 open. The app counts as open while a project event stream or an approvals long poll is open (6 s grace). With no app open the tool is refused at once. Only the studio token can answer.
- Folders (`mcp/folders.ts`): absolute (or `~/`), realpath, an existing folder, not inside the data dir, not `/`, `/Users`, `/Volumes`, `/private` or the home folder itself, and not inside `/System`, `/Library`, `/usr`, `/bin`, `/sbin`, `/etc`, `/var`, `/private/etc`, `/private/var`, `/dev`, `/opt`, `/Applications`, `/Network` or `~/Library`.
- Input rules: zod schemas (`z.toJSONSchema` for `inputSchema`), ids `^[A-Za-z0-9_-]{1,64}$`, comment 2,000 characters, selector 2,000, name 120, style keys from `DIRECT_STYLE_PROPERTIES`.
- Annotations: `readOnlyHint: true` on the read tools, `canvas_list` and `canvas_point`. `destructiveHint: true` only on `restore_version`, `remove_frame` and `apply_design_system`. `idempotentHint: true` on `canvas_list`, `canvas_point`, `remove_frame` and `resolve_comment`. `openWorldHint: false` on all.

### MCP in the app

```
edit tool call ──► handler returns {result, activity?} ──► callEditTool: on success activity.record()
  mcp/activity.ts  <data>/projects/<pid>/mcp-activity.json (last 200) ──► bus mcp.activity {activity}
canvas_point ──► bus mcp.point {client, frameId, label, selector?, at}   (not canvas.point: that one moves the view)
approvals.ask ──► bus mcp.approval ──► desktop-link 'mcp-approval' ──► native.mcpApproval (Notification when no window is focused)
UI: useMcpFeed (GET /api/projects/:pid/mcp/activity + events, dedupe by id) ──► ChatPanel timeline
    useCanvasPoint ──► McpPointBadge          App ──► lazy McpToasts (GET /api/mcp/approvals long poll)
```

- Activity: `McpActivity {id, projectId, directionId, tool, client, summary, versionId, beforeVersionId, frameId, at}`. The server writes the summary (`mcp/activity-text.ts`): "Wrote index.html", "Created about.html", "Edited h1 color and text", "Placed Mobile below Desktop", "Added Mobile right of Desktop", "Removed Mobile", "Restored “<version title>”" (the app shows no version numbers, so the title stands in for "v12"), "Applied Warm Human", "Added comment #3 on h1", "Replied to comment #3", "Resolved comment #3", "Created project X", "Exported PNG to <file>". Calls that change nothing (`canvas_list`, `canvas_point`, `write_file` with the same text, errors) record nothing. `beforeVersionId` is the parent of the version the call made.
- Feed: the left chat pane merges runs (`startedAt`) and activity (`at`) by time (`McpFeed.timelineOf`). Consecutive entries from one client make one block; a run or an approval card between them starts a new block. The block header has the client name, a dot that is green while the last entry is under 60 s old, and Disconnect (`POST /api/mcp {edits:false}`; the server stays on, open approvals are denied). A block shows the last 5 rows and "Show N earlier". Only entries of the open direction (or with no direction) show. Search hides the feed.
- Undo: a row with `versionId` and `beforeVersionId` has Undo, which calls the same restore as the Versions panel (`useRewind.onRestore(beforeVersionId)`), so it is a normal "Restored …" version. It is off while a run or another action is going. The "Undone" mark is local to the page.
- Approval card: `mcp.approval` / `mcp.approval.resolved` from the project event stream (the stream replays from seq 0, so old requests show again as one line). Pending: title, detail, Allow once / Deny (`POST /api/mcp/approvals/:id`), and the time left. Resolved: one line "Allowed", "Denied", "Expired" or "Closed". A pending card past `expiresAt` shows as Expired. There is no env var for the 120 s timeout.
- Toasts: `McpToasts` (lazy, not in Home JS) long-polls `GET /api/mcp/approvals?wait=25` (15 s pause while edits are off). It shows requests for any project that is not open in the studio, so on Home it shows them all. The long poll also counts as "app open" for the approval queue.
- Desktop: the server sends `{kind: 'mcp-approval', projectId, approvalId, title}` over the desktop link; `native.mcpApproval` shows a Notification "Approval needed" only when no studio window is focused (and not with `STUDIO_DESKTOP_NOTIFY=off`); a click opens the project.
- Pointing badge: `mcp.point` events younger than 20 s show a floating card at the top of the canvas: "<client> is pointing at <frame label>", Show and a close button. It hides after 20 s, on Show or on close. Only Show moves the view: unhide the frame, make it live, zoom to it, then `select-selector` if the call sent a selector. The studio agent's `canvas.point` keeps its old behavior.
- Comments: a comment or reply with `author` shows the author's initial on the pin in `--agent-bg` / `--agent-fg` (a fixed stone color, no dark value, like the pin tokens), the name in the thread card head, on replies and in the pin tip. The Comments pane lists draft comments that have an author under "From outside agents" with Resolve; the author also shows on queued, sent and resolved rows.

## End-to-end tests

`npm run e2e` (Playwright, installed Chrome). Each Playwright config has its own `outputDir` under `test-results/` and launches Chrome with site isolation off for tests only: Playwright maps clicks into an out-of-process iframe without the parent's CSS scale, and each project origin is its own site. Global setup builds the UI and starts the real server with `STUDIO_AGENT=mock`, a temp `STUDIO_DATA_DIR`, and ports 4270/4271/5300. The server gets `STUDIO_CLAUDE_HOME` set to a fixture home (`e2e/support/skills-fixture.ts`), so tests never read the real `~/.claude`. Specs `e2e/a-*.spec.ts` to `e2e/f-*.spec.ts` cover the release workflows; `e2e/latency.spec.ts` writes `e2e/results/latency.json` (gates: open 1000, HTML 150, React 400, select 50, user message 50, first token 1500, direct edit 200 ms, p95); `e2e/perf-r5.spec.ts` writes `e2e/results/perf-r5.json` (telemetry kinds, Home start, open from Home, versions at 100, Home grid scroll, Home JS size).

## Ports (env overrides)

`STUDIO_PORT` (4170), `STUDIO_PREVIEW_PORT` (4171), `STUDIO_VITE_PORT_BASE` (5200). Defaults live in `contracts.ts`; only the server reads env.

## Desktop shell

```
npm run electron:dev
  → scripts/electron-dev.ts: build dist/ui when missing or older than src/ui, esbuild desktop/*.ts → desktop/dist, then `electron .` (package.json "main" = desktop/dist/main.js)
  → desktop/main.ts (Electron 44.9.3, Node 24.22)
      ├─ server child: process.execPath + ELECTRON_RUN_AS_NODE=1, `--import tsx/dist/loader.mjs src/server/index.ts`, own process group, stdio fd 3 = IPC
      │     ├─ Vite runners: fork() from vite-manager, ELECTRON_RUN_AS_NODE=1 added when process.versions.electron is set
      │     └─ BrowserPool → RenderBackend "electron" → process.send(render request) ──┐
      ├─ RenderHost (desktop/render-rpc-host.ts) ◄── child 'message' ─────────────────┘
      │     └─ RenderPool: ≤ 3 hidden BrowserWindows, partition studio-render-<n> (in memory), no preload, CDP via webContents.debugger
      └─ BrowserWindow → http://127.0.0.1:<studio port>  (contextIsolation, sandbox, no nodeIntegration, preload.cjs)
```

- **Packaged (P1, `npm run desktop:pack`):** `desktop/build.ts` stages `build/desktop/app` (main, preloads, first-run page; packed into a 109 KB `app.asar`) and `build/desktop/resources` (copied to `Contents/Resources/`): `server/index.js` and `server/vite-runner.js` (esbuild, ESM, packages external), `server/node_modules` (P2: only the packages the esbuild metafiles of `index.js` and `vite-runner.js` import as externals, plus their runtime dependency closure; `playwright-core` is never shipped; host arch), `git/` (slim dugite git: `bin/git`, `libexec/git-core/git`, templates, `etc/gitconfig`; 6.9 MB), `ui/`, `packs/`, `templates/react-vite/`, `react-template/` (prebuilt template `node_modules`), `bridge.js`, `axe.min.js`. `npm run desktop:pack` = `scripts/desktop-pack.ts`: stage, then `electron-builder --mac --arm64 --publish never`. `electron-builder.yml`: dir, dmg, zip; arm64; hardened runtime; `desktop/build-resources/entitlements.mac.plist` (allow-jit, allow-unsigned-executable-memory, disable-library-validation) for the app and every nested binary (slim git, esbuild, rollup, fsevents); no Claude Code binary is shipped (the `@anthropic-ai/claude-agent-sdk-<platform>-<arch>` packages are left out of the closure; the app uses the user's `claude`); size settings: `electronLanguages: [en]`, `compression: maximum`, DMG `UDBZ`; staging prunes `server/node_modules` (source maps, Markdown, test and doc folders, `.ts` and `.d.ts`) and `react-template/node_modules` (the same but types kept, plus TypeScript's tsserver and message translations; `tsc -b` still works), and makes each `esbuild/bin/esbuild` a relative link to the identical `@esbuild/darwin-<arch>` binary (`desktop/prune.ts`); `notarize: false` (the `afterSign` hook `desktop/notarize.cjs` does it). Identity: ad-hoc (`-`) unless `STUDIO_SIGN_IDENTITY` names one; `CSC_IDENTITY_AUTO_DISCOVERY=false` always, so a Developer ID in the Keychain is never picked up by itself. Notarization runs only when `STUDIO_NOTARY_PROFILE` names a notarytool Keychain profile and the signature is not ad-hoc. Info.plist: `designstudio` URL scheme, a `public.folder` document type (Alternate rank, so Dock drop and Open Recent work), Documents, Desktop and Downloads usage strings. `STUDIO_APP_VERSION` overrides the version; `STUDIO_UPDATE_URL` writes `app-update.yml` (generic provider) and `latest-mac.yml`; `STUDIO_PACK_OUT` moves the output. Release stages compile out `STUDIO_RENDER_HOST_MODE` (`__STUDIO_RELEASE__`); `STUDIO_TEST_BUILD=1` keeps it. Main runs `<app>/Contents/MacOS/Design Studio <Resources>/server/index.js` with `ELECTRON_RUN_AS_NODE=1` and `STUDIO_RESOURCES_DIR=<Resources>`.
- **Render backends (P2, `src/server/preview/render-backend.ts`):** `BrowserPool` (render_check, screenshots, tiles, quality probes, axe, visual-diff baselines; it is the only browser the server opens) talks only to a `RenderBackend` (`open(viewport) → RenderPage {goto, evaluate(expression), screenshot(path, clip?), errors, close}`). `chooseBackend`: `STUDIO_RENDER_BACKEND=playwright|electron` wins; else `electron` when `STUDIO_RENDER_IPC=1` (set by main) or `STUDIO_RENDER_SOCKET` is set; else `playwright` (system Chrome through playwright-core, the `npm start` and test default). `render-electron.ts` sends `{type:'studio-render', id, op, args}` over the child's IPC channel (fork stdio `'ipc'`) or, for tests, over a unix socket (mode 0600) with a token. There is no `--remote-debugging-port`. Dev and test drivers that act as a user's browser stay on system Chrome and are not in the server bundle: `scripts/dev-check.ts` (clicks inside frames), `scripts/ac-*/real*.ts`, `scripts/real-smoke.ts`.
- **Render pool (`desktop/render-pool.ts`):** up to 3 hidden windows (`show: false`, `paintWhenInitiallyHidden`, `backgroundThrottling: false`, sandbox, no preload), each in its own non-persistent partition with all permissions denied; idle windows close after 30 s; a crashed renderer drops its slot. Per page: `Emulation.setDeviceMetricsOverride` (dpr 1), hidden scrollbars, `Runtime.evaluate` (awaitPromise, returnByValue) for probes and axe, errors from `Runtime.consoleAPICalled`, `Runtime.exceptionThrown` and `Log.entryAdded` (favicon misses dropped), network idle = no request in flight for 500 ms (capped by the settle timeout). Screenshots: `Page.captureScreenshot` with `captureBeyondViewport` and a clip; full pages taller than 8000 px are captured in 8000 px segments and joined (a 20000 px page came out whole). Navigation: `http:` only, never the studio origin, no `window.open`. The pool closes on quit. Main's studio window guards skip render contents (`isRenderContents`). `app.commandLine` sets `force-color-profile=srgb` so screenshots match Chrome's colors.
- **Render tests:** `STUDIO_E2E_RENDER=electron` makes the e2e global setups start `desktop/render-host.ts` (Electron, socket transport) and point the test server at it; with `STUDIO_E2E_APP` electron is the default (the packaged server has no playwright-core) and the host is the dev Electron (`desktop/dist/render-host.js`), because release builds compile out `STUDIO_RENDER_HOST_MODE`. The shipped pool behind main's IPC is covered by the `e2e:desktop` render test and real runs. `npm run render:parity` (`scripts/render-parity.ts`) renders the fixtures and two real pages (from `STUDIO_PARITY_PAGES_DIR`; skipped when the folder is missing) at 390/768/1440 through system Chrome, the electron backend, and playwright driving the same Electron, and compares pixels (pixelmatch, threshold 0.1) and findings; report in `test-results/render-parity.json`.
- **Resources (`src/server/resources.ts`):** with `STUDIO_RESOURCES_DIR` set, `app.ts` serves `ui/` (and drops `DEV_UI_ORIGINS`), `packs.ts` reads `packs/`, `projects.ts` uses `templates/react-vite` and copies `react-template/node_modules` into `<data>/cache/react-template` when its `package.json` matches (no npm), `bridge-bundle.ts` reads `bridge.js` (no esbuild at runtime), `axe.ts` reads `axe.min.js`. Unset, every path is the repo path, so `npm start` and tests do not change.
- **Node (dev):** the server runs on Electron's own Node through the tsx loader, the same loader vite-manager uses. `node_modules/.bin/tsx` was not used: its `#!/usr/bin/env node` shebang picks whatever node is on PATH (nvm here, none in a Finder launch), so it would not test Electron's Node.
- **Ports (`desktop/ports.ts`):** try the saved set in `userData/ports.json`, then 4170/4171/5200, then pairs 4570+10k/4571+10k with Vite base 8200+200k. A set is used only when the studio, preview and Vite base ports are all free. Nothing is ever killed. The chosen set is saved, so the origin (and its localStorage) stays the same on the next launch.
- **Data:** `STUDIO_DATA_DIR` when set; else packaged (`app.isPackaged`) = `~/Library/Application Support/Design Studio/studio-data`; else the repo `studio-data`.
- **Data-dir lock (`src/server/store/data-lock.ts`):** the server creates `<data>/studio.lock` (`{pid, port, startedAt}`, exclusive create) before it opens stores, and removes it on exit. A live holder → the server prints who holds it and exits 75; a dead pid or unreadable file → it takes over. `npm start` uses the same code. Main checks the lock first: an explicit `STUDIO_DATA_DIR` that is locked → error and quit; the default folder locked → dialog offering `userData/studio-data-desktop`, never a shared folder.
- **Server env (`desktop/env.ts`):** built from an allowlist: `HOME USER LOGNAME SHELL TMPDIR LANG`, every `STUDIO_*`, `DESIGN_MEMORY_HOME`, `ANTHROPIC_API_KEY`, then the port and data vars, `STUDIO_CLAUDE_PATH`, `STUDIO_PARENT_PID`, `STUDIO_LOGIN_SHELL_PATH`, the git vars, `STUDIO_RESOURCES_DIR` (packaged) and `ELECTRON_RUN_AS_NODE=1`.
- **Agent env (`sdk-driver.ts` `buildEnv`):** `HOME USER LOGNAME PATH SHELL TMPDIR LANG ANTHROPIC_API_KEY HTTPS_PROXY HTTP_PROXY NO_PROXY NODE_EXTRA_CA_CERTS` only (USER is needed for the Keychain login). `STUDIO_CLAUDE_PATH` becomes `pathToClaudeCodeExecutable`. Packaged: the user's `claude` from `desktop/claude-cli.ts` (`STUDIO_CLAUDE_PATH`, login-shell PATH, fixed PATH folders, then known install folders; the launcher path is passed, not its realpath, so `claude update` does not strand a running server). When none is found the key is left out. Dev: the SDK's npm binary unless `STUDIO_CLAUDE_PATH` is set. After Check Setup, main restarts the server if the resolved path changed. `CLAUDE_CODE_*` and `ANTHROPIC_BASE_URL` from a Claude Desktop launch never reach the server or the agent. `STUDIO_AGENT=mock` passes through.
- **PATH:** the server gets the fixed folders only (`/opt/homebrew/bin /usr/local/bin /usr/bin /bin /usr/sbin /sbin ~/.local/bin`, the dir of a real `node` binary or `npm_node_execpath`). The PATH from `$SHELL -ilc` (clean env, 3 s timeout, sentinel-wrapped) goes in `STUDIO_LOGIN_SHELL_PATH`; the agent appends it only for runs with Bash or install allowed.
- **git (`desktop/git-choice.ts`):** `/usr/bin/xcode-select -p` first (never `/usr/bin/git` before it, because the stub opens the install dialog). Success → `STUDIO_GIT=/usr/bin/git`. Failure → bundled git (`<Resources>/git` packaged, `node_modules/dugite/git` in dev; dugite is a devDependency): `STUDIO_GIT=<git>/bin/git`, `GIT_EXEC_PATH`, `GIT_TEMPLATE_DIR`. `STUDIO_DESKTOP_GIT=bundled|system` forces one. `versions.ts` uses `STUDIO_GIT` when set and skips `git --exec-path`.
- **First-run screen (`desktop/first-run.*`, `setup-checks.ts`):** local `first-run.html` (CSP `default-src 'none'`, own sandboxed preload, IPC only from that page). Checks: git (required), Claude Code (not found → fail with the install command, Copy install command, Open Terminal; `<claude> --version` against the SDK's `claudeCodeVersion`: older major.minor → fail "Update Claude Code", newer → warning; then `<claude> auth status --json` with the base env plus the login-shell PATH, 15 s timeout; logged out → copy `claude`, Open Terminal), disk space (required, fail < 1 GB), network to api.anthropic.com (warning), design memory library (optional). Shown at launch only when a required check fails (`STUDIO_DESKTOP_SETUP=always|skip` for tests), and from the app menu "Check Setup…". Checks run while the server boots.
- **Readiness:** the `Design Studio running at` line on stdout, or `GET /` answering, within 90 s. A server exit during startup shows an error box with the log path.
- **Logs:** server stdout and stderr append to `userData/logs/server.log`; in dev they also go to the console.
- **Window (`desktop/window-state.ts`):** `userData/window-state.json` keeps normal bounds and maximized per display layout (key: sorted display ids and bounds) plus the last layout. Launch uses the entry for the current layout, else the last one if it is still on a display, else the default size. The P0 single-state file still reads. The preload exposes only `window.studioDesktop = {platform, version, boot, onCommand, setContext, pickFolder, pathForFile, openDropped}` (`boot` = `{startedAt, marks}` or null). `pickFolder({title, defaultPath?})` is `ipcRenderer.invoke('studio:pick-folder')`; main answers only the studio window (`isStudio(sender)`), checks the args (`parsePickFolderRequest`: title ≤ 200 chars, absolute default path ≤ 4096 that exists), shows `dialog.showOpenDialog(<that window>, {properties: ['openDirectory', 'createDirectory']})`, one at a time, and returns the folder or null. Open Folder ⌘O uses the same dialog code.
- **Navigation:** every webContents gets a `will-navigate` guard and a window-open handler. Main-frame navigation stays only for the studio origin, the preview port (`127.0.0.1` and `p-*.localhost`) and the Vite range on loopback. Everything else, and every `window.open`, goes to `shell.openExternal` for http, https and mailto only; other schemes are dropped.
- **Permissions:** request and check handlers allow `clipboard-read` and `clipboard-sanitized-write` only.
- **Menu (`desktop/menu.ts`, `desktop/native.ts`):** app (Check for Updates…, Check Setup…), File (New Project ⌘N, Open Folder… ⌘O, Open Recent, Reveal Work Tree in Finder, Reveal Last Export in Finder), Edit (custom Undo ⌘Z and Redo ⇧⌘Z, then the clipboard roles), View (Command Palette… ⌘K, Keyboard Shortcuts, Show Layers ⌥1, Chat/Design/Components/Comments/Versions, canvas zoom commands, Reload, DevTools, full screen), Canvas (Select, Comment and Pen tools, Live Preview, Last Completed Version), Go (Home ⇧⌘H, Next and Previous Direction ⌥⌘] ⌥⌘[, Project Settings… ⌘,, Edit DESIGN.md), Run (Run ⌘↵, Stop ⌘.; enabled from the renderer context), Window, Help (Keyboard Shortcuts). The View, Canvas, Go and Help items send the generic `{type:'command', id}` (id `/^[a-z][a-z0-9.-]{0,63}$/`); the UI turns `palette` and `shortcuts` into `studio:command-layer` and every other id into the registry `studio:command` window event. Their keys come from `src/shared/keymap.ts` `accelerator()` with `registerAccelerator: false`: the menu shows the key, the renderer acts on it, so a key press never fires twice. Items that need a project are disabled while no project is open. Main sends menu commands to the studio window only (`studio:command`); the preload queues them until the UI subscribes (`window.studioDesktop.onCommand`). The UI (`src/ui/desktop.ts`) gives each command to the newest handler first: the composer (Run sends the draft, Stop cancels), version undo (`useUndoShortcut`), then the app (new project, open project, open folder, text undo). Undo: a focused text field gets `document.execCommand('undo')`; anywhere else in the studio (canvas, preview iframe, panels) it is version undo; a non-studio window gets `webContents.undo()`. A ⌘Z or ⌘↵ the page already handled (defaultPrevented) is not run again by the menu. Redo outside text fields does nothing: there is no version redo.
- **Renderer context:** the UI sends `{projectId, directionId, running}` on `studio:context`; main accepts it only from the studio window and only with safe ids. It drives the menu state, Reveal Work Tree and recents.
- **Server link (`src/server/desktop-link.ts`, `desktop/server-link.ts`):** with `STUDIO_RENDER_IPC=1` the server sends main `{kind:'hello', token, dataDir}` once and `run-started` / `run-finished` for every run over the same IPC channel as render requests. Main uses the token for `GET /api/projects/:pid` only (names, work trees). No new HTTP route.
- **Folders, links, recents:** `open-file` and `open-url` are registered in `will-finish-launching`, so a cold launch keeps them; commands wait until the studio page has loaded. `open-file` takes absolute folders only (files and relative paths are dropped) and opens the project whose imported source or work tree is that folder, else imports it. `designstudio://open?project=<id>` (id `^[A-Za-z0-9_-]{1,64}$`) and `designstudio://new`; anything else is dropped and never navigated to. A second instance forwards a `designstudio:` argv entry (Windows and Linux path; on macOS links arrive as `open-url`). Opening a project calls `app.addRecentDocument(<imported source or work tree>)` and keeps `userData/recent-projects.json` (8); the Dock menu shows New Project and the last 5.
- **Reveal in Finder:** main resolves the work tree from the server and reveals it only when it is inside the data folder or the imported source; the renderer never passes a path. Downloads from the studio window (version exports) save to `~/Downloads` (or `STUDIO_DESKTOP_DOWNLOADS`) with a unique name; other windows' downloads are canceled.
- **Notifications (`desktop/notify.ts`):** on `run-finished`, only when no studio window has focus and the run was not canceled: "Run finished", "Run failed" (with the error) or "Run stopped at the budget limit", body `<project>: <prompt>`. Clicking opens the project. `STUDIO_DESKTOP_NOTIFY=off` keeps the `studio-notification` app event but shows nothing (tests). The same runs, when still no studio window has focus after the project lookup, add 1 to the dock badge (`app.dock.setBadge`, app event `studio-badge`); focus on a studio window clears it. Web (`src/ui/useRunNotice.ts`): when the tab is hidden, `Notification.permission` is `granted` and the page is not in the desktop app, a run that ends after the tab hid shows one `Notification` (title = project name, body = status). The UI never asks for permission.
- **Folder drop:** the lazy desktop chunk (`useDesktopApp.ts`) listens for `dragover`/`drop` on `window` and skips drops that a page element already handled (`defaultPrevented`) or that land in the composer `.prompt`. For the first dropped directory it gets the path with `studioDesktop.pathForFile` (`webUtils.getPathForFile`) and sends it on `studio:drop-folder`. Main accepts it only from the studio window (`isStudio`), checks it (`parseDroppedPath`: absolute, ≤ 4096, no NUL), then `NativeShell.openFolder` checks again that it is an absolute directory and opens it like File > Open Folder. Files are ignored. Drops on the preview iframe never reach the listener.
- **Auto-update (`desktop/updater.ts`, electron-updater 6.8.9):** on only in packaged builds with `app-update.yml` or `STUDIO_UPDATE_FEED=<http url>` (generic provider). Checks at launch (`STUDIO_UPDATE_CHECK=off` skips), every 6 h and from the menu. Downloads by itself, never installs on quit. When the download is ready: a run active → "A run is in progress. Design Studio asks again when it finishes." and it asks again after the last run ends; else "Restart Now / Later". A run that starts before the click defers again. An install error shows "Design Studio could not install the update" and the app keeps running. Log: `userData/logs/updater.log`. Squirrel.Mac checks that the new app satisfies the running app's designated requirement, so in-place updates need the same Developer ID on both builds; ad-hoc builds stop there (see DESKTOP_PLAN.md P3).
- **Single instance:** `requestSingleInstanceLock`; a second launch focuses the window and forwards its link. `STUDIO_DESKTOP_USER_DATA` moves userData (and so the lock) for tests.
- **Watchdog:** the server polls `process.ppid` every second when `STUDIO_PARENT_PID` is set and shuts down (stopping Vite children) when main is gone. Vite runners exit on IPC disconnect. Main writes `userData/server.pid`; the next launch stops a still-running group whose command is a studio server. A server exit after ready shows a dialog (Restart, Restart and Show Log, Quit) with the log path. Restart waits up to 5 s for the old ports to free, so the origin stays the same. A quit during boot or restart never opens a window or an error box.
- **Quit:** `before-quit` waits for the server: SIGTERM to the process group, 6 s grace (the server stops its Vite children and force-exits at 5 s), then SIGKILL to the group if any member is left. SIGINT and SIGTERM to the main process go through `app.quit()`.
- **Test:** `npm run e2e:desktop` (`playwright.desktop.config.ts`, `e2e/desktop.spec.ts`, `e2e/desktop-setup.spec.ts` and `e2e/desktop-native.spec.ts`: menu items clicked through `Menu.getApplicationMenu().getMenuItemById(id).click()`, because Playwright keys go in through CDP and never reach menu accelerators; `open-file`, `open-url` and `second-instance` sent with `app.emit`; `shell.showItemInFolder` and `dialog.showOpenDialog` stubbed; `_electron.launch`, mock agent, temp data and userData). `STUDIO_DESKTOP_EXECUTABLE=<app>/Contents/MacOS/Design Studio` runs the same specs against the packaged app; `STUDIO_E2E_APP=<app>` makes `e2e/support/server.ts` start the packaged server for every other config. The setup spec forces dugite git and checks versions. It checks the renderer lockdown, external links (stubbed `shell.openExternal`), the server env, an HTML create plus mock run and version, React HMR from a disk edit with Vite children on Electron's Node, and no group member left after quit. The default `playwright.config.ts` ignores it. `scripts/update-check.ts <0.1.0 app> <0.1.1 dir>` runs the local update flow (feed on 127.0.0.1, a slow mock run to prove the deferral). `scripts/clean-machine-check.ts <app>` launches with PATH `/usr/bin:/bin:/usr/sbin:/sbin`, bundled git and the setup screen forced, then makes an HTML and a React project and a render check.

## App theme (Round 9)

- Preference `system | light | dark`. An inline classic script in `index.html` (not a module, so it is not a Home JS file) sets `data-theme` (resolved `light`/`dark`) and `data-theme-pref` on `<html>` before first paint and exposes `window.studioTheme.get/set`; it fires `studio-theme` on change. Web keeps the preference in localStorage `design-studio.theme`.
- Desktop: the origin can change between launches (port fallback), so the main process owns the preference in `<userData>/theme.json` (`desktop/theme.ts`). The preload exposes `studioThemeHost.initial` (sync IPC) and `set`. The window `backgroundColor` is the `.boot` color of the resolved theme and follows `nativeTheme` `updated` for System. The setup window follows macOS through `prefers-color-scheme`.
- `nativeTheme.themeSource` stays `system`. Chromium gives iframes the OS `prefers-color-scheme`, not the embedder's `color-scheme`, so forcing it would flip the dark blocks of light packs in the preview. Native menus and dialogs follow macOS, not an explicit app choice.
- Studio CSS: `:root[data-theme='dark']` in `tokens.css` overrides token values only. The design keeps its authored look: iframes get `color-scheme: light`; frame paper (`--frame-bg`), selection, measure, halo and pin tokens have no dark value. Studio uses `data-theme`, not `.dark`, so the Tailwind `dark:` variant (`prose-invert`) does not override the token mapping. During a switch `data-theme-switching` turns transitions off for two frames.
- Motion tokens: `--dur-fast` 120, `--dur` 140, `--dur-slow` 200, `--dur-loop` 1200, `--dur-loop-slow` 1400 ms; `--ease-out` (= `--ease`), `--ease-in-out`, `--ease-spring` (no overshoot), `--ease-standard`. Reduced motion: the global rule in `tokens.css`.
- Claude Design foundation (Round 10): warm neutral palette (`--hue` 90), Dark is the default when no choice is saved (web: no localStorage key; desktop: no `theme.json`); a saved `system` still follows the OS. Three color roles: coral `--brand*` only for send/run (`.btn.send`, `.icon-btn.send`), `--strong*` for the white "strong" button (`.btn.strong` = `.btn.primary`), blue `--accent*` for links, focus, selection, info and toggled states. Fonts are local WOFF2 files in `src/ui/assets/fonts/` (Inter for UI, Source Serif 4 for `.ui-display`, the Home headline and assistant prose; OFL 1.1, see `THIRD_PARTY_NOTICES.md`), loaded by `fonts.css` through `@import` in `tokens.css`, so they add no JS. Weights are 400/500 only. The shared `ui-*` classes live in `primitives.css`; the class list and props are in `research/ui-primitives.md`, and `scripts/ui-primitives.html` shows them in both themes on the vite dev server.

## Code rules

- No code comments (a hook rejects them). Use names instead.
- TypeScript strict. ESM. Node 24.
