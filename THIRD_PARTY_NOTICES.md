# Third-party notices

## nauvalazhar/ai

- Source: https://github.com/nauvalazhar/ai (site: https://ai.nauv.al)
- Commit copied from: `9944bcffc7412b27315ce853a49b4ea6035dea98` (committed 2026-05-26)
- Date copied: 2026-10-22
- License: the repository has no LICENSE file, and no `license` field in its package.json files.

> **Open license question.** The upstream repository has no LICENSE file. The studio's use relies only on the author's "Own the code" statement below. That statement is not a license grant. Resolve this before a public release: get a written license from the author (for example MIT), or replace the copied files.

### Basis for use

The project's Introduction page (`src/docs/introduction.mdx`, section "Own the code") says:

> Components live in your repo. There is no package to update. Drop a component in, edit it, fork it, or delete the parts you don't need.

The studio copies the components on that basis.

### Copied files

Each copied file starts with a one-line comment that points to this notice. The paths keep the source structure under `src/ui/ai/`.

| Studio path | Source path |
| --- | --- |
| `src/ui/ai/lib/utils.ts` | `src/lib/utils.ts` |
| `src/ui/ai/components/ai/action.tsx` | `src/components/ai/action.tsx` |
| `src/ui/ai/components/ai/attachment.tsx` | `src/components/ai/attachment.tsx` |
| `src/ui/ai/components/ai/chain-of-thought.tsx` | `src/components/ai/chain-of-thought.tsx` |
| `src/ui/ai/components/ai/chip.tsx` | `src/components/ai/chip.tsx` |
| `src/ui/ai/components/ai/code-block.tsx` | `src/components/ai/code-block.tsx` |
| `src/ui/ai/components/ai/composer.tsx` | `src/components/ai/composer.tsx` |
| `src/ui/ai/components/ai/conversation.tsx` | `src/components/ai/conversation.tsx` |
| `src/ui/ai/components/ai/exception.tsx` | `src/components/ai/exception.tsx` |
| `src/ui/ai/components/ai/loader.tsx` | `src/components/ai/loader.tsx` |
| `src/ui/ai/components/ai/markdown.tsx` | `src/components/ai/markdown.tsx` |
| `src/ui/ai/components/ai/message.tsx` | `src/components/ai/message.tsx` |
| `src/ui/ai/components/ai/reasoning.tsx` | `src/components/ai/reasoning.tsx` |

The keyframes `text-pulse`, `text-shimmer` and `loading-dot` in `src/ui/styles/ai.css` come from the source `src/styles.css`.

### Changes from the source

- All files: `#/` path aliases changed to relative imports.
- `composer.tsx`: with `submitOnEnter={false}`, Cmd/Ctrl+Enter submits, so the studio keeps its shortcut.
- `markdown.tsx`: links open in a new tab with `rel="noopener noreferrer"`, and images show their alt text only. Model output cannot make the studio fetch an image URL.
- Theme tokens map to the studio's OKLCH tokens in `src/ui/styles/ai.css`, not to the source theme.

### Read but not copied

`confirmation.tsx` (the run events have no approval step), `button.tsx` (copied first, removed when the studio buttons took its place), `tool.tsx`, `composer-rich.tsx`, `CONVENTIONS.md` and `registry.json` (read for structure only).

## npm dependencies added for render_check quality checks

These are unmodified npm packages, installed from the registry and not copied into the studio source.

| Package | Version | License | Use |
| --- | --- | --- | --- |
| `axe-core` | 4.14.0 | MPL-2.0 | Accessibility rules. The studio reads `axe.min.js` from `node_modules` and runs it in the preview page during `render_check`. |
| `pixelmatch` | 7.x | ISC | Pixel diff between the version before a follow-up run and the current render. |
| `pngjs` | 7.x | MIT | Reads the PNG screenshots for the pixel diff. |

`axe-core` is MPL-2.0, not MIT. MPL-2.0 is a file-level copyleft license: the studio may use the package unchanged, but if anyone changes an `axe-core` file, they must publish that file's source under MPL-2.0. The studio does not change it.

## Bundled fonts

The studio UI ships these font files in `src/ui/assets/fonts/`. They are unmodified WOFF2 subsets (latin and latin-ext) taken from the Fontsource npm packages on 2026-10-26. The app loads them locally; it does not fetch fonts from the network. The full license text is in `src/ui/assets/fonts/OFL.txt`.

| Font | Source package | Copyright | License | Use |
| --- | --- | --- | --- | --- |
| Inter (variable, wght) | `@fontsource-variable/inter` 5.3.0 | Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter) | SIL OFL 1.1 | UI text (`--font`). |
| Source Serif 4 (variable, opsz + wght, roman and italic) | `@fontsource-variable/source-serif-4` 5.3.1 | Copyright 2014-2021 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source' | SIL OFL 1.1 | Display headlines and assistant prose (`--serif`). |
| Kalam (400, latin subset, `kalam-latin-400-normal.woff2`) | `@fontsource/kalam` 5.3.0 | Copyright (c) 2014 Indian Type Foundry | SIL OFL 1.1 | The hand-drawn font of the canvas "Lo-fi look" (sent into the preview frames as a data URL; the user's files do not change). |

OFL 1.1 lets the app bundle and ship the fonts. The files must keep the license with them, and a changed version must not use the reserved name "Source". The studio does not change the files.

## Components in the packaged desktop app

`npm run desktop:pack` puts these in the app bundle. They are not part of the source tree.

| Component | License | Note |
| --- | --- | --- |
| Electron | MIT (Chromium and its dependencies have their own notices, shipped in the app's `LICENSES.chromium.html`) | App shell. |
| git, from `dugite` | GPL-2.0 (git); `dugite` itself is MIT | Slim git binaries in `Contents/Resources/git`, used only when the system git is missing. A binary release must meet the GPL-2.0 source terms for git. |
| Claude Agent SDK (JavaScript only), `@anthropic-ai/claude-agent-sdk` | Anthropic's terms (see the package's `LICENSE.md`) | Talks to the agent. The Claude Code CLI binary is not shipped: the app runs the user's installed `claude`. |
| npm runtime packages | Each package's own license | Copied into `Contents/Resources/server/node_modules`. |

## itspatmorgan/design-studio (ideas only)

Source: https://github.com/itspatmorgan/design-studio, MIT License, (c) 2026 Patrick Morgan.

The canvas layout file, the agent canvas tools (relative placement with overlap warnings), state frames and the lo-fi look of wireframes follow ideas from that project (`src/platform/modules/canvas/format.ts`, `src/platform/modules/canvas/tools.ts`, `src/platform/modules/view/lofi.css`). We read those files as a reference. No code was copied; the studio code is new.

