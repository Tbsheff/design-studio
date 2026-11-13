import type { RunStatus } from "@design-studio/contracts";

import { findElement } from "./find-element.js";
import { isComposerShown } from "./focus.js";
import { createLiveStore } from "./live-store.js";

const ASK_CHAT_EVENT = "studio:ask-chat";

const SELECTION_PROMPT_EVENT = "studio:selection-prompt";

const INSPECTOR = ".studio-inspector";

const DOCK = ".studio-dock";

type TextListener = (text: string) => void;

interface SelectionRunEnd {
  readonly prompt: string;
  readonly status: RunStatus;
}

interface PromptBounds {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
}

const selectionRun = createLiveStore(false);

const selectionRunEnd = createLiveStore<SelectionRunEnd | null>(null);

const stopListeners = new Set<() => void>();

const sendListeners = new Set<TextListener>();

const chatListeners = new Set<TextListener>();

const toListenerRemoval =
  (listeners: Set<TextListener>, listener: TextListener): (() => void) =>
  (): void => {
    listeners.delete(listener);
  };

const requestAskChat = (): void => {
  globalThis.dispatchEvent(new Event(ASK_CHAT_EVENT));
};

const requestSelectionPrompt = (): void => {
  globalThis.dispatchEvent(new Event(SELECTION_PROMPT_EVENT));
};

const requestAskAtSelection = (): void => {
  if (isComposerShown()) {
    requestAskChat();

    return;
  }

  requestSelectionPrompt();
};

const sendSelectionPrompt = (prompt: string): void => {
  for (const listener of sendListeners) {
    listener(prompt);
  }
};

const moveSelectionPromptToChat = (text: string): void => {
  for (const listener of chatListeners) {
    listener(text);
  }
};

const onSelectionPromptSend = (listener: TextListener): (() => void) => {
  sendListeners.add(listener);

  return toListenerRemoval(sendListeners, listener);
};

const onSelectionPromptChat = (listener: TextListener): (() => void) => {
  chatListeners.add(listener);

  return toListenerRemoval(chatListeners, listener);
};

const onSelectionPromptOpen = (listener: () => void): (() => void) => {
  globalThis.addEventListener(SELECTION_PROMPT_EVENT, listener);

  return (): void =>
    globalThis.removeEventListener(SELECTION_PROMPT_EVENT, listener);
};

const setSelectionRunning = (isRunning: boolean): void => {
  selectionRun.set(isRunning);
};

const setSelectionRunEnd = (end: SelectionRunEnd): void => {
  selectionRunEnd.set(end);
};

const requestSelectionStop = (): void => {
  for (const listener of stopListeners) {
    listener();
  }
};

const onSelectionStop = (listener: () => void): (() => void) => {
  stopListeners.add(listener);

  return (): void => {
    stopListeners.delete(listener);
  };
};

const toPromptBounds = (): PromptBounds => {
  const inspector = findElement(document.body, INSPECTOR);
  const dock = findElement(document.body, DOCK);
  let right = globalThis.innerWidth;
  let left = 0;

  if (inspector && inspector.getClientRects().length > 0) {
    right = Math.min(right, inspector.getBoundingClientRect().left);
  }

  if (dock && dock.getClientRects().length > 0) {
    left = Math.max(left, dock.getBoundingClientRect().right);
  }

  return { bottom: globalThis.innerHeight, left, right };
};

export {
  ASK_CHAT_EVENT,
  moveSelectionPromptToChat,
  onSelectionPromptChat,
  onSelectionPromptOpen,
  onSelectionPromptSend,
  onSelectionStop,
  requestAskAtSelection,
  requestAskChat,
  requestSelectionPrompt,
  requestSelectionStop,
  selectionRun,
  selectionRunEnd,
  sendSelectionPrompt,
  setSelectionRunEnd,
  setSelectionRunning,
  toPromptBounds,
};

export type { PromptBounds, SelectionRunEnd };
