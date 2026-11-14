# Cycle 27 pick 3: starter-look

Branch `feat/starter-look`. Commits `0f49054dd` (theme), `f1e3a232b` (agent run), `5d06752c7` (chat), the Look sync fix, and this report.

## What changed

- New `server/style-scope/theme/theme-starter.ts`. It builds 3 looks with the theme engine (`toThemes`, seed 1, the run prompt as the brief, distinct names). The first look becomes `design-system/tokens.json` (the 10 `ROLE_PATHS` colors with dark values, `font.display`, `font.body`, `radius.md`), a valid `pack.json` (id `starter-look`) and the compiled `tokens.css`. It writes only when no `tokens.json` exists.
- `theme-run.ts`: `theme.create` on a blank HTML prototype writes the starter as one "Starter look" version, then builds the themes. App projects and folder prototypes keep `NO_TOKENS`. `create.ts` description: one sentence added, and "Writes no source file" became "Writes no page file". `create_theme` is in no `artifacts/mcp-snapshots/*.json` file, so this description change needs no snapshot decision at merge.
- Run hook: `isStarterLookRun` in `agent/new-page.ts` (exported from `agent/index.ts`). It uses `isNewPageRun` and adds these exclusions: no design system, no `packId`, no app prototype or imported folder, not wireframe, not lean. Ask mode, selections and apps are already off in `isNewPageRun`.
- New `main/starter-look-driver.ts`, wired in `main/agent-runner.ts` (1 line). **Deviation from the spec:** `agent/` cannot run Effect code (S16), and the Look record needs the run id. So the wrapper sits in `main`, next to `mock-prototype-driver.ts`.
  - Before the first turn, it writes the starter and reloads `designSystem` for the prompt.
  - The agent therefore gets the standard design-system rules and the token list. No new prompt line was needed.
  - After a completed run, it records the "Look" choice through `create_decision_run`, so the `action.done` event refreshes the chat.
- `ui/features/chat/use-decision-row.ts`: a pick on the "Look" chip calls `theme.apply` with the stored theme that has the same name. It makes no model call and no follow-up run. Every pick applies. The answer "The token values are already set" counts as success, so the chip cannot stick after Cmd+Z or a reload. The chip hides while its run is running. `copy.ts`: `decisionLook: "Look"`. `decision-row-chip.tsx` needed no change.
- `agent/mock.ts`: the mock landing page reads `--bg`, `--fg`, `--primary` and the other role tokens, with its old values as fallbacks. Without this, a click on Look did not change the mock page.

## Checked

- Mock run, blank "bakery landing page":
  - The starter files landed 26 to 34 ms after run start.
  - First `write.delta` was at 0.37 s. A mock run with no starter was also at 0.4 s.
  - One run version holds `index.html` and the 3 design-system files.
  - The Look row shows "Amber Sans | Teal Serif | Indigo Sans".
- Click on option 2:
  - It made 1 version through `themes/apply`.
  - The page background changed from hue 48 to hue 170, and the CTA color changed.
  - Cmd+Z (`edit-history/undo`) restored the exact old colors.
  - After the undo, a pick on option 2 and then on option 1 changed the colors each time, with no error text.
- The cases where the starter must stay off:
  - Design-system project (`modern-minimal`): no Look record, no themes file, `packId` stays `modern-minimal`.
  - Wireframe run: no starter.
  - Attached app: not run. `isNewPageRun` and `isStarterProject` exclude `project.app` in code.
- `pnpm exec tsx scripts/call-action.ts theme.create '{"projectId":"kVBOOe0Ni9","directionId":"main","brief":"coffee cart menu","count":3,"seed":7}'` on a blank prototype with no run: pass, 3 surfaces, 0 diffs. It wrote the 3 files and made one "Starter look" version. No new action, so this is the only call-action proof.
- `pnpm run typecheck`, `pnpm run lint:gate` (pass, 59612 against a baseline of 89733), `pnpm run build:ui` and `gen-routes --check` pass.

## Real model, 2 runs ("bakery landing page", Sonnet 5.5, local sign-in)

| | before (main) | after (branch) |
|---|---|---|
| first `write.delta` | 3.0 s | 3.2 s |
| first `index.html` on disk | 24.7 s | 18.5 s |
| run time | 87.8 s | 59.4 s |
| color literals in `index.html` | 21 (7 in its own `:root`) | 3 (`rgb(0 0 0/.1)` shadows) |
| links `design-system/tokens.css` | no | yes |
| `review` findings | 2 (`type`) | 0 |
| output tokens | 8554 | 5220 |
| cache write tokens | 49868 | 38756 |
| cost | $0.247 | $0.176 |

The run log has no `firstDraftMs` field, so the table uses the first `write.delta` and the first `files.changed` of `index.html`. Each column is a single run, so the time and token gains include run-to-run variance. The starter adds no model call and no tokens of its own, and the write takes about 30 ms.

## Screenshots

`cycle-27/starter-look/`:
- `real-before-{dark,light}.png`, `real-after-{dark,light}.png`: the two real pages.
- `look-row-{dark,light}.png`, `look-menu-{dark,light}.png`: the Look row and its menu.
- `look-picked-{dark,light}.png`: after a click on option 2, mock page.

## Left out and open

- In the dark shot, the frame showed light values after `theme.apply`. `tokens.css` still has its dark blocks. This bug is older than this branch: `theme.apply` on a `modern-minimal` project also turns the dark frame light (body background lightness 0.17 before, 0.99 after). It is a runner-up, not part of this pick.
- The engine fonts are system stacks (no Google Fonts), and the radius is fixed at 10px.
- A run may record at most 3 choices. If the agent records 3, the Look choice is not recorded, and the starter tokens stay.
- After a starter run, `pack.json` id `starter-look` is on disk. `packId` stayed unset in the checks. The design-system panel was not checked with this pack.
- `.claude/goal/roadmap.md` is not in the worktree, so Appendix A was not changed (L6e).
- Shared-file touches outside the spec list: `main/agent-runner.ts` (1 line), `agent/index.ts` (1 export line, same block area as pick 1), `agent/mock.ts` (5 lines).
