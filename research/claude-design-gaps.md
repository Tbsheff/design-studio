# Claude Design vs the studio (researched 2026-10-22)

Claude Design is an Anthropic Labs tool. It launched 2026-04-17 as a research preview (Pro, Max, Team, Enterprise). Since 2026-09-16 it runs as artifacts in any Claude chat, Claude Code and the Artifacts tab, on every plan. The standalone site closes 2026-12-14.

Sources:
- [A] https://www.anthropic.com/news/claude-design-anthropic-labs
- [G] https://support.claude.com/en/articles/14604416
- [DS] https://support.claude.com/en/articles/14604397
- [M] https://support.claude.com/en/articles/17440474
- [F] https://claude.com/features/artifacts
- [R] https://support.claude.com/en/articles/12138966-release-notes
- [MS] https://www.macstories.net/stories/hands-on-with-anthropic-labs-claude-design-preview/ (review)
- [MZ] https://muz.li/blog/claude-design-one-week-in-hacks-best-practices-tips-from-real-world-use/ (review)

## Gaps, ranked for a solo designer (prototype fast, then polish)

| # | Feature | What it does | Size | Source |
|---|---|---|---|---|
| 1 | Tweaks panel | Claude makes sliders, toggles and color pickers tied to CSS variables; drag live with no model call, then commit | M | A, MZ |
| 2 | Variations fan-out | One prompt gives 3+ options side by side; mix parts between them | M | MZ (review only) |
| 3 | Pinned comments with a queue | Comments stay on elements; send now or batch later | S–M | A, MS |
| 4 | Design-system extraction | From a repo, URL, deck, PDF, screenshots or Figma, build tokens, components and DESIGN.md | M | DS |
| 5 | Web capture | Grab elements and styles from a live site as references | M | A |
| 6 | Clarifying questions | A short question form before the first generation | S | MS |
| 7 | Handoff bundle | HANDOFF.md with intent and decisions for a coding agent | S | A, G |
| 8 | PDF / PNG export (MP4 later) | More export formats | S (MP4: M) | G, F |
| 9 | Freehand drawing | Draw on the preview as feedback for the model | S–M | MS |
| 10 | Multi-artboard canvas | Free drag, resize, align, and a layers panel | L | G |
| 11 | Slide-deck mode | Speaker notes, PPTX and Google Slides export | L | MS, G |
| 12 | One-click deploy | Vercel or Netlify | M | G |
| 13 | Office files as context | DOCX, PPTX, XLSX in prompts | S | A |
| 14 | Sharing and group chat | View/comment/edit links, shared chats | L | G, A |

## What the studio has that Claude Design lacks

- Version history, compare, restore and directions from any version. Claude Design "doesn't have version history yet" [G].
- Automatic quality checks: render_check, screenshot self-check loop, separate critic, pixel diff.
- Direct style edits written to source, with token snap.
- Real local files, Vite import and HMR, buildable Vite export.
- Per-project budget and cost details.
- Tool permissions, the user's own skills and taste rules, Wireframe / Prototype / Polish modes.

## Unverified

- Variations, speaker notes, and zero token cost for Tweaks come only from a review [MZ].
- Beta status: Anthropic pages disagree.
- No source found for a presenter mode or a public API.
- Known bug per help center: comments can disappear before Claude reads them.
