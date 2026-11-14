# Real agent runs 3: inspect_port scope fix

Date: 2026-11-14. Branch `fix/port-scope`. Agent: real Claude Agent SDK (`agent: sdk`), model `claude-sonnet-5-5`. No mock for the 3 runs.

Setup: server from `apps/desktop` (`pnpm --config.verify-deps-before-run=false exec tsx src/server/index.ts`), `STUDIO_MCP=on`, `STUDIO_MCP_EDITS=on`, ports 5870/5871/5875, app ports from 7700, MCP 4590, data in `ds-wt/port-scope-data`, projects in `ds-wt/ps/projects`. Fake Next 16 app: `ds-wt/ps-next-app` (a copy of `ds-wt/port-next-app` with only `layout.jsx` and `page.jsx`). Scripts and raw run JSON: `ds-wt/ps/`. Server and app dev server stopped after the runs.

## Fix

| Commit | Change |
|---|---|
| `8eb1dc45a` | `mcp/registry.ts` `toScopedArgs`: for `port.inspect`, the run project fills `targetProjectId`. `projectId` and `directionId` stay as sent. Other actions keep the old scope. |
| `e87d94946` | `agent-tools/registry.ts`: the `inspect_port` agent schema keeps `projectId` and `directionId` and drops `targetProjectId`. `mcp/agent-call.ts` `runAgentTool` takes the scope project from `targetProjectId` for `port.inspect`. `TARGET_SCOPED_ACTIONS` in `agent-tools` is the one list. |

Why 2 commits: real run 2 showed that commit 1 was not enough and broke the studio check.
- The agent schema dropped `projectId` for every action, so the agent's `inspect_port` failed with `Missing key at ["projectId"]`, also when the agent sent it.
- `runAgentTool` (the studio port check) builds the run scope from `args.projectId`. After commit 1 it set `targetProjectId` to the prototype, so the check compared the prototype with itself (diff file `zRWNR4uzHp-zRWNR4uzHp-_coffee-cart-1280-diff.png`) and scored 4.

Gates: `pnpm run typecheck` pass, `pnpm run typecheck:tsrs` pass, `pnpm run lint:gate` pass (59612, baseline 89733), `pnpm run build:ui` pass.

## Runs (3 of 3 budget)

| # | Run id | Project | What | Time | Cost | Result |
|---|---|---|---|---|---|---|
| 1 | `t2ipURZMWb36L3SjFlwn_` | `zRWNR4uzHp` (HTML, image search on) | coffee cart page: hero photo, 3 menu cards with photos, footer | 97.4 s | $0.226 | Pass: 4 of 4 photo slots filled; "Studio check:" line shows |
| 2 | `Su_JOfz2PiiIX7f2opJXI` | `OR0gt6_M0C` (Next app), commit 1 only | Move to app: `index.html` to `/coffee-cart` | 273.6 s | $0.204 | Fail: agent `inspect_port` "Missing key projectId"; studio check score 4 (wrong ids); fix loop with no gain |
| 3 | `G8FK2ri-58MCauIiMq_WH` | `OR0gt6_M0C`, both commits | Move to app: photo-free copy `61HqkcGGGD` to `/coffee-cart-plain` | 21.3 s | $0.095 | Ids pass through (no swap, no missing key). No score: the hand-made prototype had no saved version (setup error) |

Total: $0.524.

### Run 1: photos and studio check

- `projects.create` with `settings.imageSearch: true`. The agent called `apply_image_search` 3 times (11.7 s, 6.1 s, 10.5 s). The page has 4 `<img>` tags, all local `assets/*.jpg|webp` files from Openverse. No gray slot is left.
- Note: "Studio check: the agent skipped the mobile screenshot and review_frame after its last edit, so the studio ran them (desktop and 390 px); pass 1: 3 finding(s) on changed lines, a fix loop ran; pass 2: 0 finding(s) on changed lines, no fix loop."
- Usage: 7,087 output tokens, 43,465 context tokens. Model 50.6 s, tools 50.5 s.

### Run 2: port before the second commit

- The agent spent 229.6 s of 273.6 s in tools. Most of it: `find / -name <asset>` (120.4 s), `find ~/Library /Volumes/DevProjects/code` (60.3 s), and more searches, also in `design-studio/studio-data`. See bug 1.
- `inspect_port` with `projectId: "zRWNR4uzHp"`, `targetProjectId: "OR0gt6_M0C"`: failed twice with `Missing key at ["projectId"]` (fixed by commit 2).
- "Studio port check: score 4 (...), route renders, a fix loop ran; after it score 4 (...)". The score is wrong because of commit 1 (fixed by commit 2).

### Run 3: port after both commits

- The agent called `inspect_port` with `projectId: "61HqkcGGGD"`, `targetProjectId: "OR0gt6_M0C"`. The handler got the prototype id: it failed with "The first version of this app is not saved yet", which is the prototype's state, not the app's. Before the fix, this id was the app id.
- Cause of no score: I wrote `index.html` of `61HqkcGGGD` by hand with `startRun: false`, so the project had no version. Not a fix problem; see bug 2 for the text.
- "Studio port check: no score (...), route renders." No fix loop ran.
- After the run I kept a version (`POST /api/projects/61HqkcGGGD/d/main/keep`) and checked the same route with no model.

### Score check with no model

`pnpm exec tsx scripts/call-action.ts port.inspect '{"projectId":"61HqkcGGGD","targetProjectId":"OR0gt6_M0C","path":"index.html","routePath":"/coffee-cart-plain"}' --port 5870` (server in mock mode, same data):

- http, mcp and agent: ok, score 40 on each, 0 diffs. Diff file `61HqkcGGGD-OR0gt6_M0C-_coffee-cart-plain-1280-diff.png` (prototype id, then app id).
- 40 is a sensible score for this route: the agent left out the Fraunces and Inter fonts and used Tailwind stone and orange in place of the prototype colors. The worst area is 19, the best 58.

Not checked: an agent-run `inspect_port` that returns a score, and a studio port check that passes with no fix loop. The run budget ran out.

## Bugs

1. **Port runs lose the prototype's photos.** The port prompt has the prototype HTML (`<prototype-source>`) but not the prototype folder, so the agent cannot find `assets/*.jpg` that `apply_image_search` wrote. In run 2 it searched the disk for about 3 min (`find /` 120 s), also in the user's `design-studio/studio-data`, then shipped a route where 4 images return 404. Cause: `toPortPrompt` in `src/server/agent/port-start.ts` does not give `input.source.direction.workTree` or copy the assets. Expected: the studio copies the prototype assets into the app (for example `public/<route>/`), or the prompt names the source folder. This also drags the port score down.
2. **Minor: wrong text for a prototype with no version.** `firstVersionWaitText` (`src/server/app/first-version.ts`) says "The first version of this app is not saved yet. Try again in a few seconds." for an HTML prototype with no head version (`preview/file-read.ts`, `preview/frame-source.ts`). It is not an app, and a retry never works. The agent retried once. Steps: create an HTML project with `startRun: false`, write `index.html`, then `inspect_port` on it.
3. **Minor: 3 `apply_image_search` calls in one run.** Run 1 called it 3 times on `index.html` (28.3 s in all). Not checked whether the later calls changed any slot.
4. **Known: hydration warning.** `render_check` and the studio baseline report the Next 16 hydration warning on every route (2 console errors), as in cycle 26.
