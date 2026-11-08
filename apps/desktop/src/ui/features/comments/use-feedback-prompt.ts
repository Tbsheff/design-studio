import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { selectionKey } from "./comment-layer-model.js";
import type { Props } from "./comment-layer-types.js";
import { INLINE_PROMPT_OPEN_EVENT, isTypingTarget } from "./deps.js";
import { useLatest } from "./use-latest.js";

interface FeedbackPrompt {
  readonly dismiss: () => void;
  readonly input: RefObject<HTMLTextAreaElement | null>;
  readonly isActive: boolean;
  readonly isOpen: boolean;
  readonly selKey: string;
}

interface OpenArgs {
  readonly dismissedKey: string | null;
  readonly isActive: boolean;
  readonly props: Props;
  readonly selKey: string;
}

const isFeedbackOpen = (args: OpenArgs): boolean => {
  const { dismissedKey, isActive, props, selKey } = args;
  const { control } = props;

  if (props.commentMode || props.selection.length === 0) {
    return false;
  }

  if (dismissedKey === selKey || control.directionId === null) {
    return false;
  }

  if (control.composerActive && !isActive) {
    return false;
  }

  return (props.selectMode && !props.editing) || isActive;
};

interface KeyContext {
  readonly activate: () => void;
  readonly dismiss: () => void;
  readonly input: RefObject<HTMLTextAreaElement | null>;
  readonly isOpen: boolean;
  readonly props: Props;
}

const applyKey = (event: KeyboardEvent, context: KeyContext): void => {
  if (
    isTypingTarget(event.target) ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey
  ) {
    return;
  }

  if ((event.key === "f" || event.key === "F") && context.isOpen) {
    event.preventDefault();
    context.activate();
    context.input.current?.focus();

    return;
  }

  if (event.key === "Escape") {
    if (context.isOpen) {
      context.dismiss();
    }

    if (context.props.control.openId) {
      context.props.control.setOpenId(null);
    }
  }
};

const useModeDismiss = (
  modeKey: string,
  selKey: string,
  setDismissedKey: (key: string) => void
): void => {
  const [seenMode, setSeenMode] = useState(modeKey);

  if (seenMode !== modeKey) {
    setSeenMode(modeKey);
    setDismissedKey(selKey);
  }
};

const useFeedbackPrompt = (props: Props): FeedbackPrompt => {
  const selKey = selectionKey(props.selection);
  const modeKey = `${props.commentMode}:${props.selectMode}:${props.editing}`;
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const latest = useLatest(props);
  const isActive = activeKey === selKey;
  const isOpen = isFeedbackOpen({ dismissedKey, isActive, props, selKey });

  useModeDismiss(modeKey, selKey, setDismissedKey);

  const dismiss = useCallback(
    (): void => setDismissedKey(selKey),
    [selKey, setDismissedKey]
  );

  const activate = useCallback(
    (): void => setActiveKey(selKey),
    [selKey, setActiveKey]
  );

  useEffect(() => {
    globalThis.addEventListener(INLINE_PROMPT_OPEN_EVENT, dismiss);

    return (): void =>
      globalThis.removeEventListener(INLINE_PROMPT_OPEN_EVENT, dismiss);
  }, [dismiss]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void =>
      applyKey(event, {
        activate,
        dismiss,
        input,
        isOpen,
        props: latest.current,
      });

    globalThis.addEventListener("keydown", onKey);

    return (): void => globalThis.removeEventListener("keydown", onKey);
  }, [activate, dismiss, isOpen, latest]);

  return { dismiss, input, isActive, isOpen, selKey };
};

export { useFeedbackPrompt };

export type { FeedbackPrompt };
