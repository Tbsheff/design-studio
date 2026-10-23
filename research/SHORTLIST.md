# Open-source shortlist

Merged from `oss-products.md` (about 55 projects) and `oss-components.md` (about 80 packages). Licenses checked on 2026-10-21.

## Pull first (ranked by value to us)

| # | Source | License | What to take | Helps |
|---|---|---|---|---|
| 1 | onlook `packages/parser` | Apache-2.0 | `code-edit/{style,text,move,insert,remove}.ts`: direct visual edits to JSX with no model call | P1 direct controls, AC-28/29 speed |
| 2 | dyad version services | Apache-2.0 (not `src/pro/`) | commit-per-turn, restore, branch handlers | AC-33–38 ideas; we already have a shadow git |
| 3 | Anthropic `skills/frontend-design` | Apache-2.0 | design-quality guidance for the system prompt | AC-41–43 quality |
| 4 | open-lovable | MIT | Vite error capture fed back to the agent; edit-intent file picking | AC-23, faster targeted edits |
| 5 | react-grab + bippy | MIT | React 19 runtime source lookup when the tag plugin is absent | AC-27 for imported projects |
| 6 | code-inspector | MIT | HTML tag scanning; Claude element-context example | AC-27, AC-32 |
| 7 | openui | Apache-2.0 | element annotations (`HtmlAnnotator.tsx`), version strip | P1 pinned comments |
| 8 | pixelmatch + react-compare-slider | ISC / MIT | pixel diff on the server, slider and overlay compare in the UI | AC-36, P1 overlay compare, visual regression |

## Components to adopt

| Need | Pick | License | Note |
|---|---|---|---|
| Pan/zoom | react-zoom-pan-pinch | MIT | Or keep our own hook once the zoom fix lands |
| Command palette | cmdk | MIT | P1 keyboard editing |
| UI primitives | @base-ui/react | MIT | Menus, popovers, dialogs with good a11y |
| Toasts | sonner | MIT | |
| Icons | lucide-react | ISC | Replace hand-drawn SVGs |
| Markdown in chat | streamdown | Apache-2.0 | Handles partial streamed markdown |
| Edit diffs in chat | @pierre/diffs | Apache-2.0 | Show what each run changed |
| Code view | CodeMirror 6 | MIT | |
| Colors | culori + react-colorful | MIT | OKLCH direct controls |
| CSS write-back | postcss + postcss-value-parser | MIT | Apply style edits to source |
| A11y check | axe-core | MPL-2.0 | Use unmodified; add to render check |

## Do not copy code from

- **AGPL:** stagewise, webstudio, easyblocks.
- **PolyForm Shield:** agentation (bans competing products).
- **FSL:** gpt-pilot, dyad `src/pro/`.
- **Custom or paid:** tldraw (license key, watermark), WebContainers (paid for commercial use), Nodebox (Sustainable Use License).
- **No license:** make-real, WebGen-Bench, locatorjs root, claude-agent-sdk-demos.

## Already covered by our own code

Click-to-source tagging (our Vite plugin), iframe bridge, shadow-git versions, local Vite preview. dyad and onlook confirm the same approach.
