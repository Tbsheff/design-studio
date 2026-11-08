import { useCallback, useLayoutEffect, useRef, useState } from "react";

import { findElement } from "../../platform/find-element.js";
import { isText } from "../../platform/json-guard.js";
import type { TextEditMessage } from "./use-preview-frames.js";

const LENGTH_2000 = 2000;

const MAX_INLINE_TEXT = 5000;

const REFOCUS_MS = 50;
const QUIET_FOCUS_ATTR = "data-quiet-focus";

const focusStageQuietly = (
  stage: HTMLElement | null = findElement(document.body, ".canvas .stage")
): void => {
  if (!stage) {
    return;
  }

  stage.setAttribute(QUIET_FOCUS_ATTR, "");
  stage.focus({ preventScroll: true });
};

const focusLeftCanvas = (stage: HTMLElement): boolean => {
  const active = document.activeElement;

  if (!active || active === document.body || active === stage) {
    return false;
  }

  return !(active instanceof HTMLIFrameElement && stage.contains(active));
};

type TextCommitHandler = (selector: string, text: string) => void;

const parseTextCommit = (
  message: TextEditMessage
): { selector: string; text: string } | null => {
  if (message.type !== "text-commit") {
    return null;
  }

  const { selector, text } = message as { selector: unknown; text: unknown };

  if (!isText(selector) || selector === "" || selector.length > LENGTH_2000) {
    return null;
  }

  if (!isText(text) || text.length > MAX_INLINE_TEXT) {
    return null;
  }

  return { selector, text };
};

interface InlineTextEdit {
  readonly editing: boolean;
  readonly onMessage: (message: TextEditMessage) => void;
  readonly reset: () => void;
}

const useInlineTextEdit = (
  allowed: boolean,
  onCommit: TextCommitHandler | undefined,
  onReject: () => void,
  stage: () => HTMLElement | null
): InlineTextEdit => {
  const [editing, setEditing] = useState(false);
  const [wasAllowed, setWasAllowed] = useState(allowed);

  if (wasAllowed !== allowed) {
    setWasAllowed(allowed);

    if (!allowed) {
      setEditing(false);
    }
  }

  const live = useRef({ onCommit, onReject, stage });
  useLayoutEffect(() => {
    live.current = { onCommit, onReject, stage };
  });
  const editingRef = useRef(false);

  const refocusStage = useCallback(() => {
    globalThis.setTimeout(() => {
      const el = live.current.stage();

      if (!el || editingRef.current || focusLeftCanvas(el)) {
        return;
      }

      focusStageQuietly(el);
    }, REFOCUS_MS);
  }, []);

  const onMessage = useCallback(
    (message: TextEditMessage) => {
      editingRef.current =
        message.type === "text-edit" && message.state === "start";

      if (!editingRef.current) {
        refocusStage();
      }

      if (message.type === "text-edit") {
        setEditing(editingRef.current);

        return;
      }

      setEditing(false);
      const parsed = parseTextCommit(message);

      if (parsed && live.current.onCommit) {
        live.current.onCommit(parsed.selector, parsed.text);
      } else {
        live.current.onReject();
      }
    },
    [refocusStage]
  );

  const reset = useCallback(() => setEditing(false), []);

  return { editing, onMessage, reset };
};

export {
  MAX_INLINE_TEXT,
  QUIET_FOCUS_ATTR,
  focusStageQuietly,
  parseTextCommit,
  useInlineTextEdit,
};

export type { InlineTextEdit, TextCommitHandler };
