# Code patterns

Copy the golden file for each kind of code. Never copy the first similar file you find. The rules are in [AGENTS.md](../AGENTS.md).

- **Golden file:** a reference copy in `docs/patterns/golden/`. Typecheck and lint skip this folder. Each file was typechecked at its target path.
- **Target path:** where the real file lives. After the named wave lands, the real file is the golden file. `not yet on main` names the wave that adds the file.
- **Template:** the function in `scripts/stamp/templates.ts` that writes the kind. The templates and the stamp commands land with S4s. Until then, copy the golden file by hand.

| Kind | Golden file | Target path | Template |
|---|---|---|---|
| Action definition core: `defineAction`, `ActionSpec` and the type checks | [`action-core.ts`](patterns/golden/action-core.ts) | `src/shared/actions/_core/action.ts` (not yet on main, lands with S4b) | none (hand-written once) |
| Error wire body: `toWire` | [`wire.ts`](patterns/golden/wire.ts) | `src/shared/actions/_core/wire.ts` (not yet on main, lands with S4b) | none (hand-written once) |
| List page fields: `PageFields`, `pageOf` | [`list-page.ts`](patterns/golden/list-page.ts) | `src/shared/actions/_core/list-page.ts` (not yet on main, lands with S4b) | none (hand-written once) |
| `Permission` union | [`permissions.ts`](patterns/golden/permissions.ts) | `src/shared/actions/_core/permissions.ts` (not yet on main, lands with S4b) | none (hand-written once) |
| Error class | [`error.ts`](patterns/golden/error.ts) | `src/shared/actions/publish/errors/cf-failed.ts` (not yet on main, lands with S4c) | `error` (new:error) |
| Global status map (generated) | [`http-status.generated.ts`](patterns/golden/http-status.generated.ts) | `src/shared/actions/_core/http-status.ts` (not yet on main, lands with S4a) | none (gen-routes writes it) |
| Context status map | [`error-status.ts`](patterns/golden/error-status.ts) | `src/shared/actions/publish/errors/status.ts` (not yet on main, lands with S4c) | `error` (new:error inserts one row) |
| Global error tag union (generated) | [`errors-all.generated.ts`](patterns/golden/errors-all.generated.ts) | `src/shared/actions/_core/errors/all.ts` (not yet on main, lands with S4a) | none (gen-routes writes it) |
| Branded ids | [`ids.ts`](patterns/golden/ids.ts) | `src/shared/actions/_core/ids.ts` (not yet on main, lands with S4b) | none (hand-written once) |
| Context payload schemas | [`schema.ts`](patterns/golden/schema.ts) | `src/shared/actions/publish/schema.ts` (not yet on main, lands with S4c) | `ctxSchema` (new:context) |
| Action definition | [`action-definition.ts`](patterns/golden/action-definition.ts) | `src/shared/actions/publish/unpublish.ts` (not yet on main, lands with S4c) | `actionDefinition` (new:action) |
| Context routes (generated) | [`routes.generated.ts`](patterns/golden/routes.generated.ts) | `src/shared/actions/publish/routes.ts` (on main as an empty generated stub, filled by S4c) | none (gen-routes writes it) |
| Handler types: `Handle`, `Input`, `Entries` | [`handler-types.ts`](patterns/golden/handler-types.ts) | `src/server/handlers/_core/handler.ts` (not yet on main, lands with S4b) | none (hand-written once) |
| Shared action runner | [`run-action.ts`](patterns/golden/run-action.ts) | `src/server/handlers/_core/run-action.ts` (not yet on main, lands with S4b) | none (hand-written once) |
| Domain service | [`service.ts`](patterns/golden/service.ts) | `src/server/publish/publications.ts` (not yet on main, lands with S4c) | `service` (new:service) |
| Action handler | [`action-handler.ts`](patterns/golden/action-handler.ts) | `src/server/handlers/publish/unpublish.ts` (not yet on main, lands with S4c) | `actionHandler` (new:action) |
| Context handlers (generated) | [`handlers.generated.ts`](patterns/golden/handlers.generated.ts) | `src/server/handlers/publish/handlers.ts` (on main as an empty generated stub, filled by S4c) | none (gen-routes writes it) |
| HTTP adapter mount | [`adapter-mount.ts`](patterns/golden/adapter-mount.ts) | `src/server/http/mount.ts` (not yet on main, lands with S4b) | none (hand-written once) |
| Layer coverage check | [`runtime-check.ts`](patterns/golden/runtime-check.ts) | `src/server/main/runtime-check.ts` (not yet on main, lands with S4b) | none (hand-written once) |
| Pure engine | [`pure-engine.ts`](patterns/golden/pure-engine.ts) | `src/server/direct-edit/engine/apply-splices.ts` (not yet on main, lands with S5-direct-edit) | none |
| UI data hook | [`ui-hook.ts`](patterns/golden/ui-hook.ts) | `src/ui/features/publish/use-publications.ts` (not yet on main, lands with S4c) | `uiHook` (new:op `--ui`) |
| UI copy | [`ui-copy.ts`](patterns/golden/ui-copy.ts) | `src/ui/features/publish/copy.ts` (not yet on main, lands with S4c) | `uiCopy` (new:feature) |
| UI component | [`ui-component.tsx`](patterns/golden/ui-component.tsx) | `src/ui/features/publish/publication-list.tsx` (not yet on main, lands with S4c) | `uiComponent` (new:feature) |
| UI feature index | [`ui-feature-index.ts`](patterns/golden/ui-feature-index.ts) | `src/ui/features/publish/index.ts` (not yet on main, lands with S4c) | `uiFeatureIndex` (new:feature) |
| Tenant repo query | [`tenant-query.ts`](patterns/golden/tenant-query.ts) | `cloud/api/src/tenant/repos/projects.ts` (not yet on main, lands with Auth S1) | none |
