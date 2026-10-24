# Polish benchmark: 10 rounds against Figma, pen.dev, Paper, Open Design, Claude Design and Claude Code (2026-10-23)

This file drives 10 polish rounds of Design Studio. Each round adds the missing features first, then polishes the area. The goal: faster, more polished and more complete than Figma, pen.dev (formerly pencil.dev), Paper, Open Design (OD) and Claude Design (CD), with a chat and agent experience as good as Claude Code (CC) or better.

How to use it:
1. Before a round, read that area's scorecard and its round list.
2. Build the features first, then the polish items. Each item has one acceptance check. Write each check as a Playwright test with the mock agent where possible (`npm run e2e`, `npm run e2e:desktop`).
3. Run the premium-feel checklist (last section) on every screen the round touched.
4. Update the status column in the scorecard when an item lands.

Status codes: **has**, **partial**, **missing**. Priority: **P0** (blocks the goal), **P1** (expected by a pro user), **P2** (nice to have). Size: **S** (under a day), **M** (1–3 days), **L** (more than 3 days, split across rounds).

Marks: **[mem]** means the researcher knew it but did not confirm it from a source on 2026-10-23. **[unverified]** means the sources disagree or give no proof. Source keys (F1, P1, A1, CD1, OD1, CC1) are in the Sources section.

All file paths are relative to the repo root. Status comes from a read-only code audit of `feat/polish-rounds` at `696e349`.

---

## 1. Scorecard

### 1.1 Home and first run

| Capability | Best in class: product and how | Design Studio status | P | Size |
|---|---|---|---|---|
| Prompt box on home | OD: one prompt box, project-type chips, keeps the draft when you change type [OD2] | has, `Home.tsx:PromptArea` | — | — |
| Project thumbnails | Figma: file cards show a live thumbnail [mem] | partial, `ProjectGrid.tsx:ProjectCard` (icon, time, swatches, no image) | P0 | M |
| Search, sort, filter projects | Paper: search across folders, multi-select, duplicate [A6] | partial, `Home.tsx:141` fixed sort, `:169` folder filter, no search | P1 | S |
| Rename, duplicate, delete project | Paper dashboard: duplicate and multi-select [A6]; Figma [mem] | missing, no API in `api.ts` | P0 | M |
| Templates or starter gallery | OD: "Start with a template" picker plus 5 visual directions [OD1, OD3]; Figma Community [mem] | missing, `src/server/templates` has only the scaffold | P1 | M |
| Import from URL (web clone) | OD: Web clone rebuilds a site from a URL [OD3]; pen.dev: built-in browser imports a page or one element as layers [P5] | missing | P1 | M |
| Import from screenshot | OD: drop a screenshot, OD writes DESIGN.md [OD1]; CD: screenshots as context [CD1] | partial, images attach only inside Studio `PromptBox.tsx:169,177` | P1 | S |
| Import from Figma | Paper: Cmd+V pastes Figma objects [A3]; pen.dev: .fig import [P5]; OD: "From Figma" chip [OD3] | missing | P2 | L |
| Import folder or Vite app | pen.dev: open a local .pen next to code [P4] | has, `FolderControls.tsx:OpenFolder`, `e2e/c-import-vite.spec.ts` | — | — |
| Drag-drop onto home | Paper and pen.dev: drop images on the canvas [A3, P5] | missing on home (`Home.tsx` has no drop handler) | P1 | S |
| Clarifying questions before the first build | CD: asks follow-up questions first [CD2]; OD: one-round question form, resumable [OD2] | missing | P1 | M |
| First-run onboarding | pen.dev: dashboard Cmd+N, autosave [P3] | partial, `desktop/first-run.ts` setup check, text-only empty state `ProjectGrid.tsx:71` | P1 | S |
| Sample project | Figma: sample files in drafts [mem] | missing | P2 | S |
| Keyboard use of the grid | Figma: F6 moves between regions [F1] | partial, cards are buttons; no arrow keys | P2 | S |
| Design system pick at start | OD: pick 1 of 5 directions or a brand [OD1] | has, `PackPicker` in `Home.tsx`, DESIGN.md field in `NewProjectAdvanced.tsx` | — | — |

### 1.2 Canvas

| Capability | Best in class: product and how | Design Studio status | P | Size |
|---|---|---|---|---|
| Ctrl-wheel and pinch zoom | pen.dev: Cmd+scroll, pinch, optional wheel-zooms setting [P1, P2] | has, `usePanZoom.ts:155`, iframe wheel forward `bridge.ts:262` | — | — |
| Zoom keys | Figma and pen.dev: Shift+1 fit, Shift+2 selection [F2, P1]; Cmd+0 100% in pen.dev [P1]; Shift+0 100% in Figma [mem] | partial: Cmd+0 = fit, Cmd+1 = 100% (reverse of Figma), no Shift+1/2, no bare +/- (`shared/contracts.ts:535`) | P0 | S |
| Menu zoom clash in desktop | — | bug risk: `desktop/menu.ts:105–107` registers resetZoom, zoomIn, zoomOut on the same keys as the canvas; untested | P0 | S |
| Zoom to selection | Figma, pen.dev: Shift+2 [F2, P1] | missing | P0 | S |
| Zoom % menu | Figma: type a %, presets 50/100/200 [F2] | has, `CanvasToolbar.tsx:ZoomControls`; empty "Fit" label bug `:184` | P2 | S |
| Z-click and drag-to-zoom region | pen.dev: hold Z, click or drag a region [P1] | missing | P2 | S |
| Pan | pen.dev: Space-drag, middle mouse, Shift+scroll sideways [P1] | has, `usePanZoom.ts:162,180,203` | — | — |
| Device sizes | pen.dev and Figma frame presets [mem] | has, `CanvasToolbar.tsx PRESETS` 1440/768/390/custom | — | — |
| Many frames on one canvas | CD: canvas of artboards, drag, resize, align [CD2]; Figma, Paper, pen.dev | partial: one artboard; variations in a separate grid `VariationsGrid.tsx:216` | P0 | L |
| Click select | all | has, V tool `Canvas.tsx:141`, `bridge.ts onClick` | — | — |
| Shift multi-select | Figma [mem] | partial, `bridge.ts:721` adds, but Inspector edits one element | P1 | M |
| Marquee select | pen.dev: Cmd+drag box-selects nested elements [P1] | missing | P2 | M |
| Select parent / children | Figma, pen.dev: Enter children, Shift+Enter parent, Tab sibling [P1, mem] | missing, bridge handles only Escape `bridge.ts:727` | P1 | S |
| Layers tree | Figma, pen.dev, Paper; CD: Cmd+\ panel with layer list [CD2] | missing | P0 | L |
| Hover outline | Figma; pen.dev color-codes components [P1] | has, `Canvas.tsx:234 .box.hover` | — | — |
| Distance measurement | Figma: select, hold Alt, hover = red line and px [F3] | missing | P1 | M |
| Rulers and guides | Figma: Shift+R [mem]; CD: layout guides Shift+G [CD2] | missing | P2 | M |
| Pixel grid | pen.dev: Cmd+' grid, Cmd+Shift+' snap [P1] | missing | P2 | S |
| Snapping | pen.dev: edges, centers, equal spacing [P6]; Paper: snap to whole px [A6] | missing (needs drag-move first) | P2 | M |
| Drag-move and resize elements | CD artboards [CD2]; Figma | missing, pointer events blocked `bridge.ts:792–799` | P1 | L |
| Minimap | — (no leader ships one) | missing | P2 | S |
| Frame thumbnails at low zoom | Paper: lighter memory, smoother pan in large files [A6] | missing | P2 | M |
| Pan performance | pen.dev: WebGL, "thousands of layers stay smooth" (vendor claim) [P6] | partial: transform-only, `pointer-events:none` while panning `canvas.css:239`; but `setOffset` re-renders React on each pointermove `usePanZoom.ts:215`, no `will-change` | P0 | S |

### 1.3 Chat and agent (benchmark: Claude Code)

| Capability | Best in class: product and how | Design Studio status | P | Size |
|---|---|---|---|---|
| Streaming text, markdown | CC: token stream, markdown, fences render mid-stream [CC1] | has, `runState.ts run.text.delta`, `deltaBatch.ts`, `ChatParts.tsx:AssistantText` | — | — |
| Thinking display | CC: collapsed, Ctrl+O shows it muted italic [CC1, CC9] | partial, bug: `runState.ts case 'run.thinking'` replaces earlier blocks | P0 | S |
| Run parts in true order | CC: transcript keeps text, thinking and tools in sequence [CC1] | bug: `ChatPanel.tsx:RunEntry` draws all thinking, then tools, then text | P0 | M |
| Tool-call rows | CC: one summary row per call, repeats grouped, Ctrl+O full input/output [CC1] | has, `ToolChips.tsx` spinner, duration, `GroupSummary` | — | — |
| File diffs in chat | CC desktop: `+12 -1` card, per-file diff, line comments, Cmd+Enter sends [CC7] | missing, `ToolDetail` shows path only | P0 | M |
| Permission prompts | CC: Yes / Yes don't ask again for `<rule>` / No, Tab adds a note; Shift+Tab cycles modes [CC4, CC1] | missing, `server/agent/permissions.ts:createCanUseTool` is policy-only | P1 | L |
| Interrupt | CC: Esc stops, keeps done work, sends queued next [CC1] | partial, Stop button `PromptBox.tsx:SendButton`; no Esc; Cmd+. desktop only (`desktop.ts:useDesktopCommand`) | P0 | S |
| Queued messages | CC: Enter while running queues; lands at next tool boundary; Up pulls it back [CC1]; Cursor: drag to reorder [CC10] | missing in composer (`PromptBox canSend`, server `lifecycle.ts:147 run_in_progress`); comments can queue `useComments.ts` | P0 | M |
| Steer mid-run | Cursor: "send now" at the next tool call [CC10]; OD: "Steer this turn" [OD3] | missing | P0 | M |
| Slash commands | CC: built-ins plus skills, fuzzy list, Tab completes [CC5, CC2] | partial, `/` opens `SkillPicker` only | P1 | M |
| @ mentions | CC: `@` fuzzy file menu, chips [CC6]; OD: tabs for files, skills, MCP [OD3] | partial, canvas selection as `SelectionChips`, no `@` | P1 | M |
| Image paste and drop | CC: `[Image #N]` chip at cursor [CC1] | has, `PromptBox.tsx onPaste/onDrop`, `AttachmentThumbs` | — | — |
| Plan mode | CC: read-only planning, approve then edit [CC4, CC7] | missing (closest: Critique mode `RunSettings.tsx MODE_LABEL`) | P1 | M |
| Todo list | CC: live checklist, Ctrl+T, survives resume [CC1] | missing | P1 | M |
| Resume and history | CC: `--continue`, `/resume` picker with search, `/rename` [CC5, CC11] | has, session ledger `lifecycle.ts`, runs per direction in `ChatPanel` | — | — |
| Session list with search and rename | CC: `/resume` search, `/rename` [CC5] | partial, runs listed per direction; no search, no rename | P2 | S |
| Rewind per message | CC: Esc Esc, restore code / chat / both, prompt back in input [CC3]; Cursor: preview checkpoint [CC10] | partial: versions undo/restore whole runs (`useUndoShortcut.ts`); no per-message, no code-only or chat-only | P1 | M |
| Cost, tokens, context meter | CC: `/usage`, `/context` grid, status line `context_window.used_percentage` [CC5, CC12] | partial, `RunFoot` cost, `RunDetails.tsx` tokens; no context meter | P1 | S |
| Model and effort picker | CC: `/model`, arrows set effort, Option+P [CC1] | partial, model in settings `SettingsFields.tsx`, `ModelTag`; no effort | P1 | S |
| Hooks | CC: 30+ events, PreToolUse can block [CC13] | partial, internal `PreToolUse` guard only `sdk-driver.ts:470` | P2 | M |
| Background tasks and subagents | CC: Ctrl+B, `/tasks`, `name(task)` rows [CC1, CC8] | missing (variation fan-out is the only parallel work) | P2 | L |
| Notify when done | CC: desktop notice when away [CC14] | partial, desktop only `desktop/native.ts:runFinished` | P2 | S |
| Copy message and code block | claude.ai and CC desktop [mem] | missing (`ai/components/ai/code-block.tsx`) | P0 | S |
| Retry and edit message | CC desktop: Edit and Retry; `/branch` fork [CC15, CC5] | missing | P1 | M |
| Error and auto-retry | CC: backoff on 429/529 [CC15]; OD: failure card keeps Retry [OD2] | partial, `ChatParts.tsx:RunError`, `UnfinishedBanner.tsx`; no visible retry count | P1 | S |
| Prompt history | CC: Up recalls, Ctrl+R searches [CC1] | missing, `storage.ts:useDraft` only | P1 | S |
| Keep draft on failed send | OD 0.25.0: composer restores text if send fails [OD2] | has, `PromptBox.tsx:send` clears the draft only on success | — | — |
| Prompt suggestion | CC desktop: ghost-text next prompt, Tab accepts [CC7] | missing | P2 | M |

### 1.4 Inspector and direct edits (benchmark: Figma)

| Capability | Best in class: product and how | Design Studio status | P | Size |
|---|---|---|---|---|
| Inline text edit on canvas | CD: Return on a text layer edits in place [CD2]; Figma | partial, panel textarea `Inspector.tsx:TextSection`; dblclick blocked `bridge.ts:797` | P0 | M |
| Box model | Paper: real CSS box model [A7] | has, `BoxModel.tsx` | — | — |
| Flex / auto layout | pen.dev: Shift+A adds flex; direction, gap, padding, align grid, hug/fill [P2] | partial, display and gap only (`contracts.ts:555`) | P0 | M |
| Size W/H, hug/fill | pen.dev: Hug, Fill [P2] | partial, W/H only | P1 | S |
| Color with tokens | Paper: oklch, P3, hex per element; selection-colors panel [A7, A6] | has, `InspectorFields.tsx:ColorField`, `TokenControl` | — | — |
| Typography | Figma [mem] | has (family, size, weight, line height, tracking, align) | — | — |
| Border and radius | Figma: per-corner radius [mem] | partial, single radius | P2 | S |
| Shadow and effects | pen.dev: blur, drop shadow, stacked [P7] | missing | P1 | M |
| Opacity | all | has | — | — |
| Scrub numeric inputs | Figma: drag label [mem] | has, `NumberField.tsx:useScrub` | — | — |
| Math in inputs | Figma: + − * / and brackets [mem] | missing, `cssValues.ts:normalizeLength` | P1 | S |
| Arrow step 1 / Shift 10 | Figma: configurable nudge [F9]; pen.dev same [P2] | has for fields `NumberField.tsx:43`; no element nudge | P2 | S |
| Mixed values in multi-select | Figma: "Mixed" [mem] | missing, empty state when >1 selected | P1 | M |
| Token binding | Figma variables on fields [F6] | has, `InspectorTokens.tsx:SnapToggle`, `e2e/token-snap.spec.ts` | — | — |
| Undo / redo of each direct edit | Figma: per-change undo stack [mem] | partial, undo is per version and needs ≥2 versions `useUndoShortcut.ts`; no redo | P0 | M |
| Copy CSS / code view | pen.dev: Cmd+Alt+C HTML [P1]; Paper: copy React CSS or Tailwind [A6]; Figma Dev Mode | missing | P1 | S |
| Element breadcrumb | Figma: ancestor path [mem] | missing, header shows tag and file:line `Inspector.tsx:66` | P1 | S |
| Align buttons | pen.dev: Option+W/A/S/D/H/V [P1] | missing | P2 | S |
| Other styles view | Paper: "Other styles" shows CSS agents add [A7] | missing | P2 | S |
| Edits without a model call | Lovable Visual Edits: no model call [L1] | has, direct edits write source | — | — |

### 1.5 Speed

No competitor publishes startup, open, fps or generation numbers [research, 2026-10-23]. OD has roadmap targets only (<500 ms daemon cold start) [OD4]. CD reviews report about 10 min for a codebase prototype and about 25 min for 3 variations [CD5, CD6]. The targets below are ours, set to beat what users report. They are not copies of a rival number.

Current gate: `e2e/latency.spec.ts` `TARGETS = { open: 2000, html: 250, react: 750, select: 100, http: 2000 }` (p95 over 20 samples).

| Capability | Best in class | Design Studio status | Target (p95) | P | Size |
|---|---|---|---|---|---|
| App cold start to Home usable | Paper: memory cut "nearly half" (no number) [A6] | missing measurement (no `app.start` telemetry kind; `app.ts:72` lists preview.latency, select.latency, studio.open, file.write) | < 1500 ms desktop, < 800 ms web | P0 | S |
| Open project to first preview paint | — | has gate: open < 2000 ms | < 1000 ms | P0 | M |
| Send to first token visible | CC: streams at once [CC1] | missing measurement | < 1500 ms mock agent; < 3 s real agent p50 | P0 | M |
| HTML write to preview paint | — | has gate: < 250 ms | < 150 ms | P1 | S |
| React write to HMR paint | — | has gate: < 750 ms | < 400 ms | P1 | M |
| Click to selection outline | — | has gate: < 100 ms | < 50 ms | P1 | S |
| Direct edit to source write and repaint | Lovable: no model call [L1] | missing measurement (`file.write` kind exists) | < 200 ms | P1 | S |
| Pan and zoom frame rate | pen.dev claim: smooth with thousands of layers [P6] | not measured | 60 fps, smooth (section 3 definition) over 3 s of pan | P0 | S |
| Streaming frame rate | — | not measured; finished messages re-parse markdown on each delta (`optimizations.md` rank 2) | no long task > 50 ms during a 10k-token stream | P0 | S |
| UI bundle | — | 711 kB JS in `dist/ui`, one chunk, `App.tsx:4` static import (`optimizations.md` 06.1) | Home chunk < 300 kB | P2 | S |
| Version list load | — | N+2 git spawns (`optimizations.md` 05.1) | < 300 ms at 100 versions | P2 | M |

### 1.6 Design systems and tokens

| Capability | Best in class: product and how | Design Studio status | P | Size |
|---|---|---|---|---|
| Pack library | OD: 151 DESIGN.md packs [OD1] | has, `DesignSystems.tsx`, `PackDetail.tsx` | — | — |
| Live token edit | pen.dev variables with theme columns [P8] | has, `TokensPanel.tsx`, `useTokenDraft.ts`, `tokenFrames.ts` | — | — |
| Light and dark modes | Figma: modes as columns, set per page or object [F6]; pen.dev: extra theme axes [P8] | has light/dark (`TokensPanel.tsx:16`); no preview mode switch on canvas, no extra axes | P1 | M |
| Extraction from URL, folder, images | CD: repo, deck, PDF, screenshots, Figma [CD3] | has (`NewDesignSystem.tsx`, `extract/url.ts`, `extract/folder.ts`) | — | — |
| Extraction from Figma or PDF | CD [CD3] | missing | P2 | L |
| Code-to-tokens | pen.dev: variables from globals.css via the agent [P8]; Paper: from code CSS variables via MCP [A2] | partial (tokens file import) | P2 | S |
| DESIGN.md | OD, CD | has, `DesignMdModal.tsx` | — | — |
| Token binding in inspector | Figma variables [F6] | has | — | — |
| Lint / check | OD Design Jury: 5 critics, score ≥ 8.0 [OD5] | has, `design-system/check.ts`, `RenderCheckPanel.tsx` | — | — |
| Lint in context (off-palette in the inspector) | — | partial, check runs per pack, not per selection | P1 | S |
| Component inventory | pen.dev: Cmd+Alt+K make component, instances, slots [P9]; Figma Shift+I quick insert [F10] | partial, kit page preview only `extract/kit-page.ts` | P1 | L |
| Pack export | — | has, `GET /api/packs/:id/export` | — | — |
| Token types | Paper: radius, container, breakpoint, line height [A2] | partial, `contracts.ts:634 TokenType` has color, dimension, fontFamily, fontWeight, number, shadow, duration; no breakpoint | P2 | S |

### 1.7 Versions, variations, comments and collaboration

| Capability | Best in class: product and how | Design Studio status | P | Size |
|---|---|---|---|---|
| Version history | Figma: checkpoint each 30 min, named versions [F4]; CD: none per guide, "Save publishes a version" per a review [unverified, CD2, CD8]; OD: per-file versions with prompt [OD3] | has, shadow git, `VersionsPanel.tsx` | — | — |
| Version thumbnails | Figma [mem] | missing | P1 | M |
| Rename / name a version | Figma: name and describe [F4] | partial, generated titles `versionLabels.ts` | P1 | S |
| Compare | Figma branch review [F11] | partial, side by side `CompareView.tsx`; no slider, no pixel diff overlay | P1 | M |
| Restore, branch | Figma branch and merge [F11] | has, `VersionRow` Restore and Branch, `useFork` | — | — |
| Variations | CD: ask for 2–3 layouts [CD2] | has, `VariationsGrid.tsx`, fan-out | — | — |
| Mix parts across variations | CD: "mix parts" [review only] | has, `UseInMenu` → `/variations/mix` | — | — |
| Variations on the main canvas | CD: many options become a pan-around canvas [unverified] | missing (separate grid) | P1 | M |
| Pinned comments with a queue | CD: send now or save [CD7] | has, `CommentLayer.tsx`, `useComments.ts` | — | — |
| Replies and threads | Paper: C, resolve, search, filter, sort [A6] | partial, statuses only | P2 | M |
| Freehand draw as feedback | OD: Draw mode [OD3]; CD standalone had drawing [CD7] | missing | P1 | M |
| Share link (view / comment) | OD 0.26: public link, reviewer comments sync back [OD2]; CD: view/comment/edit links [CD1] | missing | P2 | L |
| Multiplayer | Paper: cursors, follow, cursor chat [A6]; Figma | missing (local single-user app; out of scope) | P2 | L |

### 1.8 Keyboard, command palette, menus and native feel

| Capability | Best in class: product and how | Design Studio status | P | Size |
|---|---|---|---|---|
| Command palette | Figma: Cmd+K actions menu with AI tools [F10, F13] | missing | P0 | M |
| Shortcut sheet | Figma: Ctrl+Shift+? docked panel, highlights used keys, live [F1]; pen.dev: ? [P1] | missing | P0 | S |
| Tooltips with keys | Figma [mem] | partial, 25 `data-tip`, 85 `title=`; keys on Send, Skills, comment only | P1 | S |
| Context menus | Figma, pen.dev [mem]; Paper: Cmd+right-click lists layers under cursor [A6] | missing (no `onContextMenu`, bridge blocks it) | P1 | M |
| Native menus | Figma desktop [mem] | has, `desktop/menu.ts` (File, Edit, Run, View, dock recents) | — | — |
| Menus cover all commands | — | partial: no View → Zoom to Fit / Selection, no Go menu, no Window menu items for panels | P1 | S |
| Region focus keys | Figma and CD: F6 moves between areas [F1, CD2] | missing | P1 | S |
| Window state restore | — | has, `desktop/window-state.ts` | — | — |
| Tabs / many projects open | Paper desktop tabs, agents in background tabs [A6]; pen.dev Cmd+T agent tab [P1] | missing | P2 | L |
| Drag folder from Finder into window | — | partial, dock `open-file` only `desktop/native.ts:52` | P1 | S |
| Dock badge | — | missing | P2 | S |
| Title bar | — | has, `hiddenInset` `desktop/window.ts:16` | — | — |
| Stop works in web too | CC: Esc [CC1] | partial, Cmd+. desktop only (taken in R3-2) | P0 | S |
| Rebindable keys | CC: keybindings file [CC14] | missing | P2 | M |

### 1.9 Motion, typography, dark mode and accessibility

| Capability | Best in class: product and how | Design Studio status | P | Size |
|---|---|---|---|---|
| App dark theme (light / dark / system) | Figma UI3 [mem]; pen.dev Light/Dark [P2] | missing, `tokens.css:74` `color-scheme: light`; unused `dark` variant `ai.css:12` | P0 | L |
| Motion tokens | — | partial, `--dur` 160 ms, `--dur-slow` 220 ms, one `--ease`; literals in `versions.css:143`, `controls.css:172` | P1 | S |
| Reduced motion | pen.dev: turn off animations [P2]; Paper: reduce agent animations [A6] | has, `tokens.css:258` global rule | — | — |
| Type scale | — | has, `--t-xs` 12 … `--t-2xl` 28; strays `packs.css:163,203`, `library.css:120` | P1 | S |
| Spacing scale | — | has `--s-*`; about 132 raw px vs 228 token uses (canvas.css, inspector.css worst) | P1 | M |
| Raw colors | — | 35 raw `oklch()` in 13 CSS files, `#fff` at `variations.css:322`, 2 hex in TSX | P0 | S |
| Focus rings | Figma keyboard canvas [F1] | has, `tokens.css:147` `:focus-visible`, `--ring` | — | — |
| Icon button labels | — | has, 42/42 `icon-btn` with `aria-label` | — | — |
| Live regions | — | partial, 5 `aria-live`; streaming text not announced in steps | P1 | S |
| Skeletons | — | partial, home and packs; none in chat or versions | P1 | S |
| Contrast check of the app UI | — | not measured | P1 | S |
| Keyboard-only full flow | Figma: place objects by keyboard [F1] | not measured | P1 | M |

### 1.10 Export and handoff

| Capability | Best in class: product and how | Design Studio status | P | Size |
|---|---|---|---|---|
| Zip of sources | CD: zip [CD2] | has, `VersionRow.tsx:156`, `git archive` | — | — |
| Single-file HTML | CD: standalone HTML [CD2]; OD [OD3] | partial, source files in zip only | P0 | S |
| PNG export (1x/2x/3x) | pen.dev: PNG/JPEG/WEBP 1–3x, zip of many [P5]; Paper: WebP, AVIF [A6] | missing (renderer exists for checks) | P0 | S |
| PDF export | CD: PDF; Paper: frames into one PDF [A6]; pen.dev: one page per layer [P5] | missing | P1 | S |
| SVG export | Figma [mem] | missing | P2 | M |
| Copy as code | pen.dev: HTML+CSS or Tailwind in one click [P11]; Paper: React CSS / Tailwind [A6] | missing | P1 | S |
| Built React bundle | — | partial, sources only | P2 | S |
| Handoff bundle for a coding agent | CD: bundle with intent and decisions to Claude Code [CD1, CD2]; OD: "Open in which editor?" + copy prompt [OD3] | missing | P0 | M |
| Open project in editor | OD [OD3] | partial, packs only `api.openPackEditor`; Reveal in Finder for projects | P1 | S |
| Deploy | OD: Vercel, Cloudflare Pages, custom domain [OD3]; CD: send to Vercel/Netlify [CD2] | missing | P2 | M |
| PPTX / slides | CD: PPTX, Google Slides [CD2]; OD: editable PPTX [OD3] | missing | P2 | L |
| MP4 | OD 0.25 [OD2]; Figma Motion [F7] | missing | P2 | L |
| MCP server for other agents | Figma: mcp.figma.com [F5]; Paper: one-click setup for 7 clients [A3] | missing | P1 | L |

---

## 2. Feature gaps

Every row marked missing or partial in the scorecard is here, with the round that takes it. "R3-2" means round 3, item 2; that item holds the acceptance check. Deferred rows have their own check and a reason.

| Feature | Area | Best product | P | Size | Round | Check (deferred rows) | Why it matters |
|---|---|---|---|---|---|---|---|
| Project thumbnails | Home | Figma | P0 | M | R1-1 | — | Users find a design by its look, not by an icon |
| Rename, duplicate, delete project | Home | Paper | P0 | M | R1-2 | — | Without it, old tests stay on Home for ever |
| Starter gallery | Home | OD, Figma | P1 | M | R1-3 | — | First run needs a good result in 1 click |
| Clarifying questions | Home | CD, OD | P1 | M | R1-3 | — | A vague prompt wastes a long run |
| Drop or paste screenshot or URL on home | Home | OD, pen.dev | P1 | S–M | R1-4 | — | Many briefs start from a screenshot or a site |
| Search and sort projects | Home | Paper | P1 | S | R1-5 | — | Needed past about 20 projects |
| First-run onboarding | Home | pen.dev | P1 | S | R1-6 | — | The text-only empty state shows no next step |
| Sample project | Home | Figma | P2 | S | R1-7 | — | A new user can try edits with no run cost |
| Grid arrow keys | Home | Figma | P2 | S | R1-8 | — | Keyboard users |
| Import from Figma | Home | Paper, pen.dev | P2 | L | defer | Paste a Figma frame; the preview shows it as HTML within 2% pixel diff of a Figma PNG export | Needs a Figma token and node mapping; low use for a local tool now |
| Zoom keys like Figma, plus menu clash fix | Canvas | Figma, pen.dev | P0 | S | R2-1 | — | Users of every rival expect these keys; the clash can break zoom in desktop |
| Pan with no React re-render | Canvas | pen.dev | P0 | S | R2-2 | — | Smooth pan |
| Multi-frame canvas | Canvas | CD, Figma | P0 | L | R2-3 (frames, free place), R7-3 (variations and compare as frames) | — | All rivals show many screens at once |
| Layers tree | Canvas | all | P0 | L | R2-4 (read-only, select, hover), R4-4 (rename, hide, reorder) | — | Nested and hidden elements cannot be selected without it |
| Zoom to selection | Canvas | Figma | P0 | S | R2-1 | — | Core navigation |
| Select parent / children keys | Canvas | Figma | P1 | S | R2-5 | — | Fast nested select |
| Distance measurement | Canvas | Figma | P1 | M | R2-6 | — | Check spacing with no code |
| Drag resize | Canvas | CD, Figma | P1 | L | R4-4 | — | Direct control of size |
| Free drag-move of elements | Canvas | CD, Figma | P2 | L | defer | Drag an absolute element 40 px; `left` in the source changes by 40 px | Most generated layouts are flow layouts; reorder (R4-4) covers the common case |
| Z-click zoom | Canvas | pen.dev | P2 | S | R2-7 | — | Small speed gain |
| Marquee select | Canvas | pen.dev | P2 | M | defer | Drag a box over 3 cards; all 3 are selected | Low value in flow layouts |
| Rulers and guides | Canvas | Figma, CD | P2 | M | defer | Shift+R shows rulers; drag from a ruler makes a guide that survives reload | Measurement (R2-6) gives most of the value |
| Pixel grid and snapping | Canvas | pen.dev, Paper | P2 | M | defer | At 800% a 1 px grid shows; a resize snaps to whole px | Needs free drag first |
| Minimap, low-zoom frame thumbnails | Canvas | Paper | P2 | S–M | defer | At 10% zoom with 20 frames, pan stays smooth (definition in section 3) | Only matters with many frames |
| Thinking kept in full | Chat | CC | P0 | S | R3-1 | — | Bug: only the last thinking block stays |
| Run parts in true order | Chat | CC | P0 | M | R3-1 | — | Bug: the transcript shows a wrong order of events |
| Esc interrupt in web and desktop | Chat | CC | P0 | S | R3-2 | — | The first thing a CC user tries |
| Queue and steer while running | Chat | CC, Cursor, OD | P0 | M | R3-2 | — | The composer is locked during long runs |
| File diffs in chat | Chat | CC desktop | P0 | M | R3-3 | — | Users must see what the agent changed |
| Copy message and code | Chat | claude.ai | P0 | S | R3-4 | — | Basic |
| Permission prompts | Chat | CC | P1 | L | R3-5 (allow once, deny with note), R8-5 (always-rules, mode cycle) | — | Safe Bash; CC parity |
| @ mentions | Chat | CC, OD | P1 | M | R3-6 | — | Exact context for the agent |
| Todo list | Chat | CC | P1 | M | R3-7 | — | Long runs need visible progress |
| Plan mode | Chat | CC | P1 | M | R3-8 | — | Review the plan before a long run |
| Context meter, effort picker | Chat | CC | P1 | S | R3-9 | — | Control of cost and quality |
| Prompt history, auto-retry line, retry button | Chat | CC | P1 | S | R3-10 | — | Speed for heavy users; a silent wait looks like a hang |
| Slash commands | Chat | CC | P1 | M | R8-3 (one command registry with the palette) | — | Fast access to modes, skills and export |
| Rewind per message, edit as fork | Chat | CC, Cursor | P1 | M | R7-4 | — | Undo one turn, not the whole run |
| Session search and rename | Chat | CC | P2 | S | R7-7 | — | Find old runs |
| Notify when done (web) | Chat | CC | P2 | S | R8-8 | — | Web parity with desktop |
| Hooks for users | Chat | CC | P2 | M | defer | A user hook on PreToolUse that exits 2 blocks the tool and its reason shows in the transcript | The studio sets its own guards; few users need this |
| Background tasks and subagent display | Chat | CC | P2 | L | defer | A backgrounded tool shows in a tasks list with elapsed time and Stop | The studio agent seldom runs long shell work |
| Prompt suggestion | Chat | CC desktop | P2 | M | defer | After a run, a gray next prompt shows; Tab accepts it | Nice to have |
| Inline text edit | Inspector | CD, Figma | P0 | M | R4-1 | — | The most common edit |
| Flex controls, hug / fill | Inspector | pen.dev | P0 | M | R4-2 | — | Layout is about half of all edits |
| Per-change undo and redo | Inspector | Figma | P0 | M | R4-3 | — | Users try edits only when undo is safe |
| Shadow and effects | Inspector | pen.dev | P1 | M | R4-5 | — | Depth is a common polish edit |
| Math in inputs | Inspector | Figma | P1 | S | R4-6 | — | Speed for pro users |
| Mixed values in multi-select | Inspector | Figma | P1 | M | R4-7 | — | Change 5 cards at once |
| Breadcrumb and Copy CSS | Inspector | Figma, pen.dev | P1 | S | R4-8 | — | Nested navigation and handoff |
| Per-corner radius, align buttons, other styles, reorder nudge | Inspector | Figma, pen.dev, Paper | P2 | S | R4-9 | — | Completeness |
| Startup and first-token telemetry | Speed | — | P0 | S | R5-1 | — | We cannot improve what we do not measure |
| Tighter latency gates | Speed | — | P0 | M | R5-2 | — | Proof of "faster" |
| Smoothness gates | Speed | — | P0 | S | R5-3 | — | Proof of "smooth" |
| Known perf fixes | Speed | — | P0 | M | R5-4 | — | Evidence already in `optimizations.md` |
| Optimistic Send | Speed | CC | P1 | S | R5-5 | — | The app must react at once |
| Lazy Studio chunk, one git call for history | Speed | — | P2 | S–M | R5-6, R5-7 | — | Start time and panel load |
| Mode preview on canvas | Design systems | Figma | P1 | M | R6-1 | — | Check both themes in one click |
| Component inventory | Design systems | pen.dev, Figma | P1 | L | R6-2 (read-only list, `@` insert); instance editing deferred | Instance editing: change a `Button` source; every use updates and the inventory thumbnail changes | Agents and users reuse parts |
| Lint in the inspector | Design systems | — | P1 | S | R6-3 | — | Catch off-palette edits where they happen |
| Import from `globals.css`, breakpoint tokens | Design systems | pen.dev, Paper | P2 | S | R6-4 | — | Completeness |
| Extraction from Figma or PDF | Design systems | CD | P2 | L | defer | Give a 10-page brand PDF; a pack with its colors and fonts appears | Same reason as Figma import |
| Version thumbnails and names | Versions | Figma | P1 | M | R7-1 | — | Find the right version fast |
| Compare slider and diff overlay | Versions | Figma | P1 | M | R7-2 | — | The server already makes a pixel diff |
| Freehand draw as feedback | Comments | OD, CD | P1 | M | R7-5 | — | Faster than words for layout notes |
| Comment replies | Comments | Paper | P2 | M | R7-6 | — | Threads |
| Share link | Collaboration | OD, CD | P2 | L | defer | Make a link; a signed-out browser shows the preview; a reviewer comment shows in the queue | Local-first app; needs hosting |
| Multiplayer | Collaboration | Paper, Figma | P2 | L | defer | Two clients see each other's cursors within 100 ms | Single-user app now |
| Command palette | Keyboard | Figma | P0 | M | R8-1 | — | One place for every action |
| Shortcut sheet | Keyboard | Figma | P0 | S | R8-2 | — | Users find features through keys |
| Context menus | Keyboard | Figma | P1 | M | R8-4 | — | Desktop feel |
| Full menus, F6 regions, Finder drop, key hints | Keyboard | Figma, CD | P1 | S | R8-6, R8-7 | — | Native feel |
| Dock badge | Keyboard | — | P2 | S | R8-8 | — | Know a run is done with the window hidden |
| Project tabs | Keyboard | Paper | P2 | L | defer | Open 2 projects in tabs; a run in tab 1 goes on while tab 2 is in use | Needs one server session per tab |
| Rebindable keys | Keyboard | CC | P2 | M | defer | Change Shift+1 to F in a keymap file; the sheet and palette show F | The keymap file from R8-2 makes this easy later |
| App dark theme | A11y | Figma | P0 | L | R9-1 (R1–R8 use tokens only, so R9 changes values) | — | Pros work in dark rooms; every rival has it |
| Token sweep | A11y | — | P0 | S | R9-2 | — | Needed for dark theme |
| Motion system | A11y | — | P1 | S | R9-3 | — | Same timing everywhere |
| Live regions, skeletons, keyboard-only flow | A11y | — | P1 | S–M | R9-4, R9-5, R9-6 | — | Access and a calm app |
| Single-file HTML, PNG export | Export | CD, pen.dev | P0 | S | R10-1 | — | Share a design without the app |
| Handoff bundle | Export | CD, OD | P0 | M | R10-2 | — | The path from design to product |
| PDF, copy as code | Export | CD, pen.dev, Paper | P1 | S | R10-3 | — | Common handoff formats |
| MCP server | Export | Figma, Paper | P1 | L | R10-4 (read-only tools); write tools deferred | Write tools: a `set_text` call from Claude Code changes the source and the preview | Lets Claude Code and other agents use the studio |
| Open project in editor | Export | OD | P1 | S | R10-5 | — | One step from design to code |
| Built React bundle | Export | — | P2 | S | R10-7 | — | Deploy without a build step |
| SVG export | Export | Figma | P2 | M | defer | Export a frame as SVG; it opens in a browser within 2% pixel diff | HTML and PNG cover most uses |
| Deploy | Export | OD, CD | P2 | M | defer | Deploy to Vercel with a token; the URL serves the head version | Handoff and zip cover the need now |
| PPTX and slides | Export | CD, OD | P2 | L | defer | A 5-slide deck exports to a PPTX that opens in Keynote with 5 slides | Deck mode does not exist yet |
| MP4 | Export | OD, Figma | P2 | L | defer | A 5 s prototype exports to an MP4 of 5 s ± 0.1 s | Low demand for UI design |

---

## 3. The 10 rounds

Rules for every round:
- **Features** come first: the P0 and P1 items from section 2. **Polish** comes next: P2 items and quality work on what already exists.
- The target is 2–4 features per round. R1, R2, R3 and R4 are over the target, because those areas have the most gaps. Split them into two PRs if needed (features 1–4, then the rest).
- Each item has one acceptance check. When an item has more than one part, the check covers each part. "Mock agent" means the e2e mock agent.
- **Smooth** means: during the action, p95 frame time ≤ 16.7 ms and no frame > 32 ms, from a Playwright performance trace on the dev machine.
- **Key checks** run twice: with focus in the studio UI, and with focus inside the preview iframe (the bridge now forwards only Escape, `bridge.ts:727`).
- A round is done when every check passes, `npm run typecheck`, `npm test` and `npm run e2e` pass, and the premium-feel checklist passes on the touched screens.
- Use tokens only (no raw colors or px sizes). Then R9 (dark theme) changes token values only.

### Round 1 — Home and first run

Features:
1. **Project thumbnails (P0, M).** Save a screenshot of the head version after each finished run; show it on the card. Check: after a mock run ends, the card shows an `<img>` of the new version within 2 s; the image changes after a second run.
2. **Rename, duplicate, delete project (P0, M).** Card menu (button and right-click) plus API. Delete moves the project to a trash folder; it does not erase it. Check: a rename shows after reload; a duplicate opens with the same head version; delete removes the card and Undo in the toast brings it back.
3. **Starter gallery and clarifying questions (P1, M + M).** 6 starters (landing, dashboard, mobile app, deck, form, docs) with a thumbnail each. On a prompt under 12 words, the agent asks up to 3 questions in a form before it builds. Check: a starter opens a project with a preview in < 2 s and no model call; a 5-word prompt with the mock agent shows the question form before any file write.
4. **Drop or paste a screenshot or URL on home (P1, S + M).** Drop an image on the home prompt to attach it. Paste a URL to get a "Use as reference" chip. Check: a dropped PNG shows a thumbnail chip in < 200 ms; a pasted `https://example.com` shows the chip, and the run prompt holds the captured page.
5. **Search and sort (P1, S).** Search box and a sort menu (Recent, Name, Created). Check: 3 letters filter 50 projects in < 50 ms; `/` focuses search.
6. **First-run panel (P1, S).** 3 steps: pick a starter, try a direct edit, make a version. Check: a fresh data folder shows the panel; after Close it does not show again.

Polish:
7. Sample project in a fresh data folder (P2). Check: it opens with a preview and 2 versions, with no model call.
8. Arrow-key focus across the grid, Enter opens (P2). Check: with keys only, open the third project in 4 key presses.

### Round 2 — Canvas

Features:
1. **Zoom keys like Figma, and the menu clash (P0, S).** Shift+1 fit, Shift+2 selection, Shift+0 100%, bare + and − zoom, Cmd+0 100%. Remove the Electron zoom roles from `desktop/menu.ts`, or send them to the canvas. Check: in the desktop build, Cmd+0, Cmd+= and Cmd+− change the canvas zoom value and `webContents.getZoomFactor()` stays 1; Shift+1 fits within 1 frame (16.7 ms) of the key event; both with focus in the iframe.
2. **Pan with no React re-render (P0, S).** Write the transform to the artboard style in a rAF; commit state on pointerup. Add `will-change: transform` only while panning. Check: React Profiler shows 0 commits of `Canvas` during a 3 s pan, and the pan is smooth.
3. **Multi-frame canvas, part 1 (P0, L).** One infinite canvas with many frames. Each device size or page is a frame you can place and resize, with a name label. Check: add 3 frames (1440, 768, 390), drag one, reload; all 3 keep their place; Shift+1 fits all 3.
4. **Layers tree, part 1 (P0, L).** Read-only tree of the selected frame. Hover a row = hover outline, click = select, arrows move. Check: a row click selects the same element in the preview in < 50 ms; on a 1,000-node page the tree opens in < 150 ms (virtual list).
5. **Select parent, children, sibling (P1, S).** Enter children, Shift+Enter parent, Tab next sibling, in the tree and in the preview. Check: from a section, 3 key presses reach a nested button, with focus in the iframe.
6. **Distance measurement (P1, M).** With an element selected, hold Alt and hover another: red lines and px labels. Check: the labels match `getBoundingClientRect` within 1 px.

Polish:
7. Z-click zoom (P2). Check: Z+click zooms 2× around the cursor; Z+Alt+click zooms out.
8. Zoom menu label (`CanvasToolbar.tsx:184`) and `navigator.platform` (`CanvasToolbar.tsx:166`). Check: the menu never shows an empty label; no deprecated API warning in the console.

### Round 3 — Chat and agent (vs Claude Code)

Features:
1. **Correct transcript (P0, S + M).** Append thinking blocks; draw run parts in event order (text, thinking and tools mixed). Check: a mock run that emits thinking A, tool 1, thinking B, text shows that exact order and both thinking blocks.
2. **Esc interrupt, queue and steer (P0, M).** Esc stops in web and desktop; partial output stays, marked "Stopped". Enter while running queues a message (gray, with edit, remove, drag to reorder). The server sends queued messages at the next tool boundary. Cmd+Enter while running = "Send now" (steer). Check: a message queued during a 3-tool mock run reaches the agent before tool 3; Esc stops the stream in < 500 ms and finished tool rows stay; both with focus in the iframe.
3. **Diffs in chat (P0, M).** Each write or edit tool row has a `+N −M` badge and opens to a red and green diff. The run card totals the changes per file. Check: a mock one-line edit shows `+1 −1` with the exact old and new line.
4. **Copy (P0, S).** Copy on each message and each code block. Check: Copy puts the exact markdown (or code) on the clipboard.
5. **Permission prompts, part 1 (P1, L).** For Bash and writes outside the project: Allow once, or Deny with an optional note. Policy rules stay the default for everything else. Check: a mock Bash call shows the prompt; Deny with the note "use npm" sends the note to the agent and no command runs.
6. **@ mentions (P1, M).** `@` lists files, layers and tokens with fuzzy match; the pick becomes a removable chip. Check: the list opens in < 100 ms; `@hdr` ranks `Header.tsx` first; the chip's content is in the sent prompt.
7. **Todo list (P1, M).** A checklist pinned above the composer, fed by the agent's todo writes, "N of M", current item marked. Check: a mock todo write changes "1 of 5" to "2 of 5" in place with no re-render of finished messages, and the list is there after reload.
8. **Plan mode (P1, M).** Write tools are blocked; the run ends with a plan card: Approve, Approve and accept edits, Keep planning. Check: in plan mode a mock write tool is refused; Approve switches mode and starts the build.
9. **Context meter and effort picker (P1, S).** Both in the composer row. Check: the meter equals the run's input tokens divided by the model window, ±1%; the effort choice is in the next request.
10. **Prompt history and retries (P1, S).** Up on an empty composer recalls the last prompt; Ctrl+R searches past prompts. A retry line shows "Retrying in Ns (k/5)"; the error card has Retry. Check: Up fills the last prompt; Retry does not add a second user message.

Polish:
11. Tool rows: same verb and target format for every tool (`toolLabels.ts`), errors open by default, repeats grouped as "N calls". Check: a mock run with 3 reads of the same file shows one row "Read ×3".
12. Streaming is smooth (definition above) during a 10k-token mock reply; an open code fence renders as code while it streams. Check: Playwright trace passes; a snapshot mid-stream shows a `<pre>`.

### Round 4 — Inspector and direct edits (vs Figma)

Features:
1. **Inline text edit on canvas (P0, M).** Double-click or Enter on a text element edits it in place; Esc cancels; Cmd+Enter or blur writes the source. Check: an `h1` edited in the preview is in the source file in < 200 ms, with no model call.
2. **Flex controls (P0, M).** Direction, wrap, justify, align (3×3 grid), gap, and hug / fill / fixed for W and H. Shift+A adds flex. Check: row → column on a card list writes `flex-direction: column` and the preview repaints in < 250 ms; Fill writes `flex: 1` (or `width: 100%` outside flex).
3. **Per-change undo and redo (P0, M).** One stack per project for direct edits and token edits; Cmd+Z and Shift+Cmd+Z, also from the desktop Edit menu. Check: after 3 edits and 3 Cmd+Z, the file bytes equal the start; Shift+Cmd+Z 3 times applies all 3 again.
4. **Layers tree, part 2, and resize handles (P1, L).** Rename (writes `data-name`), hide, reorder flex children by drag or Alt+arrow; W and H drag handles on the selection. Check: a 40 px handle drag changes the width field and the file by 40 px; Alt+Down moves a card one place down in the source.
5. **Shadow and effects (P1, M).** A list of shadows (x, y, blur, spread, color token) and blur. Check: an added shadow writes one `box-shadow` that reads back into the same fields.
6. **Math in inputs (P1, S).** `16*2`, `100/3`, `+8` (adds to the current value). Check: `12+4` writes `16px`; `+8` on 16 writes `24px`.
7. **Mixed values in multi-select (P1, M).** Check: 3 cards with 2 radii show "Mixed"; setting 8 writes `8px` to all 3.
8. **Breadcrumb and Copy CSS (P1, S).** Check: the breadcrumb lists each ancestor and a click selects it; Copy CSS gives the authored rules of the element.

Polish:
9. Per-corner radius, align buttons, "Other styles" (authored CSS the panel does not cover), and Alt+arrow reorder on the canvas (P2). Check: per-corner values write `border-radius: a b c d`; the align-center button writes `align-self: center`; an element with `filter: blur(2px)` lists it under Other styles.
10. Raw px in `inspector.css` to `--s-*`; field heights 28 px; labels on one baseline. Check: 0 raw padding, margin or gap px in `inspector.css`.

### Round 5 — Speed

No rival publishes numbers, so these targets are ours.

Features:
1. **Measure what matters (P0, S).** New telemetry kinds `app.start`, `run.first_token`, `edit.commit`, `frame.long`, shown in `LatencyBreakdown.tsx`. Check: each kind has at least one sample after one mock run and one direct edit.
2. **Tighter gates in `e2e/latency.spec.ts` (P0, M).** Old → new p95: open 2000 → 1000 ms; html 250 → 150 ms; react 750 → 400 ms; select 100 → 50 ms. New: first token < 1500 ms (mock agent); direct edit < 200 ms. Check: the spec passes 3 times in a row on the dev machine.
3. **Smoothness gates (P0, S).** Playwright traces for a 3 s pan, a 3 s zoom and a 10k-token mock stream. Check: all three are smooth; no long task > 50 ms during the stream.
4. **Known perf fixes (P0, M).** `optimizations.md` ranks 1 (one SSE connection per project), 2 (memo finished messages), 5 (coalesce text deltas) and 6 (start the model during baseline capture). Check: the gates above pass; the network panel shows one EventSource per project.
5. **Optimistic Send (P1, S).** The user message and a "Starting…" row show at once. Check: the user message is visible < 50 ms after Cmd+Enter.

Polish:
6. Lazy-load Studio (`App.tsx:4`, `optimizations.md` 06.1) (P2). Check: Home JS < 300 kB (now 711 kB in one chunk); Home usable < 800 ms in web.
7. One git process for history files (`optimizations.md` 05.1) (P2). Check: the versions panel loads in < 300 ms with 100 versions.

### Round 6 — Design systems and tokens

Features:
1. **Mode preview on canvas (P1, M).** A light/dark switch in the canvas toolbar flips the token mode of every frame with no rebuild. Check: all frames repaint in < 100 ms; the source does not change.
2. **Component inventory, part 1 (P1, L).** A Components tab lists components from the pack kit page and the project source (React components, repeated HTML patterns), each with a live thumbnail. A click adds an `@` mention. Check: a project with `Button` and `Card` lists both with thumbnails; a click adds `@Button` to the composer.
3. **Lint in the inspector (P1, S).** An off-palette color, a raw size where a token exists, or a font outside `--font-*` shows a warning with "Use token". Check: `#ff0001` on a token-colored element names the nearest token (ΔE) and one click writes `var(--token)`.

Polish:
4. Import from `globals.css`; add a breakpoint token type (P2). Check: a `globals.css` with 10 custom properties gives 10 tokens of the right types.
5. Pack cards show light and dark swatches side by side. Check: every built-in pack card shows both.
6. DESIGN.md editor: outline, live preview, guard for unsaved changes. Check: Close with changes asks to save.

### Round 7 — Versions, variations and comments

Features:
1. **Version thumbnails and names (P1, M).** Use the R1 screenshot for each version; double-click a title to rename. Check: each row shows a thumbnail; a new name is there after reload.
2. **Compare slider and diff overlay (P1, M).** In CompareView: side by side, a drag slider, and an overlay from the server pixel diff. Check: the overlay marks a changed button and nothing else.
3. **Multi-frame canvas, part 2 (P1, M).** Variations and compare open as frames on the main canvas, not in a separate grid. Check: a 3-variation mock run places 3 frames; "Keep this one" removes the other 2.
4. **Rewind per message, edit as fork (P1, M).** Each user message maps to the version it made. Hover → "Restore code here" and "Edit and resend" (forks a direction from that version). Check: restore at message 2 of 4 makes the files equal version 2; the edited prompt starts a new direction and the old one stays.
5. **Freehand draw (P1, M).** A pen tool on the preview; strokes go to the agent as an image with the comment. Check: a stroke plus a comment sends one attachment that shows the stroke.

Polish:
6. Comment replies, resolve, "Show resolved" filter (P2). Check: a reply shows under its comment; the filter hides and shows resolved comments.
7. Search and rename in the run history (P2). Check: search finds a run by a word in its prompt; a rename is there after reload.

### Round 8 — Keyboard, command palette, menus and native feel

Features:
1. **Command palette (P0, M).** Cmd+K lists every action (navigation, run, level, export, zoom, panels, settings, recent projects) with fuzzy search and the key on each row. Check: opens in < 50 ms, with focus in the iframe too; "zo fi" ranks "Zoom to fit" first; Enter runs it.
2. **Shortcut sheet and one keymap (P0, S).** Ctrl+Shift+? (and `?` outside text fields) opens a docked panel that marks keys as you press them. One keymap file feeds the sheet, the palette, tooltips and menus. Check: every keymap entry shows in the sheet; a test fails if a handler binds a key that is not in the keymap.
3. **Slash commands (P1, M).** `/` in the composer uses the palette registry: built-ins (`/plan`, `/level`, `/variations`, `/export`, `/compact`, `/model`) plus skills, with a source badge; Tab completes. Check: the list opens in < 50 ms; `/exp` + Tab gives `/export`.
4. **Context menus (P1, M).** Right-click on a preview element (select parent, copy CSS, comment, ask the agent), a project card, a version row, a chat message. Native menus in desktop. Check: right-click on a preview element opens a menu at the cursor in < 50 ms with 4 or more items.
5. **Permission prompts, part 2 (P1, M).** "Always allow `<rule>`" shows the exact rule; a rules list in Settings with Remove; Shift+Tab cycles modes (Ask, Accept edits, Plan). Check: an always-rule skips the prompt on the next call and shows in Settings; Remove brings the prompt back.
6. **Full native menus and F6 (P1, S).** View (Zoom to Fit, Selection, 100%, panels), Go (Home, next and previous direction), Window. F6 moves focus between toolbar, canvas, inspector and chat. Check: each menu item runs the same action as its key; 4 presses of F6 visit 4 regions and come back.
7. **Finder drop and key hints (P1, S).** Drop a folder on the window to import it. Every icon-button tooltip shows its key. Check: a dropped Vite folder opens the import dialog; a test that lists icon buttons with a keymap entry and no key in the tooltip finds none.

Polish:
8. Dock badge and web notification when a run ends with the window hidden (P2). Check: with the window hidden, a mock run end sets the dock badge to 1 and the badge clears on focus; in web, with the tab hidden and permission granted, one `Notification` fires.

### Round 9 — Motion, typography, dark mode and accessibility

Features:
1. **App dark theme (P0, L).** Light, Dark and System in Settings and the palette. All colors come from semantic tokens; `.dark` values in `tokens.css`; `color-scheme` follows the theme. Check: in both themes, every screen (Home, Studio, Design systems, Settings, dialogs) has 0 axe color-contrast violations, and a screenshot test per screen passes.
2. **Token sweep (P0, S).** Move the 35 raw `oklch()`, `#fff` (`variations.css:322`), the 2 TSX hex values and the 3 stray font sizes (`packs.css:163,203`, `library.css:120`) to tokens; raw spacing px to `--s-*`. Check: a lint script finds 0 raw colors and 0 px font sizes outside `tokens.css`, and fewer than 20 raw spacing px.
3. **Motion system (P1, S).** Tokens `--dur-fast` 100 ms, `--dur` 160 ms, `--dur-slow` 220 ms, `--ease-out`, `--ease-in-out`, `--ease-spring`. No literal durations in CSS. Check: grep finds 0 literal durations outside `tokens.css`; with reduced motion on, no transform animation runs.
4. **Live regions (P1, S).** Run status, queue and errors are announced once per change of state, not per token. Check: an aria-live spy logs 1 announcement per state change in a mock run.
5. **Skeletons (P1, S).** In chat history, versions and inspector while data loads. Check: with a slow network, a skeleton shows within 100 ms and CLS stays < 0.05 when data arrives.
6. **Keyboard-only flow (P1, M).** Create a project → run → select an element → edit → restore a version, with no mouse. Check: a Playwright test does the full flow with keys only.

Polish:
7. Type rhythm: body 13 px; line heights on a 4 px grid; `tabular-nums` on every number readout (zoom %, cost, time, sizes). Check: a script reads computed `line-height` of all text in Studio and every value is a multiple of 4 px; grep shows `tabular-nums` on each readout class.

### Round 10 — Export and handoff

Features:
1. **Single-file HTML and PNG export (P0, S + S).** From the version row and the palette: HTML with CSS and images inline; PNG of any frame at 1×, 2× or 3×; many frames as a zip. Check: the HTML file opens offline within 1% pixel diff of the preview; a 2× PNG of a 1440 frame is 2880 px wide.
2. **Handoff bundle (P0, M).** `HANDOFF.md` (intent, decisions, tokens, components, file map, open comments, version id) plus the source zip. "Open in Claude Code" copies a prompt and the path. Check: the bundle holds `HANDOFF.md`, `tokens.css` and the sources; the prompt names the bundle path.
3. **PDF export and copy as code (P1, S + S).** One PDF with one page per frame. Copy the selection as HTML+CSS or Tailwind. Check: 3 frames give a 3-page PDF; the Tailwind copy of a button renders within 2% pixel diff of the original.
4. **MCP server, part 1 (P1, L).** Read-only tools: list projects, get a frame's HTML, get tokens and DESIGN.md, get a screenshot. "Connect to Claude Code" adds the server config. Check: `claude mcp list` shows the server; the tokens tool returns the active pack's tokens.
5. **Open project in editor (P1, S).** Cursor, VS Code or Zed, from the version row and the palette. Check: the command opens the work tree path.

Polish:
6. The export dialog keeps the last format and scale, shows progress, and offers "Reveal in Finder". Check: a second export opens with the last choice.
7. Built React bundle (`vite build` output) in the zip (P2). Check: the zip's `dist/index.html` serves and renders.

---

## 4. Premium-feel checklist (run every round)

Run this on every screen the round touched, in light theme (and dark from R9). Record pass or fail per line in the round's PR.

**Layout and spacing**
- [ ] All padding, margin and gap use `--s-*` (4 px grid). No odd values (5, 7, 9, 11 px).
- [ ] Related controls sit 8 px apart, groups 16–24 px, sections 32 px or more.
- [ ] Nested radius is concentric: inner radius = outer radius − padding.
- [ ] Icons and text align on the optical center; icon-only buttons are square, hit area at least 28 × 28 px (24 px visible is fine).

**Typography**
- [ ] Only `--t-*` sizes (12, 13, 14, 16, 20, 28). Body 13 px. No size below 12 px.
- [ ] At most 3 sizes and 2 weights on one panel.
- [ ] `tabular-nums` on every changing number. Long names truncate with an ellipsis and a tooltip with the full text.
- [ ] No orphan words in headings and empty-state copy (`text-wrap: balance` on headings).

**States**
- [ ] Every interactive element has hover, active (pressed), focus-visible and disabled states. Press feedback within 1 frame.
- [ ] Focus ring: `--ring`, visible on every control, never clipped by `overflow: hidden`.
- [ ] Empty state: says what this is, one main action, no blame.
- [ ] Loading: skeleton or spinner within 100 ms if work takes more than 300 ms; no spinner flash for shorter work.
- [ ] Error: says what failed, why if known, and one way out (Retry, Undo, Open settings). Uses `role="alert"`.
- [ ] Long work shows progress or elapsed time.

**Motion**
- [ ] Durations from tokens only: 100 ms (press, hover), 160 ms (popovers, toggles), 220 ms (panels, dialogs). Nothing over 300 ms except a progress loop.
- [ ] Enter = ease-out; exit faster than enter; no ease-in on enter.
- [ ] Only `transform` and `opacity` animate. No layout animation on hot paths.
- [ ] `prefers-reduced-motion`: no movement, fades only.
- [ ] Smooth: p95 frame time ≤ 16.7 ms and no frame > 32 ms in the touched interaction (same definition as section 3).

**Copy**
- [ ] Short, active voice, sentence case. Buttons are verbs ("Export PNG", not "OK").
- [ ] Same word for the same thing everywhere (direction, version, frame, pack).
- [ ] Shortcut shown in tooltips and menus, in macOS glyphs (⌘ ⇧ ⌥).

**Icons and color**
- [ ] One icon set, one stroke width (`Icon.tsx`), one size per context (16 px in toolbars, 14 px inline).
- [ ] Colors from semantic tokens only; accent used for one main action per view.
- [ ] Text contrast at least 4.5:1, large text and UI parts at least 3:1, in both themes.

**Native feel (desktop)**
- [ ] Every action has a menu item or palette entry; keys match macOS conventions.
- [ ] Right-click works where a user expects it.
- [ ] Window, panel sizes and the last project come back after restart.
- [ ] No web-only tells: no text selection on chrome, no default blue focus glow, no I-beam cursor over buttons, no rubber-band scroll of the shell.

---

## 5. Sources

Research done on 2026-10-23 from official docs unless noted. Web content was read as data.

Figma: F1 help.figma.com/hc/en-us/articles/360040328653 (keyboard and shortcut panel) · F2 …/360041065034 (zoom) · F3 …/360039956974 (measure) · F4 …/360038006754 (version history) · F5 …/32132100833559 (MCP server) · F6 …/15343816063383 (variable modes) · F7 figma.com/blog/config-2026-recap/ · F8 figma.com/release-notes/ · F9 …/4404575206295 (nudge) · F10 …/360039150173 (quick insert, actions) · F11 …/360063144053 (branching) · F13 …/23570416033943 (actions menu)

pen.dev (formerly pencil.dev): P1 docs.pen.dev/core-concepts/keyboard-shortcuts · P2 …/pencil-interface · P3 docs.pen.dev/getting-started/create-your-first-design · P4 …/installation · P5 …/import-and-export · P6 pen.dev (vendor claims) · P7 …/drawing-and-editing · P8 …/variables · P9 …/components · P11 docs.pen.dev/design-and-code/design-to-code

Paper: A1 paper.design · A2 paper.design/docs/tokens · A3 paper.design/docs/mcp, /docs/paste · A5 paper.design/roadmap · A6 paper.design/build-log · A7 paper.design/compare/figma

Claude Design: CD1 anthropic.com/news/claude-design-anthropic-labs · CD2 support.claude.com/en/articles/14604416 · CD3 support.claude.com/en/articles/14604397 · CD5 productcompass.pm/p/claude-design-product-discovery (review) · CD6 pcworld.com/article/3117811 (review) · CD7 macstories.net hands-on review · CD8 wmedia.es/en/tips/claude-code-design-editable-canvas (third party). See also `research/claude-design-gaps.md`.

Open Design: OD1 github.com/nexu-io/open-design README · OD2 …/releases (0.22–0.26) · OD3 …/apps/web/src/i18n/locales/en.ts (UI strings; shipped state not confirmed by release notes) · OD4 …/docs/roadmap.md, docs/spec.md (targets, not measurements) · OD5 …/docs/critique-theater.md. See also `research/design-systems-open-design.md`.

Claude Code: CC1 code.claude.com/docs/en/interactive-mode · CC2 …/slash-commands · CC3 …/checkpointing · CC4 …/permissions · CC5 …/commands · CC6 …/common-workflows · CC7 …/desktop · CC8 …/sub-agents · CC9 …/model-config · CC10 cursor.com/docs/agent/overview · CC11 …/sessions · CC12 …/statusline · CC13 …/hooks (full event list there; R3 and R8 need only PreToolUse, PermissionRequest, Stop, Notification) · CC14 …/terminal-config · CC15 github.com/anthropics/claude-code CHANGELOG.md

Other: L1 docs.lovable.dev/features/visual-edit

Repo evidence: `e2e/latency.spec.ts` (current targets), `research/optimizations.md` (ranked perf work with evidence; bundle size 711 kB from its 06.1 row).
