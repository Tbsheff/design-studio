# Cycle 13 pick 5: decision chips

## Built

- Added `run.createDecision` (`create_decision_run`, agent set `core`, lean). It records one choice with 2 to 4 options. At most 3 per run. A second call with the same topic updates the choice, so call-action repeats stay the same.
- Added `run.setDecision` (`set_decision_run`, agent off `run-control`). On an active run it sends a steer ("Use X for Topic. Keep the rest of the design as it is."). On a finished run it starts a follow-up run with the same direction, canvas frame and level. A repeat pick of the same option returns the stored result.
- Added `decisions` to `run.get`, so `get_run` lists them with `picked`.
- Added `RunDecisionStore` (read) and `RunDecisionWriter` (write), wired in `handlers/run/live.ts`. Data: `runs/decisions/<runId>.json`.
- Added one prompt rule (edit mode): record real forks only, at most 3, never wait.
- Added the chat row "Chose: Layout 2 tiers · Tone bold". Each chip opens a menu with the options and "Other…" (free text). The picked chip gets an accent border. The row updates live through `action.done`.

## Changes from the spec

- Added `run.listDecisions` (GET, MCP and agent off `ui-bootstrap`). The row reads it, not `run.get`, because `run.get` carries the full event log and every steer would refetch it per run.
- Split the service in two (`run-decision-store.ts`, `run-decision-writer.ts`): a read handler (`run.get`) may yield only read services (S7a), and the file name must match the class (W5a).
- Added `directionId` (nullable, default null) to `run.createDecision`, and `runId: "current"`. The in-app agent gets `directionId` injected but does not know its run id; `current` resolves the active run in that direction.
- Mounted the row in `run-body-content.tsx`, not `run-body.tsx`: in `run-body.tsx` it sat beside the body, not under it.

## Checked

- `call-action run.createDecision`: pass, http, mcp and agent, 0 diffs.
- `call-action run.setDecision` (finished run): pass, http and mcp give the same follow-up run id.
- `call-action run.get`: MCP output lists both choices with `picked`.
- `call-action run.listDecisions`: pass (http).
- HTTP on an active mock run (`[slow] [slowlong]`): `runId: "current"` resolved; the pick returned `isSteer: true` and the steer showed in chat.
- UI click: picking "2 tiers" started a follow-up run, and the chip shows "2 tiers".
- `pnpm run typecheck`, `pnpm run lint:gate` and `pnpm run build:ui` pass.
- Screenshots: `cycle-13/decision-chips/{dark,light}-{row,menu}.png`.

## Not done

- No real-model run to check the prompt rule (0 to 3 chips, no wait). The mock agent does not call the tool.
- The MCP snapshot (`artifacts/mcp-snapshots`) is not updated; approve the 2 new tools at merge.
