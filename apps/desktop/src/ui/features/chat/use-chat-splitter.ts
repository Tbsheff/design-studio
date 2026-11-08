import { useCallback, useRef } from "react";
import type { KeyboardEvent, PointerEvent, RefObject } from "react";

import { uiStore } from "../../platform/storage.js";
import { MIN_CHAT, clampWidth, toKeyDelta } from "./chat-splitter-model.js";

interface ChatSplitterHandlers {
  readonly onDoubleClick: () => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  readonly onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  readonly onStop: () => void;
}

const useChatSplitter = (
  columnsRef: RefObject<HTMLDivElement | null>
): ChatSplitterHandlers => {
  const dragging = useRef(false);

  const currentWidth = useCallback((): number => {
    const panel = [...(columnsRef.current?.children ?? [])].find((child) =>
      child.classList.contains("pane-left")
    );

    if (panel) {
      return panel.getBoundingClientRect().width;
    }

    return MIN_CHAT;
  }, [columnsRef]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = true;
    document.body.classList.add("resizing");
  }, []);

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!dragging.current) {
        return;
      }

      const columns = columnsRef.current;

      if (columns) {
        const rect = columns.getBoundingClientRect();
        uiStore.set({
          chatWidth: clampWidth(event.clientX - rect.left, rect.width),
        });
      }
    },
    [columnsRef]
  );

  const onStop = useCallback(() => {
    dragging.current = false;
    document.body.classList.remove("resizing");
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const delta = toKeyDelta(event.key, event.shiftKey);

      if (delta === 0) {
        return;
      }

      event.preventDefault();
      const container = columnsRef.current?.getBoundingClientRect().width ?? 0;
      uiStore.set({ chatWidth: clampWidth(currentWidth() + delta, container) });
    },
    [columnsRef, currentWidth]
  );

  const onDoubleClick = useCallback(() => uiStore.set({ chatWidth: null }), []);

  return { onDoubleClick, onKeyDown, onPointerDown, onPointerMove, onStop };
};

export { useChatSplitter };
