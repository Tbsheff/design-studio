# Polish cycle: canvas-first, prompt to design

Goal: a faster, simpler Open Design (chat and a big live preview) with the canvas-first look of doop. Each pick removes clutter, cuts a step, or shows the design sooner. No pick adds a panel or a feature. Every action, MCP tool and shortcut stays; a control that leaves one place has another home.

Sources: `nexu-io/open-design` README (Home is a brief composer with one-click prompt chips; the project is a chat beside a live preview) and `kgoedecke/doop` README (tools in a bottom toolbar, floating strips on the canvas, the inspector opens on select). Our screens: `polish-cycle/*-before-*.png` and `polish-cycle/*-after-*.png`.

## Step 0: tool strip floats (done before the picks)

The tool strip is a bottom-centre card on the free canvas, as in doop. It takes no layout width, so fit uses the canvas width minus the dock card.

| Window, column | Page 1440x900 | Kit frame 1647x1294 |
|---|---|---|
| 1440, closed | 66 -> 69 % | 58 -> 60 % (height caps it at 60 %) |
| 1440, open | 49 -> 52 % | 43 -> 46 % |
| 1000, closed | 40 -> 43 % | 35 -> 37 % |
| 1000, open | 24 -> 27 % | 21 -> 24 % |

All rows at 900 px window height. The strip reserves no height: a frame that fits by height can have its bottom 24 px under the strip.

## The 5 picks

### 1. Editor opens with the column closed

- **Was:** every new editor opened with the Layers column card open. It took 280 px of the canvas, so a new design showed at 52 % (1440 window).
- **Now:** the column starts closed. The design fits at 69 %. The rail, ⌥1 to ⌥7 and the X still open and close it, and the app remembers the last state.
- **Why:** Open Design and doop both lead with the preview. After a prompt, the user wants to see the design, not the layer tree.

### 2. Short briefs build at once; questions are opt-in

- **Was:** a brief under 12 words did not build. Home first called the clarify model, then showed "A few quick questions" with 3 rows of chips. The user had to answer or click "Skip questions". That is one model call and one click before any design.
- **Now:** Enter builds every brief. The questions stay in the composer + menu: "Ask questions on short briefs" turns them on (the label then reads "Build short briefs at once").
- **Why:** prompt to design visible is the default flow. Open Design and doop both start the design from the brief.

### 3. Location row folds under Advanced

- **Was:** a row under the composer always showed "Location [Design Studio ▾] New folder /long/path/untitled".
- **Now:** the row shows only when Advanced is open, when you picked a non-default location, or when focus moves into it (the + menu "Location" item now focuses it; before, that item did nothing).
- **Why:** the default location is right for almost every prototype. The path is noise on the first screen.

### 4. No Continue card on Home

- **Was:** the latest project showed 4 times on Home: sidebar Recent, the "Recent in Prototypes" row, a large Continue card, and the library list.
- **Now:** the Continue card is gone. Resume is still one click in sidebar Recent (newest first, all workspaces), the recent row and the library list.
- **Why:** the card was the largest block on Home and repeated the row above it.

### 5. Activity column shows only when it has something

- **Was:** a 320 px Activity column always sat on the right of Home, with 4 empty sections ("Nothing is running.", "Nothing waits on you.", "No runs yet.", "Attach an app folder…").
- **Now:** the column shows only when a run, an approval, a recent run or a dev server exists, or when the activity feed fails. With no activity, the centre gets the width.
- **Why:** an empty panel is clutter. doop and Open Design show activity next to the work, not as a fixed empty column.
- **Trade-off:** the column frame shows while the feed loads, so Home does not jump for a user with past runs. A user with no activity sees the frame for about 100 ms, then the centre widens once. Any past run keeps the column, so this pick mostly helps new users.

## Strip states checked

All 8 states (1440 and 1000 px, column open and closed, inspector open and closed) leave no tool under a card or the zoom control. The row lifts above the zoom row when it would touch it; it turns vertical only at 1000 px with the column and the inspector open.

## Seen, not changed

- The composer takes focus when a project opens, so tool keys (V H F R P T C L) do nothing until you click outside it.
- A new project shows a blank thumbnail in the recent row until its first thumbnail is made.

## Idle CPU

No pick adds an animation. The strip, the column default and the Home changes are layout and render only.
