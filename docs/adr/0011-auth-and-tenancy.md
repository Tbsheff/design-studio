# ADR 0011: Accounts, orgs and tenant boundaries

- Status: Proposed
- Date: 2026-10-31
- Deciders: Tyler Sheffield
- Supersedes: ADR 0001 (one publish Worker per Cloudflare account)
- Builds on: ADR 0010 (Effect and enforced layers)
- Executable plan: `.claude/goal/auth-tenancy-plan.md`

## Context

Tyler asked for better auth and real tenant boundaries, so the studio becomes a real application.

Today the app trusts one OS user on one machine:

- **No identity.** No user, org or tenant field exists in any record. Comment `author` is free text (`src/shared/contracts.ts:433`).
- **One studio token.** `/api/session` hands it to any local process that sends `sec-fetch-site: same-origin` (`src/server/http/app.ts:563-566`). The check uses `!==` (`app.ts:573`). The token gives every right.
- **One MCP bearer.** All clients share it, and it leaks through `GET /api/mcp` (`src/server/mcp/server.ts:271`). Client names are self-asserted (`server.ts:147-152`). In-process edit calls carry the full studio token (`src/server/http/mcp-routes.ts:69-74`).
- **Secrets in records.** `AttachedApp.env` and absolute paths sit inside `project.json` (`contracts.ts:51,150,166-171`).
- **Sharing needs this Mac.** Share links are served from a local listener. Publish uses one person's `cf` login.
- **ADR 0001 is single-tenant.** It puts one publish Worker in each user's own Cloudflare account.

Two designs were judged: (A) one shared D1 with `org_id` on every row and one `TenantDb` gate, and (B) one Durable Object per org with an auth Worker. Three red teams then attacked A. They found that A isolated the cloud well, but it had no org boundary on the Mac, and it trusted local callers too much.

## Decision

1. **Host one multi-tenant plane.** One Worker `apps/api`, one D1 `studio`, one R2 bucket `studio-files`, Durable Objects for rate limits and live pings. Orgs are rows. Every user gets a personal org after email verification.
2. **Use Better Auth 1.7.x** with the organization, api-key, jwt, bearer and electron plugins. Roles: owner, admin, member, viewer. Agents are org API keys whose perms are the key perms intersected with the acting member's current role. Agents can never hold publication, member, apiKey or policy perms. An agent publish or share waits for a user to confirm it.
3. **Enforce isolation in one gate, fail closed.**
   - `TenantDb` binds `org_id` from `CurrentOrg`. Repo methods never take an org id.
   - A strict `tq` SQL classifier throws at boot on any unscoped or unknown SQL.
   - Every row read and every `RETURNING` row is checked against `CurrentOrg`.
   - A boundary script bans raw bindings, raw SQL and `getSession` outside their allowed files.
   - The org comes from the URL path for members and from the key for agents. The server checks it against D1 on every request.
4. **Add an org boundary on the Mac.**
   - Each project's org binding and its absolute paths move to `bindings.json` (mode 0600, written by the server only). The Worker signs a `cloudRef` for each org binding.
   - Every local principal carries an org. Every local lookup, read tools included, filters on it.
   - In-process calls carry the principal in the Hono request env. After ADR 0010 they carry it as a required service. A call with no principal gets 403.
5. **Close the local trust gaps first (phase 0).**
   - Packaged builds give the studio token only over Electron IPC.
   - Every route checks `Host` and compares the token in constant time.
   - Approvals are answered over IPC.
   - `GET /api/mcp` holds no secret.
6. **Keep the Mac local-first.**
   - **Never synced:** attached app source, paths, env, command rules, `allowBash` and `allowInstall`.
   - **Metadata only:** attached projects sync metadata only.
   - **Full trees:** native designs sync full trees after a refusal check for executed config files, package scripts, dot folders and symlinks.
   - **Opt-in upload:** first upload is a choice made per project.
   - **Untrusted text:** text from anyone other than the run's user reaches agents in an untrusted envelope, and that run loses Bash.
7. **Move shares and publications to the cloud** on a separate user-content domain. Passwords are checked on the server at 100k+ PBKDF2 rounds, with a lockout. The cookie MAC covers org, slug and publication.

## Consequences

**Good:**

- **One org's rows cannot reach another org** through a forgotten `WHERE`. The gate fails at boot or dies on the row.
- **A key for one client org cannot read another client's designs** on a consultant's Mac.
- **Share links and published sites work with the Mac off.**
- **Each MCP client has its own name, scope and revoke.**
- **Local ids upload unchanged**, because the key is `(org_id, id)`. A heavy org can later move to a per-org DO with no id change.

**Bad or risky:**

- **No database-level row security.** D1 has none. The boundary is static plus runtime checks. Reviews must watch the allowlists.
- **No transactions.** D1 has none, so Better Auth org operations can leave partial rows. Hooks must be idempotent, and a sweep must clean up.
- **One writer.** One D1 has one writer and a 10 GB cap.
- **More cost.** Workers Paid is required for scrypt and 100k PBKDF2.
- **Not proven yet.** These need a probe: D1 composite foreign keys, scrypt CPU on workerd, `tq` throwing on unknown SQL, and several Better Auth defaults (`metadata` writability, `requireEmailVerificationOnInvitation`, owner guards, `enableSessionForAPIKeys`). The plan sets each one explicitly or blocks it with a hook.
- **Prompt injection is reduced, not removed.** Capability drops limit the damage.

**Not chosen:**

- **One Durable Object per org (B).** It isolates the cloud best. But it needs three Workers, migrations for each DO, admin work spread across DOs, one active org per local server, and a new deep-link scheme that breaks the current `open` and `new` links. It stays the escape path for big orgs.
- **One D1 per org.** D1 bindings are fixed at deploy time.
- **A session-wide active org.** Two windows could write into each other's org.
- **An HMAC principal header for in-process calls.** Any holder of the studio token could forge it.
- **`effect/http-api` for Worker routes.** ADR 0010 bans unstable Effect modules. A small typed group wrapper on Hono is used instead.
