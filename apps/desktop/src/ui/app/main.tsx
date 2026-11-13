import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { desktopBridge } from "../platform/desktop";
import { toMountRoot } from "../platform/focus";
import { watchLongFrames } from "../platform/telemetry";
import { App } from "./app";

import "../styles/tokens.css";
import "../styles/controls.css";
import "@design-studio/ui/controls.css";
import "../styles/forms.css";
import "../styles/feedback.css";
import "../styles/overlays.css";
import "../styles/home.css";
import "../styles/home-g.css";
import "../styles/home-ide.css";
import "../styles/layout.css";
import "../styles/versions.css";
import "../styles/canvas.css";
import "../styles/selection-prompt.css";
import "../styles/prototype.css";
import "../styles/linked-frame.css";
import "../styles/chat.css";
import "../styles/mcp.css";
import "../styles/composer.css";
import "../styles/ai.css";
import "../styles/inspector.css";
import "../styles/inspector-extras.css";
import "../styles/packs.css";
import "../styles/new-ds.css";
import "../styles/library.css";
import "../styles/token-ui.css";
import "../styles/token-pop.css";
import "../styles/tokens-panel.css";
import "../styles/tweaks.css";
import "../styles/variations.css";
import "../styles/vector.css";
import "../styles/frames.css";
import "../styles/studio.css";
import "../styles/commands.css";
import "../styles/create-component.css";
import "../styles/port.css";
import "../styles/responsive.css";
import "../styles/shell.css";
import "../styles/port-flow.css";
import "../styles/comments.css";
import "../styles/attach-app.css";
import "../styles/compare-code.css";
import "../styles/compare-hunk.css";
import "../styles/export.css";
import "../styles/connect-ai.css";
import "../styles/change-rings.css";
import "../styles/figma-import.css";
import "../styles/publish.css";
import "../styles/reference.css";
import "../styles/review.css";
import "../styles/rules.css";
import "../styles/share-live.css";
import "../styles/share.css";
import "../styles/ship.css";
import "../styles/route-flow.css";
import "../styles/frame-state.css";
import "../styles/canvas-sections.css";
import "../styles/drawing.css";
import "../styles/project-nav.css";
import "../styles/editor-shell.css";
import "../styles/stage-shell.css";

const desktop = desktopBridge<{ platform: string }>();

if (desktop?.platform === "darwin") {
  document.documentElement.dataset.shell = "mac";
}

watchLongFrames();

const root = toMountRoot();

if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

const tipGuard = await import("../platform/tip-guard");

tipGuard.installTipGuard();

const motionGuard = await import("../platform/motion-guard");

motionGuard.startMotionGuard();
