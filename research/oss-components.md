# OSS components for Design Studio

Data pulled 2026-10-21 from the npm registry API (`registry.npmjs.org/<pkg>/latest`) and
npm downloads API (`api.npmjs.org/downloads/point/last-week/<pkg>`). License = the `license`
field of the latest published version. Size = npm `unpackedSize` (install size on disk, NOT
gzipped bundle size). "React 19" = the `react` peer range in the latest version.
License texts for tldraw, Nodebox, ai-elements and code-inspector were read from source.
WebContainer terms come from webcontainers.io/enterprise (via search result summary).

Legend: OK = permissive (MIT / ISC / Apache-2.0 / BSD). WARN = weak copyleft (MPL-2.0: OK to
use as a dependency, file-level copyleft if you modify its files). STOP = commercial or
source-available terms. "unverified" = I did not confirm by reading a page.

> Maintenance flag: all daybrush packages (moveable, react-moveable, selecto, react-selecto,
> @scena/guides, react-infinite-viewer) last published 2023-07..2023-12. No React peer is
> declared, so React 19 works only if they avoid removed APIs (findDOMNode, string refs,
> legacy context). React 19 status: unverified.

---

## 1. Infinite canvas / pan-zoom

| Package | License | Weekly dl | Size | React 19 | Fit |
|---|---|---|---|---|---|
| [react-zoom-pan-pinch](https://github.com/BetterTyped/react-zoom-pan-pinch) 4.2.0 | MIT OK | 1.37M | 1.2 MB, 0 deps | peer `*` | Drop-in wrapper; transforms a div that holds iframes. Best fit for "board of frames". |
| [@use-gesture/react](https://github.com/pmndrs/use-gesture) 10.3.1 | MIT OK | 4.45M | 36 KB | `>=16.8` | Raw wheel/pinch/drag hooks. Build own transform state in ~100 LOC. Most control. |
| [@panzoom/panzoom](https://github.com/timmywil/panzoom) 4.6.2 | MIT OK | 340k | 158 KB, 0 deps | n/a (vanilla) | Small vanilla lib; wrap in a ref hook. |
| [panzoom](https://github.com/anvaka/panzoom) 9.4.4 | MIT OK | 89k | 702 KB | n/a | Older vanilla lib; fine, less active. |
| [d3-zoom](https://github.com/d3/d3-zoom) 3.0.0 | ISC OK | 21M | 85 KB | n/a | Solid math core (used by xyflow). Pulls d3-selection. |
| [@xyflow/react](https://github.com/xyflow/xyflow) 12.12.0 | MIT OK | 8.3M | 1.2 MB | `>=17` | Node canvas with minimap/controls. Good if "directions" become a node graph. |
| [react-infinite-viewer](https://github.com/daybrush/infinite-viewer) 0.28.1 | MIT OK | 4k | 458 KB | unverified | Infinite scroll viewport; stale (2023). |
| [tldraw](https://github.com/tldraw/tldraw) 5.5.2 | **STOP: custom "tldraw license"** | 266k | 14.9 MB | `^18.2 \|\| ^19.2.1` | Production use needs a paid license key; has watermark + telemetry enforcement. Dev/internal use allowed. Avoid. |
| [@excalidraw/excalidraw](https://github.com/excalidraw/excalidraw) 0.18.1 | MIT OK | 523k | 45.7 MB | `^19.0.0` | Whiteboard, not a frame host. Too heavy for this need. |

## 2. Selection overlays / measure / resize handles

| Package | License | Weekly dl | Size | React 19 | Fit |
|---|---|---|---|---|---|
| [moveable](https://github.com/daybrush/moveable) 0.53.0 | MIT OK | 46k | 2.4 MB | n/a (vanilla) | Drag/resize/rotate/snap handles. Vanilla build avoids React-19 risk. Stale (2023). |
| [react-moveable](https://github.com/daybrush/moveable) 0.56.0 | MIT OK | 308k | 4.5 MB | unverified | Same in React. Stale. |
| [selecto](https://github.com/daybrush/selecto) / [react-selecto](https://github.com/daybrush/selecto) 1.26.3 | MIT OK | 342k / 336k | 890 KB / 40 KB | unverified | Marquee + click multi-select. |
| [@scena/guides](https://github.com/daybrush/guides) 0.29.2 / @scena/react-guides 0.28.2 | MIT OK | 1k / 53k | 412 KB / 215 KB | unverified | Rulers and guide lines. |
| [@floating-ui/dom](https://github.com/floating-ui/floating-ui) (see #8) | MIT OK | - | small | n/a | Position labels/toolbars next to a selected rect. |
| In-house overlay | - | - | ~150 LOC | - | Recommended: the preview is a cross-origin iframe, so an injected script must send `getBoundingClientRect` + computed box model via `postMessage`; host draws margin/padding/border boxes (devtools style) in a plain SVG/div layer. No library can reach into a cross-origin iframe. |

## 3. Click-to-source / JSX source mapping

| Package | License | Weekly dl | Size | React 19 | Fit |
|---|---|---|---|---|---|
| [code-inspector-plugin](https://github.com/zh-lx/code-inspector) 2.0.9 | MIT OK (LICENSE read) | 167k | 17 KB + deps | framework-agnostic | Vite/webpack plugin, adds `data-insp-path="file:line:col"` attrs at compile time. Works for React, Vue, plain HTML. Best fit. |
| [@babel/plugin-transform-react-jsx-source](https://github.com/babel/babel) 7.29.7 | MIT OK | 39M | 9 KB | yes | Adds `__source` prop. React 19 no longer exposes `_debugSource` on fibers, so you must read the prop yourself or write your own attr. |
| [@react-dev-inspector/babel-plugin](https://github.com/zthxxx/react-dev-inspector) 2.0.1 / react-dev-inspector | MIT OK | 16k / 26k | 40 KB / 176 KB | `>=16.8` (19 unverified) | Injects `data-inspector-*` attrs. Good model; less active. |
| [@locator/babel-jsx](https://github.com/infi-pc/locatorjs) + @locator/runtime 0.5.1 | MIT OK | 78k / 96k | 35 KB / 502 KB | unverified | LocatorJS; Alt-click to open file. Runtime UI is heavy for our use. |
| [click-to-react-component](https://github.com/ericclemmons/click-to-component) 1.1.3 | ISC OK | 48k | 32 KB | `>=16.8` | Relies on fiber `_debugSource`, which React 19 removed. Likely broken on 19. Avoid. |
| [vite-plugin-inspect](https://github.com/antfu-collective/vite-plugin-inspect) 12.1.0 | MIT OK | 2.1M | 4 MB | n/a | Shows Vite transform steps. Debug tool only, not source mapping. |
| Own Vite plugin with [magic-string](https://github.com/Rich-Harris/magic-string) + [@babel/parser](https://github.com/babel/babel) | MIT OK | 153M / 156M | 92 KB / 566 KB | n/a | ~80 LOC: parse JSX, add `data-studio-id="path:line:col"`. Full control, stable ids for the agent. |

## 4. Visual diff / compare

| Package | License | Weekly dl | Size | React 19 | Fit |
|---|---|---|---|---|---|
| [pixelmatch](https://github.com/mapbox/pixelmatch) 8.0.0 | ISC OK | 6.2M | 36 KB | n/a | Tiny, pure JS pixel diff + diff image. Pair with pngjs. Best server-side pick. |
| [odiff-bin](https://github.com/dmtrKovalenko/odiff) 4.5.0 | MIT OK | 89k | 41 KB (+native binary) | n/a | Very fast native diff; native binary download at install. Use only if pixelmatch is too slow. |
| [looks-same](https://github.com/gemini-testing/looks-same) 10.0.1 | MIT OK | 71k | 96 KB | n/a | Perceptual diff with tolerance; pulls sharp (native). |
| [resemblejs](https://github.com/rsmbl/Resemble.js) 5.0.0 | MIT OK | 30k | 50 KB | n/a | Browser/Node diff with mismatch %. Node needs canvas (native). |
| [react-compare-slider](https://github.com/nerdyman/react-compare-slider) 4.0.0 | MIT OK | 127k | 151 KB, 0 deps | `>=16.8` | Before/after slider; takes any React node, so it can compare two live iframes, not only images. Best UI pick. |
| [img-comparison-slider](https://github.com/sneas/img-comparison-slider) 8.0.7 / @img-comparison-slider/react 8.0.2 | MIT OK | 21k / 12k | 51 KB / 7 KB | wrapper, peer not declared | Web component slider; fine for plain-CSS stack. |

## 5. Chat / agent UI

| Package | License | Weekly dl | Size | React 19 | Fit |
|---|---|---|---|---|---|
| [@assistant-ui/react](https://github.com/assistant-ui/assistant-ui) 0.15.30 | MIT OK | 1.2M | 2.8 MB | `^18 \|\| ^19` | Headless thread/composer primitives, custom runtime adapter fits Agent SDK streams. Styling is shadcn/Tailwind by default but primitives are unstyled. |
| [ai-elements](https://github.com/vercel/ai-elements) 1.9.1 (CLI) | Apache-2.0 OK (LICENSE read) | unverified | copy-in | 19 (unverified) | shadcn registry: copies components into your repo. Needs Tailwind + shadcn. Mismatch with plain CSS. |
| [ai](https://github.com/vercel/ai) 7.0.148 / [@ai-sdk/react](https://github.com/vercel/ai) 4.0.152 | Apache-2.0 OK | 18M / 5.7M | 8 MB / 327 KB | `^18 \|\| ^19` | `useChat` stream protocol. Only useful if we adopt AI SDK UI message stream on the Hono side. |
| shadcn/ui chat blocks | MIT OK (unverified) | - | copy-in | 19 | Tailwind-based; copy patterns only. |
| [streamdown](https://github.com/vercel/streamdown) 2.7.1 | Apache-2.0 OK | 4.4M | 122 KB (15 deps) | `^18 \|\| ^19` | react-markdown replacement built for streaming tokens (handles unclosed fences), Shiki built in. Best fit. |
| [react-markdown](https://github.com/remarkjs/react-markdown) 10.1.0 | MIT OK | 22.7M | 51 KB (11 deps) | `>=18` | Stable fallback; flickers on partial markdown. |
| [marked](https://github.com/markedjs/marked) 18.1.1 | MIT OK | 51M | 506 KB, 0 deps | n/a | Fast string renderer; needs sanitizing. |
| [shiki](https://github.com/shikijs/shiki) 4.5.0 | MIT OK | 16M | 588 KB core (grammars lazy) | n/a | VS Code-grade highlighting; run on server or lazy-load. |
| [@pierre/diffs](https://diffs.com) 1.6.1 | Apache-2.0 OK | 2.2M | 10.7 MB | `^18.3.1 \|\| ^19` | Shiki-based diff viewer, split/unified, good for agent edit review. No repo URL in package.json. |
| [react-diff-view](https://github.com/otakustay/react-diff-view) 3.3.3 | MIT OK | 158k | 1.4 MB | `>=16.14` | Renders git unified diffs; flexible widgets for inline comments. |
| [react-diff-viewer-continued](https://github.com/Aeolun/react-diff-viewer-continued) 4.4.0 | MIT OK | 487k | 1.1 MB | `^19.0.0` | Simple old/new string diff UI. |
| [diff2html](https://github.com/rtfpessoa/diff2html) 3.4.56 | MIT OK | 291k | 2 MB | n/a | Diff to HTML string; framework-free. |
| [diff](https://github.com/kpdecker/jsdiff) 9.0.0 | BSD-3-Clause OK | 85M | 601 KB, 0 deps | n/a | Diff engine (createPatch, structuredPatch). |

## 6. Code editor / viewer

| Package | License | Weekly dl | Size | React 19 | Fit |
|---|---|---|---|---|---|
| [codemirror](https://github.com/codemirror/basic-setup) 6.0.2 + [@codemirror/view](https://code.haverbeke.berlin/codemirror/view) 6.43.15 | MIT OK | 6.3M / 9M | modular, ~300 KB typical | n/a | Small, modular, mobile-OK, has merge view (@codemirror/merge). Best fit. |
| [@uiw/react-codemirror](https://github.com/uiwjs/react-codemirror) 4.25.12 | MIT OK | 2.7M | 807 KB | `>=17` | Thin React wrapper; or write own 30-line ref wrapper. |
| [@monaco-editor/react](https://github.com/suren-atoyan/monaco-react) 4.7.0 + [monaco-editor](https://github.com/microsoft/monaco-editor) 0.57.0 | MIT OK | 4.3M / 5.6M | 149 KB + 99 MB unpacked | `^19.0.0` | VS Code feel + TS intellisense, but heavy and awkward with Vite workers. |
| Sandpack code editor (inside @codesandbox/sandpack-react) | Apache-2.0 OK | - | - | yes | Built on CodeMirror 6; only worth it if we use Sandpack. |

## 7. Preview sandboxes and bundling

| Package | License | Weekly dl | Size | React 19 | Fit |
|---|---|---|---|---|---|
| Local Vite dev server (current plan) | MIT OK | - | - | - | We already run real files on Node; real HMR beats any in-browser bundler. Keep it. |
| [@codesandbox/sandpack-react](https://github.com/codesandbox/sandpack) 2.20.0 | Apache-2.0 OK | 698k | 1.2 MB | `^19` | In-browser bundler; default bundler is hosted by CodeSandbox (network dependency, self-host possible). Not needed for local files. |
| [@webcontainer/api](https://github.com/stackblitz/webcontainer-core) 1.6.4 | npm says MIT, **STOP: vendor terms require a paid license for production use in a for-profit setting** (webcontainers.io/enterprise) | 93k | 176 KB | n/a | Node in browser; needs COOP/COEP headers. Not needed (we have real Node). |
| [@codesandbox/nodebox](https://github.com/codesandbox/nodebox-runtime) 0.1.9 | **STOP: Sustainable Use License 1.0** (internal business / non-commercial only; LICENSE read) | 767k | 99 KB | n/a | Avoid. |
| [esbuild-wasm](https://github.com/evanw/esbuild) 0.28.2 | MIT OK | 3.3M | 14 MB | n/a | Only if we need in-browser transpile (e.g. export to standalone HTML in browser). Server-side, use native esbuild/Vite. |

## 8. UI kit foundations

| Package | License | Weekly dl | Size | React 19 | Fit |
|---|---|---|---|---|---|
| [@base-ui/react](https://github.com/mui/base-ui) 1.9.0 | MIT OK | 10.8M | 10 MB unpacked, tree-shakes | `^17 \|\| ^18 \|\| ^19` | Unstyled, stable 1.x, from Radix + MUI authors; works with plain CSS via `data-*` state attrs. Best fit. (Old name @base-ui-components/react is the RC.) |
| [radix-ui](https://github.com/radix-ui/primitives) 1.8.1 / @radix-ui/react-* | MIT OK | 10.7M / 45M (dialog) | per-primitive ~100 KB | `^19.0` | Mature, unstyled, plain-CSS friendly. Slower updates than Base UI. |
| [react-aria-components](https://github.com/adobe/react-spectrum) 1.22.1 | Apache-2.0 OK | 2.9M | 6.8 MB | `^19.0.0-rc.1` | Best a11y and i18n; larger API surface. |
| [@ark-ui/react](https://github.com/chakra-ui/ark) 5.39.3 | MIT OK | 537k | 3.3 MB, 69 deps | `>=18` | Zag state machines; many deps. Has color picker. |
| [cmdk](https://github.com/pacocoursey/cmdk) 1.1.1 | MIT OK | 25M | 80 KB | `^19` | Command palette. Pulls some @radix-ui deps. |
| [sonner](https://github.com/emilkowalski/sonner) 2.0.8 | MIT OK | 30M | 170 KB, 0 deps | `^19` | Toasts. |
| [vaul](https://github.com/emilkowalski/vaul) 1.1.2 | MIT OK | 20.5M | 180 KB | `^19` | Drawer; mobile-first. Low need on desktop studio. |
| [@floating-ui/react](https://github.com/floating-ui/floating-ui) 0.27.20 | MIT OK | 14.6M | 912 KB | `>=17` | Positioning for overlays and tooltips (Base UI uses it internally). |
| [lucide-react](https://github.com/lucide-icons/lucide) 1.61.0 | ISC OK | 67M | 35 MB unpacked, tree-shakes | `^19` | Default icon set, 1.5px-2px stroke. |
| [@phosphor-icons/react](https://github.com/phosphor-icons/react) 2.1.10 | MIT OK | 3.1M | 32 MB unpacked | `>=16.8` | Six weights; good alternative. |
| [tailwindcss](https://github.com/tailwindlabs/tailwindcss) 4.3.3 | MIT OK | 85M | 755 KB | n/a | Only adopt if we want shadcn/ai-elements copy-in. Otherwise plain CSS tokens. |
| [open-props](https://github.com/argyleink/open-props) 1.7.23 | MIT OK | 23k | 1.3 MB | n/a | Ready CSS custom-property tokens; import only the files you need. Fits plain CSS. |

## 9. Design-direct controls and style edits

| Package | License | Weekly dl | Size | React 19 | Fit |
|---|---|---|---|---|---|
| [react-colorful](https://github.com/omgovich/react-colorful) 5.8.1 | MIT OK | 3.8M | ~2.8 KB gz (398 KB unpacked), 0 deps | `>=16.8` | Tiny picker; no OKLCH UI (pair with culori). |
| [@uiw/react-color](https://github.com/uiwjs/react-color) 2.10.3 | MIT OK | 116k | 211 KB, 20 deps | `>=16.9` | Many picker styles (Sketch, Chrome). |
| Ark UI ColorPicker | MIT OK | - | - | yes | Accessible, supports formats. Heavy dep tree. |
| [culori](https://github.com/Evercoder/culori) 4.0.2 | MIT OK | 2.2M | 1.1 MB, 0 deps, tree-shakes | n/a | OKLCH, parse/format, gamut mapping, contrast. Best fit. |
| [colorjs.io](https://github.com/color-js/color.js) 0.7.1 | MIT OK | 5.3M | 15 MB unpacked | n/a | Spec-grade (by CSS Color editors); larger. |
| [postcss](https://github.com/postcss/postcss) 8.5.31 | MIT OK | 189M | 216 KB | n/a | Parse + edit + stringify CSS with formatting kept. Best for writing style edits back to source. |
| [postcss-value-parser](https://github.com/TrySound/postcss-value-parser) 4.2.0 | MIT OK | 57M | 27 KB | n/a | Edit single values (e.g. one shadow layer). |
| [css-tree](https://github.com/csstree/csstree) 3.2.1 | MIT OK | 75M | 1.3 MB | n/a | Spec-aware parser + validation of values; does not keep formatting as well. |
| [lightningcss](https://github.com/parcel-bundler/lightningcss) 1.33.0 | **WARN: MPL-2.0** | 116M | 502 KB + native | n/a | Fast transform/minify; reformats output, so bad for source edits. Use for export minify only. |
| [recast](https://github.com/benjamn/recast) 0.24.0 | MIT OK | 24M | 246 KB | n/a | Edit JSX `className`/`style` props while keeping formatting. |
| [magic-string](https://github.com/Rich-Harris/magic-string) 1.4.3 | MIT OK | 153M | 92 KB | n/a | Surgical string edits at known offsets (pair with @babel/parser locations). |
| Font picker | - | - | - | - | No strong OSS React pick found. Build a list from Google Fonts metadata JSON + `document.fonts`. (Unverified alternatives: fontpicker-react, @samuelmeuli/font-picker-react, stale.) |
| Spacing/typography controls | - | - | - | - | No good OSS standalone kit found; build numeric scrub inputs (Base UI NumberField has scrub area). |

## 10. Version history / git and file watching

| Package | License | Weekly dl | Size | React 19 | Fit |
|---|---|---|---|---|---|
| [simple-git](https://github.com/steveukx/git-js) 4.0.2 | MIT OK | 6.5M | 852 KB | n/a | Wraps the git CLI; full git (worktrees, `--git-dir` shadow repos). Best fit on Node 24 desktop. |
| [isomorphic-git](https://github.com/isomorphic-git/isomorphic-git) 1.44.3 | MIT OK | 1.5M | 4.9 MB | n/a | Pure JS, no git binary needed; slower on large trees, no worktrees. Pick if git CLI may be absent. |
| [chokidar](https://github.com/paulmillr/chokidar) 6.0.0 | MIT OK | 125M | 197 KB, 1 dep | n/a | Same watcher Vite uses; ESM, Node 20+. Best fit. |
| [@parcel/watcher](https://github.com/parcel-bundler/watcher) 2.6.0 | MIT OK | 23M | 130 KB + native | n/a | Native, faster on huge trees, snapshot "what changed since". Native prebuilds. |
| `node:fs.watch` recursive | - | - | 0 | n/a | Node 24 supports recursive on macOS/Linux; fewer guarantees on events. |

## 11. Screenshot / thumbnail generation

| Package | License | Weekly dl | Size | React 19 | Fit |
|---|---|---|---|---|---|
| [playwright](https://github.com/microsoft/playwright) 1.64.1 | Apache-2.0 OK | 70M | 4.9 MB + browsers | n/a | Already in stack; exact render, cross-origin safe. Best for versions/compare. |
| [modern-screenshot](https://github.com/qq15725/modern-screenshot) 4.7.0 | MIT OK | 1.8M | 182 KB, 0 deps | n/a | DOM-to-image in page; maintained fork of html-to-image ideas, has worker support. Use inside the iframe for quick thumbs. |
| [html-to-image](https://github.com/bubkoo/html-to-image) 1.11.13 | MIT OK | 4.6M | 308 KB, 0 deps | n/a | Same approach; less active. |
| [html2canvas](https://github.com/niklasvh/html2canvas) 1.4.1 | MIT OK | 11M | 3.3 MB | n/a | Re-implements CSS painting; misses modern CSS. Avoid. |
| [satori](https://github.com/vercel/satori) 0.63.2 | **WARN: MPL-2.0** | 2.8M | 25.7 MB | n/a | JSX-to-SVG for OG cards; subset of CSS. Not for real page shots. |
| [@resvg/resvg-js](https://github.com/yisibl/resvg-js) 2.6.2 | **WARN: MPL-2.0** | 2.6M | native | n/a | SVG to PNG; pairs with satori. |

---

## Recommended stack

| Need | Pick | Why |
|---|---|---|
| 1. Canvas | **react-zoom-pan-pinch** (fallback: @use-gesture/react + own transform) | MIT, 0 deps, React peer `*`, transforms a plain div of iframes. tldraw is out (license key for production). |
| 2. Selection overlay | **In-house overlay** fed by `postMessage` from an injected iframe script, positioned with @floating-ui/dom; add vanilla **moveable** later only for resize handles | Cross-origin iframe blocks any DOM library from the host. daybrush libs are stale since 2023 and React 19 is unverified, so use the vanilla build. |
| 3. Click-to-source | **Own Vite/Babel transform** (@babel/parser + magic-string) writing `data-studio-src="file:line:col"`; reference **code-inspector-plugin** (MIT) | React 19 removed `_debugSource`, which breaks fiber-based tools (click-to-react-component). Compile-time attrs work for React and plain HTML and give the agent exact locations. code-inspector-plugin is a usable drop-in if we want zero code. |
| 4. Visual diff | **pixelmatch** (server, on Playwright PNGs) + **react-compare-slider** (UI) | Tiny, ISC/MIT, pure JS. Slider accepts any node, so it can compare two live iframes. |
| 5. Chat UI | **@assistant-ui/react** primitives + **streamdown** for markdown + **@pierre/diffs** for edit diffs | All MIT/Apache, React 19 peers. assistant-ui has a custom runtime for Agent SDK streams; streamdown handles partial markdown. ai-elements needs Tailwind + shadcn. |
| 6. Code editor | **CodeMirror 6** (own thin wrapper, or @uiw/react-codemirror) | MIT, modular, small, has merge view. Monaco is ~100 MB unpacked and awkward with workers. |
| 7. Preview | **Keep local Vite dev server**; esbuild-wasm only if needed for in-browser export | Real files + real HMR already exist. WebContainers and Nodebox have commercial restrictions. |
| 8. UI kit | **@base-ui/react** + **cmdk** + **sonner** + **lucide-react**; plain CSS tokens (optionally seed from **open-props**) | Base UI is 1.x stable, unstyled, MIT, styles through `data-*` attrs, so plain CSS stays. Skip Tailwind unless we adopt shadcn copy-ins. |
| 9. Design controls | **react-colorful** + **culori** (OKLCH); **postcss** + **postcss-value-parser** for CSS files; **recast**/magic-string for JSX style props | Small and MIT. postcss keeps source formatting; lightningcss (MPL-2.0) reformats, so use it only for export. Font and spacing controls: build in-house. |
| 10. Git + watch | **simple-git** (shadow repo via `--git-dir`/`--work-tree`) + **chokidar** 6 | Full git features (branches = directions, worktrees) on Node 24; chokidar matches Vite's watcher. |
| 11. Screenshots | **playwright** (versions, compare, export); **modern-screenshot** for fast in-iframe thumbs | Playwright already in stack and exact. modern-screenshot is MIT, 0 deps, active. |

### License red flags
- **tldraw**: custom license; production needs paid key; watermark + telemetry.
- **@webcontainer/api**: npm field says MIT, but vendor requires a paid license for for-profit production use.
- **@codesandbox/nodebox**: Sustainable Use License (internal / non-commercial only).
- **MPL-2.0** (fine as unmodified deps): lightningcss, satori, @resvg/resvg-js.

### Unverified items
- React 19 behavior of all daybrush packages (moveable, selecto, guides, infinite-viewer).
- ai-elements weekly downloads and exact React peer range.
- @react-dev-inspector and @locator React 19 behavior.
- Font picker alternatives named in section 9.
- Sizes are npm unpacked sizes, not measured gzipped bundle sizes.
