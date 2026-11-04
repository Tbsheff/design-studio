# ADR 0012: Workspace packages stay private for now

- Status: Accepted
- Date: 2026-11-03
- Deciders: Tyler Sheffield
- Builds on: ADR 0010 (Effect and enforced layers)

## Context

N7 says a package must work with `pnpm add` outside this repo. `@design-studio/actions`, `@design-studio/contracts` and `@design-studio/ui` export raw `.ts` files and set `private: true`, so an outside install cannot use them today.

## Decision

The 3 packages stay private and export source. The apps read them through the `paths` in the root `tsconfig.base.json`, and the desktop server build bundles them, so no shipped app loads a raw `.ts` file. A package still has no import from an app and no config from an app.

## Consequences

- A build step to `dist` waits until a package has an outside user. That step then adds `dist` exports and removes `private`.
- `studio/package-no-app-config`, `studio/package-export-named` and `studio/no-app-import` keep the packages ready for that step.
