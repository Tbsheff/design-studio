import type { KeyboardEvent } from "react";

import { isModeCycleKey, nextMode } from "../../chat-slots.js";
import { leaveComposer } from "./composer-focus.js";
import type { ComposerMode } from "./composer-mode-model.js";

const INPUT_SELECTOR = '[data-slot="composer-input"]';

interface KeyConsumer {
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => boolean;
}

interface KeyHandler {
  readonly onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

interface KeyCaptureOptions {
  readonly composerKeys: KeyHandler;
  readonly mentions: KeyConsumer;
  readonly mode: ComposerMode;
  readonly onHistorySearch: () => void;
  readonly setMode: (mode: ComposerMode) => void;
  readonly slash: KeyConsumer;
}

const hasModifier = (event: KeyboardEvent<HTMLDivElement>): boolean =>
  event.metaKey || event.ctrlKey || event.altKey || event.shiftKey;

const isPlainEscape = (event: KeyboardEvent<HTMLDivElement>): boolean =>
  event.key === "Escape" &&
  !event.nativeEvent.isComposing &&
  !hasModifier(event);

const isHistoryKey = (event: KeyboardEvent<HTMLDivElement>): boolean =>
  event.ctrlKey && !event.metaKey && event.key === "r";

const usePromptKeyCapture = (
  options: KeyCaptureOptions
): ((event: KeyboardEvent<HTMLDivElement>) => void) => {
  const { composerKeys, mentions, mode, slash } = options;

  return (event) => {
    const target = event.target as HTMLElement;
    const isInInput = target.matches(INPUT_SELECTOR);

    if (isInInput && isHistoryKey(event)) {
      event.preventDefault();
      options.onHistorySearch();

      return;
    }

    if (isInInput && (slash.onKeyDown(event) || mentions.onKeyDown(event))) {
      return;
    }

    if (isInInput && isPlainEscape(event)) {
      event.preventDefault();
      leaveComposer(target);

      return;
    }

    if (isInInput && isModeCycleKey(event)) {
      event.preventDefault();
      options.setMode(nextMode(mode));

      return;
    }

    composerKeys.onKeyDown(event);
  };
};

export { usePromptKeyCapture };
