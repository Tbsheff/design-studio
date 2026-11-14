# MCP test 2: Bonaparte design system to a new screen, headless

Date: 2026-11-12. An outside agent sent raw JSON-RPC over MCP. Code under test: the 5 fixes after test 1 (commits 23a6acc59 to affd3ebfa, merged as c3bfdf24f).

## Result

| Step | Result | Time |
|---|---|---|
| 0. Connect | Pass: setup read from `<dataDir>/mcp.json` (mode 600). No UI, no HTTP | 0 s |
| 1. tools/list | Pass: 290 tools; `get_screenshot` has `colorScheme` | 42 ms |
| 2. Import Bonaparte | Pass: trusted folder, no approval card, first status `queued`, check passes, saved without `force` | 1.5 s |
| 3. Tokens and recipes | Pass: 0 of 335 var names dropped, no `prefers-color-scheme`, 66 component recipes | ~50 ms each |
| 4. Create project | Pass: starter `index.html` and `design-system/components.md` | 127 ms |
| 5. New screen | Pass: "On-call log" written with `write_file` | 0.5 s |
| 6. Screenshots | Pass: light and dark from one page with `colorScheme` | 1.3 s |
| 7. Quality | Pass: 124 `var()` uses, 0 undefined names, 0 hex colors | - |

End to end: 2 min 32 s, nearly all spent writing the page. UI clicks: 0. Non-MCP HTTP calls: 0.

## Test 1 against test 2

| Check | Test 1 | Test 2 |
|---|---|---|
| Token from a fake header | leaked | 403, no token |
| Turn on MCP | HTTP call | `STUDIO_MCP=on` or setting |
| Import approval | app click, 50 s timeout | none for trusted folders; 10 min timeout otherwise |
| Var names dropped | 57 of 335 | 0 |
| DESIGN.md numbered headings | 9 problems, needed `force` | 0 problems |
| Dark trigger | `.dark` plus `prefers-color-scheme` | `.dark` only, like Bonaparte |
| Components | none | 66 recipes |
| Dark screenshot | needed a second page | `colorScheme: "dark"` |

## Still open

- No UI for trusted folders yet; only the setting and `STUDIO_MCP_TRUSTED_FOLDERS`.
- `connection.getSetup` does not show folders from the env var.
- The first import response still says "from no sources" and lists Geist until the scan ends.
- The starter page uses studio token names with hex fallbacks, not the source names.
- Some tool names repeat words: `create_pack_pack`, `import_pack_pack`, `export_handoff_export`.
- There is no MCP SDK package for outside agents yet.

## Bonaparte unchanged

`git status --short` showed 14 entries before and after, with 0 staged. Those 14 are the owner's own work.

Files: `on-call-log-light.png`, `on-call-log-dark.png`, `on-call-log.html`.
