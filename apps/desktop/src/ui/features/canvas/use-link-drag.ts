import type { SelectionContext } from "@design-studio/contracts";
import { useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { frameUnder } from "./prototype-model.js";
import type { LinkDrag } from "./prototype-model.js";

type DropHandler = (selection: SelectionContext, frameId: string) => void;

type BeginDrag = (
  event: ReactPointerEvent<HTMLElement>,
  selection: SelectionContext,
  activeId: string
) => void;

interface LinkDragControl {
  readonly begin: BeginDrag;
  readonly drag: LinkDrag | null;
}

const useLinkDrag = (onDrop: DropHandler): LinkDragControl => {
  const [drag, setDrag] = useState<LinkDrag | null>(null);
  const dropRef = useRef(onDrop);
  useLayoutEffect(() => {
    dropRef.current = onDrop;
  });

  const begin: BeginDrag = (event, selection, activeId) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const handle = event.currentTarget;
    const box = handle.getBoundingClientRect();
    const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const listeners = new AbortController();
    const options = { signal: listeners.signal };
    handle.setPointerCapture(event.pointerId);
    setDrag({ from, target: null, to: from });

    const move = (moveEvent: PointerEvent): void =>
      setDrag({
        from,
        target: frameUnder(moveEvent.clientX, moveEvent.clientY, activeId),
        to: { x: moveEvent.clientX, y: moveEvent.clientY },
      });

    const up = (upEvent: PointerEvent): void => {
      listeners.abort();
      setDrag(null);
      const target = frameUnder(upEvent.clientX, upEvent.clientY, activeId);

      if (target) {
        dropRef.current(selection, target);
      }
    };

    const cancel = (): void => {
      listeners.abort();
      setDrag(null);
    };

    handle.addEventListener("pointermove", move, options);
    handle.addEventListener("pointerup", up, options);
    handle.addEventListener("pointercancel", cancel, options);
  };

  return { begin, drag };
};

export { useLinkDrag };

export type { BeginDrag, LinkDragControl };
