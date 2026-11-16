# Feature cycle 44: next 5 features

Date: 2026-11-14. Main at `2e7b3ca4f` (all 5 cycle-43 picks merged, and fix `a7aee86b4`; B1 at 271,703 B, and the baseline is now 271,703 B, so the margin is 0 B).

## Method

- Read `cycle-43.md` (picks, runners-up, Results, Open) and `cycle-43/{polish-43,scroll-pin,squircle,tweak-entry,dyn-route}.md` ("Left out", "Open", "Differences from the spec", "Spec differences", "Snapshots").
- Read the runners-up of `cycle-35.md` to `cycle-42.md`, and counted the items that came back cycle after cycle.
- Read the last UI build (`dist/ui/index.html`, `dist/ui/.vite/manifest.json` and `dist/ui/.vite/modules.json`, built 2026-11-14 20:42, after `a7aee86b4`). Walked the static import set from `index.html` (the `preloadSet` walk of `scripts/check-bundle.ts` lines 99 to 116), then the static set of the Home screen (`features/home/index.ts` and its lazy `_home` chunk). Listed the package modules in each chunk, and every value import from `@design-studio/contracts`, `@design-studio/actions` and `@design-studio/ui` in the 210 app modules of the Home screen set (`node -e` scripts, read only).
- Read the code for each candidate:
  - polish items: `packages/common/contracts/src/{contracts.ts (DIRECT_STYLE_PROPERTIES, lines 2104 to 2170),border-side-properties.ts,text-format-properties.ts,package.json}`, `bridge/element-info.ts` (`STYLE_KEYS`, line 11), `server/direct-edit/engine/tailwind/{map.ts,classes.ts,outline.ts,copy.ts,keyword-classes.ts,keyword-groups.ts}`, `ui/features/inspector/{use-scroll-pin.ts,scroll-pin-model.ts,prototype-tab.tsx,use-direct-edits-core.ts,use-direct-edits.ts,mixed-values-model.ts,use-edit-variant.ts,use-inspector-session.ts,simple-contexts.tsx,use-layout-keys.ts}`, `ui/features/design-system/port-model.ts` (lines 109 to 210), `server/agent/port-asset-slug.ts`, `lint/plugins/studio/autofix-rules.js` (`studio/no-file-growth`, line 12).
  - Speed: `ui/app/{main.tsx,app.tsx,screen-preload.ts}`, `ui/features/home/{index.ts,use-home-screen.tsx,level-popover.tsx}`, `ui/features/canvas/variations-api.ts`, `ui/features/chat/slash-groups.ts`, `ui/api.ts`.
  - Type and auto layout (Figma): `ui/features/inspector/{text-section.tsx,text-grid.tsx,number-style-row.tsx,flex-controls.tsx,align-grid.tsx,auto-layout-body.tsx,auto-layout-model.ts,sizing-model.ts,copy.ts}`, `shared/{keymap.ts,keymap-edit.ts,keymap-view.ts}` (all labels).
  - Chat: the file lists of `ui/features/{chat,home}`, `ui/features/chat/{copy.ts,use-slash-sections.ts,use-mentions.ts,mention-options-model.ts,focus-frames-button.tsx,use-first-build.ts}`, `contracts.ts` (`RunMention`, line 434), `contracts/src/canvas-file.ts` (`CanvasFileFrame`, line 24), `actions/src/run/start.ts` (`mentions: Loose`, line 55; `Loose`, line 10), `server/http/mentions.ts` (`parseMentions`, line 46), `server/agent/user-message.ts` (`mentionsBlock`, line 158), `actions/src/variation/{start.ts,schema.ts}`, `server/variations/` file list.
  - Accessibility: `actions/src/accessibility/{inspect.ts,schema.ts}`, `actions/src/workspace/get-screenshot.ts` (`ColorSchemeFieldSchema`, line 66), `server/handlers/accessibility/inspect.ts`, `server/review/accessibility/{accessibility-store.ts,accessibility-run.ts,inspect.ts}`, `server/preview/color-scheme.ts` (`toSchemedPreview`), the `ui/features/accessibility` file list.
  - Fonts: `contracts/src/google-fonts.ts` (`CATALOG`, `BOLD_WEIGHTS`), `server/design-system/font-list/` file list.
  - Tool names: action definitions in `packages/common/actions/src/` (`grep 'name: "<tool>"'`), and the tool names in `artifacts/mcp-snapshots/*.json` (read with `node -e`).
- Ran `git branch -a --list` for the 5 keys (0 hits), and `ls` on `ds-wt` for fixture prefixes.
- Did no web search, no real-model run, no app run, no build and no test. Product facts about Figma, Claude Design, v0, Lovable, open design and doop come from the cycle-35 to cycle-43 sources and runners-up.

### Open items from cycle 43, and the pick that closes each

| Open item | Pick |
|---|---|
| scroll-pin: Fixed does not add a z-index (`edit_element` cannot write `z-index`) | 1 polish-44 |
| scroll-pin: a write made in a breakpoint goes to the base styles | 1 polish-44 |
| squircle: a Tailwind app gets an inline `corner-shape` style, not a class | 1 polish-44 |
| dyn-route: the fixture-route refusal does not cover `[[...slug]]` routes | 1 polish-44 |
| Speed: other Home imports of a package barrel that pull unused code | 1 polish-44 (contracts barrel on the Home screen) |
| scroll-pin: Fixed starts with the top pin, so a tab bar needs 2 clicks | Runner-up 11 |
| polish-43: Save still commits every pending token; F2 rename not proved in the UI | Not planned (works as designed; proof only) |
| `check:scripts` S11, E1, O12 and E16 items | Tyler decides. Not planned |
| MCP snapshot refresh and snapshot-check wiring (now also `direct-edit-element.json`) | Tyler decides. Not planned. No pick edits a snapshot file |
| Cmd+Z by OS keyboard (macOS menu) | Tyler decides. Not planned |
| Should Fixed span the full width (`left: 0; right: 0`)? | Tyler decides. Not planned. polish-44 keeps the cycle-43 behavior |
| Home preload at or under 271,703 B | Gate for every pick |

### Findings

- **Home preload (a rule for all picks).**
  - The gate is B1 at or under 271,703 B, and no chunk name that is not in `baseline.json` `B1.chunks` (`checkB1`, `check-bundle.ts` line 143). Never edit `scripts/perf/baseline.json` (P10, L6).
  - The margin is 0 B. B1 is 31 files. The largest file that a pick can change is `screen-preload-*.js` (6,427 B). 4,605 B of it is the `__vite__mapDeps` table (`m.f`, 170 file names). It lists every static dep of the `studio`, `home`, `design-system` and `commands` dynamic imports. So **a new shared chunk anywhere in the studio static set adds 1 name (about 25 to 40 B) to B1**, also when no Home code imports it. Cycle 43 saw this with `color-picker-slot` (38 B).
  - Rule for every pick: no new lazy chunk, no new lazy `import()`, no new lazy export in a feature `index.ts`, no new CSS module. Put new code in files that an existing chunk already loads (plain static imports). Put new CSS in an existing CSS file (`styles/inspector.css`, `styles/chat.css`).
  - A new file in `packages/common/contracts/src` can become its own shared chunk when 2 or more UI chunks import it. A new contracts file that only `contracts.ts` imports (as `border-side-properties.ts` is now) stays in the shared `contracts-*.js` chunk. Each pick that adds a contracts file checks the chunk list after the build.
  - Stop rule: if `check-bundle` shows B1 over 271,703 B after the pick, find the new chunk name in the `screen-preload` table or the moved import and remove it. If B1 still goes over, stop and report the bytes and the chunk list. Do not edit `baseline.json`.
  - No key handler goes in a Home chunk (`ui/features/commands/**`, `ui/platform/*`, `ui/app/main.tsx`, `ui/app/app.tsx`, `ui/app/screen-preload.ts`). No pick edits `packages/ui/src/index.ts`.
- **Speed: package barrels on Home (real gap, polish-44).**
  - The B1 set holds no package barrel that pulls unused code now. The package modules in B1 are `contracts/src/studio-token.ts` (45 B, in `http-*.js`, the cycle-43 fix), `ui/src/{ui-select-model.ts,pick.ts}`, and `ui/src/{menu-keys-model.ts,use-menu-keyboard.ts}` in `main-*.js` (`app.tsx` line 1 imports `useMenuKeyboard`; it is in use). The `@design-studio/ui` barrel is tree-shaken: each Home chunk gets only the modules it uses (`icon.tsx`, `brand-mark.tsx`, `theme-button.tsx`, `use-modal-dialog.ts`, `focus-model.ts`).
  - The Home screen is a different case. It is not in B1, but it loads on the first paint of Home (`screen-preload.ts` `home`, then `_home-*.js`). Its static set is 23 chunks and 164,672 B. One of them is the shared `contracts-DOfPrD4v.js` (3,009 B). It holds `contracts.ts` (3,985 B before minify) and the 3 style property lists. 74 chunks import it, so it holds the union of what all 74 use: bridge params, `DIRECT_STYLE_PROPERTIES`, `API_ROUTES` keys and more.
  - The Home screen needs 3 values from it, through 2 imports: `DEFAULT_SETTINGS` (`home/use-home-screen.tsx` line 1) and `VARIATION_MAX`, `VARIATION_MAX_REACT` (`canvas/variations-api.ts` line 1, in the Home chunk `reference-url-*.js`). Lazy Home chunks pull the same chunk for `RUN_LEVELS` (`home/level-popover.tsx` line 1) and for `RUN_EFFORTS`, `RUN_LEVELS` (`chat/slash-groups.ts` line 1, through `home/home-slash.tsx`).
  - `DEFAULT_SETTINGS` has 1 UI caller (`use-home-screen.tsx`), so its own file goes into the Home chunk with no new shared chunk. `VARIATION_MAX` has 3 UI callers and `RUN_LEVELS` has 5. Their own files can become shared chunks in the studio set, which adds names to the B1 table. See the stop rule in pick 1.
  - Not package barrels, but the same shape (runners-up 1 and 2): the `screen-preload` table (4,605 B in B1), and `src/ui/api.ts`. `api.ts` spreads 9 api modules into 1 `api` object (lines 11 to 21), so it cannot be tree-shaken. The 16 Home files that import `api` get `api-*.js` (13,395 B), which holds `api-edit.ts`, `api-style.ts`, `text-style-api.ts` and `version-edit-api.ts`, which Home does not use.
- **The file-growth limit (a rule for all picks).** `studio/no-file-growth` (`autofix-rules.js` line 12) refuses any growth of a file that has more than 500 lines. These files need a line-neutral edit, or a move out first:
  - `contracts/src/contracts.ts` (2,760 lines): `DIRECT_STYLE_PROPERTIES` (picks 1 and 3), `RunMention` (pick 4), the speed moves (pick 1).
  - `server/direct-edit/engine/tailwind/map.ts` (966) and `tailwind/classes.ts` (819): every new Tailwind group (picks 1, 2 and 3).
  - `ui/features/inspector/copy.ts` (494): 6 lines are left in total (picks 2 and 3; see File ownership). Option labels go in the pick's `*-model.ts` file, as `sizing-model.ts` line 25 does (`{ label: "Hug", value: "hug" }`). Only `title`, `aria-label`, `data-tip` and `placeholder` text must go in `copy.ts` (U19).
  - `server/agent/user-message.ts` (475): 25 lines are left (pick 4).
- **The Tailwind seam (pick 1, then picks 2 and 3).**
  - An unmapped property gets an inline style in a Tailwind file (`tailwind/index.ts` line 41: `isMappedProperty(prop) ? cssEdits(...) : null`). `corner-shape` and `z-index` are not in `SINGLE_PROPS` (`map.ts` line 72), so both write inline styles. `copy.ts` line 45 maps `z-index` to `z` only for "Copy as Tailwind".
  - The repo already chains extra groups without new lines in the 2 long files: `...OUTLINE_PROPS` (`map.ts` line 110), `toOutlineToken(...) ?? toTurnToken(...)` (`map.ts` line 725), `toOutlineClass(utility) ?? toRotateScaleClass(utility)` (`classes.ts` line 618), and `| OutlineGroup` in the `Classified` group union (`classes.ts` line 80).
  - So pick 1 adds 1 new sibling `tailwind/added-groups.ts` that wraps the outline exports and the new groups, and swaps the names on those same lines. Picks 2 and 3 then add entries only in `added-groups.ts`. `align-items: baseline` already maps to `items-baseline` (`keyword-classes.ts` line 3).
- **Breakpoint writes in the Prototype tab (cause not proved).** The cycle-43 report says `MultiOptions` has no variant. But the multi flush reads `editVariantStore.get()` (`use-direct-edits-core.ts` line 171) and passes it to `toOwnEdits` (`mixed-values-model.ts` line 330). 2 causes are possible:
  - `toBatchEdits` (`mixed-values-model.ts` line 345) hard-codes `editVariant: ""`. Any path that uses it writes to the base.
  - `VariantScopeContext` is provided only inside `SimpleContexts` (`simple-contexts.tsx` line 50). The Prototype tab is not inside it, so it gets the empty default scope (`use-edit-variant.ts`, `createContext` with `prefix: ""`).
  - Also `restoreEditVariant` runs when the selection goes to 0 (`use-inspector-session.ts` line 43). Pick 1 proves the cause before it changes code.
- **`[[...slug]]` in the refusal (2 causes).** `DYNAMIC_PART` (`port-model.ts` line 109, `/^\[[^\]/]+\]$/u`) refuses the inner `]` of `[[...slug]]`. And `isPatternOf` needs equal part counts (line 122), so `[...slug]` also fails for a fixture path with 2 or more parts (`/docs/a/b`). `toAssetSlug` (`server/agent/port-asset-slug.ts`, `/^\[.+\]$/u`) already handles both, so the server side needs no change.
- **Figma type details (real gap 1).** Figma "Type details" has Vertical trim, decoration (underline style, thickness, offset) and paragraph indent. Here: 0 hits for `text-box`, `text-decoration-style`, `text-decoration-thickness`, `text-underline-offset` and `text-indent` in `ui/`, `server/`, `shared/` and `bridge/`. The text section has number style and text wrap rows (`text-grid.tsx` lines 73 and 74), and the `Mod+U` underline key (`keymap-edit.ts`, `text-underline`). `TEXT_FORMAT_PROPERTIES` (`text-format-properties.ts`, 7 lines) holds the text keys outside `contracts.ts`. `text-box` renders in Chromium 133 and later, so the canvas shows it (Electron 44). Safari 18.2 shows it; Firefox draws the plain box, which is a safe fallback.
- **Figma advanced auto layout (real gap 2).** Figma "Advanced layout settings" has "Align: text baseline", "Strokes: included in layout" and the row alignment of a wrapped layout. Here: 0 hits for `box-sizing` and `align-content` in `ui/features/inspector`, and `align-grid.tsx` (55 lines) reads `align-items` (line 26) with no baseline cell. The flex controls are `flex-controls.tsx` (31 lines: `AlignGrid`, `FlexToolbar`, `GapModeField`, `GapFields`). Wrap exists (`auto-layout-model.ts` line 129).
- **Frame mentions (real gap 3, chat).** `RunMention` has `file`, `token` and `component` only (`contracts.ts` line 434). `parseMentions` (`server/http/mentions.ts` line 46) keeps those 3 kinds and drops every other kind with no note, so a `{ kind: "frame" }` from `start_run` goes nowhere. `mentions` is `Schema.Json` in `run/start.ts` (lines 10 and 55), so `start_run` takes a frame mention with no input change. The chat "Focus on N frames" button (`focus-frames-button.tsx`) adds the page file of each selected frame. It needs a canvas selection, and it does not tell the agent which frame: 2 frames of 1 page (2 states or 2 widths) give the same file. In a flow made by route copy, the user wants to write "make @Checkout match @Pricing".
- **Dark mode in the accessibility check (real gap 4, Review).** `inspect_accessibility` has no `colorScheme` (0 hits in `actions/src/accessibility/`). It came back in the runners-up of cycles 39, 40, 41, 42 and 43. The code to render dark exists: `toSchemedPreview(preview, colorScheme)` (`server/preview/color-scheme.ts`) toggles `.dark` and `data-theme`, and `get_screenshot` uses it. `inspectAccessibilityPage` (`review/accessibility/inspect.ts` line 55) takes a `preview` with `withPage`, so the change is small. Bonaparte has `dark:` in 220 files (cycle-37 count). `inspect_accessibility` is not in `artifacts/mcp-snapshots/*.json`.
- **Ideas dropped because the code exists.** Flip keys (`keymap.ts` line 227), Paste to replace (`structure-edits-model.ts` line 142), Hug and Fill sizing (`sizing-model.ts`), the eyedropper (`inspector/eyedropper-*.tsx`), ruler guides (`canvas/use-ruler-guides.ts`), Mod+B and Mod+U text keys, link interactions with actions, transitions and easing (`contracts/src/links.ts` lines 74 to 76), element variations (`server/variations/element-variants.ts`), the chat to-do panel (`chat/todo-panel.tsx`), Restore and Retry in chat (`chat/copy.ts` lines 161 and 165), plan mode, queued and steered messages, clarify questions on Home (`home/home-clarify.tsx`), Home starters and templates (`home/copy.ts` lines 287 to 304), variation count on Home, draw-on-screenshot feedback (`ui/features/markup`), the Claude Code handoff (`dev-status/copy-handoff.tsx`), focus on frames, prompt improve (`chat/draft-improve-model.ts`). All the dropped ideas of cycle 43 are still there.
- **Repeat items.**
  - Variable font axes (cycle 43): still real (0 hits for `font-variation-settings`). The catalog has no axis data (`google-fonts.ts`, `[family, kind, hasBold]`), and links load only `wght@400;700` (`BOLD_WEIGHTS`). It needs axis data and range links first. Runner-up 3.
  - Hide and lock keys: `Mod+Shift+H` is "Go to Home". It needs a key decision first. Runner-up 4.
  - Card parts (cycles 39 to 43), near-duplicate shadows (41 to 43), frame links in the cloud viewer (42, 43): runners-up.
- **Tool names.** No pick adds an action. Every pick reuses tools by name (each found as `name: "<tool>"` in `packages/common/actions/src/`): `edit_element`, `batch_edit`, `set_stacking`, `get_layers`, `inspect_port`, `apply_port`, `start_port`, `start_run`, `canvas_list`, `get_screenshot`, `inspect_accessibility`. No new tool name, so `studio/derived-tool-name` has nothing new to check.
- **Expected snapshot diffs (Tyler decides; no pick edits a snapshot).** Picks 1, 2 and 3 add keys to `DIRECT_STYLE_PROPERTIES`, so `direct-edit-element.json` (`edit_element`, `batch_edit` `style` objects) and the agent breakpoint property enum change, as with squircle. Pick 5 changes the input of `inspect_accessibility`, which is in no snapshot file. `get_screenshot` must stay the same (pick 5 does not move its schema). Pick 4 changes no tool input.
- **Generated output.** `gen-routes` writes the `exports` map of `packages/common/contracts/package.json`. Picks 1 and 4 add contracts files, so both change generated output. No pick adds an action, so no pick changes the `@generated` action lists.
- **Branch check.** No `feat/polish-44`, `feat/type-detail`, `feat/layout-more`, `feat/frame-at` or `feat/dark-a11y`.
- **Fixture prefixes.** `p44-`, `tdt-`, `lmo-`, `fat-` and `dax-` are not in `ds-wt`. `dk-` is in use, so pick 5 does not use it. `ac-next-b` is in `ds-wt`; picks copy it and never write into it.
- **`.claude/goal/roadmap.md`.** It is ignored (`.gitignore`, `.claude/`), so a worktree does not get it. Each pick writes "not in worktree" in its report and lists its new files there, so the merge step can add them to Appendix A (L6e).

## Ranking

Score = value x fit with "simple and fast" / effort (1 to 5 each).

| Rank | Key | Feature | Value | Fit | Effort | Score |
|---|---|---|---|---|---|---|
| 1 | polish-44 | z-index on Fixed, breakpoint writes, Tailwind seam, `[[...slug]]`, contracts barrel off Home | 4 | 5 | 4 | 5.0 |
| 2 | type-detail | Type details: vertical trim, underline style, paragraph indent (Figma) | 4 | 5 | 2 | 10.0 |
| 3 | layout-more | Advanced auto layout: text baseline, strokes in layout, row alignment (Figma) | 3 | 5 | 2 | 7.5 |
| 4 | frame-at | Frame mentions in the chat and in `start_run` (chat) | 4 | 5 | 2 | 10.0 |
| 5 | dark-a11y | Dark mode in the accessibility check (Review) | 4 | 5 | 1 | 20.0 |

The file lists the picks in a fixed order (polish, Figma, Figma, chat, Review), not by score. Picks 2 and 3 are Figma manual-editing gaps. Pick 4 improves the chat. Pick 5 is the 1 Review check: it adds a mode to the existing accessibility check. 0 picks add an action. Picks 1 and 4 add a contracts file, so they change the generated `exports` map. No pick adds a lazy chunk, an always-visible control on Home or a Home import.

---

## 1. polish-44: z-index on Fixed, breakpoint writes, Tailwind seam, [[...slug]], contracts barrel off Home (polish)

**Items.** Prove each one first; change code only for what the proof shows.

- **z-index on Fixed and Sticky.**
  - Proof first: `ds-wt/p44-pin` (copy of `ds-wt/pin-seed`, HTML) and `ds-wt/p44-next` (copy of `ac-next-b`). `edit_element` with `style: { "z-index": "10" }`. Expected on main: `style: Unrecognized key: "z-index"`.
  - Property list: new `packages/common/contracts/src/layout-style-properties.ts` with `LAYOUT_STYLE_PROPERTIES = ["position", "top", "right", "bottom", "left", "z-index"]`. In `contracts.ts`, swap the 5 lines `"position"` to `"left"` (lines 2139 to 2143) for 1 line `...LAYOUT_STYLE_PROPERTIES,`, and add 1 import line next to line 2. Net: 3 lines fewer. The order of `DIRECT_STYLE_PROPERTIES` stays the same, with `"z-index"` after `"left"`. Only `contracts.ts` imports the new file, so it stays in the `contracts-*.js` chunk.
  - Bridge: add `"z-index"` after `"left"` in `STYLE_KEYS` (`bridge/element-info.ts`, line 11 list, 369 lines), so the inspector reads the computed value.
  - Tailwind: the `z-index` group in the seam below. Write `z-<n>` for an integer in Tailwind 4, the step classes `z-0` to `z-50` and `z-auto` in Tailwind 3, else `z-[<n>]`. The class reader reads `z-*` back, so a second write replaces the class. A `z-10` that `set_stacking` wrote reads as the same group.
  - `scroll-pin-model.ts`: `toScrollPinPatch` (line 132) and `toFixedPatch` (line 123) add `"z-index": "10"` for Fixed and Sticky when the computed `z-index` is `auto`. "Scroll with parent" (`IN_FLOW`, line 137) removes `z-index` only when it is `10`. A layer with its own z-index keeps it.
  - Pass: `p44-pin` tab bar: Fixed gives 1 version with `position: fixed; bottom: 0; z-index: 10`; Scroll with parent removes all 3; Cmd+Z each. A layer with `z-index: 3`: Fixed keeps 3. `p44-next`: Fixed writes `fixed bottom-0 z-10`, and no inline `zIndex`. `edit_element` with `"z-index": "20"` over MCP: 1 version.
- **Prototype-tab writes in a breakpoint.**
  - Proof first: `p44-next`, Design tab, pick the `md` breakpoint in the variant bar, then the Prototype tab, then Sticky on the header. Expected on main: the write goes to the base classes (`sticky top-0`, not `md:sticky md:top-0`). Then find the cause and write it in the report: the `editVariantStore.get()` value at the flush (`use-direct-edits-core.ts` line 171), the scope that the Prototype tab gets from `useVariantScope()` (`simple-contexts.tsx` line 50), whether the write goes through `toBatchEdits` (`mixed-values-model.ts` line 345, `editVariant: ""`), and whether `restoreEditVariant` ran (`use-inspector-session.ts` line 43).
  - Fix: the narrowest change that makes the Prototype tab write to the same variant as the Design tab, in the file the proof names. Examples: provide the same `VariantScopeContext` value around `PrototypeTab` (in `inspector-tab-body.tsx`), or pass the store value where `toBatchEdits` hard-codes `""`. Do not add a single-layer `useDirectEdit` branch unless the proof shows it is the cause. If the fix touches `toBatchEdits`, check its other callers (`inspector/index.ts` line 128 export) and keep their behavior for a base write.
  - Read: with a breakpoint on, the Scroll behavior control shows the value at that breakpoint. Use the existing variant text (no new copy line).
  - Pass: `p44-next` at `md`: Sticky writes `md:sticky md:top-0 md:z-10`; at the base it writes `sticky top-0 z-10`. The Design tab writes as on main.
- **squircle: a Tailwind class, not an inline style.**
  - Proof first: `p44-next` card with `rounded-3xl`, smoothing 60 %. Expected on main: `style={{ cornerShape: 'squircle' }}` and the reply `"wrote": "classes"`.
  - The seam: new `server/direct-edit/engine/tailwind/added-groups.ts`. It exports `ADDED_PROPS` (`OUTLINE_PROPS` plus the new props), `toAddedToken(prop, value, theme)` (`toOutlineToken ?? toTurnToken ?? <new groups>`), `toAddedClass(utility)` (`toOutlineClass ?? toRotateScaleClass ?? <new readers>`) and `type AddedGroup` (`OutlineGroup` plus the new group names). In `map.ts`, swap the names on lines 21 (import), 110 (`...ADDED_PROPS`) and 725 (`toAddedToken(...)`). In `classes.ts`, swap the names on lines 10 and 11 (imports), 80 (`| AddedGroup`) and 618 (`toAddedClass(utility)`). Drop an import line that is no longer used (for example the `toTurnToken` alias, `map.ts` line 26) if the swap needs room. **`wc -l` of `map.ts` and `classes.ts` must be equal to or less than at HEAD** (`studio/no-file-growth`). If that is not possible, stop and report.
  - Groups in this pick: `z-index` (above) and `corner-shape`, which writes `[corner-shape:squircle]` and `[corner-shape:superellipse(1.33)]` and reads them back, so 0 % removes the class.
  - An old inline `cornerShape` from cycle 43 on the same element: proof first. If the engine already removes an inline key when it writes the class of a mapped prop, it is gone after the write. If not, leave it and write it in "Left out".
  - Pass: `p44-next`: iOS writes `[corner-shape:squircle]`, the field shows 60 %, 0 % removes the class, the reply says `"wrote": "classes"`, and there is no inline `cornerShape`. The HTML path (`ds-wt/sq-seed` copy) writes as on main. Existing outline and rotate classes write and read as on main (1 outline-width write and 1 rotate write on `p44-next`).
- **dyn-route: `[...slug]` and `[[...slug]]` in the refusal.**
  - Proof first: `ds-wt/p44-dyn` (copy of `ac-next-b` with `app/docs/[...slug]/page.tsx` and `app/help/[[...slug]]/page.tsx`). A route copy at `/docs/a/b` and at `/help/x`. Expected on main: no refusal for either.
  - Fix in `port-model.ts` (355 lines): accept `[[...x]]` as a dynamic part, and in `isPatternOf` (line 116) let `[...x]` match 1 or more parts and `[[...x]]` match 0 or more parts. Each is a match only as the last segment. A single `[x]` still matches exactly 1 part. Put the part test in a new pure `design-system/route-pattern-model.ts` if `port-model.ts` passes 400 lines.
  - Pass: `/docs/a/b` against `/docs/[...slug]`: the refusal "This page is a copy of /docs/[...slug]…", Start off. `/help` and `/help/x` against `/help/[[...slug]]`: the refusal. `/docs` against `/docs/[...slug]`: no match (catch-all needs 1 part). `/visits/1` against `/visits/[id]`: as on main. `toAssetSlug` is not changed.
- **Speed: the contracts barrel off the Home screen.**
  - Proof first: the manifest walk of the Findings (static set of `_home-*.js` from the last build). Expected on main: `contracts-*.js` (3,009 B) in the Home screen set, and exactly 2 chunks of that set list `_contracts-DOfPrD4v.js` in their `imports`: `home-*.js` (for `use-home-screen.tsx`) and `reference-url-*.js` (for `variations-api.ts`). This was checked on the 20:42 build.
  - Move `DEFAULT_SETTINGS` to new `contracts/src/settings-defaults.ts` (with `import type { ProjectSettings } from "@design-studio/contracts"`). Move `VARIATION_MIN`, `VARIATION_RUN_MIN`, `VARIATION_MAX`, `VARIATION_MAX_REACT`, `VARIATION_DEFAULT` and `VARIATION_BRIEF_MAX` (`contracts.ts` lines 88 to 93) to new `contracts/src/variation-limits.ts`. `contracts.ts` imports both and adds the names to its final export block, as it does for `STUDIO_TOKEN_HEADER` (lines 14 and 2760). It shrinks, so L2a passes.
  - Point the 2 Home callers at the subpaths: `home/use-home-screen.tsx` line 1 (`@design-studio/contracts/settings-defaults`) and `canvas/variations-api.ts` line 1 (`@design-studio/contracts/variation-limits`). Server and other callers keep the barrel. Run `pnpm exec tsx scripts/gen-routes.ts` for the `exports` map (W11, N7c).
  - Stop rule for this item: after `build:ui`, run the walk again and `check-bundle`. Pass when `contracts-*.js` is gone from the `_home` static set and B1 is at or under 271,703 B. If `variation-limits.ts` becomes a new shared chunk and B1 goes up, keep only the `DEFAULT_SETTINGS` move, write the bytes and the chunk name in the report, and leave `VARIATION_*` for a later cycle. Do not move `RUN_LEVELS` or `RUN_EFFORTS` in this cycle (5 UI callers; lazy popovers only). Write them in "Left out".
  - Pass: the Home screen set loses about 3,009 B (write the exact number before and after); the Home first paint works; the Home settings draft shows the same defaults; the variation count on Home still stops at 4 (3 for React).

**Headless.** No new action and no new tool name. `edit_element` and `batch_edit` take `z-index` and write Tailwind classes for `z-index` and `corner-shape`. `set_stacking` is not changed. `start_port`, `inspect_port` and `apply_port` are not changed (the refusal is in the dialog; `toAssetSlug` already handles catch-all routes). Expected snapshot diff: `direct-edit-element.json` and the agent breakpoint enum get `z-index` (Tyler decides; do not edit the snapshot).

**Main files.** New `contracts/src/{layout-style-properties.ts,settings-defaults.ts,variation-limits.ts}`; `contracts/src/contracts.ts` (line-neutral or shorter); `packages/common/contracts/package.json` (`exports`, by `gen-routes` only); `bridge/element-info.ts` (1 line); new `tailwind/added-groups.ts`; `tailwind/{map.ts,classes.ts}` (name swaps only, no growth); `inspector/scroll-pin-model.ts`, `inspector/use-scroll-pin.ts` and the 1 file the breakpoint proof names; `design-system/port-model.ts` and new `route-pattern-model.ts` if needed; `home/use-home-screen.tsx` (1 line); `canvas/variations-api.ts` (1 line); fixtures `ds-wt/p44-*`. Not `inspector/copy.ts`, not `actions/**`, not `server/agent/port-*`, not `packages/ui/**`, not `baseline.json`, not `artifacts/mcp-snapshots/**`.

**Verify in the running app.** The steps above, on `STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev`. Dark and light screenshots of the Scroll behavior section at `md` and of the smoothing field on `p44-next`. `pnpm exec tsx scripts/gen-routes.ts --check`. `pnpm run build:ui`, `check-bundle`: B1 at or under 271,703 B, no new chunk name; write the Home chunk list and the `_home` set before and after. No real-model run.

---

## 2. type-detail: Type details: vertical trim, underline style, paragraph indent (Figma)

**Why.** In Figma you open "Type details" and set Vertical trim to "Cap height to baseline", so a button label sits in the exact center of its box. You also give a link a dotted underline 2 px below the text, or indent the first line of a paragraph. Here each of these needs a prompt or a code edit. Vertical trim is what makes AI buttons, badges and chips look centered; designers check it first.

**Behaviour.**
- **Where.** The Text section, after the text wrap row (`text-grid.tsx` line 74): 1 "Type details" row with a disclosure. Closed by default. It opens to 3 groups:
  - **Vertical trim:** a segmented control, "Standard" and "Cap to baseline". Cap to baseline writes `text-box: trim-both cap alphabetic`. Standard removes `text-box`.
  - **Underline:** shows only when `text-decoration-line` has `underline`. "Style": Solid, Dotted, Dashed, Wavy, Double (`text-decoration-style`). "Thickness": a px number field with "Auto" when empty (`text-decoration-thickness`). "Offset": a px number field with "Auto" when empty (`text-underline-offset`).
  - **Paragraph indent:** a px number field (`text-indent`); 0 removes it.
- **Read.** Each control reads the computed style through `STYLE_KEYS`. The proof writes what Chromium returns for `text-box` (`trim-both cap alphabetic` or `normal`), and the model handles both.
- **Write.** 1 change = 1 version, 1 Cmd+Z. A number-field scrub previews on the canvas, and pointer up gives 1 version (the path of the other text number fields). Multi-selection: 1 batch version. A breakpoint write goes to the breakpoint (the Design tab path).
- **Tailwind.** `decoration-solid|dotted|dashed|wavy|double`; `decoration-0|1|2|4|8` and `decoration-auto` for thickness, else `decoration-[3px]`; `underline-offset-0|1|2|4|8` and `underline-offset-auto`, else `underline-offset-[3px]`; `indent-<spacing step>`, else `indent-[12px]`; vertical trim `[text-box:trim-both_cap_alphabetic]`.
- **Fallback.** Tip on Vertical trim: "Firefox shows the standard box." No other change.

**Spec.**
- Contracts: add `"text-box"`, `"text-decoration-style"`, `"text-decoration-thickness"`, `"text-underline-offset"` and `"text-indent"` to `TEXT_FORMAT_PROPERTIES` (`text-format-properties.ts`). No `contracts.ts` change. It stays in the `contracts-*.js` chunk.
- Bridge: add the 5 keys to `STYLE_KEYS` (`bridge/element-info.ts`).
- Tailwind: 4 groups in `tailwind/added-groups.ts` (pick 1's seam). `decoration-*` shares its prefix with the decoration color (`decoration-red-500`) and with the `decoration` group for `text-decoration-line` (`map.ts` line 94). The reader must keep each apart: proof that `decoration-red-500` still reads as a color, `decoration-2` as a thickness and `decoration-wavy` as a style. No edit to `map.ts` or `classes.ts` other than through the seam; their line counts stay the same.
- UI: new `inspector/type-detail-row.tsx` (component), `inspector/use-type-detail.ts` (hook, U6a), `inspector/type-detail-model.ts` (pure: `toTrimChoice(computed)`, `toTrimPatch(choice)`, `isUnderlined(computed)`, option labels). `text-grid.tsx` renders the row (static import, 2 lines or fewer). Writes go through the existing edit session, the same path as `number-style-row.tsx`.
- `tsc` names every `Record<DirectStyleProperty, …>` that needs the new keys; add them where it shows.
- Text: 3 lines or fewer in `inspector/copy.ts` (the row `aria-label`, the trim tip, the "Auto" placeholder). Option labels go in `type-detail-model.ts`.
- CSS: in `styles/inspector.css`, no new CSS module.

**Headless.** No new action. MCP clients use `edit_element` with `style: { "text-box": "trim-both cap alphabetic" }`, `{ "text-decoration-style": "wavy", "text-underline-offset": "4px" }` or `{ "text-indent": "24px" }`, and `batch_edit` for many layers. `get_layers` lists the ids. Expected snapshot diff: `direct-edit-element.json` and the agent breakpoint enum get the 5 keys (Tyler decides).

**Main files.** `contracts/src/text-format-properties.ts`; `bridge/element-info.ts`; `tailwind/added-groups.ts` (entries only); `inspector/{text-grid.tsx,copy.ts}` and new `type-detail-row.tsx`, `use-type-detail.ts`, `type-detail-model.ts`; `styles/inspector.css`; fixtures `ds-wt/tdt-*`. Not `contracts.ts`, not `tailwind/{map.ts,classes.ts}`, not `packages/ui/**`.

**Verify in the running app.**
- HTML prototype `ds-wt/tdt-seed`: a button with a label, a link with an underline, 2 paragraphs. Tailwind app `ds-wt/tdt-next` (copy of `ac-next-b`).
- `tdt-seed` button label: Cap to baseline: 1 version with `text-box: trim-both cap alphabetic`; the label moves to the box center (zoom screenshot at 400 %, before and after). Standard removes it. Cmd+Z each.
- Link: Style Wavy, Thickness 2, Offset 4: 3 versions; the canvas shows each. A text with no underline: no Underline group.
- Paragraph: indent 24: 1 version.
- `tdt-next`: the same steps write `[text-box:trim-both_cap_alphabetic]`, `decoration-wavy`, `decoration-2`, `underline-offset-4` and `indent-6`. A link with `decoration-red-500` keeps its color after a thickness write.
- `edit_element` over MCP with `"text-decoration-style": "dotted"`: the row shows Dotted.
- Dark and light screenshots of the row (open and closed). `build:ui`, `check-bundle`: B1 at or under 271,703 B. No real-model run.

---

## 3. layout-more: Advanced auto layout: text baseline, strokes in layout, row alignment (Figma)

**Why.** In Figma's auto layout you set "Align: text baseline", so an icon label and a big number sit on 1 line. You set "Strokes: included in layout", so a 2 px border does not push the content. When a row wraps, you align the rows. Here none of these has a control, and the AlignGrid cannot show baseline. A price row, a stat card and a tag list in a real app need them.

**Behaviour.**
- **Where.** The auto layout flex controls (`flex-controls.tsx`, after `GapFields`): 1 "More layout settings" row with a disclosure, closed by default (Figma's advanced layout button). It opens to:
  - **Align to text baseline** (checkbox, rows only, `flex-direction: row`): on writes `align-items: baseline`. Off writes `align-items` from the AlignGrid cell that was active before, or removes it when there was none. When baseline is on, the AlignGrid shows its cells with none active, and the tip "Aligned to text baseline".
  - **Strokes:** a segmented control, "Included" and "Excluded" (`box-sizing: border-box` and `content-box`). The control shows the computed value. Many apps set `border-box` for all elements (the Tailwind preflight), so the default shows "Included".
  - **Align rows** (only when the layout wraps, `auto-layout-model.ts` line 129): Start, Center, End, Space between (`align-content: flex-start | center | flex-end | space-between`). Remove for Normal.
- **Write.** 1 change = 1 version, 1 Cmd+Z. Multi-selection: 1 batch version. A breakpoint write goes to the breakpoint.
- **Tailwind.** `items-baseline` (exists, `keyword-classes.ts` line 3); `box-border` and `box-content`; `content-start`, `content-center`, `content-end`, `content-between`.

**Spec.**
- Contracts: add `"box-sizing"` and `"align-content"` to `LAYOUT_STYLE_PROPERTIES` (`contracts/src/layout-style-properties.ts`, made by pick 1). No `contracts.ts` change.
- Bridge: add the 2 keys to `STYLE_KEYS` (`bridge/element-info.ts`).
- Tailwind: 2 groups in `tailwind/added-groups.ts` (pick 1's seam). `content-*` must not read `content-['x']` (the `content` property) as a row alignment: proof on 1 element with `content-none`.
- UI: new `inspector/layout-more-row.tsx`, `inspector/use-layout-more.ts`, `inspector/layout-more-model.ts` (pure: `isBaseline(computed)`, `toBaselinePatch(isOn, previous)`, `toStrokesChoice(computed)`, `toRowAlign(computed)`, option labels). `flex-controls.tsx` renders the row (static import, 2 lines or fewer). `align-grid.tsx` gets the "none active" state for baseline only if the proof shows that it highlights a wrong cell; else no change.
- Text: 2 lines or fewer in `inspector/copy.ts` (the row `aria-label` and the baseline tip). Option labels go in `layout-more-model.ts`.
- CSS: in `styles/inspector.css`.
- Left out (state it in the report): Figma "Canvas stacking: first on top" (it needs a z-index for each child; runner-up 9).

**Headless.** No new action. MCP clients use `edit_element` with `style: { "align-items": "baseline" }` (works on main), `{ "box-sizing": "content-box" }` or `{ "align-content": "space-between" }`, and `batch_edit` for many layers. Expected snapshot diff: `direct-edit-element.json` and the agent breakpoint enum get the 2 keys (Tyler decides).

**Main files.** `contracts/src/layout-style-properties.ts` (2 entries); `bridge/element-info.ts`; `tailwind/added-groups.ts` (entries only); `inspector/{flex-controls.tsx,copy.ts}` and new `layout-more-row.tsx`, `use-layout-more.ts`, `layout-more-model.ts`; `inspector/align-grid.tsx` only if the proof needs it; `styles/inspector.css`; fixtures `ds-wt/lmo-*`. Not `contracts.ts`, not `tailwind/{map.ts,classes.ts}`, not `auto-layout-model.ts`.

**Verify in the running app.**
- HTML prototype `ds-wt/lmo-seed`: a price row (`$` small, `49` large, `/mo` small) in a row flex, a card with a 4 px border in a fixed-width flex, and a tag list that wraps in a tall box. Tailwind app `ds-wt/lmo-next` (copy of `ac-next-b`).
- Price row: Align to text baseline: 1 version with `align-items: baseline`; the 3 texts sit on 1 baseline (screenshot). Off: back to the old cell. Cmd+Z.
- Card: Excluded: `box-sizing: content-box`, and the card grows by the border. Included: back.
- Tag list: Space between: `align-content: space-between`. A layout that does not wrap: no Align rows control.
- `lmo-next`: the same steps write `items-baseline`, `box-content` and `content-between`.
- `edit_element` over MCP with `"box-sizing": "content-box"`: the row shows Excluded.
- Dark and light screenshots of the row. `build:ui`, `check-bundle`: B1 at or under 271,703 B. No real-model run.

---

## 4. frame-at: Frame mentions in the chat and in start_run (chat)

**Why.** A flow made by route copy, or a canvas with variations, has many frames. The user wants to write "make @Checkout match @Pricing" or "use the header of @Home on @Settings", with no canvas selection first. Claude Design and v0 let you point at another screen in chat. Here `@` offers only files, tokens and components, and an MCP client that sends a frame in `start_run` gets it dropped with no note (`parseMentions`, `server/http/mentions.ts` line 46).

**Behaviour.**
- **Picker.** In the studio composer, `@` shows a "Frames" group after Files: each frame of the current direction's canvas, by its label or else its page path, with its size (`Pricing · 1440 × 2100`). Typing filters by label and path. Hidden frames (`hidden: true`) are left out. Home has no canvas, so no change on Home.
- **Chip.** A frame mention shows as a chip with the frame icon, as file chips do.
- **Run.** The agent gets a `<mentioned-frames>` block: for each frame, its label, page path, frame state, size and frame id, and the line "Call get_screenshot with frameId to see it." The page file of each mentioned frame goes into the mentioned files (the `readMentionFiles` path), once, so the agent does not read it again.
- **Errors.** An unknown or deleted frame id fails the run start with the existing `BadRequest` and the text "No frame <id> in this design. Call canvas_list for frame ids." A frame of another direction gets the same text.
- **Comments.** The comment composer (`comments/composer-card.tsx`) also uses mentions. It keeps its current kinds; no frame group there in this pick.

**Spec.**
- Type: move `RunMention` (`contracts.ts` lines 434 to 442) to new `contracts/src/run-mention.ts`, and add `| { kind: "frame"; frameId: string }`. `contracts.ts` gets 1 `import type` line and 1 name in its final `export type` block (or 1 `export type` line). Net: about 7 lines fewer. Run `pnpm exec tsx scripts/gen-routes.ts` for the `exports` map. Only types move, so no UI chunk changes.
- Path: all 3 legs reach 1 parser. The `run.start` handler (`handlers/run/start.ts`) calls `RunLogWriter.start`, then `startRunWith` (`run-log/run-log-controls.ts` line 209) calls `runtime.startRun` inside `attemptKnown`, which reaches `startRunFromCall` (`http/app-run-start.ts`), `parseRunRequest` (`http/app-run-parse.ts` line 90) and `parseMentions`. `BadRequest` is already in `startRun.errors` (`run/start.ts` line 38), so the action definition does not change. Proof first: find how `parseRunRequest` reports a bad body today, so the frame error reaches the caller as a 400 `BadRequest` through `attemptKnown`, not as a defect (R7a). Reuse that way.
- Server: `parseMentions` (`http/mentions.ts`, 135 lines) keeps `{ kind: "frame", frameId }` when `frameId` is a string of 1 to 64 chars. A new sibling `server/http/mention-frames.ts` (N5d verb names, for example `toMentionFrames`) reads the direction canvas file through the canvas service that the run start path already uses, and returns label, path, state, size and id, or the BadRequest text above. Put the frame block text in a new `server/agent/frame-mention-block.ts` (`toFrameMentionBlock`), and call it from `mentionsBlock` (`user-message.ts` line 158) with 10 lines or fewer in `user-message.ts` (475 lines).
- UI: `chat/mention-options-model.ts` (110 lines) gets `toFrameOptions(frames)`. `chat/use-mentions.ts` takes `frames: readonly CanvasFileFrame[] | null`. The studio passes the canvas frames through the prompt hook that builds the mentions (find it in `ui/app/studio`; name it in the report). `chat/mention-chip.tsx` shows the frame icon. `tsc` names every `switch` on `RunMention["kind"]` that needs the new case.
- Home: Home imports `chat/index.ts` and `chat/slash-groups.ts` (cycle 43). The mention files are not in a Home chunk (0 of the 210 Home screen modules). Do not edit `chat/index.ts` or `chat/slash-groups.ts`.
- Text: in `chat/copy.ts` (271 lines): the group title and the empty text.

**Headless.** No new action and no input change: `mentions` is `Schema.Json` in `run/start.ts` (line 55). MCP clients list frame ids with `canvas_list`, then call `start_run` with `mentions: [{ "kind": "frame", "frameId": "<id>" }]`. `get_screenshot` with `frameId` shows the frame. No snapshot change.

**Main files.** New `contracts/src/run-mention.ts`; `contracts/src/contracts.ts` (shorter); `packages/common/contracts/package.json` (`exports`, by `gen-routes` only); `server/http/mentions.ts` and new `mention-frames.ts`; `server/agent/user-message.ts` (10 lines or fewer) and new `frame-mention-block.ts`; `ui/features/chat/{mention-options-model.ts,use-mentions.ts,mention-chip.tsx,copy.ts}`; the studio prompt hook that passes `frames`; fixtures `ds-wt/fat-*`. Not `chat/index.ts`, not `chat/slash-groups.ts`, not `actions/src/run/**`, not `comments/**`.

**Verify in the running app.**
- On `STUDIO_AGENT=mock`: prototype `ds-wt/fat-seed` with 3 frames (Home, Pricing, Checkout; Pricing at 2 widths).
- `@Pri` in the composer: 2 Pricing rows with their sizes. Pick 1, send "make @Checkout match @Pricing": the run log (mock) shows the `<mentioned-frames>` block with the right frame ids, and the page files once in the mentioned files.
- Delete the Checkout frame, then send a queued message with its mention: the BadRequest text.
- `pnpm exec tsx scripts/call-action.ts run.start '{"projectId":"<fat-seed>","directionId":"<id>","prompt":"x","mentions":[{"kind":"frame","frameId":"<pricing>"}]}'`: http, mcp and agent legs give the same run shape (0 diffs other than per-call values).
- Home composer: `@` as on main.
- Dark and light screenshots of the picker and the chip. `build:ui`, `check-bundle`: B1 at or under 271,703 B. No real-model run.

---

## 5. dark-a11y: Dark mode in the accessibility check (Review)

**Why.** Most real apps ship a dark theme, and most contrast bugs live there: gray text that passes on white fails on the dark card. Bonaparte has `dark:` classes in 220 files. Today the Accessibility check and `inspect_accessibility` render only the light page, so neither the user nor an MCP client can check dark contrast. This came back in the runners-up for 5 cycles. The render code exists (`toSchemedPreview`), so it is a small change.

**Behaviour.**
- **Panel.** The Accessibility section (`ui/features/accessibility`) gets a "Theme" segmented control, "Light" and "Dark", above the contrast list. Dark runs the check with `colorScheme: "dark"`: the page renders with `.dark` on `<html>` and `data-theme="dark"` (as `get_screenshot` does). The contrast rows, missing alt and unnamed controls show for that theme. The canvas does not change.
- **Fix button.** In Dark, the contrast Fix button is off, with the tip "Set the dark value of this token in Tokens, or ask Claude." (The Fix writes a light token value today; a dark write is a runner-up.)
- **Token suggestion.** Proof first: read what `CompiledTokenEntry` holds for a token with a dark value. If entries hold only light values, a dark row shows no suggested token (null), not a light token that fails in dark.
- **Default.** The control starts at Light, as on main. It remembers the last choice for the session only (component state; no storage).

**Spec.**
- Action input: `accessibility/schema.ts` `AccessibilityInspectFields` (line 41) gets `colorScheme: Schema.NullOr(AccessibilityColorSchemeSchema)` with `Schema.withDecodingDefaultKey(Effect.succeed(null))`, where `AccessibilityColorSchemeSchema = Schema.Literals(["light", "dark"])` is a new const in the same file. Do not move or export `ColorSchemeFieldSchema` from `get-screenshot.ts`; the `get_screenshot` tool must stay byte-for-byte the same. `GET` query decode: the UI sends `"null"` for null (E3).
- Server: the handler (`handlers/accessibility/inspect.ts`) passes `colorScheme` through `AccessibilityStore.inspect` to `runAccessibilityInspect` (`review/accessibility/accessibility-run.ts`, 117 lines), which wraps its `preview` with `toSchemedPreview(preview, colorScheme)` before `inspectAccessibilityPage` (`review/accessibility/inspect.ts` line 55). Import `toSchemedPreview` through `preview/page-capture/index.ts`, never `preview/index.ts` (W19b). The store stays `access: "read"` (S6, S7).
- The agent tool `inspect_accessibility` (`agent: { lean: false, set: "core" }`) gets the field with no other change. Add 1 sentence to the action description: "Pass colorScheme dark to check the dark theme." (E10, STE, under 600 chars.)
- UI: `accessibility/accessibility-api.ts` sends the field. New `accessibility/theme-choice.tsx` (component) and the choice in `use-accessibility.ts` (or a new `use-theme-choice.ts`, U6a). Text in `accessibility/copy.ts` (99 lines). Styles in `accessibility.module.css` (exists; no new module).

**Headless.** No new action and no new tool name. MCP clients and the agent call `inspect_accessibility` with `colorScheme: "dark"`. `get_screenshot` with `colorScheme: "dark"` shows the same render. `inspect_accessibility` is in no snapshot file, so there is no snapshot diff; `get_screenshot` must have none.

**Main files.** `actions/src/accessibility/{schema.ts,inspect.ts}` (1 field, 1 sentence); `server/handlers/accessibility/inspect.ts`; `server/review/accessibility/{accessibility-store.ts,accessibility-run.ts,inspect.ts}` (and `input.ts` if the command type lives there); `ui/features/accessibility/{accessibility-api.ts,use-accessibility.ts,accessibility-section.tsx,contrast-fix-button.tsx,copy.ts,accessibility.module.css}` and new `theme-choice.tsx`; fixtures `ds-wt/dax-*`. Not `workspace/get-screenshot.ts`, not `preview/color-scheme.ts`, not `review/accessibility/contrast.ts` unless the token proof needs a null suggestion there.

**Verify in the running app.**
- HTML prototype `ds-wt/dax-seed` with light and dark tokens (`.dark { --muted: #6b7280 }` on a `#111827` card: fails in dark, passes in light). Tailwind app `ds-wt/dax-next` (copy of `ac-next-b`) with `dark:text-gray-600` on a `dark:bg-gray-900` card.
- `dax-seed`: Light: 0 low pairs on the card. Dark: 1 low pair with the ratio; the Fix button is off with the tip.
- `dax-next`: the same result from the `dark:` classes.
- `pnpm exec tsx scripts/call-action.ts accessibility.inspect '{"projectId":"<dax-seed>","directionId":"<id>","frame":"<frame>","colorScheme":"dark"}'`: http, mcp and agent give the same report (0 diffs). With `colorScheme` left out: the light report, as on main.
- `get_screenshot` with `colorScheme: "dark"` on the same frame: the render matches the checked theme.
- Dark and light screenshots of the section. `build:ui`, `check-bundle`: B1 at or under 271,703 B. No real-model run.

---

## File ownership

| Pick | Owns |
|---|---|
| 1 polish-44 | new `contracts/src/{layout-style-properties.ts,settings-defaults.ts,variation-limits.ts}`; `contracts/src/contracts.ts` (position block, `DEFAULT_SETTINGS`, `VARIATION_*`, final export block); `contracts/package.json` (`exports`, `gen-routes`); `bridge/element-info.ts` (`z-index`); new `tailwind/added-groups.ts`; `tailwind/{map.ts,classes.ts}` (name swaps); `inspector/{scroll-pin-model.ts,use-scroll-pin.ts}` and the 1 file the breakpoint proof names; `design-system/port-model.ts` and new `route-pattern-model.ts`; `home/use-home-screen.tsx` (1 line); `canvas/variations-api.ts` (1 line); fixtures `ds-wt/p44-*` |
| 2 type-detail | `contracts/src/text-format-properties.ts`; `bridge/element-info.ts` (5 keys); `tailwind/added-groups.ts` (4 groups); `inspector/{text-grid.tsx,copy.ts}` and new `type-detail-row.tsx`, `use-type-detail.ts`, `type-detail-model.ts`; `styles/inspector.css`; fixtures `ds-wt/tdt-*` |
| 3 layout-more | `contracts/src/layout-style-properties.ts` (2 entries); `bridge/element-info.ts` (2 keys); `tailwind/added-groups.ts` (2 groups); `inspector/{flex-controls.tsx,copy.ts}` and new `layout-more-row.tsx`, `use-layout-more.ts`, `layout-more-model.ts`; `inspector/align-grid.tsx` (only if needed); `styles/inspector.css`; fixtures `ds-wt/lmo-*` |
| 4 frame-at | new `contracts/src/run-mention.ts`; `contracts/src/contracts.ts` (`RunMention` block, final export block); `contracts/package.json` (`exports`, `gen-routes`); `server/http/mentions.ts` and new `mention-frames.ts`; `server/agent/user-message.ts` and new `frame-mention-block.ts`; `chat/{mention-options-model.ts,use-mentions.ts,mention-chip.tsx,copy.ts}`; the studio prompt hook; fixtures `ds-wt/fat-*` |
| 5 dark-a11y | `actions/src/accessibility/{schema.ts,inspect.ts}`; `server/handlers/accessibility/inspect.ts`; `server/review/accessibility/{accessibility-store.ts,accessibility-run.ts,inspect.ts,input.ts}`; `ui/features/accessibility/{accessibility-api.ts,use-accessibility.ts,accessibility-section.tsx,contrast-fix-button.tsx,copy.ts,accessibility.module.css}` and new `theme-choice.tsx`; fixtures `ds-wt/dax-*` |

Shared files and conflict warnings:
- **`tailwind/added-groups.ts` (picks 1, 2 and 3).** Pick 1 makes it and swaps the names in `map.ts` and `classes.ts`. Picks 2 and 3 add entries only. They cannot start their Tailwind work before pick 1 merges; they can build the UI first. Neither edits `map.ts` or `classes.ts`.
- **`contracts/src/contracts.ts` (picks 1 and 4).** Different blocks: pick 1 edits the position block (lines 2139 to 2143), lines 88 to 93 and 2335 to 2343, and the final export block; pick 4 edits lines 434 to 442 and the final export block. Both shrink the file. Rebase pick 4 on pick 1 and merge the 2 export block lines by hand.
- **`contracts/package.json` `exports` (picks 1 and 4).** Written only by `gen-routes`. After each merge, run `pnpm exec tsx scripts/gen-routes.ts --check`; on a conflict, run the generator, never edit by hand (W11c).
- **`contracts/src/layout-style-properties.ts` (picks 1 and 3).** Pick 1 makes it with 6 entries; pick 3 adds 2. Rebase pick 3 on pick 1.
- **`bridge/element-info.ts` `STYLE_KEYS` (picks 1, 2 and 3).** 1, 5 and 2 lines, in different places (after `"left"`, after the text keys, after the flex keys). Rebase.
- **`inspector/copy.ts` (picks 2 and 3).** 494 lines; the limit is 500. Pick 2 adds 3 lines or fewer, pick 3 adds 2 or fewer: 499 at most. Picks 1, 4 and 5 add 0. Labels go in the model files.
- **`styles/inspector.css` (picks 2 and 3).** Different new class blocks (`.ins-type-detail`, `.ins-layout-more`). Rebase.
- **Inspector hosts.** Pick 2 edits `text-grid.tsx`; pick 3 edits `flex-controls.tsx`; pick 1 edits `scroll-pin-*` and maybe `inspector-tab-body.tsx` or `mixed-values-model.ts` (the breakpoint fix). No 2 picks edit the same host.
- **`home/use-home-screen.tsx` and `canvas/variations-api.ts` (pick 1 only).** 1 import line each. No other pick edits a Home file.
- **Chat (pick 4 only).** No other pick edits `ui/features/chat/**`.
- **Accessibility (pick 5 only).** No other pick edits `actions/src/accessibility/**`, `review/accessibility/**` or `ui/features/accessibility/**`.
- **`actions/**`.** Only pick 5 edits it (1 field, 1 sentence). No pick adds an action, so the `@generated` action lists do not change.
- **`packages/ui`.** No pick edits it.
- **Home preload files.** No pick edits a B1 file (`ui/app/{main.tsx,app.tsx,screen-preload.ts}`, `ui/platform/*`, `ui/features/commands/**`). No pick adds a lazy chunk, a lazy `import()`, a lazy feature export or a CSS module. Each pick runs `build:ui` and `check-bundle` and writes the B1 bytes and the Home chunk list. Picks 1 and 4 also write the `contracts-*.js` chunk list (a new contracts file must not become a new shared chunk name in the `screen-preload` table).
- **MCP snapshots.** No pick edits a file in `artifacts/mcp-snapshots/`. Expected diffs: `direct-edit-element.json` and the agent breakpoint enum (picks 1, 2, 3). Each pick confirms its tool names with a `node -e` read, not with `mcp-snapshot.ts`.
- **`check-actions`.** No pick may add a check-actions hit. Each runs `pnpm exec tsx scripts/check-actions.ts --probes` and reports the hit count against main (278 in cycle 43: E1 25, E16 6, O11 1, O12 52, S11 194; the count must not go up).
- **Hand aggregators.** No pick edits `actions/index.ts`, `main/live-layer.ts`, `http/mount-all.ts`, `mcp/registry.ts` or `agent-tools/registry.ts` (W12).
- **Long files.** `contracts.ts` (2,760), `tailwind/map.ts` (966), `tailwind/classes.ts` (819): no growth (L2a). `inspector/copy.ts` (494): 499 at most. `user-message.ts` (475): pick 4 adds 10 lines or fewer.
- **Perf baseline.** No pick edits `scripts/perf/baseline.json` (P10, L6).
- **LAN and cloud.** No test script turns on LAN sharing or publishes to a cloud host. No pick calls `publish`, `share_publication`, `create_share_link` or `PUT /api/shares/lan` with `isOn: true`. Every dev run binds 127.0.0.1 with a fresh `STUDIO_DATA_DIR=$(mktemp -d)` and no cloud account.
- **Fake apps under `ds-wt`.** Each pick has its own prefix (`p44-`, `tdt-`, `lmo-`, `fat-`, `dax-`). No pick writes into Bonaparte or `ac-next-b`.

## Merge order

All 5 can start at once. Picks 2 and 3 do their Tailwind step after pick 1 merges. No pick adds an action, so no pick changes the `@generated` action lists, and the "generated lists last" rule applies to no pick. The contracts `exports` map in `package.json` is not a `// @generated` file, but `gen-routes` writes it, and picks 1 and 4 change it. They go in dependency order: pick 1 first, because picks 2 and 3 build on its seam and its `layout-style-properties.ts`; pick 4 last, so only 1 more `exports` change comes after the rest. Run `pnpm exec tsx scripts/gen-routes.ts --check`, `pnpm run build:ui` and `pnpm exec tsx scripts/check-bundle.ts` after each merge (B1 at or under 271,703 B):
1. **polish-44**: first. It makes `tailwind/added-groups.ts`, `layout-style-properties.ts` and the first `exports` map change.
2. **dark-a11y**: no shared file with the others.
3. **type-detail**: rebase on polish-44; adds its Tailwind groups and `STYLE_KEYS` lines; `inspector/copy.ts` to 497 at most.
4. **layout-more**: rebase on type-detail; check the `inspector/copy.ts` line count (499 at most) and the `STYLE_KEYS` and `added-groups.ts` merges.
5. **frame-at**: last. Rebase on polish-44's `contracts.ts` and `exports` map, run `gen-routes`, then `--check`.

After the last merge, run `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run check:scripts` (expected to fail only at the `check-actions` items left for Tyler; write the counts), `pnpm run lint:gate`, `pnpm exec tsx scripts/gen-routes.ts --check`, `pnpm run build:ui`, `pnpm exec tsx scripts/check-bundle.ts` and `pnpm exec tsx scripts/check-boot-imports.ts`. Then `pnpm run desktop:pack`. Then one mock session on merged main: a Fixed tab bar with `z-10` and a Sticky header at `md` on `p44-next`, an iOS corner class on `p44-next`, the catch-all refusal on `p44-dyn`, the Home screen set without `contracts-*.js`, a centered label and a wavy underline on `tdt-seed`, a baseline price row on `lmo-seed`, a `@Pricing` run on `fat-seed`, and a dark contrast row on `dax-seed`.

## Real-model run budget

None. No pick changes a prompt rule or the run loop. frame-at adds a prompt block only when the user mentions a frame, and its check reads the mock run log (`STUDIO_AGENT=mock`). Total: 0 runs.

## Runners-up

1. Cut the `screen-preload` dep table out of B1: 4,605 B of `screen-preload-*.js` (6,427 B) is `__vite__mapDeps` with 170 names for the studio, home, design-system and commands imports. A small studio entry module that does the `import("./studio")` would move the studio list out of B1 (about 4 KB). The cost is 1 more module hop on studio open, which `prefetchStudio` hides. Proof needed before a pick.
2. Split `src/ui/api.ts` for Home: the `api` object spreads 9 modules (lines 11 to 21), so the 16 Home files that import it load `api-*.js` (13,395 B) with edit, style, text-style and version code. Point the Home callers at `api-project.ts`, `api-workspace.ts` and `api-app.ts`.
3. Variable font axes in Type details (Figma; 0 hits for `font-variation-settings`). Needs axis data in `google-fonts.ts` and range links (`wght@100..900`) first.
4. Hide and lock keys (Figma `Mod+Shift+H`, `Mod+Shift+L`). `Mod+Shift+H` is "Go to Home" (`keymap.ts`), so it needs a key decision first.
5. Move `RUN_LEVELS` and `RUN_EFFORTS` to their own contracts file, so the lazy Home level popover and Home slash menu skip `contracts-*.js` (pick 1 leaves them; 5 UI callers can make a new shared chunk).
6. Card parts: split a 2-part hand card into `CardHeader` and `CardContent` (kit-swap skips it with `needs-parts`; cycles 39 to 43).
7. Near-duplicate shadows: the review probe does not collect `box-shadow` literals (cycles 41 to 43).
8. Frame links in the cloud viewer (`apps/publish`), and frame rows for links made in an earlier session (cycles 42 and 43).
9. Auto layout "Canvas stacking: first on top" (Figma; a z-index for each child), after layout-more.
10. A dark write for the accessibility Fix button (the dark value of the token), after dark-a11y.
11. scroll-pin: Fixed starts with the top pin, so a bottom tab bar needs 2 clicks (scroll-pin "Left out").
12. batch-rename: the class fallback as `$&` on an unnamed layer, and reselect after the write; rule Fix in `@media` and nested rules (cycle-43 runners-up 6 and 7).

Dropped from the list: flip, paste to replace, hug and fill, the eyedropper, ruler guides, link interactions, element variations, the to-do panel, restore and retry in chat, clarify, starters and templates, markup feedback, the Claude Code handoff, focus on frames, prompt improve (the code exists, see Findings).

## Results (2026-11-15)

Feature cycles are paused. Tyler asked to refine the app and cut fluff, and a UX audit runs first.

- **Merged:** polish-44 (`22b2a1fe4`). It holds fixes only: z-index on Fixed and Sticky, breakpoint writes, `[corner-shape:…]` classes, catch-all route refusal, and contracts code off the Home screen.
- **Held:** type-detail (half done, no checks yet), layout-more, frame-at and dark-a11y. Judge each against the UX audit before merging.
- **Also shipped in this install:** the canvas clip and body source fix (`c88fc06d5`) and the Connect AI redesign (`918220d9f`).
- **Checks:** gen-routes, typecheck, lint:gate (59,564), build:ui, clip (0 issues) and check-bundle pass. Pack passes and the app is installed. :4570 gives 200. Idle CPU is 0.01 CPU-s per minute after start-up.
- **Incident:** the first pack failed on a short DNS outage, and the check script still copied the old cycle 43 build into /Applications. The script now stops when the pack fails.

## UX audit bug fixes (2026-11-15)

- **Audit:** cloud session report on branch `ux-audit` (`artifacts/ux-audit/report.md`): 72 rows, 19-item cut list waiting for Tyler.
- **Merged:** feat/fix-home, feat/fix-insp, feat/fix-canvas, feat/fix-chat (`42ccf6438`). Home row buttons, Esc on shortcuts, "Project settings…" label, Margin/Padding overlap, inspector truncation, Fit clear of the inspector, preset frame names, Ask chip placement, Review panel position, Plan-mode composer, budget retry text, approval wrap.
- **Clip:** the frame-selection step started its drag on the left tool rail after the Fit change; the check now starts on empty canvas (`0e3a0d9a6`). The app was not broken.
- **Checks:** gen-routes, typecheck, lint:gate (59,563), build:ui, clip (0), check-bundle pass. Pack passes and the app is installed; :4570 gives 200; idle CPU 0.01 CPU-s per minute.
- **Open for Tyler:** the cut list; risky defaults `allowBash`, `allowInstall`, `autoApprove` are on (`packages/common/contracts/src/settings-defaults.ts`).

- **Merged:** frame-at (`e2611752c`): `@` frame mentions in the chat and `start_run`; an unknown frame now fails with a clear error. All checks pass, clip 0, app installed, idle CPU 0.02 CPU-s per minute. type-detail, layout-more and dark-a11y stay held for the cut decision.

## Fluff cuts (2026-11-15)

- **Merged:** feat/cut-home, feat/cut-chat, feat/cut-canvas, feat/cut-insp (`291138307`), all 19 audit cut-list items. UI only: no server action, MCP tool or agent tool removed.
- **Home:** one sample and one template entry, no Recent strip, no "Prototype · HTML" badges, one MCP status segment, settings out of the plus menu ("Ask questions on short briefs" moved to Advanced).
- **Chat:** at most 2 chips after a run, one chip per selected layer, commands first in the slash menu, visible Plan / Build pill.
- **Canvas:** frame header is name + "…", Tokens merged into Assets, context menu 15 items + More, one-click Share, Export More formats, one-click Present.
- **Inspector:** name, Width, one State row, Layout, Text, Appearance, Border, Effects, More. Lost from UI: effect styles (MCP only), per-axis overflow, the Prototype tab (Position select sets Fixed and Sticky).
- **Bytes:** cuts added 19 B to Home B1; one shared `pick` helper removed it. B1 271,671 B, baseline lowered (`23c6947c9`).
- **Checks:** gen-routes, typecheck, lint:gate (59,501), build:ui, clip (0), check-bundle pass. App installed, :4570 200, idle CPU 0.02 CPU-s per minute.
- **Open:** stale e2e specs `canvas-r2`, `canvas-r7`, `versions-panel` reference removed controls; App workspaces have no template entry; risky defaults still on.

- **Merged:** dark-a11y (`c110797d6`): Light / Dark choice in the Accessibility section (now under More). Checks pass, app installed.
- **Fixed:** App and folder workspaces have a "Start from a template" entry again (`3e1064431`), not checked in the UI.
- **Clip:** the first run after the dark-a11y merge failed once on "canvas menu preview right-click"; 2 reruns passed with 0 findings, so the step is flaky.

## Leftover fixes (2026-11-16)

- Merged `feat/fix-leftover` as `d0698586e`: full frame labels to about 15% zoom, short Numbers labels and a full Code tab file link at 248 px, and "Running" before "Ran" in chat.
- Passed: gen-routes, typecheck, lint:gate (59501 diagnostics, baseline 89733), build:ui, check-bundle, clip (0 findings), desktop:pack.
- Installed to `/Applications`. :4570 returns 200. Idle CPU is 0.01 CPU-s per minute.
- Kept: `autoApprove`, `allowBash` and `allowInstall` stay on, by Tyler's choice.
- Dropped: `feat/type-detail` (baec99240) and `feat/layout-more` (663962885), by Tyler's choice. Both added inspector rows. Restore with `git branch <name> <sha>` while git still keeps the commits.
