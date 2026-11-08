import { usePopover } from "@design-studio/ui";
import { useCallback, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactElement,
} from "react";

type ResizeEdge = "right" | "bottom" | "corner";

const EDGES: { edge: ResizeEdge; label: string }[] = [
  { edge: "right", label: "Resize width" },
  { edge: "bottom", label: "Resize height" },
  { edge: "corner", label: "Resize" },
];

const elementHandleAt = (eventValue: ReactPointerEvent): Element | null =>
  document
    .elementsFromPoint(eventValue.clientX, eventValue.clientY)
    .find((el) => el.classList.contains("resize-handle")) ?? null;

const passToElementHandle = (event3: ReactPointerEvent): boolean => {
  const handle = elementHandleAt(event3);

  if (!handle) {
    return false;
  }

  event3.stopPropagation();

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
  } = event3;

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
};

const FrameResizeHandles = ({
  onPointerDown,
}: {
  onPointerDown: (event4: ReactPointerEvent, edge: ResizeEdge) => void;
}): ReactElement => (
  <>
    {EDGES.map(({ edge, label }) => (
      <div
        key={edge}
        className={`frame-resize ${edge}`}
        aria-hidden="true"
        data-edge={edge}
        onPointerDown={(event5) =>
          passToElementHandle(event5) || onPointerDown(event5, edge)
        }
      />
    ))}
    <span className="frame-size-readout" aria-hidden="true" />
  </>
);

const MENU_STEP: Record<string, (index: number, count: number) => number> = {
  ArrowDown: (index, count) => (index + 1) % count,
  ArrowUp: (index, count) => (index - 1 + count) % count,
  End: (_index, count) => count - 1,
  Home: () => 0,
};

const menuKeys = (
  event: ReactKeyboardEvent<HTMLElement>,
  close: (refocus: boolean) => void
): void => {
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
};

const useMenu = () => {
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
};

export { FrameResizeHandles, menuKeys, useMenu };

export type { ResizeEdge };
