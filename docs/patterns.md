# Code patterns

Copy the golden file for each kind of code. Never copy the first similar file you find. The rules are in [AGENTS.md](../AGENTS.md).

- **Golden file:** the file to copy. When the kind is on main, the golden file is the real file. When it is not on main yet, it is a reference copy in `docs/patterns/golden/` (typecheck and lint skip this folder) and the row names the wave that adds the real file.
- **Template:** the function in `scripts/stamp/templates.ts` or `scripts/stamp/templates-ui.ts` that writes the kind, and the stamp command that calls it. Use the stamp. Copy by hand only a kind with no template.

The first real stamped actions are `studio.health` (`GET /api/health`) and `studio.listSkills` (`GET /api/skills`). Read them first.

| Kind | Golden file | Template |
|---|---|---|
| Action definition | [`src/shared/actions/studio/list-skills.ts`](../src/shared/actions/studio/list-skills.ts), [`src/shared/actions/studio/health.ts`](../src/shared/actions/studio/health.ts) | `actionDefinition` (new:action) |
| Domain payload schemas | [`src/shared/actions/studio/schema.ts`](../src/shared/actions/studio/schema.ts) | `domainSchema` (new:domain) |
| Action handler | [`src/server/handlers/studio/list-skills.ts`](../src/server/handlers/studio/list-skills.ts), [`src/server/handlers/studio/health.ts`](../src/server/handlers/studio/health.ts) | `actionHandler` (new:action) |
| Action preview (`confirm: "user"`) | [`src/server/handlers/publish/publish.ts`](../src/server/handlers/publish/publish.ts), [`src/server/handlers/publish/restore.ts`](../src/server/handlers/publish/restore.ts) | `actionPreview` (new:action) |
| Domain live layer | [`src/server/handlers/studio/live.ts`](../src/server/handlers/studio/live.ts), with services that need services [`src/server/handlers/publish/live.ts`](../src/server/handlers/publish/live.ts) | `domainLive` (new:domain) |
| Read service | [`src/server/store/skill-store.ts`](../src/server/store/skill-store.ts), [`src/server/publish/publish-store.ts`](../src/server/publish/publish-store.ts) | `service` (new:service) |
| Domain service (write) | [`src/server/publish/publications.ts`](../src/server/publish/publications.ts) | `service` (new:service) |
| Domain routes (generated) | [`src/shared/actions/studio/routes.ts`](../src/shared/actions/studio/routes.ts) | none (gen-routes writes it) |
| Domain action list (generated) | [`src/shared/actions/studio/index.ts`](../src/shared/actions/studio/index.ts) | none (gen-routes writes it) |
| Domain handlers (generated) | [`src/server/handlers/studio/handlers.ts`](../src/server/handlers/studio/handlers.ts) | none (gen-routes writes it) |
| Action definition core: `defineAction`, `ActionSpec` and the type checks | [`src/shared/actions/_core/action.ts`](../src/shared/actions/_core/action.ts) | none (hand-written once) |
| Error wire body: `toWire` | [`src/shared/actions/_core/wire.ts`](../src/shared/actions/_core/wire.ts) | none (hand-written once) |
| List page fields: `PageFields`, `pageOf` | [`src/shared/actions/_core/list-page.ts`](../src/shared/actions/_core/list-page.ts) | none (hand-written once) |
| `Permission` union | [`src/shared/actions/_core/permissions.ts`](../src/shared/actions/_core/permissions.ts) | none (hand-written once) |
| Branded ids | [`src/shared/actions/_core/ids.ts`](../src/shared/actions/_core/ids.ts) | none (hand-written once) |
| Error class | [`src/shared/actions/_core/errors/not-found.ts`](../src/shared/actions/_core/errors/not-found.ts), with a payload [`pick-app.ts`](../src/shared/actions/_core/errors/pick-app.ts) | `error` (new:error) |
| Domain status map | [`src/shared/actions/_core/errors/status.ts`](../src/shared/actions/_core/errors/status.ts) | `domainStatus` (new:domain), `errorStatusRow` (new:error inserts one row) |
| Global status map (generated) | [`src/shared/actions/_core/http-status.ts`](../src/shared/actions/_core/http-status.ts) | none (gen-routes writes it) |
| Global error tag union (generated) | [`src/shared/actions/_core/errors/all.ts`](../src/shared/actions/_core/errors/all.ts) | none (gen-routes writes it) |
| Handler types: `Handle`, `Input`, `Entries` | [`src/server/handlers/_core/handler.ts`](../src/server/handlers/_core/handler.ts) | none (hand-written once) |
| Shared action runner | [`src/server/handlers/_core/run-action.ts`](../src/server/handlers/_core/run-action.ts) | none (hand-written once) |
| HTTP adapter mount | [`src/server/http/mount.ts`](../src/server/http/mount.ts) | none (hand-written once) |
| Layer coverage check | [`src/server/main/runtime-check.ts`](../src/server/main/runtime-check.ts) | none (hand-written once) |
| Pure engine | [`pure-engine.ts`](patterns/golden/pure-engine.ts) (real file lands with S5-direct-edit at `src/server/direct-edit/engine/apply-splices.ts`) | none |
| UI action call | [`src/ui/publishApi.ts`](../src/ui/publishApi.ts): `call(routes.<x>, input)` from `src/ui/platform/http.ts` with `WireInput` and `WireOutput` | none |
| UI data hook | [`ui-hook.ts`](patterns/golden/ui-hook.ts) (real file lands with S4c at `src/ui/features/publish/use-publications.ts`) | `uiHook` (new:action `--ui <feature>`) |
| UI feature index | [`ui-feature-index.ts`](patterns/golden/ui-feature-index.ts) (real file lands with S4c) | `uiFeatureIndex` (new:feature, new:domain `--ui`) |
| UI copy | [`ui-copy.ts`](patterns/golden/ui-copy.ts) (real file lands with S4c) | `uiCopy` (new:feature, new:domain `--ui`) |
| UI component | [`ui-component.tsx`](patterns/golden/ui-component.tsx) (real file lands with S4c) | `uiComponent` (new:feature, new:domain `--ui`) |
| UI model | none on main yet; the stamp writes it | `uiModel` (new:feature) |
| Tenant repo query | [`tenant-query.ts`](patterns/golden/tenant-query.ts) (real file lands with Auth S1 at `cloud/api/src/tenant/repos/projects.ts`) | none |
