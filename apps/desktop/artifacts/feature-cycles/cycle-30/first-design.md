# Pick 4: first-design

Branch `feat/first-design`. Home files only, plus one stall fix.

## Measure on main (before)

- Home with 0 projects showed a fixed placeholder, "Describe what to design…". The rotation never ran: `useExample` got `fixed = placeholder === null`, and the placeholder was not null on an empty Home, so the examples did not show in any state. A new user had no example to take.
- Real run (Sonnet 5.5, 1 draft, fresh data dir), prompt "Wireframe a settings page": 2 steps (type the prompt, Enter). First painted draft 22 s, run end 72 s, $0.22.
- Stall: the chat said "Starting" with a spinner for the whole run (19 s at first paint, while the canvas said "Writing index.html · 7 KB"). Shots: `cycle-30/first-design/main-*.png`.

## Built

- **Tab takes the example.** In an empty prompt with no app chip, Tab puts the shown brief in the prompt; the rotation stops because the prompt is no longer empty. With text, Tab moves focus as before. An open slash menu still takes Tab (it runs first). Files: `ui/features/home/use-example-take.ts` (new), `prompt-area.tsx`, `home-model.ts` (`isExampleTakeKey`).
- **Placeholder.** The shown brief ends with " — Tab to use" (`copy.tabToUse`). A `sr-only` span `#home-example-hint` ("Press Tab to use the example brief.") is in `aria-describedby` only while the example shows, joined with the send-reason id when there is one.
- **Better examples.** The placeholder rotates the starter `prompt` briefs from `/api/starters` (`useStarters`), with today's `EXAMPLES` while the list loads. The app-chip placeholder does not change. `getPromptPlaceholder` lost its `empty` argument (`home-prompt.tsx`).
- **Stall fix** (2 files, 37 lines):
  - `ui/features/home/use-studio-data.ts`: the run list returned the new run as a `running` summary and replaced the live run with it. Runs with a summary drop every live event, so the chat stayed on "Starting" until the run ended. Now a live run (no summary) stays live when the list says `running`, and the catch-up replay skips it, so no delta is applied twice.
  - `ui/features/chat/run-state-model.ts`: a `run.write.delta` with no tool row adds a pending Write row, so the status says "Writing index.html" while the SDK streams the tool input, before `run.tool.started`. Not `port-check-model.ts`.
- No new control. Starter pills and "Open the sample" did not change.

## Headless

No new action, so there is no `call-action.ts` run. MCP and the agent already reach a first design with `create_project` and a prompt.

## Checked

- Mock app, fresh data dir: the placeholder rotates the starter briefs with " — Tab to use"; `aria-describedby` = `home-example-hint`. Tab fills the prompt with the shown brief. "a" then Tab: the value stays "a" and focus moves. "/" then Tab: the menu takes it and focus stays. Enter opens the project and the draft paints.
- Mock run after the stall fix: the live status reads "Writing index.html" from 0 s to the end of the write (before: "Starting" all through). The finished run shows 1 created file and no repeated text.
- Reducer probe (tsx): a write delta before `run.tool.started` gives "Writing index.html".
- Real run on the branch (fresh data dir, Tab, Enter, brief "Habit tracker home screen in a phone frame, soft sage"): 2 steps and 0 typed characters. First painted draft 36 s, run end 77 s. This run was before the stall fix, so it still showed "Starting"; the fix is proven in mock only. The two briefs differ, so the seconds do not compare.
- `pnpm run typecheck`, `pnpm run lint:gate` (pass, 59601 against baseline 89733) and `pnpm run build:ui` pass.
- Shots in `cycle-30/first-design/`: `branch-home-{light,dark}.png` (empty Home with the hint), `mock-{home,prompt,draft,end}-{light,dark}.png`, and `branch-{prompt,draft,end}-light.png` from the real run.

| Path | Steps to run start | First draft | Run end |
|---|---|---|---|
| main: type the prompt, Enter | 2 (with typing) | 22 s | 72 s |
| branch: Tab, Enter | 2 (no typing) | 36 s | 77 s |

## Left out

- Real-run proof of the stall fix: both real runs were used (main measure and branch run).
- Dark first draft from a real run: the real-run data dir was wiped for the mock checks. The dark draft shots are from a mock run.
- `/api/starters` loads twice on an empty Home (the pills and the prompt). One shared fetch needs `start-cards.tsx`, which is outside this pick.
- `changes?from=null` 404 on the first version: seen on main and on the branch. Pick 5 owns it.
- `.claude/goal/roadmap.md` is not in the worktree, so Appendix A was not changed.
