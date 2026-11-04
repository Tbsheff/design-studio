import { useCallback, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";

import { usePopover } from "@design-studio/ui";

export type ResizeEdge = "right" | "bottom" | "corner";

const EDGES: { edge: ResizeEdge; label: string }[] = [
  { edge: "right", label: "Resize width" },
  { edge: "bottom", label: "Resize height" },
  { edge: "corner", label: "Resize" },
];

function elementHandleAt(e: ReactPointerEvent): Element | null {
  return (
    document
      .elementsFromPoint(e.clientX, e.clientY)
      .find((el) => el.classList.contains("resize-handle")) ?? null
  );
}

function passToElementHandle(e: ReactPointerEvent): boolean {
  const handle = elementHandleAt(e);

  if (!handle) {
    return false;
  }

  e.stopPropagation();

  const {
    clientX,
    clientY,
    screenX,
    screenY,
    pointerId,
    pointerType,
    isPrimary,
    button,
    buttons,
    shiftKey,
    altKey,
    metaKey,
    ctrlKey,
  } = e;

  handle.dispatchEvent(
    new PointerEvent("pointerdown", {
      altKey,
      bubbles: true,
      button,
      buttons,
      cancelable: true,
      clientX,
      clientY,
      composed: true,
      ctrlKey,
      isPrimary,
      metaKey,
      pointerId,
      pointerType,
      screenX,
      screenY,
      shiftKey,
    })
  );

  return true;
}

export function FrameResizeHandles({
  onPointerDown,
}: {
  onPointerDown: (e: ReactPointerEvent, edge: ResizeEdge) => void;
}) {
  return (
    <>
      {EDGES.map(({ edge, label }) => (
        <div
          key={edge}
          className={`frame-resize ${edge}`}
          aria-hidden="true"
          data-edge={edge}
          onPointerDown={(e) =>
            passToElementHandle(e) || onPointerDown(e, edge)
          }
        />
      ))}
      <span className="frame-size-readout" aria-hidden="true" />
    </>
  );
}

const MENU_STEP: Record<string, (index: number, count: number) => number> = {
  ArrowDown: (index, count) => (index + 1) % count,
  ArrowUp: (index, count) => (index - 1 + count) % count,
  End: (_index, count) => count - 1,
  Home: () => 0,
};

export function menuKeys(
  event: ReactKeyboardEvent<HTMLElement>,
  close: (refocus: boolean) => void
) {
  const step = MENU_STEP[event.key];

  if (event.key === "Tab") {
    close(false);
  }

  if (!step) {
    return;
  }

  event.preventDefault();

  const items = [
    ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]'
    ),
  ];

  const index = items.indexOf(document.activeElement as HTMLButtonElement);
  items[step(Math.max(0, index), items.length)]?.focus();
}

export function useMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);

    if (refocus) {
      trigger.current?.focus();
    }
  }, []);

  usePopover(open, root, close);

  return { close, open, root, setOpen, trigger };
}
