# Design Studio

Design Studio is a local app for designing web pages with an AI agent. You describe a page, the agent (Claude, through the Claude Agent SDK) writes real HTML or React files on your disk, and the studio shows a live preview of them. The files on disk are the design: you can open them in your editor at any time.

Rule: **the filesystem owns the design. The agent edits it. The studio renders it.**

## Features

- **HTML and React projects.** Start from a prompt, or import an existing folder or Vite app. React projects run in their own Vite dev server with hot reload.
- **Live preview canvas.** Pan, zoom and see the design at desktop, tablet and mobile sizes. Each project has its own preview origin, so a design cannot reach the studio API.
- **Run levels.** Wireframe, Prototype and Polish. Higher levels make the agent check its own work: render checks, screenshots, layout and accessibility checks (axe-core), and a visual diff against the last version.
- **Versions.** Every finished run is a version in a shadow git repository. Undo, compare, restore and export a version. Failed or canceled runs never replace the last good version.
- **Direct edits.** Select an element in the preview and change text, spacing, color and type in the inspector. The studio writes the change to the source file.
- **Design systems.** Start from a built-in pack, edit tokens live, and keep a `DESIGN.md` that the agent follows.
- **Tweaks.** The agent can add live controls (sliders, colors, toggles) for the values you are likely to adjust.
- **Variations.** Ask for several designs at once and compare them in a grid.
- **Pinned comments.** Pin comments on the preview and send them to the agent as one batch.
- **Claude skills.** Use your Claude Code skills and plugin skills in runs, and turn each one on or off.
- **Desktop app.** An optional macOS app (Electron) with native menus, folder pickers, notifications and auto-update support.

## Screenshots

Screenshots will go here.

## Requirements

- macOS (the desktop app is macOS only; the web studio is tested on macOS)
- Node.js 24 or later
- git
- Google Chrome (the studio uses the installed Chrome for render checks and screenshots)
- Claude Code installed and logged in (`npm i -g @anthropic-ai/claude-code` or the installer at claude.ai, then run `claude` and sign in), or an `ANTHROPIC_API_KEY`. The desktop app does not ship Claude Code; it uses yours.

## Quick start

```sh
npm ci
npm start
```

Then open http://127.0.0.1:4170. Projects are saved in `studio-data/` in the repository folder. Set `STUDIO_DATA_DIR` to use a different folder.

To try the studio without a Claude account, start it with the mock agent:

```sh
STUDIO_AGENT=mock npm start
```

For development with UI hot reload, use `npm run dev`.

## Desktop app

```sh
npm run electron:dev    # run the desktop shell from source
npm run desktop:pack    # build an arm64 .app, .dmg and .zip in dist/
```

Builds are signed ad hoc unless `STUDIO_SIGN_IDENTITY` names a Developer ID. See `DESKTOP_PLAN.md` for signing, notarization and updates.

## Tests

```sh
npm run typecheck
npm test               # vitest
npm run build:ui
npm run e2e            # Playwright, uses the installed Chrome and the mock agent
npm run e2e:desktop    # Electron tests
```

The end-to-end tests start their own server with a temporary data folder. They never use your `studio-data/` or your `~/.claude` folder. Set `STUDIO_E2E_PORT_OFFSET` to move their ports.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the processes, data layout, agent runs, preview isolation and the desktop shell.

## Privacy

Design Studio runs on your computer and keeps your projects on your disk. When you start a run, your prompt, the project files the agent reads, attached images, screenshots, the text of the skills you turned on and any taste rules go to Anthropic through the Claude Agent SDK. Anthropic's terms and privacy policy apply to that data. The mock agent (`STUDIO_AGENT=mock`) sends nothing.

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE). Third-party code and its licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
