# Feature cycle 15: next 5 features

Date: 2026-11-13. Read-only research. No code changed (one probe script ran in `/tmp`, read-only on Bonaparte).

Goal: Figma-level manual editing and Claude Design quality, fully headless (each feature works from the UI, the in-app agent where it fits, and as an MCP tool), simple and fast, canvas first with floating panels. Prototypes go beside the app by default. App edits are opt-in.

## Method

- Read `cycle-14.md` (runners-up, skipped-as-built list), the 5 cycle-14 reports (`cycle-14/*.md`, "Left out"), `cycle-13.md`, `.claude/goal/feature-log.md` (rounds 24 to 28), `bonaparte-benchmark.md`, `journeys-run/a-1-8.md` and `git log --oneline -60` (all 5 cycle-14 picks are merged).
- Checked each candidate with narrow greps in `packages/common/actions/src/*` and `apps/desktop/src/{ui,server,bridge}`. Checked every new action id and tool name against `packages/common/actions/src` and `artifacts/mcp-snapshots/*.json`: no clash.
- Ran `findTokenFile` and `loadAppTokens` on two Bonaparte roots with `pnpm exec tsx` (see the verdict).
- Competitor recheck (web search, 2026-11-13). Cycle 14 checked the same day, so only new rows are listed. (2nd) marks an aggregator or blog.
  - Claude Design: works in any Claude chat, Claude Code and the mobile app; rebuilt design-system import with an admin role that approves and locks one system (pureai.com, Jun 17); still no Figma export, version history or multiplayer (blog.mean.ceo, 2nd).
  - Figma Make: two-way GitHub (import a repo, edit code on the canvas, push a PR) (venturebeat.com, 2nd); npm package import and code-backed screens with variables (figma.com/release-notes, no year in the snippet); Zapier and MCP connectors for live data (cmswire.com, 2nd).
  - Lovable: a Design view that puts visual edits, themes and image generation in one panel (createwith.com, 2nd).
  - v0, Bolt: nothing new after cycle 14.

## Bonaparte token verdict

**Refuted as stated. The token gap is real, but its cause is different.**

- The folder check is not the cause in the prototype path. A folder link stores the folder the user opened (`store/project-folder-link.ts:80`, `project.folder = { kind, path: folder }`). An attached app stores the workspace root (`store/project-create.ts` `attachApp`, `folder = workspace.root`). `toAppFolder` (`project-ops/project-ops-prototype.ts:64`) passes that root to `loadAppTokens`. From the root, `detect.ts` `shadcnCss` joins `apps/dashboard` with `../../packages/ui/src/styles/globals.css`, and the result `packages/ui/src/styles/globals.css` is inside the root.
- Probe result:
  - `/Volumes/DevProjects/code/bonaparte` gives `packages/ui/src/styles/globals.css`, 335 tokens (124 dark), 29 ms.
  - `/Volumes/DevProjects/code/bonaparte/apps/dashboard` gives `null`, 341 ms. Cycle 14's mechanism holds only when the root is the app folder: a user who links `apps/dashboard` itself gets no tokens.
- Real cause of benchmark friction 9: the prototype gets a `tokens.css` copy with the app variables, but nothing reads it back.
  - `createPrototypeWith` makes the prototype with `createInFolder`, which sets `created: true` (`store/project-create.ts` `registerFolder(..., { created: true })`).
  - `usesAppTokens` (`design-system/app-tokens/source.ts:31`) is false for `created: true`.
  - `readDesignSystemFiles` (`design-system/sync.ts:78`) reads only `design-system/tokens.json` plus `design-system/pack.json` (`contracts.ts:2206`, `2208`). The prototype has neither.
  - So `readDesignSystemState` (`design-system/state.ts:22`) returns no entries. The Tokens panel shows "This project has no tokens yet". The inspector token picker and the agent token context (`loadDesignSystemPromptContext`, called in `http/app-context.ts` `startRun`) are empty. `preview/token-read.ts:60` is gated the same way.
  - Not blind: `token.apply`. `token-sweep/sweep-tokens.ts:115` calls `loadAppTokens(workTree)` with no gate. A probe on a temp folder that holds the Bonaparte `globals.css` as `tokens.css` returns `tokens.css`. Cycle 14's line "the route-prototype token sweep does nothing" is wrong.
- This makes it pick 1. Cycle 14 had the rule "fixes are not picks". This cycle drops that rule for this item, because the fix also adds a refresh action.

## Skipped as built (checked this cycle)

Everything in the cycle-13 and cycle-14 lists, plus the cycle-14 picks (live-edit, next-screen, layer-undo, rule-proposals, port-check). Also checked:
- Find and replace text: `text.update` with `search_text`.
- Layout and column grid overlay: `features/grid`, `GridOverlay` in `canvas-stage.tsx`.
- Rulers and guides: `canvas-rulers.tsx`, `stage-rulers.tsx`.
- Duplicate, wrap, group and cut-to-move: `inspector/structure-edits-model.ts`.
- Hug, fill and fixed sizes: `sizing-model.ts`.
- Instance swap: `inspector/swap-button.tsx`.
- Keep with undo: `keepWithUndo` in `canvas/use-variations.ts`.
- Live data from CSV or JSON (`content`, `fixture`).
- Saved patterns across projects (`pattern.*`).
- Shared-edit impact check (`impact.run`).

Manual-editing gaps found against Figma: the scale tool (K), and component-like editing of a part that repeats on many pages of an HTML prototype. Picks 2 and 5 cover them.

## Ranking

Score = user value for real-app AI design x fit with "simple and fast" / effort (1 to 5 each).

| Rank | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|
| 1 | app-tokens: a prototype uses and refreshes the app's tokens | 5 | 5 | 2 | 12.5 |
| 2 | shared-layers: edit a repeated nav or footer on every page at once | 4 | 5 | 3 | 6.7 |
| 3 | screen-drop: paste a screenshot on the canvas to get that screen | 4 | 5 | 3 | 6.7 |
| 4 | selection-picture: the agent sees the selected layers as a picture | 4 | 5 | 2 | 10 (capped by value) |
| 5 | scale-tool: scale a layer with its type, spacing and radius (K) | 3 | 5 | 2 | 7.5 (capped by value) |

App-tokens is first: it unblocks the Bonaparte benchmark step "Change color with a token" and every prototype beside a real app. Selection-picture and scale-tool score well because they cost little. They rank lower because each adds less new value.

---

## 1. app-tokens: a prototype uses and refreshes the app's tokens

**Why.** The Home card promises a prototype "Beside the folder, with its tokens" (`home/copy.ts:288`). The tokens are on disk (`tokens.css`, 335 variables for Bonaparte), but most of the studio does not see them (see the verdict). The Tokens panel, the token picker and the agent's token list are empty, so the agent and the user write raw values, not app tokens. Rivals:
- Bolt attaches a design system to a project.
- Claude Design imports and locks one design system.
- Figma Make imports npm packages.

None of them keeps the prototype in step with the code tokens of a real app. Here that is one refresh.

**UI behaviour.**
- A prototype made beside an app shows the app tokens in the Tokens panel. The source line (`tokens-source.tsx`) reads "From bonaparte · packages/ui/src/styles/globals.css · 335 tokens". The inspector token picker lists them, and "Use token" works.
- A token edit in the panel writes the prototype's own `tokens.css`. The app does not change.
- The source line has a Refresh button. It re-reads the app tokens and rewrites `tokens.css` as one version, then shows a short note: "12 changed, 3 added, 0 removed". Cmd+Z takes it back.
- A folder linked at an app subfolder (`apps/dashboard`) whose `components.json` points up into the workspace (`../../packages/ui/...`) also finds the tokens. The token read uses the workspace root that `workspaceAppDir` finds, and checks the file against that root. A path outside the workspace root is still refused.
- No new panel and no setting.

**Action surface.**
- New `token.import`: `POST /api/projects/:projectId/d/:directionId/tokens/import`, `access: "edit"`, `scope: "project"`, `needs: "project.update"`, `confirm: "none"`, `mcp: { name: "import_token" }`, `agent: { lean: true, name: "import_token", set: "design-system", short: "Copy the current CSS tokens of the linked app into this prototype's tokens.css, and list what changed." }`, `invalidates: ["token.listUsage", "direct-edit.getDesignSystem", "version.list"]` (match the read ids that exist at build time).
- Input: `projectId`, `directionId`.
- Output: `{ file, sourceFile, tokens, added, changed, removed, versionId }`.
- Errors: `BadRequest` ("This project is not a prototype of an app."), `NotFound` (the app has no token file).
- `readDesignSystemState` and `loadDesignSystemPromptContext` change with no new action: a project with `appProjectId`, no `design-system/` pack and a root `tokens.css` gives app-token state from that file. MCP `get_design_system` and every token tool then see the tokens.

**Main files.**
- `src/server/design-system/app-tokens/source.ts` (add `usesPrototypeTokens(project)`: true for `created: true` with `appProjectId`. It only removes the `created` gate. `loadAppTokens(workTree)` already finds the root `tokens.css`)
- `src/server/design-system/state.ts` (use it in both readers), `src/server/preview/token-read.ts` (same gate)
- `src/server/design-system/app-tokens/detect.ts` (`findTokenFile` takes an optional workspace root for the `shadcnCss` check)
- new `packages/common/actions/src/token/import.ts`, the output schema in `packages/common/actions/src/token/schema.ts`
- new `src/server/handlers/token/import.ts`, `src/server/handlers/token/live.ts`
- new `src/server/design-system/app-tokens/prototype-token-writer.ts` (`PrototypeTokenWriter`, write: build the CSS, diff the names, write one version), export in `src/server/design-system/index.ts`. Move `toPrototypeCss` from `project-ops` into a shared module only if the import is not allowed. Otherwise import it.
- `src/ui/features/versions-layers-tokens/tokens-source.tsx`, new `use-token-import.ts`, the copy block in that feature

**Verify.**
1. `STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev`. Link `/Volumes/DevProjects/code/bonaparte` as a folder workspace (default app `apps/dashboard`). New prototype "A patient intake summary card".
2. The Tokens panel lists the Bonaparte tokens with the source line. Select a heading and set its color with a token from the picker: the page gets `var(--…)`. Shoot dark and light.
3. Edit one value in the prototype `tokens.css` by hand, then Refresh: the note says 1 changed, and Cmd+Z brings the hand value back.
4. `pnpm exec tsx scripts/call-action.ts token.import '{"projectId":"<proto>","directionId":"main"}'`: the same counts on HTTP, MCP and agent.
5. Link `apps/dashboard` alone as a folder, then make a prototype: the tokens load.
6. `git -C /Volumes/DevProjects/code/bonaparte status` shows no change.

---

## 2. shared-layers: edit a repeated nav or footer on every page at once

**Why.** In Figma a nav is a component, so an edit reaches every screen. An HTML prototype copies the nav into each page. Next-screen (cycle 14) and `canvas.createFlow` make multi-page flows, so this copy happens more now. A manual fix to the nav on one page leaves the other 5 pages wrong. React projects share components already. HTML prototypes have nothing. `impact.run` checks other routes but writes nothing. `pattern.insert` inserts once and does not sync.

**UI behaviour.**
- Select a layer in an HTML page. If the same element shows on other pages (the same tag and the same normalized markup before your edits), a chip shows at the inspector head: "On 5 pages".
- After a manual edit, the chip changes to "Apply to 5 pages". A click writes the edited element to every match as one version. Cmd+Z takes back all of them.
- A hover on the chip outlines the matching frames on the canvas.
- A page whose copy changed on its own is not a match. The chip text says "4 of 5 pages match", and only the 4 change.
- React and app projects: no chip.

**Action surface.**
- New `page.inspectMatches`: `GET /api/projects/:projectId/d/:directionId/pages/matches`, `access: "read"`, `scope: "project"`, `needs: "project.read"`, `mcp: { name: "inspect_matches_page" }`, `agent: { lean: true, name: "inspect_matches_page", set: "core", short: "Find the pages that hold the same element as one layer, such as a nav or footer, to edit them all." }`, `invalidates: []`. The result has at most 50 pages, so it is `inspect`, not `list`.
  - Input: `projectId`, `directionId`, `file`, `selector`, `versionId: string | null` (match against the element as it was in this version; null means the head).
  - Output: `{ items: [{ file, selector, frameId: string | null, isSame }] }`.
- New `page.updateMatches`: `POST /api/projects/:projectId/d/:directionId/pages/matches`, `access: "edit"`, `needs: "project.update"`, `confirm: "none"`, `mcp: { name: "update_matches_page" }`, `agent: { lean: true, name: "update_matches_page", set: "core", short: "Copy one layer's current markup to the same element on other pages, as one version." }`, `invalidates: ["page.inspectMatches", "version.list"]`.
  - Input: `projectId`, `directionId`, `file`, `selector`, `targets` (a list of `{ file, selector }`, max 50).
  - Output: `{ versionId, files }`.
  - Errors: `Conflict` (a target changed since the inspect), `NotFound`, `BadRequest` (not an HTML project).
- The in-app agent prompt gets no new rule. The tool `short` text is enough.

**Main files.**
- new `packages/common/actions/src/page/inspect-matches.ts`, `update-matches.ts`, new `packages/common/actions/src/page/match/schema.ts`
- new `src/server/handlers/page/inspect-matches.ts`, `update-matches.ts`, `src/server/handlers/page/live.ts`
- new `src/server/canvas/page-match/engine/to-page-matches.ts` (pure: normalize markup, ignore whitespace and the `aria-current` and active-class differences, compare). It goes under `canvas`, because a new `page-match` area would need a boundaries change (L6d), as port-check found.
- new `src/server/canvas/page-match/page-match-store.ts` (`PageMatchStore`, read) and `page-match-writer.ts` (`PageMatchWriter`, write), with export lines in `src/server/canvas/index.ts`
- new `src/ui/features/inspector/shared-layers-chip.tsx`, `use-shared-layers.ts`, `shared-layers-model.ts`, the copy block in `inspector/copy.ts`, one mount line in `inspector/inspector-edit-pane.tsx` (next to `SessionHeader`)
- Not built elsewhere: `direct-edit.createComponent` makes a React component from repeated markup, but it refuses HTML pages.

**Verify.**
1. Mock dev run. Prompt a 3-page site, or use next-screen twice, so each page has the same `<nav>`.
2. Select the nav on page 1: the chip says "On 3 pages". Change its background in the inspector, click "Apply to 3 pages": all 3 frames change. Cmd+Z reverts all 3. Shoot dark and light.
3. Change the nav text on page 3 by hand, then edit page 1 again: the chip says "2 of 3 pages match".
4. `call-action.ts page.inspectMatches '<json>'` and `page.updateMatches '<json>'`: the same result on HTTP, MCP and agent (use a fresh direction per surface for the write, as layer-undo did).

---

## 3. screen-drop: paste a screenshot on the canvas to get that screen

**Why.** Image to UI is the first step in Claude Design, v0, Lovable and Bolt. Here a screenshot works only from the Home or chat composer, and it needs a prompt. The chat run can mark a picture as a reference (`<reference-picture>` in `agent/user-message.ts`). On the canvas, a paste or drop of an image file does nothing: the stage has no image paste or file drop handler (`features/canvas`, `dataTransfer.files` 0 hits). A real-app user often has a screenshot of a competitor or of the old screen. One paste should give a new frame.

**UI behaviour.**
- Paste an image (Cmd+V with no layer selected) or drop a PNG, JPEG or WebP file on empty canvas. A ghost frame shows at the drop point, or after the last frame for a paste, with the image dimmed inside it and a one-line prompt: "Rebuild this screen. Add a note?".
- Enter makes the page and the frame, and starts a run with the image as the reference picture. The new frame shows the live-build cover. Esc cancels and writes nothing.
- The new page copies the `<head>` of the nearest page (tokens, fonts), as next-screen does, so the rebuild uses the project tokens.
- An app project shows a note that points to New screen. The app is never written.
- A paste with a layer selected keeps today's behaviour (image fill in the inspector).

**Action surface.**
- New `canvas.importFrame`: `POST /api/projects/:projectId/canvas/frames/import`, `access: "edit"`, `scope: "project"`, `needs: "project.update"`, `confirm: "none"`, `mcp: { name: "import_frame_canvas" }`, `agent: { lean: false, name: "import_frame_canvas", set: "core", short: "Add a page and a frame from an attached screenshot, and start a run that rebuilds it in this project's style." }`, `invalidates: ["canvas.getDoc", "version.list", "run.list"]`.
- Input: `projectId`, `directionId`, `attachmentId` (from the existing `POST /api/projects/:projectId/attachments`), `x: number | null`, `y: number | null`, `name: string | null`, `prompt: string | null`, `shouldStartRun` (decoding default `true`).
- Output: `{ frameId, path, runId: string | null }`.
- Errors: `BadRequest` (app project: "Use create_screen"; not an image), `NotFound` (attachment), `Conflict` (a run is active, as `run.start`).

**Main files.**
- new `packages/common/actions/src/canvas/import-frame.ts`, new `packages/common/actions/src/canvas/frame-import/schema.ts`
- new `src/server/handlers/canvas/import-frame.ts`, `src/server/handlers/canvas/live.ts`
- new `src/server/canvas/frame-import/frame-import-writer.ts` (`FrameImportWriter`, write: page, frame, one version; calls `to-linked-page.ts` for the head copy, import only)
- new `src/ui/features/canvas/use-image-paste.ts`, `image-drop-ghost.tsx`, `image-drop-model.ts`, the copy block in `canvas/copy.ts`, one mount line in `canvas/use-prototype.tsx` (next to `LinkDragLine`)

**Verify.**
1. Mock dev run on an HTML project with one page. Copy a PNG of any landing page, click empty canvas, Cmd+V. Enter.
2. A new frame shows the build cover, then the page. The run prompt holds the reference-picture block. Shoot dark and light at 1440 px.
3. Drop a JPEG file at a spot: the frame lands there. Esc on a second drop: no file or version changes.
4. `call-action.ts canvas.importFrame '{"projectId":"<id>","directionId":"main","attachmentId":"<att>","x":null,"y":null,"name":null,"prompt":null,"shouldStartRun":false}'`: the same shape on HTTP, MCP and agent.
5. On an app project: the note shows, and `git status` in the app is clean.

---

## 4. selection-picture: the agent sees the selected layers as a picture

**Why.** v0 Design Mode attaches an element screenshot (changelog, Mar 2026). Here a selection run (selection prompt, chat with a selection, `start_run` with `selection`) sends only text in `<selected-elements>`: the tag, selector and classes. The model cannot see the layer it must change. For a request such as "this card looks cramped", a picture of the card makes the first answer right more often. No new user step is needed.

**UI behaviour.**
- A run with a selection of 1 to 5 layers gets one PNG crop of their joint box, with 24 px of margin, at 2x up to 1600 px wide. The model gets it as an attached image with a short note in `<selected-elements>`: "Picture: the selected layers as the user sees them."
- The selection prompt and the chat composer show a small thumbnail chip, "Picture of selection", with an X to leave it out of this run.
- If the capture fails or takes more than 1.5 s, the run starts without it. The run never waits longer.
- The capture runs on the server, so an outside agent that calls `start_run` with `selection` gets the same picture.

**Action surface.**
- No new action. `run.start` (`start_run`) input gains `isSelectionPictureOn` (decoding default `true`), described in the field annotation. `run.get` output gains `selectionPicture: string | null` (the attachment id).

**Main files.**
- `packages/common/actions/src/run/start.ts` (one field), `packages/common/actions/src/run/schema.ts` (one output field)
- new `src/server/agent/selection-picture.ts` (Promise sibling: capture through `preview/page-capture/index.ts` `selectorClipExpression`, store as a run attachment)
- `src/server/agent/user-message.ts` (add the image part and the note)
- `src/server/http/app-context.ts` `startRun` (one call after the attachments load, before `loadDesignSystemPromptContext`)
- `src/server/agent/mock.ts` (the mock reply names "the picture" when it gets one, so the flow shows without a model)
- `src/ui/features/canvas/selection-prompt-foot.tsx`, new `canvas/selection-picture-chip.tsx`, `canvas/selection-picture-model.ts`, the copy block in `canvas/copy.ts`; `chat/prompt-frame.tsx` (one mount line)

**Verify.**
1. Mock dev run. Select a card, Cmd+I, type "more air", Enter. The run log shows one attached image. `run.get` has `selectionPicture`. The mock reply names the picture.
2. The chip shows in the selection prompt and the chat composer. X leaves the picture out, and the next run has none. Shoot dark and light.
3. `call-action.ts run.get '<json>'` after an MCP `start_run` with `selection`: `selectionPicture` is set on HTTP and MCP (the agent surface is off: run-control).
4. Manual: one real-model run with "make this card match the others": the reply names something only the picture shows.
5. Time from Enter to run start goes up by 1.5 s at most.

---

## 5. scale-tool: scale a layer with its type, spacing and radius (K)

**Why.** This is the one Figma manual tool that is still missing (cycle 14 runner-up 9). `scaleTool` and `scale-tool` have 0 hits, the inspector has no scale field, and K is used only for links in text edit (`bridge/text-range.ts:95`). Resize changes only the box. Figma K scales the font sizes, padding, gap, radius, border and shadow too. Users need it to make a card "the same, but smaller" for a sidebar or a phone frame. The agent can use it for the same task with exact values.

**UI behaviour.**
- The inspector size section gets a Scale field (percent, default 100%). Type 80% and Enter, or drag the label to scrub. K with a layer selected puts focus in the field.
- One write changes the layer and its children: width and height (when fixed), font size, line height (when absolute), letter spacing, padding, margin, gap, radius, border width and shadow lengths. A Tailwind page snaps each value to the nearest scale class and uses an arbitrary value only when no class is within 1 px. A plain page writes CSS.
- Values from tokens: the field shows "3 values use tokens" with a toggle "Keep tokens" (on by default). With it on, those values stay.
- One click is one version and one undo step. The field goes back to 100% after the write.
- No drag handles on the canvas this cycle (see runners-up).

**Action surface.**
- New `layer-style.update`: `POST /api/projects/:projectId/layer-style/update`, `access: "edit"`, `scope: "project"`, `needs: "project.update"`, `confirm: "none"`, `mcp: { name: "update_layer_style" }`, `agent: { lean: true, name: "update_layer_style", set: "tweak", short: "Scale one layer and its children by a factor: sizes, type, spacing, radius, borders and shadows, as one version." }`, `invalidates: ["layer-style.get", "version.list", "canvas.getDoc"]`.
- Input: `projectId`, `directionId`, `file`, `selector`, `factor` (0.25 to 4), `shouldKeepTokens` (decoding default `true`).
- Output: `{ versionId, changed, skipped: [{ selector, property, reason }] }`.
- Errors: `BadRequest` (factor out of range), `Conflict`, `NotFound`.
- Check at build time that the `layer-style` domain needs an object in the id (N1). If `get` and `apply` already take the same object, `update` is fine.

**Main files.**
- new `packages/common/actions/src/layer-style/update.ts`, the output schema in `packages/common/actions/src/layer-style/schema.ts`
- new `src/server/handlers/layer-style/update.ts`, `src/server/handlers/layer-style/live.ts`
- new `src/server/direct-edit/engine/scale/to-scaled-styles.ts` (pure: computed values and a factor give the new values; Tailwind snap through the existing map, read only)
- new `src/server/style-scope/layer-style/layer-scale-writer.ts` (`LayerScaleWriter`, write), beside `layer-style-writer.ts`, with the export line in `src/server/style-scope/index.ts` (or the layer-style leaf `index.ts`)
- new `src/ui/features/inspector/scale-field.tsx`, `use-scale-field.ts`, `scale-field-model.ts`, the copy block in `inspector/copy.ts`, one mount line in `size-editor.tsx`; the K key in the inspector key map (not `bridge/keyboard.ts` unless the key must work with focus in the frame, then one line there)

**Verify.**
1. Mock dev run. Select a pricing card with padding 24, gap 16, radius 12 and a 20 px title. Scale 50%: padding 12, gap 8, radius 6, title 10 px, and the children change too. Cmd+Z restores all. Shoot dark and light.
2. On a Tailwind sample: `p-6` becomes `p-3`, `text-xl` becomes `text-xs` or the nearest class, and no arbitrary value shows where a class is within 1 px.
3. A card with a token radius keeps the token with "Keep tokens" on, and the field says so.
4. `call-action.ts layer-style.update '<json>'`: the same changed list on HTTP, MCP and agent (fresh direction per surface).

---

## File ownership

| Pick | Owns |
|---|---|
| 1 app-tokens | `design-system/app-tokens/{source,detect}.ts`, `design-system/app-tokens/prototype-token-writer.ts`, `design-system/state.ts`, `design-system/index.ts` (one export), `preview/token-read.ts`, `actions/token/import.ts`, `actions/token/schema.ts`, `handlers/token/{import,live}.ts`, `versions-layers-tokens/tokens-source.tsx`, `versions-layers-tokens/use-token-import.ts` |
| 2 shared-layers | `actions/page/{inspect-matches,update-matches}.ts`, `actions/page/match/**`, `handlers/page/**`, `server/canvas/page-match/**`, `inspector/shared-layers-*`, `inspector/use-shared-layers.ts`, `inspector/inspector-edit-pane.tsx` (one line) |
| 3 screen-drop | `actions/canvas/import-frame.ts`, `actions/canvas/frame-import/**`, `handlers/canvas/{import-frame,live}.ts`, `server/canvas/frame-import/**`, `canvas/use-image-paste.ts`, `canvas/image-drop-*` |
| 4 selection-picture | `actions/run/{start,schema}.ts` (one field each), `agent/selection-picture.ts`, `agent/user-message.ts`, `agent/mock.ts`, `http/app-context.ts` (one call), `canvas/selection-prompt-foot.tsx`, `canvas/selection-picture-*`, `chat/prompt-frame.tsx` (one line) |
| 5 scale-tool | `actions/layer-style/{update,schema}.ts`, `handlers/layer-style/{update,live}.ts`, `direct-edit/engine/scale/**`, `style-scope/layer-style/layer-scale-writer.ts`, `inspector/scale-field*`, `inspector/use-scale-field.ts`, `inspector/size-editor.tsx` (one line) |

Shared files:
- `src/ui/features/canvas/copy.ts`: picks 3 and 4 each add one block. Merge in rank order.
- `src/ui/features/inspector/copy.ts`: picks 2 and 5 each add one block.
- The inspector head mount (pick 2) and `size-editor.tsx` (pick 5) are different files. Neither pick touches `inspector-edit-pane.tsx`.
- `src/server/canvas/index.ts`: picks 2 and 3 each add export lines (page-match services; frame-import writer, and `to-linked-page` if it is not exported yet). Merge in rank order.
- `src/server/design-system/index.ts`: pick 1 only. `src/server/style-scope/index.ts`: pick 5 only.
- `src/server/canvas/linked-frame/engine/to-linked-page.ts`: pick 3 imports it and does not change it.
- `src/ui/app/main.tsx`: one CSS import per pick that adds a stylesheet (likely 3 and 4).
- `src/server/agent/prompt.ts`: no pick needs it.
- `src/server/main/live-layer.ts`: no pick adds a domain (`token`, `page`, `canvas`, `run`, `layer-style` exist). `CanvasLive`, `LayerStyleLive`, `PageLive`, `RunLive` and `TokenLive` are all wired (checked), so no pick changes this file.
- `@generated` files (`all-actions.generated.ts`, per-domain `routes.ts`, `handlers.ts`, `index.ts`): run `pnpm exec tsx scripts/gen-routes.ts` after each merge, one at a time.
- `artifacts/mcp-snapshots/*.json`: new tools `import_token`, `inspect_matches_page`, `update_matches_page`, `import_frame_canvas` and `update_layer_style`, plus the `start_run` input diff (pick 4). Also the 4 cycle-14 tools are still waiting for approval. Approve each diff at merge.
- `.claude/goal/roadmap.md` Appendix A: add each pick's globs before its slice runs (L6e).
- Order: all 5 can run at once. Merge 1 first: it unblocks the Bonaparte benchmark rerun. Merge 3 after 4, because both add to `canvas/copy.ts` and 4 is smaller.

## Runners-up

1. Route sync: show "App changed since copy" on a route prototype, and re-copy the route while it keeps the prototype edits (doop design sync). It shares `project-ops-prototype.ts` with pick 1, so it goes next cycle.
2. Frame delete undo (journey 2 fail; fix): frame X deletes with no confirm and no toast. Check whether Cmd+Z now restores the frame through layout steps, then add a `canvas.restoreFrame` if not.
3. Scale handles on the canvas: drag a corner with K held, after pick 5 lands (Figma).
4. App components in prototypes: let an HTML prototype beside a React app insert the app's `packages/ui` components as rendered blocks (Figma Make npm import); high effort.
5. Locked design system: an org setting that pins one token source for all prototypes of an app, and warns on raw values (Claude Design admin lock).
6. Live data connector: fill a prototype list from an MCP resource or a URL that returns JSON, refreshed on demand (Figma Make connectors); `content` takes pasted data only.
7. Auto layout on absolute children (journey 10; fix): Shift+A writes flex and gap, but the children stay `position: absolute`.
8. Export a frame to Figma as editable layers (Claude Design still lacks it); needs a Figma plugin.
9. Agent engine choice (Codex, Gemini CLI, OpenRouter), as in doop and Open Design; high effort.
10. Show diff for port-check: serve the diff PNG from the data dir and open it in an image view (port-check left it out).
