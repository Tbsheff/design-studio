# Cycle 13 pick 3: route-prototype

Branch `feat/route-prototype`. Spec: `cycle-13.md` section 3.

## What works

- **Extended** `project.createPrototype` (tool `create_prototype_project`): new fields `routePath` and `viewport`, both `NullOr` with a `null` decoding default.
- **Starts** the app dev server on demand (waits up to 2 min for `ready`), copies the route with `PageWriter.import` as `index.html`, links `tokens.css`, runs `token.apply` (dryRun false) on the copy, then starts the run with the prompt `Redesign <route>: <prompt>` and a canvas ref to the copy frame.
- **Names** the prototype `Redesign <route>` when `name` is null. The copy is the only frame (the auto entry frame is removed).
- **Fails** with `NotFound` for an unknown route and `BadRequest` for a project that is not an attached app or a dev server that fails.
- **Adds** "Redesign as prototype" to the frame "…" menu in an app project. It opens the prototype dialog titled "Redesign /route".
- **Adds** a "Start from a route" section to the Home + menu for an app workspace, with the static routes (dynamic routes left out).
- **Fixed** `token.apply` on HTML pages: it now sweeps values inside `<style>` blocks, not only `style=` attributes. Without this, the copy kept every color as `rgb()`.

## Checked

- **call-action** `project.createPrototype` with `routePath "/"`: http, mcp and agent all ok (4.9 s, 3.9 s, 3.8 s). Diffs are only ids, paths and timestamps of the 3 new projects. Output: `route-prototype/call-action.txt`.
- **NotFound** for `routePath "/nope"` on all 3 surfaces.
- **Tokens**: the `/caseload` copy has 0 hex and 0 `rgb()` colors left; 55 `var(--…)` refs (foreground, muted-foreground, background, border, muted, primary, radius).
- **App repo**: `git status` in the test app is clean after every run.
- **UI** in dark and light: frame menu, dialog, new prototype after the mock run, Home + menu. Create took 3.8 s.
- **Gates**: `pnpm run typecheck`, `pnpm run lint:gate` (pass, 59671 under baseline) and `pnpm run build:ui` pass.

Test app: `/Volumes/DevProjects/code/ds-wt/route-app` (git repo, Next layout, a stub `next` bin that serves static HTML; no install).

## Left out

- **Right-click menu** entry (`use-preview-menu.tsx` is outside this pick's files).
- **Bonaparte** read-only run (spec verify step 5). Not run.
- **MCP snapshot** diff for the new input fields: approve at merge.
- **Import fidelity**: `page.import` drops `width: calc(...)`, so the copied table is narrower than in the app. That is in `share/page-import`, not this pick.

## Files outside the pick list

- `src/ui/features/canvas/frame-label-extras.tsx`: one prop (`path`) to the more menu.
- `src/server/token-sweep/engine/find.ts`: the `<style>` block fix.
- `src/ui/platform/prototype-route.ts` (new): route store for the dialog and Home.
- `src/server/project-ops/index.ts`, `project-ops/engine/is-route-match.ts` (new).

## Screenshots

`route-prototype/{dark,light}-frame-menu.png`, `-dialog.png`, `-prototype.png`, `-home-plus.png`.
