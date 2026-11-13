# Cycle 15 pick 1: app-tokens

Branch `feat/app-tokens-2`. A prototype made beside an app now uses the app tokens in the studio, and one Refresh copies them again.

## What changed

- **Gate:** `isAppPrototype` (`design-system/app-tokens/source.ts`) is true for a `created: true` project with `appProjectId`. `usesAppTokens` now includes it, so the Tokens panel, the inspector token picker, token edits (`set_token` writes the prototype `tokens.css`), MCP `get_design_system`, the agent token context and `preview/token-read.ts` all see the tokens.
- **Read:** a prototype reads its root `tokens.css` directly (`getProjectTokens`), not through the CSS walk. The summary gets `origin` (app name and app file) from the `tokens.css` header.
- **Shared builder:** `toPrototypeTokenCss` (`design-system/app-tokens/prototype-tokens.ts`) builds the CSS for create and for refresh, so a refresh right after create returns 0/0/0. The engine `to-prototype-css.ts` moved from `project-ops/engine` to `design-system/engine`.
- **Subfolder link:** when the linked folder has no token file, `getAppDirTokenFile` (`detect.ts`) checks `components.json` and the known files of that app dir against the workspace root that `findWorkspaceRoot` finds. A path outside the workspace root is still refused (`safeFileInside`).
- **Action `token.import`:** `POST /api/projects/:projectId/d/:directionId/tokens/import`, edit, `project.update`, MCP and agent `import_token` (lean, set `design-system`). Output `{ added, changed, file, removed, sourceFile, tokens, versionId }`. No change gives `versionId: null` and no version. Errors: `BadRequest` (not a prototype), `NotFound` (no app token file), `Conflict`.
- **Writer:** `PrototypeTokenWriter` (`token-sweep/prototype-token-writer.ts`, write) with the Effect task in `token-sweep/import-prototype-tokens.ts`: one version, an edit-history record (Cmd+Z), publish. It lives in `token-sweep`, which already bridges `direct-edit` and `design-system`.
- **UI:** the Tokens panel source line reads "From <app> · <app file> · N tokens" and has a Refresh button. After a refresh it shows "1 changed, 0 added, 0 removed" or "The tokens match the app."

## Checked

- `call-action.ts token.import '{"projectId":"<proto>","directionId":"main"}'`: pass, HTTP, MCP and agent all return 0/0/0, 335 tokens, `sourceFile` `packages/ui/src/styles/globals.css`.
- Linked a `git clone --local` copy of Bonaparte (default app `apps/dashboard`) and made the prototype "A patient intake summary card". The design-system state has 335 entries (124 dark).
- Picked `--color-brand-teal-500` for the h1 text color in the inspector picker: `index.html` got `color: var(--color-brand-teal-500)`.
- Hand-edited `--primary` in the prototype `tokens.css`, then Refresh: "1 changed, 0 added, 0 removed" and the app value came back. Cmd+Z showed "Undid refresh app tokens" and brought the hand value back.
- Linked `apps/dashboard` alone as a folder and made a prototype: `tokensFile` is `packages/ui/src/styles/globals.css`, 335 tokens.
- `token.set` on a new prototype (after Keep): `--primary` light rewrote line 278 (`:root`) and dark rewrote line 423 (`.dark, [data-theme="dark"]`) of the prototype `tokens.css`. The Bonaparte clone stayed clean.
- `token.import` on the workspace project: 400 "This project is not a prototype of an app."
- The Bonaparte clone has no change. The real Bonaparte repo was only read. Its `git status` shows changes that were there before this pick (`apps/dashboard/AGENTS.md` and two `tmp-*.ts` scripts); they are not from this pick.
- `pnpm run typecheck`, `pnpm run lint:gate` (pass, 59685 against 89733) and `pnpm run build:ui` pass. `gen-routes --check` passes.
- Screenshots: `cycle-15/app-tokens/app-tokens-refresh-dark.png`, `app-tokens-refresh-light.png`.

## Left out

- The source line truncates the app file in the narrow panel. The full text is in the accessibility tree, not in the tip.
- The chat agent was not prompted to call `import_token`. The tool is in the derived `design-system` set, and `call-action` ran it through the agent dispatcher.
