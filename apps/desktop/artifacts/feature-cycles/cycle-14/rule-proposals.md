# Cycle 14 pick 4: rule-proposals

Branch `feat/rule-proposals`.

## Built

- Added `design-rule.inspectProposals` (`GET /api/projects/:projectId/design-rules/proposals`, MCP and agent `inspect_proposals_design_rule`). It reads the last 20 manual versions through `VersionStore` and `ChangeStore`, takes the style items and their hunk lines, and groups the changed CSS declarations (inline `style`, JSX `style={{}}`) and added Tailwind classes. A change set 3 times, or on 2 layers, is a proposal. At most 5 open proposals.
- Added `design-rule.setProposal` (`POST .../proposals/:proposalId`, `set_proposal_design_rule`). `accepted` saves the rule text through `DesignRuleWriter` (the `design-rule.create` path). `dismissed` hides it. Status lives in `<projectDir>/rule-proposals.json`. The same status again returns ok, so the 3 surfaces agree.
- Added the pure engine `design-rules/engine/to-rule-proposals.ts`, `RuleProposalStore` (read) and `RuleProposalWriter` (write).
- Added the inspector card at the edit pane foot: "You set border-radius to 12px 3 times. Make it a rule?" with Dismiss and Make rule. It refetches when a write invalidates `version.list`, so it shows after the edit that crosses the bar. One proposal at a time.

## Checked

- UI, mock run on the Kiln sample: set radius 12px on 3 step items in the inspector. The card showed after the 2nd item (2 layers) and counted 3 after the 3rd. Make rule wrote `Use border-radius: 12px on list items` to DESIGN.md and the card went away.
- Screenshots: `cycle-14/rule-proposals/rule-proposal-{dark,light}.png` and the inspector crops.
- `call-action.ts design-rule.inspectProposals`: pass, same items on HTTP, MCP and agent.
- `call-action.ts design-rule.setProposal` with `dismissed` on an opacity 0.9 proposal: pass on 3 surfaces. The id stays in the status file, so it does not come back after a reload.
- `pnpm run typecheck`, `pnpm run lint:gate` (pass), `pnpm run build:ui`, `gen-routes --check`.

## Left out

- No real-model run to prove a later run follows the accepted rule (spec verify step 5).
- `artifacts/mcp-snapshots/*.json` not updated: the 2 new tool names need approval at merge.
- Rule text for CSS changes is a plain `text` rule, not a checked class rule. Tailwind class proposals on buttons, links, images, headings and fields become class rules (`button: rounded-xl`).
- Changes in `<style>` blocks or CSS files do not count; only element attributes do.
