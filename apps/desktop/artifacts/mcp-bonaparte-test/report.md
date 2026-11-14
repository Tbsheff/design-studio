# MCP test: import the Bonaparte design system and mock up a new screen

Date: 2026-11-12. Tester: outside agent (Claude), raw JSON-RPC over streamable HTTP. No code changed in design-studio. Bonaparte is read-only and did not change.

## Result

| Step | Result | Time |
|---|---|---|
| 0. Connect | Passes, with 2 gaps (token and MCP switch need HTTP) | ~3 min of discovery |
| 1. tools/list | Passes: 290 tools | 346 ms |
| 2. Import Bonaparte design system | Passes, with gaps: 129 of 130 hex tokens match; 57 of 335 var names dropped; check fails on numbered headings | 11 s call + 50 s lost to approval timeout |
| 3. Create HTML prototype of a new screen | Passes: "Team caseload" page written with `write_file` | create 2.4 s, each write 0.3-1.6 s |
| 4. Screenshots through MCP | Passes: light and dark PNGs from `get_screenshot` | 0.2-1.7 s each |
| 5. Quality check | Passes: 205 `var(--...)` uses, 0 hex literals, 0 undefined vars, Inter 400-700 loaded | - |

End to end, with discovery: about 12 minutes. Without discovery and the approval timeout: under 2 minutes of tool time.

## Setup

- Ran `STUDIO_DATA_DIR=$(mktemp -d) pnpm --config.verify-deps-before-run=false run dev` in `apps/desktop`. Real agent (`agent: sdk`), never started a run.
- Server ready after about 25 s: app on `127.0.0.1:4170`, preview on `4171`, UI on `5173`.
- `@modelcontextprotocol/sdk` is not in the main repo `node_modules` (only in old worktrees), so the client is a 40-line raw JSON-RPC script (`initialize`, `notifications/initialized`, `tools/list`, `tools/call`, with `mcp-session-id`).

### Step 0: connect (gaps)

1. `GET /api/mcp` and `/api/mcp/setup` -> `403 {"error":"forbidden"}`. They need the `x-studio-token` header.
2. `GET /api/session` -> `403 "Only the Design Studio app can read this session."` It passes only with the header `sec-fetch-site: same-origin`. An outside agent can set this header, so the check does not stop an agent; it only makes the token hard to find. **Gap: no documented way for an outside agent to get the studio token.**
3. With the token: `GET /api/mcp` -> `{"enabled":false,"edits":false}`. MCP is off by default.
4. `POST /api/mcp {"enabled":true,"edits":true}` (action `connection.setStatus`, `mcp: { off: "secret" }`). Returned the URL `http://127.0.0.1:4590/mcp` and a `claude mcp add ... --header "Authorization: Bearer ..."` command. **HTTP fallback (by design: secret).**
5. MCP `initialize` -> 200 in 59 ms, server `design-studio 0.1.0`, with a long instructions text.

### Step 1: tools/list

290 tools in 346 ms. Relevant tools:

- Design systems: `create_design_system`, `design_system_status`, `save_design_system`, `list_design_systems`, `apply_design_system`, `create_pack_pack`, `import_pack_pack`, `set_pack_pack`, `update_pack_pack`, `start_editor_pack`, `get_tokens`, `get_design_md`, `set_design_md_project`, `set_token`, `create_theme`, `import_theme`, `apply_theme`.
- Projects: `list_projects`, `search_projects`, `create_project`, `create_prototype_project`, `import_project`, `duplicate_project`, `update_project`, `delete_project`.
- Files: `list_files`, `read_file`, `write_file`, `update_file_workspace`, `get_frame_html`.
- Screenshots and export: `get_screenshot`, `export_frame` (SVG, PPTX), `export_mockup` (device bezel PNG), `export`, `export_handoff_export`.

Naming is uneven for an outside agent: `create_pack_pack`, `import_pack_pack`, `export_handoff_export` repeat the domain, and "pack" and "design system" name one thing.

### Step 2: import the Bonaparte design system

Calls:

1. `create_design_system {name, folderPath: "/Volumes/DevProjects/code/bonaparte", designMd: <Bonaparte DESIGN.md>, mode: "auto"}`
   - First call, no UI open: error in 84 ms: "Design Studio is not open, so nobody can approve this action. Open the Design Studio window, then call the tool again."
   - Opened the UI (`http://127.0.0.1:5173`) in a browser. Second call: the approval card showed about 5-8 s later; I missed it. Error after 50 028 ms: "Nobody answered the approval prompt in Design Studio in time, so it was refused."
   - Third call: clicked "Allow once" in the UI. Passed in 10.9 s. Draft project `Lfjgijckdm`, pack `user-bonaparte-enzo-health`.
   - The first response said `sources: []`, `grade: "rebuild"`, `score: 0`, Geist fonts: a misleading snapshot from before the sources were read.
2. `design_system_status` (6 polls, 40-110 ms): `done: true` on the first poll. Sources: DESIGN.md (11 colors), folder (47 colors, 5 fonts, 8 type sizes, 9 space steps, 8 radii, 6 shadows, 265 extra tokens). Grade `excellent`, 98/100. Check **fails** with 9 problems: `DESIGN.md has no "## Visual Theme & Atmosphere" section.` and 7 more of that kind.
   - Bonaparte has every section, numbered: `## 1. Visual Theme & Atmosphere` ... `## 8. Responsive Behavior`. The draft DESIGN.md keeps them (lines 326-1049). **Bug: the check does not accept numbered headings.**
3. `get_tokens`, `get_design_md`, `list_files`, `read_file design-system/tokens.css`, `read_file source/evidence.md`.
4. `save_design_system` -> refused (check). `save_design_system {force: true, reason}` -> passed in 254 ms.

Fidelity, compared with `bonaparte/packages/ui/src/styles/globals.css` and `DESIGN.md`:

| Check | Result |
|---|---|
| Hex tokens (brand teal, lime, stone, cream, pink, tints, enzo-* ramps, badges, actions, surfaces) | 129 of 130 same name and same value. Only `--brand-primary` dropped |
| All custom property names | 278 of 335 kept, 57 dropped |
| Dropped names that matter | `--color-text-default`, `--color-text-secondary`, `--color-text-muted`, `--color-surface-page`, `--color-border-default` (all `var()` aliases, and the ones DESIGN.md says to use first), shadcn aliases (`--background`, `--foreground`, `--muted-foreground`, `--card`, `--input`, `--destructive`), `--radius`, `--font-sans`, `--shadow-xs`, `--shadow`, `--shadow-xl` |
| Studio core tokens | `--primary` #015a5d = brand-teal-500, `--ring` #2d9d91, `--success`, `--warning`, `--danger` correct. `--bg`, `--fg`, `--fg-muted` from the oklch shadcn values |
| Fonts | Inter body and display (from `apps/dashboard/app/layout.tsx` next/font), Google Fonts URL added. Mono `SFMono-Regular` |
| Radii | sm 4px, md 6px, lg 0.5rem: same as Bonaparte globals.css. (Bonaparte DESIGN.md says 6/8/10 px from 0.625rem; the import follows the code.) |
| Dark mode values | `.dark` and `[data-theme="dark"]` block kept, values correct |
| Dark mode trigger | **Changed**: tokens.css also turns dark on `@media (prefers-color-scheme: dark)`. Bonaparte is light by default and dark only with `.dark`. See step 5 |
| DESIGN.md | All 10 Bonaparte sections kept, plus a generated token table at the top |
| Components | Not imported. Only 3 files read (`globals.css`, one `orders-table.css`, `layout.tsx`). `packages/ui/src/components` (Button, Card, Badge) not read; component look comes only from DESIGN.md text. The folder walk stopped "after 20000 entries or 300 files" |

### Step 3: new screen

Chosen screen: **Team caseload** for an agency director of nursing. Bonaparte has patients, intake, OASIS, QA reviews, orders, billing and notifications, but no caseload or capacity screen (checked `apps/dashboard/app/**/page.tsx`). The page has the dark teal sidebar, a breadcrumb top bar, page heading, discipline tabs, a week picker, 4 KPI cards, a clinician table with load bars and status badges, an AI rebalance card (sidebar teal with lime glyph), and a "Needs attention" list.

Calls:

1. `create_project {name: "Enzo Team Caseload", designSystemId: "user-bonaparte-enzo-health", kind: "html"}` -> `uFbad_NI2f` in 2.4 s. It has DESIGN.md and `design-system/*`, but **no index.html** (`read_file index.html` -> "file not found").
2. `write_file {path: "index.html", wait: "render"}` -> version saved, 1.6 s. Note: "No page of this app was rendered yet, so there was no rebuild to wait for."
3. `write_file {path: "dark.html"}`: a copy with `class="dark"`, because `get_screenshot` has no color scheme input.
4. Two more rounds of `write_file` for a layout fix (table width) and the theme fix in step 5. Each write was one version.

Not used: `create_prototype_project`. It needs `import_project {isWorkspace: true}` on the Bonaparte folder first. `create_project` with the saved pack was the shorter path.

### Step 4: screenshots

`get_screenshot {projectId, path, width: 1440, height: 900, fullPage: true}` -> PNG 1440 x 1095, 0.2-1.7 s. The image came back as MCP `image` content.

- `team-caseload-light.png`
- `team-caseload-dark.png`
- `team-caseload.html` (final light page), `team-caseload-dark.html` (same page with `class="dark" data-theme="dark"`)

### Step 5: quality

- `var(--...)`: 205 uses, 88 names. 82 come from the imported tokens.css, 6 from a local alias block. 0 undefined. 0 hex literals in the page.
- 73 of the 88 names exist in Bonaparte globals.css (`--color-action-primary`, `--color-badge-*`, `--color-text-heading`, `--sidebar-*`, `--color-brand-*`, `--shadow-sm`). 15 are studio scale names (`--space-*`, `--text-*`, `--font-body`, `--radius-pill`), which Bonaparte gets from Tailwind classes.
- Local alias block: I had to redefine `--color-text-default`, `--color-text-secondary`, `--color-text-muted`, `--color-surface-page`, `--color-border-default` from the imported stone ramp, with the same values as Bonaparte globals.css.
- Fonts: in the live preview (`http://p-<hex id>.localhost:4171/d/<project>/main/index.html`), `document.fonts` shows Inter 400, 500, 600, 700 loaded; body `font-family` is Inter.
- **Bug found and fixed in the page**: in a browser that prefers dark, the first index.html showed near-white headings (`--color-text-heading` dark value) on a light stone page (my alias). Cause: tokens.css turns dark on `prefers-color-scheme`, and my aliases turned dark only on `.dark`. Fix: `data-theme="light"` on `<html>`. After the fix, in the same browser: h1 = teal-800, primary = #015A5D, page = stone-100. The studio screenshots were not affected, because the screenshot browser is light.
- Look: dark teal sidebar with lime active icon, stone page, white cards with 12 px radius and `shadow-sm`, teal primary button, badge colors from Bonaparte badge tokens, Inter type scale from DESIGN.md. It reads as Enzo Health.

## Gaps and errors

| # | Where | Message or behavior |
|---|---|---|
| G1 | Token | `/api/session` -> `403 "Only the Design Studio app can read this session."`; works with a spoofed `sec-fetch-site: same-origin` |
| G2 | MCP switch | MCP and Allow edits are off by default; only `POST /api/mcp` (HTTP) turns them on (`mcp: { off: "secret" }`) |
| G3 | SDK | `@modelcontextprotocol/sdk` not installed in the main repo `node_modules` |
| G4 | Approval, closed | `create_design_system` with no UI open: "Design Studio is not open, so nobody can approve this action." A headless agent cannot import a folder outside the projects folder |
| G5 | Approval, timeout | The card shows 5-8 s after the call; the timeout is 50 s; the error tells the agent nothing it can do |
| G6 | Draft response | First `create_design_system` result says `sources: []`, grade `rebuild`, score 0, Geist fonts, before the sources are read |
| G7 | Check | `DESIGN.md has no "## Visual Theme & Atmosphere" section.` (x8+) on a DESIGN.md that has `## 1. Visual Theme & Atmosphere`. Needed `force: true` |
| G8 | Token names | 57 of 335 names dropped, including all `var()` alias tokens that Bonaparte DESIGN.md tells you to use (`--color-text-default`, `--color-surface-page`, `--color-border-default`) |
| G9 | Dark trigger | tokens.css adds `@media (prefers-color-scheme: dark)`, which Bonaparte does not have. Pages can mix modes |
| G10 | Components | No component import: 3 files read, `packages/ui` components not read |
| G11 | Empty project | `create_project` with a pack makes no `index.html`: `read_file index.html` -> "file not found" |
| G12 | Dark screenshot | `get_screenshot` has no `colorScheme` input; I needed a second page with `class="dark"` |
| G13 | Project folder | `STUDIO_DATA_DIR` does not hold projects: they go to `design-studio/studio-projects/` (git-ignored) and stay after the data dir is deleted. The test deleted its 2 project folders at the end |
| G14 | Tool names | `create_pack_pack`, `import_pack_pack`, `export_handoff_export`; "pack" and "design system" are one thing with two names |

## Top 5 fixes

1. **Let a headless agent connect and approve.** Make `connection.getSetup` readable with a local token from a known file (for example `<data dir>/mcp.json`), and add `STUDIO_MCP=on STUDIO_MCP_EDITS=on` env vars for dev runs. For folder imports, let the user pre-approve a folder list (or `STUDIO_MCP_TRUSTED_FOLDERS`), so `create_design_system` with `folderPath` does not need a click. (G1, G2, G4, G5)
2. **Keep every source var name.** Resolve `var()` aliases and write them to tokens.css with their source names (`--color-text-default: var(--color-brand-stone-700)`), including shadcn aliases, `--radius` and `--font-sans`. Then a page can use the names in the source DESIGN.md as they are. (G8)
3. **Accept numbered DESIGN.md headings** (`## 1. Visual Theme & Atmosphere`) in the design system check, and return a clear status in the first `create_design_system` response (`sources: queued`, no grade) instead of `rebuild` and score 0. (G6, G7)
4. **Copy the dark mode trigger from the source.** When the source is class-based (`.dark`, `@custom-variant dark`), do not add `prefers-color-scheme`. Add `colorScheme: light | dark` to `get_screenshot` so an agent can shoot both modes from one page. (G9, G12)
5. **Give a pack project a starter page and read components.** `create_project` with a design system should write an `index.html` that links `design-system/tokens.css` and the font URL. The folder reader should read the UI package components (`packages/ui/src/components/{button,card,badge,input}.tsx`) and save their class recipes as kit snippets. (G10, G11)

## Bonaparte unchanged

| | Before | After |
|---|---|---|
| `git status --short \| wc -l` | 14 | 14 (same 14 entries, listed before and after) |
| `git diff --cached --stat` | empty | empty |

## Design Studio unchanged

`git status --short` after the test shows only the new `apps/desktop/artifacts/mcp-bonaparte-test/` plus the 3 untracked entries from the start (`apps/desktop/artifacts/open-design-polish.md`, `apps/desktop/artifacts/polish/`, `artifacts/`). No tracked file changed.

## Cleanup

- Stopped the dev server by PID (concurrently 55925, server 57745, vite 57229). Ports 4170, 4171, 4590, 5173 are free.
- Closed the browser tabs that held the app window and the preview.
- Deleted `studio-projects/enzo-team-caseload` and `studio-projects/bonaparte-enzo-health-design-system` (git-ignored, made by this test). The other 17 project folders were there before and stay.
- Deleted the temp data dir.
