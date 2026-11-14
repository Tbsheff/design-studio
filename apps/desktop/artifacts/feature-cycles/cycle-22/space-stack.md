# Cycle 22 pick 1: space-stack

Branch `feat/space-stack`. No new action.

## Changed

- Engine: new `direct-edit/engine/tailwind/space-stack.ts` (pure). `plan.ts` calls it once, before `collect`. `map.ts` and `classes.ts` are not changed.
  - A stack is a plain `space-y-<s>` or `space-x-<s>` class with the variants of the edit, with no `flex`, `inline-flex`, `grid` or `inline-grid` class and no `space-*-reverse`.
  - Gap edit (`gap`, or `row-gap` for `space-y`, `column-gap` for `space-x`): writes `space-y-<s>` with the suffix that the gap mapper gives. Gap 0 or null removes the class.
  - Display flex or grid, `flex-direction`, `flex-wrap`, `align-items` or `justify-content` edit: removes the `space-*` class and writes `flex flex-col gap-<s>` (`flex gap-<s>` for `space-x`) in the same plan, so one write and one undo step. Edits that the caller sends win over these defaults.
  - Negative and reverse stacks are not touched, so the edit goes the old way.
- `edit_element` description: one sentence on `space-*` stacks (`mcp/legacy/direct-edit-inline.ts`). Snapshot files not changed: approve the description diff at merge.
- Bridge: new `bridge/stack-gap.ts`. `layoutStyles` sends `stack-gap-x` and `stack-gap-y`, the used margin between the first 2 children. So the Gap field shows the real px for any theme scale, also for `space-y-(--space-6)`. This is one line in `bridge/inlineStyle.ts`, not the file that pick 2 owns.
- Inspector: `space-stack-model.ts`, `use-space-stack.ts`, `space-stack-note.tsx`, `spaceStackCopy` in `copy.ts`. `auto-layout-body.tsx` shows the flex controls with a stack edit (Vertical or Horizontal, the Gap), and the note "Stack spacing (space-y)". A reverse or negative stack shows "Stack spacing (space-y). Edit in code" with no controls, and Shift+A does nothing on it. `classes` goes from `layout-section.tsx` through `auto-layout-section.tsx`.
- Fix in `use-direct-edit-core.ts`: a forced prop now stays in the commit after the token rewrite. Before, the rewrite dropped a forced value that equals the computed base, so Horizontal on a `space-y` block (computed `flex-direction: row`) wrote nothing.
- `use-layout-keys.ts` and `gap-fields.tsx` are not changed: Shift+A and the Gap field reach the engine through the existing write paths.

## Checked (running app, port 48610, Tailwind v4 HTML page)

- Select `space-y-4` div: Auto layout shows Vertical, Gap 16px, note "Stack spacing (space-y)".
- Gap 24: `space-y-(--space-6)` (Keep tokens on), cards move. Cmd+Z: `space-y-4` in one step.
- Horizontal: `flex flex-row gap-4`, no `space-y-*`.
- Shift+A on `space-y-2`: `flex flex-col gap-2`. Card rects before and after are the same (350/440 both times).
- Shift+A on `space-y-4` (one run): `flex flex-col gap-4`. Shift+A on `space-x-4`: `flex gap-4`.
- `space-y-reverse space-y-4`: read-only note, no controls.
- MCP `edit_element`: `{"row-gap":"32px"}` on `space-y-4` gives `space-y-8`. `{"display":"flex"}` on `space-y-2` gives `flex flex-col gap-2`. `{"gap":"8px"}` on `space-x-4` gives `space-x-2` (`space-stack/mcp-edit-element.txt`).
- `call-action.ts direct-edit.apply` with `{"row-gap":"24px"}`: HTTP wrote `space-y-6`. The MCP and agent bindings of that action are off (`legacy-mcp`, `legacy-agent`), so call-action skipped them (`call-action-direct-edit-apply.txt`).
- Bonaparte, read-only, engine run on all 760 unique `className` strings with `space-[xy]-`: 694 are stacks; 693 rewrite the gap and 693 convert to `flex ... gap-*` with no `space-*` (`bonaparte-classes.txt`). Bonaparte `git status --short` has 14 lines before and after.
- Screenshots: `space-stack/section-{dark,light}.png`, `space-stack/read-only-{dark,light}.png`, `space-stack/full-{dark,light}.png`.
- `pnpm run typecheck`, `pnpm run lint:gate` and `pnpm run build:ui` pass.

## Left out

- A layer with both `space-y-*` and `space-x-*` (1 Bonaparte string) converts only the first axis and keeps the other class.
- The agent's `edit_element` was not run: the mock agent has no route for legacy tools. It calls the same `styleEdit` engine path as MCP.
- Variant stacks (`md:space-y-4`) rewrite on a matching variant edit in the engine, but the inspector reads only base classes.
- The live preview of a Gap drag on a stack sets inline `gap` on a block element, so the cards move only after the write.
- Bonaparte was not opened in the running app (no `node_modules` or database in a local clone). The engine ran on its real classes.
- The `.claude/goal` roadmap is not in the worktree, so no Appendix A glob was added.
