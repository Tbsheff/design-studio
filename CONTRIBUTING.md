# Contributing

Thanks for helping with Design Studio.

## Before you start

- Read [ARCHITECTURE.md](ARCHITECTURE.md). The rule is: the filesystem owns the design, the agent edits it, the studio renders it.
- Open an issue first for a large change, so we can agree on the approach.

## Code rules

- TypeScript strict, ESM, Node 24.
- No code comments. Use clear names instead. Copied third-party files keep their one-line source comment.
- Keep files small. Split a file before it grows past about 1,000 lines.
- Do not add a new model client. All model calls go through the Claude Agent SDK.

## Add an action

Follow [AGENTS.md section 2](AGENTS.md#2-how-to-add-an-action). [docs/patterns.md](docs/patterns.md) lists the golden file and the template for each kind. `studio.listSkills` is the worked example.

1. Stamp the action. The stamp writes the definition and the handler, and regenerates the routes and the lists:

   ```sh
   pnpm run new:action studio listSkills --access read --scope device --needs studio.read \
     --method GET --path /api/skills --description "<STE text>" \
     --mcp list_skills --agent list_skills --agent-set core --agent-short "<STE text>"
   ```

2. Fill `input` and `output` in the definition. Put shared schemas in `src/shared/actions/<domain>/schema.ts`.
3. Fill the handler. Yield one service. If no service fits, stamp one: `pnpm run new:service <area> <Name> --access read|write`, then add its layer to `src/server/handlers/<domain>/live.ts`.
4. Remove `NotImplemented` from `errors`, and list the real error tags.
5. Delete the legacy route, if one exists. The mounted action serves the path.
6. In the UI, call the action with `call(routes.<name>, input)` from `src/ui/platform/http.ts`.
7. Prove it: `pnpm exec tsx scripts/call-action.ts <action id> '<json>'`.

Use `pnpm run new:domain`, `new:error` and `new:feature` for the other kinds. Never copy an action, route, tool or handler by hand.

## Setup

This repo uses pnpm 11. Do not use npm or npx. Install the dependencies (run app scripts from `apps/desktop`, or use `pnpm --filter @design-studio/desktop run <script>`):

```sh
pnpm install
```

## Checks

Run these before you open a pull request:

```sh
pnpm run typecheck
pnpm run typecheck:tsrs
pnpm test
pnpm run build:ui
pnpm run e2e
```

Run `pnpm run e2e:desktop` too when you change `desktop/`.

## Pull requests

- One topic per pull request.
- Say what changed and how you tested it.
- Add or update tests for behavior changes.
- Do not commit `studio-data/`, screenshots from your machine, `.env` files or keys.

## License

By contributing, you agree that your contribution is licensed under the Apache License 2.0.
