# Cycle 26 pick 4: group-rotate

Branch `feat/group-rotate`. Data dir `ds-wt/group-rotate-data`, server port 48810, mock agent.

## Built

- **Group turn.** The multi-selection rotate zone turns the selection around the center of its box. Each absolute (or fixed) layer gets the same rotate, and its `left` and `top` move to its turned center. Unchanged sides are not written.
  - Tailwind: a side on the spacing scale (`left-8`) snaps to 4 px. Any other side rounds to 1 px.
  - CSS (no Tailwind theme): flow layers move with `translate`. A zero move writes nothing.
  - Tailwind with any flow layer: each layer turns around its own center, and the label shows "30° Each".
- **Mode source.** At pointer down the drag reads `GET .../classes` for each layer (about 16 ms). `variants.mode === "classes"` means Tailwind. The commit waits for that read.
- **Tailwind 4 rotate.** A whole angle writes `rotate-<n>` (`rotate-15`, `-rotate-30`). Tailwind 3 keeps the v3 steps. The version comes from `theme.version`. The theme service is `themeForFile` / `tailwindThemeFor` in `server/direct-edit/tailwind/theme.ts`.
- **Contracts.** `translate` is now an allowed style property (`transform-style-properties.ts`). Without it the server returned "style has a property that is not allowed".
- **batch_edit description.** It has one new sentence. The text is in `server/mcp/history-tools.ts`, not `edit-tools.ts`. The MCP snapshot still needs updating (user decision at merge).

## Checked in the running app

- Tailwind 4 badges (`left-8`, `left-[160px]`, `left-72`), Shift-drag to 30°: one write, `rotate-30` with `top-4 left-12` / `left-[160px]` (unchanged) / `top-36 left-68`. Centers turned as one row. One Cmd+Z restored all 3. Escape mid-drag wrote nothing.
- 2 flow icons and 1 absolute badge: the label shows "30° Each", and each gets `rotate-30` with no position change.
- CSS boxes: `rotate: 30deg; translate: 15px -56px` and `-15px 56px`. The middle box gets rotate only. Undo works.
- Engine through HTTP: Tailwind 3 writes `rotate-[15deg]` for 15 and `rotate-45` for 45. Tailwind 4 writes `rotate-15`, `-rotate-30`, and `rotate-[12.5deg]` for 12.5.
- `call-action.ts direct-edit.apply` with 3 rotate and position edits: pass. MCP and agent were skipped because their bindings are `legacy-mcp` and `legacy-agent`. `batch_edit` over MCP on the Tailwind 3 project wrote the same edits.
- Bonaparte `git grep` on `*.tsx`: 120 `rotate-<n>` uses, all v3 steps (180, 90, -90, 0, 45). No form is newly readable.
- Screenshots: `cycle-26/group-rotate/group-drag-{dark,light}.png`.
- Ran `pnpm run typecheck` (0 errors), `pnpm run lint:gate` (pass, 59603 diagnostics against a baseline of 89733) and `pnpm run build:ui` (pass).

## Off-token values

- Tailwind 3: a moved side that is not a v3 spacing step becomes arbitrary, for example `left-[272px]` (68 is not a v3 step). `rotate-[30deg]` is also arbitrary.
- Tailwind 4: the scale is every 4 px, so a snapped side is always a step.

## Left out

- The Rotation field was not typed in through the UI, because the headless driver could not find the field. The same writer was checked through HTTP.
- An existing `translate` on a flow layer in a CSS project is replaced, not added to. The bridge does not send `translate` in the selection styles.
- During the first few ms of a drag, before the class read returns, the preview turns each layer around its own center.
- The selection outlines stay at the old boxes during the drag (this was already the case).
- `.claude/goal/roadmap.md` is not in the worktree, so Appendix A was not updated.
- `transform-style-properties.ts` is outside the pick's owned files. The CSS translate needs it.
