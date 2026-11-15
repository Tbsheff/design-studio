# Cycle 41, pick 4: font-web

## Result

- Added `packages/common/contracts/src/google-fonts.ts`: 40 Google Fonts families with fallback stacks, `toGoogleFontsHref`, `toMergedHref` and `hasLinkFamily` (pure). `gen-routes` wrote its `exports` entry.
- Added `"catalog"` to `FONT_SOURCES` and its annotation. Changed the `list_font` description.
- Changed `to-font-rows.ts`: in an HTML prototype (`kind: "html"`, no app, no next/font), the catalog rows come after the project rows and before the system rows. A family that the page loads stays in "In this project" only. Max 200 rows.
- Added `direct-edit/commit/google-font-link.ts`. `edit-plan.ts` and `batch.ts` call it after `patchSource`. When an `.html` target gets a catalog `font-family`, it adds the family to the existing css2 link, or adds 1 link before `</head>`. Same file, so 1 version and 1 Cmd+Z.
- Added `bridge/font-preview.ts`. It handles the new `font-preview` message, adds 1 `<link data-studio-font-preview>` (it replaces the last one), and posts `font-status` after the load, or after 3 s.
- Changed the inspector font list. It now has a "Google Fonts" group. Up and Down show the preview link, and Escape and blur remove it. Enter keeps the link until the frame reloads. A row that does not load shows the tip "This font did not load. Check the network."

## Checks

- Passed: `call-action.ts font.list` on `fw-seed`, `fw-link` and `fw-next`, with 0 diffs (`font-web/call-*.txt`). `fw-seed` has 40 catalog rows, `fw-link` has 39 (DM Sans is in the project group), and `fw-next` has 0.
- Works in the app (headless Chrome against the dev server):
  - On `fw-seed`, type "fra" and press Down. The canvas shows Fraunces with 1 preview link, and the source does not change.
  - Press Escape: the link is gone, and the file does not change.
  - Press Enter: 1 version ("Edit h1: font-family") with the link and the h1 stack. The canvas still shows Fraunces.
  - Press Cmd+Z: the file goes back to the seed.
- Works on `fw-link`: Fraunces merges into the 1 link (`family=DM+Sans...&family=Fraunces...`). Undo restores it.
- Works when Google Fonts is blocked: the row tip shows after 3 s (`font-fail-fw-seed-dark.png`).
- Works over MCP: `edit_element` with a Playfair Display stack and `batch_edit` with Lora and Inter both add the families to 1 link (`mcp-*.txt`).
- Saved screenshots: `font-groups-fw-link-{dark,light}.png` and `font-list-fw-seed-{dark,light}.png`.
- Passed: `typecheck`, `typecheck:tsrs`, `lint:gate` (59588, baseline 89733), `build:ui`, `check-bundle` (B1 274,703 B, delta 0) and `gen-routes --check`.
- Unchanged: `check-actions` at 557 hits, the same as main. `--probes` passes.
- `check-bridge-guards.ts` is a stub. It prints "no bridge router yet", so it proves nothing.
- Did no real-model run.

## Differences from the spec

- Put the message types in `contracts/src/contracts.ts` (`ParentToBridge` `font-preview`, `BridgeToParent` `font-status`), not in `bridge-protocol.ts` or `bridge-types.ts`. The bridge handlers derive from these unions, and `bridge-protocol.ts` holds only the boot messages.
- The UI sends only the family name. The bridge builds the href from the catalog, so the catalog stays out of the UI bundle.
- Fixed a bug from before this pick: `inspector-props.css` loaded only with the component panel. In an HTML prototype the font popup had no position and no max height. `font-field.tsx` now lazy-loads the popup together with that CSS.
- The link uses `wght@400;700` for families that have both weights. The 4 one-weight families get no axis.
- The text in `copy.ts` grew by 3 lines (479 to 482).

## Files outside the pick list

- `apps/desktop/src/server/design-system/font-list/font-list-run.ts`: sets `isHtmlPrototype`.
- `apps/desktop/src/server/direct-edit/commit/batch.ts`: runs the link step once per file group. The batch patches from `group.original` and does not use the plan code.
- `apps/desktop/src/bridge/message-handlers.ts`: 1 handler line.
- `packages/common/contracts/src/contracts.ts`: 2 message types.
- `apps/desktop/src/ui/features/inspector/{direct-edit-model.ts,use-direct-edit.ts,use-direct-edits.ts}`: added `port` to `DirectEdit`, so the font field can post and listen.
- `apps/desktop/src/ui/features/inspector/{font-field.tsx,font-list-row.tsx}` and the new `use-font-preview.ts`.

## Snapshots

- Unchanged: no file in `artifacts/mcp-snapshots`. `list_font` is in no snapshot. The `edit_element` description did not change.

## Left out

- A `next/font` write for apps (runner-up 4).
- A catalog fetch from Google.
- A typed family name in a Next app previews with no link. That is correct, because the app does not load it.
