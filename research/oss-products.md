# OSS products for the Design Studio

Date: 2026-10-21. Source: GitHub REST API (`gh api repos/...`, `git/trees?recursive=1`, `contents/...`) read on this date. Stars are approximate. "Last" is the month of the last push. Paths in **bold** exist in the repo tree today (checked). Items marked *(unverified)* come from memory or the README only and need a check before you copy code.

Acceptance-area codes: **P** projects/formats, **A** agent SDK, **L** live preview, **V** visual editing, **H** history/versions, **D** references/design quality, **F** performance, **S** safety/portability.

License flags: OK = MIT / Apache-2.0 / ISC / BSD. WARN = MPL-2.0 (file-level copyleft; fine to depend on, keep edits to its files open). STOP = AGPL / FSL / PolyForm / custom / no license: read for ideas only, do not copy code.

## 1. AI app/UI builders

| Project | License | Stars / last | What to take | Areas | Risk |
|---|---|---|---|---|---|
| [dyad-sh/dyad](https://github.com/dyad-sh/dyad) | Apache-2.0 outside `src/pro/` (that folder is **FSL-1.1-ALv2**, STOP). GitHub shows NOASSERTION. | 22k / 2026-10 | **`packages/@dyad-sh/react-vite-component-tagger/src/index.ts`** (Vite `enforce:"pre"` plugin; `@babel/parser` + `magic-string` add `data-dyad-id` to JSX, so source map stays exact). **`worker/proxy_server.js`** + **`worker/dyad-component-selector-client.js`** + **`worker/dyad-shim.js`**: a local proxy that injects the selector and error shim into the app HTML, so the user app needs no changes. **`src/ipc/processors/response_processor.ts`** (apply agent output to files). **`src/ipc/handlers/version_handlers.ts`**, **`git_branch_handlers.ts`**, **`src/ipc/services/git_service.ts`** (uses `dugite`), **`git_overlay_workspace.ts`**: one git commit per turn, restore, branches. **`src/ipc/services/claude_code/prompt.ts`**: Claude Code mode. **`src/ipc/processors/tsc.ts`**: type-check after edit. | P A L V H S | Electron IPC shapes; port to Hono routes. Do not touch `src/pro/`. Closest product to ours. |
| [onlook-dev/onlook](https://github.com/onlook-dev/onlook) | Apache-2.0 | 27k / 2026-10 | **`packages/parser/src/ids.ts`** (`data-oid` stamp, branch-aware oid map), **`packages/parser/src/code-edit/{style,text,insert,move,remove,layout,group}.ts`** (AST edits from visual actions with Babel, no LLM), **`packages/parser/src/template-node/map.ts`** (oid -> file/line). **`packages/penpal/src/{parent,child}.ts`** (typed iframe RPC with `onDomProcessed`, `onWindowMutated` layer maps). **`apps/web/client/public/onlook-preload-script.js`** (script in preview). **`apps/web/client/src/components/store/editor/branch/manager.ts`** + **`.../chat-tab/chat-messages/multi-branch-revert-modal.tsx`** (branches across frames, revert). **`packages/git/src/git.ts`**. **`.../canvas/frame/*`** (multi-frame canvas, resize handles, device selector). | V L H P | Next.js + MobX + CodeSandbox sandbox assumptions; big monorepo. Take the parser package almost whole. |
| [stackblitz-labs/bolt.diy](https://github.com/stackblitz-labs/bolt.diy) | MIT | 20k / 2026-10 | **`app/lib/runtime/message-parser.ts`** + **`enhanced-message-parser.ts`** (streaming `<boltArtifact>/<boltAction>` parser), **`app/lib/runtime/action-runner.ts`** (ordered file/shell actions), **`app/lib/stores/files.ts`** (file store with diff), **`app/lib/common/prompts/*.ts`** (prompt variants). | P L H | WebContainer runtime (StackBlitz commercial license for prod) *(unverified, check webcontainer terms)*. We use Agent SDK tools, not XML actions, so take ideas more than code. |
| [stackblitz/bolt.new](https://github.com/stackblitz/bolt.new) | MIT | 17k / 2024-12 | Original, smaller version of the same parser and runner. Simpler to read. | P L | Stale since 2024-12. |
| [firecrawl/open-lovable](https://github.com/firecrawl/open-lovable) | MIT | 29k / 2026-10 | **`app/api/analyze-edit-intent/route.ts`** (classify edit, pick target files before edit), **`app/api/check-vite-errors`**, **`report-vite-error`**, **`monitor-vite-logs`** (feed Vite errors back to agent), **`detect-and-install-packages`**, **`extract-brand-styles`** + **`scrape-screenshot`** (reference capture), **`create-zip`** (export). | L D P | E2B/Vercel sandbox, Firecrawl API key. Next.js routes; easy to port to Hono. |
| [Nutlope/llamacoder](https://github.com/Nutlope/llamacoder) | MIT | 7k / 2026-10 | **`lib/prompts.ts`**, **`lib/shadcn-docs/*.tsx`** + **`lib/shadcn-examples.ts`** (inject component docs into prompt), Sandpack single-file preview. | P D | Single-file React only. Together AI. |
| [abi/screenshot-to-code](https://github.com/abi/screenshot-to-code) | MIT | 81k / 2026-10 | **`backend/prompts/{plan,pipeline,design_system,message_builder}.py`**, **`backend/prompts/create/{image,text,video}.py`** (image/video reference -> code), **`backend/evals/{runner,core,sets}.py`** (eval harness over screenshot sets). | D P | Python backend; port logic, not code. |
| [wandb/openui](https://github.com/wandb/openui) | Apache-2.0 | 23k / 2026-10 | **`frontend/src/components/HtmlAnnotator.tsx`** (click element in iframe, annotate, re-prompt), **`frontend/src/components/Versions.tsx`** + **`VersionPreview.tsx`** (version strip with thumbnails), **`frontend/src/lib/html.ts`** (`wrappedCode`, `parseJs`, iframe wrapper per framework). | V H L P | Python server, Jotai UI. Standalone-HTML focus matches our HTML format. |
| [e2b-dev/fragments](https://github.com/e2b-dev/fragments) | Apache-2.0 | 6k / 2026-10 | **`lib/prompt.ts`**, **`lib/morph.ts`** + **`app/api/morph-chat/route.ts`** (fast "apply edit" step), template/model registry in **`lib/models.json`**. | P A | E2B cloud sandbox; we run local. |
| [convex/chef](https://github.com/get-convex/chef) | Apache-2.0 | 5k / 2026-10 | **`chef-agent/prompts/*.ts`** (prompt split into small composable modules: output rules, formatting, guidelines). | A D | Convex-specific backend content. |
| [srcbookdev/srcbook](https://github.com/srcbookdev/srcbook) | Apache-2.0 | 3k / 2026-07 | Local Node server + Vite app builder with diff review and per-edit history *(paths unverified)*. Same shape as ours (local server, Vite child process). | L H P | Slower activity; project pivoted. |
| [raidendotai/openv0](https://github.com/raidendotai/openv0) | MIT | 4k / 2024-09 | Multipass generation with component-library context *(unverified details)*. | D | Stale. |
| [AntonOsika/gpt-engineer](https://github.com/AntonOsika/gpt-engineer) | MIT | 55k / 2025-05, **archived** | Prompt "preprompts" and file-diff apply loop. History only. | A | Archived; Python. |
| [Pythagora-io/gpt-pilot](https://github.com/Pythagora-io/gpt-pilot) | **FSL-1.1-MIT** (STOP until it converts to MIT, 2 years per release) | 34k / 2026-06 | Ideas: task breakdown, reviewer agent. | A | Non-compete license. |
| [CodebuffAI/codebuff](https://github.com/CodebuffAI/codebuff) (now `freebuff`) | Apache-2.0 | 14k / 2026-10 | Multi-agent file-picker / editor / reviewer split *(paths unverified)*. | A | CLI coding agent, not visual. |
| [stagewise-io/stagewise](https://github.com/stagewise-io/stagewise) | **AGPL-3.0** (STOP) | 7k / 2026-10 | Ideas only: in-browser toolbar that sends selected DOM + context to an agent; now an "agentic IDE" with app previews. | V | AGPL. Do not copy. |
| [21st-dev/magic-mcp](https://github.com/21st-dev/magic-mcp) | ISC | 6k / 2026-09 | MCP tool shape for "fetch component inspiration" into an agent. | D A | Needs 21st.dev API. |
| [VectorsCrib/WebSimAI_open](https://github.com/VectorsCrib/WebSimAI_open) | **GPL-3.0** (STOP) | <100 / 2024-07 | Websim-style "URL as prompt" idea. | P | GPL, tiny. |
| [vercel-labs/json-render](https://github.com/vercel-labs/json-render) | Apache-2.0 | 19k / 2026-10 | **`packages/core/src/diff.ts`**, **`edit-modes.ts`**, **`packages/codegen/src/*`** (spec -> code). Useful if we add a structured "component spec" mode. | P V | Different model (JSON UI, not files). |

## 2. Visual editors for real code

| Project | License | Stars / last | What to take | Areas | Risk |
|---|---|---|---|---|---|
| [puckeditor/puck](https://github.com/puckeditor/puck) | MIT | 14k / 2026-10 | **`packages/core/components/AutoFrame/index.tsx`** (copy parent styles into an iframe, portal React into it), **`components/DropZone/*`** (drag-drop with line placeholder, virtualized zone), history store *(path unverified)*. | V L F | JSON data model, not source files. |
| [GrapesJS/grapesjs](https://github.com/GrapesJS/grapesjs) | BSD-3-Clause (GitHub shows NOASSERTION; LICENSE text is BSD-3 with name clause) | 26k / 2026-10 | **`packages/core/src/canvas/view/{FrameView,FrameWrapView,CanvasView}.ts`** (iframe canvas, highlighter, offsets), **`packages/core/src/undo_manager/`**, **`code_manager/model/{HtmlGenerator,CssGenerator}.ts`** (HTML export). Best fit for the standalone-HTML format. | V H P | Backbone-era code; own model of HTML. |
| [webstudio-is/webstudio](https://github.com/webstudio-is/webstudio) | **AGPL-3.0** (STOP) | 9k / 2026-10 | Ideas: style panel, CSS variable tokens. | V D | AGPL. |
| [plasmicapp/plasmic](https://github.com/plasmicapp/plasmic) | MIT | 7k / 2026-10 | "Code components" registration pattern (users register real React components into the editor) *(paths unverified)*. | V P | Huge, hosted-first. |
| [prevwong/craft.js](https://github.com/prevwong/craft.js) | MIT | 9k / 2025-02 | Node tree + connectors (`connect(drag(ref))`), serialized state for undo. | V H | Low activity. |
| [BuilderIO/builder](https://github.com/BuilderIO/builder) / [mitosis](https://github.com/BuilderIO/mitosis) | MIT | 9k / 14k, 2026-10 | Mitosis compiles one component to many frameworks: an export path HTML <-> React. | P | SDK side only; editor is closed. |
| [easyblockshq/easyblocks](https://github.com/easyblockshq/easyblocks) | **AGPL-3.0** (STOP) | <1k / 2024-08 | Ideas only. | V | AGPL, stale. |
| React Bricks | Core is closed; only [ReactBricks/react-bricks-ui](https://github.com/ReactBricks/react-bricks-ui) (MIT, 2023) is open | n/a | Nothing to pull. | - | Not OSS. |
| [tldraw/make-real](https://github.com/tldraw/make-real) | **No license** (STOP), **archived** | 5k / 2026-02 | Idea: sketch on canvas -> screenshot -> HTML in an iframe shape. | D P | No license. tldraw SDK itself has a custom commercial license (STOP for prod). |
| [penpot/penpot](https://github.com/penpot/penpot) | MPL-2.0 (WARN) | 61k / 2026-10 | Design-token export and its MCP/plugin API as a reference source *(unverified)*. | D | Clojure; use as data source, not code. |
| [codesandbox/sandpack](https://github.com/codesandbox/sandpack) | Apache-2.0 | 6k / 2025-04 | In-browser bundler preview for single-file React when Vite is not running. | L F | Bundler runs on CodeSandbox CDN by default (offline needs self-host). |
| [stackblitz/webcontainer-core](https://github.com/stackblitz/webcontainer-core) | MIT (repo); the runtime API has its own commercial terms | 5k / 2025-04 | Not needed: we run real Node locally. | L | Licence of API for commercial use. |
| Frontend-Studio | Not found on GitHub (searched). | - | - | - | Ask for the exact URL. |

## 3. Click-to-source / inspector tools

| Project | License | Stars / last | What to take | Areas | Risk |
|---|---|---|---|---|---|
| [aidenybai/react-grab](https://github.com/aidenybai/react-grab) | MIT | 8k / 2026-08 | **`packages/react-grab/src/core/context.ts`** (uses `bippy/source` `getOwnerStack` + `getSource` to get file:line from fiber, no build plugin), **`core/copy.ts`**, **`core/html-preview.ts`** (compact element HTML for the prompt), **`core/arrow-navigation.ts`** + **`keyboard-selection.ts`** (walk parent/child with keys), **`components/overlay-canvas.tsx`** (canvas overlay, fast). | V F | Relies on React dev build internals. |
| [aidenybai/bippy](https://github.com/aidenybai/bippy) | MIT | 1k / 2026-10 | Fiber hook + `bippy/source` (source from owner stack in React 19 dev). Base for react-grab and react-scan. | V | Internals can break on React updates. |
| [aidenybai/react-scan](https://github.com/aidenybai/react-scan) | MIT | 22k / 2026-08 | Render-count overlay; reuse to show "this edit made X re-render". | F | Dev only. |
| [zh-lx/code-inspector](https://github.com/zh-lx/code-inspector) | MIT | 3k / 2026-10 | **`packages/core/src/server/transform/transform-jsx.ts`** (Babel + `magic-string` stamp, also Vue/Svelte/Astro/MDX: **`transform-astro.ts`**, **`transform-mdx.ts`**, **`scan-html-tag.ts`** for plain HTML), **`packages/core/src/ai/server/ai-provider-claude.ts`** (spawns Claude Code / Agent SDK `query` from a clicked element), **`ai/server/ai-history.ts`**. Works for Vite, webpack, rspack, esbuild. | V A P | Large; mostly Chinese comments. Very close to our select-and-edit loop. |
| [infi-pc/locatorjs](https://github.com/infi-pc/locatorjs) | Repo root: **no license** (STOP); `apps/extension/LICENSE` is MIT | 2k / 2026-09 | Ideas: **`packages/runtime/src/adapters/{adapterApi,getElementInfo}.tsx`** (adapter per framework), **`packages/babel-jsx/src/index.ts`**. | V | Root unlicensed; only extension is MIT. |
| [ericclemmons/click-to-component](https://github.com/ericclemmons/click-to-component) | MIT | 2k / 2025-09 | **`packages/click-to-react-component/src/{getReactInstanceForElement,getPathToSource,ContextMenu}.js`** (Alt+click, list of parent components). Small, easy to read. | V | Uses `_debugSource`, which React 19 removed. Use bippy instead. |
| [zthxxx/react-dev-inspector](https://github.com/zthxxx/react-dev-inspector) | MIT | 1k / 2026-04 | **`packages/babel-plugin/src/plugin.ts`** (stamp `data-inspector-*`). | V | Webpack-era; fine as reference. |
| [sudongyuer/vite-plugin-react-inspector](https://github.com/sudongyuer/vite-plugin-react-inspector) | MIT | <200 / 2022-11 | Minimal Vite version of the same idea. | V | Stale. |
| [webfansplz/vite-plugin-vue-inspector](https://github.com/webfansplz/vite-plugin-vue-inspector) | MIT | 1k / 2026-06 | Vite plugin layout for "inject client + stamp source" (Vue). | V | Vue only. |
| [benjitaylor/agentation](https://github.com/benjitaylor/agentation) | **PolyForm Shield 1.0.0** (STOP: non-compete; GitHub shows NOASSERTION) | 5k / 2026-09 | Ideas only: annotation popup on page, "design mode" palette, MCP server with SQLite annotation store and webhooks (`mcp/src/server/*`). | V D | License forbids competing products. |

## 4. Design quality, skills, evaluators

| Project | License | Stars / last | What to take | Areas | Risk |
|---|---|---|---|---|---|
| [anthropics/skills](https://github.com/anthropics/skills) `skills/frontend-design` | Apache-2.0 per skill (**`skills/frontend-design/LICENSE.txt`**); repo root has no license | 183k / 2026-10 | **`skills/frontend-design/SKILL.md`**: load as a project skill via Agent SDK `settingSources` / `.claude/skills`. Also `webapp-testing`, `canvas-design`, `brand-guidelines`. Same skill ships as **`anthropics/claude-code/plugins/frontend-design/`**. | D A | Check each skill's own license (docx/pdf/pptx differ) *(unverified for those)*. |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | Apache-2.0 | 85k / 2026-10 | Design-language skill + CLI (`cli/bin/cli.js`, Rust `crates/cli`) with anti-pattern detection and asset capture. Use its rules as a critique pass after each turn. | D | Fast-moving; check what the detector really checks. |
| [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | MIT | 139k / 2026-10 | Searchable style/palette/font-pair data as a skill; seed for "references" picker. | D | Generic; quality varies. |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | **No license at root** (STOP until checked per skill) | 33k / 2026-10 | React best-practice and web-design-guidelines skills. | D F | License unclear. |
| [NoviScl/Design2Code](https://github.com/NoviScl/Design2Code) | MIT | <1k / 2024-11 | **`Design2Code/metrics/`** (`multi_processing_eval.py`, `ocr_free_utils.py`, `screenshot_single.py`): block match, text, position, color, CLIP score of screenshot vs reference. Port for "compare to reference" score. | D | Python + CLIP model weights; heavy. |
| [mnluzimu/WebGen-Bench](https://github.com/mnluzimu/WebGen-Bench) | **No license** (STOP for code) | <100 / 2026-07 | Ideas: **`src/automatic_bolt_diy/automatic_web_gen.py`** drives bolt.diy; UI-agent tests check features in the generated app. Use as test-case design. | D | No license. |
| [garris/BackstopJS](https://github.com/garris/BackstopJS) | MIT | 7k / 2026-10 | Scenario config + HTML diff report for version compare. | H D | Puppeteer/Playwright weight. |
| [mapbox/pixelmatch](https://github.com/mapbox/pixelmatch) | ISC | 7k / 2026-10 | Tiny pixel diff for "compare versions" overlay. Drop-in. | H F | None. |
| [reg-viz/reg-suit](https://github.com/reg-viz/reg-suit) / [argos-ci/argos](https://github.com/argos-ci/argos) | MIT | 1k / <1k, 2026-10 | Diff report UI ideas (side-by-side, slider, flicker). | H | Server products. |
| [lost-pixel/lost-pixel](https://github.com/lost-pixel/lost-pixel) | MIT, **archived** | 2k / 2026-04 | Reference only. | H | Archived. |
| [dequelabs/axe-core](https://github.com/dequelabs/axe-core) | MPL-2.0 (WARN, fine as a dependency) | 8k / 2026-10 | Run in preview iframe after each turn; feed violations to the agent. | D S | None as a dep. |
| [rrweb-io/rrweb](https://github.com/rrweb-io/rrweb) | MIT | 20k / 2026-10 | DOM snapshot of a version for cheap "replay" thumbnails without re-running Vite. | H F | Large snapshots. |
| [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) / [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) | Apache-2.0 | 38k / 44k, 2026-10 | Give the agent eyes: screenshot the preview and self-check before it ends a turn. | D A | Extra process; keep to localhost. |

## 5. Agent-host references (no visual editor, but useful)

| Project | License | Stars / last | What to take | Areas | Risk |
|---|---|---|---|---|---|
| [anthropics/claude-agent-sdk-demos](https://github.com/anthropics/claude-agent-sdk-demos) | **No license file** (STOP for code; read for API use) | 3k / 2026-08 | Official SDK usage patterns (streaming input, hooks, permission callbacks). | A S | No license. |
| [anomalyco/opencode](https://github.com/anomalyco/opencode) (was sst/opencode) | MIT | 220k / 2026-10 | Client/server agent split, session snapshot/revert of files *(paths unverified)*. | A H | Different agent runtime. |
| [OpenHands/OpenHands](https://github.com/OpenHands/OpenHands) | MIT | 92k / 2026-10 | Sandbox/runtime isolation design, event stream model. | S A | Python, Docker. |
| [BuilderIO/agent-native](https://github.com/BuilderIO/agent-native) | MIT | 7k / 2026-10 | Framework for apps where agent and UI share state *(details unverified)*. | A | New. |

Total: about 55 projects listed. License, stars and last push come from the GitHub API for all of them except Frontend-Studio (not found) and React Bricks core (closed).

## Top 8 to pull from first

1. **onlook `packages/parser`** (Apache-2.0). Take `ids.ts`, `template-node/map.ts`, `code-edit/{style,text,move,insert,remove}.ts` almost whole. It gives stable `data-oid` per JSX node and direct AST edits for small visual changes (no LLM turn for "make this text bold"). Also copy the typed iframe RPC idea from `packages/penpal/src/{parent,child}.ts`.
2. **dyad `react-vite-component-tagger` + `worker/proxy_server.js`** (Apache-2.0, avoid `src/pro/`). Take the Vite pre-plugin (`@babel/parser` + `magic-string` -> `data-dyad-id="file:line:col"`) and the proxy that injects the selector client and error shim into the preview HTML. This is our click-to-select pipe with zero changes to the user project.
3. **dyad version/branch services** (Apache-2.0). `version_handlers.ts`, `git_branch_handlers.ts`, `git_service.ts` (`dugite`), `git_overlay_workspace.ts`: one commit per agent turn, restore, branch = "direction". Map straight to our versions/branches/compare.
4. **react-grab + bippy** (MIT). `core/context.ts` with `bippy/source` `getOwnerStack` gets source location from the React 19 fiber at runtime: a fallback when the tagger is absent. Take `html-preview.ts` for the compact element snippet we put in the edit prompt, and `arrow-navigation.ts` for parent/child walk.
5. **code-inspector** (MIT). `server/transform/scan-html-tag.ts` for stamping plain standalone-HTML files (our second format), and `ai/server/ai-provider-claude.ts` + `ai-history.ts` as a working "clicked element -> Claude Agent SDK query" reference.
6. **open-lovable error loop** (MIT). Port `check-vite-errors`, `report-vite-error`, `monitor-vite-logs`, and `analyze-edit-intent` routes into Hono: catch Vite/runtime errors from the preview and send them back to the agent; pick target files before a turn.
7. **openui `HtmlAnnotator.tsx` + `Versions.tsx` + `lib/html.ts`** (Apache-2.0). Annotate-in-iframe UX and a version strip with live thumbnails; `wrappedCode` shows how to wrap standalone HTML for the iframe.
8. **Design quality pass: anthropics `skills/frontend-design` (Apache-2.0) + pixelmatch (ISC) + Design2Code `metrics/` (MIT) + axe-core (MPL-2.0 dep)**. Load the skill through the Agent SDK skill settings; use pixelmatch for version compare overlays; port Design2Code's block/text/position/color scoring for "match the reference"; run axe in the iframe after each turn.

## Do not copy (license)

stagewise (AGPL-3.0), webstudio (AGPL-3.0), easyblocks (AGPL-3.0), agentation (PolyForm Shield), gpt-pilot (FSL-1.1-MIT), dyad `src/pro/` (FSL-1.1-ALv2), tldraw SDK (custom commercial), make-real / WebGen-Bench / locatorjs root / claude-agent-sdk-demos / vercel-labs/agent-skills (no license), WebSimAI_open (GPL-3.0).

## Open checks

- WebContainer API commercial terms (only matters if we use bolt runtime; we should not).
- Per-skill licenses in `anthropics/skills` other than `frontend-design`.
- Paths marked *(unverified)* for srcbook, plasmic, codebuff, opencode, puck history store.
- "Frontend-Studio": no repo found; need a URL.
