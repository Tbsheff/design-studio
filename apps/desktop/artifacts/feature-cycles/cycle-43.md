# Feature cycle 43: next 5 features

Date: 2026-11-14. Main at `a864478c2` (all 5 cycle-42 picks merged; B1 at 274,673 B, and the baseline is now 274,673 B, so the margin is 0 B).

## Method

- Read `cycle-42.md` (picks, runners-up, Results, Open) and `cycle-42/{polish-42,batch-rename,route-into,token-color,frame-link}.md` ("Left out", "Open" and "Differences from the spec").
- Read the runners-up of `cycle-34.md` to `cycle-41.md`, and counted the items that came back cycle after cycle. Read `cycle-35/flow-update.md` lines 55 to 62 (dynamic route default).
- Read the code for each candidate:
  - Keys and Figma editing: `shared/{keymap.ts,keymap-edit.ts,keymap-view.ts}` (all labels), `ui/features/inspector/{inspector-model.ts,inspector-tab-body.tsx,tab-bar.tsx,prototype-tab.tsx,tweaks-tab.tsx,position-model.ts,position-rows.tsx,absolute-toggle.tsx,appearance-grid.tsx,corners-model.ts,corner-field.tsx,image-adjust-model.ts,copy.ts}`, `ui/features/versions-layers-tokens/copy.ts` (Hide, Lock), `server/direct-edit/engine/tailwind/{map.ts,copy.ts,keyword-groups.ts}`, `server/direct-edit/engine/validate.ts`, `packages/common/actions/src/effect/schema.ts` (effect kinds), `server/style-scope/effect/engine/compile.ts`.
  - Tweaks and chat: `ui/features/inspector/{use-tweaks.ts,tweaks-tab.tsx}`, `ui/app/studio/{left-props-panels.tsx,use-studio-state.ts,use-studio-edit.ts,use-studio-run.ts}`, `git show b46482d6b` (the commit that took Tweaks out of `TABS`), the file lists of `ui/features/{chat,home,suggestion}`, `ui/features/chat/{mention-options-model.ts,use-first-build.ts,slash-groups.ts}`, `contracts/src/contracts.ts` (`RunMention`, line 433), `actions/src/{suggestion/run.ts,image/update.ts,variation/start.ts,run/start.ts,direct-edit/{get-tweaks,set-tweak,update-tweaks}.ts}`, `server/agent/mock.ts` (tweaks mock, lines 938 and 985).
  - Share approval for the agent: `actions/src/share/create.ts`, `server/mcp/{registry.ts,agent-call.ts,server.ts}`, `server/http/mcp-routes.ts`, `server/agent/{sdk-driver.ts,ask-gate.ts,tool-sets.ts,lifecycle.ts}`, `server/agent/tool-groups/{agent-only.ts,port-apply-call.ts}`, `server/handlers/_core/run-action.ts`.
  - Token color: `ui/features/versions-layers-tokens/{use-color-picker-slot.ts,tokens-sections.tsx,token-inputs.tsx,token-color-swatch.tsx,use-token-draft.ts,use-token-commit.ts}`.
  - Batch title: `server/direct-edit/commit/batch.ts` (`batchTitle`, line 276), `contracts/src/contracts.ts` (`DirectEditBatchResult.applied`, line 2302).
  - next/font: `server/design-system/font-list/font-list-run.ts` (line 186), `server/design-system/extract/next-font.ts` (line 8), `server/direct-edit/commit/` file list. Bonaparte `apps/dashboard/app/layout.tsx` lines 6 and 82 (read only, `git grep`).
  - Move to app: `server/agent/port-assets.ts` (`toAssetTarget`, line 174), `ui/features/design-system/{port-model.ts,use-port-form.ts}` (`toSourceRoute`, line 133), `actions/src/port/` tool names.
  - Accessibility: `actions/src/accessibility/` (0 hits for `colorScheme`), `actions/src/workspace/get-screenshot.ts` (line 87).
  - Tool names: `artifacts/mcp-snapshots/{direct-edit-element.json,share.json}` (tool names read with `node -e`).
- Ran `git branch -a --list` for the 5 keys (0 hits) and `ls` on `ds-wt` for fixture prefixes.
- Did no web search, no real-model run, no app run, no build and no test. The B1 number is from the cycle-42 Results and commit `a864478c2`.

### Open items from cycle 42, and the pick that closes each

| Open item | Pick |
|---|---|
| font-web: no `next/font` write for Next apps (not built in polish-42) | 1 polish-43 |
| token-color: pointer up saves all pending token edits, not only the dragged one | 1 polish-43 |
| token-color: an alias token becomes a literal color after a drag | 1 polish-43 |
| batch-rename: a name-only batch is titled "Edit text of N elements" | 1 polish-43 |
| frame-link: the agent path refuses `create_share_link` ("no approval prompt") | 1 polish-43 |
| token-color: the inspector `TABS` list has no Tweaks tab, so the tweaks panel cannot open from the UI | 4 tweak-entry |
| batch-rename: `$&` is empty on an unnamed layer; no reselect after the write | Runner-up 6 |
| frame-link: frame rows only for links made in this app session; cloud viewer | Runner-up 3 |
| polish-42: rule Fix in `@media` and nested rules; gradient stop live write | Runner-up 7 |
| `check:scripts` S11, E1, O12 and E16 items | Tyler decides. Not planned |
| MCP snapshot refresh and snapshot-check wiring | Tyler decides. Not planned. No pick edits a snapshot file |
| Cmd+Z by OS keyboard (macOS menu) | Tyler decides. Not planned |
| Home preload at or under 274,673 B | Gate for every pick |

### Findings

- **Home preload (a rule for all picks).**
  - The gate is B1 at or under 274,673 B, and no chunk name that is not in `baseline.json` `B1.chunks` (`checkB1`, `check-bundle.ts`). Never edit `scripts/perf/baseline.json` (P10, L6).
  - The margin is 0 B. The token-color report shows that 1 new 86 B shared chunk (`color-picker-slot`) cost about 38 B in B1, because it shifted the `__vite__mapDeps` indexes in `screen-preload`. So every pick follows this rule: **no new lazy chunk, no new lazy `import()`, no new lazy export in a feature `index.ts`, no new CSS module.** Put new code in files that an existing chunk already loads (plain static imports from an existing inspector, chat, port or server file). Put new CSS in an existing CSS file (as batch-rename put its popup CSS in `canvas.css`).
  - Stop rule: if `check-bundle` shows B1 over 274,673 B after the pick, find the new chunk or the moved import and remove it. If B1 still goes over, stop and report the bytes and the chunk list. Do not edit `baseline.json`.
  - Chunk list note (token-color report): in its builds the Home list was not the same as `baseline.json` `B1.chunks` (`stream` and `keymap` missing, `pick` 2 times). `check-bundle` fails only on a new name, so it passed. Each pick writes the Home chunk list from its build in its report, so the merge step can compare.
  - No key handler goes in a Home chunk (`ui/features/commands/**`, `ui/platform/*`, `ui/app/main.tsx`, `ui/app/screen-preload.ts`). No pick edits `packages/ui/src/index.ts` (in the Home preload).
  - Which edited files are in the preload: the built `dist/ui/index.html` (built 2026-11-14 19:19, read only) preloads 31 files, and the only `copy-*` file there is `copy-DaO5MfxL.js` (950 B). The chat copy (`copy-Ba7r248G.js`, "Type a message first") and the inspector copy (`copy-DcgTYJ1n.js`, `tabTweaks`) are not in the preload. The tweaks run text is in `studio-*.js`. So no file that a pick edits is in the B1 preload.
  - But Home imports chat code in lazy Home chunks: `home/home-slash.tsx` lines 10 to 12 import `chat/index.js`, `chat/slash-groups.js` and `chat/slash-menu.js`, and `home/use-studio-data.ts` line 13 imports `chat/index.js`. A new import in `chat/slash-groups.ts` or `chat/index.ts` goes into those Home chunks. Pick 4 puts its `/tweaks` item in a studio-only group (see pick 4).
- **Tweaks: the panel is lost (real gap 1, Claude Design).**
  - Commit `b46482d6b` (2026-11-08, the editor split) changed `TABS` (`inspector-model.ts` line 54) to `simple`, `prototype`, `code`. It took out `{ id: "tweaks", label: copy.tabTweaks }`. The type still has `"tweaks"` (line 22), the body still renders `TweaksTab` (`inspector-tab-body.tsx` line 36), and `copy.tabTweaks` is still at `copy.ts` line 290.
  - Nothing else opens it: `setInspectorTab` has 1 caller, the tab bar (`left-props-panels.tsx` line 105). 0 hits for a tweaks slash command (`chat/slash-groups.ts`) or a command palette item.
  - So the "Suggest tweaks" run (`use-tweaks.ts` line 27), the live sliders and `set_tweak` writes have no UI since 2026-11-08. Claude Design shows tweaks after each design; that is its main editing loop for non-designers.
  - Headless: `list_tweaks`, `set_tweak`, `update_tweaks_direct_edit` exist (`direct-edit-element.json`). `start_run` takes `task` (`run/start.ts` line 64), and the mock driver handles `task: "tweaks"` (`agent/mock.ts` line 938), so a check needs 0 real-model runs.
- **Figma: Position when scrolling (real gap 2).**
  - Figma has "Position: Scroll with parent, Fixed, Sticky" for a layer in a scroll frame. Here 0 hits for `sticky` in `ui/features/inspector`. The position rows have only the absolute toggle (`absolute-toggle.tsx`, 28 lines) and pins (`position-model.ts`, `constraints-model.ts`).
  - The Prototype tab holds only a hint and a "Use the link tool" button (`prototype-tab.tsx`, 20 lines). Figma puts scroll behavior in the Prototype panel.
  - The writers exist: Tailwind keyword group `position` has `fixed` and `sticky` (`tailwind/keyword-groups.ts` line 55); plain CSS writes `position` through `edit_element`. Overflow exists (`appearance-grid.tsx` line 21, `OVERFLOWS`).
- **Figma: corner smoothing (real gap 3).**
  - Figma has "Corner smoothing" (0 to 100 %, iOS at 60 %). 0 hits for `corner-shape|squircle|smoothing` in `ui/features/inspector`, `ui/features/fill`, `ui/features/effect`. Per-corner radius exists (`corners-model.ts`, 77 lines; `corner-field.tsx`, 45 lines).
  - CSS `corner-shape` (`squircle`, `superellipse(k)`) renders in Chromium 139 and later. The app uses Electron 44.9.3 (`apps/desktop/package.json` line 110), so the canvas shows it. Safari and Firefox ignore it and draw the plain radius. That is a safe fallback for a real app.
  - Tailwind: an unknown property gets an arbitrary class through the default branch of the class namer (`tailwind/map.ts` line 772, `` `[${prop}:${...}]` ``), so `[corner-shape:squircle]` needs no writer change and no `edit_element` input change.
- **Move to app with a dynamic route (real gap 4, Bonaparte).**
  - Assets: `toAssetTarget` (`port-assets.ts` line 174) takes the last route segment for the folder. For `/visits/[id]` the slug is from `[id]`, so assets go to `public/id/` (runner-up since cycle 37). Bonaparte has many `[id]` routes.
  - Default route: `toSourceRoute` (`port-model.ts` line 133) returns `source.routePath` when the flow has no matching page; `use-port-form.ts` line 111 calls it with `flow: null`. For a copy of `/visits/[id]` made from `/visits/1`, `routePath` is the fixture path, so a single-page move can write `app/visits/1/page.tsx` (cycle-35 `flow-update.md` line 61, not rechecked since).
  - Tools: `start_port`, `inspect_port`, `apply_port` (`actions/src/port/`).
- **polish-43 items.**
  - next/font: still not built. `isHtmlPrototype` (`font-list-run.ts` line 186) gates the "Google Fonts" group. `LAYOUTS` (`next-font.ts` line 8). No `next-font-import.ts` engine and no `next-font-plan.ts` in `direct-edit/`. Bonaparte `<body className={`${inter.className} size-full h-screen overflow-hidden`}>` (layout line 82) is a template literal. `batch.ts` has 429 lines and `apply.ts` 152.
  - Token commit scope: `tokens-sections.tsx` line 28 provides `TokenCommitSlot` with `props.draft.commit`. `use-color-picker-slot.ts` line 24 calls it on pointer up. `useTokenCommit` sends `toChanges(pendingRef.current)` (`use-token-commit.ts` line 64), so every pending token goes in that version.
  - Alias: the popup opens on the resolved swatch (`token-color-swatch.tsx` line 27 passes `swatch` and `value`), and `onCommit` writes the picked color. So `var(--brand)` becomes a literal after any drag, with no sign in the UI.
  - Batch title: `batchTitle` (`batch.ts` line 276) reads only `style`, `classes` and `text` from `applied`. `DirectEditBatchResult.applied` has no name flag (`contracts.ts` line 2302). With no style and no classes it returns "Edit text of …" (line 288).
  - Share approval: see the decision in pick 1. The chat run already gets a permission card: `lifecycle.ts` line 945 passes `ask` to the driver, `sdk-driver.ts` line 787 makes `actionAsk`, and `runActionCaller` (`registry.ts` line 458) uses `callerGate` (line 319) and `agentGate` (line 301). `create_share_link` is `agent: { lean: false, set: "core" }`, so a normal edit run has it, and a lean run does not. The refusal in cycle 42 came from the agent tool route: `mcp-routes.ts` line 86 calls `runAgentTool` (`agent-call.ts` line 103), whose `toAgentCaller` (line 83) calls `runActionCaller` with no `actionAsk`, so `callerGate` returns `refuseAll` (`registry.ts` line 191, text at line 189). The `ApprovalQueue` is made in the same file (`mcp-routes.ts` line 98).
- **Ideas dropped because the code exists.** Bring forward and back keys (`keymap-edit.ts` lines 104 to 124), Copy and Paste style keys, Wrap in auto layout (Shift+A area, `keymap.ts` line 253), layout grids (`canvas/layout-grid-*.tsx`), image adjustments (`inspector/image-adjust-model.ts`), AI image edit (`update_image`), noise, glass and shader effects (`effect/schema.ts` lines 105 to 130), list styles, OpenType number styles (`number-style-model.ts`), text transform, overflow, Hide and Lock in the Layers panel (`versions-layers-tokens/copy.ts` lines 74 and 78), next-prompt chips (`run_suggestion`), mentions of files, tokens and components (`RunMention`), "Ask the chat about the selection", variations (`start_variation`), run modes Edit, Plan, Critique, prompt history search.
- **Repeat items.**
  - `inspect_accessibility` has no `colorScheme` (cycles 39 to 42): still real (0 hits in `actions/src/accessibility/`). Runner-up 1.
  - Hide and lock keys: `Mod+Shift+H` is "Go to Home" (`keymap.ts` line 61). It needs a key decision first. Runner-up 4.
  - Card parts (cycles 39 to 42), near-duplicate shadows (41, 42): runners-up.
- **Long files.** `inspector/copy.ts` 487 lines (L2a: about 13 lines in total for all picks; see File ownership), `direct-edit/commit/batch.ts` 429, `server/agent/port-assets.ts` 322, `ui/features/design-system/port-model.ts` 321, `contracts.ts` 2,758 (no pick edits it), `tailwind/map.ts` 966 (no pick edits it).
- **Tool names.** No pick adds an action. Every pick reuses tools by name: `edit_element`, `batch_edit`, `list_font`, `update_tokens_direct_edit`, `get_tokens`, `create_share_link`, `list_tweaks`, `set_tweak`, `update_tweaks_direct_edit`, `start_run`, `get_layers`, `start_port`, `inspect_port`, `apply_port`. No tool input or description changes, so no snapshot changes (`isSameTool` compares inputs and annotations only).
- **Branch check.** No `feat/polish-43`, `feat/scroll-pin`, `feat/squircle`, `feat/tweak-entry` or `feat/dyn-route`.
- **Fixture prefixes.** `p43-`, `pin-`, `sq-`, `twk-` and `dyn-` are not in `ds-wt`. `sp-`, `cs-` and `tw-` are in use, so no pick uses them. `ac-next-b` is in `ds-wt`; picks copy it and never write into it.
- **`.claude/goal/roadmap.md`.** It is ignored (`.gitignore`, `.claude/`), so a worktree does not get it. Each pick writes "not in worktree" in its report and lists its new files there, so the merge step can add them to Appendix A (L6e).

## Ranking

Score = value x fit with "simple and fast" / effort (1 to 5 each).

| Rank | Key | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|---|
| 1 | polish-43 | `next/font` writes, 1-token commits, alias kept, "Rename N layers", agent share approval | 4 | 5 | 4 | 5.0 |
| 2 | scroll-pin | Position when scrolling: Fixed and Sticky (Figma) | 4 | 5 | 2 | 10.0 |
| 3 | squircle | Corner smoothing (Figma) | 3 | 5 | 2 | 7.5 |
| 4 | tweak-entry | Tweaks back in the inspector, a run-end chip and `/tweaks` (chat, Claude Design) | 5 | 5 | 2 | 12.5 |
| 5 | dyn-route | Move to app keeps the `[id]` route and its asset folder (Bonaparte) | 4 | 5 | 2 | 10.0 |

The file lists the picks in a fixed order (polish, Figma, Figma, chat, Bonaparte), not by score. Picks 2 and 3 are Figma manual-editing gaps. Pick 4 improves the chat and the prompt-to-first-design path. 0 picks add a Review check. 0 picks add an action, so 0 picks change the `@generated` action lists. No pick adds a lazy chunk, an always-visible control on Home or a Home import.

---

## 1. polish-43: next/font writes, 1-token commits, alias kept, rename title, agent share approval (polish)

**Items.** Prove each one first; change code only for what the proof shows.

- **font-web: `next/font` write for Next apps.** The cycle-42 design, unchanged:
  - Proof first: `ds-wt/p43-font` (copy of `ac-next-b`) and a read of its layout. Expected on main: no "Google Fonts" group; a typed family previews with no link.
  - Rows: `isHtmlPrototype` (`font-list-run.ts` line 186) becomes 2 cases. The "Google Fonts" group shows in an HTML prototype (as now) and in a Next app whose layout file (`next-font.ts` `LAYOUTS`) exists. Other apps: no group.
  - Write: a new pure engine `direct-edit/engine/next-font-import.ts` (`toNextFontLayoutCode(code, family)`) adds, in the layout file: the family to the `next/font/google` import (or a new import line), a const `const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });`, and `${fraunces.variable}` to the className of `<html>` or `<body>`. It handles a string literal and a template literal (Bonaparte `apps/dashboard/app/layout.tsx` line 82: add `${fraunces.variable} ` inside the backticks). For a className built with `cn()` or another call, it returns `{ ok: false, code: "class_in_code" }`, and the edit fails with "The layout className is built in code. Add the font in the layout by hand, or ask Claude." (P7).
  - The element gets `font-family: var(--font-fraunces), <fallback>` (Tailwind: `font-[family-name:var(--font-fraunces)]`).
  - Commit: the layout file and the element's file are 1 version and 1 Cmd+Z. Use the many-file commit in `commit/batch.ts`, called from both `apply.ts` and `batch.ts` through 1 new helper `commit/next-font-plan.ts`. Do not put the step in `edit-plan.ts` (it plans 1 file). Skip the layout step when the layout already imports the family.
  - Preview: reuse the `font-preview` bridge message. No new message.
  - Pass: `p43-font` `h1`: pick Fraunces, Enter: 1 version, the layout imports Fraunces once, the `h1` uses the variable, Cmd+Z restores both files. Pick it again on a second element: no second import. `edit_element` over MCP with a Fraunces stack: the same 2-file version. `list_font` over MCP in `p43-font` returns `catalog` rows. A copy of the layout with `cn(...)`: the refusal text. A copy with the Bonaparte template literal: the variable goes in the backticks, and the rest of the className stays the same.
- **token-color: pointer up saves only the dragged token.**
  - Proof first: HTML prototype `ds-wt/p43-token` with `--brand: #2563eb`, `--accent: #f59e0b`, `--overlay: rgb(15 23 42 / 0.5)`. Type a new `--accent` value (pending), then drag `--overlay` alpha and release. Expected on main: 1 version with both tokens.
  - Fix: `useTokenDraft` gets `commitOne(name)`, which sends only `pendingRef.current[name]` through the same `send` path of `use-token-commit.ts` and removes only that key from the draft. `TokenCommitSlot` (`use-color-picker-slot.ts` line 14) changes its value type to `((name: string) => void) | null`, and `tokens-sections.tsx` line 28 provides `draft.commitOne`. The slot input gets the token name. Other pending tokens stay pending, and Save still commits all.
  - Pass: `p43-token`: the drag gives 1 version with `--overlay` only; `--accent` still shows as pending; Save gives a second version with `--accent`. 1 Cmd+Z after the drag restores `--overlay` only.
- **token-color: an alias token keeps its alias.**
  - Rule (Figma: a drag detaches the alias, and the UI says so):
    - Open the popup and close it with no change: no write, and the value stays `var(--x)`.
    - The popup of an alias token shows a row "Linked to --x" at the top. The first drag detaches it: the row changes to "Detached from --x", and pointer up writes the literal. Escape during the drag reverts to `var(--x)`, with no write.
    - A plain color token shows no row.
  - Text: 2 lines in `versions-layers-tokens/copy.ts` (256 lines). The row lives in the token side of the slot (`token-color-swatch.tsx` or a new `versions-layers-tokens/alias-row.tsx`, a static import, no lazy chunk). Do not edit the cycle-41 `inspector/color-*` files; if the popup must show the row, pass it through `ColorPickerSlotProps` (`ui/domain/color-picker-slot.ts`) as `header: ReactNode | null`.
  - Pass: `p43-token` with `--ring: var(--brand)`: open and close: no version. Drag: the row says "Detached from --brand", 1 version with a literal. Escape mid-drag: `var(--brand)` stays.
- **batch-rename: the title of a name-only batch.**
  - Proof first: `rename_layer` with 3 layers on `ds-wt/p43-rename` (12 cards). Expected on main: the Versions list shows "Edit text of 3 elements".
  - Fix: `batchTitle` (`batch.ts` line 276) also takes the batch requests. When every request changes only `name` (no `style`, `text`, `classes`), the title is "Rename 1 layer" or "Rename N layers". Do not add a field to `DirectEditBatchResult` (`contracts.ts`). Keep `batch.ts` under 500 lines (429 now).
  - Pass: `p43-rename`: F2 on 12 cards, "Card $n": the version is "Rename 12 layers". A style batch keeps its old title.
- **frame-link: the agent and `create_share_link`.**
  - Decision: the agent needs it. "Share this with my team" is a normal chat request, and Claude Design gives a share link from chat. Keep `agent: { lean: false, name: "create_share_link", set: "core" }`. Do not add a new prompt: the chat run already shows its permission card for every `confirm: "user"` action (`lifecycle.ts` line 945 `ask`, `sdk-driver.ts` line 787 `actionAsk`, `registry.ts` `callerGate` line 319). A lean edit run does not list the tool, as now.
  - Fix: only the agent tool route has no gate. Do not change the signature of `runAgentTool`: it has other callers (`agent/port-review-pass.ts`, `agent/port-review-read.ts`, `main/{mock-prototype-driver,starter-look-driver,mock-import-driver}.ts`), and they stay as they are. Add a separate entry `runGatedAgentTool(runtime, name, body, ask)` in `server/mcp/agent-call.ts`, exported through `server/mcp/index.ts` (1 export line). It is the same as `runAgentTool`, but it gives `ask` to `runActionCaller` as `actionAsk`. Only `server/http/mcp-routes.ts` line 86 calls it, with an `ActionAsk` made from the `approvals` queue (line 98).
  - The adapter (a new function in a sibling file of `agent-call.ts`, N5d verb name such as `toQueueAsk`) calls `approvals.ask` with the tool, client `"agent"` and projectId, and maps `"allow"` to `{ allow: true }` and every other outcome to `{ allow: false, note }`. Write the note text in the adapter file; do not import `GATE_TEXT` (it is a private const in `registry.ts`, and no pick edits `registry.ts`). So the route shows the same approval card as an MCP call, and `call-action.ts` answers it with `POST /api/mcp/approvals/:id` (V3).
  - Proof first: `pnpm exec tsx scripts/call-action.ts share.create '{"projectId":"<p43-share>"}'`. Expected on main: the agent leg is refused with "this caller has no approval prompt".
  - Safety rule for this check: the dev run binds 127.0.0.1 only, with a fresh `STUDIO_DATA_DIR=$(mktemp -d)` that has no cloud account. Never click "Allow phone access on this Wi-Fi". Never send `PUT /api/shares/lan` with `isOn: true`. Revoke the test links at the end with `revoke_share_link`. Write in the report that LAN sharing stayed off (`GET /api/shares/lan` before and after).
  - Pass: `call-action.ts share.create`: http, mcp and agent each return a link with 4 `frameUrls`. The mcp and agent legs each show 1 approval card first; the http leg shows none (`http/mount.ts` line 119 mounts with `allowAll`, as on main). 0 diffs other than per-call values. A denied card on the agent leg gives the deny text, not the "no approval prompt" text. The other `runAgentTool` callers behave as on main.

**Headless.** No new action and no new tool name. `edit_element` and `batch_edit` write `next/font` in a Next app. `list_font` lists the catalog in a Next app. `update_tokens_direct_edit` writes 1 token. `rename_layer` versions get "Rename N layers". `create_share_link` works on the agent route after approval. No description or input change, so no snapshot changes.

**Main files.** New `direct-edit/engine/next-font-import.ts`; new `direct-edit/commit/next-font-plan.ts`; `direct-edit/commit/{apply.ts,batch.ts}`; `direct-edit/index.ts` (export lines); `design-system/font-list/font-list-run.ts`; `versions-layers-tokens/{use-token-draft.ts,use-token-commit.ts,use-color-picker-slot.ts,tokens-sections.tsx,token-color-swatch.tsx,copy.ts}` and new `alias-row.tsx` if needed; `ui/domain/color-picker-slot.ts` (only the `header` prop, if needed); `server/http/mcp-routes.ts`; `server/mcp/agent-call.ts`, `server/mcp/index.ts` (1 export line) and a new sibling adapter file; fixtures `ds-wt/p43-*`. Not `contracts.ts`, not `actions/src/share/**`, not `server/mcp/registry.ts`, not the other `runAgentTool` callers, not `packages/ui/**`, not `baseline.json`, not `artifacts/mcp-snapshots/**`.

**Verify in the running app.** The steps above, on `STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev`. Dark and light screenshots of the font list in `p43-font` and of the alias row. `pnpm exec tsx scripts/call-action.ts font.list '<json>'` on `p43-font` and `share.create` on `p43-share`: 0 diffs. `pnpm run build:ui`, `check-bundle`: B1 at or under 274,673 B, no new chunk name. No real-model run.

---

## 2. scroll-pin: Position when scrolling, Fixed and Sticky (Figma)

**Why.** In Figma you set a header to "Sticky" or a tab bar to "Fixed", and the prototype keeps it in place while the page scrolls. Here the inspector has no control for it, so a sticky header needs a prompt or a code edit. Every real app page (Bonaparte nav, table headers, phone tab bars) needs this.

**Behaviour.**
- **Where.** The Prototype tab of the inspector gets a "Scroll behavior" section above the link tool hint: "Position" with 3 choices, "Scroll with parent", "Fixed", "Sticky" (a segmented control, `.ui-menu` styles, 28 px rows).
- **Sticky.** Writes `position: sticky` and `top: 0` (Tailwind `sticky top-0`). When the layer already has a `top` value, it keeps it. The section shows a "Top" number field for the stick offset.
- **Fixed.** Writes `position: fixed` with the current `top` or `bottom` pin (the pin model in `position-model.ts`), and `z-index: 10` when the layer has no z-index, so it paints over the content. In Tailwind: `fixed top-0` plus `z-10`.
- **Scroll with parent.** Removes `position`, the offset and the added `z-index` (the `IN_FLOW` patch, `position-model.ts` line 27).
- **Read.** The control shows the current value from the computed style: `sticky`, `fixed`, else "Scroll with parent". An `absolute` layer shows "Scroll with parent" disabled, with the tip "Absolute layers move with their parent. Turn off absolute first."
- **Canvas.** A canvas frame that fits its content shows no scroll, so sticky has no visible effect there. The section says "Scroll in Present with a device to see it."
- **Present.** With a device frame, the play iframe is the device screen height (`viewHeight: spec.screenHeight`, `device-frame-model.ts` line 143), so the page scrolls inside it and sticky and fixed work with no extra code. With no device, the iframe is the frame height (`viewHeight: slot.frame.height`, line 92; `play-frame.tsx` line 49); a frame that fits its content does not scroll. The proof step writes, for `pin-seed`, the frame height and whether Present with no device scrolls. If it does not, the pick does not change Present: the section text names the device step, and a viewport-height Present for desktop frames is a runner-up.
- **Write.** 1 choice = 1 version, 1 Cmd+Z. Multi-selection: the same value for each layer, 1 version (batch).

**Spec.**
- `inspector-tab-body.tsx` passes `props` to `PrototypeTab` (today it takes none). `prototype-tab.tsx` renders the new section from a static import (no lazy chunk).
- New `inspector/scroll-pin-section.tsx` (component), `inspector/use-scroll-pin.ts` (hook, U6a), `inspector/scroll-pin-model.ts` (pure: `toScrollPin(computed)`, `toScrollPinPatch(choice, current)`). Writes go through the existing edit session (`use-edit-session.ts`), the same path as `absolute-toggle.tsx`, so Tailwind and plain CSS both work.
- Text: 5 lines or fewer in `inspector/copy.ts` (487 lines; see File ownership).
- CSS: in the existing inspector stylesheet, no new CSS module.

**Headless.** No new action. MCP clients use `edit_element` with `style: { position: "sticky", top: "0px" }` (or `fixed`), and `batch_edit` for many layers. `get_layers` lists the ids. No description or input change.

**Main files.** `ui/features/inspector/{prototype-tab.tsx,inspector-tab-body.tsx,copy.ts}` and new `scroll-pin-section.tsx`, `use-scroll-pin.ts`, `scroll-pin-model.ts`; fixtures `ds-wt/pin-*`. Not `position-model.ts` (import its exports only), not `tailwind/**`, not `inspector-model.ts`.

**Verify in the running app.**
- HTML prototype `ds-wt/pin-seed`: a 3,000 px page with a header and a bottom tab bar. Tailwind app `ds-wt/pin-next` (copy of `ac-next-b`).
- `pin-seed` header: Sticky: 1 version with `position: sticky; top: 0`; Present with a phone device (390 x 844 screen), scroll: the header stays. Tab bar: Fixed with the bottom pin: it stays at the bottom. Scroll with parent: both go back; Cmd+Z works for each.
- `pin-next` header: Sticky writes `sticky top-0`.
- An absolute layer: "Scroll with parent" disabled with the tip.
- `edit_element` over MCP with `position: sticky` on `pin-seed`: the Prototype tab shows "Sticky".
- Dark and light screenshots of the section. `build:ui`, `check-bundle`: B1 at or under 274,673 B. No real-model run.

---

## 3. squircle: corner smoothing (Figma)

**Why.** In Figma you set "Corner smoothing" to 60 % (iOS) and a card or button gets a smooth squircle corner. Here the radius is always a plain circle arc. AI pages for phones look less native, and a designer cannot match an iOS or a Figma mock.

**Behaviour.**
- **Where.** The radius row (`corner-field.tsx`) gets a "Smoothing" control in its expand area, next to the per-corner fields: a 0 to 100 % number field and an "iOS" preset button (60 %). It shows only when the radius is more than 0.
- **Mapping (1 pair of functions, exact both ways).** `squircle` is `superellipse(2)`. Use `k = 1 + percent / 60` for the write and `percent = round((k - 1) * 60)` for the read, so 0 % is `k = 1` (a plain round corner), 60 % is `k = 2`, and 100 % is `k ≈ 2.67`. Round `k` to 2 decimals.
- **Write.** 0 % removes `corner-shape`. 60 % writes `corner-shape: squircle`. Other values write `corner-shape: superellipse(k)`. Tailwind: `[corner-shape:squircle]` and `[corner-shape:superellipse(1.33)]` from the default branch of `tailwind/map.ts` line 772.
- **Read.** The field reads `corner-shape` from the computed style: `squircle` and `superellipse(2)` show 60 %, `superellipse(k)` shows `round((k - 1) * 60)` %, `round` or no value shows 0 %. The proof writes what Chromium returns in computed style for `squircle` (the keyword or `superellipse(2)`), and the model handles both.
- **Drag.** A number-field scrub previews on the canvas and pointer up gives 1 version (the same path as the radius field). Multi-selection: 1 batch version.
- **Fallback.** Tip: "Safari and Firefox show a plain radius." No other change.

**Spec.**
- New `inspector/corner-smoothing-model.ts` (pure: `toSmoothingPercent(value)`, `toCornerShape(percent)`), `inspector/corner-smoothing-field.tsx`, `inspector/use-corner-smoothing.ts`. `corner-field.tsx` renders the field (static import). Do not change `corners-model.ts` other than an export, if needed.
- Text: 3 lines or fewer in `inspector/copy.ts`.
- No engine change: confirm in the proof that `edit_element` accepts `corner-shape` for plain HTML and Tailwind (the direct-edit validator does not check property names; `validate.ts` checks only the request shape). If the Tailwind path refuses it, add the property to the pass-through list in the narrowest file and write the line in the report; do not edit `map.ts` (966 lines).

**Headless.** No new action. MCP clients use `edit_element` with `style: { "corner-shape": "squircle" }`, and `batch_edit` for many layers. No description or input change.

**Main files.** `ui/features/inspector/{corner-field.tsx,copy.ts}` and new `corner-smoothing-model.ts`, `corner-smoothing-field.tsx`, `use-corner-smoothing.ts`; fixtures `ds-wt/sq-*`. Not `tailwind/**`, not `effect/**`, not `packages/ui/**`.

**Verify in the running app.**
- HTML prototype `ds-wt/sq-seed`: 3 cards with radius 24. Tailwind app `ds-wt/sq-next` (copy of `ac-next-b`) with a `rounded-3xl` card.
- `sq-seed` card 1: iOS: 1 version with `corner-shape: squircle`, and the field shows 60 % after the write; the corner is smoother on the canvas (zoom screenshot at 400 %). 100 %: `superellipse(2.67)`, and the field shows 100 %. 0 %: the property is gone. Cmd+Z each.
- `sq-next`: iOS writes `[corner-shape:squircle]`.
- A radius-0 layer: no Smoothing control.
- `edit_element` over MCP with `corner-shape: superellipse(1.5)`: the field shows 30 %.
- Dark and light screenshots of the radius row. `build:ui`, `check-bundle`: B1 at or under 274,673 B. No real-model run.

---

## 4. tweak-entry: Tweaks back in the inspector, a run-end chip and /tweaks (chat, Claude Design)

**Why.** Claude Design ends each design with live tweaks: sliders for accent color, radius, density and font size, so a non-designer tunes the result with no prompt. Design Studio has this (`use-tweaks.ts`, `set_tweak`), but since the editor split on 2026-11-08 no control opens it. After the first design the user can only type more prompts. This is the fastest path from the first design to a design the user likes.

**Behaviour.**
- **Tab.** The inspector tab bar shows "Tweaks" again, after "Design" (`TABS`, `inspector-model.ts` line 54). The tab shows with no selection too, because tweaks act on the whole design. In an app project (`project.app` set), the tab is not shown, as the tweak tool set is off there (`tool-sets.ts` line 69).
- **Empty tab.** With 0 controls the tab shows the existing "Suggest tweaks" button (it starts the tweaks run, `run.suggestTweaks`).
- **Run-end chip.** When a run in a prototype project ends and the design has 0 tweak controls, the suggestion chips (`ui/features/suggestion/suggestion-chips.tsx`) show 1 more chip first: "Add live tweaks". A click starts the tweaks run and opens the Tweaks tab. When controls exist, the chip is "Open tweaks" and opens the tab with no run. 1 chip at most; the 3 `run_suggestion` chips stay.
- **Slash.** `/tweaks` in the chat composer starts the tweaks run with the rest of the line as the user ask (`suggestTweaks(prompt)`, `use-studio-run.ts` line 146), and opens the Tweaks tab.
- **First design.** After the first build of a new prototype (`use-first-build.ts`), the chip shows as above. No auto run, so no cost the user did not ask for.

**Spec.**
- `inspector-model.ts`: add `{ id: "tweaks", label: copy.tabTweaks }` to `TABS` after `simple`, and a pure `toInspectorTabs(isAppProject)` that drops it for app projects. `tab-bar.tsx` uses it. Check the empty-selection path (`toInspectorEmptyReason`, `inspector-model.ts` line 68): the Tweaks tab body renders with 0 selected layers.
- The chip: `suggestion` may not import `inspector` (U7). `ui/app/studio` passes 2 plain props to the chips host: `tweakCount: number | null` (from `core.tweaks`) and `onTweaks: () => void` (opens the tab and, when the count is 0, calls `run.suggestTweaks`). Put the choice in `suggestion-model.ts` (`toTweakChip(tweakCount, isAppProject)`, pure). Text in `suggestion/copy.ts` (9 lines).
- The slash item: Home's composer imports `chat/slash-groups.ts` (`home/home-slash.tsx` line 11) and `chat/index.ts`, so do not edit either file. Add the `/tweaks` item in the studio composer path only, in `chat/use-slash-sections.ts` (Home does not import it), with its text in `chat/copy.ts`. The handler runs through a new `onTweaks` prop that `ui/app/studio` provides. No key handler in a Home chunk.
- No new lazy export, no new chunk: all new code is in files that the studio, inspector and chat chunks already load.
- Text: 0 lines in `inspector/copy.ts` (`tabTweaks` exists at line 290); chip and slash text in `suggestion/copy.ts` and `chat/copy.ts`.

**Headless.** No new action. MCP clients start the run with `start_run` and `task: "tweaks"`, read controls with `list_tweaks`, set a value with `set_tweak`, and save the controls with `update_tweaks_direct_edit`. No description or input change.

**Main files.** `ui/features/inspector/{inspector-model.ts,tab-bar.tsx}`; `ui/features/suggestion/{suggestion-chips.tsx,suggestion-model.ts,copy.ts}`; `ui/features/chat/{use-slash-sections.ts,copy.ts}` and the prompt hook that passes `onTweaks`; not `chat/slash-groups.ts`, not `chat/index.ts`; `ui/app/studio/{left-props-panels.tsx,use-studio-run.ts}` and the file that renders the suggestion chips; fixtures `ds-wt/twk-*`. Not `inspector/copy.ts`, not `use-tweaks.ts` logic, not `server/agent/**`, not `actions/**`.

**Verify in the running app.**
- On `STUDIO_AGENT=mock`: new prototype `ds-wt/twk-seed` from a Home prompt. After the first build: the "Add live tweaks" chip shows. Click: the mock tweaks run (`agent/mock.ts` line 938) adds controls, and the Tweaks tab opens with them. Drag the radius slider: the canvas follows; release: 1 version (the existing tweak write).
- With controls present, end another run: the chip is "Open tweaks".
- `/tweaks bigger type` in the composer: a tweaks run starts with that ask.
- Tab bar: Design, Tweaks, Prototype, Code. Arrow keys move across 4 tabs (`tab-keys-model.ts`). App project `ds-wt/twk-next` (copy of `ac-next-b`): no Tweaks tab, no chip.
- `start_run` over MCP with `task: "tweaks"` on the mock agent, then `list_tweaks`: the controls show in the tab.
- Dark and light screenshots of the tab and the chip. `build:ui`, `check-bundle`: B1 at or under 274,673 B. 0 real-model runs.

---

## 5. dyn-route: Move to app keeps the [id] route and its asset folder (Bonaparte)

**Why.** In Bonaparte you copy `/visits/[id]` into a prototype, redesign the visit page, and Move it back. The route copy opens at a fixture URL such as `/visits/1`. Today the Move dialog can take that fixture path as the target route, so a single-page move can write `app/visits/1/page.tsx`, and the images go to `public/id/`. Both are wrong for every dynamic page.

**Behaviour.**
- **Proof first.** Fake app `ds-wt/dyn-next` (copy of `ac-next-b` with routes `/visits` and `/visits/[id]`, and 1 image on the visit page). `create_prototype_project` with `routePath: "/visits/1"` (mock run). Open Move to app on the copy. Write in the report: the default route in the dialog, the `get_port_plan` or `inspect_port` route, and the asset folder after `apply_port` on the mock agent.
- **Default route.** For a route copy whose `routePath` matches a dynamic route of the app (`/visits/1` against `app/visits/[id]/page.tsx`), the dialog's default route is the pattern `/visits/[id]`, with the note "Updates /visits/[id]". A typed route stays as typed. A static route copy keeps its path.
- **Assets.** The asset folder is `public/<static segments joined with "-">`, with dynamic segments (`[id]`, `[...slug]`, `[[...slug]]`) left out: `/visits/[id]` gives `public/visits/`, `/orgs/[org]/visits/[id]` gives `public/orgs-visits/`. A route of only dynamic segments uses `public/page/`. Static routes do not change (`/visits` gives `public/visits/`, as now).
- **Refusal.** When the target route has a fixture value in a dynamic place (the plan finds `app/visits/[id]/` but the target is `/visits/1`), the dialog shows "This page is a copy of /visits/[id]. Move it to /visits/[id], or type a new route." and Start stays off until the route changes.

**Spec.**
- `ui/features/design-system/port-model.ts`: `toSourceRoute` (line 133) maps `source.routePath` to the matching dynamic pattern. Use the route list the dialog already has (the flow plan pages and `isPatternOf`, line 116). If the list has no pattern without a flow, read it from the `inspect_port` output the dialog already calls; add no new read on open. Keep the file under 500 lines (321 now). Put new pure helpers in a new `design-system/route-pattern-model.ts` if the file passes 400 lines.
- `server/agent/port-assets.ts`: `toAssetTarget` (line 174) uses a new pure `toAssetSlug(route)` (N5d verb name) in a sibling file `server/agent/port-asset-slug.ts`, which skips bracket segments and joins the rest.
- The server plan path (`port-plan.ts` line 1119, `portPageSlug(page)`) is not changed unless the proof shows the same `id` folder there; then use `toAssetSlug` in that 1 call.
- Text: in `design-system/copy.ts`.

**Headless.** No new action. `start_port`, `inspect_port` and `apply_port` with `routePath: "/visits/[id]"` write `app/visits/[id]/page.tsx` and put assets in `public/visits/`. No description or input change.

**Main files.** `ui/features/design-system/{port-model.ts,use-port-form.ts,copy.ts}` and new `route-pattern-model.ts` if needed; `server/agent/port-assets.ts` and new `port-asset-slug.ts`; `server/agent/port-plan.ts` (1 call, only if the proof shows it); fixtures `ds-wt/dyn-*`. Not `contracts/src/port*`, not `actions/src/port/**`, not `server/handlers/project/create-prototype.ts`.

**Verify in the running app.**
- The proof steps above, then again after the fix: the dialog shows `/visits/[id]`; the mock move writes `app/visits/[id]/page.tsx`, the image goes to `public/visits/`, and the page `src` points there. No `app/visits/1/` and no `public/id/` folder.
- Copy and move `/visits` (static): the same result as on main.
- Type `/visits/1` in the dialog: the refusal text, Start off.
- `pnpm exec tsx scripts/call-action.ts port.inspect '<json>'` on `dyn-next`: 0 diffs.
- Dark and light screenshots of the dialog. `build:ui`, `check-bundle`: B1 at or under 274,673 B. No real-model run (`STUDIO_AGENT=mock`).

---

## File ownership

| Pick | Owns |
|---|---|
| 1 polish-43 | new `direct-edit/engine/next-font-import.ts`; new `direct-edit/commit/next-font-plan.ts`; `direct-edit/commit/{apply.ts,batch.ts}`; `direct-edit/index.ts`; `design-system/font-list/font-list-run.ts`; `versions-layers-tokens/{use-token-draft.ts,use-token-commit.ts,use-color-picker-slot.ts,tokens-sections.tsx,token-color-swatch.tsx,copy.ts}` and new `alias-row.tsx`; `ui/domain/color-picker-slot.ts` (1 prop, if needed); `server/http/mcp-routes.ts`; `server/mcp/{agent-call.ts,index.ts}` and a new sibling adapter; fixtures `ds-wt/p43-*` |
| 2 scroll-pin | `inspector/{prototype-tab.tsx,inspector-tab-body.tsx}` and new `scroll-pin-section.tsx`, `use-scroll-pin.ts`, `scroll-pin-model.ts`; `inspector/copy.ts` (5 lines or fewer); fixtures `ds-wt/pin-*` |
| 3 squircle | `inspector/corner-field.tsx` and new `corner-smoothing-model.ts`, `corner-smoothing-field.tsx`, `use-corner-smoothing.ts`; `inspector/copy.ts` (3 lines or fewer); fixtures `ds-wt/sq-*` |
| 4 tweak-entry | `inspector/{inspector-model.ts,tab-bar.tsx}`; `suggestion/{suggestion-chips.tsx,suggestion-model.ts,copy.ts}`; `chat/{use-slash-sections.ts,copy.ts}` and the prompt hook that passes `onTweaks`; `ui/app/studio/{left-props-panels.tsx,use-studio-run.ts}` and the chips host file; fixtures `ds-wt/twk-*` |
| 5 dyn-route | `design-system/{port-model.ts,use-port-form.ts,copy.ts}` and new `route-pattern-model.ts`; `server/agent/port-assets.ts` and new `port-asset-slug.ts`; `server/agent/port-plan.ts` (1 call, only if the proof shows it); fixtures `ds-wt/dyn-*` |

Shared files and conflict warnings:
- **`inspector/copy.ts` (picks 2 and 3).** 487 lines, and L2a keeps it under 500. Pick 2 adds 5 lines or fewer, pick 3 adds 3 or fewer: 495 at most. Pick 4 adds 0. Pick 1 adds 0 (its text goes in `versions-layers-tokens/copy.ts`). Text lines only; rebase.
- **`inspector-tab-body.tsx` (pick 2) and `inspector-model.ts`, `tab-bar.tsx` (pick 4).** Different files. Pick 2 changes only the `PrototypeTab` line; pick 4 changes `TABS`. No overlap.
- **`ui/app/studio/left-props-panels.tsx` (pick 4).** Pick 2 passes `props` inside the inspector, so it does not edit this file. Only pick 4 edits it.
- **Color popup (pick 1).** Pick 1 edits the token side of the slot and maybe 1 prop in `ui/domain/color-picker-slot.ts`. No pick edits `inspector/color-*` or `use-color-popup.ts`.
- **`direct-edit/**` (pick 1 only).** Picks 2 and 3 write through the existing edit session and `edit_element`; they do not edit `direct-edit/**` or `tailwind/**`.
- **`server/mcp/**` and `server/http/**` (pick 1 only).** Pick 1 edits `mcp-routes.ts`, `agent-call.ts` and 1 export line in `mcp/index.ts`. No pick edits `registry.ts`, `server.ts` or `mount.ts`, and no pick changes the `runAgentTool` signature (5 other callers).
- **Port files (pick 5 only).** Nobody else edits `design-system/port-*`, `server/agent/port-*`.
- **`chat/copy.ts` and `suggestion/copy.ts` (pick 4 only).**
- **`contracts` and `actions`.** No pick edits them. Nobody edits `contracts.ts` (2,758 lines).
- **`packages/ui`.** No pick edits it.
- **Home preload files.** No pick edits a Home file (`ui/app/main.tsx`, `ui/app/screen-preload.ts`, `ui/platform/*`, `ui/features/commands/**`). No pick adds a lazy chunk, a lazy `import()`, a lazy feature export or a CSS module (Findings). Each pick runs `build:ui` and `check-bundle` and writes the B1 bytes and the Home chunk list.
- **Unions.** None. Pick 1 changes the type of the `TokenCommitSlot` context (1 provider, 1 reader). Pick 4 adds 1 member to the `TABS` list (the `InspectorTab` type already has it).
- **MCP snapshots.** No pick edits a file in `artifacts/mcp-snapshots/`. No pick changes an input, output or description of a tool. Each pick confirms its tool names with a `node -e` read, not with `mcp-snapshot.ts`.
- **`check-actions`.** No pick may add a check-actions hit. Each runs `pnpm exec tsx scripts/check-actions.ts --probes` and reports the hit count against main (it fails on main for the items left for Tyler; the count must not go up).
- **Generated lists.** No pick adds an action, so no pick changes the `@generated` lists. Run `pnpm exec tsx scripts/gen-routes.ts --check` after each merge.
- **Hand aggregators.** No pick edits `actions/index.ts`, `main/live-layer.ts`, `http/mount-all.ts`, `mcp/registry.ts` or `agent-tools/registry.ts` (W12).
- **Long files.** `inspector/copy.ts` (487), `batch.ts` (429), `port-assets.ts` (322), `port-model.ts` (321): no growth past 500 (L2a).
- **Perf baseline.** No pick edits `scripts/perf/baseline.json` (P10, L6).
- **LAN and cloud.** No test script turns on LAN sharing or publishes to a cloud host. Pick 1's share check uses 127.0.0.1, a fresh data dir with no cloud account, and revokes its links. No pick calls `publish`, `share_publication` or `PUT /api/shares/lan` with `isOn: true`.
- **Fake apps under `ds-wt`.** Each pick has its own prefix (`p43-`, `pin-`, `sq-`, `twk-`, `dyn-`). No pick writes into Bonaparte or `ac-next-b`.

## Merge order

All 5 can run at once. No pick adds an action, so no pick changes the generated lists; the order follows the shared files and the B1 margin. Run `pnpm run build:ui` and `pnpm exec tsx scripts/check-bundle.ts` after each merge (B1 at or under 274,673 B; a moved import can shift the `screen-preload` indexes):
1. **polish-43**: first. It is the largest, and it owns `direct-edit/**` and the `server/mcp` agent route, which no other pick touches.
2. **dyn-route**: no shared file with the others.
3. **tweak-entry**: owns `inspector-model.ts` and `tab-bar.tsx`, and the studio props file.
4. **scroll-pin**: shares `inspector/copy.ts` with squircle. Rebase on tweak-entry (the tab bar has 4 tabs now; check the Prototype tab position in the screenshots).
5. **squircle**: last. Rebase on scroll-pin, check the `inspector/copy.ts` line count (495 at most).

After the last merge, run `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run check:scripts` (expected to fail only at the `check-actions` items left for Tyler; write the counts), `pnpm run lint:gate`, `pnpm exec tsx scripts/gen-routes.ts --check`, `pnpm run build:ui`, `pnpm exec tsx scripts/check-bundle.ts` and `pnpm exec tsx scripts/check-boot-imports.ts`. Then `pnpm run desktop:pack`. Then one mock session on merged main: a Fraunces pick on `p43-font`, a 1-token alpha drag and an alias drag on `p43-token`, a 12-layer rename title on `p43-rename`, the 3-leg `share.create` on `p43-share` (LAN off before and after), a Sticky header in Present on `pin-seed`, an iOS corner on `sq-seed`, the tweak chip and tab on `twk-seed`, and a `/visits/[id]` move on `dyn-next`.

## Real-model run budget

None. No pick changes a prompt or the run loop. tweak-entry uses the mock tweaks run (`STUDIO_AGENT=mock`, `agent/mock.ts` line 938). dyn-route uses the mock agent for the route copy and the move. Total: 0 runs.

## Runners-up

1. `inspect_accessibility` takes `colorScheme`, so an MCP client and the Accessibility panel can check dark contrast on any frame (cycles 39 to 42; 0 hits in `actions/src/accessibility/`).
2. Variable font axes in the type section (Figma "Variable font axes"; 0 hits for `font-variation-settings` in the inspector). Needs the axes of each font file first.
3. Frame links in the cloud viewer (`apps/publish`), and frame rows for links made in an earlier session (frame-link "Left out").
4. Hide and lock keys (Figma `Mod+Shift+H`, `Mod+Shift+L`). `Mod+Shift+H` is "Go to Home" (`keymap.ts` line 61), so it needs a key decision first. Hide and Lock exist in the Layers panel.
5. Vertical trim for text (Figma "Vertical trim"; CSS `text-box: trim-both cap alphabetic`; 0 hits for `text-box`).
6. batch-rename: the class fallback as `$&` on an unnamed layer, and reselect the layers after the write (batch-rename "Open").
7. Rule Fix in `@media` and nested rules, and the Fill live write for a gradient stop (polish-42 "Left out").
8. Card parts: split a 2-part hand card into `CardHeader` and `CardContent` (kit-swap skips it with `needs-parts`; cycles 39 to 42).
9. Near-duplicate shadows: the review probe does not collect `box-shadow` literals (cycles 41 and 42).
10. Frame mentions in the chat: `@Pricing` for another frame (`RunMention` has `file`, `token` and `component` only, `contracts.ts` line 433; a page file mention covers most of it today).

Dropped from the list: bring forward and back keys, copy and paste style keys, wrap in auto layout, layout grids, image adjustments, AI image edit, noise, glass and shader effects, list styles, number styles, text transform, overflow, next-prompt chips, variations, run modes, prompt history (the code exists, see Findings).
