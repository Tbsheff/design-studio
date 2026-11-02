# Naming rules (draft for Tyler)

One word means one thing. Never use a synonym. A name says what the thing is, not how it is built.

## 1. Why "op" goes

"Op" came from the first architecture plan as a short form of "operation", a generic RPC word. It is vague: an op could be a git op, a DOM op or a math op. The code also uses "context" for an op group, and Effect already has `Context`. Both words go.

## 2. Core words

| Word | Means | Never call it |
|---|---|---|
| action | One thing a user or agent can do, defined once, served by UI, HTTP, MCP and the agent. | op, operation, command, endpoint, tool (for the definition) |
| domain | A group of actions about one noun: `project`, `design`, `canvas`, `token`, `publication`. | context, ctx, area, module |
| action id | `<domain>.<verb>`, or `<domain>.<verb><Object>` when the domain has 2 objects. `project.create`, `design.export`, `canvas.moveLayer`. | |
| handler | Server code that runs one action. | service, controller, resolver |
| service | An Effect class that holds domain logic and state for many handlers. | manager, helper, util, provider |
| engine | A pure function module. No I/O, no Effect. | lib, utils, core |
| adapter | Maps an action to one surface: `http`, `mcp`, `agent`. | server, router, bridge |
| tool | The MCP or agent surface of an action. Its name comes from the action id. | |
| route | The HTTP surface of an action. Its path comes from the action id. | endpoint |
| app | Code that runs: it has an entry point, a host (Electron, Worker, browser), I/O, env or secrets. | |
| package | Code anyone could `pnpm add` and use without our server. | lib, shared, common (as a name) |

## 3. Derived names (never hand-written)

From the action id `project.create`:

| Surface | Name | Rule |
|---|---|---|
| action const | `createProject` | camelCase `<verb><Domain>` |
| definition file | `packages/common/actions/src/project/create.ts` | `<domain>/<verb>.ts`, kebab-case |
| handler file | `apps/desktop/src/server/handlers/project/create.ts` | same tail as the definition |
| MCP and agent tool | `create_project` | snake_case `<verb>_<domain>` |
| HTTP route | `POST /api/projects` | plural domain, REST verb from `access` |
| UI hook | `useAction(createProject)` | one hook for all actions |
| input and output types | `CreateProjectInput`, `CreateProjectOutput` | PascalCase `<Verb><Domain>Input` |

Existing tool names in `artifacts/mcp-snapshots/*.json` keep their names. The definition then sets `tool: "<old name>"` and check-actions lists it as a legacy name. New actions never set it.

## 4. Verbs

Today the 94 MCP tools use 45 verbs (17 `list`, 9 `set`, 9 `get`, 5 `add`, then 41 verbs used once or twice). The list below keeps the common ones and drops the rest. Old tools keep their names.


Use only these verbs in action ids. Add a verb only with a rule change.

- **Read:** `get` (one), `list` (many, paged), `search` (by text), `inspect` (computed facts about one thing).
- **Write:** `create`, `update` (patch several fields of a record), `set` (replace one value, such as a style or a token), `insert` (put a new element into a design), `rename`, `move`, `duplicate`, `delete`, `restore`.
- **Run:** `start`, `stop`, `run` (start and wait), `apply` (apply a proposal), `export`, `import`, `publish`, `unpublish`, `share`.

Never: `fetch`, `load`, `retrieve`, `make`, `add` (use `create`), `remove` (use `delete`), `edit` (use `update` or `set`), `handle`, `process`, `do`.

## 5. Code symbols

| Kind | Form | Example |
|---|---|---|
| file and folder | kebab-case, singular folder | `publication-store.ts`, `handlers/project/` |
| React component file | PascalCase, same as the component | `PublishPanel.tsx` |
| type, class, React component | PascalCase noun | `ProjectStore`, `PublishPanel` |
| service class | `<Noun><Role>`, role from: Store, Runner, Watcher, Queue, Client, Cache | `PreviewRunner`, `SaveQueue` |
| function | camelCase, starts with a verb from section 4 or `to`/`from`/`is`/`has` | `listProjects`, `toWire`, `isEmpty` |
| boolean | `is`, `has`, `can`, `should` + adjective or noun | `isPublished`, `canUndo` |
| schema | `<Name>Schema` | `ProjectSchema` |
| error class | `<Noun><Problem>Error` | `ProjectNotFoundError` |
| event | `<domain>.<pastVerb>` | `project.created`, `design.saved` |
| constant | camelCase; SCREAMING_CASE only for env var names | `maxPageSize`, `STUDIO_GIT` |
| env var | `STUDIO_<NOUN>` | `STUDIO_DATA_DIR` |

Never use: `data`, `info`, `item`, `obj`, `thing`, `stuff`, `manager`, `helper`, `util`, `handle`, `process`, `misc`, `Shape`, or a type suffix such as `Type`, `Interface`, `I` prefix.
Spell words out: `project`, not `proj`; `button`, not `btn`. Allowed short forms: `id`, `url`, `html`, `css`, `jsx`, `mcp`, `ui`, `db`.

## 6. Apps and packages

**Package test:** could someone outside this repo `pnpm add` it and use it without our server, our env or our secrets? Yes: package. No: app.

| Goes in a package | Goes in an app |
|---|---|
| Action definitions: schemas, ids, errors, derived route and tool names | Handlers, services, adapters, the action runner |
| Pure engines: jsx, html, css and tailwind edits, color math, fuzzy match | Git, file system, dev servers, Electron, Workers, D1, R2 |
| UI kit: React parts, tokens, icons | UI features, pages, routing, data fetching |
| Wire helpers: `toWire`, page fields | Env, config, secrets, auth middleware, deploy config |

- **Apps:** `apps/desktop`, `apps/web`, `apps/api`, `apps/publish`. pnpm names `@design-studio/<app>`, all `private: true`.
- **Packages:** `packages/ui` and `packages/common/<name>`. pnpm names `@design-studio/<name>`. First ones: `packages/common/actions` and `packages/common/edit-engine`.
- A package never imports an app or another app's code. A package imports only other packages.
- A package has an `exports` map and a `src/index.ts`. Nothing outside the package imports a deep path.

## 7. Enforcement

- **Stamp:** `pnpm run new:action <domain> <verb>` writes the definition, the handler and all derived names. It refuses a verb that is not in section 4.
- **check-actions:** fails on a hand-written tool name or route that does not match section 3, on a banned verb, and on a banned word in an exported symbol.
- **oxlint:** `unicorn/filename-case` (kebab, PascalCase for `.tsx` components), `id-denylist` for the banned words, `anti-slop/no-shape-in-symbol-names`.
- **boundaries:** a package that imports `apps/**` fails.

## 8. Decisions on the open points (2026-11-01)

- **Pilot ids:** the pilot is `health.get`, not `studio.health`. The W9b smoke stamp is `health.inspect`, not `studio echo`.
- **"domain" everywhere:** a server folder `src/server/<domain>/` holds that domain's services, and `handlers/<domain>/` holds its handlers. It is the same word for the same noun group. The UI layer `src/ui/domain/` becomes `src/ui/model/`, because it holds pure UI logic, not a domain.
- **Run event:** `op.done` becomes `action.finished`, so it has the `<domain>.<pastVerb>` form.
- **Tool name key:** `defineAction` keeps every key required. The `tool` key is `"derived"` or `{ legacy: "<old name>" }`. The adapters build the MCP and agent names from the id when it is `"derived"`.
- **Banned words in templates:** the handler export is `handler`, not `handle`. A UI result is `{ result, error }`, not `{ data, error }`. Placeholders in docs use `<Name>`, not `<Item>`.
- **UI import:** the UI imports `createProject` from the generated `<domain>/routes.ts` (id, method, path, no schemas), so the UI still ships 0 bytes of Effect. `useAction(createProject)` works with that value.
- **Folder number:** role folders that hold many kinds are plural: `apps`, `packages`, `handlers`, `actions`, `features`. Every other folder is singular.
- **Tracked copy:** this file is tracked at `docs/naming.md`. `.claude/goal/patterns/naming.md` is only the draft history.
- **W8-rename also updates:** `scripts/waves.json` ownership globs, `docs/patterns.md`, `docs/patterns/golden/*`, `CONTRIBUTING.md`, and `patterns/AGENTS.md`.
