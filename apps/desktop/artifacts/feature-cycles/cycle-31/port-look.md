# Cycle 31 pick 3: port-look

Branch `feat/port-look`. Move to app of a new route now keeps the prototype fonts and colors when the app has no token.

## What changed

- **Added** `agent/port-look.ts`: reads the look facts. It reads the prototype CSS: the inline `<style>`, the local linked stylesheets (for example `tokens.css`), `var()` font stacks, Google Fonts `family=` links, and `design-system/pack.json` fonts as a fallback. It reads the app facts: the root layout, `next/font/google` imports, the global CSS that the layout imports (else `findTokenFile`), `@font-face`, `@theme --font-*`, Tailwind 4 detection, and the app token entries.
- **Added** `agent/port-look-css.ts`: pure CSS and font parsing.
- **Added** `agent/port-look-lines.ts`: the plan lines.
  - **Fonts list:** each prototype font is shown with its matching app font, or "not in the app" plus a rule: next/font in the layout, a `--font-<name>` entry in the Tailwind 4 `@theme`, and use only on the elements that use it. Next with plain CSS, and plain CSS without Next, each get their own rule.
  - **Token lines:** a token with no app token now gets its value, also from linked CSS.
    - Tailwind 4 gets `--ink = #1c1917 -> no app token: add --color-ink in @theme; use text-ink, bg-ink or border-ink`, and the list ends with one line that names the `@theme` block in `app/globals.css`.
    - Plain CSS gets `add --ink on :root; use var(--ink)` and one line that names the CSS file.
    - A near app color still wins through `matchColor`.
    - A `--font-*` token gets "see Fonts".
- **Changed** `port-plan.ts`: `portPlanText(plan, look)` calls the two line builders. The file went from 1298 to 1295 lines.
- **Raised** `PLAN_TEXT_MAX` from 6000 to 7000. A synthetic page with 20 sections, 20 images, 20 links and 15 new tokens makes a 6612-character plan (5022 before). At 6000 the cut dropped the Links tail and the "Do not copy" line. At 7000 nothing is cut.
- **Changed** `port-start.ts`: computes the look once per page run and once per flow (one app read per flow). The file went from 486 to 497 lines.
- **Kept** the `PortPlan` type, `get_port_plan` output, and the `start_port` description. No new action, so there is no gen-routes change.

## Verify

Setup:
- **App:** `ds-wt/rf-new-tw`, Next 16.4.1 and Tailwind 4.2.2. `node_modules` is a dereferenced closure from the Bonaparte pnpm store (read only). It has Inter only, through next/font, and no `--ink`.
- **Prototype:** "Cafe menu". It has Fraunces headings, an Inter body, and `--ink`, `--paper`, `--accent` and `--line` in a linked `tokens.css`.
- **Branch app copy:** `ds-wt/rf-new-tw-branch`, a `git clone --local` of the same app.

Real-model runs (Sonnet 5.5, Move to app as new route `/menu`):

| Gate | main | branch |
|---|---|---|
| h1 `font-family` | Inter (fails) | **Fraunces** |
| ink text `color` | rgb(0,0,0) (fails) | **rgb(28,25,23) = #1c1917** |
| price `color` (accent) | rgb(0,0,0) | **rgb(180,83,42) = #b4532a** |
| raw colors in `app/` outside `@theme` | 0 | 0 |
| port score (first, after the fix loop) | 67, 67 | 47, **98** |
| time, cost | 39.4 s, $0.18 | 52.5 s, $0.22 |

- **main:** the agent closed with "the cream background, serif headings and accent-colored prices are still missing. The plan maps them to no app token, and I'm not allowed to use raw colors."
- **branch:** the agent added `Fraunces` with next/font in `app/layout.tsx`. It added 4 `--color-*` entries and `--font-fraunces` to `@theme`, and used `font-fraunces`, `text-ink`, `bg-paper`, `border-line` and `text-accent`.

No-model and surface checks:
- **Plan text (tsx script):** shows the Fonts list and the `@theme` rules for the Tailwind app. A plain CSS Next app gets the `:root` rule and the next/font rule. An `@font-face` app font matches.
- **Flow:** MCP `start_port` with `flow: true` (mock agent) on a 2-page prototype. The stored prompt has 2 `<port-plan>` blocks, each with a Fonts list. The app is read once per flow.
- **MCP `start_port`** (mock agent, route `/menu-mcp` on the branch app, after the real run): the stored run prompt maps every token to the new app tokens (`--ink -> --color-ink`). It shows "Fraunces -> app font Fraunces (next/font in app/layout.tsx)". This proves the match path over MCP.
- **`call-action.ts port.start`:**
  - **http:** passes.
  - **mcp:** returns "A run is in progress". This is the one-run rule, because the http call had just started a run.
  - **agent:** skipped, because the agent binding is `off: run-control`.
  - The MCP path is proven by the run above.
- **`pnpm run typecheck`:** passes.
- **`pnpm run lint:gate`:** passes (59599 diagnostics, baseline 89733).
- **`pnpm run build:ui`:** passes.

Screenshots in `cycle-31/port-look/`:
- `ported-route-dark.png` and `ported-route-light.png`: the studio with the ported `/menu` frame and the 98% port check row.
- `app-route-main.png` and `app-route-branch.png`: the route on main and on the branch.

## Notes

- **Wording changed after the real runs.** The token lines were made shorter after the branch run, to fit the plan limit. The facts and the rule did not change. The branch run used the longer wording: `add --color-ink: #1c1917 to the @theme block in app/globals.css and use text-ink, ...`.
- **Commit hook missed a tsc error.** Commit `73f8f6660` has a tsc error (`context` is possibly null in `port-look.ts`), and the commit hook let it through. `b03bdafe2` fixes it, and `pnpm run typecheck` passes at the branch tip.

## Left out

- Prototype inline `style="font-family:..."` attributes are not read. Only `<style>` blocks and linked CSS are read.
- `@import` inside a linked stylesheet is not followed. Its Google Fonts URL still gives the family names.
- Not checked: the near-color rule on an app whose design system context has entries but where the token value comes only from linked CSS. The code path is the same `matchColor` call as before.
