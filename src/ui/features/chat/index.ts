import { lazy } from "react";

const ChatPanel = lazy(async () => {
  const loaded = await import("./chat-panel.js");

  return { default: loaded.ChatPanel };
});

const McpToasts = lazy(async () => {
  const loaded = await import("./mcp-toasts.js");

  return { default: loaded.McpToasts };
});

export { ChatPanel, McpToasts };
