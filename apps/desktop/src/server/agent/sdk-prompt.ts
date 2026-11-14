import type { SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";

import type { UserMessageParts } from "./user-message.js";

const toSdkMessage = (parts: UserMessageParts): SDKUserMessage => ({
  message: {
    content: [
      ...parts.images.map((image) => ({
        source: {
          data: image.data,
          media_type: image.mime,
          type: "base64" as const,
        },
        type: "image" as const,
      })),
      { text: parts.text, type: "text" as const },
    ],
    role: "user",
  },
  parent_tool_use_id: null,
  type: "user",
});

const toSdkPrompt = (
  parts: UserMessageParts
): string | AsyncIterable<SDKUserMessage> => {
  if (parts.images.length === 0) {
    return parts.text;
  }

  const message = toSdkMessage(parts);

  return (async function* single() {
    yield message;
  })();
};

export { toSdkPrompt };
