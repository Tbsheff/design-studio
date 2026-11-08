import { useCallback, useRef } from "react";
import type {
  KeyboardEvent,
  PointerEvent,
  ReactElement,
  RefObject,
} from "react";

import { uiStore, useUi } from "../../platform/storage.js";
import { copy } from "./copy.js";

const MIN_CHAT = 300;
const MAX_CHAT = 640;

const clampWidth = (width: number, container: number): number => {
  const max = Math.max(MIN_CHAT, Math.min(MAX_CHAT, Math.floor(container / 2)));

  return Math.round(Math.max(MIN_CHAT, Math.min(max, width)));
};

const chatWidthStyle = (width: number | null): Record<string, string> => {
  if (width === null) {
    return {};
  }

  return { "--chat-w": `${width}px` };
};

const ChatSplitter = ({
  columnsRef,
}: {
  columnsRef: RefObject<HTMLDivElement | null>;
}): ReactElement => {
  const { chatWidth } = useUi();
  const dragging = useRef(false);

  const widthAt = useCallback(
    (clientX: number) => {
      const el = columnsRef.current;

      if (!el) {
        return null;
      }

      const rect = el.getBoundingClientRect();

      return clampWidth(clientX - rect.left, rect.width);
    },
    [columnsRef]
  );

  const currentWidth = (): number => {
    const panel = columnsRef.current?.querySelector(".pane-left");

    if (panel instanceof HTMLElement) {
      return panel.getBoundingClientRect().width;
    }

    return MIN_CHAT;
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = true;
    document.body.classList.add("resizing");
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (!dragging.current) {
      return;
    }

    const next = widthAt(event.clientX);

    if (next !== null) {
      uiStore.set({ chatWidth: next });
    }
  };

  const stop = (): void => {
    dragging.current = false;
    document.body.classList.remove("resizing");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    let step: 48 | 16 = 16;

    if (event.shiftKey) {
      step = 48;
    }

    let delta = 0;

    if (event.key === "ArrowRight") {
      delta = step;
    } else if (event.key === "ArrowLeft") {
      delta = -step;
    }

    if (delta === 0) {
      return;
    }

    event.preventDefault();
    const container = columnsRef.current?.getBoundingClientRect().width ?? 0;
    uiStore.set({ chatWidth: clampWidth(currentWidth() + delta, container) });
  };

  return (
    <div
      className="splitter"
      role="separator"
      aria-orientation="vertical"
      aria-label={copy.resizeChatPanel}
      aria-valuemin={MIN_CHAT}
      aria-valuemax={MAX_CHAT}
      aria-valuenow={chatWidth ?? undefined}
      tabIndex={0}
      data-tip={copy.dragToResize}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onDoubleClick={() => uiStore.set({ chatWidth: null })}
      onKeyDown={onKeyDown}
    />
  );
};

export { ChatSplitter, chatWidthStyle };
