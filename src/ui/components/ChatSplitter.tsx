import { useCallback, useRef, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import { uiStore, useUi } from '../storage';

const MIN_CHAT = 300;
const MAX_CHAT = 640;

function clampWidth(width: number, container: number): number {
  const max = Math.max(MIN_CHAT, Math.min(MAX_CHAT, Math.floor(container / 2)));
  return Math.round(Math.max(MIN_CHAT, Math.min(max, width)));
}

export function chatWidthStyle(width: number | null): Record<string, string> {
  return width === null ? {} : { '--chat-w': `${width}px` };
}

export function ChatSplitter({ columnsRef }: { columnsRef: RefObject<HTMLDivElement | null> }) {
  const { chatWidth } = useUi();
  const dragging = useRef(false);

  const widthAt = useCallback(
    (clientX: number) => {
      const el = columnsRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return clampWidth(clientX - rect.left, rect.width);
    },
    [columnsRef],
  );

  const currentWidth = () => {
    const panel = columnsRef.current?.querySelector('.pane-left');
    return panel instanceof HTMLElement ? panel.getBoundingClientRect().width : MIN_CHAT;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    document.body.classList.add('resizing');
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const next = widthAt(e.clientX);
    if (next !== null) uiStore.set({ chatWidth: next });
  };

  const stop = () => {
    dragging.current = false;
    document.body.classList.remove('resizing');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 48 : 16;
    const delta = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
    if (delta === 0) return;
    e.preventDefault();
    const container = columnsRef.current?.getBoundingClientRect().width ?? 0;
    uiStore.set({ chatWidth: clampWidth(currentWidth() + delta, container) });
  };

  return (
    <div
      className="splitter"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize chat panel"
      aria-valuemin={MIN_CHAT}
      aria-valuemax={MAX_CHAT}
      aria-valuenow={chatWidth ?? undefined}
      tabIndex={0}
      title="Drag to resize. Double-click to reset."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onDoubleClick={() => uiStore.set({ chatWidth: null })}
      onKeyDown={onKeyDown}
    />
  );
}
