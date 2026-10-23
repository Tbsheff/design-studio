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
    comments/<did>.json          pinned comments per direction ({nextN, comments}); never in the work tree, so never in a version
```

- Project in a chosen folder (`POST /api/projects` with `parentPath`): the parent is realpathed and must be a folder outside the data dir. The store makes a new subfolder named `slugify(name)` (`src/shared/folders.ts`: ASCII `a-z0-9-`, max 48, `untitled` if empty) with a non-recursive `mkdir`; on `EEXIST` it tries `-2`, `-3` … up to `-999`, so it never writes into a folder that already exists. React gets the template and a `node_modules` symlink to the shared template cache in the data dir. Then it is registered like an import (`imported: {sourcePath, created: true}`): shadow git, snapshots, runs and attachments stay in `projects/<pid>/`, and the work tree (and the agent's file guard) is the new subfolder. `created` keeps the import differences off: the first version is "Starter template" and a pack wires `main.tsx` and the fonts link. A failed create removes only that new subfolder. The parent is added to `workspaces.json`.
- Saved folders: `GET/POST /api/workspaces`, `PATCH/DELETE /api/workspaces/:id`. Add realpaths the folder, refuses files, missing paths and the data dir, and returns the saved entry for a path it already has. List marks a folder that is gone as `missing`. Delete only forgets the entry. Home shows the projects whose `imported.sourcePath` is inside each folder (path-segment match) and can filter the project grid by folder. The last Location lives in the UI store (`lastLocation`).
- Folder picker: the UI uses `window.studioDesktop.pickFolder` in the app, else `POST /api/pick-folder` (token and Origin like every route, plus `sec-fetch-site: same-origin` when sent). The server runs `/usr/bin/osascript` with `execFile` and the prompt and default folder as `argv` (`on run argv … choose folder`), one dialog at a time (409), 10 min timeout (504), error -128 = cancel (204), not macOS = 501 (the UI then shows the paste field). The picked path is realpathed. The text field stays as a collapsed "Or paste a path" fallback.
- Imported project: the `main` direction's work tree is the user's folder. Extra directions are copies in `directions/<did>/` with `node_modules` symlinked and their own Vite `cacheDir`.
- We never write into the user's `.git` or `vite.config.*`.

## Versions (shadow git, plumbing only)

Every git call sets `GIT_DIR=<pid>/git`, `GIT_WORK_TREE=<work tree>`, `GIT_INDEX_FILE=<pid>/git/index-<did>`. Never use `HEAD`.

- Commit: `git add -A` → `write-tree` → `commit-tree -p <head>` → `update-ref refs/heads/d/<did>`.
- Excludes (`git/info/exclude`): `node_modules node_modules/ dist/ .vite/ .studio/ .DS_Store`. `node_modules` without a slash also matches the symlink in created React projects. The exclude file is rewritten on the first status or commit of each project after boot, and every stage step runs `git rm --cached node_modules`, so old repos drop it too. Export excludes `node_modules` from old commits.
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
  - `visual-diff` (follow-up edits): before the query starts, the driver shoots the current preview at desktop and mobile. Each check compares with pixelmatch, masks the selected elements (by `data-studio-loc`) and reports the changed share and 200 px bands. When the page height changed, it compares only the part above the selection. A selection edit with 1% or more change outside the selection = medium.
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
- The preview frame is cross-origin, so the parent never sees its input. The bridge cancels Ctrl/Cmd+wheel (pinch) and sends `wheel` (deltas summed per animation frame, frame-local `clientX/Y`); the parent maps the point through the iframe rect and CSS scale and zooms around it. Ctrl/Cmd + `=` `-` `0` `1` in the frame go as `zoom-key`. Plain wheel stays in the frame and scrolls the design.
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
- Undo is the normal `POST .../undo`; each direct edit is one version.
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
- Grid (`VariationsGrid`, replaces Canvas in `CenterView`): one pane per direction, same viewport, scaled to the pane width, wrapped to 1 or 2 columns when a pane would be under 280 px. Each pane runs its own `usePreviewFrames` (double buffered, own selection). `useSwapGate` lets only one pane hold a back slot at a time and queues the newest change per pane (release on swap or after 4 s), so at most N+1 preview iframes exist. A head change also queues a reload, so a missed `files.changed` cannot leave a pane stale. React panes take HMR and are not gated.
- Open (title or button) makes that direction current and shows the canvas; "Keep this one" does the same and says that the others stay as directions. Nothing is deleted. A bar over the canvas ("one of 3 variations", Show all) opens the grid again.
- Mix: Select in pane B, pick an element, "Use in…" → A. `POST /api/projects/:pid/variations/mix {fromDirectionId, toDirectionId, element}` starts an Edit run on A with `RunRequest.reference` (not `selection`, so the selection rules and visual-diff masks stay off): B's outerHTML, computed styles, source loc and up to 40 lines of B's source from the loc (realpath-checked in B's work tree), in a `<reference-element>` block that says to keep A's tokens.
- The mock agent logs `run.sent` for every run, writes a different full page per brief index (layout, font, palette, `data-variation`), and for a reference appends `.mock-mix[data-from]`.
- Home: the Run settings popover has Level and Designs (no Mode). Designs > 1 creates the project with `startRun: false`, hands `{projectId, prompt, count, level}` to the studio in memory (`homeVariations` in `storage.ts`, one shot, not saved), and the studio calls `useVariations.propose` when the project and its direction load. The user lands on the brief card; Start works as in the studio. The fan-out forks from the main head (the React starter) or from empty (HTML with no pack). Designs = 1 keeps one first run.

## Pinned comments (queue)

```
Comment mode (C, toolbar)            Select mode (V) with a selection
  click element → bridge 'select'      → compact feedback popover under the selection's right end
                                         (no focus; F focuses; Esc hides; hidden while the composer has a draft)
  → ComposePopover (focus, Tab trap)   → one comment per selected element, same text
        Enter = Add to queue (queued)   Cmd/Ctrl+Enter = Send now (draft → send [id])
  → POST .../comments {text, target, context}       zod; comments.changed {comments} on SSE
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

- Shape: `DesignComment {id, n, createdAt, updatedAt, text, target {selector, sourceLoc?, tag, textSnippet, rectHint}, context?, status, runId?, versionId?}`. `n` is stable per direction and never reused, so pin numbers and "Done: #2" stay valid after reorder or delete. Queue order is array order (`POST .../reorder {ids}`).
- Status rules (`src/shared/comments.ts`, `canTransition`): only the server sends (`draft|queued → sent`) and settles (`sent → resolved|queued`). The user can queue, resolve, reopen (`resolved → queued`) and re-pin (`orphaned → queued` with a new target). Only `draft` and `queued` can become `orphaned`; `sent` and `resolved` never do, because the run edits their text.
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

## End-to-end tests

`npm run e2e` (Playwright, installed Chrome). Each Playwright config has its own `outputDir` under `test-results/` and launches Chrome with site isolation off for tests only: Playwright maps clicks into an out-of-process iframe without the parent's CSS scale, and each project origin is its own site. Global setup builds the UI and starts the real server with `STUDIO_AGENT=mock`, a temp `STUDIO_DATA_DIR`, and ports 4270/4271/5300. The server gets `STUDIO_CLAUDE_HOME` set to a fixture home (`e2e/support/skills-fixture.ts`), so tests never read the real `~/.claude`. Specs `e2e/a-*.spec.ts` to `e2e/f-*.spec.ts` cover the release workflows; `e2e/latency.spec.ts` writes `e2e/results/latency.json`.

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

- **Packaged (P1, `npm run desktop:pack`):** `desktop/build.ts` stages `build/desktop/app` (main, preloads, first-run page; packed into a 109 KB `app.asar`) and `build/desktop/resources` (copied to `Contents/Resources/`): `server/index.js` and `server/vite-runner.js` (esbuild, ESM, packages external), `server/node_modules` (P2: only the packages the esbuild metafiles of `index.js` and `vite-runner.js` import as externals, plus their runtime dependency closure; `playwright-core` is never shipped; host arch), `git/` (slim dugite git: `bin/git`, `libexec/git-core/git`, templates, `etc/gitconfig`; 6.9 MB), `ui/`, `packs/`, `templates/react-vite/`, `react-template/` (prebuilt template `node_modules`), `bridge.js`, `axe.min.js`. `npm run desktop:pack` = `scripts/desktop-pack.ts`: stage, then `electron-builder --mac --arm64 --publish never`. `electron-builder.yml`: dir, dmg, zip; arm64; hardened runtime; `desktop/build-resources/entitlements.mac.plist` (allow-jit, allow-unsigned-executable-memory, disable-library-validation) for the app and every nested binary (slim git, esbuild, rollup, fsevents); `signIgnore` keeps Anthropic's signature on claude; `notarize: false` (the `afterSign` hook `desktop/notarize.cjs` does it). Identity: ad-hoc (`-`) unless `STUDIO_SIGN_IDENTITY` names one; `CSC_IDENTITY_AUTO_DISCOVERY=false` always, so a Developer ID in the Keychain is never picked up by itself. Notarization runs only when `STUDIO_NOTARY_PROFILE` names a notarytool Keychain profile and the signature is not ad-hoc. Info.plist: `designstudio` URL scheme, a `public.folder` document type (Alternate rank, so Dock drop and Open Recent work), Documents, Desktop and Downloads usage strings. `STUDIO_APP_VERSION` overrides the version; `STUDIO_UPDATE_URL` writes `app-update.yml` (generic provider) and `latest-mac.yml`; `STUDIO_PACK_OUT` moves the output. Release stages compile out `STUDIO_RENDER_HOST_MODE` (`__STUDIO_RELEASE__`); `STUDIO_TEST_BUILD=1` keeps it. Main runs `<app>/Contents/MacOS/Design Studio <Resources>/server/index.js` with `ELECTRON_RUN_AS_NODE=1` and `STUDIO_RESOURCES_DIR=<Resources>`.
- **Render backends (P2, `src/server/preview/render-backend.ts`):** `BrowserPool` (render_check, screenshots, tiles, quality probes, axe, visual-diff baselines; it is the only browser the server opens) talks only to a `RenderBackend` (`open(viewport) → RenderPage {goto, evaluate(expression), screenshot(path, clip?), errors, close}`). `chooseBackend`: `STUDIO_RENDER_BACKEND=playwright|electron` wins; else `electron` when `STUDIO_RENDER_IPC=1` (set by main) or `STUDIO_RENDER_SOCKET` is set; else `playwright` (system Chrome through playwright-core, the `npm start` and test default). `render-electron.ts` sends `{type:'studio-render', id, op, args}` over the child's IPC channel (fork stdio `'ipc'`) or, for tests, over a unix socket (mode 0600) with a token. There is no `--remote-debugging-port`. Dev and test drivers that act as a user's browser stay on system Chrome and are not in the server bundle: `scripts/dev-check.ts` (clicks inside frames), `scripts/ac-*/real*.ts`, `scripts/real-smoke.ts`.
- **Render pool (`desktop/render-pool.ts`):** up to 3 hidden windows (`show: false`, `paintWhenInitiallyHidden`, `backgroundThrottling: false`, sandbox, no preload), each in its own non-persistent partition with all permissions denied; idle windows close after 30 s; a crashed renderer drops its slot. Per page: `Emulation.setDeviceMetricsOverride` (dpr 1), hidden scrollbars, `Runtime.evaluate` (awaitPromise, returnByValue) for probes and axe, errors from `Runtime.consoleAPICalled`, `Runtime.exceptionThrown` and `Log.entryAdded` (favicon misses dropped), network idle = no request in flight for 500 ms (capped by the settle timeout). Screenshots: `Page.captureScreenshot` with `captureBeyondViewport` and a clip; full pages taller than 8000 px are captured in 8000 px segments and joined (a 20000 px page came out whole). Navigation: `http:` only, never the studio origin, no `window.open`. The pool closes on quit. Main's studio window guards skip render contents (`isRenderContents`). `app.commandLine` sets `force-color-profile=srgb` so screenshots match Chrome's colors.
- **Render tests:** `STUDIO_E2E_RENDER=electron` makes the e2e global setups start `desktop/render-host.ts` (Electron, socket transport) and point the test server at it; with `STUDIO_E2E_APP` electron is the default (the packaged server has no playwright-core) and the host is the dev Electron (`desktop/dist/render-host.js`), because release builds compile out `STUDIO_RENDER_HOST_MODE`. The shipped pool behind main's IPC is covered by the `e2e:desktop` render test and real runs. `npm run render:parity` (`scripts/render-parity.ts`) renders the fixtures and two real pages (from `STUDIO_PARITY_PAGES_DIR`; skipped when the folder is missing) at 390/768/1440 through system Chrome, the electron backend, and playwright driving the same Electron, and compares pixels (pixelmatch, threshold 0.1) and findings; report in `test-results/render-parity.json`.
- **Resources (`src/server/resources.ts`):** with `STUDIO_RESOURCES_DIR` set, `app.ts` serves `ui/` (and drops `DEV_UI_ORIGINS`), `packs.ts` reads `packs/`, `projects.ts` uses `templates/react-vite` and copies `react-template/node_modules` into `<data>/cache/react-template` when its `package.json` matches (no npm), `bridge-bundle.ts` reads `bridge.js` (no esbuild at runtime), `axe.ts` reads `axe.min.js`. Unset, every path is the repo path, so `npm start` and tests do not change.
- **Node (dev):** the server runs on Electron's own Node through the tsx loader, the same loader vite-manager uses. `node_modules/.bin/tsx` was not used: its `#!/usr/bin/env node` shebang picks whatever node is on PATH (nvm here, none in a Finder launch), so it would not test Electron's Node.
- **Ports (`desktop/ports.ts`):** try the saved set in `userData/ports.json`, then 4170/4171/5200, then pairs 4570+10k/4571+10k with Vite base 8200+200k. A set is used only when the studio, preview and Vite base ports are all free. Nothing is ever killed. The chosen set is saved, so the origin (and its localStorage) stays the same on the next launch.
- **Data:** `STUDIO_DATA_DIR` when set; else packaged (`app.isPackaged`) = `~/Library/Application Support/Design Studio/studio-data`; else the repo `studio-data`.
- **Data-dir lock (`src/server/store/data-lock.ts`):** the server creates `<data>/studio.lock` (`{pid, port, startedAt}`, exclusive create) before it opens stores, and removes it on exit. A live holder → the server prints who holds it and exits 75; a dead pid or unreadable file → it takes over. `npm start` uses the same code. Main checks the lock first: an explicit `STUDIO_DATA_DIR` that is locked → error and quit; the default folder locked → dialog offering `userData/studio-data-desktop`, never a shared folder.
- **Server env (`desktop/env.ts`):** built from an allowlist: `HOME USER LOGNAME SHELL TMPDIR LANG`, every `STUDIO_*`, `DESIGN_MEMORY_HOME`, `ANTHROPIC_API_KEY`, then the port and data vars, `STUDIO_CLAUDE_PATH`, `STUDIO_PARENT_PID`, `STUDIO_LOGIN_SHELL_PATH`, the git vars, `STUDIO_RESOURCES_DIR` (packaged) and `ELECTRON_RUN_AS_NODE=1`.
- **Agent env (`sdk-driver.ts` `buildEnv`):** `HOME USER LOGNAME PATH SHELL TMPDIR LANG ANTHROPIC_API_KEY HTTPS_PROXY HTTP_PROXY NO_PROXY NODE_EXTRA_CA_CERTS` only (USER is needed for the Keychain login). `STUDIO_CLAUDE_PATH` becomes `pathToClaudeCodeExecutable` (the packed `@anthropic-ai/claude-agent-sdk-darwin-<arch>/claude`, which keeps Anthropic's signature). `CLAUDE_CODE_*` and `ANTHROPIC_BASE_URL` from a Claude Desktop launch never reach the server or the agent. `STUDIO_AGENT=mock` passes through.
- **PATH:** the server gets the fixed folders only (`/opt/homebrew/bin /usr/local/bin /usr/bin /bin /usr/sbin /sbin ~/.local/bin`, the dir of a real `node` binary or `npm_node_execpath`). The PATH from `$SHELL -ilc` (clean env, 3 s timeout, sentinel-wrapped) goes in `STUDIO_LOGIN_SHELL_PATH`; the agent appends it only for runs with Bash or install allowed.
- **git (`desktop/git-choice.ts`):** `/usr/bin/xcode-select -p` first (never `/usr/bin/git` before it, because the stub opens the install dialog). Success → `STUDIO_GIT=/usr/bin/git`. Failure → bundled git (`<Resources>/git` packaged, `node_modules/dugite/git` in dev; dugite is a devDependency): `STUDIO_GIT=<git>/bin/git`, `GIT_EXEC_PATH`, `GIT_TEMPLATE_DIR`. `STUDIO_DESKTOP_GIT=bundled|system` forces one. `versions.ts` uses `STUDIO_GIT` when set and skips `git --exec-path`.
- **First-run screen (`desktop/first-run.*`, `setup-checks.ts`):** local `first-run.html` (CSP `default-src 'none'`, own sandboxed preload, IPC only from that page). Checks: git (required), Claude login (`<claude> auth status --json` with the base env, 15 s timeout; logged out → copy `claude`, Open Terminal), disk space (required, fail < 1 GB), network to api.anthropic.com (warning), design memory library (optional). Shown at launch only when a required check fails (`STUDIO_DESKTOP_SETUP=always|skip` for tests), and from the app menu "Check Setup…". Checks run while the server boots.
- **Readiness:** the `Design Studio running at` line on stdout, or `GET /` answering, within 90 s. A server exit during startup shows an error box with the log path.
- **Logs:** server stdout and stderr append to `userData/logs/server.log`; in dev they also go to the console.
- **Window (`desktop/window-state.ts`):** `userData/window-state.json` keeps normal bounds and maximized per display layout (key: sorted display ids and bounds) plus the last layout. Launch uses the entry for the current layout, else the last one if it is still on a display, else the default size. The P0 single-state file still reads. The preload exposes only `window.studioDesktop = {platform, version, onCommand, setContext, pickFolder}`. `pickFolder({title, defaultPath?})` is `ipcRenderer.invoke('studio:pick-folder')`; main answers only the studio window (`isStudio(sender)`), checks the args (`parsePickFolderRequest`: title ≤ 200 chars, absolute default path ≤ 4096 that exists), shows `dialog.showOpenDialog(<that window>, {properties: ['openDirectory', 'createDirectory']})`, one at a time, and returns the folder or null. Open Folder ⌘O uses the same dialog code.
- **Navigation:** every webContents gets a `will-navigate` guard and a window-open handler. Main-frame navigation stays only for the studio origin, the preview port (`127.0.0.1` and `p-*.localhost`) and the Vite range on loopback. Everything else, and every `window.open`, goes to `shell.openExternal` for http, https and mailto only; other schemes are dropped.
- **Permissions:** request and check handlers allow `clipboard-read` and `clipboard-sanitized-write` only.
- **Menu (`desktop/menu.ts`, `desktop/native.ts`):** app (Check for Updates…, Check Setup…), File (New Project ⌘N, Open Folder… ⌘O, Open Recent, Reveal Work Tree in Finder, Reveal Last Export in Finder), Edit (custom Undo ⌘Z and Redo ⇧⌘Z, then the clipboard roles), View (Reload, DevTools, zoom, full screen), Run (Run ⌘↵, Stop ⌘.; enabled from the renderer context), Window. Main sends menu commands to the studio window only (`studio:command`); the preload queues them until the UI subscribes (`window.studioDesktop.onCommand`). The UI (`src/ui/desktop.ts`) gives each command to the newest handler first: the composer (Run sends the draft, Stop cancels), version undo (`useUndoShortcut`), then the app (new project, open project, open folder, text undo). Undo: a focused text field gets `document.execCommand('undo')`; anywhere else in the studio (canvas, preview iframe, panels) it is version undo; a non-studio window gets `webContents.undo()`. A ⌘Z or ⌘↵ the page already handled (defaultPrevented) is not run again by the menu. Redo outside text fields does nothing: there is no version redo.
- **Renderer context:** the UI sends `{projectId, directionId, running}` on `studio:context`; main accepts it only from the studio window and only with safe ids. It drives the menu state, Reveal Work Tree and recents.
- **Server link (`src/server/desktop-link.ts`, `desktop/server-link.ts`):** with `STUDIO_RENDER_IPC=1` the server sends main `{kind:'hello', token, dataDir}` once and `run-started` / `run-finished` for every run over the same IPC channel as render requests. Main uses the token for `GET /api/projects/:pid` only (names, work trees). No new HTTP route.
- **Folders, links, recents:** `open-file` and `open-url` are registered in `will-finish-launching`, so a cold launch keeps them; commands wait until the studio page has loaded. `open-file` takes absolute folders only (files and relative paths are dropped) and opens the project whose imported source or work tree is that folder, else imports it. `designstudio://open?project=<id>` (id `^[A-Za-z0-9_-]{1,64}$`) and `designstudio://new`; anything else is dropped and never navigated to. A second instance forwards a `designstudio:` argv entry (Windows and Linux path; on macOS links arrive as `open-url`). Opening a project calls `app.addRecentDocument(<imported source or work tree>)` and keeps `userData/recent-projects.json` (8); the Dock menu shows New Project and the last 5.
- **Reveal in Finder:** main resolves the work tree from the server and reveals it only when it is inside the data folder or the imported source; the renderer never passes a path. Downloads from the studio window (version exports) save to `~/Downloads` (or `STUDIO_DESKTOP_DOWNLOADS`) with a unique name; other windows' downloads are canceled.
- **Notifications (`desktop/notify.ts`):** on `run-finished`, only when no studio window has focus and the run was not canceled: "Run finished", "Run failed" (with the error) or "Run stopped at the budget limit", body `<project>: <prompt>`. Clicking opens the project. `STUDIO_DESKTOP_NOTIFY=off` keeps the `studio-notification` app event but shows nothing (tests).
- **Auto-update (`desktop/updater.ts`, electron-updater 6.8.9):** on only in packaged builds with `app-update.yml` or `STUDIO_UPDATE_FEED=<http url>` (generic provider). Checks at launch (`STUDIO_UPDATE_CHECK=off` skips), every 6 h and from the menu. Downloads by itself, never installs on quit. When the download is ready: a run active → "A run is in progress. Design Studio asks again when it finishes." and it asks again after the last run ends; else "Restart Now / Later". A run that starts before the click defers again. An install error shows "Design Studio could not install the update" and the app keeps running. Log: `userData/logs/updater.log`. Squirrel.Mac checks that the new app satisfies the running app's designated requirement, so in-place updates need the same Developer ID on both builds; ad-hoc builds stop there (see DESKTOP_PLAN.md P3).
- **Single instance:** `requestSingleInstanceLock`; a second launch focuses the window and forwards its link. `STUDIO_DESKTOP_USER_DATA` moves userData (and so the lock) for tests.
- **Watchdog:** the server polls `process.ppid` every second when `STUDIO_PARENT_PID` is set and shuts down (stopping Vite children) when main is gone. Vite runners exit on IPC disconnect. Main writes `userData/server.pid`; the next launch stops a still-running group whose command is a studio server. A server exit after ready shows a dialog (Restart, Restart and Show Log, Quit) with the log path. Restart waits up to 5 s for the old ports to free, so the origin stays the same. A quit during boot or restart never opens a window or an error box.
- **Quit:** `before-quit` waits for the server: SIGTERM to the process group, 6 s grace (the server stops its Vite children and force-exits at 5 s), then SIGKILL to the group if any member is left. SIGINT and SIGTERM to the main process go through `app.quit()`.
- **Test:** `npm run e2e:desktop` (`playwright.desktop.config.ts`, `e2e/desktop.spec.ts`, `e2e/desktop-setup.spec.ts` and `e2e/desktop-native.spec.ts`: menu items clicked through `Menu.getApplicationMenu().getMenuItemById(id).click()`, because Playwright keys go in through CDP and never reach menu accelerators; `open-file`, `open-url` and `second-instance` sent with `app.emit`; `shell.showItemInFolder` and `dialog.showOpenDialog` stubbed; `_electron.launch`, mock agent, temp data and userData). `STUDIO_DESKTOP_EXECUTABLE=<app>/Contents/MacOS/Design Studio` runs the same specs against the packaged app; `STUDIO_E2E_APP=<app>` makes `e2e/support/server.ts` start the packaged server for every other config. The setup spec forces dugite git and checks versions. It checks the renderer lockdown, external links (stubbed `shell.openExternal`), the server env, an HTML create plus mock run and version, React HMR from a disk edit with Vite children on Electron's Node, and no group member left after quit. The default `playwright.config.ts` ignores it. `scripts/update-check.ts <0.1.0 app> <0.1.1 dir>` runs the local update flow (feed on 127.0.0.1, a slow mock run to prove the deferral). `scripts/clean-machine-check.ts <app>` launches with PATH `/usr/bin:/bin:/usr/sbin:/sbin`, bundled git and the setup screen forced, then makes an HTML and a React project and a render check.

## Code rules

- No code comments (a hook rejects them). Use names instead.
- TypeScript strict. ESM. Node 24.
