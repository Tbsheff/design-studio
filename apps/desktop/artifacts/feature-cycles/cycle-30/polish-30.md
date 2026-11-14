# Cycle 30, pick 5: polish-30

Branch `feat/polish-30`. Six small open items. No new action, error or domain. The only action change is the `fixture.create` description.

## What changed

- **Kit check labels and tables** (`components/kit-drift/engine/to-markup-drift.ts`). The prototype scan now finds `<label>` and `<table>` and maps them to the app `Label` and `Table` recipes. `KitDriftTagSchema` did not change.
- **Recipe reader fix** (`design-system/engine/to-component-recipes.ts`, outside the owned list). Before the fix, the reader took the first `className` in each component. For a shadcn `Table`, the first `className` is on the `<div data-slot="table-container">` wrapper, so the recipe was `<div>` with `relative w-full overflow-x-auto`. Now a `className` on the element whose `data-slot` matches the component name wins. `Table` is now `<table data-slot="table">` with `w-full caption-bottom text-sm`. A plain `cn(...)` Label gives a recipe with base classes.
- **One "Studio check:" sentence** (`agent/prototype-kit-review.ts`, `prototype-review.ts`).
  - When both checks ran, the note is one sentence with one label: "Studio check: the agent skipped the mobile screenshot and review_frame ...; pass 1: 2 finding(s) on changed lines, a fix loop ran; pass 2: 0 finding(s) on changed lines, no fix loop; 3 controls did not use the app kit, 0 after the fix loop."
  - The kit-only note and the review-only note are as before.
- **Fixture params** (`handlers/page/import-source.ts`, `handlers/project/create-prototype.ts`, `project-ops/route-source/{route-source-file,route-source-record,route-source-writer}.ts`).
  - The copy record did not keep params. It kept only `/patients`, so no match could tell two fixture copies apart.
  - The record now has `fixtureRoute`. Older records decode it as null.
  - `create-prototype` sets it from the fixture that the copy came from. `import_source_page` picks that fixture, else the latest one for the route, and carries the field to the new record.
  - The 3 `route-source` files and `create-prototype.ts` are outside the owned list. `fixture-saved.ts` did not need a change.
- **Fixture text** (`actions/src/fixture/create.ts`). The description now says that a fixture is reused in the same direction for the same route, params, query values and shell, and only while its folder still exists. `gen-routes --check` passes.
- **Multi type keys** (`ui/features/inspector/{edit-keys-model,use-edit-keys}.ts`). On a multi-selection, the type keys step the Tailwind scale when every selected layer's value is on the scale. The keys are `Mod+Shift+.`, `Alt+.` and `Alt+Shift+.`, for font-size and line-height. Otherwise the keys step 1 px, as before. Mixed values do nothing, as before.
- **Page-load 404s.** Both still happened. Both are fixed.
  - **Change rings** (`ui/features/canvas/use-change-rings.ts`). Before the fix, the first run version sent `GET .../changes?from=null&to=<sha>`, and the server answered 404 "no parent version". The hook now skips a `version.created` event with no `parentId`.
  - **State board** (`ui/features/canvas/use-state-check.ts`). Before the fix, every board asked for `runs/states/states-<section>` on load, and the server answered 404 because no sequence existed. The read now starts after this board starts a sequence, or while a run is live.

## Checks

- **`call-action.ts kit-drift.list`** on the seeded kit prototype passes. The page has 2 hand-styled labels, 1 hand-styled table and 1 `data-slot` label. The prototype is `kc-next`: Next 16, Tailwind 4, shadcn-style button, input, card, label and table.
  - All 3 surfaces return the same 3 finds: Label, Label and Table. There are 0 diffs.
  - Output: `cycle-30/polish-30/call-action-kit-drift.txt`.
- **`call-action.ts fixture.create`** passes. All 3 surfaces reuse `fx-f4fbf8`, with `versionId` null and 0 diffs. Output: `call-action-fixture-create.txt`.
- **`import_source_page`** passes on `ds-wt/rf-next-fx`. In this copy of `rf-next`, `/patients` answers 500, and the page shows `Ward <ward>`.
  - The app has two fixtures: north and south.
  - The north copy reads north on HTTP, MCP and the agent: 3 imports by `call-action`, plus 1 by HTTP. The south copy reads south.
  - Main takes the latest fixture (south) for both copies.
  - Output: `import-source-fixtures.txt`, `call-action-import-source.txt`. The `call-action` diffs are only the new page names.
- **Note check.** The script `kit-note-check.mts.txt` calls the real `listKitLines` and `toReviewNote`. Output: `kit-note-check.txt`.
  - It shows the 3 finds and the 2 kit lines, and 0 finds after the fix.
  - It shows the one-sentence note, the kit-only note and the review-only note.
  - A mock run does not reach this code, so the screenshots use a stored run log with that note: `kit-note-dark.png`, `kit-note-light.png`.
- **Multi type keys in the app.** The test page has two `class="text-sm"` (14 px) headings in an HTML project. Shift-click both, then `Mod+Shift+.`.
  - Result: both are 16 px (`style="font-size: 16px"`).
  - On a single plain-CSS heading, the same key gives 15 px, as before.
  - The HTML project writes an inline style, not `text-base`.
  - Screenshot: `multi-keys-after-dark.png`.
- **404s in the app.** A new project opened during its first run gave the 404 before the fix and no 404 after it. A state board load sends no states request. After "Design missing states", `runs/states/states-s1` answers 200, and later change rings answer 200.
- **Gates pass:** `pnpm run typecheck`, `pnpm run lint:gate` (59601 against baseline 89733), `pnpm run build:ui` and `gen-routes --check`.
- **No real-model run**, as the spec says.

## Left out

- **Ended states line after a reload.** After a page reload, a state board that is not running does not show the "ended" line (failed or stopped) of an earlier sequence. The UI cannot know that a sequence exists without asking, and the sequences live only in server memory.
- **Label recipe element.** The `Label` recipe still says `<div>`, because a Radix `LabelPrimitive.Root` is not an HTML tag. The scan matches by component name, so this has no effect on the finds.
- **Roadmap:** `.claude/goal/roadmap.md` is not in the worktree, so no Appendix A globs were added (L6e).
- **Files outside the owned list:** `design-system/engine/to-component-recipes.ts`, `handlers/project/create-prototype.ts` and `project-ops/route-source/{route-source-file,route-source-record,route-source-writer}.ts`. No other pick owns them.
