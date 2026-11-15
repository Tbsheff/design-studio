# dyn-route: Move to app keeps the [id] route and its asset folder

Branch `feat/dyn-route`. Fake app `ds-wt/dyn-next` (copy of `ac-next-b`, routes `/visits` and `/visits/[id]`, image `public/clinic.png` on the visit page). Mock agent (`STUDIO_AGENT=mock`), data dir `ds-wt/dyn-route-data`, studio port 6810.

## Proof on main (before the fix)

- Route copy: `create_prototype_project` with `routePath: "/visits/1"` (no fixture). `inspect_source_page` gives `routePath: "/visits/1"`.
- Flow plan (`get_port_plan_workspace`, route `/visits/1`): page route `/visits/[id]`, `routeFile: app/visits/[id]/page.tsx`, `routeExists: true`. The server plan already maps the fixture path to the pattern.
- Dialog default route: `/visits/[id]`, note "Updates app/visits/[id]/page.tsx in Dyn Next." (`proof-main-dark.png`). The default-route gap from cycle 35 is already closed on main.
- Typed `/visits/1`: no error, Start on, note "Updates app/visits/[id]/page.tsx" (`proof-main-typed-dark.png`).
- Mock move with `/visits/[id]`: writes `app/visits/[id]/page.tsx`, assets go to `public/id/` (`11cfa40b47b4.png`, `tokens.css`). This is the real bug.
- `port-plan.ts` line 1119 (`portPageSlug(page)`) names flow sub-routes from page files; it is not the asset folder. Not changed.

## Changes

- Added `server/agent/port-asset-slug.ts`: `toAssetSlug(route)`. A route with a dynamic segment (`[id]`, `[...slug]`, `[[...slug]]`) joins its static segments with "-" (route groups left out); only dynamic segments gives `page`. A static route keeps the old last-segment rule, so no static route changes (`/settings/profile` stays `profile`).
- Changed `server/agent/port-assets.ts`: `toAssetTarget` calls `toAssetSlug`.
- Added the refusal in `ui/features/design-system/port-model.ts` (`toFixturePattern`, `toFixtureText`): when the plan page is an existing dynamic route and the typed route is a fixture value of it, the dialog shows "This page is a copy of /visits/[id]. Move it to /visits/[id], or type a new route." and Start stays off. `toRouteUpdate` returns null in that case. 3 strings in `design-system/copy.ts`. `port-model.ts` is 355 lines.

Slug check: `/visits/[id]` -> `visits`, `/orgs/[org]/visits/[id]` -> `orgs-visits`, `/[id]` and `/[...slug]` -> `page`, `/docs/[[...slug]]` -> `docs`, `/visits` -> `visits`, `/(design)/classes` -> `classes`.

## Verified after the fix

- Dialog default: `/visits/[id]`, Start on (`dialog-default-dark.png`, `dialog-default-light.png`).
- Typed `/visits/1`: refusal text, Start off (`dialog-typed-dark.png`, `dialog-typed-light.png`).
- Mock move from the dialog: writes `app/visits/[id]/page.tsx`; assets in `public/visits/` (`11cfa40b47b4.png`, `tokens.css`); run prompt line `assets/index/11cfa40b47b4.png -> /visits/11cfa40b47b4.png`. No `app/visits/1/`, no `public/id/`.
- Static copy `/visits` and move: `app/visits/page.tsx`, assets in `public/visits/`, same as main.
- MCP `start_port` with `route: "/visits/[id]"` (mock run): writes `app/visits/[id]/page.tsx`, assets in `public/visits/`. `toAssetTarget` is the only place that names the asset folder.
- Plan for typed `/visits/new`: `routeExists: false`, `routeFile: app/visits/new/page.tsx`, so a new sibling route is not refused.
- `call-action.ts port.inspect` on dyn-next (`routePath: "/visits/[id]"`): pass, 3 surfaces, 0 diffs, score 82.
- `pnpm run typecheck`: pass. `pnpm run lint:gate`: pass (59575, baseline 89733). `pnpm run build:ui`: pass. `check-bundle`: B1 274,673 B (delta 0), same Home chunk list. `check-actions --probes`: 278 hits, same as main (no new hit).
- No action, input, output or description change. No snapshot diff.

## Differences from the spec

- Default route: no code change. Main already shows `/visits/[id]` because the flow plan maps `/visits/1` to the existing `[id]` route, and `toSourceRoute` uses it. `use-port-form.ts` is not changed.
- The note for the default route is the existing "Updates app/visits/[id]/page.tsx in Dyn Next." (file path), not "Updates /visits/[id]".
- With the refusal on, the footer says "Writes one new route file in Dyn Next." Start is off, so nothing runs.
- The mock agent does not write the image `src` into the page, so "the page src points there" is shown by the run prompt asset line, not the file.

## Left out

- `[[...slug]]` routes in the UI refusal: `isPatternOf` matches only single dynamic segments, so a fixture path for a catch-all route gets no refusal.
- No real-model run (spec budget 0).
