# Cycle 14, pick 3: layer undo

Branch `feat/layer-undo`. The change pill's "Undo this change" now undoes only the ringed layer, not the whole hunk.

## What works

- **Adds** `version.restoreChange` (`POST /api/projects/:projectId/d/:directionId/changes/restore`, MCP and agent `restore_change_version`). Input: `projectId`, `directionId`, `versionId`, `file`, `layerId`, `kind`. Output: `{ versionId, file, kind }`. The returned `versionId` is the pending id, the same as `revert_hunk` (P3).
- **Undoes** each kind on its own:
  - `style` puts back the old start tag.
  - `text` puts back the old content.
  - `added` removes the element and its blank line.
  - `removed` puts the old lines back between their old neighbour lines.
- **Fails** with `Conflict` (409, "The layer changed again after this version. Use revert_hunk ...") when the head no longer holds the layer as that version left it.
- **Pill:** the undone ring turns grey and stays visible, and the pill steps to the next open change. Cmd+Z takes the undo back, because the restore records the edit history. On `Conflict` the ring is marked stale, and the button falls back to the hunk undo with its "Undo N changes" label.

## Files

- **Action:** `packages/common/actions/src/version/restore-change.ts` (stamped), and `RestoredChangeSchema` in `version/changes/schema.ts`.
- **Server:**
  - `handlers/version/restore-change.ts` and `live.ts`.
  - `store/change-restore-writer.ts` (`ChangeRestoreWriter`, write) and its Promise sibling `store/change-restore.ts`.
  - Pure engines `store/engine/to-restored-layer.ts` and `store/engine/to-line-map.ts`. The second split was needed to stay under 500 lines.
  - One export line in `store/index.ts`.
- **UI:** `change-pill.tsx`, `change-rings.tsx`, `use-change-rings.ts`, `change-rings-model.ts`, a block in `canvas/copy.ts`, and a rule in `styles/change-rings.css`.

## Checks

- **UI** (mock dev run, HTML page): MCP `batch_edit` changed 3 neighbour layers (h2 color, p text, article padding) in one hunk.
  - Step 2 and "Undo this change" reverted only the p text.
  - Cmd+Z brought the text back.
  - A hand edit of the h2, then undo on it: `Conflict`, and the label changed to "Undo 3 changes".
  - Screenshots: `cycle-14/layer-undo/layer-undo-dark.jpg`, `layer-undo-light.jpg`, `layer-undo-conflict-fallback-light.jpg`.
- **call-action** `version.restoreChange` on one version:
  - HTTP reverted the h2 style.
  - MCP and agent then returned `Conflict` on the same layer, as expected.
  - On fresh versions: the MCP `restore_change_version` call reverted only the p text, and the agent tool route (`/api/agent-tools/restore_change_version`) reverted only the article padding.
- **JSX sample** (`sample.jsx`), over HTTP: `text`, `added`, `removed` and `style` each reverted only their layer. A second `style` call gave 409 `Conflict`.
- **Gates:**
  - `pnpm run typecheck` passes.
  - `pnpm run lint:gate` passes (59672, baseline 89733).
  - `pnpm run build:ui` passes.
  - `check:scripts`: `gen-routes --check` passes. `check-actions` fails (557 hits, baseline 410; `--ops` O11 on `connection.getSetup`), but no hit names a file of this pick.

## Left out

- **No dedicated directions per surface.** call-action runs HTTP, MCP and agent on one input, so the second and third surfaces always see `Conflict`. MCP and agent success was proven on separate fresh versions instead.
- **Removed-layer limits.** A removed layer that shared its lines with other edits (a block with added lines) returns `BadRequest` ("Use revert_hunk").
- **No stale check before the click.** The stale fallback shows after the first `Conflict`, not before.
- **New boundaries warning.** `store/change-restore.ts` imports `direct-edit/commit`, as `store/version-write.ts` already does. This adds one `boundaries(dependencies)` warning, and the gate still passes.
- **MCP snapshot not updated.** `artifacts/mcp-snapshots/*.json` does not have the new `restore_change_version` tool yet. Approve the tool at merge.
