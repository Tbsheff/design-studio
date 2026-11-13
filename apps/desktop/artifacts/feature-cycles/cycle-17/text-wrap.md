# Cycle 17 pick 5: text-wrap

Branch `feat/text-wrap`. No new action.

## What works

- Inspector text section has a "Wrap" row: Default, Balance, Pretty, No wrap. It reads the computed `text-wrap` first and falls back to the classes, so a `text-pretty` paragraph shows Pretty.
- Tailwind project: a click writes `text-balance`, `text-pretty` or `text-nowrap` and removes the other wrap classes. Default removes all of them. Each click is one `direct-edit` call, so one Cmd+Z step.
- CSS project: a click writes one `text-wrap` value (inline style, the same path as the Numbers row).
- MCP `edit_element`, `batch_edit` and the agent: a style edit of `text-wrap: pretty` now writes `text-pretty`, not `[text-wrap:pretty]`. It also replaces an old `text-balance`, because the 4 classes are now one Tailwind group.

## Checked

- `call-action.ts direct-edit.apply` with `style: {"text-wrap": "balance"}` on a `text-pretty` paragraph: add `text-balance`, remove `text-pretty`. Pass. (MCP and agent bindings of this action are `legacy-*` off.)
- MCP `edit_element` with `text-wrap: pretty` on a Tailwind page: the source has `text-pretty`.
- UI (playwright, Tailwind project with `@tailwindcss/browser`): Pretty shows on load; Balance writes `text-balance` and the frame computes `balance`; Cmd+Z restores `text-pretty` and the row shows Pretty; Default removes the class; No wrap writes `text-nowrap`.
- UI (CSS project): Balance writes `style="text-wrap: balance;"`; Cmd+Z removes it.
- `pnpm run typecheck`, `pnpm run lint:gate` (pass, 59661 diagnostics) and `pnpm run build:ui` pass.
- Screenshots: `cycle-17/text-wrap/tailwind-Pretty-dark.png`, `tailwind-Balance-light.png`, `css-Pretty-dark.png`, `css-pretty-light.png`.

## Files outside the pick list

- `packages/common/contracts/src/contracts.ts` and `src/bridge/element-info.ts`: one `text-wrap` line each, as the Numbers row did. Without them the inspector never sees the computed value. Pick 3 may also touch `contracts.ts`; both are one-line list appends.
- `src/server/direct-edit/engine/tailwind/classes.ts`: a `text-wrap` group, so the 4 classes replace each other. `map.ts` and `classes.ts` are over 500 lines (`studio/no-file-growth`), so the keyword tables moved to new files `keyword-classes.ts` and `keyword-groups.ts`.
- `src/ui/features/inspector/text-grid.tsx`: the mount line. The sibling rows mount there, not in `text-section.tsx`.
- `src/ui/styles/inspector-edit.css`: one block, so the 4 labels fit the row.

## Merge notes

- `DIRECT_STYLE_PROPERTIES` feeds the MCP input schemas (`edit_element`, `batch_edit`, `set_breakpoint_style`, state style). Their `artifacts/mcp-snapshots` diffs gain `text-wrap`. Approve at merge.

## Left out

- Bonaparte check on a `git clone --local` copy. The Tailwind check used an HTML project with the Tailwind v4 browser build, which runs the same class engine.
- Copy and paste style (`style-scope/layer-style/engine/groups.ts`) does not map the new `text-wrap` group yet, so a pasted style does not carry Balance or Pretty.
- The inspector class list (`useElementClasses`) still refreshes only on save, not on Cmd+Z. The Wrap row reads the computed value first, so it shows the right state after undo; the Numbers and Truncate rows read the class list first and can show the old state (not checked).
