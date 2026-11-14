# Cycle 25 pick 2: draft-first

Branch `feat/draft-first`.

## What changed

- New-page runs at PROTOTYPE and POLISH use a new step order: 0. a 2-line brief (audience, primary action); 1. the full first page in one Write, with no TodoWrite, ToolSearch or Skill call before it; 2. TodoWrite with a completed draft todo and the steps that are left; 3. Skill loads, before the fix round; 4. render_check and the rest, as before.
- The `<recommended-skills>` line changes to "After your first draft, before the fix round, ..." on these runs (`DRAFT_LOAD_ORDER`, `toDraftLoadOrder` in `skill-match.ts`).
- Edit runs on a page that already exists, WIREFRAME, app runs, tasks (tweaks, port, design system), runs with a selection and ask or critique runs keep the old order.
- New page (`server/agent/new-page.ts`, `isNewPageRun`): an HTML run whose target file (`ctx.target.routeFile`, else `project.entry`) does not exist yet.
- No new action and no MCP or agent tool change, so `scripts/call-action.ts` does not apply. The change is the in-app agent prompt only.

## Route of the flag (differs from the spec)

The spec put the flag in `prompt.ts`. `RunLevelContext` is built in `sdk-driver.ts` (`prepareMessage`), which pick 1 owns, so that route does not exist. The flag goes this way: `buildUserMessageParts` (`user-message.ts`, async, has `ctx`) sets `UserMessageParts.isNewPage`. `withRunLevel` (`run-level.ts`) reads it, merges it into `RunLevelContext`, and swaps the skill line in the text. `sdk-driver.ts`, `tool-sets.ts` and `prompt.ts` are not changed.

`user-message.ts` was at 499 lines, so `toSdkPrompt` moved to the new `sdk-prompt.ts`, re-exported from `user-message.ts` with no change for callers.

## Proof

Real model (local Claude Code sign-in, `claude-sonnet-5-5`), blank HTML project, prompt "A landing page for a neighborhood bakery", level prototype. Times are from `run.started`.

| | Before (main) | After (branch) |
|---|---|---|
| First draft bytes (`run.write.delta`) | 8.6 s | 3.5 s |
| Draft complete (Write tool call starts when its input closes) | 31.4 s | 24.8 s |
| Run finished | 84.1 s | 85.5 s (+1.7%) |
| Tools before the first write | ToolSearch, 2 Skill, TodoWrite | none |
| Skill loads | 2 | 1 (after the draft) |
| `review_frame` type findings | 3 | 3 |
| Studio final check | 0 errors, 0 high, 0 medium | 0 errors, 0 high, 0 medium |
| Cost | $0.25 | $0.21 |

Both runs end with the same studio screen check note (the agent took no screenshot of 2 screens, the studio took them, one fix loop). The after run loaded 1 skill, not 2: the model chose it, the recommended list was the same.

The run log user turn of the after run has the new order and the new skill line. A local check of `withRunLevel` gave the new order for a blank project (PROTOTYPE and POLISH) and the old order when `index.html` exists.

Screenshots (mock agent, blank project, draft frame while it fills): `cycle-25/draft-first/draft-3.5s-{dark,light}.png`, `draft-5s-{dark,light}.png`. Result of the real after run: `real-after-{dark,light}.png`.

Checks: `pnpm run typecheck` pass, `pnpm run lint:gate` pass, `pnpm run build:ui` pass.

## Left out

- React projects keep the old order. A React template already has `App.tsx`, and the Write tool refuses to overwrite a file that was not Read first, so a write-first step would fail there.
- `.claude/goal/roadmap.md` is not in the worktree, so Appendix A was not changed.
- Merge follow-up: after pick 1 lands, point `sdk-driver.ts` at `sdk-prompt.js` and delete the `toSdkPrompt` re-export in `user-message.ts`.
- `TodoWrite` up front (not deferred behind `ToolSearch`) needs a change in `sdk-driver.ts`. Left for the merge step. With the new order the ToolSearch turn comes after the draft, so it no longer delays the first bytes.
- The draft screenshots use the mock agent. A third real run only for screenshots would go past the 2-run limit.
- One real run per side, so the times have model noise.
- After a merge with pick 1, read one run log again to check the start order and the studio check at the end.
