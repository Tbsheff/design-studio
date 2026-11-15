# Cycle 42, pick 5: frame-link

A share link can open at one frame: `${base}/s/${token}#frame=<key>`.

## What works

- **Added** `frameUrls` to the `create_share_link` output: `{ frameKey, name, url }` per frame, `url` is `null` when `url` is `null`. Built from `made.url`, so it also works for a cloud link (the cloud viewer ignores the hash; runner-up 3).
- **Added** pure helpers in `contracts/src/share.ts`: `toShareFrameKey`, `toShareFrameUrl`, `toShareFrameHashUrl`, `toShareFrameIndex`, `SHARE_FRAME_HASH_KEY`. Key is `ShareFrame.id`, else the 1-based frame number (`#frame=2`). The 1-based number matches the `f<n>` fallback id in `play-data.ts`.
- **Reads** the hash once in the viewer (`readShareFrameKey` in `ui/platform/share-play.ts`). The frame is selected and centered on the first fit. Play starts at it. An unknown key opens the start frame. The hash is never written back.
- **Shows** a "Frame links" list in each share link row of the panel (2 or more frames), with "Copy link to this frame" per frame.
- **Shows** "Copy share link to this frame" in the canvas frame menu, Copy group, only when an active link made in this session holds that frame.

## Checked

- `call-action.ts share.create '{"projectId":"<lk-seed>"}'`: HTTP and MCP return 4 `frameUrls`. The 2 diffs are per-call values only (token, id, times). The agent path is refused with "this caller has no approval prompt", as on main for every `confirm: "user"` action.
- UI, `lk-seed` (4 pages, link holds 3): panel shows 3 frame rows; row 3 copies `#frame=f3`. Viewer: page 3 selected and centered (frame box 48..1092 in a 1140 wide stage), Play starts at "3 Pricing". `#frame=9`: nothing selected, Play starts at "1 Home". `#frame=2`: page 2 selected. Canvas menu of About copies `#frame=f2`; Contact (not in the link) has no item.
- Screenshots: `cycle-42/frame-link/{share-panel,frame-menu,viewer-page3}-{dark,light}.png`.
- `pnpm run typecheck` pass, `pnpm run lint:gate` pass (59573, baseline 89733), `pnpm run build:ui` pass, `check-bundle` pass (B1 274789 B, delta +86 B against the baseline), `gen-routes --check` pass.
- `check-actions --probes`: 557 hits, the same as main. No hit in a changed file.
- Snapshots: no change to the input, description or annotations of `create_share_link` or `list_share_links` (`actions/src/share/{create,list}.ts` unchanged). `share.json` already differs from the live tools on main (old description text); not edited.

## Files outside the pick list

- `ui/platform/share-tokens.ts` (new): the session token map moved here from `share-publish-ship-export/share-tokens.ts` (deleted) as a live store, so the canvas feature can read it (U7). Callers changed: `use-share-form.ts`, `share-notes.ts`, `share-link-row.tsx`, `use-copy-new.ts`.
- `ui/features/canvas/{frame-label-extras.tsx,frame-menu-groups-model.ts}`: the item joins the menu next to the frame pin, in the Copy group. `frame-label-extras.tsx` has the `projectId`.
- `ui/features/share-viewer/{share-canvas.tsx,use-canvas-view.ts}`: the first fit takes the linked frame.
- `server/share/{linked-share-writer.ts,share-link-store.ts}`, `server/cloud/{cloud-link-client.ts,cloud-link-rows.ts}`: type `ShareCreated` renamed to `ShareMade` (the output without `frameUrls`); the handler adds `frameUrls`.
- `ui/styles/share.css`: 12 lines for the frame list.

## Left out and limits

- The canvas item and the panel rows need the link token. `share.list` never returns tokens, so both show only for links made in this app session (the same rule as the URL rows today).
- Frame URLs use the "This computer" address, not the local network one.
- No cloud viewer support (runner-up 3).
- Incident: during the first scripted run a click on "Allow phone access on this Wi-Fi" turned on LAN sharing for about 2 minutes. I turned it off with `PUT /api/shares/lan {"isOn":false}`; the listener is back on 127.0.0.1 only.
