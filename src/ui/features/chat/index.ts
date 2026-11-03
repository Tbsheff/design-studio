import { lazy } from "react";

const ChatPanel = lazy(async () => {
  const loaded = await import("./chat-panel.js");

  return { default: loaded.ChatPanel };
});

export { ChatPanel };
