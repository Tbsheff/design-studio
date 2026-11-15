# polish-43 (cycle 43, pick 1)

Branch `feat/polish-43`, cut from `cd8f2558c`. Dev run: `STUDIO_AGENT=mock`, `STUDIO_DATA_DIR=ds-wt/polish-43-data`, port 4610, 127.0.0.1 only. No real-model run.

## Shipped

| Item | Result |
|---|---|
| next/font write | Works. A Google font pick in a Next app adds the import, the `const` and `${x.variable}` to the layout, and the element gets the variable. 1 version, 1 undo for both files. |
| Google Fonts group in a Next app | Works. `list_font` returns `catalog` rows when an `app/layout` or `src/app/layout` file exists. |
| 1-token commit | Works. Pointer up saves only the dragged token. Other pending tokens stay pending. |
| Alias kept | Works. Open and close: no write. Drag: "Detached from …", then 1 literal write. Escape mid-drag: the alias stays, no write. |
| Rename title | Works. A name-only batch is "Rename 1 layer" or "Rename N layers". |
| Agent share approval | Works. The agent tool route asks the approval queue. Allow gives the link. Deny gives the deny text. |

## Proof (main, then branch)

- Share on main: the agent leg failed with "this caller has no approval prompt". On the branch, http, mcp and agent each return a link. The diffs are per-call values only (id, token, times). The mcp and agent legs each showed 1 card. The http leg showed none. Output: `polish-43/share-create-call.txt` (tokens redacted, all 14 test links revoked).
- Deny on the agent leg: "The user denied this action in Design Studio. Do not run it again; ask the user." (`polish-43/share-deny.txt`).
- LAN stayed off: `server.lan: false` in every create result. No `PUT /api/shares/lan` call. No `GET /api/shares/lan` route exists, so the create output is the record.
- Rename on main: 3 layers gave "Edit text of 3 elements". On the branch: 12 layers gave "Rename 12 layers", 3 gave "Rename 3 layers", 1 gave "Rename 1 layer". A 2-element padding batch keeps "Edit 2 elements: padding-top".
- Token scope: the spec's proof was read from code (`toChanges(pendingRef.current)` sends all pending). Branch, `p43-token`: `--accent` typed (pending), `--overlay` dragged and released. Versions: "Update tokens: --overlay" only. `--accent` still shows "1 change".
- Alias (`--ring: {color.brand}`): open and close gave no version. A drag showed "Detached from color.brand" and wrote 1 literal version. Escape mid-drag kept `{color.brand}`, with no write and no pending change.
- next/font on `p43-font` (APFS clone of `ac-next-b`):
  - HTTP edit of the `h1`: 1 version with `app/crew/page.tsx` and `app/layout.tsx`. The class is `font-(family-name:--font-fraunces)` (Tailwind 4).
  - A second pick on a `span`: 1 file only, no second import.
  - Undo: 1 undo restores both files. The tree is clean after.
  - MCP `edit_element` (path `crew`, selector `h1`): 1 version, the same 2 files. The Next dev server rendered the `fraunces_…__variable` class on `<body>`.
  - Batch (2 elements, Playfair Display): 1 version, 2 files, `Playfair_Display` import, `--font-playfair-display`.
  - UI pick: typing "Fraunces" + Enter in the Font field gave 1 version with `app/layout.tsx` and `components/ui/card.tsx`.
  - Layout with `className={cn(...)}`: 422 with the spec text. No file is written.
  - Engine probe on the Bonaparte `apps/dashboard/app/layout.tsx` text (read with `git show`, Bonaparte is not touched): only `${fraunces.variable} ` is added inside the backticks. The rest of the className is the same (`polish-43/next-font-probe.txt`).
- `call-action.ts font.list` on `p43-font`: pass, 3 surfaces, 0 diffs, `catalog` rows (`polish-43/font-list-call.txt`).
- Screenshots: `polish-43/font-list-{light,dark}.png`, `polish-43/alias-linked-{light,dark}.png`, `polish-43/alias-detached-{light,dark}.png`.

## Gates

- `pnpm run typecheck`: pass.
- `pnpm run lint:gate`: pass, 59,577 diagnostics (baseline 89,733).
- `pnpm run build:ui`: pass.
- `check-bundle`: pass. B1 is 274,673 B, delta 0 B. Home chunks: main, preload-helper, react, desktop, use-latest, focus, find-element, live-store, telemetry, api-telemetry, api-core, http, json-guard, query, pick, storage, ui-select-model, pick, router, index, global-commands, command-disabled, copy, app-events, project-nav, screen-preload, registry, keys, api-error, prototype-dialog, typing-target.
- `check-actions --probes`: 557 hits on the branch and 557 on main (both fail at baseline 407, the items left for Tyler). Probes pass.
- No new action, no generated file change, no snapshot change. Tool names, inputs and descriptions did not change.

## Differences from the spec

- The element value is `var(--font-x, <fallback>)`, not `var(--font-x), <fallback>`. The Tailwind class namer reads a variable only in the form `var(--x)` or `var(--x, fb)`. So this one form gives `font-(family-name:--font-x)` in Tailwind 4 and valid CSS in plain style.
- The `next/font` call sets `weight`. It is `["400", "700"]` for catalog fonts with bold, and `"400"` for single-weight fonts. Fonts that are not variable (Lato, Poppins, Space Mono) fail in `next/font` without it.
- The layout lookup walks up from the edited file to the nearest `app/layout.*` or `src/app/layout.*`. So in a monorepo it finds `apps/dashboard/app/layout.tsx`.
- If the layout already imports the family but not with our `--font-x` variable (Bonaparte `Inter` uses `.className`), the element keeps the literal family and the layout does not change. Otherwise the pick would point at a variable that does not exist.
- The `class_in_code` refusal uses the existing error code `attribute_not_literal`, because `DirectEditErrorCode` is a closed union. A layout with no `<html>` or `<body>` uses `element_not_found`.
- The alias row says "Linked to color.brand" for a `{color.brand}` alias, and "Linked to --x" for a `var(--x)` alias. It shows the alias text as the token file has it.
- The popup has to render the row, so 3 inspector files got 1 prop each (`header: ReactNode | null`). No other pick owns them.
- The approval feed hides pending cards while MCP edits are off. `call-action` turns edits off again after its MCP leg, so the agent card could not be seen. For the check, I turned MCP on with edits before `call-action` and off after. This affects only the mock-mode agent tool route.

## Files outside the pick's list (no other pick owns them)

- `src/ui/features/inspector/color-popup.tsx`, `color-picker-popup.tsx`, `color-swatch.tsx` (the `header` prop).
- `src/ui/features/versions-layers-tokens/token-inputs.tsx`, `token-value-editor.tsx`, `token-dark-slot.tsx` (the token path for `commitOne`).
- `src/ui/styles/tokens-panel.css` (`.tkp-alias-row`, in an existing CSS file).
- New `src/server/mcp/queue-ask.ts` (the adapter), new `src/ui/features/versions-layers-tokens/alias-row.tsx`.
- `src/server/mcp/index.ts` got 3 export changes (`runGatedAgentTool`, `toQueueAsk`, `ApprovalQueue` type), not 1.

Roadmap not in worktree. New files for Appendix A: `src/server/direct-edit/engine/next-font-import.ts`, `src/server/direct-edit/commit/next-font-plan.ts`, `src/server/mcp/queue-ask.ts`, `src/ui/features/versions-layers-tokens/alias-row.tsx`.

## Left out

- The "1 Cmd+Z after the drag restores `--overlay` only" check was not run in the UI. The version holds only `--overlay`, so an undo can change only that token.
- The F2 rename was proved over HTTP (`rename_layer` route), not with F2 in the UI.
- The spec's `p43-share` frame count (4 `frameUrls`) does not apply: the fixture page has no frames, so `frameUrls` is `[]` on all 3 legs.
