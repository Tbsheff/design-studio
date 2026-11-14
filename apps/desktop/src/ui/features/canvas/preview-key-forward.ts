import type { BridgeToParent } from "@design-studio/contracts";

import { noteHandledShortcut } from "../../platform/desktop.js";
import type { PreviewHost } from "./preview-frames-types.js";
import { PREVIEW_HISTORY_EVENT } from "./use-undo-shortcut.js";
import { PREVIEW_TOOL_KEY_EVENT } from "./vector-tool-model.js";

const PREVIEW_LAYOUT_KEY_EVENT = "studio:preview-layout-key";
const PREVIEW_ARRANGE_KEY_EVENT = "studio:preview-arrange-key";

const TEXT_UNDO_ANSWER_MS = 1000;

const textUndos = new Map<string, number>();

const KEY_TYPES = [
  "escape",
  "history-key",
  "layout-key",
  "app-key",
  "arrange-key",
  "tool-key",
] as const;

type KeyMessage = Extract<BridgeToParent, { type: (typeof KEY_TYPES)[number] }>;

const KEY_MESSAGES = new Set<BridgeToParent["type"]>(KEY_TYPES);

const isKeyMessage = (message: BridgeToParent): message is KeyMessage =>
  KEY_MESSAGES.has(message.type);

const markTextUndo = (token: string): void => {
  textUndos.set(token, Date.now());
};

const isTextUndoAnswer = (token: string): boolean => {
  const at = textUndos.get(token) ?? null;
  textUndos.delete(token);

  return at !== null && Date.now() - at < TEXT_UNDO_ANSWER_MS;
};

const forwardHistoryKey = (
  message: Extract<KeyMessage, { type: "history-key" }>
): void => {
  if (message.isNotice) {
    if (message.redo) {
      noteHandledShortcut("redo");
    } else {
      noteHandledShortcut("undo");
    }

    return;
  }

  globalThis.dispatchEvent(
    new CustomEvent(PREVIEW_HISTORY_EVENT, {
      detail: { isAnswer: isTextUndoAnswer(message.token), redo: message.redo },
    })
  );
};

const forwardDetailKey = (message: KeyMessage): void => {
  if (message.type === "tool-key") {
    globalThis.dispatchEvent(
      new CustomEvent(PREVIEW_TOOL_KEY_EVENT, {
        detail: { tool: message.tool },
      })
    );

    return;
  }

  if (message.type === "arrange-key") {
    globalThis.dispatchEvent(
      new CustomEvent(PREVIEW_ARRANGE_KEY_EVENT, {
        detail: { key: message.key },
      })
    );

    return;
  }

  if (message.type === "history-key") {
    forwardHistoryKey(message);
  }
};

const forwardKeyMessage = (message: KeyMessage, host: PreviewHost): void => {
  if (message.type === "app-key") {
    host.forwardAppKey(message.id);

    return;
  }

  if (message.type === "escape") {
    globalThis.dispatchEvent(new CustomEvent(host.escapeEvent));

    return;
  }

  if (message.type === "layout-key") {
    globalThis.dispatchEvent(new CustomEvent(PREVIEW_LAYOUT_KEY_EVENT));

    return;
  }

  forwardDetailKey(message);
};

export {
  PREVIEW_ARRANGE_KEY_EVENT,
  PREVIEW_LAYOUT_KEY_EVENT,
  forwardKeyMessage,
  isKeyMessage,
  markTextUndo,
};

export type { KeyMessage };
