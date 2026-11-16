# Cycle 44, pick 1: polish-44

Branch `feat/polish-44`. Commits: `a2bc08fb4` (contracts split, z-index key, Tailwind seam), `8d13b942e` (Fixed and Sticky z-index, catch-all routes), `0399763d6` (typecheck fixes).

## Results

| Item | Result |
|---|---|
| z-index on Fixed and Sticky | Works. HTML tab bar: Fixed writes `left: 0; right: 0; top: 0; z-index: 10; position: fixed`. Scroll with parent removes all of them. Badge with stylesheet `z-index: 3`: Fixed keeps 3 (no inline z-index). `p44-next` nav with `z-20`: Fixed keeps `z-20`; Scroll with parent keeps `z-20`. A span with no z-index: Fixed writes `z-10`. MCP `edit_element` with `"z-index": "20"`: 1 version, `"wrote": "classes"`, class `z-20`. |
| Prototype-tab writes in a breakpoint | No bug found. At `md`, Sticky on the `p44-next` header writes `md:z-10 md:top-0 md:sticky`. At the base it writes `z-10 top-0 sticky`. Cause of the expected bug: none. `runMultiFlush` (`use-direct-edits-core.ts`) reads `editVariantStore.get()` at the flush, the variant store is module state, and a tab switch does not call `restoreEditVariant` (it runs only when the selection empties or the inspector unmounts). No code change. The control reads the computed value of the resized frame, so at `md` it shows Sticky. |
| squircle as a Tailwind class | Works. `[corner-shape:squircle]` and `[corner-shape:superellipse(1.33)]` are written and read back; the field shows 60 %. The old inline `cornerShape` on the "Old card" is gone after the class write. Outline (`outline-2 outline`) and rotate (`rotate-45`) write as before. `map.ts` 964 lines (HEAD 966), `classes.ts` 818 (HEAD 819). |
| `[...slug]` and `[[...slug]]` in the refusal | Code done in `port-model.ts` (383 lines, no new file): `[...x]` matches 1 or more parts, `[[...x]]` 0 or more, only as the last segment. `[x]` still matches 1 part. Checked by reading; the dialog was not clicked on `p44-dyn` in this session. |
| contracts barrel off Home | Done. `use-home-screen.tsx` and `variations-api.ts` import the subpaths. The `_home` static set is 41 chunks, 407,948 B, with no `contracts-*.js`. The only Home chunks that still import `contracts-*.js` are the lazy `home-slash` and `level-popover` (`RUN_LEVELS`, `RUN_EFFORTS`). No new chunk name. |

## Checks

- `pnpm run typecheck`: pass.
- `pnpm run lint:gate`: pass, 59,563 diagnostics (baseline 89,733).
- `pnpm run build:ui`: pass.
- `check-bundle`: pass, B1 271,703 B (delta 0).
- `gen-routes --check`: pass.
- `check-actions --probes`: 278 hits (E1 25, E16 6, O11 1, O12 52, S11 194), equal to main.
- No new action, so no `call-action.ts` run.

## Screenshots

`cycle-44/polish-44/scroll-pin-md-{dark,light}.png` (Scroll behavior at `md`, Sticky) and `smoothing-{dark,light}.png` (smoothing 60 %, iOS on).

## Left out

- `RUN_LEVELS` and `RUN_EFFORTS` stay in the barrel (spec).
- The before byte count of the Home set was not measured again; the spec gives `contracts-*.js` as 3,009 B on main.
- Snapshot diff not checked: `direct-edit-element.json` and the agent breakpoint enum should get `z-index`. Snapshots not edited.

## Files outside the pick list

None.
