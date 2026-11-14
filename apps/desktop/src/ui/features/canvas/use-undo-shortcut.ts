import { useEffect, useLayoutEffect, useRef } from "react";

import {
  noteHandledShortcut,
  recentDesktopCommand,
  useDesktopCommand,
} from "../../platform/desktop.js";
import { findElement } from "../../platform/find-element.js";
import { editsText } from "../../platform/typing-target.js";

const PREVIEW_HISTORY_EVENT = "studio:preview-history";

const PREVIEW_TEXT_UNDO_EVENT = "studio:preview-text-undo";

type HistoryKind = "undo" | "redo";

interface RedoShortcut {
  enabled: boolean;
  onRedo: () => void;
}

const undoAllowed = (
  directionId: string | null,
  locked: boolean,
  versionCount: number
): boolean => directionId !== null && !locked && versionCount >= 2;

const historyKeyOf = (
  event: Pick<
    KeyboardEvent,
    "metaKey" | "ctrlKey" | "shiftKey" | "altKey" | "key"
  >
): HistoryKind | null => {
  if (
    !(event.metaKey || event.ctrlKey) ||
    event.altKey ||
    event.key.toLowerCase() !== "z"
  ) {
    return null;
  }

  if (event.shiftKey) {
    return "redo";
  }

  return "undo";
};

const isFrameTextUndo = (kind: HistoryKind): boolean =>
  !globalThis.dispatchEvent(
    new CustomEvent(PREVIEW_TEXT_UNDO_EVENT, {
      cancelable: true,
      detail: { redo: kind === "redo" },
    })
  );

const isAnswerEvent = (event: Event): boolean =>
  (event as CustomEvent<{ isAnswer?: unknown }>).detail?.isAnswer === true;

const modalOpen = (): boolean =>
  findElement(document.body, '[role="dialog"][aria-modal="true"]') !== null;

interface ShortcutState {
  enabled: boolean;
  onUndo: () => void;
  redo: RedoShortcut | undefined;
}

const routeHistoryCommand = (
  kind: HistoryKind,
  state: ShortcutState,
  modal: () => boolean = modalOpen
): boolean => {
  if (kind === "redo" && !state.redo) {
    return false;
  }

  if (modal()) {
    return true;
  }

  if (kind === "undo" && state.enabled) {
    state.onUndo();
  }

  if (kind === "redo" && state.redo?.enabled) {
    state.redo.onRedo();
  }

  return true;
};

const useUndoShortcut = (
  enabled: boolean,
  onUndo: () => void,
  redo?: RedoShortcut
): void => {
  const state = useRef<ShortcutState>({ enabled, onUndo, redo });
  useLayoutEffect(() => {
    state.current = { enabled, onUndo, redo };
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const kind = historyKeyOf(event);

      if (!kind || editsText(event.target)) {
        return;
      }

      if (kind === "redo" && !state.current.redo) {
        return;
      }

      event.preventDefault();
      routeHistoryCommand(kind, state.current);
    };

    const fromPreview = (event: Event): void => {
      let kind: HistoryKind = "undo";

      if ((event as CustomEvent<{ redo?: unknown }>).detail?.redo === true) {
        kind = "redo";
      }

      if (!isAnswerEvent(event) && recentDesktopCommand(kind)) {
        return;
      }

      noteHandledShortcut(kind);
      routeHistoryCommand(kind, state.current);
    };

    globalThis.addEventListener("keydown", onKey);
    globalThis.addEventListener(PREVIEW_HISTORY_EVENT, fromPreview);

    return (): void => {
      globalThis.removeEventListener("keydown", onKey);
      globalThis.removeEventListener(PREVIEW_HISTORY_EVENT, fromPreview);
    };
  }, []);
  useDesktopCommand((command) => {
    if (
      (command.type !== "undo" && command.type !== "redo") ||
      editsText(document.activeElement)
    ) {
      return false;
    }

    if (isFrameTextUndo(command.type)) {
      return true;
    }

    return routeHistoryCommand(command.type, state.current);
  });
};

export {
  PREVIEW_HISTORY_EVENT,
  PREVIEW_TEXT_UNDO_EVENT,
  historyKeyOf,
  routeHistoryCommand,
  undoAllowed,
  useUndoShortcut,
};

export type { HistoryKind, RedoShortcut, ShortcutState };
