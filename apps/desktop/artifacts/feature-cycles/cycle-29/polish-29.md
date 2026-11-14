# Cycle 29, pick 5: polish-29

Branch `feat/polish-29`. Mock agent, studio on port 5470, data in `ds-wt/polish-29-data`, projects in `ds-wt/polish-29-projects`. Fake Next 16.4.1 app at `ds-wt/p29-next`: `/patients` awaits `prefetchPatients()`, which throws without `DATABASE_URL`, so the route answers 500. No real-model run (the spec needs none).

## Changes

- **Look font names** (`style-scope/theme/theme-run.ts`, `theme-starter.ts` export, `design-system/theme-tokens.ts`, `design-system/update-tokens.ts`). `theme.apply` now writes `fonts.display` and `fonts.body` of `pack.json` from the picked theme. It changes `googleFontsUrl` only when the current link does not load the pair, so the merged starter link keeps all 3 Look pairs for live preview. `pack.json` is in the same version and the same undo record as the token change. App-token directions skip the write.
- **One fixture per route** (`export/fixture/{fixture-model,fixture-commit,fixture-run}.ts`). A stored fixture keeps a request key (route, params, search params, shell), `removed` and `unresolved`. `fixture.create` returns the stored fixture (versionId null) when the same direction and key ask again and the folder exists. When its frame was removed, it puts the frame back. Old rows decode with defaults and never match.
- **One undo step** (`share/page-import/place-frame.ts`, outside the listed files). An import of the entry page into an empty canvas no longer adds the implicit entry frame next to it. The route copy keeps one frame `f1`, so `create-prototype.ts` has no frame to remove and makes no second history entry. Every route copy gets this, not only fixture copies.
- **Smaller cursor calls** (`run-log/run-log-reads.ts`, `handlers/run/get.ts`, `actions/src/run/get.ts`). Each `run.sent` line keeps the event count before it (line order, not `ts`). With `afterEvent`, `sent` holds only the later messages. One description sentence; gen-routes run.
- **import_source_page on a fixture copy** (`handlers/page/{import-source,live}.ts`). When the recorded route answers 4xx or 5xx, the import reads the latest fixture whose source route is that route. The copy record keeps `/patients`.

## Checks

- **Look** (`polish-29/look-fonts.txt`). Main: option 2 left `pack.json` at Fraunces and Inter while tokens said Libre Baskerville. Branch: `pack.json` and the design-system read say Libre Baskerville and Work Sans; history has one "Apply theme" record with `pack.json`; one undo restores Fraunces and Inter.
- **Fixture** (`polish-29/fixture-reuse.txt`). Main: 2 calls, 2 folders. Branch: 2 calls, 1 folder (`fx-94b683`, second call versionId null); other search params give a new fixture.
- **Undo** (`polish-29/fixture-undo.txt`). Main: history "Remove frame Frame 1", "Import page index.html". Branch: "Import page index.html" only. One Cmd+Z in the UI returns to the empty copy ("No page at index.html yet"): `fixture-copy-{before,after}-undo-{dark,light}.png`. The UI offer also starts a run, so there it is the run, then 1 step.
- **get_run bytes** (mock run, 0 new events): main 1742 bytes with the 247-byte `sent` record; branch 1459 bytes with `sent: []`. The bulk of a real cursor call (about 50 KB in cycle 28) is `summary` (parts and tool calls), which this pick does not change.
- **HTTP abort**: `curl --max-time 3` on a 60 s wait. A temporary log in `run-wait-store.ts` (removed) printed "wait interrupted" at +3 s; a 2 s control printed "wait ended normally". No fix needed.
- **import_source_page** (`polish-29/import-source.txt`). Main: 400 "answered 500". Branch: 200, `index-app.html` with the fixture rows, one undo record.
- `call-action` (`polish-29/call-action.txt`): `run.get` http and mcp pass (agent off: run-control); `fixture.create` 3 surfaces pass, 0 diffs, all reuse `fx-94b683`.
- `pnpm run typecheck`: pass. `pnpm run lint:gate`: pass, 59617 (baseline 89733). `pnpm run build:ui`: pass.

## Left out

- **Decisions stay whole in a cursor call.** They have no ts or event index, a pick changes a decision after it is made, and a run has at most 3 (about 150 bytes).
- **`summary` stays whole.** It holds most of the 50 KB; trimming it needs a schema or description decision.
- **import_source_page with several fixtures for one route** takes the latest; params are not matched.
- The `fixture.create` description still says "Writes one page file"; the spec allowed only the `run.get` description change.
- `.claude/goal/roadmap.md` is not in the worktree, so no Appendix A globs were added.
