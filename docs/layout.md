# Layout map: editor and Home

Status: Tyler approved both layouts. Section 2 (nitpick 15) and the project menu (nitpick 17) are built on `layout/editor`; the control map below is what the app does now. Section 3 (nitpick 18) is still a plan. This file also settles the panel homes that nitpicks 13 and 17 need.

Prototypes (open in a browser, add `?theme=dark` for dark):

- `apps/desktop/artifacts/prototypes/editor-layout.html` (nitpick 15)
- `apps/desktop/artifacts/prototypes/home-ide.html` (nitpick 18)

Screenshots sit next to them: `editor-layout-{light,dark}.png`, `editor-layout-menu-dark.png`, `editor-layout-chat-chip-light.png`, `home-ide-{light,dark}.png`. Query options: `theme=dark`, `sel=Hero`, `tab=tokens`, `side=rail`, `menu=open`, `chip=1` (editor), `ws=1` (Home).

Both files copy the two `:root` blocks of `apps/desktop/src/ui/styles/tokens.css` word for word. The app chrome uses no other color. Only the sample Kiln Coffee page inside the canvas frame has its own colors, because it is user content. They load no font file, so text falls back to SF Pro Text from `--font`. The app uses Inter Variable.

## 1. Rule for every control

- **Tools** change what a click on the canvas does. A tool never opens or closes a panel.
- **Panel toggles** have one fixed home and one shortcut each. Every toggle is also in the command palette (⌘K).
- **AI input** has one home: the chat on the left (nitpick 13).
- **Project menu** holds project actions only (nitpick 17).

## 2. Editor layout (nitpick 15)

```
┌────┬───────────────────────────────────────────────────────────────────────────────────────────┐
│ ●●●│ Kiln Coffee ▾  › Home        V  H  F  R  P  T │ C  L │ 100% ▾       Review  Present  Share  TS│  top bar 48
├────┼────────────────────┬──────────────┬─────────────────────────────────────┬─────────────────┤
│ ▤  │ Chat               │ Layers    ⌥1 │                                     │ Design│Proto│Code│
│ ▦  │                    │ ──────────── │                                     │                 │
│ ◫  │  agent messages    │ ▾ Page /     │        ┌──────────────────┐         │ Position        │
│ ⟲  │                    │   ▸ Header   │        │                  │         │ Layout          │
│ ◈  │                    │   ▾ Hero  ●  │        │   frame / route  │         │ Fill            │
│ ⧉  │                    │     Title    │        │                  │         │ Text            │
│ ◎  │                    │   ▸ Footer   │        └──────────────────┘         │ Effects         │
│    │ ┌────────────────┐ │              │                                     │                 │
│    │ │ On Hero ×      │ │              │                                     │                 │
│    │ │ Ask Claude…    │ │              │                                     │                 │
│    │ └────────────────┘ │              │                                     │                 │
└────┴────────────────────┴──────────────┴─────────────────────────────────────┴─────────────────┘
 rail  chat 360, always    column 248,    canvas                               inspector 280,
 44    on screen           toggled from   (tools change the click here)        opens on select
                           the rail
```

Rail icons, top to bottom: Layers, Pages, Assets, Versions, Tokens, Components, Design system. Click an icon to open the column on that tab. Click the open tab again to close the column.

### Control map

| Control | Was | Now | Shortcut |
|---|---|---|---|
| Select tool | Canvas tool bar | Top bar, tools group | V |
| Hand tool | Space only | Top bar, tools group | H (hold Space too) |
| Frame tool | Not a tool | Top bar, tools group. A click places a frame through the direct-edit insert | F |
| Shape tool | Vector mode | Top bar, tools group (rectangle) | R |
| Ellipse | Vector mode | Palette and key only | O |
| Pen tool | Vector mode | Top bar, tools group | P |
| Draw (freehand) | Pencil in the tool bar | Palette and key only | ⇧P |
| Text tool | Not a tool | Top bar, tools group. A click places text through the direct-edit insert | T |
| Comment tool | Canvas tool bar | Top bar, tools group. Opens the Comments sheet in the right column | C |
| Prototype link tool | "Prototype" in canvas tool bar | Top bar, tools group | L |
| Edit and layers | Canvas tool bar, swaps the left sidebar (⌥1) | Removed as a tool. Layers is a column tab | ⌥1 |
| Pages | `index ▾` file menu | Column tab. The top bar page label stays as a quick switch | ⌥2 |
| Assets | Left sidebar | Column tab | ⌥3 |
| Versions | Project menu | Column tab | ⌥4 |
| Tokens | Project menu | Column tab | ⌥5 |
| Components | Project menu and inspector tab | Column tab | ⌥6 |
| Design system | Project menu | Column tab | ⌥7 |
| Column toggle | None | Panel rail on the left edge. Click the open tab again, or press its key again, to close | ⌥1–⌥7 |
| Tweaks | Project menu, inspector tab and "Describe a tweak…" bar | Removed (nitpick 13). Chat takes the request | none |
| Inline prompt | ⌘I box on the selection | Removed (nitpick 13). ⌘I focuses chat with a selection chip | ⌘I |
| Inspector | Right side, mixed with chat | Right column, opens on select, closes when the selection clears | ⌥8 |
| Inspector tabs | Design, Pro, Components, Code, Tweaks | Design, Prototype, Code. Components moved to the column | click |
| Comments | Pane header toggle | Right column sheet, opened by the Comment tool or the palette | C |
| Errors, Todo, run details | Pane body | Chat column, unchanged | none |
| Zoom | Canvas corner | Top bar, after tools | ⌘+ ⌘− ⌘0, ⇧1 fit |
| Viewport matrix | Top bar "Matrix" button | Palette "Check viewports (matrix)". Cell badges stay on the frames | palette only |
| Review | Top bar | Top right. Palette "Open review" | palette only |
| Present | Top bar | Top right, with the present modes menu | ⌥⌘⏎ |
| Share | Top bar | Top right. Palette "Share…" | palette only |
| Account | App canvas bar | Top right avatar | none |
| Project rail | Project menu "Show project list" and rail | Rail toggle only (nitpick 10) | ⌘\ |
| Theme | Project menu | App settings and macOS View menu | none |
| Command palette | ⌘K, ⌘P | Same | ⌘K |

Narrow windows (below 1200 px): chat shrinks to 300, the column to 232 and the inspector to 264. While the inspector is open, the column floats over the left edge of the canvas, so the canvas keeps its width.

### Project menu (nitpick 17)

```
┌ Kiln Coffee ▾ ─────────────┐
│ Rename                     │
│ Duplicate                  │
│ Project settings…          │
│ Edit DESIGN.md             │
│ Move to trash              │
├────────────────────────────┤
│ All projects               │
└────────────────────────────┘
```

### Key rules

- **Single-letter keys** (V, H, F, R, P, T, C, L) work only when no text field has focus. Chat is always on screen, so a letter typed in the composer must never switch the tool. The prototype shows this.
- **⌘ and ⌥ keys** work in every focus state.
- **Esc** clears the selection first, then returns the tool to Select.
- **⌘H** stays the macOS Hide. The plan adds no ⌘H binding.

### Checked against current shortcuts

Current: ⌘K, ⌘P, ⌘Z, ⌘L, ⌘H, ⌘D, ⌘V, ⌥⇧A, ⌥1, ?. The map keeps ⌥1 for Layers and ⌘K for the palette. It adds no binding on ⌘L, ⌘D, ⌘V, ⌘Z or ⌥⇧A. ⌘I is free after nitpick 13 removes the inline prompt.

## 3. Home IDE layout (nitpick 18)

```
┌───────────────────────┬────────────────────────────────────────────┬──────────────────────────┐
│ ●●●  Design Studio    │ Bonaparte                         ⌘1       │ Activity                 │
│ ┌ Search  ⌘K ───────┐ │ app folder · design system Bonaparte DS    │ ── Running ───────────── │
│ └───────────────────┘ │                                            │ ◐ Redesign /billing      │
│ PINNED                │ ┌────────────────────────────────────────┐ │   chat · $0.42 · 3m   →  │
│  ★ Billing redesign   │ │ Describe a screen for Bonaparte…       │ │ ◐ add_comment (MCP)      │
│ RECENT                │ │                                        │ │   Cursor · 12s        →  │
│  Kiln Coffee   2m     │ │ [Bonaparte DS ▾] [kit: tres ▾]         │ │ ── Waiting on you ────── │
│ WORKSPACES            │ │ [dev :5173 ●]              [ Create ⏎ ]│ │ ! Approve publish        │
│ ▾ Bonaparte      ⌘1   │ └────────────────────────────────────────┘ │ ✎ 3 comments, Kiln       │
│   ▸ Design systems    │                                            │ ◇ Draft to save          │
│   ▾ Screens           │ ┌ New screen ┐ ┌ Redesign  ┐ ┌ Template  ┐ │ ── Dev servers ───────── │
│      Billing          │ │ in Bonap.. │ │ a route   │ │ start     │ │ ● Bonaparte  :5173       │
│      Settings         │ └────────────┘ └───────────┘ └───────────┘ │ ○ Kiln       stopped     │
│   ▸ Prototypes        │                                            │                          │
│ ▸ Prototypes     ⌘2   │ Recent in Bonaparte                        │                          │
│ + Attach app folder   │  Billing · Settings · Onboarding           │                          │
├───────────────────────┴────────────────────────────────────────────┴──────────────────────────┤
│ claude-opus · MCP on :7781 · 2 clients · main ↑1                                             │  status bar 24
└──────────────────────────────────────────────────────────────────────────────────────────────┘
  sidebar 260                 center, composer bound to workspace          activity 320
```

### Panel map and the actions behind them

Every panel reads through actions, so MCP and the agent see the same data. "Exists" means the action is in `all-actions.generated.ts` today. "Needs new" means the build slice stamps it with `new:action`.

| Panel | Shows | Actions | State |
|---|---|---|---|
| Workspaces tree | App folders plus "Prototypes", each with design systems, screens, prototypes | `workspace.getFolders`, `workspace.listProjects`, `workspace.listFoundApps`, `pack.list` | Exists |
| Pinned | Pinned projects | `project.update` gets an `isPinned` field, or a new set action | Needs new field |
| Recent | Last opened projects | `project.list` (sort by `updatedAt`) | Exists |
| Composer | Prompt bound to the workspace: design system, kit, dev server | `project.create`, `run.start`, `pack.list`, `dev-server.get` | Exists |
| Starters | "New screen in X", "Redesign a route", "Start from a template" | `project.create`, `dev-server.listRoutes`, `screen.create` | Exists |
| Running and recent runs | Runs from chat and MCP, status, cost, jump link | `run.list`, `run.get`, `run.stop` are per project | Needs new cross-project list |
| MCP activity | Recent MCP edits | `connection.listActivity` is per project | Needs new cross-project list |
| Waiting on you | Approvals, comments, drafts to save | `connection.listApprovals` (org), `comment.list` (project), `pack.getDraft` | Exists per item, needs new roll-up |
| Dev servers | Dev server state per attached app | `dev-server.get` is per project | Needs new cross-project list |
| Status bar | Agent model, MCP state, clients, git branch | `connection.getStatus`, `studio.health`; clients and git branch have no action | Needs new for clients and branch |

### Keyboard flow

| Key | Does |
|---|---|
| ⌘K | Command palette for everything |
| ⌘N | New design in the selected workspace (focus composer) |
| ⌘O | Open project (palette filtered to projects) |
| ⌘1 … ⌘9 | Select workspace 1 to 9 in the sidebar |
| ↑ ↓ ← → | Move in the tree, open and close a node |
| ⏎ | Open the selected tree row, or send the composer |

## 4. Duplicate rows on Home (nitpick 18 check)

Result: the client does not make the duplicates. `useHomeProjects` and `useProjects` render the `project.list` result one to one, with no merge.

The sample can be made twice on the server. `createSample` in `src/server/http/home-routes.ts` reuses an old "Sample: Kiln Coffee" only when `imported.created` is true and `designSystemFor` is empty. A sample made before that guard, or a copy from Duplicate, does not match, so a second one is made. The two "Bonaparte design system" rows are most likely a design system project and a duplicate or re-attach with the same name. To confirm, call `project.list` on Tyler's data dir and compare the `id`, `path` and `designSystemFor` of each pair. The Home IDE tree groups by workspace and shows the folder, so true copies are easy to tell apart.

## 5. Open for Tyler

- **Column side:** column next to the canvas (proposed) or next to the rail. The editor prototype has a switch for both.
- **Inspector with no selection:** close it (proposed) or show page settings like Figma.
- **Activity side:** right column (proposed) or below the composer on narrow windows.
- **Pins:** a field on `project.update` or a new `project.set` action.
- **Present and Review keys:** ⌥⌘⏎ for Present; Review and Share stay palette only.

## 6. UI-only view state

No action family owns canvas or play view state (no zoom, pan or toggle actions exist). These toggles change what the user sees. They write no source and no project file, so an MCP or agent caller has no result to read from them. A caller reads the page with `get_screenshot` and `get_layers` instead.

| Feature | Reason it stays UI-only | Headless path |
|---|---|---|
| Outline view (Shift+O) | Draws outlines in the bridge on the live page. Resets on reload | `get_layers` lists every element with its box |
| Device rotate (Play bar) | Swaps the device frame width and height in Play mode only. The frame keeps its size | `canvas_place` sets the frame width and height |
| Hotspot hints (Play bar, Shift hold) | Flashes link hit areas on a missed click in Play mode | `list_links` and `list_link_interactions` list the links |
| Layer pick (Select layer submenu) | Lists the layers under the pointer for one right click. A selection is not stored | `get_layers` gives layer ids. Each action takes a layer id or selector |
