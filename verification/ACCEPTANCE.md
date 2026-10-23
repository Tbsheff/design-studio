# Acceptance criteria v0.1 — verification

Run on 2026-10-22 at commit `f8af3b1`. Suites: unit 65/65, default e2e 9/9, ac-core 7/7, ac-edit 19/19, ac-safety 10/10. Real model: `claude-haiku-5-5`, total spend under $0.10.

Detail and evidence: `ac-core.md`, `ac-edit.md`, `ac-safety.md` and the `*-evidence/` folders.

| AC | Status | Evidence | Limit / note |
|---|---|---|---|
| 01 Create from prompt | Verified | ac-core AC-01; real smoke | |
| 02 HTML or React/Vite | Verified | ac-core AC-02 | |
| 03 HTML needs no install/build | Verified | ac-core AC-03 | |
| 04 Standard Vite/React/TS | Verified | ac-core AC-04 (export builds, no node_modules in zip) | |
| 05 Open existing Vite project | Verified | ac-core AC-05, e2e C | |
| 06 Real editable source | Verified | ac-core AC-06 | |
| 07 Files on local disk | Verified | ac-core AC-07 | |
| 08 Reopen after restart | Verified | ac-core AC-08, e2e F | |
| 09 Claude Agent SDK only | Verified | `scripts/ac-core/audit-sdk.sh` | |
| 10 Stream text and tools | Verified | real run: text 4.0 s, tool row 7.6 s before finish | |
| 11 Resume conversation | Verified | real run recalled "PAPAYA", same session id | |
| 12 Session + folder per direction | Verified | real run: 2 session ids, 2 work trees | |
| 13 Cancel any time | Verified | 3 real cancels; process gone in 2.5–3.2 s | |
| 14 Failed run keeps last version | Verified | ac-core AC-14, 5 real cancels | |
| 15 Usage, cost, time, tools | Verified | Details drawer; `sdk-driver.test.ts` | Cost of a canceled run is an estimate from tokens |
| 16 Tool permissions, budget | Verified | settings PATCH + modal; budget_exceeded | Budget is soft: a $0.001 cap spent $0.0033 |
| 17 Live update during run | Verified | ac-edit AC-17 (partial write shown at 156 ms) | |
| 18 Isolated HTML iframe | Verified | ac-edit AC-18 | |
| 19 Vite HMR, no restart | Verified | ac-edit AC-19 | |
| 20 Studio UI state kept | Verified | ac-edit AC-20 | |
| 21 Viewport sizes | Verified | ac-edit AC-21, ui-fixes | |
| 22 Zoom and pan | Verified | ui-fixes (space+drag, middle-drag) | Middle-drag cannot start over the frame |
| 23 Build/console errors shown | Verified | ac-edit AC-23 (file + line) | |
| 24 Old design viewable during run | Verified | ac-edit AC-24 | |
| 25 Click to select | Verified | ac-edit AC-25; manual click in browser pane | |
| 26 Highlight, no DOM change | Verified | ac-edit AC-26 | |
| 27 Agent gets DOM, styles, source | Verified | ac-edit AC-27 | |
| 28 Edit only selected element | Verified | real run: 1 line changed | |
| 29 Edit, not regenerate | Verified | real runs: Edit only, 1-line diffs | |
| 30 Multi-edit as one operation | Verified | ac-edit AC-30 | |
| 31 Undo and recover | Verified | ac-edit AC-31, e2e A | |
| 32 Works in HTML and React | Verified | ac-edit AC-32, e2e B | |
| 33 Version per iteration | Verified | ac-edit AC-33 | |
| 34 Open any version | Verified | ac-edit AC-34 | |
| 35 Branch from old version | Verified | ac-edit AC-35 | |
| 36 Visual compare | Verified | ac-edit AC-36 | Side by side only |
| 37 Directions isolated | Verified | ac-edit AC-37 | |
| 38 Keep or discard unfinished | Verified | ac-edit AC-38, e2e E | Discard moves files to trash |
| 39 Attach images | Verified | real run read "ORBIT" from a PNG | SVG rejected with a message |
| 40 DESIGN.md guides output | Verified | real run used #0B6E4F + Georgia; designMd on create | |
| 41 Agent screenshots output | Verified | real run, PNG saved | |
| 42 Render check desktop + mobile | Verified | ac-safety AC-42 | |
| 43 Critique without edits | Verified | real critique: same tree hash | |
| 44 Open < 2 s | Verified | p95 63–179 ms | |
| 45 HTML preview < 250 ms | Verified | p95 61–199 ms | 199 ms seen with another studio running |
| 46 React preview < 750 ms | Verified | p95 79–523 ms | |
| 47 Select < 100 ms | Verified | p95 30–32 ms | |
| 48 Work scales with changed files | Verified | status stages only changed paths | |
| 49 Vite stays up | Verified | ac-safety AC-49 | |
| 50 Separate latency telemetry | Verified | model, tool, file.write, preview samples | Drawer breakdown has no automated test |
| 51 Preview has no studio credentials | Partial | Vite in child process, scrubbed env; per-project origins; config files locked | Child is not a filesystem sandbox; it runs as your user |
| 52 Agent limited to workspace | Verified | permissions tests; real denied read | Bash is not path-checked (off by default) |
| 53 Install needs explicit policy | Verified | Bash off by default; install deny list | Deny list, not a sandbox |
| 54 Imported project untouched outside | Verified | ac-safety AC-54 | |
| 55 Local state; remote calls disclosed | Verified | disclosure text on Home and prompt box | |
| 56 HTML export standalone | Verified | opens from file:// offline | |
| 57 React export builds | Verified | npm install + build on export | |

**Total: 56 verified, 1 partial (AC-51), 0 failed.**
