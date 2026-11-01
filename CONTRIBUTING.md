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

## Add an endpoint

Follow [AGENTS.md section 2](AGENTS.md#2-how-to-add-an-endpoint). Copy the golden files that [docs/patterns.md](docs/patterns.md) lists.

The `pnpm run new:op` stamp lands after S4b, with the S4s wave. Until then, write the op contract and the handler from the golden files, then run `pnpm exec tsx scripts/gen-routes.ts`.

## Setup

This repo uses pnpm 11. Do not use npm or npx. Install the dependencies:

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
