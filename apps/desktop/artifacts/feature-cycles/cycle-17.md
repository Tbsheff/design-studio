# Feature cycle 17: next 5 features

Date: 2026-11-13. Main at `89a0df52d` (all 5 cycle-16 picks merged).

## Method

- Read `cycle-16.md` (runners-up, "Results" open items), the 5 `cycle-16/*.md` reports ("Left out"), the runners-up and results of `cycle-13.md`, `cycle-14.md` and `cycle-15.md`, the round 28 specs in `.claude/goal/feature-log.md`, and `git log --oneline -80`.
- Checked each candidate with narrow greps in `packages/common/actions/src`, `packages/common/contracts/src` and `apps/desktop/src/{ui,server}`. Checked each new action id and tool name against `packages/common/actions/src` and `apps/desktop/artifacts/mcp-snapshots/*.json`: no clash. Tool names use the derived form `<verb>_<object>_<domain>`, as `move_frames_canvas` and `inspect_source_page` do (N2a). `needs` copies the sibling actions of the same domain.
- Checked Bonaparte on disk (read-only), counted as `.tsx` files that match, under `apps` and `packages`: `text-pretty` 50 files, `sr-only` 264 files, `dark:` 254 files. (Round 28 counted matches, not files, so its numbers are higher.) `DESIGN.md` is already read by `agent/design-md-digest.ts`.
- Branch check: `git branch --list 'feat/*'` has no `feat/frame-select`, `feat/route-merge`, `feat/auto-layout-padding`, `feat/reader-view` or `feat/text-wrap`.
- Competitor recheck (web search, 2026-11-13). Cycle 16 checked the same day.
  - Figma Make: a two-way GitHub integration that turns designs into production code, with governance (venturebeat.com). Here, `ship-pr` is one way, and `page.inspectSource` only flags app drift. Pick 2 moves app changes back into an edited prototype.
  - Claude Design, v0, Lovable, Bolt, Open Design, doop: nothing new since cycle 16. doop is still the August 2026 open-source MCP canvas (chatgate.ai, glama.ai).

## Skipped as built (checked this cycle)

Everything in the cycle-13 to 16 lists, plus the 5 cycle-16 picks (import-versions, auto-layout-children, tidy-frames, screen-drop-finish, route-sync). Also checked:
- Layer marquee: `canvas/marquee-layer.tsx` draws the layer marquee that the bridge sends from inside a frame. It does not select frames.
- Gradient fill: `features/fill/gradient-fields.tsx`. Pin constraints: `inspector/pin-select.tsx`. Hug and fill sizing: `inspector/sizing-model.ts`. Rulers: `canvas/canvas-rulers.tsx`. Distance lines: `canvas/measurements.tsx`. Copy and paste style: `features/layer-style`.
- Start points: `links.ts` has one `start` frame only (`canvas.setStartLink`, tool `set_start_frame`). Not built. Runner-up.

## Open item: "a frame move alone makes no version"

This is by design. Do not pick it now.
- `recordLayout` in `server/canvas/layout-steps.ts` records each layout change as an undo step against the current version (`toRecordVersionId`), with `files: []`. The layout goes in with the next file version.
- Restore keeps the live layout on purpose (`resetForRestore`). A version that holds only a layout would not move frames back on restore, so it would add rows to Versions that do nothing.
- Canvas Cmd+Z covers a frame move today.
- Runner-up 1 states what a narrow fix would be.

## Ranking

Score = user value for real-app AI design x fit with "simple and fast" / effort (1 to 5 each).

| Rank | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|
| 1 | frame-select: select several frames, then move, delete or tidy them together | 5 | 5 | 3 | 8.3 |
| 2 | route-merge: bring app changes into an edited route prototype with AI | 5 | 4 | 3 | 6.7 |
| 3 | auto-layout-padding: Shift+A keeps the stack in place with padding | 4 | 5 | 2 | 10 |
| 4 | reader-view: what a screen reader says for a whole frame | 4 | 4 | 3 | 5.3 |
| 5 | text-wrap: Balance, Pretty and No wrap in the text section | 3 | 5 | 1 | 15 (capped by value) |

Frame select ranks first. It is the largest Figma manual-editing gap left on the canvas, and it closes 2 cycle-16 left-out items: tidy on some frames only, and route-sync "Compare" that cannot select both frames. Route merge is the Bonaparte pick with the most value. Today a prototype only says "App changed". The designer must then redo the change by hand, or copy the route again and lose the prototype edits. Auto-layout padding and text wrap are cheap. Auto-layout padding finishes a cycle-16 pick. Text wrap is the cheapest Bonaparte item. Reader view is the second Bonaparte item, for a healthcare app with 264 `sr-only` files.

---

## 1. frame-select: select several frames, then move, delete or tidy them together

**Why.** In Figma, you Shift-click or drag a box to select frames, then move, delete, tidy or align them as one. Here, the canvas has one active frame only (`use-canvas-frames.ts`). Cycle-16 tidy-frames and route-sync both left this out ("no frame multi-select store yet"). Runs, next-screen and screen-drop make many frames, so a user must clean them up one at a time.

**UI behaviour.**
- Shift-click a frame label adds or removes that frame from the frame selection. A plain click selects one frame, as today.
- A drag on empty canvas, with no draw tool on and no frame under the pointer, draws a box. Each frame that the box touches joins the selection. Shift+drag adds to the selection.
- Cmd+A with no layer in focus selects all frames. Esc clears the selection.
- Selected frames show the accent outline and label. The label row shows "3 frames".
- Drag a selected label: all selected frames move together. The drop sends one `canvas.updateFrame` call with every frame and its new `x`/`y`, which makes one layout undo step. Snap guides use the bounds of the group.
- Arrow keys nudge all selected frames, 1 px, or 10 px with Shift (the same steps as `frame-name-button.tsx`).
- Delete or Backspace removes all selected frames with one toast: "3 frames removed. Undo". Cmd+Z brings all of them back in one step.
- Ctrl+Alt+T and "Tidy up frames" act on the selected frames only when 2 or more are selected. Otherwise they act on all frames, as today. This needs no server change, because `canvas.moveFrames` already takes `frames`.
- A frame selection and a layer selection do not exist at the same time. A click in a frame clears the frame selection.

**Actions.**
- New: `canvas.deleteFrames`, DELETE `/api/projects/:projectId/canvas/frames/many`. Copy `canvas.deleteFrame`: `access: "destructive"`, `confirm: "user"` with a `preview` that lists the frame labels, `needs: "project.update"`, `scope: "project"`. Input: `projectId`, `frames` (1 to 50 frame ids or `@labels`). Output: `{ removedFrames: [{ id, label }] }`. The page files stay. It records one layout history step with all removed frames, so one Cmd+Z restores all of them. `invalidates`: `canvas.getDoc`, `canvas.inspect`, `canvas.listLinks`. MCP and agent: `delete_frames_canvas` (agent set `core`, as `remove_frame`).
- Reused: `canvas.updateFrame` (`canvas_place`) for the group move, and `canvas.moveFrames` (`move_frames_canvas`) for the tidy.
- The UI delete runs the same way `remove_frame` runs from the UI today. The approval card applies to MCP and agent calls.

**Main files.**
- New: `packages/common/actions/src/canvas/delete-frames.ts`. Add the output struct to `actions/canvas/frame/schema.ts` (one block).
- New: `src/server/handlers/canvas/delete-frames.ts`. New `src/server/canvas/frame-delete/{frame-delete-ops.ts,index.ts}`. Do not grow `frame-ops.ts` (475 lines). One method `deleteFrames` in `canvas-writer.ts`, and one export line in `server/canvas/index.ts`. If `LayoutChange` holds one removed frame only, widen it to a list in `layout-steps.ts` and `layout-history.ts`, and keep the old single-frame shape working.
- New UI: `src/ui/features/canvas/{frame-selection-store.ts,frame-selection-model.ts,use-frame-selection.ts,frame-marquee.tsx}`. Use `createLiveStore` from `ui/platform/live-store.ts` (S21a).
- Changed UI: `canvas/frame-label.tsx` and `canvas/frame-name-button.tsx` (Shift-click, nudge), `canvas/frame-drag.ts` (group drag), `canvas/use-stage-keys.ts` (Delete, Esc, Cmd+A), `canvas/use-tidy-frames.ts` (pass the selected frames), one block in `canvas/copy.ts`.

**Verify in the running app** (`STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev`):
- A project with 6 frames. Shift-click 3 labels: all 3 show the accent outline and "3 frames". Drag one of them: all 3 move, and the other 3 do not. Cmd+Z moves all 3 back in one step.
- Drag a box on empty canvas over 4 frames: 4 are selected. Press Delete: one toast, 4 frames go, and the page files stay. Cmd+Z brings all 4 back with their links.
- Select 3 frames and press Ctrl+Alt+T: only those 3 line up.
- Cmd+A, then Esc: all frames are selected, then none.
- MCP `delete_frames_canvas` with 2 `@labels`: the approval card shows both labels. After you approve, both frames go. `pnpm exec tsx scripts/call-action.ts canvas.deleteFrames '<json>'` matches on 3 surfaces.
- Dark and light screenshots of a 3-frame selection and the box.

---

## 2. route-merge: bring app changes into an edited route prototype with AI

**Why.** Route sync (cycle 16) shows "App changed" on a route prototype and can copy the route again as a new page. But the designer's edits are in the old page, so the designer must redo the app change by hand. Figma Make now syncs both ways with GitHub. doop has design sync. This pick lets the in-app agent (or any MCP client) move the app change into the edited page. This is the main path for prototypes beside Bonaparte.

**Design.**
- Snapshot: each time `RouteSourceWriter` writes a record entry (at the copy, at `page.importSource`, and at the new `page.setSource`), it also copies the route files of that entry into `.studio/route-source/files/<page key>/<app-relative path>`. A cap of 2 MB applies to each entry. Over the cap, the entry has `hasSnapshot: false`. The snapshot is in `.studio/*`, so it is not versioned, the same as the record.
- Diff: a pure engine computes the change of each file from the snapshot to the app now. It reuses `diffLines` from `src/shared/line-diff.ts`. It returns at most 50 files and at most 400 diff lines in each file, with `isCut` set when it cuts. No git process and no dev server on the read path (P2, S7).
- Old route copies made before this pick have no snapshot. They return `hasSnapshot: false`, and the tool text tells the agent to use `import_source_page` and compare the two pages.

**Actions.**
- `page.inspectSourceChanges`: GET `/api/projects/:projectId/d/:directionId/pages/source/changes`. `access: "read"`, `needs: "project.read"` (as `page.inspectSource`), `scope: "project"`. Input: `projectId`, `directionId`, `file`. Output: `{ isRouteCopy, hasSnapshot, appProjectId, routePath, copiedAt, files: [{ file, change: "changed" | "deleted" | "added", diff, isCut }] }`. MCP and agent: `inspect_source_changes_page` (agent set `app`).
- `page.setSource`: PUT `/api/projects/:projectId/d/:directionId/pages/source`. `access: "edit"`, `needs: "project.update"` (as `page.importSource`), `scope: "project"`. Input: `projectId`, `directionId`, `file`. It hashes the app files again and takes a new snapshot for that page entry, so the page counts as current with the app. The page file does not change. `invalidates`: `page.inspectSource`, `page.inspectSourceChanges`. MCP and agent: `set_source_page` (agent set `app`). The description says that the record is not versioned, so Cmd+Z of the page edits does not bring back "App changed".
- Errors: `NotFound` (no page, or the app project is gone), `BadRequest` (the page is not a route copy, for `setSource` only).

**UI.**
- The "App changed" chip menu (`route-source-chip.tsx`) gets 2 new rows below "Copy app again":
  - "Update with AI" starts a chat run through `ui/platform/ask-chat.ts`. The prompt is fixed text in `canvas/copy.ts`. It names the page and tells the agent to call `inspect_source_changes_page`, apply the app changes to the page, keep the prototype edits, and then call `set_source_page`. Live edit and the change spotlight show the edit as it lands.
  - "Mark as current" runs `page.setSource`. The chip goes away.
- The chip refresh does not change (on project open and on `action.done`).

**Fix on the same path.** `setPrototypeTokensLink` in `project-ops/project-ops-prototype.ts` dies on ENOENT for an app with fewer than 4 CSS tokens, because it uses `attemptKnown(access)` (found by cycle-16 route-sync, not fixed). Treat a missing tokens file as "no tokens link" and go on.

**Main files.**
- New: `packages/common/actions/src/page/{inspect-source-changes,set-source}.ts`. One block in `actions/page/source/schema.ts`.
- New: `src/server/handlers/page/{inspect-source-changes,set-source}.ts`. Changed: `src/server/handlers/page/live.ts` (only if a new service is needed).
- New: `src/server/project-ops/route-source/{route-source-snapshot.ts,engine/to-file-diffs.ts}`. Changed: `route-source-writer.ts`, `route-source-store.ts`, `route-source/index.ts`.
- Changed: `src/server/project-ops/project-ops-prototype.ts` (the ENOENT fix only).
- Changed UI: `src/ui/features/canvas/{route-source-chip.tsx,route-source-model.ts,use-route-source.ts}`, one block in `canvas/copy.ts`.

**Verify in the running app.**
- Use a fake Next app in `/tmp` with 3 CSS tokens. The route prototype of `/settings` now copies with no defect.
- Edit the prototype heading color. Then change a button label in the app route file. The chip shows "App changed". `inspect_source_changes_page` returns the one-line diff of the button label.
- "Update with AI": with the mock agent, the run calls `inspect_source_changes_page` and `set_source_page` (check the run log). With a real model (if a key is set), the button label changes and the heading color stays. The chip goes away.
- "Mark as current" on another changed page: the chip goes away, and the page file does not change.
- A route copy made before this pick: `hasSnapshot: false`, and the chip menu still works.
- Bonaparte: copy the repo to `/tmp` (the original stays read-only), attach `apps/dashboard`, and make a route prototype of one admin route. If the dashboard dev server cannot start without its database, write that in the report and use the fake app.
- `pnpm exec tsx scripts/call-action.ts page.inspectSourceChanges '<json>'` and `page.setSource`: 3 surfaces match.
- Dark and light screenshots of the chip menu.

---

## 3. auto-layout-padding: Shift+A keeps the stack in place with padding

**Why.** Cycle-16 auto-layout-children left 3 gaps (`cycle-16/auto-layout-children.md`). The stack jumps to the top-left of the parent because no padding comes from the old offsets. `inset` stays on the children. Mixed children (some absolute, some in flow) get no gap. Figma Shift+A keeps the children where they were: it sets padding from the space between the parent edge and the children, and the gap from the space between children.

**Design.** No new action. `layer-style.set` (`set_layer_style`) gets one new input field, `padding`: `"auto"` (read it from the children, the default through `Schema.withDecodingDefault`) or `null` (no padding change). The MCP snapshot for `set_layer_style` is not approved yet, so this change adds no extra snapshot diff.
- `engine/to-auto-layout.ts` returns the padding: top, right, bottom and left. Each is the space from the parent's content box to the bounds of the children, snapped to the spacing scale on a Tailwind page (`p-6`, or `px-6 py-4`). One value is written when all 4 are equal.
- The writer also clears `inset` on each absolute child. Add `inset: null` to `CLEAR_POSITION` in `layer-layout-run.ts`. Do not add `inset` to `DIRECT_STYLE_PROPERTIES` in `contracts.ts`, because the bridge live preview and `inspector/css-value-model.ts` read that list. If the writer drops keys that are not in that list, the agent stops and lists `contracts.ts` as a shared file in its report.
- Mixed children: all children are sorted by their place on the axis, and the gap is the median space between neighbours. In-flow children keep their own styles.
- The output gets `padding` and `skipped` (the skipped list is already there). The inspector shows one line below the auto layout row when children were skipped: "2 layers kept their place", with the reason in `data-tip`.

**Main files.**
- `packages/common/actions/src/layer-style/{set,schema}.ts` (one field and one output field).
- `src/server/style-scope/layer-style/{layer-layout-run.ts,layer-layout-writer.ts,engine/to-auto-layout.ts}`.
- `src/ui/features/inspector/{auto-layout-body.tsx,use-auto-layout.ts}`, new `inspector/auto-layout-skip-note.tsx`, one block in `inspector/copy.ts`.

**Verify in the running app.**
- In an HTML project, put 3 rectangles in a row at 40 px from the left and 24 px from the top of a 400 px div. Shift+A: the boxes stay where they were. The div gets `padding: 24px ... 40px`, and the source has no `position`, `top`, `left` or `inset` on them. Cmd+Z restores in one step.
- A child with `inset: 0 auto auto 0`: after Shift+A, it has no `inset`.
- 2 absolute boxes and 1 in-flow box: one row with one gap.
- A Tailwind page: `flex gap-4 px-10 py-6`.
- A `.map()` child: the note "1 layer kept its place" shows.
- `call-action layer-style.set` on 3 surfaces. Dark and light screenshots.

---

## 4. reader-view: what a screen reader says for a whole frame

**Why.** Bonaparte has `sr-only` in 264 files and `aria-label` in many more. It is a healthcare app, so the screen reader path matters. `accessibility.inspect` gives the name and role of one layer and the tab order, but not the spoken lines of a page. Hidden `sr-only` text and icon buttons with no name are invisible on the canvas. This is round 28 pick 2, with the derived tool name. playwright-core 1.64.1 has `ariaSnapshot`.

**Action.**
- `accessibility.listReaderLines`: GET `/api/projects/:projectId/accessibility/reader-lines`. `access: "read"`, `needs: "project.read"` (as `accessibility.inspect`), `scope: "project"`. Input: `projectId`, `directionId`, `frame`, and `...PageFields` (E17). Output: `pageOf(ReaderLineSchema)`. A line has `role`, `name`, `states` (checked, expanded, disabled, level), `depth`, `isNameMissing`, and `layerId` (null when no layer maps). MCP and agent: `list_reader_lines_accessibility` (agent set `app`). The description says that the lines follow the Chromium accessibility tree, not a real VoiceOver or NVDA run.
- The read uses the live-frame probe of `accessibility.inspect` and a `ReaderLineStore` with `access: "read"` (S7a). It does not use `accessibility-writer.ts`. A pure engine `engine/to-reader-lines.ts` parses the `ariaSnapshot` YAML.

**UI.** The tab-order toggle becomes one menu: Tab order, Reader. Reader mode shows a list at the frame edge, one row for each line ("button, Save visit", "heading level 2, Schedule"). A row with no name shows a warning mark. A hover on a row outlines its layer, and a click selects it.

**Main files.**
- New: `packages/common/actions/src/accessibility/list-reader-lines.ts`. One block in `actions/accessibility/schema.ts`.
- New: `src/server/handlers/accessibility/list-reader-lines.ts`. Changed: `handlers/accessibility/live.ts`.
- New: `src/server/review/accessibility/{reader-line-store.ts,engine/to-reader-lines.ts}`. Changed: `review/accessibility/index.ts`.
- Changed: `src/ui/features/accessibility/tab-order-toggle.tsx`. New: `accessibility/{reader-list.tsx,reader-model.ts,use-reader-lines.ts}`. One block in `accessibility/copy.ts`.

**Verify in the running app.**
- In an HTML project, a page with an `sr-only` label, an icon button with no name, and 2 headings. Reader mode lists the `sr-only` text as a name, the headings with their levels in DOM order, and the button with a warning mark. A hover outlines the layer, and a click selects it.
- A Bonaparte route copy (from pick 2's test, if it starts): the `sr-only` text shows.
- `call-action accessibility.listReaderLines` on 3 surfaces. `limit: 5` returns 5 lines and a cursor.
- Dark and light screenshots.

---

## 5. text-wrap: Balance, Pretty and No wrap in the text section

**Why.** Bonaparte uses `text-pretty` in 50 files. The inspector has no row for it (`text-wrap` and `text-pretty`: 0 hits in `features/inspector` and `direct-edit`). Webflow and Framer have a text wrap choice. This is round 28 pick 1. It is the cheapest Bonaparte item.

**UI behaviour.** A "Wrap" row in the inspector text section: a segmented choice of Default, Balance, Pretty, No wrap. It reads the state from the classes and the computed `text-wrap`, so a Bonaparte `text-pretty` paragraph shows Pretty. In a Tailwind project, it writes `text-balance`, `text-pretty` or `text-nowrap`, and removes the other classes of the set. Default removes all 3. In a CSS project, it writes one `text-wrap` value. One click is one undo step.

**Headless.** No new action. The row writes through `direct-edit`, as the Numbers row does. The agent and MCP already set these classes and styles with `edit_element`. The new `text-wrap` key in the Tailwind map lets a style edit of `text-wrap: balance` become `text-balance`.

**Main files.** New `src/ui/features/inspector/{text-wrap-row.tsx,text-wrap-model.ts,use-text-wrap.ts}`, one mount line in `inspector/text-section.tsx`, one block in `inspector/copy.ts`, and the `text-wrap` key in `src/server/direct-edit/engine/tailwind/map.ts`.

**Verify in the running app.**
- A Tailwind project with a `text-pretty` paragraph: the row shows Pretty. Choose Balance: the class becomes `text-balance`, and the lines rebalance in the frame. Default: the class goes. Cmd+Z undoes each click.
- An HTML project heading: Balance writes `text-wrap: balance`.
- MCP `edit_element` with `text-wrap: pretty` on a Tailwind page writes `text-pretty`.
- Dark and light screenshots.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 frame-select | `actions/canvas/delete-frames.ts`, `actions/canvas/frame/schema.ts` (one block), `handlers/canvas/delete-frames.ts`, `server/canvas/frame-delete/**`, `server/canvas/canvas-writer.ts`, `server/canvas/layout-steps.ts`, `server/canvas/layout-history.ts`, `canvas/frame-selection-*`, `canvas/use-frame-selection.ts`, `canvas/frame-marquee.tsx`, `canvas/frame-label.tsx`, `canvas/frame-name-button.tsx`, `canvas/frame-drag.ts`, `canvas/use-stage-keys.ts`, `canvas/use-tidy-frames.ts` |
| 2 route-merge | `actions/page/{inspect-source-changes,set-source}.ts`, `actions/page/source/schema.ts`, `handlers/page/{inspect-source-changes,set-source,live}.ts`, `server/project-ops/route-source/**`, `server/project-ops/project-ops-prototype.ts`, `canvas/route-source-*`, `canvas/use-route-source.ts` |
| 3 auto-layout-padding | `actions/layer-style/{set,schema}.ts`, `server/style-scope/layer-style/{layer-layout-*,engine/to-auto-layout.ts}`, `inspector/auto-layout-*`, `inspector/use-auto-layout.ts` |
| 4 reader-view | `actions/accessibility/{list-reader-lines,schema}.ts`, `handlers/accessibility/{list-reader-lines,live}.ts`, `server/review/accessibility/{reader-line-store.ts,engine/to-reader-lines.ts,index.ts}`, `accessibility/tab-order-toggle.tsx`, `accessibility/reader-*`, `accessibility/use-reader-lines.ts`, `accessibility/copy.ts` |
| 5 text-wrap | `inspector/text-wrap-*`, `inspector/use-text-wrap.ts`, `inspector/text-section.tsx`, `server/direct-edit/engine/tailwind/map.ts` |

Shared files:
- `src/ui/features/canvas/copy.ts`: picks 1 and 2 each add one block.
- `src/ui/features/inspector/copy.ts`: picks 3 and 5 each add one block.
- `src/server/canvas/index.ts`: pick 1 only (one export line).
- `src/server/main/live-layer.ts`: no change. No pick adds a domain (`canvas`, `page`, `layer-style`, `accessibility` are wired).
- `src/server/agent/user-message.ts` and `agent/prompt.ts`: no pick needs them. Pick 2 puts its prompt in `canvas/copy.ts`, and the tool descriptions tell the agent the rest.
- `packages/common/contracts/src/contracts.ts`: no pick, unless pick 3 finds that the writer filters keys by `DIRECT_STYLE_PROPERTIES` (see pick 3).
- `@generated` files (`all-actions.generated.ts`, per-domain `routes.ts`, `handlers.ts`, `index.ts`): run `pnpm exec tsx scripts/gen-routes.ts` after each merge, one at a time.
- `artifacts/mcp-snapshots/*.json`: new tools `delete_frames_canvas`, `inspect_source_changes_page`, `set_source_page`, `list_reader_lines_accessibility`, plus the cycle-14 to 16 tools that still wait. Approve each diff at merge (user decision).
- `.claude/goal/roadmap.md` Appendix A: add the globs of each pick before its slice runs (L6e).
- Order: all 5 can run at once. Merge 5 and 3 first (smallest), then 4, then 1, then 2. After 1 and 2 are both in, wire "Compare" in `route-source-chip.tsx` to select both frames (runner-up 2).

## Runners-up

1. Layout versions: when a session ends with only canvas changes, save one coalesced "Layout" version that restore also applies. It must not await the commit (P3), and it must change `resetForRestore`, which is why it is not a pick.
2. Compare selects both frames, and the "App now" label on `page.importSource` frames (route-sync left out; a few lines after picks 1 and 2 merge).
3. Selected frames as chat focus: "make these 3 screens match" sends the frame selection to the run (needs `agent/user-message.ts`, which is at its 500-line cap).
4. Start points: several named Play starts and a list in the Play bar (round 28 pick 3; changes `links.ts` and the `set_start_frame` snapshot).
5. Align and distribute frames: left, top and center for a frame selection (Figma; after pick 1).
6. Shared layers safe apply: send the expected markup, and refuse a page that changed after the inspect (cycle-15 left out).
7. K and other tool keys with focus in the preview frame: one bridge key message in contracts (cycle-15 scale-tool left out).
8. Live data from a URL: fill a list from JSON at a URL, refreshed on demand (Figma Make connectors). Needs a PHI rule before it can point at a real Bonaparte API.
9. Locked design system: pin one token source for all prototypes of an app, and warn on raw values (Claude Design admin lock).
10. Touch pointer in Play on phone frames (round 28 pick 5). UI-only view state with no MCP surface, so it ranks low for "headless".

Sources: [venturebeat.com, Figma Make two-way GitHub](https://venturebeat.com/technology/are-designers-the-new-swes-figma-makes-new-two-way-github-integration-turns-designs-into-live-production-code-with-built-in-governance), [chatgate.ai doop](https://chatgate.ai/en/post/doop), [glama.ai doop](https://glama.ai/mcp/servers/kgoedecke/doop), [blog.mean.ceo Figma November 2026](https://blog.mean.ceo/figma-news-november-2026/).

## Results

- Merged with no conflicts, in order: text-wrap, auto-layout-padding, reader-view, frame-select, route-merge. Main at 91240ea2f.
- Checks: gen-routes --check pass, typecheck 0 errors, lint:gate pass (59661, baseline 89733), build:ui pass, desktop:pack pass.
- Installed app: :4570 returns 200. Server idle CPU 0.01 CPU-s/min over 60 s.
- Open: no real-model run for route merge "Update with AI". No Bonaparte test for route merge, reader view or text wrap. Frame select undo label reads "Change canvas frames", and its toast stays after Cmd+Z. Auto layout gives a large right padding on auto-width parents. Route chip "Compare" not wired yet. MCP snapshots not refreshed (user decision).
- Note: two agents ran `git stash pop` and applied an old shared stash by mistake, then reset their worktrees. The stash entry is unchanged.
