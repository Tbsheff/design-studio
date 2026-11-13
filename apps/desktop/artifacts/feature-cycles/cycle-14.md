# Feature cycle 14: next 5 features

Date: 2026-11-13. Read-only research. No code changed.

Goal: Figma-level manual editing and Claude Design quality, fully headless (each feature works from the UI, the in-app agent where it fits, and as an MCP tool), simple and fast, canvas first with floating panels. Prototypes go beside the app by default. App edits are opt-in.

## Method

- Read `cycle-13.md` (10 runners-up, skipped-as-built list), the 5 cycle-13 reports (`cycle-13/*.md`, their "left out" lists), `.claude/goal/feature-log.md` (rounds 19 to 28), `bonaparte-benchmark.md`, the `journeys-run/*.md` result tables and `git log --oneline -60`.
- Checked each candidate with narrow greps in `packages/common/actions/src/*` and `apps/desktop/src/{ui,server,bridge}`, and read the closest action description before calling it missing.
- Competitor recheck by web search on 2026-11-13. Sources marked (2nd) are aggregators or blogs, not vendor pages.
  - Claude Design: runs in any Claude chat and in Claude Code; June overhaul added drag, resize and align on the canvas and a two-way `/design-sync` with Claude Code; a November blog (2nd) lists Figma export, version history and multiplayer as missing. claude.com/design, blog.mean.ceo (2nd), mejba.me (2nd).
  - Figma Make: question cards before a build, instant versioning, voice dictation (Apr 30, 2nd); local code editing beta (May 28); code layers, motion and shader effects (Config, Jun 24). techcrunch.com, figma.com/blog/figma-make-now-on-your-local-code.
  - v0: element screenshot attach in Design Mode (v0.dev/changelog, Mar 20); floating toolbar and numbered annotations (Jun, 2nd).
  - Lovable: design previews (several directions before a build, May 11, 2nd), draw to build (Jun 15, 2nd), November runs are platform items (SBOM, visitor error catch, memory tidy, subfolder AGENTS.md) (havoptic.com, 2nd).
  - Bolt: design systems attached to an existing project, voice dictation, Figma frame import (support.bolt.new release notes, 2nd).
  - doop (github.com/kgoedecke/doop README): streamed designs, screenshot self-review, design memory with saved decisions, "needs review" after a ready frame changes, design sync from a live app, multi-provider agent, automations.

### Skipped as built (checked)

Everything in the cycle-13 list, plus the 5 cycle-13 picks (live-build first build, change-spotlight, route-prototype, selection-prompt, decision-chips). New competitor items that exist here: draw to build (`markup.create`), design previews (`variation.start`), annotations sent as one run (`comment.start`), question cards (decision chips, opt-in clarify), visitor/runtime errors with a fix (`review/errors-chip.tsx`, Fix this and Fix all), "needs review" after a change (`dev-status.list` `isChangedSince`), shader and motion effects (`effect` presets, `motion`, `animation`), screenshot self-check (`compare_to_reference`, critique). Manual editing checked: arrow reorder in auto layout (`bridge/keyboard.ts` `forwardReorderKey`), in-flow nudge (`d20ccad54`), min and max size rows, spacing handles, distribute, copy and paste style (`layer-style`). Manual editing has no large gap left that is not a fix, so no pick is a pure manual tool. Picks 3 and 4 make manual control of AI output better.

### Skipped by rule

Fixes are not picks (Bonaparte tokens, Keep with no undo, auto layout on absolute children). They lead the runners-up. No pick adds a docked panel.

## Ranking

Score = user value for real-app AI design x fit with "simple and fast" / effort (1 to 5 each).

| Rank | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|
| 1 | live-edit: the frame shows an edit as the agent writes it | 5 | 5 | 3 | 8.3 |
| 2 | next-screen: drag a link to empty canvas to design the screen it opens | 5 | 5 | 3 | 8.3 |
| 3 | layer-undo: undo exactly one changed layer | 4 | 5 | 3 | 6.7 |
| 4 | rule-proposals: repeated manual fixes become a proposed rule | 4 | 4 | 3 | 5.3 |
| 5 | port-check: score how well the app route matches its prototype | 4 | 4 | 3 | 5.3 |

Live-edit ranks first: after the first build, nearly every run is an edit, and today an edit shows nothing until the file lands.

---

## 1. live-edit: the frame shows an edit as the agent writes it

**Why.** Cycle 13 live-build streams only the first `Write` of a new page into the first-build cover. Its report left out: edit drafts (path and bytes only), rewrites of an existing page, and late joiners (no `run.getDraft` on mount). Most real work is "make the hero darker" on a page that exists, so the frame stays still for the whole run. doop streams every design change to viewers. Claude Artifacts and v0 show code as it is written.

**UI behaviour.**
- During a run, when the agent sends an `Edit` (or a `Write` that replaces an existing page) on an `.html` file that a frame shows, a sandboxed `srcdoc` layer (no scripts) covers that frame with the current file text plus the partial edit. It refreshes at most every 250 ms.
- The "Writing index.html · 3 KB" bar from live-build shows at the frame top.
- When the version lands and the real frame fires `load`, the layer fades out (no flash). Change-spotlight rings then show as today.
- An `Edit` whose `old_string` is not found once in the file shows the bar only, no layer.
- A reload or a second window during the run fetches `run.getDraft` once on mount, then follows the events.
- React and app files: bar only (they need a build). No new panel. No setting.

**Action surface.** No new action.
- `run.getDraft` (`get_draft_run`) output gains `kind: "write" | "edit"` (required). For an edit, `html` is the composed page: the base file text with `old_string` replaced by the partial `new_string`. A later edit in the same run builds on the last draft. `html` stays cut at 256 KB.
- `run.write.delta` stays as it is. For `kind: "edit"`, the UI refetches `run.getDraft` on the event (one call in flight), never on a timer (U12).
- MCP: an outside agent that starts a run with `start_run` reads the same draft with `get_draft_run`.

**Main files.**
- `src/server/agent/draft-stream.ts` (also decode `old_string`; mark `Edit` vs `Write`)
- `src/server/agent/run-draft-feed.ts`
- `src/server/run-log/run-draft-map.ts`, `src/server/run-log/run-draft-store.ts` (compose the edit draft; read the base file once per run from the direction work tree)
- `packages/common/actions/src/run/draft/schema.ts` (`kind`), `src/server/handlers/run/get-draft.ts`
- `src/server/agent/mock-draft.ts` (mock streams one `Edit` in 4 chunks on a follow-up run, so the mock shows the view)
- `src/ui/features/canvas/draft-frame.tsx`, `draft-frame-model.ts`, `use-draft-frame.ts`, `draft-status.tsx`, `stage-artboard.tsx` (mount the layer over an existing frame, not only in the first-build cover)

**Verify.**
1. `STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev`. Prompt "A pricing page for a coffee subscription". When done, prompt "Make the hero darker".
2. The frame shows the darker hero before the run ends, then the real frame with no blank flash. Shoot dark and light.
3. Reload during the second run: the draft layer comes back at once.
4. `pnpm exec tsx scripts/call-action.ts run.getDraft '{"projectId":"<id>","runId":"<run>"}'` during the edit gives `kind: "edit"` and growing `bytes`; after it, `isComplete: true`. HTTP and MCP match.
5. Manual: one real-model edit run. Time to the first visible change must be under 5 s.

---

## 2. next-screen: drag a link to empty canvas to design the screen it opens

**Why.** Prototypes are flows, not single pages. Figma Make and Claude Design build multi-screen flows from chat. doop links frames into clickable prototypes. Here the link handle (`canvas/use-link-drag.ts`) links an element only to a frame that exists: a drop on empty canvas does nothing. `screen.create` makes app routes only. To add "the screen after Book visit" in a prototype, the user must prompt for a new page, wait, add a frame, then drag the link. This pick makes it one gesture.

**UI behaviour.**
- Drag the link handle of a selected button or link to empty canvas. A dashed ghost frame shows right of the source frame, with a one-line floating prompt: "What does "Book visit" open?".
- Enter creates the page, the frame and the link, and starts a run that designs the page. The new frame shows the live-build cover while the agent writes it. Empty Enter uses a default prompt from the label. Esc cancels and writes nothing.
- The new page copies the `<head>` of the source page (tokens link, fonts, shared CSS), so it starts in the same style.
- Play follows the new link at once.
- HTML prototypes only. In an app project, the drop shows a short note that points to New screen (`screen.create`). The app is never written.

**Action surface.**
- New `canvas.createLinkedFrame`: `POST /api/projects/:projectId/canvas/linked-frames`, `access: "edit"`, `scope: "project"`, `needs: "project.update"`, `confirm: "none"`, `mcp: { name: "create_linked_frame_canvas" }`, `agent: { lean: true, name: "create_linked_frame_canvas", set: "core", short: "Add a page and a frame for the screen that a button or link opens, and link them. Pass shouldStartRun false, then write the page." }`, `invalidates: ["canvas.getDoc", "canvas.listLinks", "version.list", "run.list"]`.
- Input: `projectId`, `directionId` (null default), `fromFrame`, `selector`, `label: string | null`, `path: string | null` (default: slug of the label, made unique), `prompt: string | null`, `shouldStartRun` (decoding default `true`).
- Output: `{ frameId, path, linkId, runId: string | null }`.
- Errors: `BadRequest` (app project: "Use create_screen"), `Conflict` (path exists), `NotFound` (frame or selector), `RunInProgress` (start asked while a run is active).
- The in-app agent calls it with `shouldStartRun: false` and writes the page itself, so it can build a flow in one run. An outside agent calls it with `true`.

**Main files.**
- new `packages/common/actions/src/canvas/create-linked-frame.ts`, new `packages/common/actions/src/canvas/linked-frame/schema.ts`
- new `src/server/handlers/canvas/create-linked-frame.ts`, `src/server/handlers/canvas/live.ts`
- new `src/server/canvas/linked-frame/linked-frame-writer.ts` (`LinkedFrameWriter`, write: page file, frame, link, one version), new `src/server/canvas/linked-frame/engine/to-linked-page.ts` (pure: head copy, blank body, slug), exported from `src/server/canvas/index.ts`
- `src/ui/features/canvas/use-link-drag.ts` (drop on empty canvas), `link-drag-line.tsx` (ghost frame), new `canvas/linked-frame-prompt.tsx`, new `canvas/use-linked-frame.ts`, new `canvas/linked-frame-model.ts`

**Verify.**
1. Mock dev run. Make a page with a "Book visit" button. Select the button, drag its link handle to empty canvas, type "A booking form with date and time", Enter.
2. A new frame right of the source shows the build cover, then the page. Play: click "Book visit" opens it. Shoot dark and light, at 1440 and 1000 px.
3. `pnpm exec tsx scripts/call-action.ts canvas.createLinkedFrame '{"projectId":"<id>","directionId":null,"fromFrame":"<frame>","selector":"<sel>","label":"Book visit","path":null,"prompt":null,"shouldStartRun":false}'`: the same frame, path and link on HTTP, MCP and agent (path made unique per call).
4. On an app project the drop shows the note, and `git status` in the app is clean.

---

## 3. layer-undo: undo exactly one changed layer

**Why.** Change-spotlight undo calls `revert_hunk` (`version.applyHunk`). Its report says changes 3 lines apart or closer share one hunk, so "Undo" can revert more than the ringed layer; in a 6-edit batch one hunk held all 6. "A finer undo needs a new write action." Keep-or-undo per change is how v0 Design Mode and Figma Make build trust in AI edits. Claude Design still has no version history (November blog, 2nd).

**UI behaviour.**
- The change pill's undo button always reads "Undo this change" and reverts only the current ring's layer: its start tag (style), its content (text), the whole element (added), or puts the element back at its old place (removed).
- The ring turns grey and the pill steps to the next change. Cmd+Z takes the undo back, as today.
- If the layer changed again after that version, the button falls back to today's hunk undo with its "Undo N changes" label.

**Action surface.**
- New `version.restoreChange`: `POST /api/projects/:projectId/d/:directionId/changes/restore`, `access: "edit"`, `scope: "project"`, `needs: "project.update"`, `confirm: "none"`, `mcp: { name: "restore_change_version" }`, `agent: { lean: true, name: "restore_change_version", set: "core", short: "Undo one changed layer from a version, as listed by inspect_changes_version, and keep the other changes." }`, `invalidates: ["version.list", "version.inspectChanges", "canvas.getDoc"]`.
- Input: `projectId`, `directionId`, `versionId` (the version that made the change), `layerId`, `file`, `kind`.
- Output: `{ versionId, file, kind }` (the new version).
- Errors: `Conflict` when the head no longer holds the element as that version left it ("The layer changed again. Use revert_hunk."), `NotFound`.

**Main files.**
- new `packages/common/actions/src/version/restore-change.ts`, `packages/common/actions/src/version/changes/schema.ts` (output schema)
- new `src/server/handlers/version/restore-change.ts`, `src/server/handlers/version/live.ts`
- new `src/server/store/engine/to-restored-layer.ts` (pure: from text, to text, head text and the element spans give the new head text, or a conflict code)
- new `src/server/store/change-restore-writer.ts` (`ChangeRestoreWriter`, write; reads spans through `change-spans.ts`, writes one version), export line in `src/server/store/index.ts`
- `src/ui/features/canvas/change-pill.tsx`, `use-change-rings.ts`, `change-rings-model.ts`

**Verify.**
1. Mock dev run on an HTML page. Over MCP, `batch_edit` 3 neighbour layers (color, text, padding) in one call, so they share one hunk.
2. The pill shows 3 changes. Step to the second and click "Undo this change": only that layer reverts; the other 2 keep their edits. Cmd+Z brings it back. Shoot dark and light.
3. `pnpm exec tsx scripts/call-action.ts version.restoreChange '{...}'` on a fresh direction per surface: HTTP, MCP and agent each revert one layer.
4. Edit the same layer by hand, then call it on the old version: `Conflict`.
5. A JSX sample (as in change-spotlight) gives the same result for `style` and `text`.

---

## 4. rule-proposals: repeated manual fixes become a proposed rule

**Why.** Cycle-13 runner-up 4. When a user fixes the agent's output by hand, the next run makes the same mistake. doop design memory keeps "saved decisions" and proposes style rules. Lovable now tidies project memory in the background (Nov 4, 2nd). Here `design-rule.create` turns a chat correction into a rule, but nothing notices repeated manual edits. This links manual editing to design quality: fix it twice, and the agent learns it.

**UI behaviour.**
- After a manual edit, when the same style change has happened at least 3 times (or on 2 different layers) in recent manual versions, a one-line card shows at the inspector foot: "You set radius to 12px on cards 3 times. Make it a rule?" with Make rule and Dismiss.
- Make rule saves the rule through the same path as `design-rule.create`. The Review rules editor shows it, and later runs follow it.
- Dismiss hides that proposal for good. The card never blocks the inspector and shows at most one proposal at a time.

**Action surface.**
- New `design-rule.inspectProposals`: `GET /api/projects/:projectId/design-rules/proposals`, `access: "read"`, `scope: "project"`, `needs: "project.read"`, `mcp: { name: "inspect_proposals_design_rule" }`, `agent: { lean: false, name: "inspect_proposals_design_rule", set: "core", short: "List style changes the user made by hand more than once, as proposed design rules, to match the user's taste." }`, `invalidates: []`. Bounded (at most 5 open proposals), so `inspect`, not `list`. Input: `projectId`, `directionId` (null default). Output: `{ items: [{ id, text, property, value, count, layerIds }] }`.
- New `design-rule.setProposal`: `POST /api/projects/:projectId/design-rules/proposals/:proposalId`, `access: "edit"`, `needs: "project.update"`, `mcp: { name: "set_proposal_design_rule" }`, `agent: { lean: false, name: "set_proposal_design_rule", set: "core", short: "Accept or dismiss one proposed design rule. Accept saves it as a project rule." }`, `invalidates: ["design-rule.inspectProposals", "direct-edit.getRules"]`. Input: `projectId`, `proposalId`, `status: "accepted" | "dismissed"`. Dismiss is `set` with a status, not `delete` (E18).
- Proposals come only from versions with `meta.kind: "manual"`, read through the existing `ChangeStore` (style items and their hunk lines), never from the `editSummary` text. No hook in `direct-edit/commit/*` (hot area, partly frozen until S5-direct-edit).

**Main files.**
- new `packages/common/actions/src/design-rule/inspect-proposals.ts`, `set-proposal.ts`, new `packages/common/actions/src/design-rule/proposal/schema.ts`
- new `src/server/handlers/design-rule/inspect-proposals.ts`, `set-proposal.ts`, `src/server/handlers/design-rule/live.ts`
- new `src/server/design-rules/engine/to-rule-proposals.ts` (pure: changed style items to CSS property and value changes, grouped and counted; Tailwind class swaps count too)
- new `src/server/design-rules/rule-proposal-store.ts` (`RuleProposalStore`, read), new `src/server/design-rules/rule-proposal-writer.ts` (`RuleProposalWriter`, write: status file, and accept through the existing rule writer), `src/server/design-rules/index.ts`
- new `src/ui/features/inspector/rule-proposal-card.tsx`, `use-rule-proposal.ts`, `rule-proposal-model.ts`, `inspector/copy.ts`, one mount line in `inspector/inspector-edit-pane.tsx`

**Verify.**
1. Mock dev run on a page with 3 cards. Set the radius of each card to 12px by hand in the inspector.
2. After the third edit (or the second card), the card shows. Make rule: the rule shows in Review rules. Shoot dark and light.
3. Dismiss on a second proposal: it does not come back after a reload.
4. `pnpm exec tsx scripts/call-action.ts design-rule.inspectProposals '{"projectId":"<id>","directionId":null}'`: the same items on HTTP, MCP and agent. `design-rule.setProposal` with `dismissed` on all 3 surfaces.
5. Manual: one real-model run after accept; the agent uses 12px on a new card.

---

## 5. port-check: score how well the app route matches its prototype

**Why.** For real apps, the hard step is prototype to code. Move to app (`port.start`) starts an agent run that writes React routes, but nothing measures how close the result is to the prototype. Claude Design added a two-way `/design-sync` with Claude Code. Figma Make now works on local code. `compare_to_reference` (`comment.inspectPicture`) scores a frame against a picture, but nobody joins it to a port. This pick gives the port run a self-check and the user one number.

**UI behaviour.**
- When a Move to app run ends, its chat run body shows a row: "Matches the prototype: 86% · 2 areas differ · Show diff". Under 80% the row is amber and has "Fix differences", which starts a follow-up run with the worst areas named.
- Show diff opens the side-by-side diff PNG in the existing image preview.
- The port prompt tells the agent to call `inspect_port` before it reports done, and to fix areas under 80.
- Read only. It writes only the diff PNG in the data dir, never the app.

**Action surface.**
- New `port.inspect`: `GET /api/projects/:projectId/port/match`, `access: "read"`, `scope: "project"` (the prototype project), `needs: "project.read"`, `mcp: { name: "inspect_port" }`, `agent: { lean: true, name: "inspect_port", set: "app", short: "Compare the app route you built with its prototype page. Returns a score from 0 to 100 and the areas that differ most." }`, `invalidates: []`.
- Input: `projectId`, `directionId` (null default), `path` (prototype page), `targetProjectId` (the app), `routePath`, `width` (decoding default 1280).
- Output: `{ score, isLow, areas: [{ row, col, score }], diffPath, prototypePath, appPath }`.
- Errors: `BadRequest` (target not an attached app, dev server down), `NotFound` (page or route).
- Engine: reuse the score of `comment.inspectPicture` (content 20%, edges 80%, 3x3 areas) on two renders at one width. If the reuse import is not allowed by boundaries, move the pure score into an engine file first.

**Main files.**
- new `packages/common/actions/src/port/inspect.ts`, `packages/common/actions/src/port/schema.ts` (output schema)
- new `src/server/handlers/port/inspect.ts`, `src/server/handlers/port/live.ts`
- new `src/server/port-check/port-match-store.ts` (`PortMatchStore`, read: render both pages through the preview service, score, write the diff PNG), new `src/server/port-check/index.ts`
- `src/server/agent/port-start.ts` (one prompt line; put the prototype page and route in the run request if they are not there)
- new `src/ui/features/chat/port-check-row.tsx`, `use-port-check.ts`, `port-check-model.ts`, `chat/copy.ts`, one mount line in `chat/run-body-content.tsx`

**Verify.**
1. Use the cycle-13 test app (`/Volumes/DevProjects/code/ds-wt/route-app`, or a fresh copy in `/tmp`). Do not use Bonaparte. Make a prototype, then Move to app with the mock agent.
2. The run row shows a score and Show diff opens the diff. Shoot dark and light.
3. `pnpm exec tsx scripts/call-action.ts port.inspect '{"projectId":"<proto>","directionId":null,"path":"index.html","targetProjectId":"<app>","routePath":"/new","width":1280}'`: the same score on HTTP, MCP and agent.
4. Edit the app route by hand to differ: the score drops and the area list names the changed part.
5. `git status` in the app shows only the port run's files.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 live-edit | `agent/draft-stream.ts`, `agent/run-draft-feed.ts`, `agent/mock-draft.ts`, `run-log/run-draft-{map,store}.ts`, `actions/run/draft/**`, `handlers/run/get-draft.ts`, `canvas/draft-*.tsx`, `canvas/draft-frame-model.ts`, `canvas/use-draft-frame.ts`, `canvas/stage-artboard.tsx` |
| 2 next-screen | `actions/canvas/create-linked-frame.ts`, `actions/canvas/linked-frame/**`, `handlers/canvas/create-linked-frame.ts`, `handlers/canvas/live.ts`, `server/canvas/linked-frame/**`, `canvas/use-link-drag.ts`, `canvas/link-drag-line.tsx`, `canvas/linked-frame-*`, `canvas/use-linked-frame.ts` |
| 3 layer-undo | `actions/version/restore-change.ts`, `actions/version/changes/schema.ts`, `handlers/version/restore-change.ts`, `handlers/version/live.ts`, `store/engine/to-restored-layer.ts`, `store/change-restore-writer.ts`, `canvas/change-pill.tsx`, `canvas/use-change-rings.ts`, `canvas/change-rings-model.ts` |
| 4 rule-proposals | `actions/design-rule/{inspect-proposals,set-proposal}.ts`, `actions/design-rule/proposal/**`, `handlers/design-rule/**`, `server/design-rules/engine/to-rule-proposals.ts`, `server/design-rules/rule-proposal-*.ts`, `server/design-rules/index.ts`, `inspector/rule-proposal-*`, `inspector/use-rule-proposal.ts`, `inspector/copy.ts`, `inspector/inspector-edit-pane.tsx` |
| 5 port-check | `actions/port/inspect.ts`, `actions/port/schema.ts`, `handlers/port/**`, `server/port-check/**`, `agent/port-start.ts`, `chat/port-check-*`, `chat/use-port-check.ts`, `chat/copy.ts`, `chat/run-body-content.tsx` |

Shared files (named from the cycle-13 "outside the pick list" sections):
- `src/ui/features/canvas/copy.ts`: picks 1, 2 and 3 each add one block. Merge in rank order.
- `src/server/store/index.ts`: pick 3 adds one export line. Pick 4 only imports `ChangeStore` from it.
- `src/ui/app/main.tsx`: one CSS import per pick that adds a stylesheet (likely 2, 4, 5).
- `src/ui/platform/event-hub.ts` and `src/server/events/index.ts`: pick 1 only if it adds an event field; prefer no change.
- `src/server/agent/prompt.ts`: no pick needs it (pick 5 uses the port prompt in `agent/port-start.ts`). If pick 2 adds a flow rule, it is one line.
- `src/ui/features/canvas/stage-overlay.tsx`: no pick should need it (pick 2 mounts from the link drag layer). If one does, it is one mount line.
- `@generated` files (`all-actions.generated.ts`, per-domain `routes.ts`, `handlers.ts`, `index.ts`): run `pnpm exec tsx scripts/gen-routes.ts` after each merge.
- `artifacts/mcp-snapshots/*.json`: picks 2, 3, 4 and 5 add tool names. Approve each diff at merge.
- `.claude/goal/roadmap.md` Appendix A: add each pick's globs before its slice runs (L6e).
- Order: all 5 can run at once. Merge 1 before 3 (both touch canvas copy and the change flow), and 3 after change-spotlight code is stable.

## Runners-up

1. Bonaparte tokens in prototypes (benchmark friction 9; fix): `components.json` points at `../../packages/ui/src/styles/globals.css`, and `safeFileInside` likely refuses it when the root is the app folder; without tokens, the route-prototype token sweep does nothing.
2. Undo for variation Keep and frame X (journey 2 fail; fix): both act with no confirm, and Cmd+Z brings no frame back.
3. Auto layout on absolute children (journey 10; fix): Shift+A writes flex and gap, but the children stay `position: absolute`.
4. Screenshot to screen: drop or paste an image on empty canvas to recreate it as a new page (`screen.import`, `import_screen`); Home and chat take images already, so it is a shortcut.
5. Selection crop: send a PNG crop of the selected layers with a selection run (v0 element screenshots); `<selected-elements>` is text only today.
6. Refresh a route prototype from the app: re-copy the source route and show what changed in the app since the copy (doop design sync).
7. Export a frame to Figma as editable layers (Claude Design still lacks it, doop Cloud has it); needs a Figma plugin.
8. Agent engine choice (Codex, Gemini CLI, OpenRouter models), as in doop and Open Design; high effort.
9. Scale tool (K): scale a layer with its font sizes, padding, gap and radius (Figma); the only manual tool gap found.
10. Voice prompt (Figma Make, Bolt); low: macOS dictation already works in any text field, and Chromium speech recognition in Electron likely needs Google keys (not checked).
