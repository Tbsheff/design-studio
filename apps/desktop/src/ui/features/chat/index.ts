import { lazy } from "react";

import { runStepText } from "./live-status-model.js";

const ChatPanel = lazy(async () => {
  const loaded = await import("./chat-panel.js");

  return { default: loaded.ChatPanel };
});

const McpToasts = lazy(async () => {
  const loaded = await import("./mcp-toasts.js");

  return { default: loaded.McpToasts };
});

const McpPointBadge = lazy(async () => {
  const loaded = await import("./mcp-point-badge.js");

  return { default: loaded.McpPointBadge };
});

const InlinePrompt = lazy(() => import("./inline-prompt.js"));

export { ChatPanel, InlinePrompt, McpPointBadge, McpToasts, runStepText };

export type { InlinePromptView } from "./use-inline-prompt.js";
