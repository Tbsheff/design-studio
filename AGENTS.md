# Design Studio rulebook for agents

Read this before you write code. Each rule is one line: what to do, then what enforces it after a `->`, then its id.
"tsc" means `pnpm run typecheck`. "check-ops" means `pnpm exec tsx scripts/check-ops.ts`, which will be part of `pnpm run check:scripts`.
Use pnpm for every command: `pnpm run <script>`, `pnpm exec <bin>`, `pnpm dlx <pkg>`. Run a script file with `pnpm exec tsx scripts/<x>.ts`.
Copy the golden file for each kind of code. `docs/patterns.md` lists them. Never copy the first similar file you find.
`review-only` marks a rule that no tool checks. A reviewer checks it.
`(lands with <wave>)` marks a rule whose check, file or command is not on `main` yet. Follow the rule now. Do not run a command that is marked this way until its wave lands.
Waves: S4a (Effect runtime), S4b (contract core), S4s (stamp and check-ops), M9b (the lint merge step after S4s), S4c (publish), Auth S1 (tenancy), S5-events, S5-mcp-life, S5-direct-edit, S6a (UI platform), Auth S6c (real permissions).
Fast path for a new endpoint (lands with S4s): `pnpm run new:op ...`, fill the contract, fill the handler, remove `NotImplemented`, run `pnpm exec tsx scripts/call-op.ts <id> '<json>'`. The stamp does every other step.

## 1. Where code goes

- Put each op contract in `src/shared/contract/<ctx>/<op-kebab>.ts`, as one `defineOp` const named `<opCamel>` -> new:op, check-ops (pair rule) (lands with S4s). (W1)
- Put each op handler in `src/server/services/<ctx>/<op-kebab>.ts`, with the same path tail. It exports `handle`, and also `preview` when `confirm: "user"` -> new:op, check-ops (pair rule) (lands with S4s), tsc `Entries` (lands with S4b). (W2)
- Put shared payload schemas in `contract/<ctx>/schema.ts`. Put branded ids in `contract/_core/ids.ts` -> review, new:op (it imports ids from there) (lands with S4s). (W3)
- Put each error class in its own file: `contract/_core/errors/<kebab>.ts` or `contract/<ctx>/errors/<kebab>.ts` -> `max-classes-per-file` 1, new:error (lands with S4s). (W4)
- Put each domain service in `src/server/<area>/<kebab>.ts`, one `Context.Service` class per file. The file name is the class name in kebab case -> `max-classes-per-file`, `unicorn/filename-case`, new:service (lands with S4s). (W5)
- Put adapters only in `src/server/http`, `src/server/mcp` and `src/server/agent-tools`. Never create `src/server/adapters` -> `boundaries/dependencies` (the adapter element maps only these 3 folders). (W6)
- Put the shared op runner only in `src/server/services/_core/run-op.ts`. Adapters call it. They never decode, authorize or check scope themselves -> check-ops (decode and `authorizer.require` allowlist) (lands with S4s). (W7)
- Put pure engines in `<area>/engine/<verb-noun>.ts` as plain functions -> boundaries engine globs, `no-restricted-imports` (`effect`, `node:*`) (lands with M9b). (W8)
- Put UI data code in `src/ui/platform/**` and UI features in `src/ui/features/<f>/**` -> boundaries ui elements, `no-restricted-globals` (lands with S6a). (W9)
- Put tenant SQL only in `cloud/api/src/tenant/repos/<table>.ts` -> check-tenant B1, B2 (lands with Auth S1). (W10)
- Never hand-edit a file that starts with `// @generated` (per-context `index.ts`, `routes.ts`, `handlers.ts`, `errors/index.ts`, and the global lists). Run `pnpm exec tsx scripts/gen-routes.ts` (the `pnpm run gen:routes` alias lands with S4s) -> `gen-routes --check` in `pnpm run check:scripts`. (W11)
- Never edit the 5 hand aggregators (`contract/index.ts`, `main/live-layer.ts`, `http/mount-all.ts`, `mcp/registry.ts`, `agent-tools/registry.ts`). They import generated lists -> check-ownership, review. (W12)
- Import with relative paths and a `.js` suffix. Import another area only through its `index.ts` -> `import/extensions`, boundaries public-index rule. (W13)
- Let `services/<ctx>/**` import only `services/_core`, domain `index.ts` files, platform and contract. A context never imports another context -> check-ops (import scan) (lands with S4s). (W14)

- Put npm-publishable code only in `packages/<name>`. Put every app in `apps/<name>`: `apps/desktop` (Electron, local server, UI, bridge), `apps/api` (auth and tenant Worker), `apps/publish` (published-design Worker), `apps/web` (browser app for sign-in, orgs, keys and confirms). Shared code goes in publishable packages: `packages/common/<name>` (shared non-UI code, first `packages/common/contract`) and `packages/ui` (UI kit). A package never imports an app. Today the repo root and `cloud/*` are the old paths; new cloud API code goes in `apps/api` -> review-only. (W15)
## 2. How to add an endpoint

- Stamp every new op with `pnpm run new:op <ctx> <opKey> ...` (lands with S4s). Never copy an op, route, tool or handler by hand -> check-ops (pair rule, template shape) (lands with S4s), `gen-routes --check`. (E1)
- Fill all 13 `defineOp` keys in sorted order: access, agent, confirm, description, errors, http, id, input, invalidates, mcp, needs, output, scope -> tsc (`OpSpec` has no optional key) (lands with S4b), `sort-keys`. (E2)
- Give each op one flat input `Schema.Struct`. HTTP merges path params, query and body into it. MCP and the agent pass their args object as it is. For `GET` and `DELETE`, the runner decodes the query strings with `Schema.toCodecStringTree(op.input)`, so `limit: Schema.Int` works on every surface. The UI sends every field, with `null` as `"null"` -> run-op (two decoders, built once) (lands with S4b). (E3)
- Name each path param with the full input field name (`:projectId`, never `:pid`). A path param is a string field -> tsc `ParamCheck` (error keys `missingPathParam`, `pathParamNotString`) (lands with S4b). (E4)
- Use `GET` for `access: "read"`. Use `POST`, `PUT`, `PATCH` or `DELETE` for `edit` and `destructive` -> tsc `ReadCheck` (error key `readOpNeedsGet`) (lands with S4b). (E5)
- Put `projectId` in the input of every `scope: "project"` op -> tsc `ScopeCheck` (error key `projectScopeNeedsProjectId`) (lands with S4b). (E6)
- Set `confirm: "user"` on every `destructive` op and every op whose `needs` is a confirm permission (publish, share, delete) -> tsc `ConfirmCheck` (`opNeedsConfirmUser`), tsc `Entries` (a missing `preview` fails) (lands with S4b). (E7)
- Give `mcp` `{ name }` or `{ off }`. Give `agent` `{ lean, name, set, short }` or `{ off }`. `set` is the tool set (`app`, `core`, `design-system`, `kit`, `tweak`). `short` is the 20 to 160 char tool text. The only off reasons are `run-control`, `secret`, `stream` and `ui-bootstrap` -> tsc (closed unions) (lands with S4b), check-ops (runs start, steer and stop must be `run-control`) (lands with S4s). (E8)
- Write tool names out in full. Never rename a name that is in `artifacts/mcp-snapshots/*.json` (each P5 slice writes its file). Every name is unique snake_case, 64 chars max -> check-ops (lands with S4s), `scripts/mcp-schema-diff.ts` (lands with S4c). (E9)
- Write the description in STE, 20 to 600 chars, with no `TODO` -> check-ops (lands with S4s). (E10)
- List in `invalidates` the read op ids whose data the op changes -> new:op (asks for it), check-ops (warns on an edit op with `[]`) (lands with S4s). (E11)
- Make every output a `Schema.Struct`. List ops spread `PageFields` into the input (`limit` default 50, max 200, and `cursor`) and return `pageOf(<Item>Schema)`, both from `contract/_core/list-page.ts` -> tsc (`OpSpec`) (lands with S4b), check-ops (no top-level array without `limit`) (lands with S4s). (E12)
- Write handlers as `Effect.fn("<op id>")(function* run(input: Input<typeof op>) {...}) satisfies Handle<typeof op>`. Use `satisfies`, never a type annotation, so the exact `R` stays visible -> tsc (lands with S4b), check-ops (pattern match) (lands with S4s). (E13)
- Keep handlers thin: yield domain services, call them, shape the output. No `node:*`, `hono`, MCP or SDK imports -> `no-restricted-imports` on `services/**` (lands with M9b), `max-lines-per-function` 80. (E14)
- Remove `NotImplemented` from `errors` before you commit. The stamp puts it there so the stub compiles -> check-ops fails while any op lists it (lands with S4s). (E15)
- Never add a migrated op to `agent/tool-sets.ts`, `agent/tool-help.ts`, the `agent/permissions.ts` name lists or `EDITS_NOTE`. The registries derive the agent allowlist, tool sets, help, edit set, plan and critique blocks, the MCP Allow-edits gate and the MCP annotations from AllOps (`agent/legacy/agent-ops.ts`) -> check-ops (every agent name is in the derived allowlist; no op name is in a legacy list) (lands with S4s). (E16)

## 3. Services and Effect

- Use Effect 4 only on the server. Never in `src/ui`, `src/bridge`, `desktop`, workers or pure engines -> `no-restricted-imports` (`allowTypeImports` for contract types) (lands with M9b), check-bundle (0 effect bytes) (lands with S4s). (S1)
- Use one `ManagedRuntime`, built at boot in `main/runtime.ts` (lands with S4a) -> check-ops (allowlist for `ManagedRuntime.make`) (lands with S4s). (S2)
- Call `runPromise`, `runPromiseExit` and `runSync` only in `http`, `mcp`, `agent-tools`, `main` and worker entries -> check-ops (allowlist) (lands with S4s). (S3)
- Build every Layer once, at boot. Per request, add only plain values with `Effect.provideService` -> check-ops (bans `Layer.build`, `Layer.fresh`, `Effect.provide(<Layer>)` outside `main/**`) (lands with S4s). (S4)
- Write a service as `class X extends Context.Service<X, XApi>()("design-studio/<area>/X")` with `static readonly layer` and an optional `static readonly layerTest` -> new:service, check-ops (bans `Effect.Service`, `Effect.Tag`, `Context.Tag`) (lands with S4s). (S5)
- Declare `declare public readonly access: "read"` or `"write"` on every service class. A read service never locks, spawns, writes or emits -> tsc (a handler that yields an unmarked service fails) (lands with S4b), review. (S6)
- Yield only `access: "read"` services in a read op handler and in every `preview` -> tsc (`EnvOf<Op>`; a read handler that yields `SaveQueue` or `CfCli` fails) (lands with S4b). (S7)
- Wrap every service method in `Effect.fn("<Class>.<method>")`. Name every generator function -> new:service (lands with S4s), `func-names`. (S8)
- Name the API interface `<Class>Api`, a schema const `<Name>Schema`, its decoded type `<Name>` and its wire type `<Name>Wire`. Never use "Shape" -> `anti-slop/no-shape-in-symbol-names`, `no-redeclare`. (S9)
- Keep `main/runtime-check.ts` green. It fails tsc when a handler needs a service that `main/live-layer.ts` does not provide -> tsc (`everyLayerProvided`) (lands with S4b). (S10)
- Never use `throw`, `try`, `async`, `await` or `new Promise` in `services/**` or in Effect domain code -> check-ops (text scan; oxlint has no `no-restricted-syntax`) (lands with S4s). (S11)
- Keep today's fallbacks: each `.catch(() => x)` becomes `Effect.orElseSucceed(() => x)` with the same `x` -> review-only, G-smoke. (S12)
- Use `Effect.die` for storage I/O that no caller can recover from -> review-only. (S13)
- Use zod only in `src/server/agent-tools/sdk-shape.ts`, which bridges `Schema.toJsonSchemaDocument(op.input)` to the SDK shape -> `no-restricted-imports` (`zod` elsewhere in new folders) (lands with M9b). (S14)

## 4. Errors

- Write each error as `class X extends Schema.TaggedError<X>()("X", { message: Schema.String, ... }) {}` with no status field -> new:error, check-ops (no `status` in `*/errors/*.ts`) (lands with S4s). (R1)
- Fail with `return yield* new X({ message })`. Never `throw`, never `new Error` in Effect code -> check-ops (S11 scan) (lands with S4s), `unicorn/throw-new-error` off in Effect folders (lands with M9b). (R2)
- List in `op.errors` every error the handler can fail with -> tsc (the handler `E` must fit `ErrorOf<Op>`) (lands with S4b). (R3)
- Map each tag to a status in the context's `contract/<ctx>/errors/status.ts` -> tsc (`satisfies Record<<Ctx>ErrorTag, HttpStatus>`) (lands with S4b). (R4)
- Let gen-routes merge the status maps into `_core/http-status.ts` and the tag unions into `_core/errors/all.ts` -> `gen-routes --check`, tsc (`satisfies Record<StudioErrorTag | "Defect", HttpStatus>`) (lands with S4a). (R5)
- Make the wire body only with `toWire` from `contract/_core/wire.ts`: `{ _tag, code, error, message, ...data }`. An error with a payload has a `code` field and a `data` field (`PickApp` has `code: "pick_app"` and `data: { candidates }`) -> golden `http/mount.ts` (lands with S4b), S-error-shape smoke (lands with S4c). (R6)
- Send a defect as `toWire(null)` (500). The runner logs it with `Effect.logError(op.id, defect)`. Never send stacks or paths -> run-op `tapDefect`, adapter `reply` (lands with S4b). (R7)
- Write `message` as user text in STE. MCP and the agent show it as it is -> review-only. (R8)

## 5. Tenancy

- Let only `run-op.ts` provide `LocalPrincipal` and `LocalOrgScope`, once per call -> check-ops (B12 scan for `provideService(LocalPrincipal|LocalOrgScope|CurrentOrg`) (lands with S4s). (T1)
- Let only `run-op.ts` call `Authorizer.require(op.needs)`. Handlers never check roles or perms -> check-ops (`authorizer.require` allowlist) (lands with S4s). (T2)
- Let the runner call `ProjectAccess.visible(projectId)` before every `scope: "project"` handler. A miss is `NotFound` (404), never 403 -> run-op code, tsc `ScopeCheck` (lands with S4b). (T3)
- Take `needs` only from the `Permission` union in `contract/_core/permissions.ts`. It mirrors `cloud/api/src/auth/permissions.ts` -> tsc (lands with S4b), check-ops (the two lists match) (lands with S4s, live from Auth S1). (T4)
- Write cloud SQL only as `` tq`...` `` in `tenant/repos/**`. Every TENANT alias has `alias.org_id = :org` -> `tq` throws at boot, check-tenant B1, B2 (lands with Auth S1). (T5)
- Never take an `orgId` parameter in a repo method. `TenantDb` binds `:org` from `CurrentOrg` -> check-tenant B6 (lands with Auth S1), review. (T6)
- Select `org_id` in reads. Use `RETURNING org_id` in writes. A by-id write that changes 0 rows is `NotFound`; more than 1 is a defect -> `TenantDb.run` row check (lands with Auth S1). (T7)
- Page lists by key with `LIMIT` 100 or less. Use one `db.batch` per request. Never query inside a loop -> review, B13 counter (lands with Auth S1). (T8)
- Let cloud group middleware provide `CurrentOrg` and `CurrentUser` with `Effect.provideService`, over Layers built once -> check-tenant B12 (lands with Auth S1), check-ops (S4) (lands with S4s). (T9)
- Move security code line for line (plan section 0 list) -> the slice's S-p0 smoke. (T10)

## 6. UI

- Let only `src/ui/platform/**` touch `fetch`, `EventSource`, `BroadcastChannel`, storage, `history` and `window.studioDesktop` -> `no-restricted-globals`, `no-restricted-properties` (message names the fix) (lands with S6a). (U1)
- Read data with `useOp(routes.<op>, input)`. Write with `useAction(routes.<op>)` (lands with S6a). Until then, call ops with `call(op, input)` from `src/ui/platform/http.ts` -> U1 rules, review. (U2)
- Value-import only `contract/<ctx>/routes.ts` in the UI. Import every other contract file with `import type` -> `no-restricted-imports` with `allowTypeImports` (lands with M9b). (U3)
- Use wire types in the UI (`WireInput<Op>`, `WireOutput<Op>`, `<Name>Wire`), never decoded branded types -> tsc. (U4)
- Never import `effect` or `zod` values in `src/ui` or `src/bridge` -> `no-restricted-imports` (lands with M9b), check-bundle (lands with S4s). (U5)
- Give each feature this shape: `index.ts` (lazy named exports only), one component per kebab-case `.tsx`, `use-<thing>.ts` hooks, `copy.ts`, `<thing>-model.ts` -> new:feature (lands with S4s), `react/no-multi-comp`, `react/jsx-no-literals`, `unicorn/filename-case`. (U6)
- Never import one feature from another. `ui/app` composes features -> boundaries (feature to feature disallowed) (lands with M9b). (U7)
- Never import a component in a hook -> boundaries (lands with M9b), review. (U8)
- Track pending writes with `useTransition`. Never make a busy flag. Use `await`, never `.then` -> `react-doctor/no-loading-flag-reset-outside-finally`, `promise/prefer-await-to-then`. (U9)
- Wrap every function prop in `useCallback` -> `react_perf/jsx-no-new-function-as-prop` and the other `react_perf` rules. (U10)
- Lazy-load every dialog, panel and route that is not on Home -> check-bundle (B1) (lands with S4s). (U11)
- Refresh data only through `op.invalidates`: `useAction` refetches after its own call, and the `op.done` SSE event (emitted by `run-op.ts`) covers MCP and agent calls (lands with S5-events). No polling, no TTL caches -> check-ops (bans `setInterval` with a fetch in `ui/platform`) (lands with S4s). (U12)
- Use `.ui-menu` styles, 28 px rows, `data-tip` tooltips and `tokens.css`. Check dark and light -> review-only, screenshots. (U13)

## 7. Performance

- Build decoders, MCP JSON Schemas and SDK shapes once, at mount -> check-ops (`Schema.decode*` and `toJsonSchemaDocument` only in `run-op.ts` and the registries) (lands with S4s). (P1)
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
- Use arrow consts, `null` (never `undefined`), `readonly` fields and no ternaries -> `func-style`, `no-undefined`, `no-ternary`. (L4)
- Keep new folders at 0 diagnostics with every rule on. Run `pnpm run lint:gate`: 0 errors, and the warning count may only go down -> budget-0 folders in `scripts/lint-gate.ts`, G-lint. (L5)
- Never edit `scripts/lint-baseline.json`, `oxlint.config.ts`, `lint/**` or `scripts/waves.json` in a slice. The merge step owns them. A slice may add only the narrowest scoped entry to `decisionOverrides` in `lint/decisions.ts` for a reason the spec forces, and must name it in its commit -> check-ownership. (L6)
- Run `pnpm run typecheck` and `pnpm run typecheck:tsrs`. Never run raw `tsc` -> PreToolUse hook. (L7)
- Make every restricted rule message say the fix: `<what is banned>. Use <X> from <path>.` Every check script prints `fix: <command>` -> check-coarse (asserts `Use ` in each message) (lands with S4s). (L8)
- Never add `no-restricted-syntax`. oxlint 1.89 does not have it. Add a check-ops scan instead -> check-coarse (rejects the key) (lands with S4s). (L9)

## 9. Verify

- Write no tests and run no tests -> review-only. (V1)
- Start the app: `STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev` -> G-smoke. (V2)
- Prove each new op with `pnpm exec tsx scripts/call-op.ts <op id> '<json>'` (lands with S4s). It calls the op over HTTP, MCP and the agent dispatcher, diffs the 3 outputs and prints ms and spawns. For a `confirm: "user"` op it answers the card with `POST /api/mcp/approvals/:id` in the dev run, so the real gate runs -> the stamp prints this line. (V3)
- Click the action in the UI. Take dark and light screenshots with playwright-core -> review-only. (V4)
- Before each commit, run `pnpm run typecheck`, `pnpm run typecheck:tsrs`, `pnpm run check:scripts` and `pnpm run lint:gate`. When you touch `src/ui`, also run `pnpm run build:ui`, then `pnpm exec tsx scripts/check-bundle.ts` (lands with S4s) -> G-tsc, G-check, G-lint, G-perf. (V5)
