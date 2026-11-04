# Code patterns

Copy the golden file for each kind of code. Never copy the first similar file you find. The rules are in [AGENTS.md](../AGENTS.md).

- **Golden file:** the file to copy. When the kind is on main, the golden file is the real file. When it is not on main yet, it is a reference copy in `docs/patterns/golden/` (typecheck and lint skip this folder) and the row names the wave that adds the real file.
- **Template:** the function in `apps/desktop/scripts/stamp/templates.ts` or `apps/desktop/scripts/stamp/templates-ui.ts` that writes the kind, and the stamp command that calls it. Use the stamp. Copy by hand only a kind with no template.

The first real stamped actions are `studio.health` (`GET /api/health`) and `studio.listSkills` (`GET /api/skills`). Read them first.

| Kind | Golden file | Template |
|---|---|---|
| Action definition | [`packages/common/actions/src/studio/list-skills.ts`](../packages/common/actions/src/studio/list-skills.ts), [`packages/common/actions/src/studio/health.ts`](../packages/common/actions/src/studio/health.ts) | `actionDefinition` (new:action) |
| Domain payload schemas | [`packages/common/actions/src/studio/schema.ts`](../packages/common/actions/src/studio/schema.ts) | `domainSchema` (new:domain) |
| Action handler | [`apps/desktop/src/server/handlers/studio/list-skills.ts`](../apps/desktop/src/server/handlers/studio/list-skills.ts), [`apps/desktop/src/server/handlers/studio/health.ts`](../apps/desktop/src/server/handlers/studio/health.ts) | `actionHandler` (new:action) |
| Action preview (`confirm: "user"`) | [`apps/desktop/src/server/handlers/publish/publish.ts`](../apps/desktop/src/server/handlers/publish/publish.ts), [`apps/desktop/src/server/handlers/publish/restore.ts`](../apps/desktop/src/server/handlers/publish/restore.ts) | `actionPreview` (new:action) |
| Domain live layer | [`apps/desktop/src/server/handlers/studio/live.ts`](../apps/desktop/src/server/handlers/studio/live.ts), with services that need services [`apps/desktop/src/server/handlers/publish/live.ts`](../apps/desktop/src/server/handlers/publish/live.ts) | `domainLive` (new:domain) |
| Read service | [`apps/desktop/src/server/store/skill-store.ts`](../apps/desktop/src/server/store/skill-store.ts), [`apps/desktop/src/server/publish/publish-store.ts`](../apps/desktop/src/server/publish/publish-store.ts) | `service` (new:service) |
| Domain service (write) | [`apps/desktop/src/server/publish/publish-service.ts`](../apps/desktop/src/server/publish/publish-service.ts) | `service` (new:service) |
| Domain routes (generated) | [`packages/common/actions/src/studio/routes.ts`](../packages/common/actions/src/studio/routes.ts) | none (gen-routes writes it) |
| Domain action list (generated) | [`packages/common/actions/src/studio/index.ts`](../packages/common/actions/src/studio/index.ts) | none (gen-routes writes it) |
| Domain handlers (generated) | [`apps/desktop/src/server/handlers/studio/handlers.ts`](../apps/desktop/src/server/handlers/studio/handlers.ts) | none (gen-routes writes it) |
| Action definition core: `defineAction`, `ActionSpec` and the type checks | [`packages/common/actions/src/_core/action.ts`](../packages/common/actions/src/_core/action.ts) | none (hand-written once) |
| Error wire body: `toWire` | [`packages/common/actions/src/_core/wire.ts`](../packages/common/actions/src/_core/wire.ts) | none (hand-written once) |
| List page fields: `PageFields`, `pageOf` | [`packages/common/actions/src/_core/list-page.ts`](../packages/common/actions/src/_core/list-page.ts) | none (hand-written once) |
| `Permission` union | [`packages/common/actions/src/_core/permissions.ts`](../packages/common/actions/src/_core/permissions.ts) | none (hand-written once) |
| Branded ids | [`packages/common/actions/src/_core/ids.ts`](../packages/common/actions/src/_core/ids.ts) | none (hand-written once) |
| Error class | [`packages/common/actions/src/_core/errors/not-found.ts`](../packages/common/actions/src/_core/errors/not-found.ts), with a payload [`pick-app.ts`](../packages/common/actions/src/_core/errors/pick-app.ts) | `error` (new:error) |
| Domain status map | [`packages/common/actions/src/_core/errors/status.ts`](../packages/common/actions/src/_core/errors/status.ts) | `domainStatus` (new:domain), `errorStatusRow` (new:error inserts one row) |
| Global status map (generated) | [`packages/common/actions/src/_core/http-status.ts`](../packages/common/actions/src/_core/http-status.ts) | none (gen-routes writes it) |
| Global error tag union (generated) | [`packages/common/actions/src/_core/errors/all.ts`](../packages/common/actions/src/_core/errors/all.ts) | none (gen-routes writes it) |
| Handler types: `Handle`, `Input`, `Entries` | [`apps/desktop/src/server/handlers/_core/handler.ts`](../apps/desktop/src/server/handlers/_core/handler.ts) | none (hand-written once) |
| Shared action runner | [`apps/desktop/src/server/handlers/_core/run-action.ts`](../apps/desktop/src/server/handlers/_core/run-action.ts) | none (hand-written once) |
| HTTP adapter mount | [`apps/desktop/src/server/http/mount.ts`](../apps/desktop/src/server/http/mount.ts) | none (hand-written once) |
| Layer coverage check | [`apps/desktop/src/server/main/runtime-check.ts`](../apps/desktop/src/server/main/runtime-check.ts) | none (hand-written once) |
| Pure engine | [`pure-engine.ts`](patterns/golden/pure-engine.ts) (real file lands with S5-direct-edit at `apps/desktop/src/server/direct-edit/engine/apply-splices.ts`) | none |
| UI action call | [`apps/desktop/src/ui/platform/pack-api.ts`](../apps/desktop/src/ui/platform/pack-api.ts): `call(routes.<x>, input)` from `apps/desktop/src/ui/platform/http.ts` with `WireInput` and `WireOutput` | none |
| UI data hook | [`ui-hook.ts`](patterns/golden/ui-hook.ts) (real file lands with S4c at `apps/desktop/src/ui/features/publish/use-publications.ts`) | `uiHook` (new:action `--ui <feature>`) |
| UI feature index | [`ui-feature-index.ts`](patterns/golden/ui-feature-index.ts) (real file lands with S4c) | `uiFeatureIndex` (new:feature, new:domain `--ui`) |
| UI copy | [`ui-copy.ts`](patterns/golden/ui-copy.ts) (real file lands with S4c) | `uiCopy` (new:feature, new:domain `--ui`) |
| UI component | [`ui-component.tsx`](patterns/golden/ui-component.tsx) (real file lands with S4c) | `uiComponent` (new:feature, new:domain `--ui`) |
| UI model | none on main yet; the stamp writes it | `uiModel` (new:feature) |
| Tenant repo query | [`tenant-query.ts`](patterns/golden/tenant-query.ts) (real file lands with Auth S1 at `apps/api/src/tenant/repos/projects.ts`) | none |
