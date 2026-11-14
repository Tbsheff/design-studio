# Cycle 33 pick 1: real-proof

Branch `feat/real-proof`, cut from main `b30747617`.

## What changed

- **Route copy keeps the border width** (`share/page-import/collect-script.ts`, 1 line). A Tailwind app sets `border: 0 solid` on every element. The copy kept `border-*-style: solid` and dropped the 0 width (it equals the blank default), so every copied element got a 3px border. Found while building fixture A; the first copy scored 12.
- **Move to app prompt** (`agent/port-route-update.ts`, route update rules):
  - Change route files only with Edit or Write, not Bash (`sed -i` fails on macOS). Cycle-32 runs 1 and 2 showed it.
  - "First, before any other route write, call `mcp__studio__apply_port` with only routePath (load it with ToolSearch)."
  - Names the layout files from the route copy record (`app/layout.jsx`) and says not to copy their markup into the route. Real run A1 showed it.
- **Port pairs skip ambiguous text groups** (`review/port-check/port-pairs.ts`). When a text ("Visits") occurs a different number of times in the app and the prototype, the group is not paired. Real run A1 showed the values pass pair the h1 "Visits" with a nav "Visits" and write `text-sm font-normal` on the heading. Replay of the A1 write: before 4 wrong values, after `applied: []`.
- **Card rule** (`kit-drift/engine/to-card-drift.ts`). `data-slot="card"` alone no longer makes a block a kit Card; it also needs at least half of the Card base classes. Real run B2 added only `data-slot` to 5 hand-styled cards and the check found 0. Re-scan of the B2 page now finds 5.
- **`port-start.ts` split**: the prompt builders moved to new `agent/port-start-prompt.ts` (499 -> 379 lines). No line change in logic.

## Fixtures (under `ds-wt`, never Bonaparte)

- `rp-base` -> `rp-next-tw-<n>`: Next 16.4.1, Tailwind 4.2.2, `node_modules` as a closure copy of the Bonaparte pnpm store (read only, `rp-tools/closure.mjs`). Route `/visits` with `mb-1`, `gap-2`, `p-2`; layout header. Prototype = route copy plus 24 px, 24 px, 16 px and the line "Today, 12 visits" (`rp-tools/proto-a.py`). Start score **67** on every copy (55 to 70).
- `rp-kd-base` -> `rp-kd-next-<n>`: shadcn-style Card, Button, Input, Label, Table. B1 seed: 4 hand-styled cards and a table (`rp-tools/proto-b1.html`).
- Each run: own app copy and own data folder (`real-proof-data/<run>`). Setup ran with the mock agent, then the server restarted with the real agent.

## No-model checks

- Mock `[port-keep] [port-bash]` on fixture A: values pass 67 -> 89, Bash only (`real-proof/run-mock-m4.txt`). Mock `[port-apply]`: agent `apply_port` with only routePath wrote mb-6, gap-6, p-4; score 89.
- `call-action.ts kit-drift.list` on B1 seed: pass, 3 surfaces, 4 card finds (`call-kd-b1.txt`). On the B2 final page after the card fix: pass, 5 card finds per surface (`call-kd-b2.txt`).
- `call-action.ts port.inspect` on A1r: pass, 3 surfaces, 0 diffs, score 100 (`call-port-inspect.txt`).

## Real runs (Sonnet 5.5, local sign-in)

| Run | Gate | First -> last | Values written by | Loops | Tools that wrote | Card finds | Kit Cards | Time | Cost |
|---|---|---|---|---|---|---|---|---|---|
| A1 | pass | 24 -> 100 | agent Write (mb-6, gap-6, p-4); studio pass 4 wrong values, 24 -> 39 | 1 | Write x2 | - | - | 27 s | $0.147 |
| A2 | not run | - | - | - | - | - | - | 2 s | $0 |
| A2b | pass | 67 -> 89 | agent `apply_port` (3 classes, no refusal) | 0 | apply_port | - | - | 16 s | $0.086 |
| B1 | pass | - | - | 1 | Edit, perl | 5 cards + table (6) -> 0 | 5 | 39 s | $0.150 |
| B2 | fail (found later) | - | - | 1 | Write, Edit, sed '' | 5 cards + 2 -> 0 | 5 by data-slot only | 65 s | $0.192 |
| B2r | pass | - | - | 1 | Write, Edit, sed '' | 5 kit finds -> 0 | 4 with recipe | 93 s | $0.260 |
| A1r | pass | 67 -> 100 | agent `apply_port`, then Edit adds the line from data | 0 | apply_port, Edit | - | - | 17 s | $0.106 |

- A1 and A1r: `resume: null` (fresh session). A1 had the "Studio check: wrote 4 prototype values" log line; it duplicated the layout header in the route. A1r, after the layout and pairing fixes, wrote no header and reached 100.
- A2: the ask was sent as a steer right after start. A steer cancels the run (`lifecycle.ts` `steer` calls `handle.cancel()`), and the UI starts the follow-up, so the API call ended the port run at $0. The queue is UI-driven too, and a follow-up chat run is not a port run, so `toPortRunCaller` would not take the pair. The ask moved into the route update rules; A2b and A1r then called `apply_port` first.
- B1: the first send tried to resume the mock setup session id, then retried with no resume. This is a setup artifact.
- Screenshots: `real-proof/a1r-run-note-{dark,light}.png` (Move to app note, "Matches the prototype: 100%"), `real-proof/b2r-run-note-{dark,light}.png` (kit note, "5 controls did not use the app kit, 0 after the fix loop").

## Gates

`pnpm run typecheck` passes. `pnpm run lint:gate` passes (59605, baseline 89733). `pnpm run build:ui` passes. No action, tool schema or `short` text changed, so `gen-routes` has no diff.

## Files outside the owned list

- `share/page-import/collect-script.ts` (no pick owns it): the border width fix.
- `review/port-check/port-pairs.ts` (no pick owns it): ambiguous text groups.
- New `agent/port-start-prompt.ts` (the split the spec asked for).

## Left out

- The values pass gave 89, not 95 or more, on fixture A (the extra line moves content below it). Gate is 80.
- Route copy turns `mx-auto` margins into fixed px (`margin-left: 336px`). The fixture script sets them back to `auto`; the copier is not fixed.
- The kit note says "controls" for cards and tables. The clause is shared with pick 2, so not changed.
- The Button and Table rules (pick 2's `to-markup-drift.ts`) may have the same `data-slot`-only gap; not checked.
- A steer at the start of a port run cancels it with no follow-up over the API (`lifecycle.ts`, not owned).
- Fixture A's agent in A2b left out the "Today, 12 visits" line (called it sample data); A1 and A1r bound it to the route data.
