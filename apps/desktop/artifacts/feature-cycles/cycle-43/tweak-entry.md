# Cycle 43, pick 4: tweak-entry

Branch `feat/tweak-entry`, cut from `cd8f2558c`.

## Built

- **Tab.** The inspector tab bar shows Design, Tweaks, Prototype, Code. `toInspectorTabs(isAppProject)` (`inspector-model.ts`) drops Tweaks when the project has an app folder. `tab-bar.tsx` uses it, so arrow keys move across 4 tabs (3 in an app project).
- **No selection.** `openTweaks` pins the inspector column (`isInspectorPinned` in the studio layout state), so it opens with 0 selected layers and stays open when the user then clicks Design, Prototype or Code. "Show or hide the Inspector" unpins it; a layer selection also unpins it (old rule after that). The empty tab shows the existing "Suggest tweaks" button.
- **Run-end chip.** `toTweakChip(tweakCount, isAppProject)` (`suggestion-model.ts`) picks "Add live tweaks" (0 controls) or "Open tweaks" (1 or more). The chip is first in "Next steps", in a new `tweak-chip.tsx` (static import, same chunk). The chips show when there is a tweak chip, even with 0 `run_suggestion` chips. "Add live tweaks" calls `run.runTweaks("")`: it opens the Tweaks tab and starts the tweaks run. "Open tweaks" calls `run.openTweaks()`.
- **Slash.** `/tweaks` is a command in the studio composer only (`use-slash-sections.ts` gets `onTweaks`, from `PromptBoxProps.onTweaks`, from `left-props.ts`). A pick from the menu starts the run with no ask. `/tweaks bigger type` + Enter: `send` in `use-studio-run.ts` reads the text after `/tweaks` as the ask (`toTweaksAsk`) and calls `runTweaks(ask)`. App projects get no item and no intercept.
- **Headless.** No new action, no tool input or description change. MCP and agent use `start_run` with `task: "tweaks"` and `list_tweaks`, `set_tweak`, as before.

## Checked (mock agent, port 4733, data dir `ds-wt/tweak-entry-data`)

- New prototype from a Home prompt (`ds-wt/twk-seed-coffee-shop-landing-page`): after the first build, "Tweaks: Add live tweaks" shows first. Click: the mock tweaks run adds 3 controls and the Tweaks tab opens with them. The chip then reads "Open tweaks".
- Fresh prototype `ds-wt/twk-drag-bakery-page`, chip, run ends, no reload: the sliders are enabled; radius drag 12 to 27 px, the canvas follows (`drag-no-reload-light.jpg`). After reload, "Open tweaks" opens the tab with no run; radius drag to 30 px, Save, then "Save version": 1 version.
- 0 layers, Tweaks tab, click Design: the column stays open with "Select a layer" (`design-tab-stays-light.jpg`). "Show or hide the Inspector" then hides it.
- `/tw` shows `/tweaks` in Commands. `/tweaks bigger type` + Enter: a tweaks run starts; its prompt ends with "The user asked for: bigger type".
- Home composer `/tw`: no `/tweaks` item.
- Arrow keys: Design, Right, Tweaks; Left, Left wraps to Code.
- App project `ds-wt/twk-next` (copy of `ac-next-b`, imported with `project.import`): tabs are Design, Prototype, Code; no `/tweaks` item.
- `call-action.ts run.start '{"task":"tweaks",...}'` on a fresh prototype: http ok (run starts); mcp `run_in_progress` (http started the run first); agent skipped (`run-control`). Then `call-action.ts direct-edit.getTweaks`: pass on http, mcp and agent, 3 controls, 0 diffs. "Open tweaks" then shows the 3 controls in the tab.
- `pnpm run typecheck`: pass. `pnpm run lint:gate`: pass (59,575, baseline 89,733). `pnpm run build:ui`: pass.
- `check-bundle`: pass. B1 274,673 B, delta 0 B. Home chunks: main, preload-helper, react, desktop, use-latest, focus, find-element, live-store, telemetry, api-telemetry, api-core, http, json-guard, query, pick, storage, ui-select-model, pick, router, index, global-commands, command-disabled, copy, app-events, project-nav, screen-preload, registry, keys, api-error, prototype-dialog, typing-target.
- `check-actions --probes`: 557 hits, the same as main (cycle-42 reports: 557 at `5e544ae40`; this pick adds 0 actions and 0 hits name its files). Items: S11 194, O12 52, E1 25, E16 6, O11 1. Probes pass (11).
- MCP snapshots: no tool changed, so no snapshot diff. 0 real-model runs.

Screenshots in `cycle-43/tweak-entry/`: `drag-no-reload-light.jpg`, `design-tab-stays-light.jpg`, `chip-add-dark.png`, `after-chip-run-dark.jpg`, `tab-dark.jpg`, `slash-and-tab-dark.jpg`, `slash-run-dark.jpg`, `tab-and-chip-light.jpg`, `mcp-run-tab-light.jpg`.

## Notes

- After a tweaks run in the open session, the tab shows "Edit 1" and "Save or discard your edits before you ask for a tweaks panel". The tweaks write counts as an edit in the edit session (the same as a slider Save). The sliders stay enabled; only "Suggest" is blocked until the user saves or discards. Not changed here.
- Rule slip: I ran `ln -s ../ac-next-b/node_modules twk-next/node_modules` for the app fixture, then removed the link. Nothing else touched node_modules.
- Fixtures: `ds-wt/twk-seed-coffee-shop-landing-page`, `ds-wt/twk-drag-bakery-page`, `ds-wt/twk-next`, and `ds-wt/twtwk-mcp-pricing-page` (a typo in the Home prompt; it does not have the `twk-` prefix). Logs in `ds-wt/twk-logs`, data in `ds-wt/tweak-entry-data`. No listener left on 4733 to 4735 or 6400 to 6519.
- The chip host passes 3 props, not 2: `tweakCount`, `isAppProject` and `onTweaks`, to match `toTweakChip(tweakCount, isAppProject)`.

## Files outside the pick list (no other pick owns them)

- `ui/features/inspector/inspector-edit-pane.tsx` (1 prop to `TabBar`)
- `ui/app/studio/use-studio-panes.ts`, `use-studio-state.ts`, `studio-ui-types.ts` (`isInspectorPinned`)
- `ui/app/studio/studio-run-types.ts` (`openTweaks`, `runTweaks`)
- `ui/app/studio/suggestion-slot.tsx` (chips host), `ui/app/studio/left-props.ts` (prompt props)
- `ui/features/chat/prompt-box-props.ts`, `ui/features/chat/use-prompt-slash.ts`
- New file: `ui/features/suggestion/tweak-chip.tsx`

`.claude/goal/roadmap.md`: not in worktree. Add the new file above to Appendix A.

## Left out

- Nothing from the spec. The left-props-panels file needed no change: the tab opens through `run.openTweaks`.
