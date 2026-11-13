import { useEffect } from "react";

import { matchesKey } from "../../../shared/keymap.js";
import { IS_MAC, useCommands } from "../../chat-slots.js";
import { requestAskAtSelection } from "../../platform/ask-chat.js";
import { isTypingTarget } from "../../platform/typing-target.js";

const ASK_CHAT_COMMAND = "selection.ask-inline";

const useAskChatShortcut = (): void => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        isTypingTarget(event.target) ||
        !matchesKey("inline-prompt", event, IS_MAC)
      ) {
        return;
      }

      event.preventDefault();
      requestAskAtSelection();
    };

    globalThis.addEventListener("keydown", onKey);

    return (): void => globalThis.removeEventListener("keydown", onKey);
  }, []);
};

const useAskChat = (): void => {
  useAskChatShortcut();

  useCommands(() => [
    {
      group: "Run",
      icon: "chat",
      id: ASK_CHAT_COMMAND,
      keyId: "inline-prompt",
      keywords: "chat prompt quick edit selection element ask agent",
      run: requestAskAtSelection,
      title: "Ask the chat about the selection",
    },
  ]);
};

export { ASK_CHAT_COMMAND, useAskChat };
