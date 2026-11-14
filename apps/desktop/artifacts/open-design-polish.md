# Open Design polish: make Design Studio a faster Open Design

Date: 2026-11-11. Read-only research. No code changed.
Sources: `nexu-io/open-design` v0.27.1 (read with `gh api`), `docs/layout.md`, `apps/desktop/src/ui`, and timings of the built UI on this Mac.

## 1. Open Design default flow

- **Home is one prompt.** A centered box ("Describe what you want to generate…") with rotating example prompts and a row of project-type chips. A thin left nav holds Home, Projects, Plugins, Design systems and recent projects (`apps/web/src/components/home-hero/*`, `HomeView.tsx`, `i18n/locales/en.ts` `homeHero.*`).
- **The prompt goes straight to a project.** The UI creates the project. The daemon picks the design system, skill and agent, then streams events over SSE. Each file the agent writes shows in a live sandboxed iframe (`docs/architecture.md` §4).
- **The editor has two columns.** Chat on the left (460 px default, 345 px min, drag to resize). The file workspace and the live preview take the rest (`project-split-layout.ts`, `ProjectView.tsx`, `FileWorkspace.tsx`). A "workspace focused" mode hides the chat.
- **Questions stay in chat.** The agent asks clarifying questions as an inline form in the chat (`QuestionForm.tsx`). It does not use a modal or a panel.
- **Everything else is hidden until you ask.** Settings sits behind a gear. Design system choice is a picker on the composer. Critique, manual edit, tweaks, comments, share, version history and export open from menus or the preview toolbar. No layers tree, inspector, tool bar or activity column shows by default.

## 2. What we show that Open Design does not

Measured at 1440 × 900 with the built UI. Today the editor gives the preview about 788 px (1440 − rail 44 − chat 360 − Layers 248). The frame shows at 51 %. Open Design gives chat 460 px and the preview about 980 px.

Every "move" or "remove" row names what still serves the feature. No action, MCP tool or agent tool goes away. Hidden panels keep their keys.

### Home

| Element | Where | Proposal | Still served by |
|---|---|---|---|
| Prompt composer, send | Center | Keep visible | `project.create`, `run.start` |
| Design system chip, kind (Prototype), model chip | Composer bar | Keep visible (one row) | `pack.list` |
| "Add app folder" and `</>` buttons | Composer bar | Move into the `+` menu | `+` menu, palette "Attach app folder" |
| "Expand prompt" | Composer bar | Move into the `+` menu | `+` menu, palette |
| Location, New folder path, Advanced, Data use | Composer foot (`home-extras.tsx`) | Move into Advanced (collapsed) | palette "Project location…" |
| 3 starter cards (New prototype, Open the sample, Start from a template) | Under composer (`workspace-center.tsx`) | Replace with example-prompt chips inside the box, as OD does | palette "Open the sample", "Start from a template" |
| Recent in X (thumbnails) | Center | Keep visible, one row | `project.list` |
| Continue card (large) | Center (`library-body.tsx`) | Remove. It repeats the first Recent card | Recent row, ⌘O |
| Workspaces tree (Design systems, Prototypes, Screens) | Left sidebar (`workspace-list.tsx`) | Collapse to a thin nav: Home, Projects, Design systems, plus Recent | ⌘1–⌘9, palette |
| Search and commands | Sidebar top | Keep, as ⌘K hint only | ⌘K |
| Attach app folder, Trash | Sidebar foot | Move to palette and the `+` menu | palette "Trash", "Attach app folder" |
| Activity column (Running, Waiting on you, Recent runs, Dev servers) | Right, 320 px (`activity-column.tsx`) | Move behind one toggle. Show a badge on the toggle when a run or approval waits | `studio.getActivity`, `connection.listApprovals`, palette "Show activity" |
| Status bar (model, MCP off, clients, key hints, theme) | Bottom (`status-bar.tsx`) | Keep one dot: MCP state. Move the rest to Settings and the palette | `connection.getStatus`, Settings |

### Editor

| Element | Where | Proposal | Still served by |
|---|---|---|---|
| Chat log and composer | Left, 360 px | Keep visible. Widen to 440 px | `run.start`, `run.stop` |
| Steps summary, created-file chip, cost line | Chat | Keep visible | `run.get` |
| "Polish this" and Next steps cards | Chat | Keep visible, collapse to one line after the first run | `critique.run`, suggestions |
| Selection chip, Prototype and model chips, `+` | Composer | Keep visible | — |
| "71 skills", "Data use", "No limit" | Composer foot | Move into the `+` menu | palette "Skills", "Budget" |
| Live preview frame | Center | Keep visible. Fit to width by default | preview iframe |
| Panel rail (7 icons: Layers, Pages, Assets, Versions, Tokens, Components, Design system) | Far left, 44 px (`panel-rail.tsx`) | Remove the rail. Keep the column on ⌥1–⌥7 and in the palette | ⌥1–⌥7, palette |
| Layers column | Open by default, 248 px | Closed by default | ⌥1, MCP `get_layers` |
| Tools group (V, H, F, R, P, T, C, L) | Top bar center (`top-bar-tools.tsx`) | Hide by default. Show it when the user presses a tool key, selects a layer, or turns on "Edit mode" | keys V/H/F/R/P/T/C/L, palette |
| Zoom pill | Top bar | Move to a small preview corner control | ⌘+ ⌘− ⌘0 ⇧1 |
| File menu (`index ▾`) | Top bar | Keep, as page switch | ⌥2 |
| Review, Present | Top bar right | Move into one "…" menu next to Share | palette "Open review", ⌥⌘⏎ |
| Share | Top bar right | Keep visible | `share.create` |
| Account avatar | Top bar right | Move into the "…" menu | palette "Account" |
| Inspector | Right, on select | Keep "opens on select". Off when the tools are hidden | ⌥8 |
| Mini project rail | Left (lazy) | Remove from default | ⌘\ |
| Draw bar, comment-mode pill | Canvas | Show only in the comment or draw tool | C, ⇧P |
| Viewport control | Top bar (lazy) | Move to the preview corner control | palette "Check viewports (matrix)" |

## 3. Speed

### Test conditions

- Built UI served by the dev server on `:4170` (`STUDIO_AGENT=mock`, fresh data dir). M4 Pro. Load average 13–23 (other work ran on this Mac).
- The mock agent has no model time. "First frame" is UI cost only.
- 1 to 12 projects in the data dir. The count grew during the runs, and the request counts grew with it.
- Timer: `performance.now()` in the page, with a 5 ms `waitForFunction` poll or a rAF text logger. Playwright locator waits gave ~860 ms for Home. That number comes from locator back-off, not from the app. Do not use it.

### Numbers

| Measure | Result |
|---|---|
| First paint (FCP) | 44–52 ms. It paints only "Connecting…" |
| Home usable (composer in the DOM), cold | 390–454 ms |
| Blank screen on Home | 67 → 390 ms (rAF text log: "Connecting…", then empty, then Home) |
| Editor cold load (`/p/<id>`), shell shown | 395–412 ms. "Loading project…" shows from 23 to 379 ms |
| Editor cold load, first frame content | 479–495 ms |
| Open a project from Home (click), shell / frame | 167–191 / 248–283 ms |
| Create from Home prompt (mock), editor shell / first frame | 162–190 / 264–307 ms |
| Home requests on load | 168–180 total, 19–25 `/api` (10 projects) |
| Editor `/api` calls in the first 3 s | 42–45 |
| JS on Home after idle prefetch | 1601 KB decoded (budget `homeJsKb` 300) |
| JS in the editor | 1856 KB decoded |
| Dev server (`:5173`, footnote only) | Home 980–1000 ms (Playwright wait), 2082 requests, editor first frame 391–408 ms |

### Bundle (`pnpm run build:ui`, 4.1 s)

- 277 JS files and 49 CSS files, 4.7 MB in `dist/ui/assets`.
- Entry, static: 312 KB JS in 35 chunks, plus 391 KB CSS (`index-DKnjpD1Z.css`, 60 stylesheets from `main.tsx`).
- Home adds 120 KB (`home` chunk 78 KB).
- Studio adds 1104 KB in 69 chunks: canvas barrel chunk `index-BKjDH5yG.js` 404 KB (443 KB of `features/canvas` source), `studio` 192 KB, `markdown` 156 KB, `chat-panel` 95 KB.
- `code-edit-view-model` 440 KB (CodeMirror) is lazy. Good.

### Regression

`e2e/results/perf-r5.json` (2026-10-24) has `homeUsableWeb` p50 98 ms and `openFromHome` p50 61 ms. Its probe is close to ours: rAF poll and `performance.now()`, composer plus a project card. Today Home is about 4× slower (~400 ms). The Home layout changed since then, so the probe is close but not the same. Run `e2e/perf-r5.spec.ts` once to confirm. Load on this Mac was high, but the CPU profile shows the main thread idle for 377 of 559 ms. Load does not explain the gap.

### Top 5 speed fixes

1. **Remove the 300 ms Suspense hold on Home and the editor.** All assets finish by ~39 ms. The CPU is idle. The first `/api` call starts at ~351–426 ms. The `Home` and `Studio` screens are `lazy()` inside `Screen`'s `<Suspense>`. React 19.3 holds a revealed boundary for `FALLBACK_THROTTLE_MS = 300`. Text logs show the fallback ("Loading project…") or a blank screen for that time. Fix: import `Home` statically (78 KB), or resolve the lazy module before the first render. Start the first Home reads in parallel with the chunk load. For the editor, start `prefetchStudio()` before React mounts on `/p/<id>` routes. Files: `src/ui/app/screen.tsx`, `src/ui/app/app-screen.tsx`, `src/ui/app/screens.tsx`, `src/ui/features/home/index.ts`, `src/ui/app/app.tsx`. Also `src/ui/app/use-session.ts`: it waits a render for `loadSession()`, but `src/ui/platform/session.ts` reads the meta tags with no network call. Read them in sync. Expected gain: ~300 ms on both cold paths.
2. **Stop the idle prefetch of the whole editor on Home.** At ~403 ms Home pulls `studio`, the canvas barrel, `markdown` and `chat-panel` (~1.1 MB) while the Home reads run. Prefetch on card hover or composer focus, or after the Home reads settle. Files: `src/ui/app/screen-preload.ts` (`prefetchScreensWhenIdle`), `src/ui/features/home/use-home-startup.ts`.
3. **Split the canvas barrel.** `src/ui/features/canvas/index.ts` re-exports 410 files' worth of features into one 404 KB chunk. `studio`, `inspector`, `tokens-panel`, `publish-pane`, `comments` and others import it. Play, draw, rulers, matrix and variations load on every editor open. Split by entry: live preview core first, then the edit tools lazily. Also defer the 156 KB `markdown` chunk until the first assistant message renders (`src/ui/features/chat/chat-panel.tsx`, `src/ui/app/shell/left-pane.tsx`). Keep the chat panel itself eager.
4. **Cut Home N+1 requests.** Each card fetches a thumbnail and calls `/runs` twice: `src/ui/features/home/use-last-run.ts` and `use-last-run-failed.ts` both call `listRecentRuns` (`use-last-runs.ts`). Home also opens two SSE streams to `/api/stream` (`src/ui/platform/stream.ts:193`, `src/ui/platform/stream-leader.ts:123`). Fix: one roll-up read with the last run per project, and one shared stream. The idle-prefetch fix also cuts the 168 requests on Home.
5. **Dedupe editor reads.** In the first 3 s the editor makes 42–45 `/api` calls. Duplicates: `d/main/tree` ×3, `tweaks` ×3, `design-system` ×2, `components` ×2, `links/implicit` ×2, `stream` ×2. It also reloads Home data (`/api/projects`, `/api/activity`, thumbnails) for the mini project rail. Fix: dedupe in-flight reads in `src/ui/platform/query.ts` (U12a allows this). Do not fetch the closed panels (Layers, tweaks, components, comments, links) until they open. Do not mount `src/ui/features/home/project-rail.tsx` by default.

Also: the eager CSS is 391 KB. It holds editor, ship, review and Figma styles on Home. Split per screen in `src/ui/app/main.tsx`.

## 4. Proposed default layouts

Rule: chat plus live preview first. Everything else is one key, the palette (⌘K), or one toggle away. All actions stay on HTTP, MCP and the agent. Only the default view changes.

### Home

```
┌──────────────┬────────────────────────────────────────────────────────────┐
│ ● Design     │                                                            │
│   Studio     │            What do you want to design?                     │
│              │  ┌──────────────────────────────────────────────────────┐  │
│ ⌂ Home       │  │ Describe a screen, drop an image, folder or link…    │  │
│ ▦ Projects   │  │                                                      │  │
│ ◈ Systems    │  │ [+] [No design system ▾] [Prototype ▾] [Sonnet ▾] ⏎  │  │
│              │  └──────────────────────────────────────────────────────┘  │
│ RECENT       │   ( Landing page )( Pricing page )( Mobile onboarding )    │
│  Kiln Coffee │                                                            │
│  Billing     │   Recent                                                   │
│              │   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                      │
│              │   │      │ │      │ │      │ │      │                      │
│ ⌘K Search    │   └──────┘ └──────┘ └──────┘ └──────┘                      │
│ ◐ 1 running  │                                                            │
└──────────────┴────────────────────────────────────────────────────────────┘
 nav 200         center. Activity opens from "◐ 1 running" (or the palette) as a sheet
```

- The `+` menu holds: attach app folder, attach image, open link, expand prompt, location, advanced.
- "◐ 1 running" shows only when a run or approval waits. It opens the Activity sheet.
- The workspace tree is the Projects page. It is not the default.

### Editor

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ‹ Kiln Coffee ▾  › index ▾                         ✎ Edit    Share   …       │ 44
├───────────────────────────┬──────────────────────────────────────────────────┤
│ Chat                      │                                                  │
│                           │   ┌──────────────────────────────────────────┐   │
│  You: landing page…       │   │                                          │   │
│  ✓ 5 steps · index.html   │   │                                          │   │
│  233 ms · $0.00           │   │          live preview (fit width)        │   │
│                           │   │                                          │   │
│  Next: Polish · States ·  │   │                                          │   │
│        Responsive         │   │                                          │   │
│                           │   └──────────────────────────────────────────┘   │
│ ┌───────────────────────┐ │                                   [−] 64% [+] ⧉ │
│ │ On Hero ×             │ │                                                  │
│ │ Ask for a change…     │ │                                                  │
│ │ [+] [Proto▾] [Model▾]⏎│ │                                                  │
│ └───────────────────────┘ │                                                  │
└───────────────────────────┴──────────────────────────────────────────────────┘
  chat 440 (drag to resize)   preview ~1000 px at 1440 wide
```

- **✎ Edit** (or any tool key, or a click to select) turns on edit mode: the tool bar, the inspector on select, and the last open column.
- **"…"** holds Review, Present, viewports, Versions, Comments, Account and Settings.
- **⌥1–⌥7** still open Layers, Pages, Assets, Versions, Tokens, Components and Design system as the left column. ⌥8 opens the inspector.
- **⌘K** lists every panel and every action.

## 5. Decisions for Tyler

- **Layout approval.** `docs/layout.md` says you approved nitpick 15 (editor: rail, Layers open, tools in the top bar) and nitpick 18 (Home IDE: tree, activity column, status bar). This proposal reverses parts of both. Choose: keep them as "Edit mode" and "Projects page" views behind one toggle (proposed), or keep them as the default.
- **Fix order.** Speed fix 1 is small, and it gains ~300 ms on each cold path. Do it before the layout work.
