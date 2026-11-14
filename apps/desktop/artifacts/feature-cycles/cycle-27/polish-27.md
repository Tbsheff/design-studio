# Cycle 27 pick 5: polish-27

Branch `feat/polish-27`, cut from `f8dbc0c6d`. Mock agent, server port 49310, data in `ds-wt/polish-27-data`. No real-model run (the spec says pick 5 needs none).

## Built

- **One photo fill per page.** `apply_image_search` on a page with no `data-photo` slot left returns at once with `filled: []`, `missed: []` and a `note`. It runs no search. Before, it threw an error.
  - Output field `note: string | null` added to `PhotoFillSchema` (`packages/common/actions/src/image-search/schema.ts`). The action description says so. `gen-routes --check` passes.
  - `run-level.ts` PHOTO_STEP: "call it once per page ... Never call it again on a page it filled."
  - Cmd+K "Fill photo slots" shows the note in the error banner (`ui/app/studio/bind-studio-commands.ts`).
- **Background slot label.** A filled HTML background slot loses its plain text label (text only, or one `span`/`small`/`p`/`strong`/`em`/`b`/`i` with text only). A slot with other child elements (a hero with a heading) keeps its content.
- **Translate added to.** The bridge sends `translate` in the selection styles (`bridge/element-info.ts`). The CSS group rotate writes the old px translate plus the turn shift (`rotate-drag-model.ts`). `transform-style-properties.ts` already allowed `translate`, so it did not change.
- **Continuation number.** New `server/agent/counted-driver.ts` wraps the run sink. Each sent continuation takes the next number from one counter per run. `AgentSdkClient` wraps the SDK and the mock driver. `sdk-driver.ts` and `lifecycle.ts` do not change (`lifecycle.ts` may not grow and is at the 20-import limit).
- **Created file chip.** A created file shows its net line count and "new" (`tool-rows-model.ts`, `file-chip.tsx`, one `newFile` key in `chat/copy.ts`, `.run-change .diff-new` in `chat.css`). The tooltip says "(+N, new)".

## Checked

- Fill over HTTP on a page with 3 slots (hero div with label, 2 img): 3 filled in 11.7 s, the hero label is gone. The second call: 20 ms, `filled: []`, the note (`polish-27/p27-fill-http.txt`).
- `call-action.ts image-search.apply` on the filled page: pass, 3 surfaces, 0 diffs, 2 to 10 ms (`polish-27/p27-call-action.txt`).
- Group rotate in the UI, CSS boxes, `#c1 { translate: 10px 0 }`, Shift-drag to 30°: `c1` gets `translate: 24px -53px` (10 px plus the 14 px shift), and its center lands on the turned point. Escape wrote nothing (`group-rotate-translate-light.png`).
- Continuations: a script drives `toCountedDriver` with a driver that sends app review, port check, screen check and reference fixes, each as `continuation: 1`. The log gets 1, 2, 3, 4, and the next run starts at 1 again (`polish-27/p27-count-check.txt`). The mock has no app review or screen check path, so no mock run shows 1 then 2.
- Chip: a mock run that creates `index.html` shows "Created index.html +34 new" (`chip-{dark,light}.png`). The model script for Write +100, then Edit +6 -10 gives "+96" and created (`polish-27/p27-chip-model.txt`).
- Screenshots: `chip-{dark,light}.png`, `photo-fill-{dark,light}.png` (filled hero, no label).
- `pnpm run typecheck` pass, `pnpm run lint:gate` pass (59612, baseline 89733), `pnpm run build:ui` pass.

## Left out

- Run 1 of report-3: its data dir (`ds-wt/port-scope-data`) is gone, so the later 2 calls could not be checked. Inference: the old code threw within ms on a page with no slot, so the 6.1 s and 10.5 s calls found slots (likely gray boxes that keep `data-photo` after a miss).
- A gray box that keeps `data-photo` after a miss still counts as a slot, so a later call searches it again.
- A `translate` with a percent or z part is still replaced, not added to.
- A real run with an app review and a screen check (needs an app project and a real model).
- `.claude/goal/roadmap.md` is not in the worktree, so Appendix A was not updated.

## Files outside the pick list

- `packages/common/actions/src/image-search/{schema.ts,apply.ts}`: the `note` output field and description. `apply_image_search` is in no snapshot file.
- `ui/app/studio/bind-studio-commands.ts`: shows the note.
- `server/agent/agent-sdk-client.ts` and new `counted-driver.ts`: the continuation counter.
- `ui/features/chat/copy.ts`: one new line, `newFile`. Pick 3 rebases over it.
- `ui/styles/chat.css`: `.run-change .diff-new`.
