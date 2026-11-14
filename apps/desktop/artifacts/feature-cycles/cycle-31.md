# Feature cycle 31: next 5 features

Date: 2026-11-14. Main at `9ad35116e` (all 5 cycle-30 picks merged at `d55e5ecb2`).

## Method

- Read `cycle-30.md` (picks, ownership, runners-up, Results "Open"), `cycle-30/route-pairs.md` and its run files (`real-run-2-fix-prompts.txt`, `tw-handfix.diff`, `real-run-2-rf-next-tw/`), the runners-up and Results of cycles 25 to 29 (13 to 24 through their carried-over runners-up), `real-runs/report{,-2,-3}.md`, the tail of `.claude/goal/feature-log.md`, `git log --oneline -120` and `git branch -a`.
- Read the port code (`agent/port-plan.ts`, `port-review.ts`, `review/port-check/*`, `actions/src/port/*`), the Tailwind edit engine (`direct-edit/engine/tailwind/index.ts`, `decideClassEdit` and its style-to-class map), the keymap (`shared/keymap.ts`) and the desktop boot (`desktop/{boot,main,env}.ts`).
- Ran the code for the speed item (numbers below). No real-model run was made for this research.

### Speed: measured on the running code

| Path | How | Result |
|---|---|---|
| Packaged app boot to Home usable | `scripts/perf/desktop-start.ts` with `STUDIO_DESKTOP_EXECUTABLE` set to `dist/mac-arm64` (built today from merged main), 5 samples, temp dirs | p50 **890 ms**, p95 3869 ms (first sample cold). On 2026-10-24 (`e2e/results/desktop-start-packaged-after.json`) p50 was **575 ms**. |
| Boot marks (p50 of warm samples) | same run | `loginShell` 190 ms, `serverSpawned` 200 ms, `serverReady` 600 ms, `readyToShow` 778 ms. On 2026-10-24: `serverSpawned` 208 ms, `serverReady` 331 ms. **Spawn to ready grew from about 123 ms to about 400 ms.** The window opens only after `serverReady` (`desktop/main.ts`). |
| Heavy modules at boot | `pnpm exec tsx scripts/check-boot-imports.ts` | **Fails on main**: "heavy modules loaded at boot: esbuild". Also loaded: `@babel/parser`, `parse5`, `chokidar`, `culori`, `zod`. The value import is `import { build } from "esbuild"` in `src/server/platform/bridge-build/index.ts` (P9 says load it on first use). |
| Dev server boot (tsx) | spawn `tsx src/server/index.ts`, poll `GET /` | 2.0 to 2.2 s warm, 4.8 s cold. |
| Project open from Home (HTML sample) | Browser pane, resource timing from the click | `bridge-hello` from the frame at 389 ms; frame HTML request at 200 ms. A warm reload starts the frame request at 144 ms. |

So the slow common path that grew is the packaged boot: +315 ms (55%) to Home in one month, and the boot check that should catch it fails. Pick 4.

Notes on this data:
- The Browser pane was hidden, so frame paint times from screenshots are not valid. Only the network and `bridge-hello` numbers are used.
- On the first project open after a server boot, about 11 reads each took about 170 ms in parallel (warm: 2 to 10 ms). This hints at one blocking task, but it was not measured on the server. It is runner-up 2, not a finding.

### Why the Tailwind 4 route update scored 65

From `cycle-30/route-pairs.md` and `real-run-2-fix-prompts.txt`:
- The fix prompt gave measured px values ("margin-bottom app 8px, prototype 24px"). In a Tailwind app the agent must turn each value into a class. It changed padding and leading instead, and never wrote `mb-6`.
- The second loop ran because the first raised the score (65 to 69). It then lowered it to 65, and the run kept the lower state.
- Applying only the listed values by hand (`mb-6 text-[32px]`, `max-w-[880px]`, `text-[15px]`, `leading-[normal]`) scored 96 with no model.
- The studio already maps CSS values to Tailwind classes for direct edits (`decideClassEdit` and its style edits in `direct-edit/engine/tailwind`). The fix loop does not use it.

Pick 1 makes the studio write the paired values itself, gives the model the class names for what is left, and keeps the best loop.

### Other findings

- **Figma gap.** `Mod+C` and `Mod+V` exist (cycle 30). Figma "Paste to replace" (`Mod+Shift+R`) does not. The cycle-30 open bug "a second Mod+V pastes inside the new copy" is in the same files. Copy and paste style, select matching (`select_matching`), Tidy up and opacity keys exist. Pick 2.
- **AI quality.** The port plan (`agent/port-plan.ts`) lists tokens as `--ink = #1c1917 -> no app token` with no instruction, and it has no font line at all. The cycle-27 run 3 new-route port scored 40: the agent used Tailwind stone and orange and dropped Fraunces. Runner-up in cycles 27 to 30. Pick 3.
- **Small open items** (pick 5): `/api/starters` loads twice on Home; old SVG art stays when a photo replaces it; `get_screenshot` of a failed dev server returns `isError: false` with the error page (runner-up since cycle 22).
- **Not picked (user decisions or forbidden files):** panel rail, Home cuts, MCP snapshot refresh, frame fit to content (100vh), `get_run` summary trim, the closed MCP request in a `get_run` wait (`mcp/registry.ts`, a hand aggregator).
- **Fake apps.** `ds-wt/rf-next` and `ds-wt/rf-next-tw` no longer exist. Picks 1 and 3 each make their own. The cycle-30 setup copied `node_modules` (dereferenced) from the Bonaparte pnpm store, read only. No pick writes into Bonaparte, and no Move to app run targets it.
- **Competitor recheck (2 web searches, 2026-11-14).** Figma: the design agent on the canvas is generally available with web search; several AI image edits can run while the user designs; variables import and export as JSON. Figma Make: npm package imports for design-system components, GPT-5.6. No Claude Design, v0, Lovable, Bolt, open design, doop or Canva item newer than the cycle-30 recheck. Nothing changes the ranking: Figma's agent work raises the bar on headless parity, which every pick keeps.
- **Branch check.** No `feat/route-tw`, `feat/paste-replace`, `feat/port-look`, `feat/fast-boot` or `feat/polish-31`. Near names that exist and are not used: `feat/route-pairs`, `feat/route-fidelity`, `feat/layer-copy`, `feat/port-assets`, `feat/edit-speed`, `feat/polish-30`.

## Ranking

Score = value x fit with "simple and fast" / effort (1 to 5 each).

| Rank | Key | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|---|
| 1 | route-tw | The studio writes the paired prototype values into a Tailwind 4 route itself, gives the model class names for the rest, and keeps the best loop; a real run reaches 80 (Bonaparte) | 5 | 5 | 3 | 8.3 |
| 2 | fast-boot | Packaged boot back under 600 ms to Home: esbuild and other heavy modules off the boot path, login shell read off the critical path | 4 | 5 | 2 | 10 |
| 3 | port-look | A new-route Move to app keeps the prototype fonts and colors when the app has no token (AI quality) | 4 | 5 | 3 | 6.7 |
| 4 | paste-replace | `Mod+Shift+R` replaces the selection with the copied layers; a second `Mod+V` pastes beside the copy (Figma) | 3 | 5 | 2 | 7.5 |
| 5 | polish-31 | Starters load once, old SVG art goes when a photo replaces it, `get_screenshot` flags a failed dev server | 3 | 5 | 1 | 15 |

No pick adds an always-visible control:
- Pick 1 changes the studio fix loop and adds one tool.
- Pick 2 changes boot order and imports.
- Pick 3 changes the port plan text.
- Pick 4 adds a key (shown only in the shortcut sheet and Cmd+K).
- Pick 5 fixes existing paths.

---

## 1. route-tw: the studio writes the prototype values into a Tailwind 4 route (Bonaparte)

**Why.** Bonaparte uses Tailwind 4. The cycle-30 real run on a Tailwind 4 route update ended at 65 (target 80). The paired values were right: applying them by hand scored 96. The model failed at two steps: it did not turn px into classes, and a second loop undid the first.

**Behaviour.**
- **Studio values pass.** After the first studio `inspect_port` of a route update, and before any model fix loop, the studio writes each paired value diff into the app source:
  - In a Tailwind file, through the existing style-to-class map (`decideClassEdit`): `margin-bottom 8px -> 24px` writes `mb-6` in place of `mb-2`; a value off the scale writes an arbitrary class (`text-[15px]`, `max-w-[880px]`).
  - In a plain CSS file, through the existing style edit.
  - It never writes to kept app text, masked elements, data rows or their cells (the cycle-30 mask and pair rules). It writes only pairs whose app element maps to one source site. A pair with a dynamic or shared class site is left to the model and named in the prompt.
  - Then it scores again. All writes of the pass are one version.
- **Model loop with class names.** For each diff left after the pass, the fix prompt line adds the class to write when the app uses Tailwind: `h1 "Patients": margin-bottom app 8px, prototype 24px (write mb-6, not mb-2)`. The plain CSS line stays as it is.
- **Keep the best.** Each loop records its score. If a loop lowers the score, the studio reverts that loop's own edits and stops. The run note says "a fix loop lowered the score; its edits were undone".
- **Run note.** "Studio check: wrote 5 prototype values (mb-6, text-[32px], max-w-[880px], ...); port score 65 -> 9x; 0 fix loops ran."
- No new UI. The values pass shows in the run note and the existing port check row.

**Headless.**
- New action `port.apply`: POST `/api/projects/:projectId/port/apply`, `access: "edit"`, `needs: "project.update"`, `scope: "project"`, `confirm: "user"` with a `preview` that lists the writes (it writes app source, like `start_port`, which is `confirm: "user"`), `invalidates: ["port.inspect"]`. Input: `projectId`, `directionId`, `route`. It reads the last stored match for that route (`port-match-store.ts`), writes the diffs as above and returns `{ applied, skipped, scoreBefore, scoreAfter }`, where each `applied` item has the element, property, app value, prototype value and the class or declaration written, and each `skipped` item has a reason.
- MCP tool `apply_port`; agent `{ lean, name: "apply_port", set: "app", short }` (same set as `inspect_port`). Derived names: const `applyPort`, types `ApplyPortInput` and `ApplyPortOutput`, hook `useAction(applyPort)` (no UI caller in this pick).
- The studio fix loop and the MCP tool call the same service, so an outside agent can run `inspect_port` then `apply_port`. Inside a Move to app run the user already confirmed the app edit, so the loop calls the service directly and asks no second time.
- Stamp it with `pnpm run new:action port apply` if the stamp exists on main; else copy the golden action file from `docs/patterns.md`. Run `pnpm exec tsx scripts/gen-routes.ts`.

**Main files.**
- New `review/port-check/port-apply.ts` (diff to style edit plan, pure where it can be) and the service that writes through the `direct-edit` area `index.ts` (check that `decideClassEdit` or its wrapper is exported there; widen the export there, W16a, never a deep import).
- New `packages/common/actions/src/port/apply.ts`, `port/schema.ts` (apply schemas), new `src/server/handlers/port/apply.ts`.
- `agent/port-review.ts` (473 lines: put the values pass and keep-best in a new `agent/port-review-pass.ts`, keep `port-review.ts` under 500, L2), `agent/port-review-read.ts`, `ui/features/chat/port-check-model.ts` (the "Fix differences" prompt gets the class names).
- If `inspect_port` text changes: it is at 573 of 600 chars (E10). Trim before adding.

**Verify in the running app.**
- Rebuild `ds-wt/rf-next-tw`: Next 16 with Tailwind 4.2, `/patients` route with the cycle-30 page and `patient-list.jsx` (`cycle-30/route-pairs/real-run-2-rf-next-tw/` has the files), a data fetch, `node_modules` as a dereferenced copy from the Bonaparte pnpm store (read only). Also a plain CSS copy `ds-wt/rf-next-rt` for the CSS path.
- No-model gate first: put the cycle-30 run-2 app files in place, call `pnpm exec tsx scripts/call-action.ts port.apply '<json>'`. Gate: http, mcp and agent match; score from 65 to 90 or more; the diff writes `mb-6`, `text-[32px]`, `max-w-[880px]`, `text-[15px]`; kept text "Ward list for today." and the data rows are unchanged.
- Keep-best check with no model: make a fake second loop that lowers the score (mock driver or a scripted edit); the run keeps the higher state and the note says so.
- **Real-model run (short, 2 runs):** Move to app of the route copy onto `/patients` in `rf-next-tw` after the app change, on main and on the branch. Report first and last port score (gate: branch **80 or more**), values written by the pass, loops run, kept text edited or not, data reads kept, sample rows in `app/`, seconds and cost.
- Dark and light screenshots of the run note and the port check row.

---

## 2. fast-boot: packaged boot back under 600 ms

**Why.** The packaged app reaches Home in 890 ms p50, up from 575 ms on 2026-10-24. Server spawn to ready grew from about 123 ms to about 400 ms, and the window waits for it. `check-boot-imports.ts` fails on main (esbuild at boot). Every session starts here.

**Behaviour.**
- **Profile first.** Run `pnpm exec tsx scripts/check-boot-imports.ts --list` and a CPU profile of the bundled server boot (`--cpu-prof` on the packaged server args, or `node --cpu-prof` on the built server entry). List the top 10 modules and top 10 boot tasks by time in the report, before any change.
- **Heavy modules on first use (P9).** Change the value import of `esbuild` in `src/server/platform/bridge-build/index.ts` to a dynamic import on first build. Check its callers: `src/server/preview/bridge-bundle.ts` and `desktop/build.ts` (W19: keep the platform module the shared owner). Do the same for each other boot module the profile names as a cost over 10 ms (`@babel/parser`, `parse5`, `zod`, `culori`, `chokidar` are candidates; keep a module eager only when Home needs it).
- **Boot work off the ready path.** Any Layer or store that does file I/O or a scan at boot and is not needed for Home moves to first use or to after `serverReady`. Use the existing Layer and runtime-slot rules (S4, S13a).
- **Login shell off the critical path.** `loginShellPath` (`desktop/env.ts`) spawns `zsh -ilc` (190 ms warm, 400 ms cold) before the server spawns. Run it in parallel with `pickPorts` and `locateClaude`, or keep the last PATH in user data and start the server with it, then refresh it after boot. A new PATH reaches the server on the next restart; say so in the report.
- Targets: packaged Home usable p50 **600 ms or less**, spawn to ready **200 ms or less**, `check-boot-imports.ts` passes.

**Headless.** No action or tool. Boot serves UI, MCP and the agent alike; check that the first MCP call and the first agent run still work after the lazy loads.

**Main files.** `src/server/platform/bridge-build/index.ts`, `src/server/preview/bridge-bundle.ts`, `src/server/components/preview-bundle.ts` (if its import is on the boot path), `desktop/{boot.ts,main.ts,env.ts}`, and the boot modules the profile names (list them in the report). Do not edit `main/live-layer.ts` or other hand aggregators; if a service must change its layer, change it in its domain `live.ts`. Do not edit `scripts/perf/baseline.json` (P10).

**Verify in the running app.**
- `pnpm run desktop:pack` on main and on the branch. Run `STUDIO_DESKTOP_EXECUTABLE=... PERF_LABEL=<main|branch> PERF_DESKTOP_SAMPLES=10 pnpm exec tsx scripts/perf/desktop-start.ts` for both, back to back on one machine, and record the load average. Report p50, p95 and the boot marks.
- `pnpm exec tsx scripts/check-boot-imports.ts` passes.
- In the packaged branch app: open Home, open a project, take a frame screenshot (`get_screenshot` over MCP), start a mock run, open an attached app route. All work; the first bridge build after boot still works (esbuild now loads on first use).
- No real-model run.

---

## 3. port-look: a new-route Move to app keeps the prototype fonts and colors (AI quality)

**Why.** Move to app of a new route drops the prototype's look when the app has no matching token. The port plan says `-> no app token` and gives no rule, and it has no font line. The cycle-27 run 3 scored 40 because the agent used Tailwind stone and orange and dropped Fraunces. The prototype is the design the user approved; the app page must look like it.

**Behaviour.**
- **Fonts.** The port plan gets a "Fonts" list: each font family the prototype uses (from its CSS, the pack `pack.json` font names and font links), and for each one the app font that matches (same family in the app `next/font` calls or `@font-face`, or in the Tailwind 4 `@theme` `--font-*`) or "not in the app". For "not in the app", the plan says: "Add it with next/font in the root layout and a `--font-<name>` theme entry; use it only on this route's elements that use it in the prototype." In a plain CSS app: one `@font-face` or `<link>` and one CSS variable.
- **Colors with no app token.** The token line becomes `--ink = #1c1917 -> no app token: add --color-ink: #1c1917 to the @theme block in app/globals.css and use text-ink` (Tailwind 4), or `-> add --ink to :root in <global css>` (plain CSS). A token whose value is within a small distance of an app token keeps the app token (today's `matchColor`).
- **Raw colors.** The "Do not copy" line stays for inline styles and raw colors that are not tokens.
- No UI change. The plan text is the prompt the port run already gets.

**Headless.** No new action. `port.start` (`start_port`) and the studio and agent port runs all build the plan with the same function, so they all get the new lines. If the `start_port` description must name fonts, check its length (E10) and run gen-routes.

**Main files.** New `agent/port-look.ts` (font and token rules, read from the facts the plan already has); `agent/port-plan.ts` only for the two call lines (1298 lines: it must not grow, L2a; move a block out if a line must be added). `agent/port-start.ts` only if the font facts need a file read there (this pick owns it; pick 1 does not touch it).

**Verify in the running app.**
- Make `ds-wt/rf-new-tw` (Next 16, Tailwind 4, Inter only, no `--ink`) and a prototype with Fraunces headings, Inter body and `--ink`, `--accent` tokens (the cycle-27 run 3 prototype if its files are in `cycle-27/`, else a 1-page card list).
- No-model check: the plan text of a port of that prototype (a unit path or the mock port driver; no test files) shows the Fonts list and the `@theme` rules.
- **Real-model run (short, 2 runs):** Move to app as a new route `/menu`, on main and on the branch. Report: computed `font-family` of the h1 on the app route (gate: Fraunces), `color` of the ink text (gate: the prototype value), raw hex colors added to `app/` outside the theme block (gate: 0), `inspect_port` score (gate: 80 or more; cycle-27 run 3 was 40), seconds and cost.
- Dark and light screenshots of the ported route.

---

## 4. paste-replace: paste to replace, and a second paste beside the copy (Figma)

**Why.** Figma users copy a component and replace placeholders with `Mod+Shift+R`. Here they must paste, move and delete. The cycle-30 open bug "a second Mod+V pastes inside the new copy" breaks the common copy, paste, paste flow.

**Behaviour.**
- `Mod+Shift+R` with layers copied (`Mod+C`, cycle 30) and one or more layers selected: each selected layer is replaced by a copy of the copied layers, in the same parent and at the same index. All replacements are one version and one `Mod+Z` step. The new layers are selected after.
- With no copied layers: a toast "Copy a layer first". With a selected frame root or kept app text: no change and a toast with the reason.
- **Second paste.** `Mod+V` when the selection is the layer that the last paste made (or any leaf that cannot hold children): paste after it, in its parent, as Figma does. `Mod+V` on a container that the user picked still pastes inside it (cycle-30 behaviour).
- The key shows in the shortcut sheet and Cmd+K only.

**Headless.** No new action ("replace" is not an N3 verb). The UI writes one `batch_edit` with an `insert_jsx` and a delete per selected layer, so MCP and the agent get the same result with `batch_edit` (tool `batch_edit`, in `direct-edit-element.json`; its schema does not change). If `batch_edit` cannot hold `insert_jsx` today, use the existing structure-op path that makes one history entry, and name it in the report. Add one sentence to the `batch_edit` recipe text only if it fits E10 and does not change the snapshot schema.

**Main files.** `packages/common/contracts/src/contracts.ts` (`StructureKey`, one member `layer-paste-replace`), `shared/{structure-keys.ts,keymap.ts}`, `bridge/keyboard.ts`, `ui/features/versions-layers-tokens/{use-cut-paste.ts,copy-paste-model.ts,use-structure-ops.ts,copy.ts}`.

**Verify in the running app.**
- In an HTML prototype: copy a card, select 3 placeholder boxes, `Mod+Shift+R`: 3 cards in the 3 slots, one version, one `Mod+Z` brings the 3 boxes back.
- In a Tailwind JSX route copy: the same, and the source diff shows the card JSX at the 3 sites.
- Copy a button, `Mod+V`, `Mod+V`: 2 new buttons side by side in the same parent, not nested.
- Select a container, `Mod+V`: the copy goes inside it.
- Over MCP: `batch_edit` with the same ops gives the same source diff.
- Dark and light screenshots of the shortcut sheet row and the toast. No real-model run.

---

## 5. polish-31: small open items

**Items.**
- **Starters load once.** Home calls `GET /api/starters` twice (cycle-30 Results). Check first with the network log; if it still does, dedupe the read in `ui/features/home/use-starters.ts` (or the second caller the agent finds: `prompt-area.tsx`, `starter-pills.tsx`, `home-templates.tsx`). In-flight dedupe only (U12a).
- **Old SVG art goes.** When a photo fills a slot that had studio SVG art, remove the art in the same write, so the page has one picture per slot. Files: `share/image-search/{photo-fill.ts,photo-art.ts,photo-art-jsx.ts}` (only the remove step).
- **`get_screenshot` on a failed dev server.** When the frame shows the dev server error page (or the route does not load), return `isError: true` with the error text and the hint to call the dev status tool, not a picture of the error page. Files: `server/mcp/layer-tools.ts` or `server/mcp/edit-tools.ts` (whichever serves it; never `mcp/registry.ts`), and the agent tool if it is a separate file.

**Headless.** No new action or tool; `get_screenshot` changes only its error result (its schema stays).

**Main files.** Listed per item. No `copy.ts`.

**Verify in the running app.**
- Load Home with the network log open: one `/api/starters` request.
- Photo fill on a prototype with art in 2 slots: each slot has the photo and no `<svg data-studio-art>` (or the art marker the code uses).
- Stop the dev server of a fake app route copy (or break its page), call `get_screenshot` over MCP: `isError: true` and the error text. A healthy route still returns the picture.
- No real-model run.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 route-tw | new `review/port-check/port-apply.ts` and its service file; `review/port-check/{index.ts,port-match-store.ts,port-pair-values.ts}`; new `actions/src/port/apply.ts`, `actions/src/port/schema.ts`, `actions/src/port/inspect.ts` (text only); new `handlers/port/apply.ts`; `agent/{port-review.ts,port-review-read.ts}`, new `agent/port-review-pass.ts`; `ui/features/chat/port-check-model.ts`; the `direct-edit` area `index.ts` export line (only if it must widen) |
| 2 fast-boot | `platform/bridge-build/index.ts`; `preview/bridge-bundle.ts`; `components/preview-bundle.ts` (import only); `desktop/{boot.ts,main.ts,env.ts}`; the boot modules its profile names |
| 3 port-look | new `agent/port-look.ts`; `agent/port-plan.ts` (call lines only); `agent/port-start.ts` |
| 4 paste-replace | `contracts/src/contracts.ts` (`StructureKey`); `shared/{structure-keys.ts,keymap.ts}`; `bridge/keyboard.ts`; `ui/features/versions-layers-tokens/{use-cut-paste.ts,copy-paste-model.ts,use-structure-ops.ts,copy.ts}` |
| 5 polish-31 | `ui/features/home/use-starters.ts` (and the second caller); `share/image-search/{photo-fill.ts,photo-art.ts,photo-art-jsx.ts}`; `mcp/{layer-tools.ts or edit-tools.ts}` |

Shared files and conflict warnings:
- **`copy.ts`:** only pick 4 adds text (`ui/features/versions-layers-tokens/copy.ts`, 2 toast lines). Pick 5 adds no copy. Pick 1 adds no UI text outside `port-check-model.ts`.
- **Unions:** only pick 4 changes a union (`StructureKey`, one member). Pick 1 adds new schemas in `port/schema.ts` and changes no existing union.
- **`@generated` lists:** only pick 1 adds an action. gen-routes rewrites `actions/src/port/{index.ts,routes.ts}`, `all-actions.generated.ts` and `handlers/port/handlers.ts`. Run `pnpm exec tsx scripts/gen-routes.ts` in the branch and `--check` after each merge. No pick edits a hand aggregator.
- **Port area (picks 1 and 3):** no shared file. Pick 1 owns `port-review*.ts`, `review/port-check/*` and `actions/src/port/*`. Pick 3 owns `port-plan.ts`, `port-start.ts` and the new `port-look.ts`. Neither edits `port-route-update.ts`; if pick 1 needs it, pick 1 owns it and says so. If pick 3 must change the `start_port` description, it edits `actions/src/port/start.ts`, which pick 1 does not touch; both then run gen-routes, so merge pick 1 first and regenerate.
- **`direct-edit` area `index.ts`:** pick 1 only, one export line if needed. Pick 4 uses `batch_edit` as it is.
- **`preview/` and `components/` (pick 2) vs `mcp/` (pick 5):** no shared file. If pick 5's dev server error check needs a `preview/` helper, it adds it in a new leaf file, never in `bridge-bundle.ts`.
- **`share/image-search` (pick 5):** no other pick touches it.
- **Fake apps under `ds-wt`:** pick 1 `rf-next-tw` and `rf-next-rt`; pick 3 `rf-new-tw`; pick 5 its own app route copy (`pl-next`). No two picks share one. No pick writes into Bonaparte.
- **MCP snapshots:** no pick changes a tool schema in `artifacts/mcp-snapshots/*.json`. `apply_port` is new and in no snapshot. `get_screenshot` changes only its error result.
- **`.claude/goal/roadmap.md` Appendix A:** add the new files of each pick when the file is in the worktree (L6e).

## Merge order

All 5 can run at once. Merge in this order:
1. **fast-boot**: boot and import changes first, so every later real run uses the faster boot and a lazy-load fault shows early.
2. **route-tw**: the Bonaparte pick; adds `port.apply` and regenerates the port lists.
3. **port-look**: port plan files; run gen-routes `--check` after it (it follows pick 1's regenerated lists).
4. **polish-31**: Home, image-search and MCP screenshot files.
5. **paste-replace**: contracts union, keymap, bridge and layer files; run `pnpm run typecheck` once more after it, because `StructureKey` is shared.

After the last merge, run `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run check:scripts`, `pnpm run lint:gate`, `pnpm run build:ui`, `pnpm exec tsx scripts/check-bundle.ts` and `pnpm exec tsx scripts/check-boot-imports.ts`. Then `pnpm run desktop:pack` and the packaged `desktop-start.ts` measure (10 samples). Then one real-model session of 2 runs on merged main:
1. Move to app of a `rf-next-tw` `/patients` route copy after the app change: first and last port score, values written by the studio pass, loops, data reads kept, seconds and cost.
2. Move to app of the Fraunces prototype as a new route in `rf-new-tw`: h1 font, ink color, raw colors, port score.

Real-model checks (local Claude Code sign-in, short runs; Move to app only into a fake Next app under `ds-wt`, never Bonaparte):
- pick 1: 2 runs (main and branch), only after the no-model gate passes;
- pick 3: 2 runs (main and branch);
- the final merged session (2 runs).

Picks 2, 4 and 5 need none.

## Runners-up

1. Kit check cards: add `card` (and `badge`) to `KitDriftTagSchema` and map hand-styled card blocks to the app Card recipe; a union change.
2. Cold project open: about 11 reads each wait about 170 ms on the first open after boot (warm 2 to 10 ms); measure the blocking task on the server first, then fix it.
3. Flow onto existing routes: Move to app of a flow still refuses routes that exist (route-apply "Left out").
4. Bring forward and send backward on `Mod+]` and `Mod+[` as Figma aliases; decide flow layout (DOM order) against free layers (z-index through `set_stacking`) first.
5. Photo slots from the image provider: when `create_image` has a key, offer generated images for art slots, as an opt-in cost.
6. Canvas memory (doop): a design note on the canvas that every new frame and run in the project reads.
7. Load `TodoWrite` up front, not behind `ToolSearch`; measure the first-draft time first.
8. `Mod+A` with a layer selected selects its siblings (Figma); today `Mod+A` selects frames only when nothing is selected.
9. Figma variables JSON import and export: read a Figma variables JSON into project tokens (Figma ships JSON variables export).
10. Starter pills build with AI for a new user (today they copy a static template); waits for the Home cuts decision.

Sources: [Figma release notes](https://figma.com/release-notes), [Figma release notes archive](https://www.figma.com/release-notes/archive/?page=2), [Figma design agent on canvas](https://designcompass.org/en/2026/05-1tp-3tea/22/figma-design-agent-on-canvas/), [Figma Intelligent Canvas](https://designcompass.org/en/2026/07/15/figma-intelligent-canvas-ai-full-stack-creation/), [mcp.directory 2026 comparison](https://mcp.directory/blog/claude-design-vs-stitch-vs-v0-vs-lovable-vs-figma-make-2026), [Figma Make vs Lovable](https://playcode.io/blog/figma-make-vs-lovable).

## Results

- Merged with no conflicts, in order: fast-boot, route-tw, port-look, polish-31, then paste-replace (main at 7850f4f3a).
- paste-replace: two copies of the build agent ran in one worktree (a SendMessage answer resumed a second copy), both stopped uncommitted; a fresh agent finished it. Mod+Shift+R replaces 1 or N layers in one version and one undo; the second Mod+V lands beside the copy; forceReload moved to Cmd+Alt+Shift+R. edit_element gains an optional replace field (MCP snapshot diff, user decision).
- route-tw: new apply_port writes paired prototype values as Tailwind classes; score 65 -> 95 over HTTP and MCP. No branch real run proves the 80 gate (the run resumed main's session and skipped the check).
- port-look: real run keeps Fraunces and #1c1917 ink; port score 98 (main 67).
- fast-boot: repeat launch Home p50 775 ms (main 898 ms); first launch unchanged (~1080 ms); 600 ms target not met; check-boot-imports passes (fails on main).
- polish-31: /api/starters loads once; leftover art rules removed when a photo fills; get_screenshot returns isError on a failed dev server.
- Checks: gen-routes --check pass, typecheck 0 errors, lint:gate pass (59619, baseline 89733), build:ui pass, check:clip 0 findings, desktop:pack pass.
- Installed app: :4570 returns 200. Server idle CPU 0.02 CPU-s/min over 60 s.
- Open: first-launch boot still ~1080 ms (effect bundling, lazy tool registries, window before server ready); route-tw real-run proof; the in-app agent is refused apply_port during a Move to app run.
