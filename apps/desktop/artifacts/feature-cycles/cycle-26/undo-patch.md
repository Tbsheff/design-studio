# undo-patch (cycle 26, pick 2)

Branch `feat/undo-patch`. Status: draft. The measure gate dropped step 2. The fallback (runner-up 1, route data offer) is in progress.

## Step 1: measure

Method: playwright-core drives the studio UI (headless Chrome, 1440x900). An init script in each frame logs the Cmd+Z keydown and each change of the `h1` text and the `#card` computed `padding-top`, with `performance.timeOrigin + performance.now()`. "Full" is keydown to the first frame state that equals the state before the edit. "Studio" is keydown to the end of the `POST edit-history/undo` response (settle, the history GET and the step call). 4 s wait between the edit and the undo. Driver: `undo-patch/measure-driver.txt`. Raw data: `undo-patch/undo-measure-*.json`.

Apps: an HTML project (Tailwind browser build), and a fake Next app (`next dev`, Next 16.4.1 Turbopack, 2 files) attached as a managed app.

| Case | Runs | Full median | Full max | Studio median | Studio max |
|---|---|---|---|---|---|
| HTML, text | 5 | 48 ms | 49 ms | 5 ms | 5 ms |
| HTML, padding (class) | 5 | 52 ms | 60 ms | 6 ms | 7 ms |
| Next, text | 5 | 85 ms | 202 ms | 7 ms | 35 ms |
| Next, padding (class) | 5 | 79 ms | 93 ms | 6 ms | 6 ms |
| Next, text, Cmd+Z 250 ms after the edit | 3 | 75 ms | 89 ms | 12 ms | 17 ms |

- Gate: build step 2 when the studio part is over 150 ms or the full time on the Next app is over 300 ms. Both are far under. Step 2 is dropped.
- No run showed a flash of the edited value after the old value.
- The studio part is about 5 ms. A slow undo on Bonaparte comes from Next Fast Refresh on a large app, not from the studio calls.
- The 250 ms rows are weaker evidence: the old edit can still be held, so `optimistic-drop` can restore the text before the refresh.
- Bonaparte was not run. It cannot render routes without its database.
