# Cycle 23 pick 5: text-lists

Branch `feat/text-lists`. No new action.

## What works

- Text section has a "List" row: None, Bullets, Numbers and an Inside toggle. It shows for `ul`, `ol` and `li` layers and for layers with a `list-disc`, `list-decimal`, `list-none`, `list-inside` or `list-outside` class. A `p` shows no row.
- Tailwind project: Bullets writes `list-disc`, Numbers `list-decimal`, None `list-none`. Inside swaps `list-outside` and `list-inside`. Each click is one `direct-edit` call, so one Cmd+Z step.
- CSS project: Bullets writes `list-style-type: disc` (inline style, the same path as the Wrap row).
- `edit_element`, `batch_edit`, the agent direct tools and `set_state_style` take `list-style-type` and `list-style-position`, through the new `contracts/src/text-format-properties.ts`. A style edit writes the list class, not an arbitrary class.

## Checked

- UI, Tailwind HTML project (`@tailwindcss/browser`), `ul` selected: None shows; Bullets gives `list-disc` and computed `disc`; Numbers `list-decimal`; Inside `list-decimal list-inside`; Cmd+Z twice goes back to `list-decimal`, then `list-disc`, and the row follows.
- UI, `li` selected: the row shows the inherited value, is disabled, and says "Edit the list layer". `p` selected: no row.
- UI, CSS project: Bullets writes `style="list-style-type: disc;"`; Cmd+Z restores `none`.
- MCP `edit_element` `{ "list-style-type": "disc", "list-style-position": "inside" }` on the `ul`: `list-disc list-inside`; then `decimal` and `outside`: `list-decimal list-outside`.
- `call-action.ts direct-edit.apply` with `style: { "list-style-type": "decimal" }`: adds `list-decimal`, removes `list-disc`. Pass. MCP and agent bindings of this action are `legacy-*` off, so 1 surface ran.
- Bonaparte, read-only, grep of `.ts` and `.tsx` (111 files): `list-disc` 86, `list-none` 44, `list-decimal` 24, `list-inside` 15, `list-outside` 6. The engine classifies each into the 2 new groups (also with a `md:` prefix). `git status --short` is unchanged.
- `pnpm run typecheck`, `pnpm run lint:gate` (pass, 59605 diagnostics) and `pnpm run build:ui` pass. `gen-routes --check` passes.
- Screenshots: `cycle-23/text-lists/tailwind-ul-{dark,light}.png` (Bullets), `tailwind-ul-none-dark.png`, `tailwind-p-dark.png` (no row), `css-light.png`.

## Files outside the pick list

- `src/server/direct-edit/engine/tailwind/classes.ts` (pick 1 owns it): the `SingleGroup` union needs the 2 new groups. Net 0 lines: `| "text-wrap"` became `| KeywordGroup` (declared in `keyword-groups.ts`), one type import was added, and `function single` became a 2-line arrow const.
- `src/server/direct-edit/engine/tailwind/keyword-classes.ts`: value to class entries (`disc` to `list-disc`, and so on). Without them a style edit writes `[list-style-type:disc]`.
- `src/bridge/element-info.ts`: 2 `STYLE_KEYS` lines after `text-transform`, as `text-wrap` did. Without them the row cannot read the computed value in CSS projects or on an `li`.
- `src/ui/styles/inspector-edit.css`: the 2 Wrap row selectors also match `.ins-text-list`.
- `map.ts` shrinks by 19 lines: `flexToken` moved to the new `tailwind/flex-token.ts` as `toFlexToken`.

## Merge notes

- `packages/common/contracts/package.json` gains the `./text-format-properties` export (written by gen-routes).
- `DIRECT_STYLE_PROPERTIES` feeds the MCP input schemas (`edit_element`, `batch_edit`, `set_state_style`, `set_breakpoint_style`). Their `artifacts/mcp-snapshots` diffs gain the 2 properties. Approve at merge.
- `classes.ts` conflicts with pick 1 only if pick 1 edits the `SingleGroup` union or `single`.

## Left out

- On an `li`, the row does not edit the parent list. The selection carries no source location for the parent (`ancestors` and `path` are labels only), so the row is always read-only on an `li`, with the note "Edit the list layer". Adding a parent source to the bridge selection is the next step.
- Bonaparte was not opened in a running app; the engine was checked on its real classes.
- The chat agent path was not run (the mock agent edits a fixed `h1`); it takes the same `DIRECT_STYLE_PROPERTIES` schema.
- Types other than disc, decimal and none (for example `square`) show no current choice and write an arbitrary class over MCP.
