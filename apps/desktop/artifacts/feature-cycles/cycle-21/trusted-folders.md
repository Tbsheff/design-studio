# Cycle 21 pick 3: trusted folders

Branch `feat/trusted-folders`.

## Built

- **Connect AI row.** "Trusted folders" under Allow edits, closed by default, with the count. Open: one row per saved folder with ×, one row per env folder with the tag "From STUDIO_MCP_TRUSTED_FOLDERS" and no ×, and "Add folder…" (native picker in Electron, a path field in the browser). Files: `connect-trusted-{row,list,folder,add}.tsx`, `use-trusted-folders.ts`, `trusted-folders-model.ts`, `trustedCopy` in `copy.ts`, `setTrustedFolders` in `use-connect-ai.ts`, CSS in `styles/connect-ai.css`.
- **"Always allow this folder"** on the MCP approval card for `create_design_system` with an untrusted `folderPath`. It re-reads `connection.getSetup`, adds the folder to the saved list, then allows the card. Files: `chat/mcp-approval-actions.tsx` (new, split out of `mcp-approval.tsx`), `use-mcp-approval.ts`, `mcp-model.ts`, one key in `chat/copy.ts`.
- **`folder` on the approval wire.** `McpApprovalSchema.folder: NullOr(String)`, optional `folder` on `ApprovalCardSchema` and `ApprovalAsk`, set only by `toDraftCard` (`toUntrustedFolder` in `library-draft-input.ts`). `McpApprovalRecord` in `contracts.ts` gets `folder`; the file does not grow (one SSE union member folded to one line).

## Headless

No new action. `connection.setStatus` and `connection.getSetup` stay `mcp: off "secret"`, `agent: off "secret"`, so no agent can trust its own folder. The approval list is app-only (`stream` / `run-control`), not in an MCP snapshot.

## Checked

- `call-action.ts`: `connection.setStatus` (trustedFolders), `connection.getSetup` (saved and env lists), `connection.listApprovals` (card carries `folder`), `connection.setApproval` (deny). HTTP pass; MCP and agent skipped by design.
- Raw JSON-RPC client, `create_design_system` from a `git clone --local` copy of Bonaparte under `ds-wt/`: card shows with the new button; click: import runs, folder saved. Second import: no card, 186 ms. Remove the folder with ×: the card shows again (denied to clean up).
- Path field: a missing folder shows the server error inline.
- Bonaparte `git status --short` is the same before and after.
- `pnpm run typecheck`, `pnpm run lint:gate` (pass), `pnpm run build:ui`, `gen-routes --check`.
- Screenshots: `cycle-21/trusted-folders/{trusted-row,approval-card}-{dark,light}.jpg`.

## Left out

- **Starter Geist fonts.** The first import response still lists Geist in `pack.fonts` while the scan runs. `FontsSchema` in `pack-manifest.ts` needs `display` and `body`, so an empty `fonts` needs a manifest schema change. Left out, as the spec allows.
- `permission-actions.tsx` is not changed: it serves agent permission prompts, not MCP approval cards.
- The native picker path was not clicked (browser run; Electron not started).
