# Design Studio rulebook for agents

Read this before you write code. Each rule is one line: what to do, then what enforces it after a `->`, then its id.
"tsc" means `pnpm run typecheck`. "check-actions" means `pnpm exec tsx scripts/check-actions.ts`, which will be part of `pnpm run check:scripts`.
W8-rename has landed: definitions live in `src/shared/actions/<domain>/`, handlers in `src/server/handlers/<domain>/`, the global list is `src/shared/actions/all-actions.generated.ts`, and the check is `scripts/check-actions.ts` (`pnpm run check:actions`).
Use pnpm for every command: `pnpm run <script>`, `pnpm exec <bin>`, `pnpm dlx <pkg>`. Run a script file with `pnpm exec tsx scripts/<x>.ts`.
Copy the golden file for each kind of code. `docs/patterns.md` lists them. Never copy the first similar file you find.
`review-only` marks a rule that no tool checks. A reviewer checks it.
`(lands with <wave>)` marks a rule whose check, file or command is not on `main` yet. Follow the rule now. Do not run a command that is marked this way until its wave lands.
Waves: W8-rename (the naming rename, first slice of W8), S4a (Effect runtime), S4b (action core), S4s (stamp and check-actions), M9b (the lint merge step after S4s), S4c (publish), Auth S1 (tenancy), S5-events, S5-mcp-life, S5-direct-edit, S6a (UI platform), Auth S6c (real permissions), the layout wave (moves the root to `apps/desktop` and makes `packages/common/actions` and `packages/ui`).
Fast path for a new action (lands with S4s): `pnpm run new:action ...`, fill the definition, fill the handler, remove `NotImplemented`, run `pnpm exec tsx scripts/call-action.ts <id> '<json>'`. The stamp does every other step.

## 0. Naming

The rules are in `docs/naming.md` (D44). One word means one thing. Never use a synonym.

| Word | Means | Never |
|---|---|---|
| action | one thing a user or agent can do, defined once, served by UI, HTTP, MCP and the agent | op, operation, command, endpoint |
| domain | a group of actions about one noun: `project`, `design`, `canvas`, `token`, `publication` | context, ctx, area, module |
| handler | server code that runs one action | service, controller, resolver |
| service | an Effect class with logic and state for many handlers | manager, helper, util, provider |
| engine | a pure function module: no I/O, no Effect | lib, utils, core |
| adapter | maps an action to one surface: `http`, `mcp`, `agent` | server, router, bridge |
| tool, route | the MCP or agent surface, and the HTTP surface, of an action | endpoint |

- Name each action id `<domain>.<verb>`, or `<domain>.<verb><Object>` when the domain has 2 objects (`canvas.moveLayer`) -> new:action (lands with W9b), check-actions (lands with W9b). (N1)
- Never hand-write a derived name. From `project.create`: const `createProject`, definition `src/shared/actions/project/create.ts`, handler `src/server/handlers/project/create.ts`, tool `create_project`, route `POST /api/projects`, hook `useAction(createProject)`, types `CreateProjectInput` and `CreateProjectOutput` -> new:action, check-actions (lands with W9b). (N2)
- Use only these verbs in action ids. Read: `get`, `list`, `search`, `inspect`. Write: `create`, `update`, `set`, `insert`, `rename`, `move`, `duplicate`, `delete`, `restore`. Run: `start`, `stop`, `run`, `apply`, `export`, `import`, `publish`, `unpublish`, `share`. Never `fetch`, `load`, `retrieve`, `make`, `add`, `remove`, `edit`, `handle`, `process`, `do` -> new:action refuses other verbs, check-actions (lands with W9b). (N3)
- Never use a verb outside the N3 list in an action id, even when a legacy tool name has one (`keep_links`). Keep the old name with `mcp.name` -> `studio/action-verb`. (N3a)
- Keep every tool name that is in `artifacts/mcp-snapshots/*.json`. Its definition sets `tool: "<old name>"`, and check-actions lists it as a legacy name. A new action never sets `tool` -> check-actions (lands with W9b). (N4)
- Name files and folders in kebab-case with singular folders, and a React component file in PascalCase. Name a service class `<Noun><Role>` (Store, Runner, Watcher, Queue, Client, Cache), an error `<Noun><Problem>Error`, an event `<domain>.<pastVerb>`, an env var `STUDIO_<NOUN>`. Start a function with a verb above or `to`, `from`, `is`, `has`. Start a boolean with `is`, `has`, `can` or `should` -> `unicorn/filename-case`, review. (N5)
- Name each action domain with one singular kebab-case noun that is also its folder name (`version`, `dev-server`, `connection`). Never use a plural (`versions`) or a surface word (`mcp`, `http`, `agent`, `tool`, `route`) -> `studio/action-domain-name`. (N5a)
- Never put `data`, `info`, `item`, `obj`, `thing`, `stuff`, `manager`, `helper`, `util`, `handle`, `process`, `misc`, `Shape`, a `Type` or `Interface` suffix or an `I` prefix in a name. Spell words out. Short forms allowed: `id`, `url`, `html`, `css`, `jsx`, `mcp`, `ui`, `db` -> `anti-slop/no-shape-in-symbol-names`, `id-denylist` (lands with M9b), check-actions (lands with W9b). (N6)
- Use the package test: can someone outside this repo `pnpm add` it and use it without our server, env or secrets? Yes: a package in `packages/ui` or `packages/common/<name>`. No: an app in `apps/<name>`. A package imports only packages, through their `exports` map -> boundaries (a package that imports `apps/**` fails) (lands with the layout wave). (N7)

## 1. Where code goes

- Put each action definition in `src/shared/actions/<domain>/<verb>.ts` (the layout wave moves it to `packages/common/actions/src/<domain>/<verb>.ts`), as one `defineAction` const named `<verb><Domain>` -> new:action, check-actions (pair rule) (lands with S4s). (W1)
- Put each action handler in `src/server/handlers/<domain>/<verb>.ts`, with the same path tail. It exports `handle`, and also `preview` when `confirm: "user"` -> new:action, check-actions (pair rule) (lands with S4s), tsc `Entries` (lands with S4b). (W2)
- Put shared payload schemas in `actions/<domain>/schema.ts`. Put branded ids in `actions/_core/ids.ts` -> review, new:action (it imports ids from there) (lands with S4s). (W3)
- Put each error class in its own file: `actions/_core/errors/<kebab>.ts` or `actions/<domain>/errors/<kebab>.ts` -> `max-classes-per-file` 1, new:error (lands with S4s). (W4)
- Put each service in `src/server/<area>/<kebab>.ts`, one `Context.Service` class per file. The file name is the class name in kebab case -> `max-classes-per-file`, `unicorn/filename-case`, new:service (lands with S4s). (W5)
- Put adapters only in `src/server/http`, `src/server/mcp` and `src/server/agent-tools`. Never create `src/server/adapters` -> `boundaries/dependencies` (the adapter element maps only these 3 folders). (W6)
- Put the shared action runner only in `src/server/handlers/_core/run-action.ts`. Adapters call it. They never decode, authorize or check scope themselves -> check-actions (decode and `authorizer.require` allowlist) (lands with S4s). (W7)
- Put pure engines in `<area>/engine/<verb-noun>.ts` as plain functions -> boundaries engine globs, `no-restricted-imports` (`effect`, `node:*`) (lands with M9b). (W8)
- Keep `<area>/engine/**` pure: no `node:*` or `effect` value import, no `async`, `await`, `throw`, `try`, `new Promise` or `.catch`. Do I/O in a read service that calls the engine -> `studio/engine-pure` (`direct-edit/engine` is out of scope until S5-direct-edit). (W8a)
- Put UI data code in `src/ui/platform/**` and UI features in `src/ui/features/<f>/**` -> boundaries ui elements, `no-restricted-globals` (lands with S6a). (W9)
- Put tenant SQL only in `cloud/api/src/tenant/repos/<table>.ts` -> check-tenant B1, B2 (lands with Auth S1). (W10)
- Never hand-edit a file that starts with `// @generated` (per-domain `index.ts`, `routes.ts`, `handlers.ts`, `errors/index.ts`, and the global lists). Run `pnpm exec tsx scripts/gen-routes.ts` (the `pnpm run gen:routes` alias lands with S4s) -> `gen-routes --check` in `pnpm run check:scripts`. (W11)
- Never edit the 5 hand aggregators (`actions/index.ts`, `main/live-layer.ts`, `http/mount-all.ts`, `mcp/registry.ts`, `agent-tools/registry.ts`). They import generated lists -> check-ownership, review. (W12)
- Never guess a result kind from the output shape in an aggregator (`Schema.is`, `Schema.Struct` in `mcp/registry.ts` and the other 4). Map a declared output schema in an owned adapter file such as `mcp/tool-result.ts` -> `studio/no-output-guess`. (W12a)
- Import with relative paths and a `.js` suffix. Import another area only through its `index.ts` -> `import/extensions`, boundaries public-index rule. (W13)
- Let `handlers/<domain>/**` import only `handlers/_core`, service `index.ts` files, platform and `actions`. A domain never imports another domain -> check-actions (import scan) (lands with S4s). (W14)
- Never import a service file past its area `index.ts` from a handler (`../../canvas/canvas-store.js`). Export the service from `src/server/<area>/index.ts` -> `studio/no-deep-area-import`. (W14a)

- Put npm-publishable code only in `packages/ui` or `packages/common/<name>`. Put every app in `apps/<name>`: `apps/desktop` (Electron, local server, UI, bridge), `apps/api` (auth and tenant Worker), `apps/publish` (published-design Worker), `apps/web` (browser app for sign-in, orgs, keys and confirms). Shared code goes in publishable packages: `packages/common/<name>` (shared non-UI code, first `packages/common/actions`) and `packages/ui` (UI kit). A package never imports an app. Today the repo root and `cloud/*` are the old paths; new cloud API code goes in `apps/api` -> review-only. (W15)
## 2. How to add an action

- Stamp every new action with `pnpm run new:action <domain> <verb> ...` (lands with S4s). Never copy an action, route, tool or handler by hand -> check-actions (pair rule, template shape) (lands with S4s), `gen-routes --check`. (E1)
- Fill all 13 `defineAction` keys in sorted order: access, agent, confirm, description, errors, http, id, input, invalidates, mcp, needs, output, scope -> tsc (`ActionSpec` has no optional key) (lands with S4b), `sort-keys`. (E2)
- Give each action one flat input `Schema.Struct`. HTTP merges path params, query and body into it. MCP and the agent pass their args object as it is. For `GET` and `DELETE`, the runner decodes the query strings with `Schema.toCodecStringTree(action.input)`, so `limit: Schema.Int` works on every surface. The UI sends every field, with `null` as `"null"` -> run-action (two decoders, built once) (lands with S4b). (E3)
- Name each path param with the full input field name (`:projectId`, never `:pid`). A path param is a string field -> tsc `ParamCheck` (error keys `missingPathParam`, `pathParamNotString`) (lands with S4b). (E4)
- Use `GET` for `access: "read"`. Use `POST`, `PUT`, `PATCH` or `DELETE` for `edit` and `destructive` -> tsc `ReadCheck` (error key `readActionNeedsGet`) (lands with S4b). (E5)
- Put `projectId` in the input of every `scope: "project"` action -> tsc `ScopeCheck` (error key `projectScopeNeedsProjectId`) (lands with S4b). (E6)
- Set `confirm: "user"` on every `destructive` action and every action whose `needs` is a confirm permission (publish, share, delete) -> tsc `ConfirmCheck` (`actionNeedsConfirmUser`), tsc `Entries` (a missing `preview` fails) (lands with S4b). (E7)
- Give `mcp` `{ name }` or `{ off }`. Give `agent` `{ lean, name, set, short }` or `{ off }`. `set` is the tool set (`app`, `core`, `design-system`, `kit`, `tweak`). `short` is the 20 to 160 char tool text. The only off reasons are `run-control`, `secret`, `stream` and `ui-bootstrap` -> tsc (closed unions) (lands with S4b), check-actions (runs start, steer and stop must be `run-control`) (lands with S4s). (E8)
- Never set agent `{ off: "ui-bootstrap" }` on a write or on an action with an MCP name. While a legacy agent tool still serves it, set `{ off: "legacy-agent" }`; the count may only go down -> `studio/agent-off-reason`, check-actions (E8 `LEGACY_AGENT_MAX` cap). (E8a)
- Write tool names out in full. Never rename a name that is in `artifacts/mcp-snapshots/*.json` (each P5 slice writes its file; see N4). Every name is unique snake_case, 64 chars max -> check-actions (lands with S4s), `scripts/mcp-schema-diff.ts` (lands with S4c). (E9)
- Write the description in STE, 20 to 600 chars, with no `TODO` -> check-actions (lands with S4s). (E10)
- List in `invalidates` the read action ids whose data the action changes -> new:action (asks for it), check-actions (warns on an edit action with `[]`) (lands with S4s). (E11)
- Make every output a `Schema.Struct`. List actions spread `PageFields` into the input (`limit` default 50, max 200, and `cursor`) and return `pageOf(<Item>Schema)`, both from `actions/_core/list-page.ts` -> tsc (`ActionSpec`) (lands with S4b), check-actions (no top-level array without `limit`) (lands with S4s). (E12)
- Write handlers as `Effect.fn("<action id>")(function* run(input: Input<typeof action>) {...}) satisfies Handle<typeof action>`. Use `satisfies`, never a type annotation, so the exact `R` stays visible -> tsc (lands with S4b), check-actions (pattern match) (lands with S4s). (E13)
- Give every `handle` and `preview` const in `handlers/<domain>/<verb>.ts` `satisfies Handle<typeof action>` or `satisfies Preview<typeof action>`, so tsc checks the output, errors and services -> `studio/handler-satisfies`. (E13a)
- Keep handlers thin: yield services, call them, shape the output. No `node:*`, `hono`, MCP or SDK imports -> `no-restricted-imports` on `handlers/**` (lands with M9b), `max-lines-per-function` 80. (E14)
- Remove `NotImplemented` from `errors` before you commit. The stamp puts it there so the stub compiles -> check-actions fails while any action lists it (lands with S4s). (E15)
- Never ship a cloud route that only fails with `NotImplemented`. Leave the route out of its group until it has a handler -> `studio/no-stub-route`. (E15a)
- Never add a migrated action to `agent/tool-sets.ts`, `agent/tool-help.ts`, the `agent/permissions.ts` name lists or `EDITS_NOTE`. The registries derive the agent allowlist, tool sets, help, edit set, plan and critique blocks, the MCP Allow-edits gate and the MCP annotations from AllActions (`agent/legacy/agent-ops.ts`) -> check-actions (every agent name is in the derived allowlist; no action name is in a legacy list) (lands with S4s). (E16)

## 3. Services and Effect

- Use Effect 4 only on the server. Never in `src/ui`, `src/bridge`, `desktop`, workers or pure engines -> `no-restricted-imports` (`allowTypeImports` for action types) (lands with M9b), check-bundle (0 effect bytes) (lands with S4s). (S1)
- Use one `ManagedRuntime`, built at boot in `main/runtime.ts` (lands with S4a) -> check-actions (allowlist for `ManagedRuntime.make`) (lands with S4s). (S2)
- Call `runPromise`, `runPromiseExit` and `runSync` only in `http`, `mcp`, `agent-tools`, `main` and worker entries -> check-actions (allowlist) (lands with S4s). (S3)
- Build every Layer once, at boot. Per request, add only plain values with `Effect.provideService` -> check-actions (bans `Layer.build`, `Layer.fresh`, `Effect.provide(<Layer>)` outside `main/**`) (lands with S4s). (S4)
- Write a service as `class X extends Context.Service<X, XApi>()("design-studio/<area>/X")` with `static readonly layer` and an optional `static readonly layerTest` -> new:service, check-actions (bans `Effect.Service`, `Effect.Tag`, `Context.Tag`) (lands with S4s). (S5)
- Make the service tag match the file: `"design-studio/<area>/<Class>"`, where `<area>` is the `src/server/<area>/` folder of the file -> `studio/service-tag-area`. (S5a)
- Declare `declare public readonly access: "read"` or `"write"` on every service class. A read service never locks, spawns, writes or emits -> tsc (a handler that yields an unmarked service fails) (lands with S4b), review. (S6)
- Yield only `access: "read"` services in a read action handler and in every `preview` -> tsc (`EnvOf<Action>`; a read handler that yields `SaveQueue` or `CfCli` fails) (lands with S4b). (S7)
- Never yield a service with `access: "write"` in a read action handler or in a `preview`. Put the read in a `<Noun>Store` with `access: "read"` -> `studio/read-yields-read-service`. (S7a)
- Wrap every service method in `Effect.fn("<Class>.<method>")`. Name every generator function -> new:service (lands with S4s), `func-names`. (S8)
- Name the API interface `<Class>Api`, a schema const `<Name>Schema`, its decoded type `<Name>` and its wire type `<Name>Wire`. Never use "Shape" -> `anti-slop/no-shape-in-symbol-names`, `no-redeclare`. (S9)
- Keep `main/runtime-check.ts` green. It fails tsc when a handler needs a service that `main/live-layer.ts` does not provide -> tsc (`everyLayerProvided`) (lands with S4b). (S10)
- Never use `throw`, `try`, `async`, `await` or `new Promise` in `handlers/**` or in Effect service code -> check-actions (text scan; oxlint has no `no-restricted-syntax`) (lands with S4s). (S11)
- Never write `async`, `await`, `throw`, `try`, `new Promise` or `.catch` inside an `Effect.*` call or in `handlers/**`. Move a legacy async step to a named module function and wrap it with `attemptKnown` -> `studio/no-async-in-service`. (S11a)
- Keep today's fallbacks: each `.catch(() => x)` becomes `Effect.orElseSucceed(() => x)` with the same `x` -> review-only, G-smoke. (S12)
- Use `Effect.die` for storage I/O that no caller can recover from -> review-only. (S13)
- Never keep a hand-made runtime slot (a `NOT_READY` text, a `Map` keyed by `loadConfig().dataDir`). Use `makeRuntimeSlot` or `requireBound` from `src/server/platform/runtime-slot/index.ts`; an unbound runtime is a defect -> `studio/no-runtime-map`. (S13a)
- Use zod only in `src/server/agent-tools/sdk-shape.ts`, which bridges `Schema.toJsonSchemaDocument(action.input)` to the SDK shape -> `no-restricted-imports` (`zod` elsewhere in new folders) (lands with M9b). (S14)

## 4. Errors

- Write each error as `class X extends Schema.TaggedError<X>()("X", { message: Schema.String, ... }) {}` with no status field -> new:error, check-actions (no `status` in `*/errors/*.ts`) (lands with S4s). (R1)
- Fail with `return yield* new X({ message })`. Never `throw`, never `new Error` in Effect code -> check-actions (S11 scan) (lands with S4s), `unicorn/throw-new-error` off in Effect folders (lands with M9b). (R2)
- List in `action.errors` every error the handler can fail with -> tsc (the handler `E` must fit `ErrorOf<Action>`) (lands with S4b). (R3)
- Map each tag to a status in the domain's `actions/<domain>/errors/status.ts` -> tsc (`satisfies Record<<Domain>ErrorTag, HttpStatus>`) (lands with S4b). (R4)
- Let gen-routes merge the status maps into `_core/http-status.ts` and the tag unions into `_core/errors/all.ts` -> `gen-routes --check`, tsc (`satisfies Record<StudioErrorTag | "Defect", HttpStatus>`) (lands with S4a). (R5)
- Make the wire body only with `toWire` from `actions/_core/wire.ts`: `{ _tag, code, error, message, ...data }`. An error with a payload has a `code` field and a `data` field (`PickApp` has `code: "pick_app"` and `data: { candidates }`) -> golden `http/mount.ts` (lands with S4b), S-error-shape smoke (lands with S4c). (R6)
- Send a defect as `toWire(null)` (500). The runner logs it with `Effect.logError(action.id, defect)`. Never send stacks or paths -> run-action `tapDefect`, adapter `reply` (lands with S4b). (R7)
- Never map `Cause.UnknownError` to a 400 in a local bridge. Use `attemptKnown` from `src/server/platform/attempt/index.ts`: it maps only the known store errors and lets the rest die as defects -> `studio/no-local-error-bridge`. (R7a)
- Write `message` as user text in STE. MCP and the agent show it as it is -> review-only. (R8)

## 5. Tenancy

- Let only `run-action.ts` provide `LocalPrincipal` and `LocalOrgScope`, once per call -> check-actions (B12 scan for `provideService(LocalPrincipal|LocalOrgScope|CurrentOrg`) (lands with S4s). (T1)
- Let only `run-action.ts` call `Authorizer.require(action.needs)`. Handlers never check roles or perms -> check-actions (`authorizer.require` allowlist) (lands with S4s). (T2)
- Let the runner call `ProjectAccess.visible(projectId)` before every `scope: "project"` handler. A miss is `NotFound` (404), never 403 -> run-action code, tsc `ScopeCheck` (lands with S4b). (T3)
- Take `needs` only from the `Permission` union in `actions/_core/permissions.ts`. It mirrors `cloud/api/src/auth/permissions.ts` -> tsc (lands with S4b), check-actions (the two lists match) (lands with S4s, live from Auth S1). (T4)
- Never give an `edit` or `destructive` action `needs: "studio.read"`. Use `studio.write` -> `studio/write-needs-write-permission`. (T4a)
- Write cloud SQL only as `` tq`...` `` in `tenant/repos/**`. Every TENANT alias has `alias.org_id = :org` -> `tq` throws at boot, check-tenant B1, B2 (lands with Auth S1). (T5)
- Never take an `orgId` parameter in a repo method. `TenantDb` binds `:org` from `CurrentOrg` -> check-tenant B6 (lands with Auth S1), review. (T6)
- Select `org_id` in reads. Use `RETURNING org_id` in writes. A by-id write that changes 0 rows is `NotFound`; more than 1 is a defect -> `TenantDb.run` row check (lands with Auth S1). (T7)
- Page lists by key with `LIMIT` 100 or less. Use one `db.batch` per request. Never query inside a loop -> review, B13 counter (lands with Auth S1). (T8)
- Let cloud group middleware provide `CurrentOrg` and `CurrentUser` with `Effect.provideService`, over Layers built once -> check-tenant B12 (lands with Auth S1), check-actions (S4) (lands with S4s). (T9)
- Move security code line for line (plan section 0 list) -> the slice's S-p0 smoke. (T10)

## 6. UI

- Let only `src/ui/platform/**` touch `fetch`, `EventSource`, `BroadcastChannel`, storage, `history` and `window.studioDesktop` -> `no-restricted-globals`, `no-restricted-properties` (message names the fix) (lands with S6a). (U1)
- Never read `window.studioDesktop` outside `src/ui/platform/**`. Use `desktopBridge` or `isDesktop` from `src/ui/platform/desktop.ts` -> `studio/no-desktop-global`. (U1a)
- Read and write with the one hook `useAction(<action>)`. A read also passes `input` (lands with S6a). Until then, call actions with `call(action, input)` from `src/ui/platform/http.ts` -> U1 rules, review. (U2)
- Never call `useAction` on a read action (`get*`, `list*`, `search*`, `inspect*`) with no input, because the read never runs. Pass `{}` when the input is empty -> `studio/read-needs-input`. (U2a)
- Value-import only `actions/<domain>/routes.ts` in the UI. Import every other definition file with `import type` -> `no-restricted-imports` with `allowTypeImports` (lands with M9b). (U3)
- Use wire types in the UI (`WireInput<Action>`, `WireOutput<Action>`, `<Name>Wire`), never decoded branded types -> tsc. (U4)
- Never cast an action call with `as Promise<...>`. `call` returns the wire output of the route -> `studio/no-promise-cast`. (U4a)
- Never cast action data in the UI (`(await call(routes.x, input)) as T`, `value as never`, a field of a call result). Type the local value with the route output, or narrow it with a type guard -> `studio/no-wire-cast`. (U4b)
- Never import `effect` or `zod` values in `src/ui` or `src/bridge` -> `no-restricted-imports` (lands with M9b), check-bundle (lands with S4s). (U5)
- Give each feature this shape: `index.ts` (lazy named exports only), one component per kebab-case `.tsx`, `use-<thing>.ts` hooks, `copy.ts`, `<thing>-model.ts` -> new:feature (lands with S4s), `react/no-multi-comp`, `react/jsx-no-literals`, `unicorn/filename-case`. (U6)
- Never import one feature from another. `ui/app` composes features -> boundaries (feature to feature disallowed) (lands with M9b). (U7)
- Never import a component in a hook -> boundaries (lands with M9b), review. (U8)
- Track pending writes with `useTransition`. Never make a busy flag. Use `await`, never `.then` -> `react-doctor/no-loading-flag-reset-outside-finally`, `promise/prefer-await-to-then`. (U9)
- Never write `.then` in `src/ui/{app,domain,features,kit,platform}/**` or in a UI file that calls an action. Use `await` in an async function -> `studio/no-then`. (U9a)
- Wrap every function prop in `useCallback` -> `react_perf/jsx-no-new-function-as-prop` and the other `react_perf` rules. (U10)
- Lazy-load every dialog, panel and route that is not on Home -> check-bundle (B1) (lands with S4s). (U11)
- Refresh data only through `action.invalidates`: `useAction` refetches after its own call, and the `action.done` SSE event (emitted by `run-action.ts`) covers MCP and agent calls (lands with S5-events). No polling, no TTL caches -> check-actions (bans `setInterval` with a fetch in `ui/platform`) (lands with S4s). (U12)
- Never keep a time-based cache (warm, TTL, max age) in `src/ui/platform/**`. Dedupe in-flight reads only -> `studio/no-cache-ttl`. (U12a)
- Use `.ui-menu` styles, 28 px rows, `data-tip` tooltips and `tokens.css`. Check dark and light -> review-only, screenshots. (U13)

## 7. Performance

- Build decoders, MCP JSON Schemas and SDK shapes once, at mount -> check-actions (`Schema.decode*` and `toJsonSchemaDocument` only in `run-action.ts` and the registries) (lands with S4s). (P1)
- Spawn no git process on a read path. Read blobs and trees through `platform/git` `BatchReader` -> S7 (tsc) (lands with S4b), B5 spawn counter (lands with S5-events). (P2)
- Return the edit response after the engine patch, the planned SSE and the atomic write. Never await the version commit or git status -> type (edit handlers return `PendingVersion`), B8 (lands with S5-events and S5-direct-edit). (P3)
- Write each shared resource through its one owner: `SaveQueue` per direction, the event log writer per project, `JsonFile` per path -> `node/no-sync` budget 0 in new folders (lands with M9b), review. (P4)
- Use `KeyedCache` from `platform/cache` with a required `max` and a content key (sha, versionId, rev, or mtime and size). Keep caches inside a Layer -> type (`CacheKey` brand) (lands with S5-events), review. (P5)
- Parse each source file once per content version, through `SourceCache` -> B6 parse counter (lands with S5-direct-edit). (P6)
- Keep pure engines sync. Return `{ ok: true, value } | { ok: false, code }`. Never throw for an expected case -> boundaries, `no-restricted-imports` (lands with M9b). (P7)
- Serialize each SSE event once per project, for all subscribers -> S-replay smoke (lands with S5-events), review-only. (P8)
- Load heavy modules (playwright-core, esbuild, typescript, vite, the agent SDK) with a dynamic import on first use -> review, B12 `scripts/check-boot-imports.ts` (lands with S5-mcp-life). (P9)
- Keep every perf budget. Only the merge step rewrites `scripts/perf/baseline.json`, and only downward -> G-perf (lands with S4a). (P10)

## 8. Lint and hooks

- Write no comments. The only allowed one is the `// @generated` header -> no-comments pre-commit hook. (L1)
- Keep each function at complexity 20 or less, 80 lines, 4 params and 30 statements. Keep files at 500 lines or less -> cccc hook, `complexity`, `max-*` rules. (L2)
- Put one `export { }` block and one `export type { }` block at the end of each file. No default exports -> `import/group-exports`, `import/exports-last`, `import/no-default-export`. (L3)
- Never write `export * from` in `src/ui`. Use named re-exports, or import from the real module -> `studio/no-wildcard-reexport`. (L3a)
- Use arrow consts, `null` (never `undefined`), `readonly` fields and no ternaries -> `func-style`, `no-undefined`, `no-ternary`. (L4)
- Keep new folders at 0 diagnostics with every rule on. Run `pnpm run lint:gate`: 0 errors, and the warning count may only go down -> budget-0 folders in `scripts/lint-gate.ts`, G-lint. (L5)
- Never edit `scripts/lint-baseline.json`, `oxlint.config.ts`, `lint/**` or `scripts/waves.json` in a slice. The merge step owns them. A slice may add only the narrowest scoped entry to `decisionOverrides` in `lint/decisions.ts` for a reason the spec forces, and must name it in its commit -> check-ownership. (L6)
- Never turn a `studio/*` rule off or down in `lint/*.ts` overrides. Fix the code, or change the rule scope in `lint/studio.ts` in the lint merge step -> `studio/no-studio-override`. (L6a)
- Run `pnpm run typecheck` and `pnpm run typecheck:tsrs`. Never run raw `tsc` -> PreToolUse hook. (L7)
- Make every restricted rule message say the fix: `<what is banned>. Use <X> from <path>.` Every check script prints `fix: <command>` -> check-coarse (asserts `Use ` in each message) (lands with S4s). (L8)
- Never add `no-restricted-syntax`. oxlint 1.89 does not have it. Add a check-actions scan instead -> check-coarse (rejects the key) (lands with S4s). (L9)

## 9. Verify

- Write no tests and run no tests -> review-only. (V1)
- Start the app: `STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev` -> G-smoke. (V2)
- Prove each new action with `pnpm exec tsx scripts/call-action.ts <action id> '<json>'` (lands with S4s). It calls the action over HTTP, MCP and the agent dispatcher, diffs the 3 outputs and prints ms and spawns. For a `confirm: "user"` action it answers the card with `POST /api/mcp/approvals/:id` in the dev run, so the real gate runs -> the stamp prints this line. (V3)
- Click the action in the UI. Take dark and light screenshots with playwright-core -> review-only. (V4)
- Before each commit, run `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run check:scripts` and `pnpm run lint:gate`. When you touch `src/ui`, also run `pnpm run build:ui`, then `pnpm exec tsx scripts/check-bundle.ts` (lands with S4s) -> G-tsc, G-check, G-lint, G-perf. (V5)
