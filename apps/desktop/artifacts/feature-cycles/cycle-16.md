# Feature cycle 16: next 5 features

Date: 2026-11-13. Main at `75e20c33f` (all 5 cycle-15 picks merged).

## Method

- Read `cycle-15.md` (runners-up, "Results" open items), the 5 `cycle-15/*.md` reports ("Left out"), `cycle-13.md`, `cycle-14.md`, `.claude/goal/feature-log.md` (round 28), `journeys-run/{a-1-8-rerun,b-9-15,c-16-19-rerun}.md` and `git log --oneline -80`.
- Traced pick 1 in `apps/desktop/src/server/store/{versions,version-external,version-store-upkeep,version-index-paths}.ts`.
- Checked each candidate with narrow greps in `packages/common/actions/src/*` and `apps/desktop/src/{ui,server}`. Checked each new action id and tool name against `packages/common/actions/src` and `artifacts/mcp-snapshots/*.json`: no clash. Tool names follow the derived form `<verb>_<object>_<domain>` (as `import_frame_canvas`, `update_layer_style`).
- Competitor recheck (web search, 2026-11-13). Cycle 15 checked the same day, so only new rows are listed. (2nd) marks an aggregator or blog.
  - Claude Design: runs inside any Claude chat, Claude Code and Artifacts; the standalone site closes on Dec 14, 2026; on by default since October; still no Figma export, version history or multiplayer (claude.com/design; blog.mean.ceo, 2nd).
  - Figma Make: push to GitHub, connectors for Notion, Linear and Atlassian (figma.com/release-notes, no year in the snippet); a properties panel with annotations (creativeainews.com, 2nd).
  - doop: a comment on the canvas starts an agent; the agent replies with a screenshot (chatgate.ai, 2nd). Built here: `comment.start`.
  - v0, Lovable, Bolt, Open Design: nothing new after cycle 15.

## Skipped as built (checked this cycle)

Everything in the cycle-13, 14 and 15 lists, plus the 5 cycle-15 picks. Also checked:
- Frame delete undo (cycle-15 runner-up 2): built. `a-1-8-rerun.md` journey 2: "Frame removed. Undo" and Meta+Z bring the frame back.
- Journey B fixes: text tool (`30b161419`, `696ca41cf`), arrow nudge on in-flow layers (`d20ccad54`), spelling refresh (`cdb60235d`), token rename and delete in prototypes (`659003abe`), share link as a live prototype (`e17e12624`).
- Comment to agent: `comment.start`.
- Route prototype vs app score: `port.inspect` (it compares the app route with the prototype page, not the app now with the app at copy time).

Not built (round 28 specs in `feature-log.md`, still open): text wrap row, reader view, start points, tidy frames, touch pointer. Greps for `text-wrap`, `ariaSnapshot`, `starts` in `contracts/links.ts`, and a canvas frame tidy return 0 hits. Pick 4 reuses the tidy-frames spec. The rest are runners-up.

## Ranking

Score = user value for real-app AI design x fit with "simple and fast" / effort (1 to 5 each).

| Rank | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|
| 1 | folder-versions: imported folders save versions after a canvas change (fixed pick) | 5 | 5 | 1 | 25 |
| 2 | route-sync: "App changed since copy" on a route prototype, and copy the route again | 5 | 5 | 3 | 8.3 |
| 3 | auto-layout-children: Shift+A turns absolute children into flow children | 4 | 5 | 2 | 10 |
| 4 | screen-drop-finish: the frame takes the image shape, and the chat agent can pass the image | 4 | 5 | 2 | 10 |
| 5 | tidy-frames: tidy up frames on the canvas | 3 | 5 | 2 | 7.5 |

Route sync ranks above the two cheaper picks because it is the largest gap for prototypes beside a real app (Bonaparte): today a prototype never knows that the app moved on. Auto layout and screen-drop finish are cheap and close a Figma gap and a headless gap; auto layout ranks first because every drawn layout hits it. Tidy frames closes a journey-10 fail but adds the least new value.

---

## 1. folder-versions: imported folders save versions after a canvas change

**Why.** Found by the cycle-15 shared-layers agent (`cycle-15/shared-layers.md`, "Left out"). An imported folder is the main way to design inside a real repo. After a frame move or any canvas change, the next version fails, so undo and history break for that project.

**Cause (traced).**
- `isExternalTree` (`src/server/store/version-external.ts`) is true for an imported folder: `imported` is set and `created` is not true. It is not an app.
- `writeBaseExclude` (`src/server/store/versions.ts` about line 357) then writes `[...GIT_EXCLUDES, ...APP_EXCLUDES]` into `<dataDir>/projects/<id>/git/info/exclude`.
- `GIT_EXCLUDES` has `.studio/*`, `!.studio/canvas.json`, `!.studio/links.json`. The first line of `APP_EXCLUDES` is `.studio/`. That line ignores the whole directory. Git cannot re-include a file when a parent directory is excluded, so the two `!` lines have no effect. Line order is not the problem; the directory pattern is.
- The project is not an app, so `layoutFilesOf` still returns `.studio/canvas.json` and `.studio/links.json`.
- Two paths break:
  - `commitFile` adds the layout files to the path list. On the fallback path (`commitPaths` -> `updateIndexPaths` in `version-index-paths.ts`) `git add -A -- .studio/canvas.json` fails: "paths are ignored by one of your .gitignore files". The version is not saved.
  - `commit` (`fullStage` with `add -A`) does not fail, but skips the layout files. Canvas changes are lost from the version with no error.
- Second trigger, same symptom: the folder's own `.gitignore`, or its `.git/info/exclude` (which `toExternalExcludes` in `version-store-upkeep.ts` copies in), can list `.studio/`. A user who keeps the studio out of their repo does this.

**Fix plan.**
1. In `versions.ts`, split the app-only line out: `APP_STUDIO_EXCLUDES = [".studio/"]` and `EXTERNAL_EXCLUDES` (the rest of today's `APP_EXCLUDES`: models, databases, media, archives, `.env`, keys). `writeBaseExclude` writes `GIT_EXCLUDES + EXTERNAL_EXCLUDES + APP_STUDIO_EXCLUDES` for `project.app`, and `GIT_EXCLUDES + EXTERNAL_EXCLUDES` for an imported non-app folder. App behavior does not change.
2. In `toExternalExcludes` (`version-store-upkeep.ts`), drop the lines `.studio`, `.studio/` and `/.studio/` from the copied repo lines when the project is not an app (pass a flag).
3. Stage layout files on their own with force, so the folder's `.gitignore` cannot block them: a new `updateLayoutPaths(scope, paths)` in `version-index-paths.ts` that runs `git --literal-pathspecs add -f -- <layout files>` for the present ones. Call it from `commitPaths` and from `commit` after `fullStage`, only with `layoutFilesOf(project)`. Every other path keeps `add -A` with no force.
4. Self-heal: `freshExcludes` rewrites the exclude once per process, so an old broken project heals after one app restart. No migration step. Canvas changes that were lost before the fix stay lost.
5. Scope check: a folder link (`store/project-folder-link.ts`) makes a normal `html` project with `project.folder` set and `imported` from `create`. Check that `isExternalTree` is false for it. If it is true, the fix covers it too.

No new action. No UI change.

**Main files.** `src/server/store/versions.ts`, `src/server/store/version-store-upkeep.ts` (`toExternalExcludes`), `src/server/store/version-index-paths.ts`. Keep `versions.ts` under its `HEAD` length plus 500 (L2a): put the new list consts in `version-external.ts` if needed.

**Verify in the running app** (`STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev`):
- Import a plain folder with 3 HTML pages. Move a frame, then edit a text. Versions shows a new version for each. `git --git-dir <data>/projects/<id>/git show --stat HEAD` lists `.studio/canvas.json`. Cmd+Z moves the frame back.
- The same with a folder that is a git repo whose `.gitignore` has `.studio/`. The version saves and lists `.studio/canvas.json`.
- An old project made before the fix (copy the cycle-15 test data or write `.studio/` into its exclude by hand): restart, move a frame, the version saves.
- An attached app: `git show --stat HEAD` after an edit has no `.studio/` file. `cat <data>/projects/<id>/git/info/exclude` still has `.studio/`.
- MCP: `canvas_place` (the tool of `canvas.updateFrame`) on the imported folder, then `list_versions` shows the new version.
- Gates: `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run check:scripts`, `pnpm run lint:gate`.

---

## 2. route-sync: "App changed since copy" on a route prototype

**Why.** A route prototype (`project.createPrototype` with `routePath`) is a copy of one app route. When the app changes, the prototype goes stale with no sign, and the designer edits an old screen. doop has design sync for this. This is cycle-15 runner-up 1 and cycle-14 runner-up 6. It is the top gap for prototypes beside Bonaparte.

**Design.**
- At copy time, `handlers/project/create-prototype.ts` writes `.studio/route-source.json` in the prototype folder: `{ appProjectId, routePath, viewport, page, frameId, copiedAt, files: [{ file, sha }] }`. `files` is the route file from the dev server route list (`AppRouteSchema.file`) plus the `layout.*` files on its folder chain up to the app root (Next app router), with a content sha256 of each. Do not key the check on an app studio version: an attached app has no studio version until its first studio commit.
- The record is in `.studio/*`, which is not versioned (only `canvas.json` and `links.json` are). Undo and restore do not touch it. State this in the action description.
- The check reads the files and hashes them again. No git process and no dev server on the read path (P2, S7).

**Actions.**
- `page.inspectSource`: GET `/api/projects/:projectId/d/:directionId/pages/source`, access read, `needs: "studio.read"`, scope project. Input `projectId`, `directionId`, `file` (the prototype page). Output `{ isRouteCopy, appProjectId, routePath, copiedAt, isChanged, changedFiles: [{ file, change: "changed" | "deleted" }] }`. A page that is not a route copy returns `isRouteCopy: false`, not an error. MCP and agent `inspect_source_page` (agent set `app`).
- `page.importSource`: POST on the same path, access edit, `needs: "studio.write"`, scope project. Input `projectId`, `directionId`, `file`. It starts the app dev server when it is off (the same wait as create-prototype), copies the route again with `PageWriter` as a new page `<page>-app.html` and a new frame to the right of the source frame, labelled "App now", and adds a separate record entry for the new page with its own hashes. It never rewrites the entry of the source page, so the source page still shows "App changed" after the new copy. The record is not versioned: after Cmd+Z removes the new page, its entry points at a missing page and reads as `isRouteCopy: false`, so undo stays correct. The prototype page and its edits do not change. One version and one undo step. `invalidates`: `canvas.getDoc`, `version.list`, `page.inspectSource`. MCP and agent `import_source_page`.
- Errors: `NotFound` (no page, or the app project is gone), `BadRequest` (the page is not a route copy), `Conflict` (the dev server did not start).

**UI.** On a frame whose page is a route copy, the frame label shows a small chip in `frame-label-extras.tsx`: "App changed" with the file count in the `data-tip` (file names listed). A click opens a one-row menu: "Copy app again" (runs `page.importSource`, then selects the new frame) and "Compare" (selects both frames). No chip when nothing changed. The check runs when the project opens and on the `action.done` event for app edits, never on a timer (U12).

**Agent.** No run-context change (that would collide with pick 4 in `agent/user-message.ts`). The agent calls `inspect_source_page` when the user asks if the prototype is current; the description says when to use it.

**Main files.**
- New: `packages/common/actions/src/page/{inspect-source,import-source}.ts`, `packages/common/actions/src/page/source/schema.ts` (stamped with `pnpm run new:action`).
- New: `src/server/handlers/page/{inspect-source,import-source}.ts`. Changed: `src/server/handlers/page/live.ts`.
- New: `src/server/project-ops/route-source/` (`route-source-store.ts` read, `route-source-writer.ts` write, `engine/to-route-files.ts`, `engine/to-changed-files.ts`, `index.ts`), one export block in `src/server/project-ops/index.ts`.
- Changed: `src/server/handlers/project/create-prototype.ts` (write the record after the copy). Provide `RouteSourceStore` and `RouteSourceWriter` in `src/server/handlers/page/live.ts` and `src/server/handlers/project/live.ts` (the project handler yields the writer).
- New UI: `src/ui/features/canvas/{route-source-chip.tsx,use-route-source.ts,route-source-model.ts}`, one block in `canvas/copy.ts`, one mount in `canvas/frame-label-extras.tsx`.

**Verify in the running app.**
- Attach a Next app (a fake app in `/tmp`, or Bonaparte read-only through a copy). Make a route prototype of `/settings`. No chip.
- Change a heading in the route file in the app folder. Reopen the project: the chip shows "App changed", the tip names the file.
- Click "Copy app again": a new "App now" frame shows to the right with the new heading. The prototype frame keeps its edits. The new frame has no chip (its hashes are current). The source frame keeps its chip, because the source page is still the old copy. Cmd+Z removes the new page and frame, and `inspect_source_page` on the removed page returns `isRouteCopy: false`.
- Delete the route file: the chip lists it as deleted.
- `pnpm exec tsx scripts/call-action.ts page.inspectSource '<json>'` and `page.importSource`: 3 surfaces match.
- Dark and light screenshots of the chip and the menu.

---

## 3. auto-layout-children: Shift+A turns absolute children into flow children

**Why.** Journey 10 (`b-9-15.md`): Shift+A writes `display: flex` and a gap, but the children stay `position: absolute`, so nothing moves. In Figma, Shift+A on loose layers makes a stack in their visual order, with the direction and gap it reads from their places. This is a core manual-editing gap (cycle-14 runner-up 3, cycle-15 runner-up 7). Shapes made with R, O and T are absolute, so every drawn layout hits it.

**Design.**
- `layer-style.set`: POST `/api/projects/:projectId/layer-style/set`, access edit, `needs: "studio.write"`, scope project, MCP and agent `set_layer_style` (agent set `tweak`). Input `projectId`, `directionId`, `layerId` (file:line:col or a `get_layers` id), `layout` (`auto`, `row`, `column`), `gap` (px or token, or null for "read it from the children"). Output `{ versionId, direction, gap, movedChildren }`.
- Steps (one version, one undo step):
  1. A probe reads the children's boxes in the live page (reuse `layer-style-probe.ts`).
  2. A pure engine `engine/to-auto-layout.ts` picks the direction (`auto`: row when the boxes spread more on x than on y), sorts the children by their place on that axis, and sets the gap to the median space between neighbours (snapped to the scale on a Tailwind page).
  3. The writer sets `display: flex`, the direction and the gap on the parent, removes `position`, `top`, `left`, `right`, `bottom` and `inset` from each child that is absolute, and moves the child nodes into the sorted order in the source.
- Children that are not absolute keep their order and styles. A child from data or a shared component is skipped with a reason (as `layer-style.apply` does).
- The inspector `handleAdd` in `auto-layout-body.tsx` always calls `layer-style.set` with `layout: "auto"` (`edit.values` holds only the parent's styles, so the UI cannot see the children). When no child is absolute, the server writes only `display: flex`, as today.

**Main files.**
- New: `packages/common/actions/src/layer-style/set.ts`. Changed: `packages/common/actions/src/layer-style/schema.ts` (one block).
- New: `src/server/handlers/layer-style/set.ts`. Changed: `src/server/handlers/layer-style/live.ts`.
- New: `src/server/style-scope/layer-style/{layer-layout-run.ts,layer-layout-writer.ts,engine/to-auto-layout.ts}`. Changed: `style-scope/layer-style/index.ts` (one export).
- Changed: `src/ui/features/inspector/auto-layout-body.tsx`. New: `src/ui/features/inspector/use-auto-layout.ts`. One block in `inspector/copy.ts`.

**Verify in the running app.**
- In an HTML project, draw 3 rectangles in a row with R at uneven gaps inside a frame div. Select the div, press Shift+A: the 3 boxes line up in a row in their old order, with one gap near the old median. The source has no `position: absolute` on them. Cmd+Z restores the old places in one step.
- Stack 3 text boxes on top of each other: Shift+A makes a column.
- A Tailwind page: classes `flex gap-4`, and `absolute left-[..] top-[..]` gone.
- A parent with in-flow children only: Shift+A writes `display: flex` as today.
- MCP `set_layer_style` and agent: `call-action layer-style.set` on 3 surfaces.
- Dark and light screenshots before and after.

---

## 4. screen-drop-finish: the frame takes the image shape, and the chat agent can pass the image

**Why.** Paste a screenshot to get that screen is a top AI flow (v0, Lovable, Claude Design). Cycle 15 built it, but left 3 gaps (`cycle-15/screen-drop.md`): the frame takes the size of the nearest frame, not the image shape; the live-build cover shows on the old active frame; and a chat run cannot see attachment ids, so the in-app agent cannot call `import_frame_canvas`. The last gap breaks the "works from the chat agent" rule.

**Design.** No new action.
- Frame size: `canvas.importFrame` uses the image aspect. Width is the nearest device width (390, 768, 1280 or 1440) to the image width at its pixel ratio; height follows the aspect, at least the device height. Read the size from the PNG or JPEG header in the server (no decode library).
- Active frame: after the paste, the new frame becomes the active frame, so the live-build cover shows on it during the run.
- Chat agent: `agent/user-message.ts` lists each image attachment with its id, name and size ("image 1: id att_..., 1179x2556, home.png"), so the agent can pass `attachmentId` to `import_frame_canvas`. The ids are not secret; the agent cannot read the file by id outside the project.
- Paste ghost: put it in view (next to the selected frame, or in the visible center when the last frame is off screen).

**Main files.**
- `src/server/canvas/frame-import/frame-import-ops.ts` (size), new `src/server/canvas/frame-import/engine/to-image-size.ts`.
- `src/server/agent/user-message.ts`, `src/server/agent/mock.ts` (the mock run names the id when it sees one).
- `src/ui/features/canvas/use-image-paste.ts`, `canvas/image-drop-*` files, one block in `canvas/copy.ts`.
- Active frame: `src/ui/features/canvas/use-canvas-frames.ts` (call its existing active-frame setter with the new frame id). The live-build cover mounts in `stage-artboard.tsx` on the active frame, so no change there. If the setter is not reachable from the paste hook without more canvas wiring files, leave this step out and list it as a runner-up. Picks 2 and 5 do not touch these files.

**Verify in the running app.**
- Paste a 1179x2556 phone screenshot on empty canvas: the frame is 390 wide with a phone aspect. A 2880x1800 desktop shot gives a 1440x900 frame.
- During the run, the cover shows on the new frame, not the old active one.
- In chat, attach an image and type "make this a new screen": the mock run calls `import_frame_canvas` with the attachment id (check the run log). One real-model run if a key is set.
- With the canvas scrolled away from the last frame, the paste ghost shows in view.
- Dark and light screenshots.

---

## 5. tidy-frames: tidy up frames on the canvas

**Why.** Journey 10 fail: "there is no canvas-frame tidy". Frames made by runs, next-screen and screen-drop land at uneven gaps. Figma has Tidy up on frames. The spec is round 28 pick 4 in `feature-log.md`; this pick reuses it with the derived tool name.

**Design.**
- `canvas.moveFrames`: POST, access edit, `needs: "studio.write"`, scope project, MCP and agent `move_frames_canvas` (agent set `app`). Input `projectId`, `frames` (frame ids or `@labels`, or null for every frame), `section` (a section id or null), `layout` (`tidy`, `row`, `grid`), `gap` (default 80 through `Schema.withDecodingDefault`). `invalidates`: `canvas.getDoc`, `canvas.inspect`.
- A pure engine sorts frames by row, then column, keeps the top-left of the group and places them with the gap. `row` is one line. `grid` uses the column count that makes the group nearest to a square. `tidy` keeps the row breaks it finds. A section tidy keeps its frames in the section and fits the section to them. Links keep their frame ids. One version of `canvas.json`, one layout undo step.
- UI: "Tidy up frames" in the command palette (all frames, or the section of the selected frame) and in the frame context menu, shortcut Ctrl+Alt+T. Shift-click frame labels to pick some frames for a tidy is out of scope (no frame multi-select store yet; runner-up).

**Main files.**
- New: `packages/common/actions/src/canvas/move-frames.ts`, `packages/common/actions/src/canvas/tidy/schema.ts`.
- New: `src/server/handlers/canvas/move-frames.ts`. Changed: `src/server/handlers/canvas/live.ts` if the writer is a new service.
- New: `src/server/canvas/frame-tidy/{frame-tidy-writer.ts,engine/to-tidy-frames.ts,index.ts}`. One export line in `src/server/canvas/index.ts`. Do not grow `frame-ops.ts` (475 lines). Record the step through the existing layout history entry; do not edit `layout-history.ts`.
- UI: `src/ui/features/canvas/frame-menu-model.ts`, new `canvas/use-tidy-frames.ts`, one block in `canvas/copy.ts`, `src/ui/features/commands/canvas-commands.ts`.

**Verify in the running app.**
- A project with 8 frames placed by hand at uneven gaps: Tidy up frames lines them up in their rows with 80 px gaps, keeps the order, and the links still point at the same frames. Cmd+Z restores the old places.
- Tidy in one section moves only its frames and fits the section.
- MCP `move_frames_canvas` with `layout: "grid"`: a near-square grid. `call-action canvas.moveFrames` on 3 surfaces.
- Dark and light screenshots before and after.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 folder-versions | `server/store/versions.ts`, `server/store/version-store-upkeep.ts`, `server/store/version-index-paths.ts`, `server/store/version-external.ts` |
| 2 route-sync | `actions/page/{inspect-source,import-source}.ts`, `actions/page/source/**`, `handlers/page/{inspect-source,import-source,live}.ts`, `handlers/project/{create-prototype,live}.ts`, `server/project-ops/route-source/**`, `server/project-ops/index.ts` (one export block), `canvas/route-source-*`, `canvas/use-route-source.ts`, `canvas/frame-label-extras.tsx` (one mount) |
| 3 auto-layout-children | `actions/layer-style/{set,schema}.ts`, `handlers/layer-style/{set,live}.ts`, `server/style-scope/layer-style/{layer-layout-*,engine/to-auto-layout.ts,index.ts}`, `inspector/auto-layout-body.tsx`, `inspector/use-auto-layout.ts` |
| 4 screen-drop-finish | `server/canvas/frame-import/**`, `server/agent/user-message.ts`, `server/agent/mock.ts`, `canvas/use-image-paste.ts`, `canvas/image-drop-*`, `canvas/use-canvas-frames.ts` |
| 5 tidy-frames | `actions/canvas/move-frames.ts`, `actions/canvas/tidy/**`, `handlers/canvas/move-frames.ts`, `server/canvas/frame-tidy/**`, `canvas/frame-menu-model.ts`, `canvas/use-tidy-frames.ts`, `commands/canvas-commands.ts` |

Shared files:
- `src/ui/features/canvas/copy.ts`: picks 2, 4 and 5 each add one block. Merge in the order below.
- `src/ui/features/inspector/copy.ts`: pick 3 only.
- `src/server/canvas/index.ts`: pick 5 (tidy) adds one export line. Pick 4 changes only files inside `frame-import/`, whose exports are already there.
- `src/server/handlers/canvas/live.ts`: pick 5 (tidy) only, if its writer is a new service. Pick 4 adds no service.
- `src/server/agent/user-message.ts`: pick 4 only. Pick 2 adds no run-context line.
- `src/server/main/live-layer.ts`: no pick adds a domain (`page`, `layer-style`, `canvas` are wired). No change.
- `src/server/agent/prompt.ts`: no pick needs it.
- Pick 1 owns `store/versions.ts`. Pick 2 must not touch it; it reads files, not versions.
- `@generated` files (`all-actions.generated.ts`, per-domain `routes.ts`, `handlers.ts`, `index.ts`): run `pnpm exec tsx scripts/gen-routes.ts` after each merge, one at a time.
- `artifacts/mcp-snapshots/*.json`: new tools `inspect_source_page`, `import_source_page`, `set_layer_style`, `move_frames_canvas`, plus the cycle-14 and cycle-15 tools that still wait. Approve each diff at merge (user decision).
- `.claude/goal/roadmap.md` Appendix A: add each pick's globs before its slice runs (L6e).
- Order: all 5 can run at once. Merge 1 first: it unblocks shared-layers and every canvas test on an imported folder. Then 3, 4, 5, 2 (the `canvas/copy.ts` blocks get larger in that order).

## Runners-up

1. Text wrap row: Default, Balance, Pretty, No wrap in the text section (round 28 pick 1; Bonaparte uses `text-pretty` 74 times); cheap.
2. Reader view: what a screen reader says for a whole frame, from `ariaSnapshot` (round 28 pick 2; Bonaparte `sr-only` 368).
3. Start points: several named Play starts and a list in the Play bar (round 28 pick 3; Figma flows).
4. Frame multi-select: Shift-click labels and a marquee on empty canvas select frames, for tidy, move and delete (journey 10).
5. Shared layers safe apply: send the expected markup and refuse a page that changed after the inspect; outline matching frames on hover (cycle-15 left out).
6. K and other tool keys with focus in the preview frame: one bridge key message in contracts (cycle-15 scale-tool left out).
7. Scale handles on the canvas: drag a corner with K held (Figma; cycle-15 runner-up 3).
8. Live data from a URL: fill a list from JSON at a URL, refreshed on demand (Figma Make connectors). Needs a PHI rule before it can point at a real Bonaparte API.
9. Locked design system: pin one token source for all prototypes of an app and warn on raw values (Claude Design admin lock).
10. Touch pointer in Play on phone frames (round 28 pick 5; Figma mobile prototypes).

Sources: [claude.com/design](https://claude.com/design), [blog.mean.ceo](https://blog.mean.ceo/claude-design-news-november-2026/), [figma.com release notes](https://www.figma.com/release-notes/archive/?page=2), [creativeainews.com](https://www.creativeainews.com/articles/figma-make-properties-panel-annotations/), [chatgate.ai doop](https://chatgate.ai/en/post/doop).
