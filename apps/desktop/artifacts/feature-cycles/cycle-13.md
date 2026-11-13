# Feature cycle 13: next 5 features

Date: 2026-11-13. Read-only research. No code changed.

Goal: Figma-level manual editing and Claude Design quality, fully headless (each feature works from the in-app agent and as an MCP tool), simple and fast, canvas first with floating panels. Prototypes go beside the app by default. App edits are opt-in.

## Method

- Read `artifacts/{open-design-polish,polish-cycle,polish-cycle-2,bonaparte-benchmark,user-journeys}.md`, the 6 journeys-run reports, `git log --oneline -150`, and `.claude/goal/feature-log.md` (rounds 19 to 28, 50 picks, all merged or planned).
- Listed the action ids in `packages/common/actions/src/*/` (about 300 actions, 293 MCP tools).
- Checked each candidate with narrow greps, and read the closest action `description` and UI entry file before calling it missing.
- Competitor rows come from these pages: doop README (github.com/kgoedecke/doop), Claude Design (anthropic.com/news/claude-design-anthropic-labs, support.claude.com get-started), Lovable docs (docs.lovable.dev/features/projects/chat, /features/plan-mode), Figma Make help and blog (help.figma.com 31304485164695, figma.com/blog/properties-panel-and-annotations-now-in-figma-make), v0 changelog (v0.dev/changelog, secondary mirrors), and `open-design-polish.md` (Open Design read from source).

### Skipped as built (checked)

Element variants (`server/variations/element-variants.ts`, `inspector/element-variants-head.tsx`), plan mode (`run.start` `plan`, `chat/plan-card.tsx`), comment pins to an agent run (`comment.start`), Alt measure lines (`bridge/hover-select.ts` `isAltHeld`, `shared/measure.ts`), select matching (`inspector/select-matching-button.tsx`), PPTX, PDF and SVG export (`server/export/pptx.ts`), deck starter, Figma import (`direct-edit.importFigma`), copy a live page (`page.import`, localhost dev URLs allowed), token sweep (`token.apply`), ready-for-dev (`dev-status`), attention heatmap (`critique.runAttention`), synthetic user (`walkthrough.run`), impact check (`impact.run`), markup (`markup.create`), prompt expand (`brief.run`), image generation, stock images, rich text ranges, pen and vectors, boolean ops, masks, auto layout, constraints, file lock, version authors, presence chip, Move to app (`port.start`), share live viewer, PR from Ship.

### Skipped by rule

Fixes from the benchmark (Play in 2 clicks, title cut mid-phrase, oklch swatch) are bugs, not features. They are in the runners-up list. No pick adds a docked panel.

## Ranking

Score = user value for real-app AI design x fit with "simple and fast" / effort (1 to 5 each).

| Rank | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|
| 1 | live-build: the frame builds as the agent writes | 5 | 5 | 3 | 8.3 |
| 2 | change-spotlight: show what changed after a run or MCP edit | 5 | 5 | 3 | 8.3 |
| 3 | route-prototype: redesign an app screen as a prototype beside the app | 5 | 4 | 3 | 6.7 |
| 4 | selection-prompt: floating prompt at the selection | 4 | 5 | 2 | 10 (capped by value) |
| 5 | decision-chips: the agent states its choices, one click changes one | 4 | 4 | 3 | 5.3 |

Selection-prompt has the best ratio, but it adds less new value than 1 to 3, so it is ranked 4.

---

## 1. live-build: the frame builds as the agent writes

**Why.** Claude Artifacts and v0 show the page as the model writes it. Open Design shows each file in a live iframe as the agent writes it. Today `server/agent/sdk-driver.ts` streams only `text_delta` and `thinking_delta` (line ~925). File content from a `Write` or `Edit` tool input does not stream, so a first build shows `FirstBuildCover` (step text) until the whole file lands. On a real model that is 20 to 60 s of no design. This is the largest "show the design sooner" gap left.

**UI behaviour.**
- During a run, when the agent writes an `.html` file that a frame shows, the frame shows the partial HTML in a sandboxed `srcdoc` layer under the step cover text. It refreshes at most every 250 ms. Scripts stay off in the partial view.
- The first build cover becomes a thin bar at the frame top ("Writing index.html · 14 KB") over the growing page.
- When the write ends, the real preview takes over with no flash (swap after the real frame `load`).
- React and app files: no partial view (they need a build). The bar still shows the file and the bytes.
- No new panel. No setting.

**Action surface.**
- New `run.getDraft`: `GET /api/projects/:projectId/runs/:runId/draft`, `access: "read"`, `scope: "project"`, `needs: "project.read"`, `mcp: { name: "get_draft_run" }`, `agent: { off: "run-control" }`, `confirm: "none"`, `invalidates: []`. Output: `{ path: string | null, bytes: number, html: string | null, isComplete: boolean }`, with `html` cut at 256 KB. An outside agent that starts a run with `start_run` can poll it next to `get_run`.
- New event `run.write.delta` (`{ runId, toolUseId, path, text }`) in the `StudioEventBody` union. The UI reads it from the stream, never by polling (U12).
- MCP writes by an outside agent (`write_file`, `edit_element`) already update the preview. They need no change.

**Main files.**
- `packages/common/contracts/src/contracts.ts` (one union member)
- new `packages/common/actions/src/run/get-draft.ts`, new `packages/common/actions/src/run/draft/schema.ts`
- new `src/server/handlers/run/get-draft.ts`
- `src/server/agent/sdk-driver.ts` (handle `input_json_delta` for `Write` and `Edit` tool blocks; parse the partial `content` string)
- new `src/server/agent/draft-store.ts` (a `RunDraftStore`, access read, last draft per run, cleared on run end), wired in `src/server/handlers/run/live.ts`
- `src/server/agent/mock.ts` (mock writes in 4 chunks, so the mock agent can show the view)
- `src/ui/features/canvas/step-cover.tsx`, `src/ui/features/canvas/frame-skeleton.tsx` (`FirstBuildCover`), new `src/ui/features/canvas/draft-frame.tsx`, new `src/ui/features/canvas/use-draft-frame.ts`, new `src/ui/features/canvas/draft-frame-model.ts`

**Verify.**
1. `STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev`. On Home, prompt "A pricing page for a coffee subscription".
2. The frame shows a growing page before the run ends, then the real frame with no blank flash. Shoot dark and light.
3. `pnpm exec tsx scripts/call-action.ts run.getDraft '{"projectId":"<id>","runId":"<run>"}'` during the run returns a growing `bytes`, and `isComplete: true` after it.
4. Note: the mock shows the mechanism, not real model timing. Check one real run by hand: time to first visible content must drop from "run end" to under 5 s.

---

## 2. change-spotlight: show what changed after a run or MCP edit

**Why.** v0 Design Mode and Figma Make stage and show each change before you keep it. doop shows per-frame editing marks. Claude Design users report that they cannot see what Claude changed. Here, after a run or an outside `edit_element`, the user compares by eye or opens Versions > Compare (`version.inspectDiff`, file diffs and a pixel mask). Nothing points at the changed layers on the canvas. Journey 17 also needs "who changed what" at a glance.

**UI behaviour.**
- When a run ends, or an MCP edit lands, each changed layer gets a 2 px ring for 4 s on the canvas, colored by kind: added, text, style, removed (removed shows a ghost box at the old rect).
- A small pill floats at the frame label: "6 changes". Click it to step through them (select, zoom to box). Shift+click or Esc clears.
- Each ring has "Undo this change" in its right-click menu. It calls the existing `revert_hunk` (`version.applyHunk`) for the hunk that made it.
- The rings use the selection layer. No new panel.

**Action surface.**
- New `version.inspectChanges`: `GET /api/projects/:projectId/d/:directionId/changes`, `access: "read"`, `scope: "project"`, `needs: "project.read"`, `mcp: { name: "inspect_changes_version" }`, `agent: { lean: true, name: "inspect_changes_version", set: "core", short: "List the layers that changed between two versions, with kind, layer id and file line, to check your own edit." }`, `invalidates: []`. Input: `projectId`, `directionId`, `from: VersionId | null` (default: parent of `to`), `to: VersionId | null` (default: head). Output: `{ items: [{ layerId, file, line, kind: "added" | "text" | "style" | "removed", hunk }] }`. Not a list action (bounded by the diff), so `inspect`, not `list`.
- The engine maps each diff hunk to the elements whose `data-studio-loc` range overlaps it. HTML and JSX both carry `data-studio-loc`.
- The agent and outside agents use it to check their own edit before they report done.

**Main files.**
- new `packages/common/actions/src/version/inspect-changes.ts`, new `packages/common/actions/src/version/changes/schema.ts`
- new `src/server/handlers/version/inspect-changes.ts`
- new `src/server/store/engine/to-changed-layers.ts` (pure: hunks + loc map to items), with the read in a new `src/server/store/change-reader.ts` (`ChangeReader`, access read, over `VersionStore`), exported from `src/server/store/index.ts`, wired in `src/server/handlers/version/live.ts`
- `src/ui/features/canvas/stage-overlay.tsx` (mount point), new `src/ui/features/canvas/change-rings.tsx`, new `src/ui/features/canvas/use-change-rings.ts`, new `src/ui/features/canvas/change-rings-model.ts`, new `src/ui/features/canvas/change-pill.tsx`

**Verify.**
1. Dev run with `STUDIO_AGENT=mock`. Make a page, then run "Make the hero darker". Rings show on the changed layers. The pill reads the count. Click steps through them. Shoot dark and light.
2. Over MCP, `edit_element` on a heading: one "text" ring shows in the open app.
3. `pnpm exec tsx scripts/call-action.ts version.inspectChanges '{"projectId":"<id>","directionId":"<dir>","from":null,"to":null}'` lists the same layers on HTTP, MCP and the agent.
4. "Undo this change" on one ring reverts only that hunk. Cmd+Z takes it back.

---

## 3. route-prototype: redesign an app screen as a prototype beside the app

**Why.** doop imports from live apps. v0 and Lovable start from a screenshot or URL. Figma Make starts from a Figma frame. For Bonaparte, the most common job is "redesign this existing screen", not "design a blank one". Today a folder prototype (`project.createPrototype`) starts blank with the app tokens, and `page.import` can copy a localhost dev route with token-mapped colors, but nothing joins them. The user must create a prototype, find the dev URL, run Import page, then prompt. Journey 6 and 8 cover new screens and the port back, so this closes the loop: real screen, prototype beside the app, Move to app.

**UI behaviour.**
- On a route frame (made by `canvas.createRouteFrame`), the frame "…" menu and the right-click menu get "Redesign as prototype". It opens the existing prototype prompt with the route named ("Redesign /caseload: …"). Enter creates the prototype, copies the route, and starts the run on the copy.
- Home in a folder workspace: the + menu gets "Start from a route…" with the found routes (`workspace.listRoutes`).
- The copy lands in Design Studio's own folder (prototype rule). The app is never written.
- After `page.import`, the copy runs `token.apply` against the prototype `tokens.css`, so colors, radii and spacing near an app token become `var(--…)`. Journey 6 forbids hard-coded colors.

**Action surface.**
- Extend `project.createPrototype` (keep tool `create_prototype_project`): add `routePath: string | null` and `viewport: number | null`, each a required field with `Schema.withDecodingDefault` to `null`. With a `routePath`, the handler starts the app dev server on demand, imports that route as the entry page, applies tokens, then starts the run with the prompt. Add `NotFound` for an unknown route (already in the errors list).
- Approve the `create_prototype_project` input diff in `artifacts/mcp-snapshots` at merge.

**Main files.**
- `packages/common/actions/src/project/create-prototype.ts`, `packages/common/actions/src/project/schema.ts` (`ProjectPrototypeFields` only)
- `src/server/handlers/project/create-prototype.ts`
- `src/server/project-ops/project-ops-prototype.ts`, calling `PageWriter` from `src/server/share/index.ts` and the `token.apply` service through their area `index.ts`
- `src/ui/features/canvas/frame-more-menu.tsx`, `src/ui/features/canvas/frame-menu-model.ts`
- `src/ui/features/prototype/use-prototype-create.ts` and its prompt component
- `src/ui/features/home/` + menu model and copy (route list)

**Verify.**
1. Copy a small Next app to `/tmp/route-app` (as in rerun B). Do not use Bonaparte. Add it as a folder workspace. Add a route frame for `/`.
2. Frame menu, "Redesign as prototype", prompt "Make it denser". A new prototype opens beside the app in Studio's folder, with the route copied as the entry page and the run started. Shoot dark and light.
3. `grep -c "#[0-9a-f]\{6\}" <prototype>/index.html` is near 0 for colors that exist as tokens. `git status` in `/tmp/route-app` shows no change.
4. `pnpm exec tsx scripts/call-action.ts project.createPrototype '{"projectId":"<app>","prompt":"Make it denser","routePath":"/","viewport":null,"level":null,"name":null,"shouldStartRun":true}'` gives the same project shape on all 3 surfaces.
5. Run once read-only against Bonaparte (`apps/dashboard`) and check `git status` there before and after.

---

## 4. selection-prompt: floating prompt at the selection

**Why.** Figma Make point-and-edit opens a prompt box on the selected element. v0 Design Mode and annotations mode act on a clicked element. Claude Design inline comments sit on the element. doop runs @mention requests from the canvas. Here, the selection chip and `run.start` `selection` exist, but the prompt lives in the chat column. Cmd+I (`selection.ask-inline`) only focuses that composer. With the column closed (the canvas-first default from polish cycle 1), the user must open chat to prompt on a layer. That breaks "canvas first with floating panels".

**UI behaviour.**
- With a layer selected, Cmd+I (or a small "Ask" button on the selection label) opens a one-line floating composer under the selection, kept inside the viewport.
- Enter starts a run scoped to the selection (same request as the chat composer: `selection`, `editScope`). The box turns into a status line ("Working on Hero · 12 s") and closes when the run ends, then change-spotlight (pick 2) rings the result if it is merged.
- Esc closes. "Open in chat" moves the text to the chat composer. Shift+Enter adds a line.
- When the chat column is open, Cmd+I keeps today's behaviour (focus the chat composer). The floating box is for the closed column.

**Action surface.** No new action. The surface exists: `start_run` with `selection` and `editScope`, then `get_run`. The box is a view on `run.start`. This pick adds `selection` and `editScope` examples to the `run.start` field descriptions so outside agents use them (description text only, in `packages/common/actions/src/run/start.ts`).

**Main files.**
- `src/ui/features/canvas/live-overlay.tsx` (mount next to the selection), new `src/ui/features/canvas/selection-prompt.tsx`, new `src/ui/features/canvas/use-selection-prompt.ts`, new `src/ui/features/canvas/selection-prompt-model.ts`
- `src/ui/features/chat/use-ask-chat.ts` and `src/ui/platform/ask-chat.ts` (route Cmd+I to the box when the column is closed)
- `packages/common/actions/src/run/start.ts` (description text only)

**Verify.**
1. Dev run with `STUDIO_AGENT=mock`. Open a project (column closed). Click a heading, press Cmd+I, type "Make this shorter", Enter. The run starts with the heading as selection (check the run request in `get_run`). Shoot the box in dark and light, at 1440 and 1000 px.
2. With the column open, Cmd+I focuses the chat composer as before.
3. `pnpm run check:clip` shows no new finding for the box.

---

## 5. decision-chips: the agent states its choices, one click changes one

**Why.** Lovable can pause and show a question card with up to 4 questions and answer options. Open Design asks questions as an inline form in chat. Claude Design asks before it builds. Here, polish cycle 1 made questions opt-in, because a question before the build costs a model call and a click. The middle path keeps the speed: the agent does not stop. It builds with its best choice and lists 1 to 3 key choices as chips ("Layout: 3 tiers ▾", "Tone: warm ▾"). One click on another option sends it as a steer (run active) or a follow-up run (run done). No wait, and no blind guess.

**UI behaviour.**
- In the chat run body, a compact row shows "Chose: Layout 3 tiers · Tone warm · Hero photo". Each chip opens a small menu with 2 to 4 options and "Other…".
- A pick while the run is active sends a steer ("Use 2 tiers for Layout"). A pick after the run starts a follow-up run on the same frame. The row marks the picked option.
- The agent records choices only for real forks (layout, tone, density, content model). The prompt caps it at 3 per run. Short briefs still build at once.

**Action surface.**
- New `run.createDecision`: `POST /api/projects/:projectId/runs/:runId/decisions`, `access: "edit"`, `scope: "project"`, `needs: "project.update"`, `agent: { lean: true, name: "create_decision_run", set: "core", short: "Record one design choice you made, with 2 to 4 options, so the user can change it in one click." }`, `mcp: { name: "create_decision_run" }`, `invalidates: ["run.get"]`. Input: `projectId`, `runId`, `topic`, `chosen`, `options` (2 to 4 strings).
- New `run.setDecision`: `POST /api/projects/:projectId/runs/:runId/decisions/:decisionId`, `access: "edit"`, `needs: "project.update"`, `mcp: { name: "set_decision_run" }`, `agent: { off: "run-control" }`, `invalidates: ["run.get", "run.list"]`. Input: `projectId`, `runId`, `decisionId`, `option`. Output: `{ runId, isSteer }` (steer on an active run, else the new run id).
- `run.get` output gains `decisions: [{ id, topic, chosen, options, picked: string | null }]`, so `get_run` shows them to outside agents.

**Main files.**
- new `packages/common/actions/src/run/create-decision.ts`, new `packages/common/actions/src/run/set-decision.ts`, new `packages/common/actions/src/run/decision/schema.ts`, `packages/common/actions/src/run/schema.ts` (`decisions` on the run output only)
- new `src/server/handlers/run/create-decision.ts`, new `src/server/handlers/run/set-decision.ts`, `src/server/handlers/run/get.ts`
- new `src/server/run-log/decision-store.ts` (`RunDecisionStore`, write) next to the run log, wired in `src/server/handlers/run/live.ts`
- `src/server/agent/prompt.ts` (one short rule: record real forks with `create_decision_run`, at most 3)
- new `src/ui/features/chat/decision-row.tsx`, new `src/ui/features/chat/use-decision-row.ts`, new `src/ui/features/chat/decision-row-model.ts`, `src/ui/features/chat/run-body.tsx` (mount), `src/ui/features/chat/copy.ts`

**Verify.**
1. Start a mock run. `pnpm exec tsx scripts/call-action.ts run.createDecision '{"projectId":"<id>","runId":"<run>","topic":"Layout","chosen":"3 tiers","options":["3 tiers","2 tiers","1 plan"]}'`. The row shows in chat. Shoot dark and light.
2. Pick "2 tiers": during the run a steer shows in the chat; after it, a follow-up run starts on the same frame.
3. `get_run` over MCP lists the decision with `picked: "2 tiers"`. `set_decision_run` over MCP does the same as the click.
4. The mock agent does not call the tool. Check the prompt rule on one real run by hand: 0 to 3 chips, and the build does not wait.

---

## File ownership (no overlap)

| Pick | Owns |
|---|---|
| 1 live-build | `contracts/src/contracts.ts` (event union), `actions/run/get-draft.ts`, `actions/run/draft/**`, `handlers/run/get-draft.ts`, `agent/sdk-driver.ts`, `agent/mock.ts`, `agent/draft-store.ts`, `canvas/step-cover.tsx`, `canvas/frame-skeleton.tsx`, `canvas/draft-frame*.tsx`, `canvas/use-draft-frame.ts` |
| 2 change-spotlight | `actions/version/inspect-changes.ts`, `actions/version/changes/**`, `handlers/version/inspect-changes.ts`, `handlers/version/live.ts`, `server/store/engine/to-changed-layers.ts`, `server/store/change-reader.ts`, `canvas/stage-overlay.tsx`, `canvas/change-*.tsx`, `canvas/use-change-rings.ts` |
| 3 route-prototype | `actions/project/create-prototype.ts`, `actions/project/schema.ts`, `handlers/project/create-prototype.ts`, `project-ops/project-ops-prototype.ts`, `canvas/frame-more-menu.tsx`, `canvas/frame-menu-model.ts`, `features/prototype/**`, the Home + menu files |
| 4 selection-prompt | `canvas/live-overlay.tsx`, `canvas/selection-prompt*.tsx`, `canvas/use-selection-prompt.ts`, `chat/use-ask-chat.ts`, `platform/ask-chat.ts`, `actions/run/start.ts` (text only) |
| 5 decision-chips | `actions/run/create-decision.ts`, `actions/run/set-decision.ts`, `actions/run/decision/**`, `actions/run/schema.ts`, `handlers/run/create-decision.ts`, `handlers/run/set-decision.ts`, `handlers/run/get.ts`, `run-log/decision-store.ts`, `agent/prompt.ts`, `chat/decision-row*.tsx`, `chat/use-decision-row.ts`, `chat/run-body.tsx`, `chat/copy.ts` |

Shared, by design:
- `handlers/run/live.ts`: picks 1 and 5 each add one service to the layer. Merge 1 first, then 5 adds one line.
- `features/canvas/copy.ts`: picks 1, 2, 3 and 4 each add one block of strings. Merge in rank order.
- `@generated` files (`all-actions.generated.ts`, per-domain `routes.ts`, `handlers.ts`, `index.ts`): run `pnpm exec tsx scripts/gen-routes.ts` after each merge. These are not overlap.
- `artifacts/mcp-snapshots/*.json`: picks 1, 2, 3 and 5 change the tool list. Approve each diff at merge.
- Add each pick's globs to `.claude/goal/roadmap.md` Appendix A before its slice runs (L6e).
- Order: 1 and 2 first (no shared files). Pick 4 is best merged after 2 (it uses the rings), but does not need it.

## Runners-up

1. Agent engine choice: run Codex or Gemini CLI as the in-app agent (Open Design, doop multi-provider); high effort.
2. Export a frame to Figma as editable layers (doop Cloud, html.to.design; Claude Design has none); needs a Figma plugin.
3. Send to Canva (Claude Design export); needs the Canva Connect API and an account.
4. Proposed rules from manual edits: when the user fixes the same thing twice, offer a project rule (doop design memory "proposed style rules"); `design-rule.create` exists, the proposal does not.
5. Staged manual edits: queue inspector edits in the prompt box for review before they write (Figma Make edit tool).
6. Follow mode and live cursors in the share viewer (doop multiplayer).
7. Inspiration search: find reference screens by text and pin them (doop asset tools).
8. Signed webhooks and approval-triggered automations (doop).
9. Play in one click from the top bar (benchmark friction 12; a fix).
10. Cut the project name at a clause, and show oklch swatches in the inspector (benchmark friction 10 and 14; fixes).

## Results

- Merged: live-build, change-spotlight, route-prototype, selection-prompt, decision-chips. Main at 9c64a5bbc.
- Conflicts: decision-chips vs live-build in `handlers/run/live.ts`, `run-log/index.ts`, `packages/common/actions/package.json`. Resolved by keeping both sides, then gen-routes.
- Checks: typecheck 0 errors, lint:gate pass (59671, baseline 89733), build:ui pass, desktop:pack pass.
- Installed app: :4570 returns 200. Server idle CPU 0.01 CPU-s/min. No headless Chrome when idle.
- Open: live build and decision chips need one real-model run each. MCP snapshots not refreshed for the new tools (user decision). Selection prompt has no This use / All uses choice.
