import { useEffect, useRef } from "react";
import type { RefObject } from "react";

interface DropHandlers {
  readonly onDragLeave: (event: DragEvent) => void;
  readonly onDragOver: (event: DragEvent) => void;
  readonly onDrop: (event: DragEvent) => void;
}

const useDropTarget = (
  ref: RefObject<HTMLElement | null>,
  handlers: DropHandlers
): void => {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const target = ref.current;

    if (!target) {
      return;
    }

    const leave = (event: DragEvent): void => latest.current.onDragLeave(event);
    const over = (event: DragEvent): void => latest.current.onDragOver(event);
    const drop = (event: DragEvent): void => latest.current.onDrop(event);
    target.addEventListener("dragleave", leave);
    target.addEventListener("dragover", over);
    target.addEventListener("drop", drop);

    return (): void => {
      target.removeEventListener("dragleave", leave);
      target.removeEventListener("dragover", over);
      target.removeEventListener("drop", drop);
    };
  }, [ref]);
};

export { useDropTarget };

export type { DropHandlers };
